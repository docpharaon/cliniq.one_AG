-- ============================================
-- Migration 023: Allow patients to view their assigned doctor
-- Fixes "Consultation not found" when doctor is inactive/not-accepting
-- ============================================

-- Patients need to read the doctor profile for their assigned consultations,
-- even if the doctor is inactive or not currently accepting new patients.
-- Without this, the JOIN in getConsultation() fails via RLS denial.

CREATE POLICY "Patients can view their assigned doctor"
  ON public.doctors FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT doctor_id FROM public.consultations
      WHERE patient_id = auth.uid() AND doctor_id IS NOT NULL
    )
  );
