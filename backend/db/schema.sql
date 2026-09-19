-- ─────────────────────────────────────────────────────────────────────────────
-- GO SPEEDY EV FINANCE SCHEME — FULL SCHEMA
-- Single cumulative migration file. Update in place. Re-run on fresh DB.
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable the pg_trgm extension for ILIKE search indices (gin_trgm_ops)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── TABLE 0A: head_offices ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS head_offices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  code        TEXT UNIQUE NOT NULL,
  city        TEXT NOT NULL,
  state       TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── TABLE 0B: branches (Wards & Locations) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS branches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  head_office_id  UUID NOT NULL REFERENCES head_offices(id) ON DELETE CASCADE,
  ward_no         INTEGER,
  name            TEXT NOT NULL,
  code            TEXT UNIQUE NOT NULL,
  ward_area       TEXT,
  address         TEXT,
  phone           VARCHAR(15),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_branches_ho ON branches(head_office_id);
CREATE INDEX IF NOT EXISTS idx_branches_code ON branches(code);

-- ── TABLE 1: users ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  head_office_id           UUID REFERENCES head_offices(id),
  branch_id                UUID REFERENCES branches(id),
  name                     TEXT NOT NULL,
  phone                    VARCHAR(10) UNIQUE CHECK (phone IS NULL OR phone ~ '^[0-9]{10}$'),                  -- NULL for OAuth users until updated
  email                    TEXT UNIQUE,
  password_hash            TEXT,                         -- NULL for OAuth users
  oauth_provider           TEXT,                         -- 'google', etc.
  oauth_id                 TEXT,                         -- Google profile ID
  role                     TEXT NOT NULL
                             CHECK (role IN ('super_admin', 'ho_admin', 'branch_admin', 'staff', 'admin')),
  ward_area                TEXT,
  is_active                BOOLEAN NOT NULL DEFAULT true,
  refresh_token_hash       TEXT,                         -- bcrypt hash; NULL = logged out
  refresh_token_expires_at TIMESTAMPTZ,
  reset_otp_hash           TEXT,                         -- bcrypt hash of 6-digit reset OTP
  reset_otp_expires_at     TIMESTAMPTZ,                  -- 10-minute expiry for reset OTP
  created_by               UUID REFERENCES users(id),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oauth ON users(oauth_provider, oauth_id);
CREATE INDEX IF NOT EXISTS idx_users_branch ON users(branch_id);
CREATE INDEX IF NOT EXISTS idx_users_ho ON users(head_office_id);

