-- =============================================================
-- Add authentication columns to volunteers table
-- Run: psql -U postgres -d ncp_campaign -f database/add_auth.sql
-- =============================================================

ALTER TABLE volunteers
  ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Create first admin volunteer (password: Admin@123)
-- bcrypt hash of 'Admin@123' with salt rounds 12
INSERT INTO volunteers (name, mobile, password_hash, role)
VALUES (
  'Admin NCP',
  '9999999999',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYpR1A6A8e2u/u2',
  'state_leader'
)
ON CONFLICT (mobile) DO NOTHING;

SELECT 'Auth setup complete!' AS status;
SELECT '  Login: mobile=9999999999  password=Admin@123' AS credentials;
