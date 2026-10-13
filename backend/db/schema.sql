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
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_doc TEXT;
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
  kilometres     INTEGER NOT NULL DEFAULT 0 CHECK (kilometres >= 0),
  stock_logs     JSONB NOT NULL DEFAULT '[]',
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_by     UUID REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure columns exist if table was already created earlier
ALTER TABLE ev_models ADD COLUMN IF NOT EXISTS head_office_id UUID REFERENCES head_offices(id);
ALTER TABLE ev_models ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);
ALTER TABLE ev_models ADD COLUMN IF NOT EXISTS kilometres INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_ev_models_branch ON ev_models(branch_id);
CREATE INDEX IF NOT EXISTS idx_ev_models_ho ON ev_models(head_office_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ev_models_unique_name_km ON ev_models (LOWER(TRIM(name)), kilometres) WHERE is_active = true;

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
CREATE INDEX IF NOT EXISTS idx_old_evs_ho ON old_evs(head_office_id);

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

  -- GST & Invoicing
  invoice_generated        BOOLEAN NOT NULL DEFAULT false,
  invoice_doc_path         TEXT,
  include_gst              BOOLEAN NOT NULL DEFAULT false,
  gst_percent              NUMERIC(5,2) NOT NULL DEFAULT 0.00,

  CONSTRAINT chk_booking_lte_price
    CHECK (booking_amount IS NULL OR total_price IS NULL OR booking_amount <= total_price),
  CONSTRAINT chk_dp_lte_contract
    CHECK (downpayment_paid <= COALESCE(total_price,0) - COALESCE(booking_amount,0))
);

-- Ensure columns exist if table was already created earlier
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS head_office_id UUID REFERENCES head_offices(id);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS late_fee_daily_rate NUMERIC(8,2) NOT NULL DEFAULT 50.00;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS invoice_generated BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS invoice_doc_path TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS include_gst BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS gst_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00;

-- Unique partial indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_chassis    ON tenants(chassis_no) WHERE chassis_no IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_motor      ON tenants(motor_no) WHERE motor_no IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_controller ON tenants(controller_no) WHERE controller_no IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_charger    ON tenants(charger_no) WHERE charger_no IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_battery    ON tenants(battery_no) WHERE battery_no IS NOT NULL;

-- Query indexes
CREATE INDEX IF NOT EXISTS idx_tenants_model     ON tenants(ev_model_id);
CREATE INDEX IF NOT EXISTS idx_tenants_branch    ON tenants(branch_id);
CREATE INDEX IF NOT EXISTS idx_tenants_ho        ON tenants(head_office_id);
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
  gst_amount         NUMERIC(8,2) NOT NULL DEFAULT 0.00,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure columns exist if table was already created earlier
