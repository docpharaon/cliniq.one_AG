-- ══════════════════════════════════════════════════════════════════
-- Migration 041: Temporary Specialty Disable & Fallback System
-- Allows admin to temporarily disable a specialty with silent/announced mode.
-- AI triage gate reroutes patients to FM or blocks with incident logging.
-- ══════════════════════════════════════════════════════════════════

-- ============================================
-- 1. Specialty Overrides (Disable Config)
-- ============================================
CREATE TABLE IF NOT EXISTS public.specialty_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Which specialty is being disabled
  specialty TEXT NOT NULL
    CHECK (specialty IN (
      'dermatology', 'psychiatry', 'orthopedics', 'pediatrics', 'diet'
      -- family_medicine intentionally excluded — it is the universal fallback and can NEVER be disabled
    )),

  -- Current state
  is_disabled BOOLEAN NOT NULL DEFAULT TRUE,

  -- Mode: silent (patient never knows) or announced (patient is told)
  mode TEXT NOT NULL CHECK (mode IN ('silent', 'announced')),

  -- Reason enum + free-text justification
  reason_code TEXT NOT NULL CHECK (reason_code IN (
    'doctor_unavailable',
    'scheduling_conflict',
    'system_maintenance',
    'quality_review',
    'regulatory',
    'staffing_shortage',
    'other'
  )),
  reason_text TEXT NOT NULL,

  -- Optional custom patient-facing message (announced mode)
  -- If NULL, the AI will generate a polite default
  patient_message TEXT,

  -- Audit: who disabled / restored
  disabled_by UUID NOT NULL REFERENCES public.users(id),
  disabled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  restored_by UUID REFERENCES public.users(id),
  restored_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only one active override per specialty at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_specialty_overrides_active
  ON public.specialty_overrides(specialty)
  WHERE is_disabled = TRUE;

-- Fast lookup of active overrides
CREATE INDEX IF NOT EXISTS idx_specialty_overrides_disabled
  ON public.specialty_overrides(is_disabled);

CREATE INDEX IF NOT EXISTS idx_specialty_overrides_specialty
  ON public.specialty_overrides(specialty);


-- ============================================
-- 2. Specialty Incidents (Blocked Patients)
-- Logged when AI decides complaint cannot be
-- rerouted to FM and patient is hard-blocked.
-- ============================================
CREATE TABLE IF NOT EXISTS public.specialty_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Which override triggered this
  override_id UUID NOT NULL REFERENCES public.specialty_overrides(id),

  -- Patient who was blocked
  patient_id UUID NOT NULL REFERENCES public.users(id),

  -- What they needed
  specialty TEXT NOT NULL,
  chief_complaint TEXT NOT NULL,

  -- AI reasoning for why FM cannot handle this
  ai_reasoning TEXT NOT NULL,
  ai_confidence NUMERIC(5,2),  -- 0-100

  -- Admin triage
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'acknowledged', 'resolved')),
  admin_notes TEXT,
  resolved_by UUID REFERENCES public.users(id),
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_specialty_incidents_override
  ON public.specialty_incidents(override_id);

CREATE INDEX IF NOT EXISTS idx_specialty_incidents_patient
  ON public.specialty_incidents(patient_id);

CREATE INDEX IF NOT EXISTS idx_specialty_incidents_status
  ON public.specialty_incidents(status);

CREATE INDEX IF NOT EXISTS idx_specialty_incidents_specialty
  ON public.specialty_incidents(specialty);


-- ============================================
-- 3. Row Level Security
-- ============================================

-- Specialty Overrides — admin only
ALTER TABLE public.specialty_overrides ENABLE ROW LEVEL SECURITY;

-- Admins can read all overrides
CREATE POLICY "Admins read specialty_overrides"
  ON public.specialty_overrides FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- Admins can insert overrides
CREATE POLICY "Admins insert specialty_overrides"
  ON public.specialty_overrides FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- Admins can update overrides (restore)
CREATE POLICY "Admins update specialty_overrides"
  ON public.specialty_overrides FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- Service role bypass (for edge function reads)
-- Note: supabase service_role key bypasses RLS by default


-- Specialty Incidents — admin only
ALTER TABLE public.specialty_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read specialty_incidents"
  ON public.specialty_incidents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admins update specialty_incidents"
  ON public.specialty_incidents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- Service role can insert incidents (from edge function)
-- Already bypassed by service_role key


-- ============================================
-- 4. Enable Realtime for admin alerts
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.specialty_incidents;
