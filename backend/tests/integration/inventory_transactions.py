"""Real PostgreSQL regression checks. Use a disposable database ending _test/_audit.
PSQL_TEST_COMMAND can select a local test connection; defaults to psql.
No provider credentials or customer fixtures are used.
"""
import concurrent.futures
import json
import os
from pathlib import Path
import shlex
import subprocess

ROOT = Path(__file__).resolve().parents[2]
CMD = shlex.split(os.environ.get('PSQL_TEST_COMMAND', 'psql')) + ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1']

def run(sql, ok=True):
    p = subprocess.run(CMD, input=sql, text=True, capture_output=True)
    if ok and p.returncode:
        raise AssertionError(p.stderr)
    return p

def scalar(sql):
    return run(sql).stdout.strip()

def literal(value):
    return "'" + str(value).replace("'", "''") + "'"

def rpc(name, *args):
    values = [literal(json.dumps(a)) + '::jsonb' if isinstance(a, dict) else literal(a) for a in args]
    return 'SELECT ' + name + '(' + ','.join(values) + ');'

assert scalar('SELECT current_database()').endswith(('_test', '_audit')), 'Use a disposable database ending _test/_audit'
run("DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN; END IF; END $$;")
run((ROOT / 'db/schema.sql').read_text())
run('TRUNCATE head_offices,branches,users,ev_models,tenants,old_evs,payments,bookings,audit_logs,bike_transfers,penalties CASCADE;')
run("ALTER TABLE tenants ADD CONSTRAINT tenants_phone_key UNIQUE(phone); CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_chassis ON tenants(chassis_no);")
run("DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF; IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF; END $$;")
run('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated;')
run((ROOT / 'db/migrations/20261025_audit_repairs.sql').read_text())
run((ROOT / 'db/migrations/20261025_audit_repairs.sql').read_text())
ids = {k: f'00000000-0000-4000-8000-{i:012d}' for i, k in enumerate(['ho','other_ho','a','b','foreign','staff','ho_user','super','model','booking','used'], 1)}

def reset():
    run('TRUNCATE head_offices,branches,users,ev_models,tenants,old_evs,payments,bookings,audit_logs,bike_transfers,penalties CASCADE;')
    run(f"""
    INSERT INTO head_offices(id,name,code,city,state) VALUES ('{ids['ho']}','Synthetic HO','A','Test','Test'),('{ids['other_ho']}','Other HO','B','Test','Test');
    INSERT INTO branches(id,head_office_id,name,code,ward_no) VALUES ('{ids['a']}','{ids['ho']}','Synthetic A','A',1),('{ids['b']}','{ids['ho']}','Synthetic B','B',2),('{ids['foreign']}','{ids['other_ho']}','Foreign','F',3);
    INSERT INTO users(id,name,role,branch_id,head_office_id) VALUES ('{ids['staff']}','Synthetic staff','staff','{ids['a']}','{ids['ho']}'),('{ids['ho_user']}','Synthetic HO','ho_admin',NULL,'{ids['ho']}'),('{ids['super']}','Synthetic super','super_admin',NULL,NULL);
    INSERT INTO ev_models(id,name,company,ward,total_price,stock_count,stock_logs) VALUES ('{ids['model']}','Synthetic Model','Test','A',10000,2,'[{{"branch_id":"{ids['a']}","stock_added":2}}]');
    """)

def tenant(n, **extra):
    return dict(ev_model_id=ids['model'], branch_id=ids['a'], name='Synthetic', phone=f'900000{n:04d}', gender='male', **extra)

def parallel(sqls):
    with concurrent.futures.ThreadPoolExecutor(max_workers=len(sqls)) as pool:
        return list(pool.map(lambda sql: run(sql, ok=False), sqls))

count = 0

def check(name, test):
    global count
    reset()
    test()
    count += 1
    print('PASS:', name)

def concurrency():
    results = parallel([rpc('create_contract',tenant(i),ids['staff']) for i in range(3)])
    assert sum(p.returncode == 0 for p in results) == 2
    assert scalar('SELECT count(*) FROM tenants') == '2'
    assert scalar('SELECT stock_count FROM ev_models') == '0'
    assert scalar(f"SELECT available_model_stock('{ids['model']}','{ids['a']}')") == '0'
check('three concurrent requests cannot allocate more than two units', concurrency)

def branch_concurrency():
    run("UPDATE ev_models SET stock_logs = " + literal(json.dumps([{'branch_id': ids['a'], 'stock_added': 1}, {'branch_id': ids['b'], 'stock_added': 1}])) + "::jsonb;")
    results = parallel([rpc('create_contract',tenant(i),ids['staff']) for i in range(2)])
    assert sum(p.returncode == 0 for p in results) == 1
    assert scalar('SELECT stock_count FROM ev_models') == '1'
check('concurrent requests cannot borrow stock from another branch', branch_concurrency)

