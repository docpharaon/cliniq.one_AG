-- ============================================
-- cliniq.one Psychiatry Module
-- Migration 025: Psychiatry Tables & Schema
-- ============================================

-- ============================================
-- 1. Add 'psychiatry' to specialty constraints
-- ============================================

ALTER TABLE public.doctors DROP CONSTRAINT IF EXISTS doctors_specialty_check;
ALTER TABLE public.doctors ADD CONSTRAINT doctors_specialty_check
  CHECK (specialty IN ('dermatology', 'family_medicine', 'psychiatry'));

ALTER TABLE public.consultations DROP CONSTRAINT IF EXISTS consultations_specialty_check;
ALTER TABLE public.consultations ADD CONSTRAINT consultations_specialty_check
  CHECK (specialty IN ('dermatology', 'family_medicine', 'psychiatry'));

-- ============================================
-- 2. Psychiatric Intake
-- ============================================
CREATE TABLE public.psychiatric_intake (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.users(id),
  symptom_duration TEXT,
  past_psychiatric_history TEXT,
  substance_use JSONB,          -- { alcohol, cannabis, stimulants, opioids, tobacco, other }
  risk_flags JSONB,             -- { suicidality, self_harm, aggression, psychosis, homicidality }
  current_stressors TEXT,
  previous_treatments TEXT,
  hospitalization_history TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. Mental Status Exam (MSE)
-- ============================================
CREATE TABLE public.mental_status_exam (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id),
  appearance TEXT,
  behavior TEXT,
  speech TEXT,
  mood TEXT,
  affect TEXT,
  thought_process TEXT,
  thought_content TEXT,
  perceptions TEXT,
  cognition TEXT,
  insight TEXT,
  judgment TEXT,
  risk_level TEXT CHECK (risk_level IN ('low', 'moderate', 'high', 'imminent')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. Risk Assessment
-- ============================================
CREATE TABLE public.risk_assessment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.users(id),
  assessed_by UUID NOT NULL REFERENCES public.doctors(id),
  suicidal_ideation BOOLEAN DEFAULT FALSE,
  suicidal_plan BOOLEAN DEFAULT FALSE,
  suicidal_intent BOOLEAN DEFAULT FALSE,
  prior_attempts INTEGER DEFAULT 0,
  self_harm BOOLEAN DEFAULT FALSE,
  homicidal_ideation BOOLEAN DEFAULT FALSE,
  psychosis_active BOOLEAN DEFAULT FALSE,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'moderate', 'high', 'imminent')),
  protective_factors TEXT,
  safety_plan TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  disposition TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. Screening Scores (PHQ-9, GAD-7, etc.)
-- ============================================
CREATE TABLE public.screening_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultation_id UUID REFERENCES public.consultations(id),
  patient_id UUID NOT NULL REFERENCES public.users(id),
  instrument TEXT NOT NULL,     -- 'PHQ-9', 'GAD-7', 'MDQ', 'ASRS', 'PCL-5'
  responses JSONB NOT NULL,     -- [{ question_index, answer_value }]
  total_score INTEGER NOT NULL,
  severity TEXT,                -- 'minimal','mild','moderate','moderately_severe','severe'
  interpretation TEXT,
  administered_by TEXT DEFAULT 'patient',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. Psychiatric Diagnosis
-- ============================================
CREATE TABLE public.psychiatric_diagnosis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id),
  primary_diagnosis TEXT NOT NULL,
  icd10_code TEXT,
  secondary_diagnoses JSONB,    -- [{ diagnosis, icd10_code }]
  differential TEXT,
  clinical_reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. Medication Plan (psych-specific)
-- ============================================
CREATE TABLE public.medication_plan (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.users(id),
  doctor_id UUID NOT NULL REFERENCES public.doctors(id),
  medication_name TEXT NOT NULL,
  generic_name TEXT,
  dose TEXT NOT NULL,
  frequency TEXT NOT NULL,
  route TEXT DEFAULT 'oral',
  indication TEXT,
  start_date DATE,
  titration_schedule JSONB,         -- { week: dose_mg } steps
  side_effects_to_monitor TEXT[],
  interactions_noted TEXT[],
  refill_date DATE,
  adherence_status TEXT DEFAULT 'active',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'discontinued', 'completed')),
  discontinued_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. Therapy Plan
