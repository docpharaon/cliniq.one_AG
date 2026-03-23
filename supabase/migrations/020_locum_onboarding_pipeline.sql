-- ============================================
-- cliniq.one Migration 020
-- Locum Onboarding Pipeline
-- ============================================

-- ── 1. Locum Invitations ─────────────────────
-- Admin creates an invitation with a unique code + QR
-- Locum doctor uses the code/QR to begin onboarding

CREATE TABLE IF NOT EXISTS public.locum_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invited_by UUID NOT NULL REFERENCES public.users(id),
  invite_code TEXT UNIQUE NOT NULL,
  qr_payload TEXT NOT NULL,
  specialty TEXT NOT NULL DEFAULT 'dermatology',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'claimed', 'expired', 'revoked')),
  claimed_by UUID REFERENCES public.doctors(id),
  notes TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.locum_invitations ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admins manage locum invitations"
  ON public.locum_invitations FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Locum doctors can read their own claimed invitation
CREATE POLICY "Doctors see own claimed invitation"
  ON public.locum_invitations FOR SELECT
  USING (claimed_by IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_locum_invitations_code ON public.locum_invitations(invite_code);
CREATE INDEX IF NOT EXISTS idx_locum_invitations_status ON public.locum_invitations(status);

-- ── 2. Locum Documents ───────────────────────
-- Files uploaded during onboarding (ID, license, disclaimer)

CREATE TABLE IF NOT EXISTS public.locum_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL
    CHECK (document_type IN ('national_id', 'medical_license', 'cv', 'disclaimer_signed', 'other')),
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES public.users(id),
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.locum_documents ENABLE ROW LEVEL SECURITY;

-- Admin can see all documents
CREATE POLICY "Admins manage locum documents"
  ON public.locum_documents FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Doctors can see/upload their own documents
CREATE POLICY "Doctors manage own documents"
  ON public.locum_documents FOR ALL
  USING (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_locum_documents_doctor ON public.locum_documents(doctor_id);

-- ── 3. Add pricing & onboarding to doctors ──

ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS consultation_fee_tokens INT NOT NULL DEFAULT 3;

ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS onboarding_status TEXT NOT NULL DEFAULT 'none'
    CHECK (onboarding_status IN ('none', 'invited', 'documents_pending', 'review_pending', 'approved', 'rejected'));

ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS disclaimer_accepted_at TIMESTAMPTZ;

ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS recruitment_link TEXT;

-- ── 4. Seed admin pricing limits ─────────────
-- Uses existing app_settings table

INSERT INTO public.app_settings (key, value, description)
VALUES
  ('locum_fee_min_tokens', '2', 'Minimum consultation fee (tokens) a locum can charge')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.app_settings (key, value, description)
VALUES
  ('locum_fee_max_tokens', '10', 'Maximum consultation fee (tokens) a locum can charge')
ON CONFLICT (key) DO NOTHING;

-- ── 5. Storage bucket for locum documents ────
-- NOTE: Run this via Supabase Dashboard or CLI:
--   supabase storage create locum-documents --public=false
-- The bucket should be PRIVATE (not public).
