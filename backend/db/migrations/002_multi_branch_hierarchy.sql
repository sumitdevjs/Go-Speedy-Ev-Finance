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

  -- Delhi Wards 1 to 46 with Candidate Names, Phone Numbers, and Addresses
  INSERT INTO branches (head_office_id, ward_no, name, code, ward_area, contact_person, phone, address, status_label) VALUES
    (v_delhi_id, 1, 'Rohini', 'DEL-WD-01', 'North West Delhi', 'S. Sarvjit Singh Virk', '9811695785', '165, Farmers Apartment, Plot no.8, Sector-13, Rohini Delhi-110085', 'Won'),
    (v_delhi_id, 2, 'Saroop Nagar', 'DEL-WD-02', 'North Delhi', 'S. Sukhbir Singh Kalra', '9810014786', 'Saroop Nagar, North Delhi', 'Lost'),
    (v_delhi_id, 3, 'Civil Line', 'DEL-WD-03', 'North Delhi', 'S. Jasbir Singh Jassi', '9818711003', '276A, 3rd Floor, Indira Vihar, Kingsway Camp, Dr. Mukherjee Nagar, Delhi-110009', 'Won'),
    (v_delhi_id, 4, 'Pitam Pura', 'DEL-WD-04', 'North West Delhi', 'S. Mohinderpal Singh Chadha', '9811048221', 'MD-26, Vishakha Enclave, Pitampura, Delhi-110088', 'Won'),
    (v_delhi_id, 5, 'Model Town', 'DEL-WD-05', 'North Delhi', 'S. Amritpal Singh (Palco)', '9899598009', 'B-2, Panchvati Azadpur, Delhi-110033', 'Lost'),
    (v_delhi_id, 6, 'Shakti Nagar', 'DEL-WD-06', 'North Delhi', 'S. Harvinder Singh K. P.', '9811198009', 'B-2, Panchvati, Opp. Azadpur Subzi Mandi, Delhi-110033', 'Won'),
    (v_delhi_id, 7, 'Tri Nagar', 'DEL-WD-07', 'North West Delhi', 'S. Jaspreet Singh Karamsar', '9310493104', 'Tri Nagar, North West Delhi', 'Won'),
    (v_delhi_id, 8, 'Shakur Basti', 'DEL-WD-08', 'North West Delhi', 'S. Rameet Singh Chadha (Smarty Chadha)', '9811347171', '294, Sainik Vihar, Pitampura, New Delhi', 'Lost'),
    (v_delhi_id, 9, 'Punjabi Bagh', 'DEL-WD-09', 'West Delhi', 'S. Manjinder Singh Sirsa', '9810094333', '7/77, West Punjabi Bagh, New Delhi-110026', 'Lost'),
    (v_delhi_id, 10, 'Guru Harkrishan Nagar', 'DEL-WD-10', 'West Delhi', 'S. Surjit Singh Jitti', '9899445555', 'Guru Harkrishan Nagar, West Delhi', 'Won'),
    (v_delhi_id, 11, 'Chander Vihar', 'DEL-WD-11', 'West Delhi', 'S. Nishan Singh Mann', '9899935873', 'B-2/30, Vikas Vihar, Nilothi Extension, New Delhi-110041', 'Lost'),
    (v_delhi_id, 12, 'Dev Nagar', 'DEL-WD-12', 'Central Delhi', 'S. Jujhar Singh', '9873324878', 'House no.4066, Gali no.37, Regarpura, Karol Bagh, New Delhi-110005', 'Lost'),
    (v_delhi_id, 13, 'Rajinder Nagar', 'DEL-WD-13', 'Central Delhi', 'S. Paramjeet Singh Chandhok', '9810070597', '2635, Bank Street, Karol Bagh, New Delhi', 'Lost'),
    (v_delhi_id, 14, 'Connaught Place', 'DEL-WD-14', 'Central Delhi', 'S. Amarjeet Singh Pinky', '9810021488', '2151, Kinari Bazar, Chandni Chowk, Delhi-110006', 'Won'),
    (v_delhi_id, 15, 'Ramesh Nagar', 'DEL-WD-15', 'West Delhi', 'S. Gurdev Singh', '9911014141', 'Ramesh Nagar, West Delhi', 'Won'),
    (v_delhi_id, 16, 'Tagore Garden', 'DEL-WD-16', 'West Delhi', 'S. Bhupinder Singh Ginni', '9873730737', 'A-7/77 Moti Nagar, New Delhi-110015', 'Won'),
    (v_delhi_id, 17, 'Raghubir Nagar', 'DEL-WD-17', 'West Delhi', 'S. Satinder Pal Singh Nagi', '9910096719', 'S-221/266, Gali No.7, Vishnu Garden, New Delhi-110018', 'Won'),
    (v_delhi_id, 18, 'Rajouri Garden', 'DEL-WD-18', 'West Delhi', 'S. Harpal Singh Kochar', '7701926903', 'F-17, Rajouri Garden, New Delhi-110027', 'Lost'),
    (v_delhi_id, 19, 'Hari Nagar', 'DEL-WD-19', 'West Delhi', 'S. Jaspreet Singh (Vicky标志)', '9810465556', 'BE-255, Gali no.2, Hari Nagar, New Delhi-110064', 'Lost'),
    (v_delhi_id, 20, 'Fateh Nagar', 'DEL-WD-20', 'West Delhi', 'S. Amarjeet Singh (Pappu)', '9212001906', 'C-15, Fateh Nagar, New Delhi-110018', 'Won'),
    (v_delhi_id, 21, 'Khayala', 'DEL-WD-21', 'West Delhi', 'S. Rajinder Singh (Gughi)', '9810728830', 'WZ-3rd29-B-126, Vishnu Garden, New Delhi-110018', 'Won'),
    (v_delhi_id, 22, 'Sham Nagar', 'DEL-WD-22', 'West Delhi', 'S. Harjit Singh Pappa', '9811489233', 'G-39, Vishnu Garden, Mangal Bazar, New Delhi-110018', 'Won'),
    (v_delhi_id, 23, 'Vishnu Garden', 'DEL-WD-23', 'West Delhi', 'S. Manjit Singh Aulakh', '9891613158', 'WZ-49H, Navyug Block, Vishnu Garden, New Delhi-110018', 'Lost'),
    (v_delhi_id, 24, 'Ravi Nagar', 'DEL-WD-24', 'West Delhi', 'S. Gurmeet Singh Bhatia', '9212649959', 'A-12, J.J. Colony, Chowkhandi, Tilak Nagar, New Delhi-110018', 'Won'),
    (v_delhi_id, 25, 'Tilak Nagar', 'DEL-WD-25', 'West Delhi', 'S. Daljit Singh Sarna', '9871495180', 'D-4, Mukherjee Garden, Tilak Nagar, New Delhi-110018', 'Lost'),
    (v_delhi_id, 26, 'Sant Garh', 'DEL-WD-26', 'West Delhi', 'Sant Garh Candidate', '9810000026', 'Sant Garh, West Delhi', 'Won'),
    (v_delhi_id, 27, 'Tilak Vihar', 'DEL-WD-27', 'West Delhi', 'S. Atma Singh Lubana', '9868854548', 'C-127A, Tilak Vihar, New Delhi-110018', 'Won'),
    (v_delhi_id, 28, 'Guru Nanak Nagar', 'DEL-WD-28', 'West Delhi', 'S. Raminder Singh Sweeta', '9810929001', 'WZ-10/2A, New Sahibpura, MBA Nagar, Tilak Nagar, New Delhi-110018', 'Won'),
    (v_delhi_id, 29, 'Krishna Park', 'DEL-WD-29', 'West Delhi', 'S. Jagdeep Singh Kahlon', '9811085996', 'WZ-217, Gali No.1, Krishna Park, New Delhi-110018', 'Won'),
    (v_delhi_id, 30, 'Vikas Puri', 'DEL-WD-30', 'West Delhi', 'S. Inderjit Singh Monty', '9811174950', 'Vikas Puri, West Delhi', 'Lost'),
    (v_delhi_id, 31, 'Uttam Nagar', 'DEL-WD-31', 'West Delhi', 'S. Ramanjot Singh Meeta', '9654919065', 'A-811, Pankha Road, Uttam Nagar, Delhi-110059', 'Won'),
    (v_delhi_id, 32, 'Janak Puri', 'DEL-WD-32', 'West Delhi', 'S. Gurmeet Singh Tinku', '8130041335', 'Janak Puri, West Delhi', 'Lost'),
    (v_delhi_id, 33, 'Shiv Nagar', 'DEL-WD-33', 'West Delhi', 'S. Ramandeep Singh Thappar', '9818103053', 'WZ-530, Gali No. 27, Jail Road, Shiv Nagar, New Delhi-110058', 'Won'),
    (v_delhi_id, 34, 'Sarita Vihar', 'DEL-WD-34', 'South East Delhi', 'S. Gurpreet Singh Jassa', '9810053253', 'B-18, Flat no.101, Ground Floor, Viskarma Colony, New Delhi-110011', 'Won'),
    (v_delhi_id, 35, 'Lajpat Nagar', 'DEL-WD-35', 'South Delhi', 'S. Paramjit Singh Bhatia', '9873800238', 'I83-84, Lajpat Nagar-1, New Delhi-110024', 'Lost'),
    (v_delhi_id, 36, 'Safdarjung Enclave', 'DEL-WD-36', 'South Delhi', 'S. Kuldeep Singh Sawhney', '9711313138', '165-Sarojini Nagar, New Delhi', 'Lost'),
    (v_delhi_id, 37, 'Malviya Nagar', 'DEL-WD-37', 'South Delhi', 'S. Onkar Singh Raja', '9891164312', 'G-3/11, Malviya Nagar, Near Krishna Mandir, New Delhi-110017', 'Lost'),
    (v_delhi_id, 38, 'Greater Kailash', 'DEL-WD-38', 'South Delhi', 'S. Charanjit Singh', '9717970696', 'House no.204, GHPS Campus, Vasant Vihar, New Delhi', 'Lost'),
    (v_delhi_id, 39, 'Kalka Ji', 'DEL-WD-39', 'South Delhi', 'S. Harmit Singh Kalka', '9811460300', 'House No. 7, Lane W8A, Sainik Farms, New Delhi-110062', 'Won'),
    (v_delhi_id, 40, 'Jangpura', 'DEL-WD-40', 'South East Delhi', 'S. Jasmir Singh (Sunny Massi)', '9711713313', '722, 2nd Floor Opp. Gurdwara Bala Sahib, Sunlight Colony 1, Ashram, Delhi-110014', 'Lost'),
    (v_delhi_id, 41, 'Navin Shahdara', 'DEL-WD-41', 'East Delhi', 'S. Parvinder Singh (Lucky)', '9599908208', 'Navin Shahdara, East Delhi', 'Won'),
    (v_delhi_id, 42, 'Dilshad Garden', 'DEL-WD-42', 'East Delhi', 'S. Balbir Singh', '9868855555', 'C-145, Vivek Vihar, Delhi-110095', 'Won'),
    (v_delhi_id, 43, 'Vivek Vihar', 'DEL-WD-43', 'East Delhi', 'S. Jasmain Singh Noni', '9999009936', '252/4, Street No., Bhola Nath Nagar, Delhi-110032', 'Won'),
    (v_delhi_id, 44, 'Geeta Colony', 'DEL-WD-44', 'East Delhi', 'Gurmeet Singh Bedi', '9810000044', 'Geeta Colony, East Delhi', 'Active'),
    (v_delhi_id, 45, 'Khureji Khas', 'DEL-WD-45', 'East Delhi', 'S. Jatinder Pal Singh Goldy', '9810257677', '93/2, Guru Angad Nagar East, 1st floor, Gali No.8, behind Sai Mandir, Delhi', 'Lost'),
    (v_delhi_id, 46, 'Preet Vihar', 'DEL-WD-46', 'East Delhi', 'S. Bupinder Singh Bhullar', '9811070501', 'B-141, Pandav Nagar, Opp. Mother Dairy, Delhi-110092', 'Won')
  ON CONFLICT (code) DO UPDATE SET
    contact_person = EXCLUDED.contact_person,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    status_label = EXCLUDED.status_label,
    ward_area = EXCLUDED.ward_area,
    ward_no = EXCLUDED.ward_no;

  -- Noida Starter Branches
  INSERT INTO branches (head_office_id, ward_no, name, code, ward_area, contact_person, phone, address, status_label) VALUES
    (v_noida_id, 101, 'Noida Sector 62', 'NOI-BR-01', 'Sector 62 Institutional Area', 'Noida Hub Manager', '9810000101', 'Sector 62 Institutional Area, Noida', 'Active'),
    (v_noida_id, 102, 'Noida Sector 18', 'NOI-BR-02', 'Sector 18 Commercial Market', 'Sector 18 Hub Manager', '9810000102', 'Sector 18 Commercial Market, Noida', 'Active')
  ON CONFLICT (code) DO NOTHING;

  -- Gurgaon Starter Branches
  INSERT INTO branches (head_office_id, ward_no, name, code, ward_area, contact_person, phone, address, status_label) VALUES
    (v_ggn_id, 201, 'Cyber City', 'GGN-BR-01', 'DLF Cyber City Phase II', 'Gurgaon DLF Cyber City Hub', '9810000201', 'DLF Cyber City Phase II, Gurugram', 'Active'),
    (v_ggn_id, 202, 'MG Road', 'GGN-BR-02', 'MG Road Commercial Hub', 'MG Road Hub Manager', '9810000202', 'MG Road Commercial Hub, Gurugram', 'Active')
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
