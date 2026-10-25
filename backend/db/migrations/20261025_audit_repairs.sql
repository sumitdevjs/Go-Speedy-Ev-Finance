-- Apply after schema.sql. Transactional and safe to rerun; no business rows deleted.
BEGIN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_version integer NOT NULL DEFAULT 0;
ALTER TABLE ev_models ADD COLUMN IF NOT EXISTS stock_reset_at timestamptz NOT NULL DEFAULT '-infinity';
ALTER TABLE bike_transfers ADD COLUMN IF NOT EXISTS details jsonb NOT NULL DEFAULT '{}';
ALTER TABLE bike_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE penalties ENABLE ROW LEVEL SECURITY;

-- Upgrade existing installations, where the original global constraints survive.
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_phone_key;
DROP INDEX IF EXISTS idx_tenants_chassis;
DROP INDEX IF EXISTS idx_tenants_motor;
DROP INDEX IF EXISTS idx_tenants_controller;
DROP INDEX IF EXISTS idx_tenants_charger;
DROP INDEX IF EXISTS idx_tenants_battery;
DROP INDEX IF EXISTS idx_tenants_phone_active;
-- A purchase is not an active rental. Hardware remains unique while sold/active.
CREATE UNIQUE INDEX idx_tenants_phone_active ON tenants(phone) WHERE phone IS NOT NULL AND status = 'rented';

-- Keep historical transfer payloads while making the dedicated row authoritative.
INSERT INTO bike_transfers(transfer_id,from_branch_id,to_branch_id,ev_model_id,quantity,status,initiated_by,details)
SELECT changes->>'transfer_id', (changes->>'from_branch_id')::uuid, (changes->>'to_branch_id')::uuid,
 (changes->>'ev_model_id')::uuid, (changes->>'quantity')::integer, changes->>'status', (changes->>'initiated_by')::uuid, changes
FROM (SELECT DISTINCT ON (changes->>'transfer_id') changes FROM audit_logs
 WHERE entity_type='stock_transfer' AND changes->>'transfer_id' IS NOT NULL
 ORDER BY changes->>'transfer_id',created_at DESC,id DESC) legacy
ON CONFLICT(transfer_id) DO NOTHING;

UPDATE bike_transfers t SET details = l.changes FROM (
  SELECT DISTINCT ON (changes->>'transfer_id') changes
  FROM audit_logs WHERE entity_type = 'stock_transfer'
  ORDER BY changes->>'transfer_id', created_at DESC, id DESC
) l WHERE t.transfer_id = l.changes->>'transfer_id' AND t.details = '{}';

-- Every password mutation (including staff-admin resets) revokes older JWTs.
CREATE OR REPLACE FUNCTION revoke_password_sessions()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF OLD.password_hash IS DISTINCT FROM NEW.password_hash THEN
   NEW.auth_version := OLD.auth_version + 1;
   NEW.refresh_token_hash := NULL;
   NEW.refresh_token_expires_at := NULL;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS password_session_revocation ON users;
CREATE TRIGGER password_session_revocation BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION revoke_password_sessions();

CREATE OR REPLACE FUNCTION assert_inventory_scope(p_actor uuid, p_branch uuid)
RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
DECLARE u users; b branches;
BEGIN
  SELECT * INTO u FROM users WHERE id = p_actor AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Access denied: inactive or missing user'; END IF;
  IF u.role = 'super_admin' OR (u.role = 'admin' AND u.branch_id IS NULL AND u.head_office_id IS NULL AND coalesce(u.ward_area, '') IN ('', 'ALL', 'HQ', 'Delhi / Ncr', 'Delhi/NCR', 'Delhi')) THEN RETURN; END IF;
  IF u.role = 'admin' AND u.branch_id IS NOT NULL THEN u.role := 'branch_admin';
  ELSIF u.role = 'admin' AND u.head_office_id IS NOT NULL THEN u.role := 'ho_admin'; END IF;
  IF p_branch IS NULL THEN RAISE EXCEPTION 'Access denied: branch required'; END IF;
  SELECT * INTO b FROM branches WHERE id = p_branch AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Access denied: invalid branch'; END IF;
  IF u.role = 'ho_admin' AND u.head_office_id IS NOT NULL AND b.head_office_id = u.head_office_id THEN RETURN; END IF;
  IF u.role IN ('branch_admin', 'staff') AND u.branch_id = p_branch THEN RETURN; END IF;
  RAISE EXCEPTION 'Access denied: branch outside assigned scope';
END $$;

