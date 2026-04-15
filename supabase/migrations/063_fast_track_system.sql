-- ══════════════════════════════════════════════════════════════
-- 063_fast_track_system.sql
-- Fast Track System: Skip-to-Summary + Doctor Follow-Up Requests
-- Allows patients to skip post-HPI sections and lets doctors
-- request specific missing information afterward.
-- ══════════════════════════════════════════════════════════════

-- ─── 1. Global Fast Track setting ────────────────────────────
INSERT INTO public.platform_settings (key, value, category, description)
VALUES (
    'fast_track_enabled',
    'true',
    'ai_intake',
    'Global toggle: offer patients option to skip post-HPI sections and jump to summary'
)
ON CONFLICT (key) DO NOTHING;


-- ─── 2. Specialty-level fast track mode ──────────────────────
-- NULL = inherit from global, 'allow_choice' / 'force_full' / 'force_fast'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'prompt_sequences'
          AND column_name = 'fast_track_mode'
    ) THEN
        ALTER TABLE public.prompt_sequences
            ADD COLUMN fast_track_mode TEXT;

        ALTER TABLE public.prompt_sequences
            ADD CONSTRAINT prompt_sequences_fast_track_check
            CHECK (fast_track_mode IS NULL OR fast_track_mode IN ('allow_choice', 'force_full', 'force_fast'));

        RAISE NOTICE 'Added fast_track_mode to prompt_sequences.';
    END IF;
END $$;


-- ─── 3. Doctor-level fast track preference ───────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'doctors'
          AND column_name = 'fast_track_mode'
    ) THEN
        ALTER TABLE public.doctors
            ADD COLUMN fast_track_mode TEXT;

        ALTER TABLE public.doctors
            ADD CONSTRAINT doctors_fast_track_check
            CHECK (fast_track_mode IS NULL OR fast_track_mode IN ('allow_choice', 'force_full', 'force_fast'));

        RAISE NOTICE 'Added fast_track_mode to doctors.';
    END IF;
END $$;


-- ─── 4. Session tracking columns ─────────────────────────────
DO $$
BEGIN
    -- Add skipped_sections array
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'wa_chat_sessions'
          AND column_name = 'skipped_sections'
    ) THEN
        ALTER TABLE public.wa_chat_sessions
            ADD COLUMN skipped_sections TEXT[] DEFAULT '{}';
        RAISE NOTICE 'Added skipped_sections to wa_chat_sessions.';
    END IF;

    -- Add fast_tracked flag
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'wa_chat_sessions'
          AND column_name = 'fast_tracked'
    ) THEN
        ALTER TABLE public.wa_chat_sessions
            ADD COLUMN fast_tracked BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added fast_tracked to wa_chat_sessions.';
    END IF;

    -- Extend status constraint to include followup statuses
    ALTER TABLE public.wa_chat_sessions
        DROP CONSTRAINT IF EXISTS wa_chat_sessions_status_check;

    ALTER TABLE public.wa_chat_sessions
        ADD CONSTRAINT wa_chat_sessions_status_check
        CHECK (status IN (
            'awaiting_doctor_code',
            'active',
            'intake_complete',
            'consultation_created',
            'expired',
            'abandoned',
            'followup_requested',
            'followup_active',
            'followup_complete'
        ));

    RAISE NOTICE 'Updated wa_chat_sessions status constraint.';
END $$;


-- ─── 5. Doctor follow-up requests table ──────────────────────
CREATE TABLE IF NOT EXISTS public.wa_doctor_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.wa_chat_sessions(id) ON DELETE CASCADE,
    consultation_id UUID,
    doctor_id UUID NOT NULL REFERENCES public.doctors(id),

    -- What the doctor requested
    requested_sections TEXT[] DEFAULT '{}',            -- ['medications', 'allergies', ...]
    custom_question TEXT,                              -- raw doctor input
    custom_question_polished TEXT,                     -- after AI improve-inquiry
    custom_max_turns INTEGER DEFAULT 4,

    -- Execution state
    status TEXT DEFAULT 'pending'
        CHECK (status IN ('pending', 'sent', 'in_progress', 'completed', 'expired', 'failed')),
    current_section_idx INTEGER DEFAULT 0,

    -- Results
    response_history JSONB DEFAULT '[]'::jsonb,

    -- Timing
    sent_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.wa_doctor_requests ENABLE ROW LEVEL SECURITY;

-- Admin full access
DROP POLICY IF EXISTS "wa_doc_req_admin_all" ON public.wa_doctor_requests;
CREATE POLICY "wa_doc_req_admin_all"
    ON public.wa_doctor_requests FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() AND u.role IN ('admin', 'superadmin')
        )
    );

-- Doctor can manage their own requests
DROP POLICY IF EXISTS "wa_doc_req_doctor_own" ON public.wa_doctor_requests;
CREATE POLICY "wa_doc_req_doctor_own"
    ON public.wa_doctor_requests FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.doctors d
            WHERE d.id = wa_doctor_requests.doctor_id AND d.user_id = auth.uid()
        )
    );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wa_doc_req_session ON public.wa_doctor_requests(session_id);
CREATE INDEX IF NOT EXISTS idx_wa_doc_req_doctor ON public.wa_doctor_requests(doctor_id);
CREATE INDEX IF NOT EXISTS idx_wa_doc_req_pending ON public.wa_doctor_requests(status)
    WHERE status IN ('pending', 'sent', 'in_progress');


-- ─── 6. WA follow-up request prompt ─────────────────────────
INSERT INTO public.ai_prompts (name, specialty, prompt_type, content, is_active, version)
VALUES (
    'WA — Doctor Follow-Up Question',
    'general',
    'intake',
    'You are a medical intake AI for cliniq.one. The reviewing doctor has a specific question or needs more information from the patient.

DOCTOR''S REQUEST: "{doctor_question}"

YOUR TASK:
1. Greet the patient briefly: "Your doctor has a follow-up question for you."
2. Ask the doctor''s question in clear, patient-friendly language.
3. Follow up naturally based on the patient''s response (max {max_turns} turns).
4. When you have a satisfactory answer, emit [SECTION_COMPLETE].

RULES:
- Keep messages to 1-2 sentences + ONE question
- Be warm and reassuring — the patient might be worried about why the doctor is asking more
- Do NOT diagnose or provide medical advice
- Match the patient''s language (Arabic or English)
- If the patient''s answer is clear on the first turn, acknowledge and emit [SECTION_COMPLETE]',
    true,
    1
)
ON CONFLICT DO NOTHING;


-- ══════════════════════════════════════════════════════════════
-- Done. Created:
--   • fast_track_enabled in platform_settings
--   • fast_track_mode column on prompt_sequences (specialty level)
--   • fast_track_mode column on doctors (doctor level)
--   • skipped_sections + fast_tracked columns on wa_chat_sessions
--   • Extended wa_chat_sessions status constraint (followup_*)
--   • wa_doctor_requests table with RLS + indexes
--   • WA — Doctor Follow-Up Question prompt
-- ══════════════════════════════════════════════════════════════
