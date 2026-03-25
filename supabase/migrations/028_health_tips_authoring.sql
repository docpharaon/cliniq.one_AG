-- ══════════════════════════════════════════════════════════════
-- 028_health_tips_authoring.sql — Doctor-authored health tips
-- Adds author/approval columns so doctors can submit tips
-- that are approved by admins before being shown to patients.
-- ══════════════════════════════════════════════════════════════

-- ─── New columns ────────────────────────────────────────────
ALTER TABLE public.health_tips
  ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS author_role TEXT DEFAULT 'admin'
    CHECK (author_role IN ('admin', 'doctor')),
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved'
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Mark all existing tips as admin-authored and pre-approved
UPDATE public.health_tips
  SET approval_status = 'approved', author_role = 'admin'
  WHERE approval_status IS NULL OR author_role IS NULL;

-- ─── Index for approval filtering ──────────────────────────
CREATE INDEX IF NOT EXISTS idx_health_tips_approval
  ON public.health_tips (approval_status, is_active);

-- ─── RLS: replace old read policy ──────────────────────────
DROP POLICY IF EXISTS "authenticated_read_health_tips" ON public.health_tips;

-- Patients/everyone: read only approved + active tips
CREATE POLICY "read_approved_health_tips"
  ON public.health_tips FOR SELECT TO authenticated
  USING (approval_status = 'approved' AND is_active = true);

-- Doctors can insert their own tips as pending
CREATE POLICY "doctors_insert_health_tips"
  ON public.health_tips FOR INSERT TO authenticated
  WITH CHECK (
    author_role = 'doctor'
    AND approval_status = 'pending'
    AND author_id = auth.uid()
  );

-- Doctors can view their own submitted tips (any status)
CREATE POLICY "doctors_read_own_tips"
  ON public.health_tips FOR SELECT TO authenticated
  USING (author_id = auth.uid());
