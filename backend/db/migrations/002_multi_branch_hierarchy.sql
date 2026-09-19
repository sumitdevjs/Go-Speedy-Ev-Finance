-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION 002: MULTI-TIER HIERARCHY & WARD DATA ISOLATION
-- Supports: Super Admin -> Head Offices (Delhi, Noida, Gurgaon) -> 46+ Wards -> Branch Admin -> Staff
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Create head_offices table
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

-- 2. Create branches / wards table
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

-- 3. Update users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS head_office_id UUID REFERENCES head_offices(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);

-- Drop old role check constraint and apply new multi-tier roles
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('super_admin', 'ho_admin', 'branch_admin', 'staff', 'admin'));

CREATE INDEX IF NOT EXISTS idx_users_branch ON users(branch_id);
CREATE INDEX IF NOT EXISTS idx_users_ho ON users(head_office_id);

-- 4. Update core business tables with branch_id & head_office_id
ALTER TABLE ev_models ADD COLUMN IF NOT EXISTS head_office_id UUID REFERENCES head_offices(id);
ALTER TABLE ev_models ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);
CREATE INDEX IF NOT EXISTS idx_ev_models_branch ON ev_models(branch_id);

ALTER TABLE old_evs ADD COLUMN IF NOT EXISTS head_office_id UUID REFERENCES head_offices(id);
ALTER TABLE old_evs ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);
CREATE INDEX IF NOT EXISTS idx_old_evs_branch ON old_evs(branch_id);

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS head_office_id UUID REFERENCES head_offices(id);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS late_fee_daily_rate NUMERIC(8,2) NOT NULL DEFAULT 50.00;
CREATE INDEX IF NOT EXISTS idx_tenants_branch ON tenants(branch_id);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS head_office_id UUID REFERENCES head_offices(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS late_fee_paid NUMERIC(8,2) NOT NULL DEFAULT 0.00;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS is_penalty_waiver BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_payments_branch ON payments(branch_id);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS head_office_id UUID REFERENCES head_offices(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);
CREATE INDEX IF NOT EXISTS idx_bookings_branch ON bookings(branch_id);

-- 5. Enable Row Level Security (RLS) on new tables
ALTER TABLE head_offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- 6. Pre-Seed Head Offices
INSERT INTO head_offices (name, code, city, state) VALUES
  ('Delhi Head Office', 'DEL-HO', 'New Delhi', 'Delhi'),
  ('Noida Head Office', 'NOI-HO', 'Noida', 'Uttar Pradesh'),
  ('Gurgaon Head Office', 'GGN-HO', 'Gurugram', 'Haryana')
ON CONFLICT (code) DO NOTHING;

-- 7. Pre-Seed all 46 Delhi Wards from official ward list
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

  -- 8. Safe Data Backfill: Link existing data to Rohini (Ward 1) & Delhi HO
  DECLARE
    v_default_branch_id UUID;
  BEGIN
    SELECT id INTO v_default_branch_id FROM branches WHERE code = 'DEL-WD-01';

    IF v_default_branch_id IS NOT NULL AND v_delhi_id IS NOT NULL THEN
      -- Backfill users
      UPDATE users 
      SET head_office_id = v_delhi_id, branch_id = v_default_branch_id 
      WHERE branch_id IS NULL;

      -- Upgrade admin to super_admin so full access is preserved
      UPDATE users 
      SET role = 'super_admin' 
      WHERE role = 'admin';

      -- Backfill ev_models
      UPDATE ev_models 
      SET head_office_id = v_delhi_id, branch_id = v_default_branch_id 
      WHERE branch_id IS NULL;

      -- Backfill old_evs
      UPDATE old_evs 
      SET head_office_id = v_delhi_id, branch_id = v_default_branch_id 
      WHERE branch_id IS NULL;

      -- Backfill tenants
      UPDATE tenants 
      SET head_office_id = v_delhi_id, branch_id = v_default_branch_id 
      WHERE branch_id IS NULL;

      -- Backfill payments
      UPDATE payments 
      SET head_office_id = v_delhi_id, branch_id = v_default_branch_id 
      WHERE branch_id IS NULL;

      -- Backfill bookings
      UPDATE bookings 
      SET head_office_id = v_delhi_id, branch_id = v_default_branch_id 
      WHERE branch_id IS NULL;
    END IF;
  END;

END $$;