def rollback():
    bad = tenant(1); bad['gender'] = 'invalid'
    assert run(rpc('create_contract',bad,ids['staff']),ok=False).returncode
    assert scalar('SELECT stock_count FROM ev_models') == '2'
    assert scalar('SELECT count(*) FROM tenants') == '0'
check('failed contract insert rolls back stock', rollback)

def booking():
    run(f"INSERT INTO bookings(id,name,phone,ev_model_id,branch_id,head_office_id,created_by) VALUES ('{ids['booking']}','Synthetic','9000000001','{ids['model']}','{ids['a']}','{ids['ho']}','{ids['staff']}');")
    results=parallel([rpc('create_contract',tenant(i),ids['staff'],ids['booking']) for i in [1,2]])
    assert sum(p.returncode == 0 for p in results) == 1
    assert scalar('SELECT stock_count FROM ev_models') == '1'
    assert scalar("SELECT status || ':' || (converted_to IS NOT NULL)::text FROM bookings") == 'converted:true'
check('booking converts once under concurrent requests', booking)

def booking_failure():
    run(f"INSERT INTO bookings(id,name,phone,ev_model_id,branch_id,head_office_id,created_by) VALUES ('{ids['booking']}','Synthetic','9000000001','{ids['model']}','{ids['a']}','{ids['ho']}','{ids['staff']}');")
    run("CREATE FUNCTION fail_booking_update() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic write failure'; END $$; CREATE TRIGGER synthetic_failure BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION fail_booking_update();")
    try:
        assert run(rpc('create_contract',tenant(1),ids['staff'],ids['booking']),ok=False).returncode
        assert scalar('SELECT count(*) FROM tenants') == '0'
        assert scalar('SELECT stock_count FROM ev_models') == '2'
        assert scalar('SELECT status FROM bookings') == 'pending'
    finally:
        run('DROP TRIGGER synthetic_failure ON bookings; DROP FUNCTION fail_booking_update();')
check('booking finalization error rolls back contract and stock', booking_failure)

def scopes():
    foreign=tenant(1); foreign['branch_id']=ids['foreign']
    assert run(rpc('create_contract',foreign,ids['staff']),ok=False).returncode
    assert run(rpc('create_contract',foreign,ids['ho_user']),ok=False).returncode
    assert scalar('SELECT stock_count FROM ev_models') == '2'
check('database rejects staff/HO allocations outside scope', scopes)

def used():
    run(f"INSERT INTO old_evs(id,original_ev_model_id,branch_id,head_office_id,price) VALUES ('{ids['used']}','{ids['model']}','{ids['a']}','{ids['ho']}',5000);")
    results=parallel([rpc('create_contract',tenant(i,old_ev_id=ids['used']),ids['staff']) for i in [1,2]])
    assert sum(p.returncode == 0 for p in results) == 1
    assert scalar('SELECT stock_count FROM ev_models') == '2'
    assert scalar('SELECT status FROM old_evs') == 'rented'
check('used vehicle is issued once without decrementing new stock', used)

def transfer():
    data=dict(transfer_id='SYN-TRANSFER',from_branch_id=ids['a'],to_branch_id=ids['b'],ev_model_id=ids['model'],quantity=1)
    run(rpc('initiate_transfer',data,ids['ho_user']))
    results=parallel([rpc('change_transfer','SYN-TRANSFER','dispatch',{},ids['ho_user']) for _ in range(2)])
    assert sum(p.returncode == 0 for p in results) == 1
    assert scalar('SELECT stock_count FROM ev_models') == '1'
    assert scalar(f"SELECT available_model_stock('{ids['model']}','{ids['a']}')") == '1'
    results=parallel([rpc('change_transfer','SYN-TRANSFER','receive',{},ids['ho_user']) for _ in range(2)])
    assert sum(p.returncode == 0 for p in results) == 1
    assert scalar('SELECT stock_count FROM ev_models') == '2'
    assert scalar(f"SELECT available_model_stock('{ids['model']}','{ids['b']}')") == '1'
    assert scalar("SELECT count(*) FROM audit_logs WHERE entity_type='stock_transfer'") == '3'
check('dispatch/receive atomically move stock once and retain all audit events', transfer)

def cancellation():
    data=dict(transfer_id='SYN-CANCEL',from_branch_id=ids['a'],to_branch_id=ids['b'],ev_model_id=ids['model'],quantity=1)
    run(rpc('initiate_transfer',data,ids['ho_user']))
    run(rpc('change_transfer','SYN-CANCEL','cancel',{},ids['ho_user']))
    assert scalar('SELECT stock_count FROM ev_models') == '2'
    assert scalar('SELECT status FROM bike_transfers') == 'cancelled'
check('requested transfer cancellation works without inventory movement', cancellation)

