-- ══════════════════════════════════════════════════════════════
-- 055_wa_intake_sequences.sql
-- WhatsApp Lightweight Intake Flow
-- Creates WA-specific sequences for a lighter, mobile-optimized intake
-- Supports follow-up and new visit pathways
-- ══════════════════════════════════════════════════════════════

-- ─── 1. Extend sequence_type constraint ──────────────────────
DO $$
BEGIN
  ALTER TABLE public.prompt_sequences
    DROP CONSTRAINT IF EXISTS prompt_sequences_type_check;

  ALTER TABLE public.prompt_sequences
    ADD CONSTRAINT prompt_sequences_type_check
    CHECK (sequence_type IN (
      'global_intake', 'global_wrapup', 'specialty',
      'refill', 'followup', 'legacy',
      'wa_intake', 'wa_followup', 'wa_new_visit', 'wa_wrapup'
    ));

  RAISE NOTICE 'Extended sequence_type constraint for WA types.';
END $$;


-- ─── 2. Create wa_intake_sessions table ──────────────────────
CREATE TABLE IF NOT EXISTS public.wa_intake_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID REFERENCES public.doctors(id),
    doctor_code TEXT,
    patient_name TEXT,
    language TEXT DEFAULT 'ar',
    pathway TEXT CHECK (pathway IN ('followup', 'new_visit')),
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    report_text TEXT,
    media_urls JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- RLS: public insert (anon), read own sessions