ALTER TABLE payments ADD COLUMN IF NOT EXISTS head_office_id UUID REFERENCES head_offices(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS late_fee_paid NUMERIC(8,2) NOT NULL DEFAULT 0.00;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS is_penalty_waiver BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gst_amount NUMERIC(8,2) NOT NULL DEFAULT 0.00;

CREATE INDEX IF NOT EXISTS idx_payments_tenant    ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_branch    ON payments(branch_id);
CREATE INDEX IF NOT EXISTS idx_payments_ho        ON payments(head_office_id);
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
CREATE INDEX IF NOT EXISTS idx_bookings_ho     ON bookings(head_office_id);

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

-- ─────────────────────────────────────────────────────────────────────────────
-- PRODUCTION SEED DATA
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. REGIONAL HEAD OFFICES ─────────────────────────────────────────────────
INSERT INTO head_offices (id, name, code, city, state, is_active)
VALUES
  ('9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 'Moti Nagar Head Office', 'DEL-HO', 'Moti Nagar, New Delhi', 'Delhi', true),
  ('b9114406-a159-468f-aa4b-ebafa3ae338f', 'Noida Head Office', 'NOI-HO', 'Noida', 'Uttar Pradesh', true),
  ('48727475-c02b-4e5e-842d-8d0b35240b87', 'Gurgaon Head Office', 'GUR-HO', 'Gurgaon', 'Haryana', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  state = EXCLUDED.state,
  is_active = EXCLUDED.is_active;


-- ── 2. BRANCHES / WARDS (46 DELHI OFFICIAL WARDS) ──────────────────────────
INSERT INTO branches (id, head_office_id, ward_no, name, code, ward_area, contact_person, phone, address, status_label, is_active)
VALUES
  ('ada166e8-6720-4e5b-945e-737301f8e98d', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 1, 'Rohini', 'DEL-WD-01', 'North West Delhi', 'S. Sarvjit Singh Virk', '9811695785', '165, Farmers Apartment, Plot no.8, Sector-13, Rohini Delhi-110085', 'Won', true),
  ('4fe850ac-ff77-43fb-b481-58b064eccfc7', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 2, 'Saroop Nagar', 'DEL-WD-02', 'North Delhi', 'S. Sukhbir Singh Kalra', '9810014786', 'Saroop Nagar, North Delhi', 'Lost', true),
  ('c7a54e8a-1e65-4061-9506-76a0a5c0e57d', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 3, 'Civil Line', 'DEL-WD-03', 'North Delhi', 'S. Jasbir Singh Jassi', '9818711003', '276A, 3rd Floor, Indira Vihar, Kingsway Camp, Dr. Mukherjee Nagar, Delhi-110009', 'Won', true),
  ('3f9106b6-9081-4537-8360-1a6a84e0241e', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 4, 'Pitam Pura', 'DEL-WD-04', 'North West Delhi', 'S. Mohinderpal Singh Chadha', '9811048221', 'MD-26, Vishakha Enclave, Pitampura, Delhi-110088', 'Won', true),
  ('7fa3a480-1378-43c3-a1a8-aa1a157502b8', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 5, 'Model Town', 'DEL-WD-05', 'North Delhi', 'S. Amritpal Singh (Palco)', '9899598009', 'B-2, Panchvati Azadpur, Delhi-110033', 'Lost', true),
  ('6d9ad097-0a16-40ba-aeb8-f4436bd79d93', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 6, 'Shakti Nagar', 'DEL-WD-06', 'North Delhi', 'S. Harvinder Singh K. P.', '9811198009', 'B-2, Panchvati, Opp. Azadpur Subzi Mandi, Delhi-110033', 'Won', true),
  ('bd0f254e-76cf-470d-8eba-cca292ddf89e', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 7, 'Tri Nagar', 'DEL-WD-07', 'North West Delhi', 'S. Jaspreet Singh Karamsar', '9310493104', 'Tri Nagar, North West Delhi', 'Won', true),
  ('bce6395e-27b4-40a8-9114-3f3a83476aa1', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 8, 'Shakur Basti', 'DEL-WD-08', 'North West Delhi', 'S. Rameet Singh Chadha (Smarty)', '9811347171', '294, Sainik Vihar, Pitampura, New Delhi', 'Lost', true),
  ('b8ce2f53-679a-4851-ade2-03f6398e7de6', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 9, 'Punjabi Bagh', 'DEL-WD-09', 'West Delhi', 'S. Manjinder Singh Sirsa', '9810094333', '7/77, West Punjabi Bagh, New Delhi-110026', 'Lost', true),
  ('4238944c-29d5-427d-b126-3fe111852bbb', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 10, 'Guru Harkrishan Nagar', 'DEL-WD-10', 'West Delhi', 'S. Surjit Singh Jitti', '9899445555', 'Guru Harkrishan Nagar, West Delhi', 'Won', true),
  ('dbfb3abc-80b1-4190-abbe-c56bbd3b5894', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 11, 'Chander Vihar', 'DEL-WD-11', 'West Delhi', 'S. Nishan Singh Mann', '9899935873', 'B-2/30, Vikas Vihar, Nilothi Extension, New Delhi-110041', 'Lost', true),
  ('f6d0f7c5-21e2-4f20-8556-cd32bf0709d6', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 12, 'Dev Nagar', 'DEL-WD-12', 'Central Delhi', 'S. Jujhar Singh', '9873324878', 'House no.4066, Gali no.37, Regarpura, Karol Bagh, New Delhi-110005', 'Lost', true),
  ('9cf6dd91-4ba9-4691-a536-3d5ee3bee9e0', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 13, 'Rajinder Nagar', 'DEL-WD-13', 'Central Delhi', 'S. Paramjeet Singh Chandhok', '9810070597', '2635, Bank Street, Karol Bagh, New Delhi', 'Lost', true),
  ('bcc4e92c-3128-4ec0-a67f-7817cab05c03', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 14, 'Connaught Place', 'DEL-WD-14', 'Central Delhi', 'S. Amarjeet Singh Pinky', '9810021488', '2151, Kinari Bazar, Chandni Chowk, Delhi-110006', 'Won', true),
  ('7fe666dc-205d-460a-ac31-6c3ebf400140', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 15, 'Ramesh Nagar', 'DEL-WD-15', 'West Delhi', 'S. Gurdev Singh', '9911014141', 'Ramesh Nagar, West Delhi', 'Won', true),
  ('8c3ce541-de5f-4819-8c0e-f7be7bd11f4a', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 16, 'Tagore Garden', 'DEL-WD-16', 'West Delhi', 'S. Bhupinder Singh Ginni', '9873730737', 'A-7/77 Moti Nagar, New Delhi-110015', 'Won', true),
  ('833c10f9-2393-482b-b781-d2645f02e9b5', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 17, 'Raghubir Nagar', 'DEL-WD-17', 'West Delhi', 'S. Satinder Pal Singh Nagi', '9910096719', 'S-221/266, Gali No.7, Vishnu Garden, New Delhi-110018', 'Won', true),
  ('df58c08b-573b-4d29-92d8-04835f4a9fc2', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 18, 'Rajouri Garden', 'DEL-WD-18', 'West Delhi', 'S. Harpal Singh Kochar', '7701926903', 'F-17, Rajouri Garden, New Delhi-110027', 'Lost', true),
  ('491abba7-41ef-4d46-820a-e599b0171641', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 19, 'Hari Nagar', 'DEL-WD-19', 'West Delhi', 'S. Jaspreet Singh (Vicky Maan)', '9810465556', 'BE-255, Gali no.2, Hari Nagar, New Delhi-110064', 'Lost', true),
  ('6a24dacb-7d08-423a-a12b-56c7120594ca', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 20, 'Fateh Nagar', 'DEL-WD-20', 'West Delhi', 'S. Amarjeet Singh (Pappu)', '9212001906', 'C-15, Fateh Nagar, New Delhi-110018', 'Won', true),
  ('56cf336f-c06a-4a4b-aea7-b00d7c4008ec', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 21, 'Khayala', 'DEL-WD-21', 'West Delhi', 'S. Rajinder Singh (Gughi)', '9810728830', 'WZ-3rd29-B-126, Vishnu Garden, New Delhi-110018', 'Won', true),
  ('e748479b-63e3-4028-b9d0-560528cea483', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 22, 'Sham Nagar', 'DEL-WD-22', 'West Delhi', 'S. Harjit Singh Pappa', '9811489233', 'G-39, Vishnu Garden, Mangal Bazar, New Delhi-110018', 'Won', true),
  ('909fffcd-a28b-42b1-b23b-54bfba1fe879', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 23, 'Vishnu Garden', 'DEL-WD-23', 'West Delhi', 'S. Manjit Singh Aulakh', '9891613158', 'WZ-49H, Navyug Block, Vishnu Garden, New Delhi-110018', 'Lost', true),
  ('9d6baecf-ec47-427d-ae72-06a67ad059a6', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 24, 'Ravi Nagar', 'DEL-WD-24', 'West Delhi', 'S. Gurmeet Singh Bhatia', '9212649959', 'A-12, J.J. Colony, Chowkhandi, Tilak Nagar, New Delhi-110018', 'Won', true),
  ('bc3be4fe-29f2-43fa-871c-f471b3fbbf17', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 25, 'Tilak Nagar', 'DEL-WD-25', 'West Delhi', 'S. Daljit Singh Sarna', '9871495180', 'D-4, Mukherjee Garden, Tilak Nagar, New Delhi-110018', 'Lost', true),
  ('da8d1218-31c9-43d9-88c6-dae5203b46cf', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 26, 'Sant Garh', 'DEL-WD-26', 'West Delhi', 'S. Baljinder Singh', '9810000026', 'Sant Garh, West Delhi', 'Won', true),
  ('6557f9ce-c6e7-4ed5-9370-d6be4989ec6c', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 27, 'Tilak Vihar', 'DEL-WD-27', 'West Delhi', 'S. Atma Singh Lubana', '9868854548', 'C-127A, Tilak Vihar, New Delhi-110018', 'Won', true),
  ('8ece2619-5129-46ce-ab65-04e02d903b8f', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 28, 'Guru Nanak Nagar', 'DEL-WD-28', 'West Delhi', 'S. Raminder Singh Sweeta', '9810929001', 'WZ-10/2A, New Sahibpura, MBA Nagar, Tilak Nagar, New Delhi-110018', 'Won', true),
  ('7b53db01-d55e-4f8b-ad0b-37192c405191', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 29, 'Krishna Park', 'DEL-WD-29', 'West Delhi', 'S. Jagdeep Singh Kahlon', '9811085996', 'WZ-217, Gali No.1, Krishna Park, New Delhi-110018', 'Won', true),
  ('10bd1c58-fe78-4ca3-87b0-e7306ca8c878', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 30, 'Vikas Puri', 'DEL-WD-30', 'West Delhi', 'S. Inderjit Singh Monty', '9811174950', 'Vikas Puri, West Delhi', 'Lost', true),
  ('609d97e2-6f3d-4eb3-8944-95e45fbbcf21', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 31, 'Uttam Nagar', 'DEL-WD-31', 'West Delhi', 'S. Ramanjot Singh Meeta', '9654919065', 'A-811, Pankha Road, Uttam Nagar, Delhi-110059', 'Won', true),
  ('ed67d888-0225-482a-ab1e-bfb1e3f7395d', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 32, 'Janak Puri', 'DEL-WD-32', 'West Delhi', 'S. Gurmeet Singh Tinku', '8130041335', 'Janak Puri, West Delhi', 'Lost', true),
  ('a346a65b-8bfc-43fd-800e-fefe05cb621b', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 33, 'Shiv Nagar', 'DEL-WD-33', 'West Delhi', 'S. Ramandeep Singh Thappar', '9818103053', 'WZ-530, Gali No. 27, Jail Road, Shiv Nagar, New Delhi-110058', 'Won', true),
  ('0ad7e16a-b2d3-430b-b0e8-aab627b6bfbf', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 34, 'Sarita Vihar', 'DEL-WD-34', 'South East Delhi', 'S. Gurpreet Singh Jassa', '9810053253', 'B-18, Flat no.101, Ground Floor, Viskarma Colony, New Delhi-110011', 'Won', true),
  ('9d9db0ef-df1f-4462-bdc4-8ada5c9190d4', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 35, 'Lajpat Nagar', 'DEL-WD-35', 'South Delhi', 'S. Paramjit Singh Bhatia', '9873800238', 'I83-84, Lajpat Nagar-1, New Delhi-110024', 'Lost', true),
  ('09f0575c-6055-472a-9a62-5444ea2eb6dd', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 36, 'Safdarjung Enclave', 'DEL-WD-36', 'South Delhi', 'S. Kuldeep Singh Sawhney', '9711313138', '165-Sarojini Nagar, New Delhi', 'Lost', true),
  ('54cdd3d8-380d-4aed-b9b7-01c078634734', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 37, 'Malviya Nagar', 'DEL-WD-37', 'South Delhi', 'S. Onkar Singh Raja', '9899164312', 'G-3/11, Malviya Nagar, Near Krishna Mandir, New Delhi-110017', 'Lost', true),
  ('1f577547-4c1e-4609-858a-9ac742222db1', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 38, 'Greater Kailash', 'DEL-WD-38', 'South Delhi', 'S. Charanjit Singh', '9717970696', 'House no.204, GHPS Campus, Vasant Vihar, New Delhi', 'Lost', true),
  ('726ee093-af8a-4685-acf7-83659a32793e', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 39, 'Kalka Ji', 'DEL-WD-39', 'South Delhi', 'S. Harmit Singh Kalka', '9811460300', 'House No. 7, Lane W8A, Sainik Farms, New Delhi-110062', 'Won', true),
  ('3e4b9212-b931-427d-914f-daec4c67b33d', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 40, 'Jangpura', 'DEL-WD-40', 'South East Delhi', 'S. Jasmir Singh (Sunny Massi)', '9711713313', '722, 2nd Floor Opp. Gurdwara Bala Sahib, Sunlight Colony 1, Ashram, Delhi-110014', 'Lost', true),
  ('ea77ba84-49dc-4c01-bebe-6702fde741c7', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 41, 'Navin Shahdara', 'DEL-WD-41', 'East Delhi', 'S. Parvinder Singh (Lucky)', '9599908208', 'Navin Shahdara, East Delhi', 'Won', true),
  ('480ab729-b865-43dd-8ccf-2ca068c87a2a', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 42, 'Dilshad Garden', 'DEL-WD-42', 'East Delhi', 'S. Balbir Singh', '9868855555', 'C-145, Vivek Vihar, Delhi-110095', 'Won', true),
  ('58c6f5e6-ab69-44f4-8f50-80bda8625ec9', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 43, 'Vivek Vihar', 'DEL-WD-43', 'East Delhi', 'S. Jasmain Singh Noni', '9999009936', '252/4, Street No., Bhola Nath Nagar, Delhi-110032', 'Won', true),
  ('86a8a50a-b043-416f-8e50-819deb1a7743', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 44, 'Geeta Colony', 'DEL-WD-44', 'East Delhi', 'S. Gurmeet Singh Bedi', '9810000044', 'Geeta Colony, East Delhi', 'Active', true),
  ('7724e077-0f73-4532-9078-94b172cca385', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 45, 'Khureji Khas', 'DEL-WD-45', 'East Delhi', 'S. Jatinder Pal Singh Goldy', '9810257677', '93/2, Guru Angad Nagar East, 1st floor, Gali No.8, behind Sai Mandir, Delhi', 'Lost', true),
  ('e3fc085a-beff-4499-92d3-b17874c04c53', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 46, 'Preet Vihar', 'DEL-WD-46', 'East Delhi', 'S. Bupinder Singh Bhullar', '9811070501', 'B-141, Pandav Nagar, Opp. Mother Dairy, Delhi-110092', 'Won', true)
ON CONFLICT (code) DO UPDATE SET
  head_office_id = EXCLUDED.head_office_id,
  name = EXCLUDED.name,
  ward_no = EXCLUDED.ward_no,
  ward_area = EXCLUDED.ward_area,
  contact_person = EXCLUDED.contact_person,
  phone = EXCLUDED.phone,
  address = EXCLUDED.address,
  status_label = EXCLUDED.status_label,
  is_active = EXCLUDED.is_active;

-- ── 3. ADMINISTRATIVE & BRANCH USERS ──────────────────────────────────────
INSERT INTO users (id, head_office_id, branch_id, name, phone, email, password_hash, role, ward_area, is_active)
VALUES
  ('1ba61cc7-0896-41b5-8cc9-7728bb1630d3', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', NULL, 'S. Bhupinder Singh Ginni', '9873730737', 'admin@gmail.com', '$2b$10$TZvVe3fOdTNOXIqwKUHbYeb375qG3ApM9zephD6nmOnULrqh5MJQ6', 'super_admin', 'Tagore Garden', true),
  ('7157a5b3-9423-4d1d-ae8e-f20b22a81581', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', NULL, 'Delhi HO Admin', '9800000001', 'delhi.ho@gospeedy.in', '$2b$10$WzoU9MvNYhtiGwrUGuXcqeMhi0LklDdu5N0b4Q2DikGcrkSgHj4EG', 'ho_admin', NULL, true),
  ('2227d058-2778-4d07-938e-66d5dfb777c3', '48727475-c02b-4e5e-842d-8d0b35240b87', NULL, 'Gurgaon HO Admin', '9800000003', 'gurgaon.ho@gospeedy.in', '$2b$10$WzoU9MvNYhtiGwrUGuXcqeMhi0LklDdu5N0b4Q2DikGcrkSgHj4EG', 'ho_admin', NULL, true),
  ('bcbe8c0b-dfdf-48b3-a712-499001645952', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', '609d97e2-6f3d-4eb3-8944-95e45fbbcf21', 'S. Ramanjot Singh Meeta', '9540999933', 'kritika@gospeedyev.com', '$2b$10$E0HAaoH/oeOZaGf7RHEDOeyxfiXxhRsUOmDp2fU492wRXwe/Nj0Hi', 'branch_admin', 'Uttam Nagar', true),
  ('6c2cf42c-800d-4a7d-aca7-bfea51e01701', 'b9114406-a159-468f-aa4b-ebafa3ae338f', NULL, 'Noida HO Admin', '9800000002', 'noida.ho@gospeedy.in', '$2b$10$WzoU9MvNYhtiGwrUGuXcqeMhi0LklDdu5N0b4Q2DikGcrkSgHj4EG', 'ho_admin', NULL, true),
  ('26f702cf-775c-4617-8143-f07b81aa7bfc', NULL, NULL, 'Himani', '9210624602', 'staff@gmail.com', '$2b$10$ddIt4upLnOBTUEmcben3neID7BLu1.PRAfJtI/AZplQZ5JmhgXfOm', 'staff', 'Moti Nagar', true),
  ('6b4d8df4-43b3-4f94-a8c3-fe62b232c754', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', '4fe850ac-ff77-43fb-b481-58b064eccfc7', 'S. Sukhbir Singh Kalra', '9810014786', 'wardadmin.delwd02@gospeedy.in', '$2b$10$CVLXeZY5K9FdpSUW3wcpmOAgwItViaZES9NDA4/WUa6SElGk41VIS', 'branch_admin', 'Saroop Nagar', true),
  ('ab1407a3-b0c2-416f-b7c2-da5ae1d5f319', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 'c7a54e8a-1e65-4061-9506-76a0a5c0e57d', 'S. Jasbir Singh Jassi', '9818711003', 'wardadmin.delwd03@gospeedy.in', '$2b$10$KDj9eC2Qq5N/Uj9FtrlG8uUQtUTZp6J6M1ttPcaSqNR2BNDOkyRF2', 'branch_admin', 'Civil Line', true),
  ('47fd6238-a2de-4d79-ae17-c54be5f65684', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', '3f9106b6-9081-4537-8360-1a6a84e0241e', 'S. Mohinderpal Singh Chadha', '9811048221', 'wardadmin.delwd04@gospeedy.in', '$2b$10$Q0VJVxIumqIRRy/PzLIaFuVZXEFBb9Fx7VSsoNHuEtnNubNQF05zC', 'branch_admin', 'Pitam Pura', true),
  ('3fc5be9c-7008-4ddb-b119-0a51a059969d', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', '7fa3a480-1378-43c3-a1a8-aa1a157502b8', 'S. Amritpal Singh (Palco)', '9899598009', 'wardadmin.delwd05@gospeedy.in', '$2b$10$v2u0pYw8dYnQvNy0jFlVu.zrjHWHxB0GrexmCGYxE4O9e1MWm7dfi', 'branch_admin', 'Model Town', true),
  ('806ae12e-deee-4a08-8e92-4c9f064b0552', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', '6d9ad097-0a16-40ba-aeb8-f4436bd79d93', 'S. Harvinder Singh K. P.', '9811198009', 'wardadmin.delwd06@gospeedy.in', '$2b$10$d0NQrmbq/gU0LnCiPGjzDednDTjkjtNO5lzj4ZfzuDUSnpY0rTf26', 'branch_admin', 'Shakti Nagar', true),
  ('c3a6e5fc-e0dd-424d-856b-fe39f08d9e69', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 'bd0f254e-76cf-470d-8eba-cca292ddf89e', 'S. Jaspreet Singh Karamsar', '9310493104', 'wardadmin.delwd07@gospeedy.in', '$2b$10$6nnrt.n6lS85oRcK6PwPTu7hZiX/krTh3jvpHcCr9w1gcU5.j7RR.', 'branch_admin', 'Tri Nagar', true),
  ('dc348605-a11d-45cb-aa27-c6ff7cdaf07a', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 'bce6395e-27b4-40a8-9114-3f3a83476aa1', 'S. Rameet Singh Chadha (Smarty Chadha)', '9811347171', 'wardadmin.delwd08@gospeedy.in', '$2b$10$JzYf.5.cw0FwZAeQzvEhWuqGYJ89McTKRn4vdaC5P4BMxMO8ylBsC', 'branch_admin', 'Shakur Basti', true),
  ('67cd4aa2-7a5d-4a14-925f-c677a9a22932', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 'b8ce2f53-679a-4851-ade2-03f6398e7de6', 'S. Manjinder Singh Sirsa', '9810094333', 'wardadmin.delwd09@gospeedy.in', '$2b$10$.ZoczMQgIm6s61Lncu2cxumbJdAU0WUR69YjK3R1JPJVPN3F1uBMi', 'branch_admin', 'Punjabi Bagh', true),
  ('232246ac-6823-40e5-998a-f7cefaae64b3', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', '4238944c-29d5-427d-b126-3fe111852bbb', 'S. Surjit Singh Jitti', '9899445555', 'wardadmin.delwd10@gospeedy.in', '$2b$10$p9dCUiKEMX9q0c0xV51TDO6oc8uw7pdYk6NIb2OcCFpTj8OxhwecS', 'branch_admin', 'Guru Harkrishan Nagar', true),
  ('543c8f7a-6469-471b-b42d-bf498df4d0b7', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 'dbfb3abc-80b1-4190-abbe-c56bbd3b5894', 'S. Nishan Singh Mann', '9899935873', 'wardadmin.delwd11@gospeedy.in', '$2b$10$mu6pRfVZMyNtlquo8V/6PeSdWB98myMhBYDA/4GAYcG2NGOwwdPnq', 'branch_admin', 'Chander Vihar', true),
  ('72da74bf-0e09-45f5-a7c0-e7323fdce905', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 'f6d0f7c5-21e2-4f20-8556-cd32bf0709d6', 'S. Jujhar Singh', '9873324878', 'wardadmin.delwd12@gospeedy.in', '$2b$10$E1Tlm7X/5K6aaqrqN2vABeAhq1UQg5lg2uEcRWu7Ctw0MUmEU1DMK', 'branch_admin', 'Dev Nagar', true),
  ('68664c69-07bd-4f78-9521-a61543547625', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', '9cf6dd91-4ba9-4691-a536-3d5ee3bee9e0', 'S. Paramjeet Singh Chandhok', '9810070597', 'wardadmin.delwd13@gospeedy.in', '$2b$10$cuDNzhV/Suu4fiUHz4F0Quwcu9I1hRsTI4oC/CYpNn37exJ.lvf/6', 'branch_admin', 'Rajinder Nagar', true),
  ('ea3d8ed3-b3f3-4264-97ef-416d8e9d3cf7', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 'bcc4e92c-3128-4ec0-a67f-7817cab05c03', 'S. Amarjeet Singh Pinky', '9810021488', 'wardadmin.delwd14@gospeedy.in', '$2b$10$V/HthTr5F9BxydzjazZKGeEtH.b0GWU9yZ38rzmEvN.A7GnB7YKyK', 'branch_admin', 'Connaught Place', true),
  ('0cec9fee-7300-4e2b-a2c0-683e82e843f8', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', '7fe666dc-205d-460a-ac31-6c3ebf400140', 'S. Gurdev Singh', '9911014141', 'wardadmin.delwd15@gospeedy.in', '$2b$10$kIJC4k5YtUmnWfAYfPJJJOpF7JqdAZqKHg/Dbh/7Q6fehpzFOWVyy', 'branch_admin', 'Ramesh Nagar', true),
  ('1e08cdec-a402-4704-a1f5-52c900e8fc6b', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', '833c10f9-2393-482b-b781-d2645f02e9b5', 'S. Satinder Pal Singh Nagi', '9910096719', 'wardadmin.delwd17@gospeedy.in', '$2b$10$O68UWPqPuAnWU4BxkptiiuUO.PIsOYCT3eY5MIcwN47oeqPY6kLIK', 'branch_admin', 'Raghubir Nagar', true),
  ('1bb677c8-e727-4814-9e06-d2efc2fb33c2', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 'df58c08b-573b-4d29-92d8-04835f4a9fc2', 'S. Harpal Singh Kochar', '7701926903', 'wardadmin.delwd18@gospeedy.in', '$2b$10$57Ij5XajpzFWRcEbZ4TYgedcb9LpmfJXrMriRHiFYincq4ABxC1V6', 'branch_admin', 'Rajouri Garden', true),
  ('5825d336-5a68-411e-b0aa-3f4a3606d2c2', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', '491abba7-41ef-4d46-820a-e599b0171641', 'S. Jaspreet Singh (Vicky Maan)', '9810465556', 'wardadmin.delwd19@gospeedy.in', '$2b$10$DHg8qNeqX/W7R1WhGYpCs.42VoOMr1CxMHURM5WK95tC8jNYF58Xq', 'branch_admin', 'Hari Nagar', true),
  ('f4ccec78-7d19-4ca9-a52a-318b562c0b14', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', '6a24dacb-7d08-423a-a12b-56c7120594ca', 'S. Amarjeet Singh (Pappu)', '9212001906', 'wardadmin.delwd20@gospeedy.in', '$2b$10$.TlN2C144BaWtiMh7UgvLeGoFDIAqucQ4SiYm37i/2RpsocjWcXRW', 'branch_admin', 'Fateh Nagar', true),
  ('67128ace-e7a9-453d-b9ca-92fc3b1294a5', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', '56cf336f-c06a-4a4b-aea7-b00d7c4008ec', 'S. Rajinder Singh (Gughi)', '9810728830', 'wardadmin.delwd21@gospeedy.in', '$2b$10$tyKlpbZnHLouPQc3IZ9FHudEYss13OkGONWHYZEN.pq28xSxDVCd2', 'branch_admin', 'Khayala', true),
  ('4bacc3ae-b1d8-4148-9439-591006599742', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 'e748479b-63e3-4028-b9d0-560528cea483', 'S. Harjit Singh Pappa', '9811489233', 'wardadmin.delwd22@gospeedy.in', '$2b$10$PI2lZCGYd/BG/N6RiM3GDe8OLdw9PoDa90FVQ/vBAjTk4UHgJ0BGC', 'branch_admin', 'Sham Nagar', true),
  ('d5ae74d6-9037-41dd-86df-dddd35591060', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', '909fffcd-a28b-42b1-b23b-54bfba1fe879', 'S. Manjit Singh Aulakh', '9891613158', 'wardadmin.delwd23@gospeedy.in', '$2b$10$vyErEcKhvC4..GXaIfwvSu0IRZpX.gemMAYXWB347NGhO4kHoY9p6', 'branch_admin', 'Vishnu Garden', true),
  ('fe1e0288-5019-47bd-9957-e3ed9ca04604', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', '9d6baecf-ec47-427d-ae72-06a67ad059a6', 'S. Gurmeet Singh Bhatia', '9212649959', 'wardadmin.delwd24@gospeedy.in', '$2b$10$DYU3Son55J2vYEo0bP1SauUwQznyBmVTYpH9SP3ZzY7955lVFWYmK', 'branch_admin', 'Ravi Nagar', true),
  ('3f237635-a87c-430d-908b-9798df1e53b9', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 'bc3be4fe-29f2-43fa-871c-f471b3fbbf17', 'S. Daljit Singh Sarna', '9871495180', 'wardadmin.delwd25@gospeedy.in', '$2b$10$NI9nMXjIAfLIV4tVb6Icd.zx5suqyeVPCCT8T.Ls3S4Cf7wAuoFoa', 'branch_admin', 'Tilak Nagar', true),
  ('215e1ed3-e8e2-4cb6-9953-111082fc6a89', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 'da8d1218-31c9-43d9-88c6-dae5203b46cf', 'Sant Garh Candidate', '9810000026', 'wardadmin.delwd26@gospeedy.in', '$2b$10$3enAs.W7LO09BvMf5Eh1ZOmtDgB8THrQpjrsdidEwDGOw.DJ5WS.q', 'branch_admin', 'Sant Garh', true),
  ('2fa5cffb-de70-421a-bc26-3fc880d00baf', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', '6557f9ce-c6e7-4ed5-9370-d6be4989ec6c', 'S. Atma Singh Lubana', '9868854548', 'wardadmin.delwd27@gospeedy.in', '$2b$10$9h5cHR75EkYbvdTW4eki6.mKm7AHwhX5lUQJtGpNSOuFxpiNMVYRa', 'branch_admin', 'Tilak Vihar', true),
  ('f9604575-53a5-44d3-a697-b33b28e84031', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', '8ece2619-5129-46ce-ab65-04e02d903b8f', 'S. Raminder Singh Sweeta', '9810929001', 'wardadmin.delwd28@gospeedy.in', '$2b$10$sUtYa88a73rSAu5dbgsgtOPXEJlKjTbyw6exhY0PChbx9aBvc/lXi', 'branch_admin', 'Guru Nanak Nagar', true),
  ('a6226f19-9581-41d9-9af5-fdd84882924a', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', '7b53db01-d55e-4f8b-ad0b-37192c405191', 'S. Jagdeep Singh Kahlon', '9811085996', 'wardadmin.delwd29@gospeedy.in', '$2b$10$t6yqyIxY2GODYOWLkR26nuH755Lxn8WtexzKfwkc7IIeyTkzqtcZC', 'branch_admin', 'Krishna Park', true),
  ('90673faf-6df5-4d5a-9975-c498c42ed398', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', '10bd1c58-fe78-4ca3-87b0-e7306ca8c878', 'S. Inderjit Singh Monty', '9811174950', 'wardadmin.delwd30@gospeedy.in', '$2b$10$ZYm7tC49KU0KYMbF89i/R.fe3J4L8SLe0ncUnS62hwmR14GutVQHy', 'branch_admin', 'Vikas Puri', true),
  ('5619c7d2-ba4f-467a-a11b-121ea2fc2cdf', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 'ed67d888-0225-482a-ab1e-bfb1e3f7395d', 'S. Gurmeet Singh Tinku', '8130041335', 'wardadmin.delwd32@gospeedy.in', '$2b$10$mcHM/sf7mqXeaFmjlXpVBudQUUiqn7D8TtSOOTzviTcl4hCJ5CYmC', 'branch_admin', 'Janak Puri', true),
  ('6925845f-bcb9-4aa5-8ff4-0930c9e73307', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 'a346a65b-8bfc-43fd-800e-fefe05cb621b', 'S. Ramandeep Singh Thappar', '9818103053', 'wardadmin.delwd33@gospeedy.in', '$2b$10$bYLhe7Q2BKCY9DFomPVS/OXY2cvzjYUD7ZSOKXM4rexQJhyVmJHAm', 'branch_admin', 'Shiv Nagar', true),
  ('0116b29e-846f-46be-8980-9246515bda78', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', '0ad7e16a-b2d3-430b-b0e8-aab627b6bfbf', 'S. Gurpreet Singh Jassa', '9810053253', 'wardadmin.delwd34@gospeedy.in', '$2b$10$fxR8OOXMv/p/10gIQc44hOSMvSt9w4vWCh540iWYCs1r/LXnhzU2W', 'branch_admin', 'Sarita Vihar', true),
  ('7042ce47-39ac-4d64-b4bd-d04a45b81c2d', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', '9d9db0ef-df1f-4462-bdc4-8ada5c9190d4', 'S. Paramjit Singh Bhatia', '9873800238', 'wardadmin.delwd35@gospeedy.in', '$2b$10$jn6IRB6B8f6UBUQZ9ixTZ.DU/OUR38Na6KOUkHfa10sMEEYuFV4Se', 'branch_admin', 'Lajpat Nagar', true),
  ('a476e3cb-96ba-4dd8-8c38-a34e3fdbb0bf', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', '09f0575c-6055-472a-9a62-5444ea2eb6dd', 'S. Kuldeep Singh Sawhney', '9711313138', 'wardadmin.delwd36@gospeedy.in', '$2b$10$pMdIbdq1dfiyO6wAdv.KSOKzeSgMFHxcnCgBvZt/23x9E9qYoiKcm', 'branch_admin', 'Safdarjung Enclave', true),
  ('3ad5460c-f492-4ec9-aa54-2c045a977b38', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', '54cdd3d8-380d-4aed-b9b7-01c078634734', 'S. Onkar Singh Raja', '9891164312', 'wardadmin.delwd37@gospeedy.in', '$2b$10$aU0sps8SIEu96Ip.n/uZLOWAfONu/h8P4371gkL21l5C.Lu7xgc86', 'branch_admin', 'Malviya Nagar', true),
  ('ff26613c-e7c1-43a8-906c-3f3be1c2bf62', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', '1f577547-4c1e-4609-858a-9ac742222db1', 'S. Charanjit Singh', '9717970696', 'wardadmin.delwd38@gospeedy.in', '$2b$10$YUoXySAxRaTCHf4pzPd40OnAeVj2BbElJn31L9xzUGxRKMJl1M796', 'branch_admin', 'Greater Kailash', true),
  ('9d24ca35-bba7-4aea-96b8-81fdf09e5016', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', '726ee093-af8a-4685-acf7-83659a32793e', 'S. Harmit Singh Kalka', '9811460300', 'wardadmin.delwd39@gospeedy.in', '$2b$10$EL0BRxXtaEdn3QsPpyxzAuq2wfXNUFq253CLOHuiF9./unZqqA12m', 'branch_admin', 'Kalka Ji', true),
  ('e646c8b4-d22c-44be-87bf-dca6328e8947', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', '3e4b9212-b931-427d-914f-daec4c67b33d', 'S. Jasmir Singh (Sunny Massi)', '9711713313', 'wardadmin.delwd40@gospeedy.in', '$2b$10$BM3l2zPkdzvmmp06quK2G.NWjf0IaUcyMZPLh4o5ZqA6DBf0sIDly', 'branch_admin', 'Jangpura', true),
  ('d60898bb-c213-4df5-94c2-7d2e3ee62ef1', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 'ea77ba84-49dc-4c01-bebe-6702fde741c7', 'S. Parvinder Singh (Lucky)', '9599908208', 'wardadmin.delwd41@gospeedy.in', '$2b$10$5NApXhILAyWGWXMmZnEJWO3QTACT3E6KjcKZI11Z2vryQS.c44FC.', 'branch_admin', 'Navin Shahdara', true),
  ('33edf05b-b126-4148-83a0-3dd27e268d91', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', '480ab729-b865-43dd-8ccf-2ca068c87a2a', 'S. Balbir Singh', '9868855555', 'wardadmin.delwd42@gospeedy.in', '$2b$10$uOGXFco8zs4LpgUujnhPgOODJ4ea5JXSVCfA5uW/2E0SshTfjwM.O', 'branch_admin', 'Dilshad Garden', true),
  ('c022188f-5593-48cf-91cb-06dbd145ba82', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', '58c6f5e6-ab69-44f4-8f50-80bda8625ec9', 'S. Jasmain Singh Noni', '9999009936', 'wardadmin.delwd43@gospeedy.in', '$2b$10$vVik69eNs7khl6Jc9wqhJ.Ews9kw5D5hew8M2FTFXk4YYEMPF254K', 'branch_admin', 'Vivek Vihar', true),
  ('03f23c1d-b346-473b-bc2d-bf6c81deef2f', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', '86a8a50a-b043-416f-8e50-819deb1a7743', 'Gurmeet Singh Bedi', '9810000044', 'wardadmin.delwd44@gospeedy.in', '$2b$10$g1sPNzKntOBeuN9V18mLiuW2iOvkRCJzvycS.7./fFIZOANlqs0VO', 'branch_admin', 'Geeta Colony', true),
  ('6a45a585-c31b-4f44-aac2-efa266e9711a', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', '7724e077-0f73-4532-9078-94b172cca385', 'S. Jatinder Pal Singh Goldy', '9810257677', 'wardadmin.delwd45@gospeedy.in', '$2b$10$RCyDkzCotzp9cQrfy6BqIOGkQUElcx/mWa6qC8Q9eOq1kpDM.Uecq', 'branch_admin', 'Khureji Khas', true),
  ('0a85d5bc-cc00-430d-9b6e-8c841a531949', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 'e3fc085a-beff-4499-92d3-b17874c04c53', 'S. Bupinder Singh Bhullar', '9811070501', 'wardadmin.delwd46@gospeedy.in', '$2b$10$5zMU9VFl3PwMS/qUYZCtnuG/DW4uZo1Ih7yJClh7rh1ZeOX3Zody.', 'branch_admin', 'Preet Vihar', true),
  ('4258f489-2ab6-44c8-924d-55cd576ac66c', '9bab7b7d-e935-4401-ba93-8eddc8b2b90e', 'ada166e8-6720-4e5b-945e-737301f8e98d', 'S. Sarvjit Singh Virk', '9811695785', 'wardadmin@gospeedy.in', '$2b$10$jmy3gEAIbAFyqAeWeDu/yOFabzq6KXquD/Ww7Kzo4Z57b0Oo9EUmO', 'branch_admin', 'Rohini', true)
ON CONFLICT (email) DO UPDATE SET
  head_office_id = EXCLUDED.head_office_id,
  branch_id = EXCLUDED.branch_id,
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  ward_area = EXCLUDED.ward_area,
  is_active = EXCLUDED.is_active;

-- ── TABLE 8: bike_transfers ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bike_transfers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id      TEXT UNIQUE NOT NULL,
  from_branch_id   UUID REFERENCES branches(id),
  to_branch_id     UUID REFERENCES branches(id),
  ev_model_id      UUID REFERENCES ev_models(id),
  quantity         INTEGER NOT NULL DEFAULT 1,
  status           TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'in_transit', 'received', 'cancelled')),
  challan_number   TEXT,
  driver_name      TEXT,
  driver_phone     TEXT,
  dispatch_notes   TEXT,
  receive_notes    TEXT,
  condition_received TEXT DEFAULT 'Good',
  initiated_by     UUID REFERENCES users(id),
  dispatched_by    UUID REFERENCES users(id),
  received_by      UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transfers_from ON bike_transfers(from_branch_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to   ON bike_transfers(to_branch_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON bike_transfers(status);

-- ── TABLE 9: penalties ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS penalties (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  penalty_id      TEXT UNIQUE NOT NULL,
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  amount          NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  reason          TEXT NOT NULL,
  notes           TEXT,
  penalty_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  status          TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'waived')),
  waived_reason   TEXT,
  waived_by       UUID REFERENCES users(id),
  waived_at       TIMESTAMPTZ,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_penalties_tenant ON penalties(tenant_id);
CREATE INDEX IF NOT EXISTS idx_penalties_status ON penalties(status);

