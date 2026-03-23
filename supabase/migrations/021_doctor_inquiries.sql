-- ══════════════════════════════════════════════════════════════
-- 021_doctor_inquiries.sql — Doctor Additional Inquiry Pipeline
-- Allows doctors to request more info from patients mid-consultation
-- ══════════════════════════════════════════════════════════════

-- ─── Doctor Inquiries Table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.doctor_inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.doctors(id),
    question_text TEXT NOT NULL,
    ai_improved_text TEXT,
    response_summary JSONB,
    chat_history JSONB,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'answered', 'expired', 'cancelled')),
    max_turns INT NOT NULL DEFAULT 7,
    turn_count INT NOT NULL DEFAULT 0,
    deadline_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '48 hours'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    answered_at TIMESTAMPTZ
);

-- ─── Indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_inquiries_consultation ON public.doctor_inquiries(consultation_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON public.doctor_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_doctor ON public.doctor_inquiries(doctor_id);

-- ─── RLS ─────────────────────────────────────────────────────
ALTER TABLE public.doctor_inquiries ENABLE ROW LEVEL SECURITY;

-- Doctors can manage inquiries they created
CREATE POLICY "Doctors manage own inquiries"
    ON public.doctor_inquiries FOR ALL
    USING (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()));

-- Patients can read inquiries for their consultations
CREATE POLICY "Patients read own inquiries"
    ON public.doctor_inquiries FOR SELECT
    USING (consultation_id IN (
        SELECT id FROM public.consultations WHERE patient_id = auth.uid()
    ));

-- Patients can update inquiry status (to 'answered')
CREATE POLICY "Patients answer inquiries"
    ON public.doctor_inquiries FOR UPDATE
    USING (consultation_id IN (
        SELECT id FROM public.consultations WHERE patient_id = auth.uid()
    ))
    WITH CHECK (status IN ('answered'));

-- ─── Update consultation status check to include 'inquiry_sent' ──
ALTER TABLE public.consultations
    DROP CONSTRAINT IF EXISTS consultations_status_check;
ALTER TABLE public.consultations
    ADD CONSTRAINT consultations_status_check
    CHECK (status IN (
        'draft', 'intake_in_progress', 'pending_payment', 'submitted',
        'assigned', 'in_progress', 'inquiry_sent', 'report_ready',
        'completed', 'cancelled'
    ));

-- ─── V1 AI Prompt for Doctor Inquiry Chatbot ─────────────────
-- Insert the prompt that powers the inquiry chatbot
INSERT INTO public.ai_prompts (name, specialty, prompt_type, content, is_active, version)
VALUES (
    'Doctor Inquiry Follow-Up',
    'general',
    'doctor_inquiry',
    E'You are a professional, empathetic AI medical assistant helping gather additional information requested by a doctor.\n\n## Context\nThe treating doctor has reviewed the patient\'s initial consultation and needs more specific information before providing their medical assessment.\n\n## Doctor\'s Question\n{patientContext}\n\n## Your Role\n1. Present the doctor\'s question to the patient in a clear, warm, and non-alarming way\n2. Ask focused follow-up questions to gather thorough, clinically useful answers\n3. Keep questions simple and patient-friendly — avoid medical jargon\n4. If the patient gives a vague answer, gently probe for specifics (timing, severity, frequency, triggers)\n5. Acknowledge the patient\'s responses before asking the next question\n6. After gathering sufficient detail (or reaching the turn limit), provide a brief summary of what was discussed\n\n## Rules\n- Maximum 7 conversational turns\n- Stay strictly on-topic — only ask about what the doctor requested\n- Be reassuring: remind the patient this is routine and helps their doctor provide better care\n- Use the patient\'s preferred language\n- Do NOT diagnose, prescribe, or give medical advice\n- Do NOT ask about topics unrelated to the doctor\'s question\n- When you have enough information, output [SECTION_COMPLETE] at the end of your message\n\n## Language\nRespond in {language}. If Arabic, use Gulf dialect (خليجي).\n\n## Output Format\nConversational text only. End with [SECTION_COMPLETE] when sufficient information has been gathered.',
    true,
    1
)
ON CONFLICT DO NOTHING;
