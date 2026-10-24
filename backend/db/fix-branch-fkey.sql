-- Update foreign keys to ON DELETE SET NULL for branches so deletion works cleanly
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_branch_id_fkey;
ALTER TABLE users ADD CONSTRAINT users_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL;

ALTER TABLE ev_models DROP CONSTRAINT IF EXISTS ev_models_branch_id_fkey;
ALTER TABLE ev_models ADD CONSTRAINT ev_models_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL;

ALTER TABLE old_evs DROP CONSTRAINT IF EXISTS old_evs_branch_id_fkey;
ALTER TABLE old_evs ADD CONSTRAINT old_evs_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL;

ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_branch_id_fkey;
ALTER TABLE tenants ADD CONSTRAINT tenants_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL;

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_branch_id_fkey;
ALTER TABLE bookings ADD CONSTRAINT bookings_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL;