-- Current branch balance = receipts/movements minus every new vehicle issued
-- since the last explicit inventory reset (returned vehicles belong to old_evs).
CREATE OR REPLACE FUNCTION available_model_stock(p_model uuid, p_branch uuid)
RETURNS integer LANGUAGE sql STABLE SET search_path = public AS $$
 SELECT greatest(0, least(m.stock_count,
   coalesce((SELECT sum((l->>'stock_added')::integer)
     FROM jsonb_array_elements(m.stock_logs) l
     WHERE l ? 'stock_added' AND (
       (p_branch IS NULL AND nullif(l->>'branch_id','') IS NULL) OR
       l->>'branch_id' = p_branch::text OR
       (nullif(l->>'branch_id','') IS NULL AND EXISTS (
         SELECT 1 FROM branches b WHERE b.id = p_branch AND
          (lower(l->>'ward_area') IN (lower(b.name), lower(b.ward_area), lower(b.code)) OR
           l->>'ward_no' = b.ward_no::text OR
           l->>'ward_area' = 'Ward ' || b.ward_no || ': ' || b.name)
       )))), 0)
   - (SELECT count(*) FROM tenants t WHERE t.ev_model_id = m.id
       AND t.old_ev_id IS NULL AND t.branch_id IS NOT DISTINCT FROM p_branch
       AND t.created_at >= m.stock_reset_at)
 ))::integer FROM ev_models m WHERE m.id = p_model;
$$;

CREATE OR REPLACE FUNCTION model_stock_balances(p_models uuid[])
RETURNS jsonb LANGUAGE sql STABLE SET search_path = public AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'stock_count', m.stock_count,
   'branches', (SELECT coalesce(jsonb_object_agg(b.id::text, available_model_stock(m.id,b.id)), '{}') FROM branches b))), '[]')
 FROM ev_models m WHERE m.id = ANY(p_models);
$$;

