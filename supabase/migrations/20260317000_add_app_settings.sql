-- Create app_settings table for global feature flags (e.g., KYC toggle)
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- Seed the KYC toggle default (enabled)
INSERT INTO app_settings (key, value) VALUES ('kyc_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Add 'exempt' to the kyc_status constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_kyc_status_check;
ALTER TABLE users ADD CONSTRAINT users_kyc_status_check
    CHECK (kyc_status IN ('not_started','pending','approved','rejected','resubmission_requested','exempt'));
