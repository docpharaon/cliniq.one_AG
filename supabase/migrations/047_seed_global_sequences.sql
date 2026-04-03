-- ══════════════════════════════════════════════════════════════
-- 047_seed_global_sequences.sql
-- Seeds Global Intake + Global Wrapup sequences with prompts
-- Part of the Three-Phase Sequence Model (Option C)
-- ══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════
-- PROMPT: Problem Input (≤3 turns complaint collection)
-- ═══════════════════════════════════════════════════
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


-- ═══════════════════════════════════════════════════
-- PROMPT: Specialty Entry (acknowledgment + reassure)
-- ═══════════════════════════════════════════════════
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


-- ═══════════════════════════════════════════════════
-- CREATE GLOBAL INTAKE SEQUENCE
-- ═══════════════════════════════════════════════════
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

    -- Find the existing greeting prompt (reuse from default flow)
    SELECT id INTO greeting_pid
    FROM public.ai_prompts
    WHERE name ILIKE '%greeting%'
      AND specialty = 'general'
      AND is_active = true
    ORDER BY updated_at DESC
    LIMIT 1;

    -- Find the Problem Input prompt we just created
    SELECT id INTO problem_pid
    FROM public.ai_prompts
    WHERE name = 'Global — Problem Input'
      AND is_active = true
    LIMIT 1;

    -- Seed nodes
    INSERT INTO public.prompt_sequence_nodes
        (sequence_id, step_key, label, emoji, prompt_id, sort_order, node_type, max_turns)
    VALUES
        -- ① Greeting (chat, no turn limit — AI sends one message, patient responds)
        (seq_id, 'greeting', 'Welcome', '👋', greeting_pid, 10, 'chat', NULL),

        -- ② Problem Input (chat, ≤3 turns)
        (seq_id, 'problem_input', 'What brings you in?', '💬', problem_pid, 20, 'chat', 3),

        -- ③ Pathway Classification (silent system node)
        (seq_id, 'pathway_classify', 'Analyzing Concern', '🔍', NULL, 30, 'system_classify', NULL)
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Global Intake sequence created with 3 nodes.';
END $$;


-- ═══════════════════════════════════════════════════
-- CREATE GLOBAL WRAPUP SEQUENCE
-- ═══════════════════════════════════════════════════
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

    -- Find existing summary prompt
    SELECT id INTO summary_pid
    FROM public.ai_prompts
    WHERE prompt_type = 'summary'
      AND is_active = true
    ORDER BY updated_at DESC
    LIMIT 1;

    -- Find existing addendum prompt (if any)
    SELECT id INTO addendum_pid
    FROM public.ai_prompts
    WHERE name ILIKE '%addendum%'
      AND is_active = true
    ORDER BY updated_at DESC
    LIMIT 1;

    -- Seed nodes
    INSERT INTO public.prompt_sequence_nodes
        (sequence_id, step_key, label, emoji, prompt_id, sort_order, node_type, max_turns)
    VALUES
        -- ⑦ Summary (chat — clinical recap)
        (seq_id, 'summary', 'Clinical Summary', '📋', summary_pid, 10, 'chat', NULL),

        -- ⑧ Missing Info / Patient Addendum (chat)
        (seq_id, 'patient_addendum', 'Anything to Add?', '📝', addendum_pid, 20, 'chat', 8),

        -- ⑨ Confidence Analysis (silent system node)
        (seq_id, 'integrity_check', 'Quality Analysis', '🔒', NULL, 30, 'system_integrity', NULL)
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Global Wrapup sequence created with 3 nodes.';
END $$;


-- ═══════════════════════════════════════════════════
-- ADD SPECIALTY ENTRY + GATE TO EXISTING SPECIALTY SEQUENCES
-- ═══════════════════════════════════════════════════
-- Each specialty sequence needs entry (acknowledge) + gate (check availability)
-- as its first two nodes, before the clinical interview begins.

DO $$
DECLARE
    entry_pid UUID;
    rec RECORD;
BEGIN
    -- Find the specialty entry prompt
    SELECT id INTO entry_pid
    FROM public.ai_prompts
    WHERE name = 'Global — Specialty Entry'
      AND is_active = true
    LIMIT 1;

    -- For each specialty sequence, add entry + gate as first nodes
    FOR rec IN
        SELECT id, specialty
        FROM public.prompt_sequences
        WHERE sequence_type = 'specialty'
          AND specialty IS NOT NULL
    LOOP
        -- Check if entry node already exists
        IF NOT EXISTS (
            SELECT 1 FROM public.prompt_sequence_nodes
            WHERE sequence_id = rec.id AND step_key = 'specialty_entry'
        ) THEN
            -- Bump existing nodes' sort_order by 20 to make room
            UPDATE public.prompt_sequence_nodes
            SET sort_order = sort_order + 20
            WHERE sequence_id = rec.id;

            -- Insert specialty_entry at sort_order 5
            INSERT INTO public.prompt_sequence_nodes
                (sequence_id, step_key, label, emoji, prompt_id, sort_order, node_type)
            VALUES
                (rec.id, 'specialty_entry', 'Acknowledging Your Concern', '✅', entry_pid, 5, 'chat');

            -- Insert specialty_gate at sort_order 10
            INSERT INTO public.prompt_sequence_nodes
                (sequence_id, step_key, label, emoji, prompt_id, sort_order, node_type)
            VALUES
                (rec.id, 'specialty_gate', 'Checking Availability', '🛡️', NULL, 10, 'system_gate');

            RAISE NOTICE 'Added entry+gate to specialty sequence: %', rec.specialty;
        END IF;
    END LOOP;

    -- Also remove greeting/pathway/complaint_analysis/summary/addendum from
    -- specialty sequences (these are now in global_intake and global_wrapup)
    DELETE FROM public.prompt_sequence_nodes
    WHERE step_key IN ('greeting', 'pathway', 'complaint_analysis', 'summary', 'patient_addendum')
      AND sequence_id IN (
        SELECT id FROM public.prompt_sequences WHERE sequence_type = 'specialty'
      );

    RAISE NOTICE 'Removed duplicate global nodes from specialty sequences.';
END $$;


-- ══════════════════════════════════════════════════════════════
-- Done. Two new sequences created:
--   1. Global Intake (greeting → problem_input → pathway_classify)
--   2. Global Wrapup (summary → patient_addendum → integrity_check)
-- Specialty sequences updated with entry+gate nodes.
-- ══════════════════════════════════════════════════════════════