-- ============================================
CREATE TABLE public.therapy_plan (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.users(id),
  doctor_id UUID NOT NULL REFERENCES public.doctors(id),
  therapy_type TEXT NOT NULL,       -- CBT, DBT, psychodynamic, supportive, etc.
  goals TEXT,
  frequency TEXT,                   -- weekly, biweekly, monthly
  duration_weeks INTEGER,
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'discontinued')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. Follow-up Plan
-- ============================================
CREATE TABLE public.followup_plan (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.users(id),
  doctor_id UUID NOT NULL REFERENCES public.doctors(id),
  followup_type TEXT NOT NULL,      -- medication_check, therapy_review, crisis_followup
  interval_weeks INTEGER NOT NULL,
  scheduled_date DATE,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'missed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 10. Consent Records
-- ============================================
CREATE TABLE public.consent_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES public.users(id),
  consultation_id UUID REFERENCES public.consultations(id),
  consent_type TEXT NOT NULL,       -- 'telepsychiatry','disclosure','release_to_family','release_to_employer','treatment'
  granted BOOLEAN NOT NULL DEFAULT FALSE,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_psychiatric_intake_consultation ON public.psychiatric_intake(consultation_id);
CREATE INDEX idx_psychiatric_intake_patient ON public.psychiatric_intake(patient_id);
CREATE INDEX idx_mental_status_exam_consultation ON public.mental_status_exam(consultation_id);
CREATE INDEX idx_mental_status_exam_doctor ON public.mental_status_exam(doctor_id);
CREATE INDEX idx_risk_assessment_consultation ON public.risk_assessment(consultation_id);
CREATE INDEX idx_risk_assessment_patient ON public.risk_assessment(patient_id);
CREATE INDEX idx_screening_scores_patient ON public.screening_scores(patient_id);
CREATE INDEX idx_screening_scores_instrument ON public.screening_scores(instrument);
CREATE INDEX idx_screening_scores_consultation ON public.screening_scores(consultation_id);
CREATE INDEX idx_psychiatric_diagnosis_consultation ON public.psychiatric_diagnosis(consultation_id);
CREATE INDEX idx_medication_plan_patient ON public.medication_plan(patient_id);
CREATE INDEX idx_medication_plan_consultation ON public.medication_plan(consultation_id);
CREATE INDEX idx_therapy_plan_consultation ON public.therapy_plan(consultation_id);
CREATE INDEX idx_followup_plan_consultation ON public.followup_plan(consultation_id);
CREATE INDEX idx_followup_plan_patient ON public.followup_plan(patient_id);
CREATE INDEX idx_consent_records_patient ON public.consent_records(patient_id);

-- ============================================
-- Auto-update timestamps
-- ============================================
CREATE TRIGGER psychiatric_intake_updated_at
  BEFORE UPDATE ON public.psychiatric_intake
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER mental_status_exam_updated_at
  BEFORE UPDATE ON public.mental_status_exam
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER risk_assessment_updated_at
  BEFORE UPDATE ON public.risk_assessment
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER psychiatric_diagnosis_updated_at
  BEFORE UPDATE ON public.psychiatric_diagnosis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER medication_plan_updated_at
  BEFORE UPDATE ON public.medication_plan
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER therapy_plan_updated_at
  BEFORE UPDATE ON public.therapy_plan
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER followup_plan_updated_at
  BEFORE UPDATE ON public.followup_plan
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Row Level Security
-- ============================================

-- Psychiatric Intake
ALTER TABLE public.psychiatric_intake ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients see own psychiatric intake"
  ON public.psychiatric_intake FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Patients can create psychiatric intake"
  ON public.psychiatric_intake FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Doctors see psychiatric intake for assigned consultations"
  ON public.psychiatric_intake FOR SELECT
  USING (
    consultation_id IN (
      SELECT id FROM public.consultations
      WHERE doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
    )
  );

-- Mental Status Exam
ALTER TABLE public.mental_status_exam ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors manage own MSE records"
  ON public.mental_status_exam FOR ALL
  USING (
    doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
  );

CREATE POLICY "Patients see MSE for own consultations"
  ON public.mental_status_exam FOR SELECT
  USING (
    consultation_id IN (
      SELECT id FROM public.consultations WHERE patient_id = auth.uid()
    )
  );

-- Risk Assessment
ALTER TABLE public.risk_assessment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors manage own risk assessments"
  ON public.risk_assessment FOR ALL
  USING (
    assessed_by IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
  );

CREATE POLICY "Patients see own risk assessments"
  ON public.risk_assessment FOR SELECT
  USING (auth.uid() = patient_id);

-- Screening Scores
ALTER TABLE public.screening_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients see own screening scores"
  ON public.screening_scores FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Patients can insert screening scores"
  ON public.screening_scores FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Doctors see screening scores for assigned consultations"
  ON public.screening_scores FOR SELECT
  USING (
    consultation_id IN (
      SELECT id FROM public.consultations
      WHERE doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
    )
  );

-- Psychiatric Diagnosis
ALTER TABLE public.psychiatric_diagnosis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors manage own diagnoses"
  ON public.psychiatric_diagnosis FOR ALL
  USING (
    doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
  );

CREATE POLICY "Patients see own psychiatric diagnoses"
  ON public.psychiatric_diagnosis FOR SELECT
  USING (
    consultation_id IN (
      SELECT id FROM public.consultations WHERE patient_id = auth.uid()
    )
  );

-- Medication Plan
ALTER TABLE public.medication_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors manage own medication plans"
  ON public.medication_plan FOR ALL
  USING (
    doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
  );

CREATE POLICY "Patients see own medication plans"
  ON public.medication_plan FOR SELECT
  USING (auth.uid() = patient_id);

-- Therapy Plan
ALTER TABLE public.therapy_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors manage own therapy plans"
  ON public.therapy_plan FOR ALL
  USING (
    doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
  );

CREATE POLICY "Patients see own therapy plans"
  ON public.therapy_plan FOR SELECT
  USING (auth.uid() = patient_id);

-- Follow-up Plan
ALTER TABLE public.followup_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors manage own followup plans"
  ON public.followup_plan FOR ALL
  USING (
    doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
  );

CREATE POLICY "Patients see own followup plans"
  ON public.followup_plan FOR SELECT
  USING (auth.uid() = patient_id);

-- Consent Records
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients see own consent records"
  ON public.consent_records FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Patients can manage own consent records"
  ON public.consent_records FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients can update own consent records"
  ON public.consent_records FOR UPDATE
  USING (auth.uid() = patient_id);

CREATE POLICY "Doctors see consent records for assigned consultations"
  ON public.consent_records FOR SELECT
  USING (
    consultation_id IN (
      SELECT id FROM public.consultations
      WHERE doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
    )
  );

-- ============================================
-- Enable Realtime for risk-critical tables
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.risk_assessment;
ALTER PUBLICATION supabase_realtime ADD TABLE public.screening_scores;
