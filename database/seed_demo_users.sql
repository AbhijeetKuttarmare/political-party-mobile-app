-- =============================================================
-- Seed all demo users for every web role
-- Password for ALL accounts: Admin@123
-- Run: psql -U postgres -d ncp_campaign -f database/seed_demo_users.sql
-- =============================================================

-- Ensure password_hash column exists
ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- bcrypt hash of 'Admin@123' with salt 12 (same as add_auth.sql)
-- $2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYpR1A6A8e2u/u2

INSERT INTO volunteers (name, mobile, password_hash, role) VALUES
  ('Admin NCP-SP',      '8888888888', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYpR1A6A8e2u/u2', 'super_admin'),
  ('State Leader Demo', '9999999999', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYpR1A6A8e2u/u2', 'state_leader'),
  ('District Leader',   '7777777777', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYpR1A6A8e2u/u2', 'district_leader'),
  ('Observer Demo',     '6666666666', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYpR1A6A8e2u/u2', 'observer')
ON CONFLICT (mobile) DO UPDATE
  SET password_hash = EXCLUDED.password_hash,
      role          = EXCLUDED.role,
      name          = EXCLUDED.name,
      is_active     = true;

SELECT mobile, name, role FROM volunteers
WHERE mobile IN ('8888888888','9999999999','7777777777','6666666666')
ORDER BY mobile;
