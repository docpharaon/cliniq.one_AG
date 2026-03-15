-- ============================================
-- cliniq.one MVP Schema
-- Migration 001: Core Tables
-- ============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- Users
-- ============================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  phone TEXT,
  nickname TEXT NOT NULL,
  year_of_birth INTEGER,
  gender TEXT CHECK (gender IN ('male', 'female', 'prefer_not_to_say')),
  country TEXT,
  city TEXT,
  language TEXT DEFAULT 'en' CHECK (language IN ('en', 'ar')),
  role TEXT NOT NULL DEFAULT 'patient' CHECK (role IN ('patient', 'doctor', 'admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked', 'pending')),
  tokens_balance INTEGER NOT NULL DEFAULT 0,
  avatar_url TEXT,
  insurance_provider TEXT,
  insurance_policy_number TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  legal_accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Doctors
-- ============================================
CREATE TABLE public.doctors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  license_number TEXT NOT NULL,
  license_authority TEXT NOT NULL,
  specialty TEXT NOT NULL CHECK (specialty IN ('dermatology', 'family_medicine')),
  sub_specialty TEXT,
  years_experience INTEGER,
  languages TEXT[] DEFAULT ARRAY['en'],
  hospital TEXT,
  city TEXT,
  bio TEXT,
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'probation', 'limited', 'suspended', 'inactive')),
  daily_limit INTEGER DEFAULT 8,
  rating_avg NUMERIC(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  tokens_earned INTEGER DEFAULT 0,
  is_accepting BOOLEAN DEFAULT TRUE,
  verified_at TIMESTAMPTZ,
  verified_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================
-- Consultations
-- ============================================
CREATE TABLE public.consultations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES public.users(id),
  doctor_id UUID REFERENCES public.doctors(id),
  specialty TEXT NOT NULL CHECK (specialty IN ('dermatology', 'family_medicine')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'intake_in_progress', 'pending_payment', 'submitted',
    'assigned', 'in_progress', 'report_ready', 'completed', 'cancelled'
  )),
  priority TEXT DEFAULT 'routine' CHECK (priority IN ('routine', 'high', 'urgent')),
  chief_complaint TEXT,
  ai_summary JSONB,
  ai_entities JSONB,
  token_cost INTEGER DEFAULT 3,
  payment_method TEXT,
  report JSONB,
  prescription JSONB,
  protocol_flags TEXT[] DEFAULT ARRAY[]::TEXT[],
  follow_up_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- ============================================
-- Messages
-- ============================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  sender_id UUID,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('patient', 'doctor', 'system')),
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'report', 'prescription', 'photo')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Token Transactions
-- ============================================
CREATE TABLE public.token_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id),
  type TEXT NOT NULL CHECK (type IN ('purchase', 'spend', 'earn', 'refund', 'bonus', 'admin_grant')),
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  consultation_id UUID REFERENCES public.consultations(id),
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AI Sessions
-- ============================================
CREATE TABLE public.ai_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]',
  answers JSONB NOT NULL DEFAULT '[]',
  entities_extracted JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Protocol Logs
-- ============================================
CREATE TABLE public.protocol_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultation_id UUID NOT NULL REFERENCES public.consultations(id),
  patient_id UUID NOT NULL REFERENCES public.users(id),
  protocol_code TEXT NOT NULL CHECK (protocol_code IN ('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  trigger_text TEXT NOT NULL,
  action_taken TEXT NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_consultations_patient ON public.consultations(patient_id);
CREATE INDEX idx_consultations_doctor ON public.consultations(doctor_id);
CREATE INDEX idx_consultations_status ON public.consultations(status);
CREATE INDEX idx_messages_consultation ON public.messages(consultation_id);
CREATE INDEX idx_messages_created ON public.messages(created_at);
CREATE INDEX idx_token_transactions_user ON public.token_transactions(user_id);
CREATE INDEX idx_ai_sessions_consultation ON public.ai_sessions(consultation_id);
CREATE INDEX idx_protocol_logs_consultation ON public.protocol_logs(consultation_id);

-- ============================================
-- Row Level Security
-- ============================================

-- Users: patients see own row, admins see all
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Allow insert during signup"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Consultations: patient sees own, doctor sees assigned
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients see own consultations"
  ON public.consultations FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Patients can create consultations"
  ON public.consultations FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Doctors see assigned consultations"
  ON public.consultations FOR SELECT
  USING (
    doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
  );

-- Messages: visible to consultation participants
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Consultation participants see messages"
  ON public.messages FOR SELECT
  USING (
    consultation_id IN (
      SELECT id FROM public.consultations
      WHERE patient_id = auth.uid()
         OR doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Participants can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    consultation_id IN (
      SELECT id FROM public.consultations
      WHERE patient_id = auth.uid()
         OR doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
    )
  );

-- Token transactions: user sees own
ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own transactions"
  ON public.token_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- AI sessions: patient sees own consultation sessions
ALTER TABLE public.ai_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patient sees own AI sessions"
  ON public.ai_sessions FOR SELECT
  USING (
    consultation_id IN (
      SELECT id FROM public.consultations WHERE patient_id = auth.uid()
    )
  );

-- Protocol logs (admin only in production, patient sees own for MVP)
ALTER TABLE public.protocol_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patient sees own protocol logs"
  ON public.protocol_logs FOR SELECT
  USING (auth.uid() = patient_id);

-- ============================================
-- Auto-update timestamp trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER doctors_updated_at
  BEFORE UPDATE ON public.doctors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Enable Realtime for messages
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.consultations;
