-- ─────────────────────────────────────────────────────
-- 029: Extend tester_signups for role-based credentials
-- Adds country, license info, file path, LinkedIn,
-- investor fields, specialty, and Zoom scheduling.
-- Also creates a private storage bucket for credentials.
-- ─────────────────────────────────────────────────────

-- New columns on existing tester_signups table
ALTER TABLE tester_signups
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS license_type TEXT,
  ADD COLUMN IF NOT EXISTS license_number TEXT,
  ADD COLUMN IF NOT EXISTS specialty TEXT,
  ADD COLUMN IF NOT EXISTS credential_file_path TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS portfolio_url TEXT,
  ADD COLUMN IF NOT EXISTS organization TEXT,
  ADD COLUMN IF NOT EXISTS preferred_call_time TEXT,
  ADD COLUMN IF NOT EXISTS motivation TEXT;

-- Storage bucket for credential uploads (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('tester-credentials', 'tester-credentials', false)
ON CONFLICT (id) DO NOTHING;

-- Allow service role to manage credential files
CREATE POLICY "Service role full access on tester-credentials"
  ON storage.objects FOR ALL
  USING (bucket_id = 'tester-credentials')
  WITH CHECK (bucket_id = 'tester-credentials');
