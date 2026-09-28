-- ─────────────────────────────────────────────────────────────────────────────
-- GO SPEEDY EV FINANCE SCHEME — FULL SCHEMA & PRODUCTION SEED
-- Single cumulative schema file. Update in place. Re-run on fresh DB.
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
  contact_person  TEXT,
  phone           VARCHAR(20),
  address         TEXT,
  status_label    TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE branches ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS status_label TEXT;

CREATE INDEX IF NOT EXISTS idx_branches_ho ON branches(head_office_id);
CREATE INDEX IF NOT EXISTS idx_branches_code ON branches(code);

-- ── TABLE 1: users ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  head_office_id           UUID REFERENCES head_offices(id),
  branch_id                UUID REFERENCES branches(id),
  name                     TEXT NOT NULL,
  phone                    VARCHAR(10) UNIQUE CHECK (phone IS NULL OR phone ~ '^[0-9]{10}$'),
  email                    TEXT UNIQUE,
  password_hash            TEXT,
  oauth_provider           TEXT,
  oauth_id                 TEXT,
  role                     TEXT NOT NULL
                             CHECK (role IN ('super_admin', 'ho_admin', 'branch_admin', 'staff', 'admin')),
  ward_area                TEXT,
  is_active                BOOLEAN NOT NULL DEFAULT true,
  refresh_token_hash       TEXT,
  refresh_token_expires_at TIMESTAMPTZ,
  reset_otp_hash           TEXT,
  reset_otp_expires_at     TIMESTAMPTZ,
  created_by               UUID REFERENCES users(id),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure columns exist if table was already created earlier
ALTER TABLE users ADD COLUMN IF NOT EXISTS head_office_id UUID REFERENCES head_offices(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS ward_area TEXT;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('super_admin', 'ho_admin', 'branch_admin', 'staff', 'admin'));

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

-- Ensure columns exist if table was already created earlier
ALTER TABLE ev_models ADD COLUMN IF NOT EXISTS head_office_id UUID REFERENCES head_offices(id);
ALTER TABLE ev_models ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);

CREATE INDEX IF NOT EXISTS idx_ev_models_branch ON ev_models(branch_id);

-- ── TABLE 3: old_evs ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS old_evs (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  head_office_id          UUID REFERENCES head_offices(id),
  branch_id               UUID REFERENCES branches(id),
  original_ev_model_id    UUID REFERENCES ev_models(id),
  returned_from_tenant_id UUID,
  chassis_no              TEXT,
  motor_no                TEXT,
  controller_no           TEXT,
  battery_no              TEXT,
  charger_no              TEXT,
  price                   NUMERIC(12,2),
  status                  TEXT DEFAULT 'available' CHECK (status IN ('available', 'rented', 'sold')),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure columns exist if table was already created earlier
ALTER TABLE old_evs ADD COLUMN IF NOT EXISTS head_office_id UUID REFERENCES head_offices(id);
ALTER TABLE old_evs ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);

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

  -- Document storage paths
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
  total_price         NUMERIC(12,2),
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
  expected_end_date DATE,

  -- JSONB references & guarantors
  "references"   JSONB NOT NULL DEFAULT '[]',
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

  -- AMC
  amc_amount               NUMERIC(12,2),
  amc_start_date           DATE,
  amc_expire_date          DATE,
  amc_service_log          JSONB NOT NULL DEFAULT '[]',

  -- Buyback
  buyback_amount           NUMERIC(12,2),

  CONSTRAINT chk_booking_lte_price
    CHECK (booking_amount IS NULL OR total_price IS NULL OR booking_amount <= total_price),
  CONSTRAINT chk_dp_lte_contract
    CHECK (downpayment_paid <= COALESCE(total_price,0) - COALESCE(booking_amount,0))
);

-- Ensure columns exist if table was already created earlier
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS head_office_id UUID REFERENCES head_offices(id);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS late_fee_daily_rate NUMERIC(8,2) NOT NULL DEFAULT 50.00;

-- Unique partial indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_chassis    ON tenants(chassis_no) WHERE chassis_no IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_motor      ON tenants(motor_no) WHERE motor_no IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_controller ON tenants(controller_no) WHERE controller_no IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_charger    ON tenants(charger_no) WHERE charger_no IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_battery    ON tenants(battery_no) WHERE battery_no IS NOT NULL;

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
);

-- Ensure columns exist if table was already created earlier
ALTER TABLE payments ADD COLUMN IF NOT EXISTS head_office_id UUID REFERENCES head_offices(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS late_fee_paid NUMERIC(8,2) NOT NULL DEFAULT 0.00;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS is_penalty_waiver BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_payments_tenant    ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_branch    ON payments(branch_id);
CREATE INDEX IF NOT EXISTS idx_payments_date      ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_collector ON payments(collected_by);

-- ── TABLE 6: bookings ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  head_office_id  UUID REFERENCES head_offices(id),
  branch_id       UUID REFERENCES branches(id),
  ev_model_id     UUID REFERENCES ev_models(id),
  model_name_raw  TEXT,
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

-- Ensure columns exist if table was already created earlier
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS head_office_id UUID REFERENCES head_offices(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);

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
  changes     JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_user    ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity  ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- ── ROW LEVEL SECURITY ───────────────────────────────────────────────────────
ALTER TABLE head_offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches     ENABLE ROW LEVEL SECURITY;
ALTER TABLE users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ev_models    ENABLE ROW LEVEL SECURITY;
ALTER TABLE old_evs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants      ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs   ENABLE ROW LEVEL SECURITY;