CREATE OR REPLACE FUNCTION create_contract(p_tenant jsonb, p_actor uuid, p_booking uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public AS $$
DECLARE m ev_models; used old_evs; bk bookings; t tenants; payload jsonb; cols text; price numeric; branch uuid; ho uuid;
BEGIN
  payload := p_tenant - 'id' - 'created_at' - 'updated_at';
  IF coalesce(payload->>'status', 'rented') NOT IN ('rented', 'direct_purchase') THEN RAISE EXCEPTION 'Invalid initial contract status'; END IF;
  IF p_booking IS NOT NULL THEN
    SELECT * INTO bk FROM bookings WHERE id = p_booking FOR UPDATE;
    IF NOT FOUND OR bk.status <> 'pending' THEN RAISE EXCEPTION 'Booking not pending'; END IF;
    PERFORM assert_inventory_scope(p_actor, bk.branch_id);
    payload := payload || jsonb_build_object('branch_id', bk.branch_id, 'head_office_id', bk.head_office_id, 'booking_amount', bk.booking_amount);
  END IF;
  branch := (payload->>'branch_id')::uuid;
  PERFORM assert_inventory_scope(p_actor, branch);
  IF branch IS NOT NULL THEN
    SELECT head_office_id INTO ho FROM branches WHERE id = branch;
    IF NOT FOUND THEN RAISE EXCEPTION 'Branch not found'; END IF;
    payload := payload || jsonb_build_object('head_office_id', ho);
  END IF;
  SELECT * INTO m FROM ev_models WHERE id = (payload->>'ev_model_id')::uuid AND is_active FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'EV Model not found'; END IF;
  price := m.total_price;
  IF nullif(payload->>'old_ev_id', '') IS NOT NULL THEN
    SELECT * INTO used FROM old_evs WHERE id = (payload->>'old_ev_id')::uuid FOR UPDATE;
    IF NOT FOUND OR used.status <> 'available' OR used.original_ev_model_id <> m.id OR used.branch_id IS DISTINCT FROM branch THEN RAISE EXCEPTION 'Selected used EV is not available in this branch'; END IF;
    price := used.price;
    UPDATE old_evs SET status = CASE WHEN payload->>'status' = 'direct_purchase' THEN 'sold' ELSE 'rented' END WHERE id = used.id;
  ELSE
    IF m.stock_count < 1 OR coalesce(available_model_stock(m.id, branch), 0) < 1 THEN RAISE EXCEPTION 'EV Model out of stock in this branch'; END IF;
    UPDATE ev_models SET stock_count = stock_count - 1 WHERE id = m.id;
  END IF;
  payload := payload || jsonb_build_object('created_by', p_actor, 'total_price', coalesce((payload->>'total_price')::numeric, price));
  IF p_booking IS NOT NULL THEN payload := payload || jsonb_build_object('total_price', price); END IF;
  SELECT string_agg(format('%I', k), ', ' ORDER BY k) INTO cols FROM jsonb_object_keys(payload) k;
  -- Quote identifiers, bind values, and keep database defaults for absent fields.
  EXECUTE format('INSERT INTO tenants (%s) SELECT %s FROM jsonb_populate_record(NULL::tenants, $1) RETURNING *', cols, cols) INTO t USING payload;
  IF p_booking IS NOT NULL THEN
    UPDATE bookings SET status = 'converted', converted_to = t.id,
      converted_type = CASE WHEN t.status = 'direct_purchase' THEN 'direct_purchase' ELSE 'rental' END WHERE id = p_booking;
  END IF;
  RETURN to_jsonb(t);
END $$;

CREATE OR REPLACE FUNCTION cancel_contract(p_tenant uuid, p_actor uuid)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public AS $$
DECLARE t tenants;
BEGIN
 SELECT * INTO t FROM tenants WHERE id=p_tenant FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Rental not found'; END IF;
 PERFORM assert_inventory_scope(p_actor,t.branch_id);
 IF t.status NOT IN ('rented','direct_purchase','completed') THEN RAISE EXCEPTION 'Contract already cancelled'; END IF;
 UPDATE tenants SET status='cancelled',updated_at=now() WHERE id=t.id;
 INSERT INTO old_evs(original_ev_model_id,returned_from_tenant_id,chassis_no,motor_no,controller_no,battery_no,charger_no,branch_id,head_office_id,price,status)
 VALUES(t.ev_model_id,t.id,t.chassis_no,t.motor_no,t.controller_no,t.battery_no,t.charger_no,t.branch_id,t.head_office_id,0,'available');
 RETURN jsonb_build_object('success',true);
END $$;

CREATE OR REPLACE FUNCTION waive_penalty(p_penalty text,p_actor uuid,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public AS $$
DECLARE l audit_logs; u users; t tenants; payload jsonb;
BEGIN
 SELECT * INTO u FROM users WHERE id=p_actor AND is_active;
 IF NOT FOUND OR u.role NOT IN ('super_admin','ho_admin','admin') OR (u.role='admin' AND u.branch_id IS NOT NULL) THEN RAISE EXCEPTION 'Access denied: Unauthorized penalty waiver'; END IF;
 SELECT * INTO l FROM audit_logs WHERE entity_type='penalty' AND action='PENALTY_LEVIED' AND changes->>'penalty_id'=p_penalty ORDER BY created_at,id LIMIT 1 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Penalty not found'; END IF;
 SELECT * INTO t FROM tenants WHERE id=coalesce((l.changes->>'tenant_id')::uuid,l.entity_id);
 IF NOT FOUND THEN RAISE EXCEPTION 'Customer not found'; END IF;
 PERFORM assert_inventory_scope(p_actor,t.branch_id);
 IF coalesce(l.changes->>'status','unpaid') <> 'unpaid' THEN RAISE EXCEPTION 'Penalty is not unpaid'; END IF;
 payload := l.changes || jsonb_build_object('tenant_id',t.id,'branch_id',t.branch_id,'head_office_id',t.head_office_id,'status','waived','waived_by',p_actor,'waived_at',now(),'waived_reason',p_reason);
 UPDATE audit_logs SET changes=payload WHERE id=l.id;
 INSERT INTO audit_logs(user_id,user_role,action,entity_type,entity_id,changes) VALUES(p_actor,u.role,'PENALTY_WAIVED','penalty',t.id,payload);
 RETURN jsonb_build_object('success',true,'penalty',payload);
END $$;

CREATE OR REPLACE FUNCTION change_transfer(p_transfer text, p_action text, p_data jsonb, p_actor uuid)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public AS $$
DECLARE t bike_transfers; m ev_models; u users; payload jsonb; target uuid; delta integer; event text;
BEGIN
  SELECT * INTO t FROM bike_transfers WHERE transfer_id = p_transfer FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transfer record not found'; END IF;
  target := CASE WHEN p_action = 'receive' THEN t.to_branch_id ELSE t.from_branch_id END;
  PERFORM assert_inventory_scope(p_actor, target);
  SELECT * INTO u FROM users WHERE id = p_actor;
  IF (p_action IN ('dispatch','cancel') AND t.status <> 'requested') OR (p_action = 'receive' AND t.status <> 'in_transit') OR p_action NOT IN ('dispatch','receive','cancel') THEN RAISE EXCEPTION 'Invalid transfer transition'; END IF;
  IF t.quantity < 1 THEN RAISE EXCEPTION 'Invalid transfer quantity'; END IF;
  payload := t.details || jsonb_build_object('id',t.id,'transfer_id',t.transfer_id,'ev_model_id',t.ev_model_id,'quantity',t.quantity,'from_branch_id',t.from_branch_id,'to_branch_id',t.to_branch_id);
  IF p_action <> 'cancel' THEN
    SELECT * INTO m FROM ev_models WHERE id = t.ev_model_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'EV Model not found'; END IF;
    IF p_action = 'dispatch' AND (m.stock_count < t.quantity OR coalesce(available_model_stock(m.id, target), 0) < t.quantity) THEN RAISE EXCEPTION 'Insufficient stock at source branch'; END IF;
    delta := CASE WHEN p_action = 'dispatch' THEN -t.quantity ELSE t.quantity END;
    UPDATE ev_models SET stock_count = stock_count + delta,
      stock_logs = stock_logs || jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'date',now(),'type','transfer','stock_added',delta,'branch_id',target,'transfer_id',t.transfer_id)) WHERE id = m.id;
  END IF;
  IF p_action = 'dispatch' THEN
    t.status := 'in_transit'; t.dispatched_by := p_actor;
    t.dispatch_notes := coalesce(p_data->>'dispatch_notes','');
    t.challan_number := coalesce(nullif(p_data->>'challan_number',''), 'CH-' || t.transfer_id);
    t.driver_name := coalesce(p_data->>'driver_name',''); t.driver_phone := coalesce(p_data->>'driver_phone','');
    payload := payload || jsonb_build_object('dispatched_at',now(),'dispatched_by',p_actor,'dispatched_by_name',u.name,'dispatch_notes',t.dispatch_notes,'challan_number',t.challan_number,'driver_name',t.driver_name,'driver_phone',t.driver_phone);
  ELSIF p_action = 'receive' THEN
    t.status := 'received'; t.received_by := p_actor;
    t.receive_notes := coalesce(p_data->>'receive_notes',''); t.condition_received := coalesce(p_data->>'condition_received','Good');
    payload := payload || jsonb_build_object('received_at',now(),'received_by',p_actor,'received_by_name',u.name,'receive_notes',t.receive_notes,'condition_received',t.condition_received);
  ELSE
    t.status := 'cancelled';
    payload := payload || jsonb_build_object('cancelled_at',now(),'cancelled_by',p_actor,'cancelled_by_name',u.name,'cancel_reason',coalesce(p_data->>'cancel_reason','Cancelled by admin'));
  END IF;
  payload := payload || jsonb_build_object('status',t.status);
  UPDATE bike_transfers SET status=t.status, details=payload, dispatched_by=t.dispatched_by, received_by=t.received_by,
    dispatch_notes=t.dispatch_notes, challan_number=t.challan_number, driver_name=t.driver_name, driver_phone=t.driver_phone,
    receive_notes=t.receive_notes, condition_received=t.condition_received, updated_at=now() WHERE id=t.id;
  INSERT INTO audit_logs(user_id,user_role,action,entity_type,entity_id,changes) VALUES(p_actor,u.role,upper(p_action),'stock_transfer',t.id,payload);
  RETURN payload;
