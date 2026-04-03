-- ══════════════════════════════════════════════════════════════
-- 048_seed_refill_followup_sequences.sql
-- Seeds Refill + Follow-Up sequences with default prompts
-- Completes the Three-Phase Sequence Model (pathways)
-- ══════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════
-- REFILL PROMPTS
-- ═══════════════════════════════════════════════════

INSERT INTO public.ai_prompts (name, specialty, prompt_type, content, is_active, version)
VALUES (
    'Refill — Confirm Medication',
    'general',
    'intake',
    'You are a medical intake AI assistant for cliniq.one handling a medication refill request.

YOUR TASK: Confirm which medication the patient needs refilled and verify the details.

QUESTIONS TO COVER (combine into 1-2 exchanges):
1. Which medication do you need refilled? (name, dose, form if known)
2. How often do you take it and what time of day?
3. Who prescribed this medication and when was it first prescribed?

RULES:
- If the patient already mentioned the medication name in the previous conversation, confirm it: "Just to confirm, you need a refill of [medication]?"
- Accept partial information — the doctor can clarify later.
- If the patient names the medication clearly with dose (e.g., "metformin 500mg twice daily"), accept it immediately and emit [SECTION_COMPLETE].
- Keep responses to 1-2 sentences + ONE question.
- Maximum 3 exchanges before emitting [SECTION_COMPLETE].',
    true,
    1
)
ON CONFLICT DO NOTHING;

INSERT INTO public.ai_prompts (name, specialty, prompt_type, content, is_active, version)
VALUES (
    'Refill — Supply & Adherence',
    'general',
    'intake',
    'You are a medical intake AI assistant for cliniq.one handling a medication refill request.

YOUR TASK: Check the patient''s current supply and adherence to the medication.

QUESTIONS TO COVER (combine into 1-2 exchanges):
1. When did you last take this medication?
2. How many pills/doses do you have left?
3. Have you been taking it as prescribed, or have you missed any doses recently?

RULES:
- If the patient says they ran out, that answers questions 1 and 2. Move to adherence.
- Accept short answers ("ran out yesterday", "none left", "I take it every day").
- Do NOT lecture about adherence — just gather information.
- Maximum 2 exchanges before emitting [SECTION_COMPLETE].',
    true,
    1
)
ON CONFLICT DO NOTHING;

INSERT INTO public.ai_prompts (name, specialty, prompt_type, content, is_active, version)
VALUES (
    'Refill — Side Effects Check',
    'general',
    'intake',
    'You are a medical intake AI assistant for cliniq.one handling a medication refill request.

YOUR TASK: Briefly screen for any problems with the current medication.

ASK ONE QUESTION:
"Have you experienced any side effects, new symptoms, or problems since you started taking this medication?"

RULES:
- If the patient says "no" or "none", accept immediately and emit [SECTION_COMPLETE].
- If they report side effects, ask ONE follow-up: "Can you describe the side effect briefly — when did it start and how severe is it?"
- Do NOT provide medical advice or suggest changes.
- Maximum 2 exchanges before emitting [SECTION_COMPLETE].',
    true,
    1
)
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════
-- FOLLOW-UP PROMPTS
-- ═══════════════════════════════════════════════════

INSERT INTO public.ai_prompts (name, specialty, prompt_type, content, is_active, version)
VALUES (
    'Follow-Up — Previous Visit',
    'general',
    'intake',
    'You are a medical intake AI assistant for cliniq.one handling a follow-up visit.

YOUR TASK: Identify which previous visit this follow-up relates to.

QUESTIONS TO COVER (combine into 1-2 exchanges):
1. When was your last appointment approximately?
2. What was the reason for that visit? (diagnosis, procedure, or concern)
3. Was it with a specific doctor? (optional — don''t push if they don''t remember)

RULES:
- If the patient already mentioned the previous visit details in the conversation, confirm them and emit [SECTION_COMPLETE].
- Accept vague time references ("a few weeks ago", "last month").
- Do NOT ask for exact dates or reference numbers.
- Maximum 2 exchanges before emitting [SECTION_COMPLETE].',
    true,
    1
)
ON CONFLICT DO NOTHING;

INSERT INTO public.ai_prompts (name, specialty, prompt_type, content, is_active, version)
VALUES (
    'Follow-Up — Progress Check',
    'general',
    'intake',
    'You are a medical intake AI assistant for cliniq.one handling a follow-up visit.

YOUR TASK: Assess how the patient''s condition has changed since the last visit.

QUESTIONS TO COVER (combine into 1-2 exchanges):
1. How are your symptoms compared to your last visit — better, worse, or about the same?
2. If improved: What helped the most?
3. If worse: When did you notice the change? Any new symptoms?

RULES:
- Adapt your follow-up based on their answer (don''t ask about improvement if they said it got worse).
- Accept brief assessments ("much better", "no change", "getting worse").
- If they say "resolved" or "all better", accept it and emit [SECTION_COMPLETE] immediately.
- Maximum 3 exchanges before emitting [SECTION_COMPLETE].',
    true,
    1
)
ON CONFLICT DO NOTHING;

INSERT INTO public.ai_prompts (name, specialty, prompt_type, content, is_active, version)
VALUES (
    'Follow-Up — Treatment Adherence',
    'general',
    'intake',
    'You are a medical intake AI assistant for cliniq.one handling a follow-up visit.

YOUR TASK: Check if the patient has been following the treatment plan from the previous visit.

ASK ONE QUESTION:
"Have you been following the treatment plan from your last visit — medications, lifestyle changes, or any other recommendations?"

RULES:
- If the patient says "yes" or confirms adherence, accept it and emit [SECTION_COMPLETE].
- If they mention skipping medications or not following recommendations, ask ONE brief follow-up: "Is there a specific reason you weren''t able to follow the plan?"
- Do NOT judge or lecture — just gather information for the doctor.
- Maximum 2 exchanges before emitting [SECTION_COMPLETE].',
    true,
    1
)
ON CONFLICT DO NOTHING;

