-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK MIGRATION 002: REVERT MULTI-TIER HIERARCHY
-- Reverts all tables, columns, indexes, and constraints added in migration 002
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Revert role changes in users table
UPDATE users SET role = 'admin' WHERE role IN ('super_admin', 'ho_admin', 'branch_admin');

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'staff'));

-- 2. Drop added columns from business tables
ALTER TABLE bookings DROP COLUMN IF EXISTS branch_id;
ALTER TABLE bookings DROP COLUMN IF EXISTS head_office_id;

ALTER TABLE payments DROP COLUMN IF EXISTS branch_id;
ALTER TABLE payments DROP COLUMN IF EXISTS head_office_id;
ALTER TABLE payments DROP COLUMN IF EXISTS late_fee_paid;
ALTER TABLE payments DROP COLUMN IF EXISTS is_penalty_waiver;

ALTER TABLE tenants DROP COLUMN IF EXISTS branch_id;
ALTER TABLE tenants DROP COLUMN IF EXISTS head_office_id;
ALTER TABLE tenants DROP COLUMN IF EXISTS late_fee_daily_rate;

ALTER TABLE old_evs DROP COLUMN IF EXISTS branch_id;
ALTER TABLE old_evs DROP COLUMN IF EXISTS head_office_id;

ALTER TABLE ev_models DROP COLUMN IF EXISTS branch_id;
ALTER TABLE ev_models DROP COLUMN IF EXISTS head_office_id;

ALTER TABLE users DROP COLUMN IF EXISTS branch_id;
ALTER TABLE users DROP COLUMN IF EXISTS head_office_id;

-- 3. Drop branches and head_offices tables
DROP TABLE IF EXISTS branches CASCADE;
DROP TABLE IF EXISTS head_offices CASCADE;
