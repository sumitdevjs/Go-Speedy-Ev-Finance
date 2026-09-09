-- ─────────────────────────────────────────────────────────────────────────────
-- GO SPEEDY EV FINANCE SCHEME — FULL SCHEMA
-- Single cumulative migration file. Update in place. Re-run on fresh DB.
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable the pg_trgm extension for ILIKE search indices (gin_trgm_ops)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── TABLE 1: users ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                     TEXT NOT NULL,
  phone                    TEXT UNIQUE,                  -- NULL for OAuth users until updated
  email                    TEXT UNIQUE,
  password_hash            TEXT,                         -- NULL for OAuth users
  oauth_provider           TEXT,                         -- 'google', etc.
  oauth_id                 TEXT,                         -- Google profile ID
  role                     TEXT NOT NULL
                             CHECK (role IN ('admin', 'staff')),
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

-- ── TABLE 2: ev_models ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ev_models (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  company      TEXT NOT NULL,
  ward         TEXT NOT NULL,
  total_price  NUMERIC(12,2) NOT NULL CHECK (total_price > 0),
  stock_count  INTEGER NOT NULL DEFAULT 0 CHECK (stock_count >= 0),
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── TABLE 3: tenants ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ev_model_id    UUID NOT NULL REFERENCES ev_models(id),

  -- Status
  status         TEXT NOT NULL DEFAULT 'rented'
                   CHECK (status IN ('rented','completed','cancelled','direct_purchase')),

  -- Personal
  name           TEXT NOT NULL,
  phone          TEXT NOT NULL,
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

  -- Scooty hardware
  chassis_no    TEXT,
  motor_ctrl_no TEXT,
  battery_no    TEXT,
  rto_type      TEXT CHECK (rto_type IS NULL OR rto_type IN ('rto','non_rto')),
  hp_financer   TEXT CHECK (hp_financer IS NULL OR
                            hp_financer IN ('go_speedy','swastik_finance')),
  date_of_purchase DATE,
  date_of_delivery DATE,

  -- Financial
  total_price      NUMERIC(12,2),               -- snapshot of ev_models.total_price at time of rental
  booking_amount   NUMERIC(12,2) DEFAULT 0 CHECK (booking_amount >= 0),
  downpayment_paid NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (downpayment_paid >= 0),
  downpayment_mode TEXT CHECK (downpayment_mode IS NULL OR
                               downpayment_mode IN ('cash','online','not_paid')),
  dp_by_other      BOOLEAN NOT NULL DEFAULT false,
  dp_other_name    TEXT,
  dp_other_phone   TEXT,

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
  ON tenants(motor_ctrl_no) WHERE motor_ctrl_no IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_battery
  ON tenants(battery_no) WHERE battery_no IS NOT NULL;

-- Query indexes
CREATE INDEX IF NOT EXISTS idx_tenants_model    ON tenants(ev_model_id);
CREATE INDEX IF NOT EXISTS idx_tenants_status   ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_phone    ON tenants(phone);
CREATE INDEX IF NOT EXISTS idx_tenants_name_trgm ON tenants USING gin(name gin_trgm_ops);

-- ── TABLE 4: payments ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  amount       NUMERIC(8,2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL,
  mode         TEXT NOT NULL CHECK (mode IN ('cash','online')),
  collected_by UUID NOT NULL REFERENCES users(id),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
  -- No UNIQUE on (tenant_id, payment_date): multiple payments per day are allowed
);

CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_date   ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_collector ON payments(collected_by);

-- ── TABLE 5: bookings ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ev_model_id     UUID REFERENCES ev_models(id),
  model_name_raw  TEXT,                           -- if model not yet in ev_models
  name            TEXT NOT NULL,
  phone           TEXT NOT NULL,
  aadhar_path     TEXT,
  booking_amount  NUMERIC(10,2) CHECK (booking_amount >= 0),
  booking_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','converted','cancelled')),
  converted_to    UUID REFERENCES tenants(id),
  created_by      UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- ── TABLE 6: audit_logs ─────────────────────────────────────────────────────
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

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ev_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ── SEED DATA ───────────────────────────────────────────────────────────────
-- Initial Admin and Staff accounts
-- Admin Password: Admin@123
-- Staff Password: Staff@123

INSERT INTO users (name, phone, email, password_hash, role)
VALUES 
  ('Admin', '9999999999', 'admin@gmail.com', '$2b$10$fKOlQbdfyEot8hJ7XCVS4OsmGs9XBQ6kMh/D14gRIbNb8gqRS6uwy', 'admin')
ON CONFLICT (phone) DO NOTHING;

INSERT INTO users (name, phone, email, password_hash, role)
VALUES 
  ('Staff', '8888888888', 'staff@gmail.com', '$2b$10$o7UwqcrmmbaWNeHFJTPq0et8XQg8FbI0ThBKynWyafv5JwWCdGFfW', 'staff')
ON CONFLICT (phone) DO NOTHING;
