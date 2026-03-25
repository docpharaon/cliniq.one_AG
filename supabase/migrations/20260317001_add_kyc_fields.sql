-- Add KYC (identity verification) fields to users table
-- Patients can consult freely but prescriptions are gated behind kyc_status = 'approved'

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'not_started'
    CHECK (kyc_status IN ('not_started','pending','approved','rejected','resubmission_requested')),
  ADD COLUMN IF NOT EXISTS kyc_applicant_id TEXT,
  ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS kyc_rejection_reason TEXT;

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_users_kyc_status ON users(kyc_status);

COMMENT ON COLUMN users.kyc_status IS 'Sumsub KYC verification status';
COMMENT ON COLUMN users.kyc_applicant_id IS 'Sumsub applicant ID for this user';
COMMENT ON COLUMN users.kyc_verified_at IS 'Timestamp when KYC was approved';
COMMENT ON COLUMN users.kyc_rejection_reason IS 'Reason for KYC rejection, if any';
