-- ============================================
-- cliniq.one Migration 033
-- Doctor Self-Registration & Application Pipeline
-- ============================================

-- ── 1. Doctor Applications ───────────────────
-- Central tracking table for the entire recruitment pipeline.
-- A doctor signs up via OAuth, fills out registration form,
-- uploads documents, and submits for admin review.

CREATE TABLE IF NOT EXISTS public.doctor_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Applicant identity (linked to auth user)
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  phone TEXT,

  -- Professional profile
  full_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  license_number TEXT NOT NULL,
  license_authority TEXT NOT NULL DEFAULT 'SCFHS',
  specialty TEXT NOT NULL CHECK (specialty IN ('dermatology', 'family_medicine', 'psychiatry', 'orthopedics')),
  sub_specialty TEXT,
  years_experience INTEGER,
  languages TEXT[] DEFAULT ARRAY['en'],
  hospital TEXT,
  city TEXT,
  bio TEXT,

  -- Doctor type (permanent full-time or locum temporary)
  doctor_type TEXT NOT NULL DEFAULT 'permanent' CHECK (doctor_type IN ('permanent', 'locum')),
  locum_invite_code TEXT,  -- The invite code the locum used to start registration

  -- Pipeline status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',                    -- Doctor is still filling out the form
    'submitted',                -- Doctor submitted, awaiting initial review
    'documents_review',         -- Admin is reviewing documents
    'interview_scheduled',      -- Admin scheduled an interview
    'interview_completed',      -- Interview done, awaiting final decision
    'approved',                 -- Accepted — doctor row created
    'rejected',                 -- Denied — with reason
    'resubmission_requested'    -- Admin wants changes before re-review
  )),

  -- Interview fields
  interview_scheduled_at TIMESTAMPTZ,
  interview_type TEXT CHECK (interview_type IN ('video_call', 'phone_call')),
  interview_meeting_url TEXT,     -- Google Meet / Zoom link
  interview_phone_number TEXT,    -- Phone number to call
  interview_notes TEXT,           -- Admin notes about interview
  interview_completed_at TIMESTAMPTZ,

  -- Admin review
  reviewed_by UUID REFERENCES public.users(id),
  review_notes TEXT,
  rejection_reason TEXT,
  resubmission_feedback TEXT,

  -- Disclaimer
  disclaimer_accepted_at TIMESTAMPTZ,

  -- Timestamps
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One application per user
  CONSTRAINT unique_application_per_user UNIQUE (user_id)
);

-- ── 2. Application Documents ─────────────────

CREATE TABLE IF NOT EXISTS public.doctor_application_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.doctor_applications(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL
    CHECK (document_type IN ('national_id', 'medical_license', 'cv', 'specialization_cert', 'disclaimer_signed', 'other')),
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type TEXT,
  verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES public.users(id),
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. Application Audit Trail ───────────────

CREATE TABLE IF NOT EXISTS public.doctor_application_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.doctor_applications(id) ON DELETE CASCADE,
  action TEXT NOT NULL,  -- submitted, documents_review, interview_scheduled, approved, rejected, etc.
  performed_by UUID REFERENCES public.users(id),
  old_status TEXT,
  new_status TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. Indexes ───────────────────────────────

CREATE INDEX IF NOT EXISTS idx_doctor_applications_user ON public.doctor_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_doctor_applications_status ON public.doctor_applications(status);
CREATE INDEX IF NOT EXISTS idx_doctor_applications_specialty ON public.doctor_applications(specialty);
CREATE INDEX IF NOT EXISTS idx_doctor_applications_submitted ON public.doctor_applications(submitted_at);
CREATE INDEX IF NOT EXISTS idx_doctor_app_docs_application ON public.doctor_application_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_doctor_app_audit_application ON public.doctor_application_audit(application_id);

-- ── 5. Row Level Security ────────────────────

ALTER TABLE public.doctor_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_application_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_application_audit ENABLE ROW LEVEL SECURITY;

-- Doctors can view and update their own application
CREATE POLICY "Doctors view own application"
  ON public.doctor_applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Doctors insert own application"
  ON public.doctor_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Doctors update own application"
  ON public.doctor_applications FOR UPDATE
  USING (auth.uid() = user_id AND status IN ('draft', 'resubmission_requested'));

-- Admins can do everything
CREATE POLICY "Admins manage all applications"
  ON public.doctor_applications FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Document policies
CREATE POLICY "Doctors manage own application documents"
  ON public.doctor_application_documents FOR ALL
  USING (
    application_id IN (SELECT id FROM public.doctor_applications WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins manage all application documents"
  ON public.doctor_application_documents FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Audit trail: doctors can view their own, admins can do all
CREATE POLICY "Doctors view own audit trail"
  ON public.doctor_application_audit FOR SELECT
  USING (
    application_id IN (SELECT id FROM public.doctor_applications WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins manage all audit"
  ON public.doctor_application_audit FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- ── 6. Auto-update timestamp trigger ─────────

CREATE TRIGGER doctor_applications_updated_at
  BEFORE UPDATE ON public.doctor_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 7. Storage bucket ────────────────────────
-- NOTE: Create via Supabase Dashboard or CLI:
--   supabase storage create doctor-applications --public=false
-- The bucket should be PRIVATE (not public).

-- ── 8. Enable Realtime for application status changes ──
ALTER PUBLICATION supabase_realtime ADD TABLE public.doctor_applications;