END $$;

CREATE OR REPLACE FUNCTION initiate_transfer(p_data jsonb, p_actor uuid)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public AS $$
DECLARE t bike_transfers; u users; payload jsonb;
BEGIN
  PERFORM assert_inventory_scope(p_actor,(p_data->>'from_branch_id')::uuid);
  SELECT * INTO u FROM users WHERE id=p_actor;
  IF u.role = 'ho_admin' OR (u.role = 'admin' AND u.branch_id IS NULL AND u.head_office_id IS NOT NULL) THEN PERFORM assert_inventory_scope(p_actor,(p_data->>'to_branch_id')::uuid); END IF;
  IF (p_data->>'from_branch_id') IS NOT DISTINCT FROM (p_data->>'to_branch_id') THEN RAISE EXCEPTION 'Source and destination must differ'; END IF;
  IF (p_data->>'quantity')::integer < 1 THEN RAISE EXCEPTION 'Invalid transfer quantity'; END IF;
  INSERT INTO bike_transfers(transfer_id,from_branch_id,to_branch_id,ev_model_id,quantity,status,dispatch_notes,initiated_by)
    VALUES(p_data->>'transfer_id',(p_data->>'from_branch_id')::uuid,(p_data->>'to_branch_id')::uuid,(p_data->>'ev_model_id')::uuid,(p_data->>'quantity')::integer,'requested',p_data->>'notes',p_actor) RETURNING * INTO t;
  payload := p_data || jsonb_build_object('id',t.id,'status','requested','created_at',t.created_at,'initiated_by',p_actor,'initiated_by_name',u.name);
  UPDATE bike_transfers SET details=payload WHERE id=t.id;
  INSERT INTO audit_logs(user_id,user_role,action,entity_type,entity_id,changes) VALUES(p_actor,u.role,'INITIATED','stock_transfer',t.id,payload);
  RETURN payload;
