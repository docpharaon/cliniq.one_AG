-- ============================================
-- cliniq.one Migration 019
-- Doctor Selection & Locum Account System
-- ============================================

-- ── 1. Add columns to doctors table ──────────

ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS doctor_type TEXT NOT NULL DEFAULT 'permanent'
    CHECK (doctor_type IN ('permanent', 'locum'));

ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS identifier_code TEXT UNIQUE;

ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS credential_expires_at TIMESTAMPTZ;

ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS sandbox_mode BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS qr_payload TEXT;

-- Backfill identifier_code for existing doctors (DR- + 4 random hex chars)
UPDATE public.doctors
  SET identifier_code = 'DR-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 4))
  WHERE identifier_code IS NULL;

-- Make identifier_code NOT NULL after backfill
ALTER TABLE public.doctors
  ALTER COLUMN identifier_code SET NOT NULL;

-- ── 2. Add columns to consultations table ────

ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS requested_doctor_id UUID REFERENCES public.doctors(id);

ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS doctor_selection_method TEXT DEFAULT 'auto'
    CHECK (doctor_selection_method IN ('code', 'qr', 'search', 'favorites', 'admin', 'auto'));

-- ── 3. Create patient_favorite_doctors table ─

CREATE TABLE IF NOT EXISTS public.patient_favorite_doctors (
  patient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  last_consulted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (patient_id, doctor_id)
);

-- RLS: patients see own favorites
ALTER TABLE public.patient_favorite_doctors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients see own favorite doctors"
  ON public.patient_favorite_doctors FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Patients can insert own favorite doctors"
  ON public.patient_favorite_doctors FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients can update own favorite doctors"
  ON public.patient_favorite_doctors FOR UPDATE
  USING (auth.uid() = patient_id);

CREATE POLICY "Patients can delete own favorite doctors"
  ON public.patient_favorite_doctors FOR DELETE
  USING (auth.uid() = patient_id);

-- ── 4. Indexes ───────────────────────────────

CREATE INDEX IF NOT EXISTS idx_doctors_identifier_code ON public.doctors(identifier_code);
CREATE INDEX IF NOT EXISTS idx_doctors_doctor_type ON public.doctors(doctor_type);
CREATE INDEX IF NOT EXISTS idx_consultations_requested_doctor ON public.consultations(requested_doctor_id);
CREATE INDEX IF NOT EXISTS idx_patient_favorites_patient ON public.patient_favorite_doctors(patient_id);

-- ── 5. RLS for doctors — allow patients to look up active doctors ──

CREATE POLICY "Patients can view active doctors for selection"
  ON public.doctors FOR SELECT
  USING (
    status = 'active'
    AND (
      -- Permanent accepting doctors visible to all patients
      (doctor_type = 'permanent' AND is_accepting = TRUE)
      -- Any doctor with a valid identifier_code is findable
      OR identifier_code IS NOT NULL
    )
  );
