-- ══════════════════════════════════════════════════════════════
-- 029_security_hardening.sql
-- Security audit fixes + E2E test account seeding
-- ══════════════════════════════════════════════════════════════

-- ── 1. Restrict push_token visibility ────────────────────────
-- Users should NOT be able to read other users' push tokens.
-- The existing RLS "Users can view own profile" (auth.uid() = id)
-- already restricts this. But let's add a column-level comment
-- to document the intent.

COMMENT ON COLUMN public.users.push_token IS
  'Expo push notification token — visible only to the user and service role';
COMMENT ON COLUMN public.users.push_enabled IS
  'Whether push notifications are enabled — user-controlled';

-- ── 2. Restrict patient_notifications INSERT ─────────────────
-- Only service role (triggers) should insert. Already handled
-- in 028 by not having an INSERT policy. Confirming here.
-- (No policy = denied by RLS for authenticated users)

-- ── 3. Add rate-limit tracking table ─────────────────────────
-- Tracks API call counts per user/endpoint for server-side rate limiting

CREATE TABLE IF NOT EXISTS public.rate_limit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    endpoint TEXT NOT NULL,
    window_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('minute', now()),
    call_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Composite index for rate limit lookups
CREATE INDEX IF NOT EXISTS idx_rate_limit_lookup
  ON public.rate_limit_log (user_id, endpoint, window_start);

-- Auto-cleanup: delete entries older than 1 hour
-- (can be run via pg_cron or manual cleanup)

ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;
-- No RLS policies = only service role can access

-- ── 4. Audit: verify .env.local is gitignored ───────────────
-- (This is a manual check — handled in verification)

-- ── 5. Seed E2E test accounts ────────────────────────────────
-- These accounts are used by Playwright E2E tests.
-- Passwords must be set via Supabase Auth dashboard or CLI.
-- The test accounts should be created in Supabase Auth first,
-- then these rows link them to the users/doctors tables.

-- NOTE: In production, replace these UUIDs with actual auth.users IDs.
-- For local development, create these users via:
--   supabase auth admin create-user --email test-doctor@cliniq.one --password TestDoctor123!
--   supabase auth admin create-user --email test-admin@cliniq.one --password TestAdmin123!
--   supabase auth admin create-user --email test-patient@cliniq.one --password TestPatient123!

-- Placeholder: insert users rows IF the auth users exist
DO $seed$
BEGIN
  -- Only seed if test accounts don't already exist
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'test-doctor@cliniq.one') THEN
    -- Doctor account (requires auth.users to exist first)
    INSERT INTO public.users (id, email, nickname, role, status, tokens_balance, onboarding_completed)
    SELECT id, 'test-doctor@cliniq.one', 'Dr. Test', 'doctor', 'active', 0, true
    FROM auth.users WHERE email = 'test-doctor@cliniq.one'
    ON CONFLICT (id) DO NOTHING;

    -- Create doctor profile if user was inserted
    INSERT INTO public.doctors (user_id, full_name, display_name, license_number, license_authority, specialty, status, is_accepting)
    SELECT u.id, 'Dr. Test Doctor', 'Dr. Test', 'LIC-E2E-001', 'Test Authority', 'dermatology', 'active', true
    FROM public.users u WHERE u.email = 'test-doctor@cliniq.one'
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'test-admin@cliniq.one') THEN
    INSERT INTO public.users (id, email, nickname, role, status, tokens_balance, onboarding_completed)
    SELECT id, 'test-admin@cliniq.one', 'Admin Test', 'admin', 'active', 0, true
    FROM auth.users WHERE email = 'test-admin@cliniq.one'
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'test-patient@cliniq.one') THEN
    INSERT INTO public.users (id, email, nickname, role, status, tokens_balance, onboarding_completed)
    SELECT id, 'test-patient@cliniq.one', 'Patient Test', 'patient', 'active', 100, true
    FROM auth.users WHERE email = 'test-patient@cliniq.one'
    ON CONFLICT (id) DO NOTHING;
  END IF;
END
$seed$;
