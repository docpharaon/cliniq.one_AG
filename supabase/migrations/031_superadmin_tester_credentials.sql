-- ══════════════════════════════════════════════════════════════
-- 031: Superadmin Role + Tester Approval Credentials
--
-- 1. Introduces 'superadmin' role to the users.role CHECK
-- 2. Updates is_admin() helper to recognise superadmin
-- 3. Patches inline RLS policies that bypass is_admin()
-- 4. Upgrades the platform owner to superadmin
-- 5. Adds credential columns to tester_signups for
--    auto-generated login accounts with 15-day expiry
-- ══════════════════════════════════════════════════════════════

-- ── 1. Expand users.role CHECK ──────────────────────────────
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('patient', 'doctor', 'admin', 'superadmin'));

-- ── 2. Update is_admin() to include superadmin ──────────────
-- This function is the central gate used by most RLS policies.
-- Updating it here automatically grants superadmin access everywhere.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
  );
$$;

-- ── 3. Add is_superadmin() helper for exclusive gates ───────
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'superadmin'
  );
$$;

-- ── 4. Fix inline RLS policies that hardcode role = 'admin' ─
-- These policies bypass is_admin() and check the role directly.

-- 4a. locum_invitations (from 020)
DROP POLICY IF EXISTS "Admins manage locum invitations" ON public.locum_invitations;
CREATE POLICY "Admins manage locum invitations"
  ON public.locum_invitations FOR ALL
  USING (public.is_admin());

-- 4b. locum_documents (from 020)
DROP POLICY IF EXISTS "Admins manage locum documents" ON public.locum_documents;
CREATE POLICY "Admins manage locum documents"
  ON public.locum_documents FOR ALL
  USING (public.is_admin());

-- 4c. audit_log (from 024) — keep as superadmin-only
DROP POLICY IF EXISTS "Admins can read audit log" ON public.audit_log;
CREATE POLICY "Superadmins can read audit log"
  ON public.audit_log FOR SELECT
  USING (public.is_superadmin());

-- 4d. ai_prompt_versions (from 014)
DROP POLICY IF EXISTS "admin_read_versions" ON public.ai_prompt_versions;
CREATE POLICY "admin_read_versions"
  ON public.ai_prompt_versions FOR SELECT TO authenticated
  USING (public.is_admin());

-- 4e. schedules admin policy (from 015)
DROP POLICY IF EXISTS "Admin manage schedules" ON public.schedules;
CREATE POLICY "Admin manage schedules"
  ON public.schedules FOR ALL TO authenticated
  USING (public.is_admin());

-- 4f. push_notifications admin check (from 20260325001)
-- Already uses is_admin() — no change needed.

-- ── 5. Upgrade platform owner to superadmin ─────────────────
UPDATE public.users
  SET role = 'superadmin'
  WHERE email = 'docpharaon@gmail.com';

-- ── 6. Tester credential columns ────────────────────────────
ALTER TABLE tester_signups
  ADD COLUMN IF NOT EXISTS assigned_role TEXT,
  ADD COLUMN IF NOT EXISTS auth_user_id UUID,
  ADD COLUMN IF NOT EXISTS login_email TEXT,
  ADD COLUMN IF NOT EXISTS temp_password TEXT,
  ADD COLUMN IF NOT EXISTS credentials_expire_at TIMESTAMPTZ;

-- Index for checking expired credentials
CREATE INDEX IF NOT EXISTS idx_tester_signups_expire
  ON tester_signups(credentials_expire_at)
  WHERE credentials_expire_at IS NOT NULL;
