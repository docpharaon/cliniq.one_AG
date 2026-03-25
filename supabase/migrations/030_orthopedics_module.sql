-- ============================================
-- cliniq.one Orthopedics Module
-- Migration 030: Orthopedics Tables & Schema
-- Non-surgical / Conservative Orthopedics
-- ============================================

-- ============================================
-- 1. Add 'orthopedics' to specialty constraints
--    Uses DO block to safely drop any existing check constraints
-- ============================================

DO $$
BEGIN
  -- Drop existing specialty constraints on doctors
  ALTER TABLE public.doctors DROP CONSTRAINT IF EXISTS doctors_specialty_check;
  -- Re-add with orthopedics included
  ALTER TABLE public.doctors ADD CONSTRAINT doctors_specialty_check
    CHECK (specialty IN ('dermatology', 'family_medicine', 'psychiatry', 'orthopedics',
                          'internal_medicine', 'pediatrics', 'ent', 'ophthalmology', 'general'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not update doctors specialty constraint: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE public.consultations DROP CONSTRAINT IF EXISTS consultations_specialty_check;
  ALTER TABLE public.consultations ADD CONSTRAINT consultations_specialty_check
    CHECK (specialty IN ('dermatology', 'family_medicine', 'psychiatry', 'orthopedics',
                          'internal_medicine', 'pediatrics', 'ent', 'ophthalmology', 'general'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not update consultations specialty constraint: %', SQLERRM;
END $$;


-- ============================================
-- 2. Orthopedic Intake
-- ============================================
CREATE TABLE IF NOT EXISTS public.orthopedic_intake (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.users(id),

  -- Pain Profile (OPQRST)
  pain_location TEXT,                    -- knee, shoulder, spine/lumbar, spine/cervical, hip, ankle, wrist, elbow, etc.
  pain_laterality TEXT CHECK (pain_laterality IN ('left', 'right', 'bilateral', 'midline')),
  pain_onset TEXT,                       -- acute (<2 weeks), subacute (2-6 weeks), chronic (>6 weeks)
  pain_duration TEXT,                    -- free text: "3 weeks", "6 months"
  pain_character TEXT,                   -- sharp, dull, aching, burning, throbbing, stabbing, cramping
  pain_severity INTEGER CHECK (pain_severity BETWEEN 0 AND 10),  -- VAS 0-10
  pain_aggravating TEXT,                 -- what makes it worse
  pain_relieving TEXT,                   -- what makes it better
  pain_radiation TEXT,                   -- radiating to leg, arm, etc.
  pain_timing TEXT,                      -- constant, intermittent, night pain, morning stiffness

  -- Injury & Trauma
  mechanism_of_injury TEXT,              -- fall, sports, MVA, lifting, repetitive, insidious
  injury_date TEXT,                      -- when did it happen
  prior_injuries JSONB,                  -- [{ area, year, treatment }]
  prior_surgeries JSONB,                 -- [{ procedure, year, outcome }]
  prior_imaging TEXT,                    -- previous X-rays, MRIs, CT, bone scan

  -- Functional Status
  mobility_aids TEXT[],                  -- cane, walker, brace, wheelchair, crutches
  functional_limitations TEXT,           -- impact on ADLs (dressing, stairs, walking distance)
  occupation_impact TEXT,                -- work restrictions, ergonomic issues, disability
  exercise_activity TEXT,                -- sport/activity level, fitness

  -- Red Flags
  red_flags JSONB,                       -- { night_pain, unexplained_weight_loss, fever, neuro_deficit, bowel_bladder_dysfunction, history_of_cancer }

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================
-- 3. Musculoskeletal Examination
-- ============================================
CREATE TABLE IF NOT EXISTS public.musculoskeletal_exam (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id),

  body_region TEXT NOT NULL,             -- spine, shoulder, knee, hip, ankle, elbow, wrist, hand, foot
  laterality TEXT CHECK (laterality IN ('left', 'right', 'bilateral', 'midline', 'N/A')),

  inspection TEXT,                       -- swelling, deformity, erythema, muscle wasting, skin changes
  palpation TEXT,                        -- tenderness location, warmth, effusion, crepitus
  range_of_motion JSONB,                 -- { flexion: "120°", extension: "0°", abduction: "90°", ... }
  special_tests JSONB,                   -- [{ test_name: "Lachman", result: "positive", notes: "..." }]
  neurovascular_status TEXT,             -- sensation, reflexes, motor power (MRC scale), distal pulses
  gait_assessment TEXT,                  -- normal, antalgic, Trendelenburg, steppage, etc.

  clinical_impression TEXT,              -- doctor's assessment
  severity TEXT CHECK (severity IN ('mild', 'moderate', 'severe')),
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================
-- 4. Physical Therapy Plan
-- ============================================
CREATE TABLE IF NOT EXISTS public.physical_therapy_plan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.users(id),
  doctor_id UUID NOT NULL REFERENCES public.doctors(id),

  therapy_type TEXT NOT NULL,            -- PT, OT, hydrotherapy, manual_therapy, TENS, ultrasound
  body_region TEXT NOT NULL,             -- target area
  goals TEXT,                            -- functional goals (e.g. "full ROM", "pain-free walking")
  frequency TEXT,                        -- 2x/week, 3x/week, daily
  duration_weeks INTEGER,                -- course duration
  precautions TEXT,                      -- weight-bearing status, ROM limits, post-op restrictions
  home_exercise_program TEXT,            -- prescribed home exercises
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'discontinued')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_orthopedic_intake_consultation ON public.orthopedic_intake(consultation_id);
CREATE INDEX IF NOT EXISTS idx_orthopedic_intake_patient ON public.orthopedic_intake(patient_id);
CREATE INDEX IF NOT EXISTS idx_orthopedic_intake_pain_location ON public.orthopedic_intake(pain_location);
CREATE INDEX IF NOT EXISTS idx_musculoskeletal_exam_consultation ON public.musculoskeletal_exam(consultation_id);
CREATE INDEX IF NOT EXISTS idx_musculoskeletal_exam_doctor ON public.musculoskeletal_exam(doctor_id);
CREATE INDEX IF NOT EXISTS idx_musculoskeletal_exam_body_region ON public.musculoskeletal_exam(body_region);
CREATE INDEX IF NOT EXISTS idx_physical_therapy_plan_consultation ON public.physical_therapy_plan(consultation_id);
CREATE INDEX IF NOT EXISTS idx_physical_therapy_plan_patient ON public.physical_therapy_plan(patient_id);


-- ============================================
-- Auto-update timestamps
-- ============================================
CREATE TRIGGER orthopedic_intake_updated_at
  BEFORE UPDATE ON public.orthopedic_intake
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER musculoskeletal_exam_updated_at
  BEFORE UPDATE ON public.musculoskeletal_exam
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER physical_therapy_plan_updated_at
  BEFORE UPDATE ON public.physical_therapy_plan
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================
-- Row Level Security
-- ============================================

-- Orthopedic Intake
ALTER TABLE public.orthopedic_intake ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients see own orthopedic intake"
  ON public.orthopedic_intake FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Patients can create orthopedic intake"
  ON public.orthopedic_intake FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Doctors see orthopedic intake for assigned consultations"
  ON public.orthopedic_intake FOR SELECT
  USING (
    consultation_id IN (
      SELECT id FROM public.consultations
      WHERE doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
    )
  );

-- Musculoskeletal Exam
ALTER TABLE public.musculoskeletal_exam ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors manage own MSK exam records"
  ON public.musculoskeletal_exam FOR ALL
  USING (
    doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
  );

CREATE POLICY "Patients see MSK exam for own consultations"
  ON public.musculoskeletal_exam FOR SELECT
  USING (
    consultation_id IN (
      SELECT id FROM public.consultations WHERE patient_id = auth.uid()
    )
  );

-- Physical Therapy Plan
ALTER TABLE public.physical_therapy_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors manage own PT plans"
  ON public.physical_therapy_plan FOR ALL
  USING (
    doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
  );

CREATE POLICY "Patients see own PT plans"
  ON public.physical_therapy_plan FOR SELECT
  USING (auth.uid() = patient_id);


-- ============================================
-- Enable Realtime for key tables
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.orthopedic_intake;
ALTER PUBLICATION supabase_realtime ADD TABLE public.physical_therapy_plan;
