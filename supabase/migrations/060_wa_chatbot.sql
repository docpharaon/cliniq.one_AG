-- ══════════════════════════════════════════════════════════════
-- 060_wa_chatbot.sql
-- Native WhatsApp Chatbot — Meta Cloud API Integration
-- Chat sessions table for tracking patient conversations
-- that arrive directly via the WhatsApp app.
-- ══════════════════════════════════════════════════════════════

-- ─── 1. Chat Sessions Table ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wa_chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Patient identity (phone is the primary key for WhatsApp)
    phone TEXT NOT NULL,                       -- E.164 normalized (+966...)
    wa_phone_number_id TEXT,                   -- Meta's phone_number_id that received the message
    patient_name TEXT,
    language TEXT DEFAULT 'ar',

    -- Doctor context (resolved from first message doctor code)
    doctor_id UUID REFERENCES public.doctors(id),
    doctor_code TEXT,

    -- Intake flow state
    pathway TEXT CHECK (pathway IN ('followup', 'new_visit')),
    status TEXT DEFAULT 'awaiting_doctor_code'
        CHECK (status IN (
            'awaiting_doctor_code',  -- waiting for doctor code
            'active',                -- intake in progress
            'intake_complete',       -- AI intake finished, consultation created
            'consultation_created',  -- consultation record exists
            'expired',               -- 24h service window passed
            'abandoned'              -- patient stopped responding
        )),

    -- Sequence engine state
    current_step TEXT,                         -- current prompt_sequence_node step_key
    current_sequence_id UUID,                  -- FK → prompt_sequences
    turn_count INTEGER DEFAULT 0,              -- turns in current section

    -- Conversation data
    conversation_history JSONB DEFAULT '[]'::jsonb,   -- [{role, content, ts}]
    patient_context TEXT DEFAULT '',                    -- accumulated context string
    intake_report JSONB,                               -- final structured report

    -- Links to other entities
    consultation_id UUID,                      -- FK → consultations (created on completion)
    booking_id UUID,                           -- FK → wa_bookings (if patient books)

    -- Media
    media_urls JSONB DEFAULT '[]'::jsonb,

    -- Meta-specific data
    meta_data JSONB DEFAULT '{}'::jsonb,       -- wamid, profile name, etc.

    -- Timing
    last_message_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '24 hours'),
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- RLS
ALTER TABLE public.wa_chat_sessions ENABLE ROW LEVEL SECURITY;

-- Service-role full access (Edge Function uses service_role key)
DROP POLICY IF EXISTS "wa_chat_admin_all" ON public.wa_chat_sessions;
CREATE POLICY "wa_chat_admin_all"
    ON public.wa_chat_sessions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() AND u.role IN ('admin', 'superadmin')
        )
    );

-- Doctor can read their own patients' sessions
DROP POLICY IF EXISTS "wa_chat_doctor_read" ON public.wa_chat_sessions;
CREATE POLICY "wa_chat_doctor_read"
    ON public.wa_chat_sessions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.doctors d
            WHERE d.id = wa_chat_sessions.doctor_id AND d.user_id = auth.uid()
        )
    );

-- ─── Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_wa_chat_phone ON public.wa_chat_sessions(phone);
CREATE INDEX IF NOT EXISTS idx_wa_chat_status ON public.wa_chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_wa_chat_doctor ON public.wa_chat_sessions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_wa_chat_last_msg ON public.wa_chat_sessions(last_message_at);
CREATE INDEX IF NOT EXISTS idx_wa_chat_phone_active ON public.wa_chat_sessions(phone, status)
    WHERE status IN ('awaiting_doctor_code', 'active');


-- ─── 2. Session Expiry Function ─────────────────────────────
-- Can be called via pg_cron or manually to expire stale sessions
CREATE OR REPLACE FUNCTION public.expire_wa_chat_sessions()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.wa_chat_sessions
    SET status = 'expired'
    WHERE status IN ('awaiting_doctor_code', 'active')
      AND expires_at < now();

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;


-- ─── 3. Seed Meta WhatsApp credentials in platform_settings ─
-- (Values left empty — admin fills them in Settings page)
INSERT INTO public.platform_settings (key, value, category, description)
VALUES
    ('meta_wa_phone_number_id', '', 'meta_whatsapp', 'Meta WhatsApp Business phone number ID'),
    ('meta_wa_access_token', '', 'meta_whatsapp', 'Meta WhatsApp Cloud API permanent access token'),
    ('meta_wa_verify_token', '', 'meta_whatsapp', 'Webhook verification token (you choose any secret string)'),
    ('meta_wa_app_secret', '', 'meta_whatsapp', 'Meta App Secret for X-Hub-Signature-256 verification')
ON CONFLICT (key) DO NOTHING;


-- ══════════════════════════════════════════════════════════════
-- Done. Created:
--   • wa_chat_sessions table (with RLS + indexes)
--   • expire_wa_chat_sessions() cleanup function
--   • Meta WhatsApp credential placeholders in platform_settings
-- ══════════════════════════════════════════════════════════════