ALTER TABLE public.wa_intake_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (patients don't log in)
DROP POLICY IF EXISTS "wa_sessions_anon_insert" ON public.wa_intake_sessions;
CREATE POLICY "wa_sessions_anon_insert"
  ON public.wa_intake_sessions FOR INSERT
  WITH CHECK (true);

-- Allow anonymous updates (status, report, media)
DROP POLICY IF EXISTS "wa_sessions_anon_update" ON public.wa_intake_sessions;
CREATE POLICY "wa_sessions_anon_update"
  ON public.wa_intake_sessions FOR UPDATE
  USING (true) WITH CHECK (true);

-- Allow anonymous select (for session resume)
DROP POLICY IF EXISTS "wa_sessions_anon_select" ON public.wa_intake_sessions;
CREATE POLICY "wa_sessions_anon_select"
  ON public.wa_intake_sessions FOR SELECT
  USING (true);

CREATE INDEX IF NOT EXISTS idx_wa_sessions_doctor ON public.wa_intake_sessions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_wa_sessions_status ON public.wa_intake_sessions(status);


-- ─── 3. Create Supabase Storage bucket for WA uploads ────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'wa-intake-uploads',
  'wa-intake-uploads',
  true,
  10485760,  -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Public read access for the bucket
DROP POLICY IF EXISTS "wa_uploads_public_read" ON storage.objects;
CREATE POLICY "wa_uploads_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'wa-intake-uploads');

-- Anonymous upload access
DROP POLICY IF EXISTS "wa_uploads_anon_insert" ON storage.objects;
CREATE POLICY "wa_uploads_anon_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'wa-intake-uploads');


-- ═══════════════════════════════════════════════════
-- 4. WA-SPECIFIC PROMPTS
-- ═══════════════════════════════════════════════════

-- ── WA Greeting ──────────────────────────────────
INSERT INTO public.ai_prompts (name, specialty, prompt_type, content, is_active, version)
VALUES (
    'WA — Greeting',
    'general',
    'intake',
    'You are a medical intake AI assistant for cliniq.one — a telemedicine platform. The patient has opened a WhatsApp intake link from their doctor.

YOUR TASK:
1. Greet the patient warmly in ONE short message (2-3 sentences max).
2. Let them know this is a quick health questionnaire that will generate a report for their doctor.
3. Mention it will only take a few minutes.
4. IMMEDIATELY emit [SECTION_COMPLETE] at the end.

RULES:
- Do NOT ask any questions in this greeting.  
- Keep it very brief — this is WhatsApp, not a formal consultation.
- Be warm, friendly, and reassuring.
- If patient context includes a doctor name, use it naturally.',
    true,
    1
)
ON CONFLICT DO NOTHING;

-- ── WA Visit Type ────────────────────────────────
INSERT INTO public.ai_prompts (name, specialty, prompt_type, content, is_active, version)
VALUES (
    'WA — Visit Type',
    'general',
    'intake',
    'You are a medical intake AI for cliniq.one. Your ONLY task is to determine if this is a follow-up visit or a new health concern.

Ask ONE simple question:
"Is this about a follow-up from a recent visit with your doctor, or do you have a new health concern?"

(In Arabic: "هل هذه متابعة لزيارة سابقة مع طبيبك، أم لديك مشكلة صحية جديدة؟")

CLASSIFICATION:
- If the patient mentions: follow-up, متابعة, same problem, checking back, treatment update, medication check, post-visit, results, تحسن, نفس المشكلة, الدواء → emit [ROUTE:followup]
- If the patient mentions: new problem, مشكلة جديدة, different issue, something new, first time, جديد → emit [ROUTE:new_visit]
- If unclear, ask ONE clarifying question, then classify.

After classification, emit [SECTION_COMPLETE] along with the appropriate [ROUTE:] tag.

RULES:
- Maximum 2 exchanges.
- Keep messages to 1-2 sentences.
- Accept any reasonable answer — do not overthink classification.',
    true,
    1
)
ON CONFLICT DO NOTHING;

-- ── WA Follow-Up Context ─────────────────────────
INSERT INTO public.ai_prompts (name, specialty, prompt_type, content, is_active, version)
VALUES (
    'WA — Follow-Up Context',
    'general',
    'intake',
    'You are a medical intake AI for cliniq.one conducting a follow-up intake. The patient is following up on a recent visit with their doctor.

YOUR TASK: Understand what the previous visit was about.

Ask: "Can you briefly tell me what your last visit was about — what was the main issue or diagnosis?"

(In Arabic: "ممكن تخبرني بإيجاز عن زيارتك الأخيرة — ما كانت المشكلة أو التشخيص الرئيسي؟")

RULES:
- Accept any answer, even brief ones like "high blood pressure" or "skin rash".
- If the patient gives a clear answer on the first turn, acknowledge it and emit [SECTION_COMPLETE].
- If vague, ask ONE follow-up: "Was there a specific diagnosis or treatment plan?"
- Maximum 2 turns.
- Keep your responses to 1-2 sentences + your question.',
    true,
    1
)
ON CONFLICT DO NOTHING;

-- ── WA Follow-Up Progress ────────────────────────
INSERT INTO public.ai_prompts (name, specialty, prompt_type, content, is_active, version)
VALUES (
    'WA — Follow-Up Progress',
    'general',
    'intake',
    'You are a medical intake AI for cliniq.one. The patient is following up on a previous visit. You now need to understand how their treatment/condition is progressing.

ASK ABOUT (combine into natural conversational questions):
1. Overall progress: Is the condition better, worse, or the same?
2. Treatment adherence: Are they following the prescribed treatment? Taking medications as directed?
3. Side effects: Any side effects or new symptoms from the treatment?

APPROACH:
- Start with: "How has your condition been since your last visit — is it getting better, worse, or about the same? And are you following the treatment/medications prescribed?"
- Based on their answer, ask ONE relevant follow-up
- If they report worsening or new symptoms, explore briefly (1-2 questions)
- If stable or improving, move on quickly

RULES:
- Maximum 3 turns
- Keep responses to 1-2 sentences + ONE question
- Do NOT repeat information the patient already shared',
    true,
    1
)
ON CONFLICT DO NOTHING;

-- ── WA Follow-Up Concerns ────────────────────────
INSERT INTO public.ai_prompts (name, specialty, prompt_type, content, is_active, version)
VALUES (
    'WA — Follow-Up Concerns',
    'general',
    'intake',
    'You are a medical intake AI for cliniq.one. The patient is wrapping up a follow-up intake. Check for any additional concerns.

Ask ONE question: "Is there anything else you want your doctor to know — any new symptoms, concerns, or questions for your next visit?"

(In Arabic: "هل هناك أي شيء آخر تريد أن يعرفه طبيبك — أي أعراض جديدة، مخاوف، أو أسئلة للزيارة القادمة؟")

RULES:
- If the patient says "no" / "nothing" / "لا" → accept immediately, emit [SECTION_COMPLETE]
- If they mention something, acknowledge it briefly and emit [SECTION_COMPLETE]
- Maximum 2 turns
- Do NOT ask follow-up questions on new concerns — the doctor will handle those',
    true,
    1
)
ON CONFLICT DO NOTHING;

-- ── WA HPI Deep Dive ─────────────────────────────
INSERT INTO public.ai_prompts (name, specialty, prompt_type, content, is_active, version)
VALUES (
    'WA — HPI Deep Dive',
    'general',
    'intake',
    'You are a medical intake AI for cliniq.one conducting a focused History of Present Illness (HPI) via WhatsApp. This is the CORE section — be thorough but efficient.

COVER THESE ELEMENTS (ask naturally, 1 question at a time):
1. Chief Complaint: What is the main problem? (may already be known from prior context)
2. Onset & Duration: When did it start? Was it sudden or gradual?
3. Location: Where exactly? Does it radiate/spread?
4. Severity: How bad is it (1-10)? Does it affect daily activities?
5. Timing & Pattern: Constant or comes and goes? Worse at certain times?
6. Aggravating/Alleviating: What makes it worse/better? Any home remedies tried?
7. Associated Symptoms: Any other symptoms along with the main one?

APPROACH:
- Start by confirming the chief complaint from the patient context, then ask about onset/duration.
- Combine related elements naturally: "When did this start, and was it sudden or gradual?"
- Adapt questions to the specialty context if provided (e.g., for dermatology ask about appearance/color changes).
- Skip elements the patient has already answered in earlier sections.

RULES:
- Maximum 5 turns
- ONE question per message (may combine 2 closely related elements)
- Keep responses to 1-2 sentences + question
- If the patient gives a comprehensive answer covering multiple elements, acknowledge and move to uncovered areas
- Do NOT summarize — just keep asking until you have enough, then emit [SECTION_COMPLETE]',
    true,
    1
)
ON CONFLICT DO NOTHING;

-- ── WA Quick Medical History ─────────────────────
INSERT INTO public.ai_prompts (name, specialty, prompt_type, content, is_active, version)
VALUES (
    'WA — Quick Medical History',
    'general',
    'intake',
    'You are a medical intake AI for cliniq.one doing a QUICK combined medical history check. This is a WhatsApp intake — keep it light.

ASK ONE COMBINED QUESTION covering all three areas:
"Do you have any chronic medical conditions (like diabetes, hypertension, asthma)? Are you currently taking any medications? Do you have any known allergies — especially to medications?"

(In Arabic: "هل لديك أي أمراض مزمنة (مثل السكري، الضغط، الربو)؟ هل تتناول أي أدوية حالياً؟ وهل لديك أي حساسية معروفة — خاصة من الأدوية؟")

RULES:
- If the patient answers all three in one response → emit [SECTION_COMPLETE]
- If they answer partially, ask ONE follow-up for the missing area(s)
- If "no" / "none" / "nothing" for all → accept and emit [SECTION_COMPLETE]
- Maximum 2 turns
- Do NOT explore conditions in depth — the doctor will do that
- Accept brief answers: "diabetes, metformin, no allergies" is perfect',
    true,
    1
)
ON CONFLICT DO NOTHING;

-- ── WA Quick Background ──────────────────────────
INSERT INTO public.ai_prompts (name, specialty, prompt_type, content, is_active, version)
VALUES (
    'WA — Quick Background',
    'general',
    'intake',
    'You are a medical intake AI for cliniq.one doing a QUICK background check. This covers family history and lifestyle in ONE question.

ASK ONE COMBINED QUESTION:
"Lastly — any relevant medical conditions that run in your family? And just briefly: do you smoke or use tobacco?"

(In Arabic: "أخيراً — هل هناك أي أمراض وراثية في العائلة؟ وبشكل سريع: هل تدخن أو تستخدم التبغ؟")

RULES:
- Accept ANY answer and emit [SECTION_COMPLETE]
- Do NOT ask follow-up questions — this is a screening question only
- Maximum 1 turn
- If "no" / "nothing" → accept and emit [SECTION_COMPLETE]
- Do NOT explore family conditions or lifestyle in detail',
    true,
    1
)
ON CONFLICT DO NOTHING;

-- ── WA Media Upload ──────────────────────────────
INSERT INTO public.ai_prompts (name, specialty, prompt_type, content, is_active, version)
VALUES (
    'WA — Media Upload',
    'general',
    'intake',
    'You are a medical intake AI for cliniq.one. The patient has completed their health interview.

ASK: "Would you like to share any photos of your condition or upload any documents (lab results, prescriptions, X-rays)? You can use the 📎 button below, or skip this step."

(In Arabic: "هل تود مشاركة أي صور لحالتك أو رفع أي مستندات (نتائج تحاليل، وصفات طبية، أشعة)؟ يمكنك استخدام زر 📎 أدناه، أو تخطي هذه الخطوة.")

RULES:
- This is an OPTIONAL step — if the patient says "no" / "skip" / "لا", emit [SECTION_COMPLETE] immediately
- If they say they will upload, acknowledge with "Great, go ahead and use the attachment button" and wait
- After they confirm upload or say they are done, emit [SECTION_COMPLETE]
- Maximum 1 turn of chat (the actual upload happens through the UI, not through chat)
- Be encouraging but never pushy',
    true,
    1
)
ON CONFLICT DO NOTHING;

-- ── WA Enhanced Addendum ─────────────────────────
INSERT INTO public.ai_prompts (name, specialty, prompt_type, content, is_active, version)
VALUES (
    'WA — Enhanced Addendum',
    'general',
    'intake',
    'You are a clinical documentation AI for cliniq.one. Your task is to present a final summary and catch any missing information.

STEP 1 — SUMMARY:
Present a brief, organized summary of what the patient shared:
- Chief Complaint
- Key History Points (HPI or Follow-up details)
- Medical History / Medications / Allergies (if provided)
- Family/Social History (if provided)
- Attachments (mention if photos/documents were uploaded)

STEP 2 — GAP DETECTION:
Check for important gaps and ask about them. Examples:
- If no medications were mentioned: "I noticed we didn''t discuss medications — are you currently taking any?"
- If no allergies mentioned: "Do you have any known allergies, especially to medications?"
- If the condition could have red-flag symptoms that weren''t explored: mention them briefly

STEP 3 — FINAL ADDITIONS:
Ask: "Is there anything else you think your doctor should know?"

After the patient responds (or says "no"), produce the FINAL clean summary incorporating any new information, then emit [ADDENDUM_DONE].

SUMMARY FORMAT:
Use clear headers and bullet points. Include the doctor''s name if known from context. Keep it professional but readable — this will be sent via WhatsApp.

RULES:
- Maximum 4 turns total
- The FIRST message should be the summary + gap questions + final ask (combine Steps 1-3)
- After patient responds, update summary and emit [ADDENDUM_DONE]
- Do NOT include treatment plans, recommendations, or diagnoses
- Do NOT use internal tags in the visible summary',
    true,
    1
)
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════
-- 5. CREATE WA SEQUENCES + NODES
-- ═══════════════════════════════════════════════════

-- ── WA Intake Sequence ───────────────────────────
INSERT INTO public.prompt_sequences (name, sequence_type, is_default, specialty)
VALUES ('WA Intake', 'wa_intake', false, NULL)
ON CONFLICT DO NOTHING;

-- ── WA Follow-Up Sequence ────────────────────────
INSERT INTO public.prompt_sequences (name, sequence_type, is_default, specialty)
VALUES ('WA Follow-Up', 'wa_followup', false, NULL)
ON CONFLICT DO NOTHING;

-- ── WA New Visit Sequence ────────────────────────
INSERT INTO public.prompt_sequences (name, sequence_type, is_default, specialty)
VALUES ('WA New Visit', 'wa_new_visit', false, NULL)
ON CONFLICT DO NOTHING;

-- ── WA Wrapup Sequence ──────────────────────────
INSERT INTO public.prompt_sequences (name, sequence_type, is_default, specialty)
VALUES ('WA Wrapup', 'wa_wrapup', false, NULL)
ON CONFLICT DO NOTHING;


-- ── SEED NODES ───────────────────────────────────
DO $$
DECLARE
    seq_intake_id UUID;
    seq_followup_id UUID;
    seq_new_visit_id UUID;
    seq_wrapup_id UUID;
    pid UUID;
BEGIN
    -- Get sequence IDs
    SELECT id INTO seq_intake_id FROM public.prompt_sequences WHERE name = 'WA Intake' LIMIT 1;
    SELECT id INTO seq_followup_id FROM public.prompt_sequences WHERE name = 'WA Follow-Up' LIMIT 1;
    SELECT id INTO seq_new_visit_id FROM public.prompt_sequences WHERE name = 'WA New Visit' LIMIT 1;
    SELECT id INTO seq_wrapup_id FROM public.prompt_sequences WHERE name = 'WA Wrapup' LIMIT 1;

    IF seq_intake_id IS NULL OR seq_followup_id IS NULL OR seq_new_visit_id IS NULL OR seq_wrapup_id IS NULL THEN
        RAISE NOTICE 'One or more WA sequences not found. Skipping node creation.';
        RETURN;
    END IF;

    -- ═══════════════════════════════════════════════
    -- WA INTAKE NODES (greeting + visit type)
    -- ═══════════════════════════════════════════════
    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'WA — Greeting' AND is_active = true LIMIT 1;
    INSERT INTO public.prompt_sequence_nodes
        (sequence_id, step_key, label, emoji, prompt_id, sort_order, node_type, max_turns)
    VALUES
        (seq_intake_id, 'wa_greeting', 'Welcome', '👋', pid, 10, 'chat', 1)
    ON CONFLICT DO NOTHING;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'WA — Visit Type' AND is_active = true LIMIT 1;
    INSERT INTO public.prompt_sequence_nodes
        (sequence_id, step_key, label, emoji, prompt_id, sort_order, node_type, max_turns)
    VALUES
        (seq_intake_id, 'wa_visit_type', 'Visit Type', '🔀', pid, 20, 'chat', 2)
    ON CONFLICT DO NOTHING;

    -- ═══════════════════════════════════════════════
    -- WA FOLLOW-UP NODES
    -- ═══════════════════════════════════════════════
    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'WA — Follow-Up Context' AND is_active = true LIMIT 1;
    INSERT INTO public.prompt_sequence_nodes
        (sequence_id, step_key, label, emoji, prompt_id, sort_order, node_type, max_turns)
    VALUES
        (seq_followup_id, 'followup_context', 'Previous Visit', '📋', pid, 10, 'chat', 2)
    ON CONFLICT DO NOTHING;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'WA — Follow-Up Progress' AND is_active = true LIMIT 1;
    INSERT INTO public.prompt_sequence_nodes
        (sequence_id, step_key, label, emoji, prompt_id, sort_order, node_type, max_turns)
    VALUES
        (seq_followup_id, 'followup_progress', 'Treatment Progress', '📈', pid, 20, 'chat', 3)
    ON CONFLICT DO NOTHING;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'WA — Follow-Up Concerns' AND is_active = true LIMIT 1;
    INSERT INTO public.prompt_sequence_nodes
        (sequence_id, step_key, label, emoji, prompt_id, sort_order, node_type, max_turns)
    VALUES
        (seq_followup_id, 'followup_concerns', 'New Concerns', '⚠️', pid, 30, 'chat', 2)
    ON CONFLICT DO NOTHING;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'WA — Media Upload' AND is_active = true LIMIT 1;
    INSERT INTO public.prompt_sequence_nodes
        (sequence_id, step_key, label, emoji, prompt_id, sort_order, node_type, max_turns)
    VALUES
        (seq_followup_id, 'media_upload', 'Photo / Documents', '📎', pid, 40, 'chat', 1)
    ON CONFLICT DO NOTHING;

    -- ═══════════════════════════════════════════════
    -- WA NEW VISIT NODES
    -- ═══════════════════════════════════════════════
    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'WA — HPI Deep Dive' AND is_active = true LIMIT 1;
    INSERT INTO public.prompt_sequence_nodes
        (sequence_id, step_key, label, emoji, prompt_id, sort_order, node_type, max_turns)
    VALUES
        (seq_new_visit_id, 'hpi', 'Health History', '🏥', pid, 10, 'chat', 5)
    ON CONFLICT DO NOTHING;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'WA — Quick Medical History' AND is_active = true LIMIT 1;
    INSERT INTO public.prompt_sequence_nodes
        (sequence_id, step_key, label, emoji, prompt_id, sort_order, node_type, max_turns)
    VALUES
        (seq_new_visit_id, 'quick_medical', 'Medical History', '💊', pid, 20, 'chat', 2)
    ON CONFLICT DO NOTHING;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'WA — Quick Background' AND is_active = true LIMIT 1;
    INSERT INTO public.prompt_sequence_nodes
        (sequence_id, step_key, label, emoji, prompt_id, sort_order, node_type, max_turns)
    VALUES
        (seq_new_visit_id, 'quick_background', 'Background', '👨‍👩‍👧‍👦', pid, 30, 'chat', 1)
    ON CONFLICT DO NOTHING;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'WA — Media Upload' AND is_active = true LIMIT 1;
    INSERT INTO public.prompt_sequence_nodes
        (sequence_id, step_key, label, emoji, prompt_id, sort_order, node_type, max_turns)
    VALUES
        (seq_new_visit_id, 'media_upload', 'Photo / Documents', '📎', pid, 40, 'chat', 1)
    ON CONFLICT DO NOTHING;

    -- ═══════════════════════════════════════════════
    -- WA WRAPUP NODES
    -- ═══════════════════════════════════════════════
    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'WA — Enhanced Addendum' AND is_active = true LIMIT 1;
    INSERT INTO public.prompt_sequence_nodes
        (sequence_id, step_key, label, emoji, prompt_id, sort_order, node_type, max_turns)
    VALUES
        (seq_wrapup_id, 'wa_addendum', 'Summary & Review', '📝', pid, 10, 'chat', 4)
    ON CONFLICT DO NOTHING;

    RAISE NOTICE '✅ WA sequences created: intake(%),followup(%),new_visit(%),wrapup(%)',
        seq_intake_id, seq_followup_id, seq_new_visit_id, seq_wrapup_id;
END $$;


-- ══════════════════════════════════════════════════════════════
-- Done. Created:
--   • wa_intake_sessions table
--   • wa-intake-uploads storage bucket
--   • 10 WA-specific prompts
--   • 4 WA sequences with nodes:
--       WA Intake:    wa_greeting → wa_visit_type
--       WA Follow-Up: followup_context → followup_progress → followup_concerns → media_upload
--       WA New Visit: hpi → quick_medical → quick_background → media_upload
--       WA Wrapup:    wa_addendum
-- ══════════════════════════════════════════════════════════════