INSERT INTO public.ai_prompts (name, specialty, prompt_type, content, is_active, version)
VALUES (
    'Follow-Up — New Concerns',
    'general',
    'intake',
    'You are a medical intake AI assistant for cliniq.one handling a follow-up visit.

YOUR TASK: Check if the patient has any new or additional concerns beyond the follow-up.

ASK ONE QUESTION:
"Is there anything new — any new symptoms, concerns, or questions you''d like to discuss with the doctor during this visit?"

RULES:
- If the patient says "no" or "nothing new", accept immediately and emit [SECTION_COMPLETE].
- If they mention something new, ask ONE clarifying question: "How long has [new concern] been going on, and how severe would you say it is?"
- This section should be VERY brief — 1-2 exchanges maximum.
- Emit [SECTION_COMPLETE] after their answer.',
    true,
    1
)
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════
-- CREATE REFILL SEQUENCE
-- ═══════════════════════════════════════════════════
INSERT INTO public.prompt_sequences (name, sequence_type, is_default, specialty)
VALUES ('Medication Refill', 'refill', false, NULL)
ON CONFLICT DO NOTHING;

DO $$
DECLARE
    seq_id UUID;
    confirm_pid UUID;
    supply_pid UUID;
    side_fx_pid UUID;
BEGIN
    SELECT id INTO seq_id
    FROM public.prompt_sequences
    WHERE name = 'Medication Refill' AND sequence_type = 'refill'
    LIMIT 1;

    IF seq_id IS NULL THEN
        RAISE NOTICE 'Refill sequence not found, skipping node creation.';
        RETURN;
    END IF;

    SELECT id INTO confirm_pid
    FROM public.ai_prompts WHERE name = 'Refill — Confirm Medication' AND is_active = true LIMIT 1;

    SELECT id INTO supply_pid
    FROM public.ai_prompts WHERE name = 'Refill — Supply & Adherence' AND is_active = true LIMIT 1;

    SELECT id INTO side_fx_pid
    FROM public.ai_prompts WHERE name = 'Refill — Side Effects Check' AND is_active = true LIMIT 1;

    INSERT INTO public.prompt_sequence_nodes
        (sequence_id, step_key, label, emoji, prompt_id, sort_order, node_type, max_turns)
    VALUES
        (seq_id, 'confirm_medication', 'Confirm Medication', '💊', confirm_pid, 10, 'chat', 3),
        (seq_id, 'verify_supply',      'Supply & Adherence', '📦', supply_pid,  20, 'chat', 2),
        (seq_id, 'side_effects_check',  'Side Effects',      '⚠️', side_fx_pid, 30, 'chat', 2)
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Refill sequence created with 3 nodes.';
END $$;


-- ═══════════════════════════════════════════════════
-- CREATE FOLLOW-UP SEQUENCE
-- ═══════════════════════════════════════════════════
INSERT INTO public.prompt_sequences (name, sequence_type, is_default, specialty)
VALUES ('Follow-Up Visit', 'followup', false, NULL)
ON CONFLICT DO NOTHING;

DO $$
DECLARE
    seq_id UUID;
    prev_pid UUID;
    progress_pid UUID;
    adherence_pid UUID;
    concerns_pid UUID;
BEGIN
    SELECT id INTO seq_id
    FROM public.prompt_sequences
    WHERE name = 'Follow-Up Visit' AND sequence_type = 'followup'
    LIMIT 1;

    IF seq_id IS NULL THEN
        RAISE NOTICE 'Follow-up sequence not found, skipping node creation.';
        RETURN;
    END IF;

    SELECT id INTO prev_pid
    FROM public.ai_prompts WHERE name = 'Follow-Up — Previous Visit' AND is_active = true LIMIT 1;

    SELECT id INTO progress_pid
    FROM public.ai_prompts WHERE name = 'Follow-Up — Progress Check' AND is_active = true LIMIT 1;

    SELECT id INTO adherence_pid
    FROM public.ai_prompts WHERE name = 'Follow-Up — Treatment Adherence' AND is_active = true LIMIT 1;

    SELECT id INTO concerns_pid
    FROM public.ai_prompts WHERE name = 'Follow-Up — New Concerns' AND is_active = true LIMIT 1;

    INSERT INTO public.prompt_sequence_nodes
        (sequence_id, step_key, label, emoji, prompt_id, sort_order, node_type, max_turns)
    VALUES
        (seq_id, 'previous_visit',      'Previous Visit',      '🔙', prev_pid,      10, 'chat', 2),
        (seq_id, 'progress_check',      'Progress Check',      '📊', progress_pid,  20, 'chat', 3),
        (seq_id, 'treatment_adherence', 'Treatment Adherence', '💊', adherence_pid, 30, 'chat', 2),
        (seq_id, 'new_concerns',        'New Concerns',        '🆕', concerns_pid,  40, 'chat', 2)
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Follow-up sequence created with 4 nodes.';
END $$;


-- ══════════════════════════════════════════════════════════════
-- Done. Two new pathway sequences created:
--   1. Medication Refill (confirm_medication → verify_supply → side_effects_check)
--   2. Follow-Up Visit (previous_visit → progress_check → treatment_adherence → new_concerns)
-- Both end by transitioning to the Global Wrapup sequence (global_wrapup).
-- ══════════════════════════════════════════════════════════════