-- ── TABLE 2: ev_models ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ev_models (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  head_office_id UUID REFERENCES head_offices(id),
  branch_id      UUID REFERENCES branches(id),
  name           TEXT NOT NULL,
  company        TEXT NOT NULL,
  ward           TEXT NOT NULL,
  total_price    NUMERIC(12,2) NOT NULL CHECK (total_price > 0),
  stock_count    INTEGER NOT NULL DEFAULT 0 CHECK (stock_count >= 0),
  stock_logs     JSONB NOT NULL DEFAULT '[]',
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_by     UUID REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ev_models_branch ON ev_models(branch_id);

-- ── TABLE 3: old_evs ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS old_evs (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  head_office_id          UUID REFERENCES head_offices(id),
  branch_id               UUID REFERENCES branches(id),
  original_ev_model_id    UUID REFERENCES ev_models(id),
  returned_from_tenant_id UUID, -- References tenants(id), but defined later to avoid circular dependency
  chassis_no              TEXT,
  motor_no                TEXT,
  controller_no           TEXT,
  battery_no              TEXT,
  charger_no              TEXT,
  price                   NUMERIC(12,2),
  status                  TEXT DEFAULT 'available' CHECK (status IN ('available', 'rented', 'sold')),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_old_evs_branch ON old_evs(branch_id);

-- ── TABLE 4: tenants ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  head_office_id UUID REFERENCES head_offices(id),
  branch_id      UUID REFERENCES branches(id),
  ev_model_id    UUID NOT NULL REFERENCES ev_models(id),
  old_ev_id      UUID REFERENCES old_evs(id),

  -- Status
  status         TEXT NOT NULL DEFAULT 'rented'
                   CHECK (status IN ('rented','completed','cancelled','direct_purchase')),

  -- Personal
  name           TEXT NOT NULL,
  phone          VARCHAR(10) UNIQUE CHECK (phone IS NULL OR phone ~ '^[0-9]{10}$'),
  gender         TEXT NOT NULL CHECK (gender IN ('male','female')),
  address        TEXT,
  has_pending_docs BOOLEAN NOT NULL DEFAULT false,
  rent_agreement_signed BOOLEAN NOT NULL DEFAULT false,

  -- Document storage paths (opaque UUIDs — not public URLs)
  aadhar_path           TEXT,
  pan_path              TEXT,
  cheque_path           TEXT,
  electricity_bill_path TEXT,
  tenant_photo_path     TEXT,
  scooty_photo_path     TEXT,
  rent_agreement_path   TEXT,
  scooty_insurance_path TEXT,
  rider_insurance_path  TEXT,
  rider_license_path    TEXT,

  -- Scooty hardware
  chassis_no    TEXT,
  motor_no      TEXT,
  controller_no TEXT,
  charger_no    TEXT,
  battery_no    TEXT,
  rto_type      TEXT CHECK (rto_type IS NULL OR rto_type IN ('rto','non_rto')),
  hp_financer   TEXT,
  date_of_purchase DATE,
  date_of_delivery DATE,

  -- Financial
  total_price         NUMERIC(12,2),               -- snapshot of ev_models.total_price at time of rental
  booking_amount      NUMERIC(12,2) DEFAULT 0 CHECK (booking_amount >= 0),
  downpayment_paid    NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (downpayment_paid >= 0),
  downpayment_mode    TEXT CHECK (downpayment_mode IS NULL OR
                               downpayment_mode IN ('cash','online','not_paid')),
  dp_by_other         BOOLEAN NOT NULL DEFAULT false,
  dp_other_name       TEXT,
  dp_other_phone      TEXT,
  late_fee_daily_rate NUMERIC(8,2) NOT NULL DEFAULT 50.00,

  -- Installments
  installment_daily_rate  NUMERIC(8,2) NOT NULL DEFAULT 250,
  installment_frequency   TEXT NOT NULL DEFAULT 'daily'
                            CHECK (installment_frequency IN ('daily','weekly','monthly')),
  installment_by_self     BOOLEAN NOT NULL DEFAULT true,
  installment_other_name  TEXT,
  installment_other_phone TEXT,

  -- Contract timeline
  start_date        DATE,
  total_months      INTEGER DEFAULT 24,
  expected_end_date DATE,                          -- computed: start_date + 24 months

  -- JSONB: references × 3  [{category, name, area, phone}]
  "references"   JSONB NOT NULL DEFAULT '[]',
  -- JSONB: guarantors × 2  [{gender, name, address, phone}]
  guarantors   JSONB NOT NULL DEFAULT '[]',

  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes        TEXT,

  -- Hardware
  vehicle_number           TEXT,

  -- Insurance
  scooty_insurance_company TEXT,
  scooty_policy_number     TEXT,
  scooty_policy_expiry     DATE,
  scooty_insurance_amount  NUMERIC(12,2),
  scooty_insurance_idv     NUMERIC(12,2),
  scooty_insurance_start   DATE,
  rider_insurance_company  TEXT,
  rider_policy_number      TEXT,
  rider_policy_expiry      DATE,
  rider_insurance_amount   NUMERIC(12,2),
  rider_insurance_idv      NUMERIC(12,2),
  rider_insurance_start    DATE,

  -- AMC (Annual Maintenance Contract)
  amc_amount               NUMERIC(12,2),
  amc_start_date           DATE,
  amc_expire_date          DATE,
  amc_service_log          JSONB NOT NULL DEFAULT '[]',
  -- Each entry: { date, what_change, old_serial_no, new_serial_no, cost }

  -- Buyback / Early Exit
  buyback_amount           NUMERIC(12,2),

  -- Financial sanity checks
  CONSTRAINT chk_booking_lte_price
    CHECK (booking_amount IS NULL OR total_price IS NULL OR booking_amount <= total_price),
  CONSTRAINT chk_dp_lte_contract
    CHECK (downpayment_paid <= COALESCE(total_price,0) - COALESCE(booking_amount,0))
);

-- Unique partial indexes: enforced only when value is present
  CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_chassis
    ON tenants(chassis_no) WHERE chassis_no IS NOT NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_motor
    ON tenants(motor_no) WHERE motor_no IS NOT NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_controller
    ON tenants(controller_no) WHERE controller_no IS NOT NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_charger
    ON tenants(charger_no) WHERE charger_no IS NOT NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_battery
    ON tenants(battery_no) WHERE battery_no IS NOT NULL;

-- Query indexes
CREATE INDEX IF NOT EXISTS idx_tenants_model     ON tenants(ev_model_id);
CREATE INDEX IF NOT EXISTS idx_tenants_branch    ON tenants(branch_id);
CREATE INDEX IF NOT EXISTS idx_tenants_status    ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_phone     ON tenants(phone);
CREATE INDEX IF NOT EXISTS idx_tenants_name_trgm ON tenants USING gin(name gin_trgm_ops);

-- ── TABLE 5: payments ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  head_office_id     UUID REFERENCES head_offices(id),
  branch_id          UUID REFERENCES branches(id),
  tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  amount             NUMERIC(8,2) NOT NULL CHECK (amount > 0),
  payment_date       DATE NOT NULL,
  mode               TEXT NOT NULL CHECK (mode IN ('cash','online')),
  collected_by       UUID NOT NULL REFERENCES users(id),
  notes              TEXT,
  late_fee_paid      NUMERIC(8,2) NOT NULL DEFAULT 0.00,
  is_penalty_waiver  BOOLEAN NOT NULL DEFAULT false,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
  -- No UNIQUE on (tenant_id, payment_date): multiple payments per day are allowed
);

