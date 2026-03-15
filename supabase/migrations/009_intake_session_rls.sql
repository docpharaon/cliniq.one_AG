-- ============================================
-- Migration: Allow patients to manage intake sessions
-- Adds UPDATE and DELETE RLS policies for intake_in_progress
-- ============================================

-- Patients can update their own intake_in_progress consultations
-- (needed for auto-saving session state)
CREATE POLICY "Patients can update own intake sessions"
  ON public.consultations FOR UPDATE
  USING (
    auth.uid() = patient_id
    AND status = 'intake_in_progress'
  )
  WITH CHECK (
    auth.uid() = patient_id
    AND status = 'intake_in_progress'
  );

-- Patients can delete their own intake_in_progress consultations
-- (needed for cleanup when starting fresh or completing intake)
CREATE POLICY "Patients can delete own intake sessions"
  ON public.consultations FOR DELETE
  USING (
    auth.uid() = patient_id
    AND status = 'intake_in_progress'
  );
