-- ══════════════════════════════════════════════════════════════
-- COMBINED: 046 + 047 + 048
-- Apply in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ══════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════
-- 046_sequence_type_phase_model.sql
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.prompt_sequences
  ADD COLUMN IF NOT EXISTS sequence_type TEXT DEFAULT 'legacy';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'prompt_sequences_type_check'
  ) THEN
    ALTER TABLE public.prompt_sequences
      ADD CONSTRAINT prompt_sequences_type_check
      CHECK (sequence_type IN (
        'global_intake', 'global_wrapup', 'specialty',
        'refill', 'followup', 'legacy'
      ));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sequences_type
  ON public.prompt_sequences(sequence_type);

CREATE INDEX IF NOT EXISTS idx_sequences_type_specialty
  ON public.prompt_sequences(sequence_type, specialty)
  WHERE sequence_type = 'specialty';

ALTER TABLE public.prompt_sequence_nodes
  ADD COLUMN IF NOT EXISTS max_turns INTEGER;

COMMENT ON COLUMN public.prompt_sequence_nodes.max_turns IS
  'Per-node turn limit. NULL = use global default (SECTION_MAX_TURNS=8). Problem Input uses 3.';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'prompt_sequence_nodes_node_type_check'
  ) THEN
    ALTER TABLE public.prompt_sequence_nodes
      DROP CONSTRAINT prompt_sequence_nodes_node_type_check;
  END IF;

  ALTER TABLE public.prompt_sequence_nodes
    ADD CONSTRAINT prompt_sequence_nodes_node_type_check
    CHECK (node_type IN (
      'chat',
      'system_gate',
      'system_analysis',
      'system_integrity',
      'system_classify',
      'system_extract'
    ));
END $$;

UPDATE public.prompt_sequences
  SET sequence_type = 'specialty'
  WHERE specialty IS NOT NULL
    AND sequence_type = 'legacy';

UPDATE public.prompt_sequences
  SET sequence_type = 'legacy'
  WHERE is_default = true
    AND sequence_type = 'legacy';


-- ══════════════════════════════════════════════════════════════
-- 047_seed_global_sequences.sql
-- ══════════════════════════════════════════════════════════════

INSERT INTO public.ai_prompts (name, specialty, prompt_type, content, is_active, version)
VALUES (
    'Global — Problem Input',
    'general',
    'intake',
    'You are a medical intake AI assistant for cliniq.one — a telemedicine platform. Your task is to collect the patient''s main concern quickly and efficiently in 2-3 exchanges maximum.

SECTION RULES:

1. FIRST MESSAGE: Ask a single, warm, open-ended question:
   "What''s the main health concern that brought you in today?"

2. FOLLOW-UP (if needed): Based on the patient''s answer, ask ONE clarifying question to identify:
   - The primary symptom or complaint
   - Where it is located (if applicable)
   - How long it has been going on
   Example: "How long have you been experiencing this, and where exactly is it located?"

3. COMPLETION: After the patient describes their concern clearly enough to determine what type of problem it is, IMMEDIATELY emit [SECTION_COMPLETE]. Do NOT explore severity, history, triggers, or associated symptoms — that comes in a later section.

4. ACCEPTING SHORT ANSWERS: If the patient gives a clear one-line complaint (e.g., "I have a rash on my arm for a week"), that is sufficient. Acknowledge it and emit [SECTION_COMPLETE].

5. REFILL/FOLLOW-UP DETECTION: If the patient says anything like "I need a refill", "I''m following up on my last visit", or references a previous consultation, acknowledge it and emit [SECTION_COMPLETE]. Do NOT question further — the system will handle routing.

6. BREVITY: Keep responses to 1-2 sentences + your ONE question. No lengthy introductions.

7. MAXIMUM: You have at most 3 exchanges with the patient. After the 3rd patient message, you MUST emit [SECTION_COMPLETE] regardless.',
    true,
    1
)
ON CONFLICT DO NOTHING;

INSERT INTO public.ai_prompts (name, specialty, prompt_type, content, is_active, version)
VALUES (
    'Global — Specialty Entry',
    'general',
    'intake',
    'You are a medical intake AI assistant for cliniq.one. The patient has just described their concern and has been routed to a specialist department.

YOUR ONLY TASK:
1. In ONE sentence, briefly restate what the patient told you about their concern (use their own words, not medical jargon).
2. Reassure them: "I''ll now ask you some more detailed questions to help the specialist understand your situation better."
3. IMMEDIATELY emit [SECTION_COMPLETE] at the end of your message.

RULES:
- Do NOT ask any questions. This is a transition message only.
- Keep it to 2-3 sentences maximum.
- Be warm and reassuring.
- Do NOT mention the specialty name unless it is already obvious from context.',
    true,
    1
)
ON CONFLICT DO NOTHING;

INSERT INTO public.prompt_sequences (name, sequence_type, is_default, specialty)
VALUES ('Global Intake', 'global_intake', false, NULL)
ON CONFLICT DO NOTHING;

DO $$
DECLARE
    seq_id UUID;
    greeting_pid UUID;
    problem_pid UUID;