def audit_failure():
    data=dict(transfer_id='SYN-FAIL',from_branch_id=ids['a'],to_branch_id=ids['b'],ev_model_id=ids['model'],quantity=1)
    run(rpc('initiate_transfer',data,ids['ho_user']))
    run("CREATE FUNCTION fail_audit_insert() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic audit failure'; END $$; CREATE TRIGGER synthetic_audit_failure BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION fail_audit_insert();")
    try:
        assert run(rpc('change_transfer','SYN-FAIL','dispatch',{},ids['ho_user']),ok=False).returncode
        assert scalar('SELECT stock_count FROM ev_models') == '2'
        assert scalar('SELECT status FROM bike_transfers') == 'requested'
    finally:
        run('DROP TRIGGER synthetic_audit_failure ON audit_logs; DROP FUNCTION fail_audit_insert();')
check('audit failure rolls back transfer status and inventory', audit_failure)

def edits():
    run(rpc('create_contract',tenant(1),ids['staff']))
    log={'branch_id':ids['a'],'stock_added':1,'date':'2099-01-01'}
    run(rpc('edit_model_inventory',ids['model'],{},log))
    assert scalar('SELECT stock_count FROM ev_models') == '2'
    assert scalar(f"SELECT available_model_stock('{ids['model']}','{ids['a']}')") == '2'
    assert run(rpc('edit_model_inventory',ids['model'],{'stock_logs':[]}),ok=False).returncode
    assert scalar('SELECT stock_count FROM ev_models') == '2'
check('receipt edits preserve issued units and reject negative balances', edits)

def uniqueness():
    run(rpc('create_contract',tenant(1,status='direct_purchase',chassis_no='SYN-HW'),ids['staff']))
    run(rpc('create_contract',tenant(1,status='direct_purchase',chassis_no='SYN-HW-2'),ids['staff']))
    assert scalar('SELECT count(*) FROM tenants') == '2'
    # Free hardware only on cancellation, while repeated customers remain allowed.
    run("UPDATE tenants SET status='cancelled'; UPDATE ev_models SET stock_count=1;")
    assert run(rpc('create_contract',tenant(1,chassis_no='SYN-HW'),ids['staff']), ok=False).returncode  # branch receipts exhausted
    run(rpc('edit_model_inventory',ids['model'],{}, {'branch_id':ids['a'],'stock_added':1}))
    run(rpc('create_contract',tenant(1,chassis_no='SYN-HW'),ids['staff']))
check('repeat purchases and cancelled hardware reuse survive migrated constraints', uniqueness)

def returned_vehicle():
    row=json.loads(run(rpc('create_contract',tenant(1),ids['staff'])).stdout)
    results=parallel([rpc('cancel_contract',row['id'],ids['staff']) for _ in range(2)])
    assert sum(p.returncode == 0 for p in results) == 1
    assert scalar('SELECT count(*) FROM old_evs') == '1'
    assert scalar("SELECT status FROM tenants") == 'cancelled'
    assert scalar('SELECT stock_count FROM ev_models') == '1'
check('concurrent cancellations create one returned vehicle', returned_vehicle)

def waiver():
    row=json.loads(run(rpc('create_contract',tenant(1),ids['staff'])).stdout)
    payload={'penalty_id':'SYN-PEN','tenant_id':row['id'],'branch_id':ids['a'],'head_office_id':ids['ho'],'status':'unpaid','amount':50}
    run("INSERT INTO audit_logs(user_id,user_role,action,entity_type,entity_id,changes) VALUES (" + literal(ids['super']) + ",'super_admin','PENALTY_LEVIED','penalty'," + literal(row['id']) + ',' + literal(json.dumps(payload)) + '::jsonb);')
    results=parallel([rpc('waive_penalty','SYN-PEN',ids['ho_user'],'Synthetic waiver') for _ in range(2)])
    assert sum(p.returncode == 0 for p in results) == 1
    assert scalar("SELECT count(*) FROM audit_logs WHERE action='PENALTY_WAIVED'") == '1'
check('concurrent penalty waivers preserve ownership and commit once', waiver)

def password_revocation():
    run(f"UPDATE users SET password_hash='synthetic-hash',refresh_token_hash='synthetic-refresh' WHERE id='{ids['staff']}';")
    assert scalar(f"SELECT auth_version FROM users WHERE id='{ids['staff']}'") == '1'
    assert scalar(f"SELECT refresh_token_hash IS NULL FROM users WHERE id='{ids['staff']}'") == 't'
check('password mutations increment token version and revoke refresh credentials', password_revocation)

run("DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='ev_anon_test') THEN CREATE ROLE ev_anon_test NOLOGIN; END IF; END $$;")
assert scalar("SELECT has_function_privilege('ev_anon_test','create_contract(jsonb,uuid,uuid)','EXECUTE')") == 'f'
assert scalar("SELECT has_function_privilege('anon','create_contract(jsonb,uuid,uuid)','EXECUTE') OR has_function_privilege('authenticated','change_transfer(text,text,jsonb,uuid)','EXECUTE')") == 'f'
print(f'PASS: {count} database scenarios; migration rerun and restricted RPC privileges verified')