END $$;

-- All inventory edits share the same model lock as contract/transfer operations.
CREATE OR REPLACE FUNCTION edit_model_inventory(p_model uuid, p_patch jsonb, p_append jsonb DEFAULT NULL, p_reset boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public AS $$
DECLARE m ev_models; logs jsonb; delta integer; cols text; result ev_models;
BEGIN
 SELECT * INTO m FROM ev_models WHERE id=p_model FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Model not found'; END IF;
 IF p_reset THEN
   UPDATE ev_models SET stock_count=0,stock_logs='[]',stock_reset_at=now() WHERE id=p_model RETURNING * INTO result;
 ELSE
   logs := CASE WHEN p_append IS NOT NULL THEN m.stock_logs || jsonb_build_array(p_append) ELSE coalesce(p_patch->'stock_logs', m.stock_logs) END;
   IF EXISTS(SELECT 1 FROM jsonb_array_elements(m.stock_logs) old_log WHERE old_log->>'type'='transfer' AND NOT logs @> jsonb_build_array(old_log)) THEN
     RAISE EXCEPTION 'Transfer movement logs cannot be edited';
   END IF;
   SELECT coalesce(sum(coalesce((l->>'stock_added')::integer,0)),0) INTO delta FROM jsonb_array_elements(logs) l;
   delta := delta - (SELECT coalesce(sum(coalesce((l->>'stock_added')::integer,0)),0) FROM jsonb_array_elements(m.stock_logs) l);
   IF m.stock_count + delta < 0 THEN RAISE EXCEPTION 'Cannot remove already allocated stock'; END IF;
   IF p_patch ? 'stock_count' AND NOT p_patch ? 'stock_logs' THEN RAISE EXCEPTION 'Use receipt logs to adjust stock'; END IF;
   p_patch := (p_patch - 'stock_count') || jsonb_build_object('stock_logs',logs,'stock_count',m.stock_count+delta,'updated_at',now());
   IF EXISTS(SELECT 1 FROM jsonb_object_keys(p_patch) k WHERE k NOT IN ('name','company','ward','total_price','kilometres','is_active','stock_logs','stock_count','updated_at')) THEN RAISE EXCEPTION 'Unsupported model update'; END IF;
   SELECT string_agg(format('%1$I = v.%1$I',k),', ') INTO cols FROM jsonb_object_keys(p_patch) k;
   EXECUTE format('UPDATE ev_models m SET %s FROM jsonb_populate_record(NULL::ev_models,$1) v WHERE m.id=$2 RETURNING m.*',cols) INTO result USING p_patch,p_model;
 END IF;
 RETURN to_jsonb(result);
END $$;

-- Supabase can also apply explicit default grants to anon/authenticated.
DO $grants$
DECLARE r text;
BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated') LOOP
   EXECUTE format('REVOKE ALL ON FUNCTION revoke_password_sessions(), assert_inventory_scope(uuid,uuid), available_model_stock(uuid,uuid), model_stock_balances(uuid[]), create_contract(jsonb,uuid,uuid), cancel_contract(uuid,uuid), waive_penalty(text,uuid,text), initiate_transfer(jsonb,uuid), change_transfer(text,text,jsonb,uuid), edit_model_inventory(uuid,jsonb,jsonb,boolean) FROM %I', r);
 END LOOP;
END $grants$;
REVOKE ALL ON FUNCTION revoke_password_sessions() FROM PUBLIC;
REVOKE ALL ON FUNCTION assert_inventory_scope(uuid,uuid), available_model_stock(uuid,uuid), model_stock_balances(uuid[]), create_contract(jsonb,uuid,uuid), cancel_contract(uuid,uuid), waive_penalty(text,uuid,text), initiate_transfer(jsonb,uuid), change_transfer(text,text,jsonb,uuid), edit_model_inventory(uuid,jsonb,jsonb,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION assert_inventory_scope(uuid,uuid), available_model_stock(uuid,uuid), model_stock_balances(uuid[]), create_contract(jsonb,uuid,uuid), cancel_contract(uuid,uuid), waive_penalty(text,uuid,text), initiate_transfer(jsonb,uuid), change_transfer(text,text,jsonb,uuid), edit_model_inventory(uuid,jsonb,jsonb,boolean) TO service_role;
COMMIT;
NOTIFY pgrst, 'reload schema';