CREATE INDEX IF NOT EXISTS idx_payments_tenant   ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_branch   ON payments(branch_id);
CREATE INDEX IF NOT EXISTS idx_payments_date     ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_collector ON payments(collected_by);

-- ── TABLE 6: bookings ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  head_office_id  UUID REFERENCES head_offices(id),
  branch_id       UUID REFERENCES branches(id),
  ev_model_id     UUID REFERENCES ev_models(id),
  model_name_raw  TEXT,                           -- if model not yet in ev_models
  name            TEXT NOT NULL,
  phone           VARCHAR(10) UNIQUE CHECK (phone IS NULL OR phone ~ '^[0-9]{10}$'),
  aadhar_path     TEXT,
  booking_amount  NUMERIC(10,2) CHECK (booking_amount >= 0),
  booking_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','converted','cancelled')),
  converted_to    UUID REFERENCES tenants(id),
  converted_type  TEXT CHECK (converted_type IS NULL OR converted_type IN ('rental', 'direct_purchase')),
  created_by      UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_branch ON bookings(branch_id);

-- ── TABLE 7: audit_logs ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  user_role   TEXT NOT NULL,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   UUID,
  changes     JSONB,                              -- {field: [old, new]} — no secrets ever
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_user    ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity  ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- ── ROW LEVEL SECURITY ───────────────────────────────────────────────────────
-- Enable RLS on all tables. Since our backend uses the SUPABASE_SERVICE_ROLE_KEY,
-- it bypasses RLS completely. By not providing any policies, we effectively block
-- all access via the anonymous key, securing the database from public clients.

ALTER TABLE head_offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ev_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE old_evs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ── SEED DATA ───────────────────────────────────────────────────────────────
-- 1. Pre-Seed Head Offices
INSERT INTO head_offices (name, code, city, state) VALUES
  ('Delhi Head Office', 'DEL-HO', 'New Delhi', 'Delhi'),
  ('Noida Head Office', 'NOI-HO', 'Noida', 'Uttar Pradesh'),
  ('Gurgaon Head Office', 'GGN-HO', 'Gurugram', 'Haryana')
