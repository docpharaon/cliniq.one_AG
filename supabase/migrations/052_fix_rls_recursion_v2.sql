-- ══════════════════════════════════════════════════════════════
-- 052_fix_rls_recursion_v2.sql
-- Fix RLS recursion: consultations ↔ doctors circular dependency
--
-- ROOT CAUSE:
--   "Patients can view their assigned doctor" on `doctors` table
--   does a subquery on `consultations`, while `consultations` policies
--   do subqueries on `doctors` — creating infinite recursion.
--
-- FIX:
--   Replace the recursive policy with a SECURITY DEFINER function
--   that bypasses RLS when checking doctor assignments, breaking
--   the cycle.
-- ══════════════════════════════════════════════════════════════

-- ─── 1. Create helper function (SECURITY DEFINER = bypasses RLS) ──
CREATE OR REPLACE FUNCTION public.get_patient_doctor_ids(p_patient_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT DISTINCT doctor_id
  FROM public.consultations
  WHERE patient_id = p_patient_id
    AND doctor_id IS NOT NULL;
$$;

-- ─── 2. Drop the recursive policy ─────────────────────────────────
DROP POLICY IF EXISTS "Patients can view their assigned doctor"
  ON public.doctors;

-- ─── 3. Recreate using the safe helper ────────────────────────────
CREATE POLICY "Patients can view their assigned doctor"
  ON public.doctors FOR SELECT TO authenticated
  USING (
    id IN (SELECT public.get_patient_doctor_ids(auth.uid()))
  );

-- ══════════════════════════════════════════════════════════════
-- Done. The SECURITY DEFINER function reads consultations
-- without triggering RLS, breaking the recursion cycle.
-- ══════════════════════════════════════════════════════════════