BEGIN
    SELECT id INTO seq_id
    FROM public.prompt_sequences
    WHERE name = 'Global Intake' AND sequence_type = 'global_intake'
    LIMIT 1;

    IF seq_id IS NULL THEN
        RAISE NOTICE 'Global Intake sequence not found, skipping node creation.';
        RETURN;
    END IF;

    SELECT id INTO greeting_pid
    FROM public.ai_prompts
    WHERE name ILIKE '%greeting%'
      AND specialty = 'general'
      AND is_active = true
    ORDER BY updated_at DESC
    LIMIT 1;

    SELECT id INTO problem_pid
    FROM public.ai_prompts
    WHERE name = 'Global — Problem Input'
      AND is_active = true
    LIMIT 1;

    INSERT INTO public.prompt_sequence_nodes
        (sequence_id, step_key, label, emoji, prompt_id, sort_order, node_type, max_turns)
    VALUES
        (seq_id, 'greeting', 'Welcome', '👋', greeting_pid, 10, 'chat', NULL),
        (seq_id, 'problem_input', 'What brings you in?', '💬', problem_pid, 20, 'chat', 3),
        (seq_id, 'pathway_classify', 'Analyzing Concern', '🔍', NULL, 30, 'system_classify', NULL)
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Global Intake sequence created with 3 nodes.';
END $$;

INSERT INTO public.prompt_sequences (name, sequence_type, is_default, specialty)
VALUES ('Global Wrapup', 'global_wrapup', false, NULL)
ON CONFLICT DO NOTHING;

DO $$
DECLARE
    seq_id UUID;
    summary_pid UUID;
    addendum_pid UUID;
BEGIN
    SELECT id INTO seq_id
    FROM public.prompt_sequences
    WHERE name = 'Global Wrapup' AND sequence_type = 'global_wrapup'
    LIMIT 1;

    IF seq_id IS NULL THEN
        RAISE NOTICE 'Global Wrapup sequence not found, skipping node creation.';
        RETURN;
    END IF;

    SELECT id INTO summary_pid
    FROM public.ai_prompts
    WHERE prompt_type = 'summary'
      AND is_active = true
    ORDER BY updated_at DESC
    LIMIT 1;

    SELECT id INTO addendum_pid
    FROM public.ai_prompts
    WHERE name ILIKE '%addendum%'
      AND is_active = true
    ORDER BY updated_at DESC
    LIMIT 1;

    INSERT INTO public.prompt_sequence_nodes
        (sequence_id, step_key, label, emoji, prompt_id, sort_order, node_type, max_turns)
    VALUES
        (seq_id, 'summary', 'Clinical Summary', '📋', summary_pid, 10, 'chat', NULL),
        (seq_id, 'patient_addendum', 'Anything to Add?', '📝', addendum_pid, 20, 'chat', 8),
        (seq_id, 'integrity_check', 'Quality Analysis', '🔒', NULL, 30, 'system_integrity', NULL)
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Global Wrapup sequence created with 3 nodes.';
END $$;

DO $$
DECLARE
    entry_pid UUID;
    rec RECORD;
BEGIN
    SELECT id INTO entry_pid
    FROM public.ai_prompts
    WHERE name = 'Global — Specialty Entry'
      AND is_active = true
    LIMIT 1;

    FOR rec IN
        SELECT id, specialty
        FROM public.prompt_sequences
        WHERE sequence_type = 'specialty'
          AND specialty IS NOT NULL
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM public.prompt_sequence_nodes
            WHERE sequence_id = rec.id AND step_key = 'specialty_entry'
        ) THEN
            UPDATE public.prompt_sequence_nodes
            SET sort_order = sort_order + 20
            WHERE sequence_id = rec.id;

            INSERT INTO public.prompt_sequence_nodes
                (sequence_id, step_key, label, emoji, prompt_id, sort_order, node_type)
            VALUES
                (rec.id, 'specialty_entry', 'Acknowledging Your Concern', '✅', entry_pid, 5, 'chat');

            INSERT INTO public.prompt_sequence_nodes
                (sequence_id, step_key, label, emoji, prompt_id, sort_order, node_type)
            VALUES
                (rec.id, 'specialty_gate', 'Checking Availability', '🛡️', NULL, 10, 'system_gate');

            RAISE NOTICE 'Added entry+gate to specialty sequence: %', rec.specialty;
        END IF;
    END LOOP;

    DELETE FROM public.prompt_sequence_nodes
    WHERE step_key IN ('greeting', 'pathway', 'complaint_analysis', 'summary', 'patient_addendum')
      AND sequence_id IN (
        SELECT id FROM public.prompt_sequences WHERE sequence_type = 'specialty'
      );

    RAISE NOTICE 'Removed duplicate global nodes from specialty sequences.';
END $$;


-- ══════════════════════════════════════════════════════════════
-- 048_seed_refill_followup_sequences.sql
-- ══════════════════════════════════════════════════════════════

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
-- DONE! All three migrations applied.
-- ══════════════════════════════════════════════════════════════