ON CONFLICT (code) DO NOTHING;

-- 2. Pre-Seed all 46 Delhi Wards from official ward list
DO $$
DECLARE
  v_delhi_id UUID;
  v_noida_id UUID;
  v_ggn_id UUID;
BEGIN
  SELECT id INTO v_delhi_id FROM head_offices WHERE code = 'DEL-HO';
  SELECT id INTO v_noida_id FROM head_offices WHERE code = 'NOI-HO';
  SELECT id INTO v_ggn_id FROM head_offices WHERE code = 'GGN-HO';

  -- Delhi Wards 1 to 46
  INSERT INTO branches (head_office_id, ward_no, name, code, ward_area) VALUES
    (v_delhi_id, 1,  'Rohini', 'DEL-WD-01', 'North West Delhi'),
    (v_delhi_id, 2,  'Saroop Nagar', 'DEL-WD-02', 'North Delhi'),
    (v_delhi_id, 3,  'Civil Line', 'DEL-WD-03', 'North Delhi'),
    (v_delhi_id, 4,  'Pitam Pura', 'DEL-WD-04', 'North West Delhi'),
    (v_delhi_id, 5,  'Model Town', 'DEL-WD-05', 'North Delhi'),
    (v_delhi_id, 6,  'Shakti Nagar', 'DEL-WD-06', 'North Delhi'),
    (v_delhi_id, 7,  'Tri Nagar', 'DEL-WD-07', 'North West Delhi'),
    (v_delhi_id, 8,  'Shakur Basti', 'DEL-WD-08', 'North West Delhi'),
    (v_delhi_id, 9,  'Punjabi Bagh', 'DEL-WD-09', 'West Delhi'),
    (v_delhi_id, 10, 'Guru Harkrishan Nagar', 'DEL-WD-10', 'West Delhi'),
    (v_delhi_id, 11, 'Chander Vihar', 'DEL-WD-11', 'West Delhi'),
    (v_delhi_id, 12, 'Dev Nagar', 'DEL-WD-12', 'Central Delhi'),
    (v_delhi_id, 13, 'Rajinder Nagar', 'DEL-WD-13', 'Central Delhi'),
    (v_delhi_id, 14, 'Connaught Place', 'DEL-WD-14', 'Central Delhi'),
    (v_delhi_id, 15, 'Ramesh Nagar', 'DEL-WD-15', 'West Delhi'),
    (v_delhi_id, 16, 'Tagore Garden', 'DEL-WD-16', 'West Delhi'),
    (v_delhi_id, 17, 'Raghubir Nagar', 'DEL-WD-17', 'West Delhi'),
    (v_delhi_id, 18, 'Rajouri Garden', 'DEL-WD-18', 'West Delhi'),
    (v_delhi_id, 19, 'Hari Nagar', 'DEL-WD-19', 'West Delhi'),
    (v_delhi_id, 20, 'Fateh Nagar', 'DEL-WD-20', 'West Delhi'),
    (v_delhi_id, 21, 'Khayala', 'DEL-WD-21', 'West Delhi'),
    (v_delhi_id, 22, 'Sham Nagar', 'DEL-WD-22', 'West Delhi'),
    (v_delhi_id, 23, 'Vishnu Garden', 'DEL-WD-23', 'West Delhi'),
    (v_delhi_id, 24, 'Ravi Nagar', 'DEL-WD-24', 'West Delhi'),
    (v_delhi_id, 25, 'Tilak Nagar', 'DEL-WD-25', 'West Delhi'),
    (v_delhi_id, 26, 'Sant Garh', 'DEL-WD-26', 'West Delhi'),
    (v_delhi_id, 27, 'Tilak Vihar', 'DEL-WD-27', 'West Delhi'),
    (v_delhi_id, 28, 'Guru Nanak Nagar', 'DEL-WD-28', 'West Delhi'),
    (v_delhi_id, 29, 'Krishna Park', 'DEL-WD-29', 'West Delhi'),
    (v_delhi_id, 30, 'Vikas Puri', 'DEL-WD-30', 'West Delhi'),
    (v_delhi_id, 31, 'Uttam Nagar', 'DEL-WD-31', 'West Delhi'),
    (v_delhi_id, 32, 'Janak Puri', 'DEL-WD-32', 'West Delhi'),
    (v_delhi_id, 33, 'Shiv Nagar', 'DEL-WD-33', 'West Delhi'),
    (v_delhi_id, 34, 'Sarita Vihar', 'DEL-WD-34', 'South East Delhi'),
    (v_delhi_id, 35, 'Lajpat Nagar', 'DEL-WD-35', 'South Delhi'),
    (v_delhi_id, 36, 'Safdarjung Enclave', 'DEL-WD-36', 'South Delhi'),
    (v_delhi_id, 37, 'Malviya Nagar', 'DEL-WD-37', 'South Delhi'),
    (v_delhi_id, 38, 'Greater Kailash', 'DEL-WD-38', 'South Delhi'),
    (v_delhi_id, 39, 'Kalka Ji', 'DEL-WD-39', 'South Delhi'),
    (v_delhi_id, 40, 'Jangpura', 'DEL-WD-40', 'South East Delhi'),
    (v_delhi_id, 41, 'Navin Shahdara', 'DEL-WD-41', 'East Delhi'),
    (v_delhi_id, 42, 'Dilshad Garden', 'DEL-WD-42', 'East Delhi'),
    (v_delhi_id, 43, 'Vivek Vihar', 'DEL-WD-43', 'East Delhi'),
    (v_delhi_id, 44, 'Geeta Colony', 'DEL-WD-44', 'East Delhi'),
    (v_delhi_id, 45, 'Khureji Khas', 'DEL-WD-45', 'East Delhi'),
    (v_delhi_id, 46, 'Preet Vihar', 'DEL-WD-46', 'East Delhi')
  ON CONFLICT (code) DO NOTHING;

  -- Noida Starter Branches
  INSERT INTO branches (head_office_id, ward_no, name, code, ward_area) VALUES
    (v_noida_id, 101, 'Noida Sector 62', 'NOI-BR-01', 'Sector 62 Institutional Area'),
    (v_noida_id, 102, 'Noida Sector 18', 'NOI-BR-02', 'Sector 18 Commercial Market')
  ON CONFLICT (code) DO NOTHING;

  -- Gurgaon Starter Branches
  INSERT INTO branches (head_office_id, ward_no, name, code, ward_area) VALUES
    (v_ggn_id, 201, 'Cyber City', 'GGN-BR-01', 'DLF Cyber City Phase II'),
    (v_ggn_id, 202, 'MG Road', 'GGN-BR-02', 'MG Road Commercial Hub')
  ON CONFLICT (code) DO NOTHING;

  -- 3. Initial Admin & Staff accounts
  DECLARE
    v_default_branch_id UUID;
  BEGIN
    SELECT id INTO v_default_branch_id FROM branches WHERE code = 'DEL-WD-01';

    INSERT INTO users (name, phone, email, password_hash, role, head_office_id, branch_id)
    VALUES 
      ('Super Admin', '9999999999', 'admin@gmail.com', '$2b$10$fKOlQbdfyEot8hJ7XCVS4OsmGs9XBQ6kMh/D14gRIbNb8gqRS6uwy', 'super_admin', v_delhi_id, v_default_branch_id)
    ON CONFLICT (phone) DO UPDATE 
      SET head_office_id = EXCLUDED.head_office_id,
          branch_id = EXCLUDED.branch_id,
          role = 'super_admin';

    INSERT INTO users (name, phone, email, password_hash, role, head_office_id, branch_id)
    VALUES 
      ('Staff Operator', '8888888888', 'staff@gmail.com', '$2b$10$o7UwqcrmmbaWNeHFJTPq0et8XQg8FbI0ThBKynWyafv5JwWCdGFfW', 'staff', v_delhi_id, v_default_branch_id)
    ON CONFLICT (phone) DO UPDATE 
      SET head_office_id = EXCLUDED.head_office_id,
          branch_id = EXCLUDED.branch_id;
  END;
END $$;
