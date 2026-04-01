-- ══════════════════════════════════════════════════════════════════
-- 043: Link specialty prompt_id on sequence nodes
--
-- Problem: SQL seed migrations (033-037, 20260322, 20260325006)
-- created both prompts and nodes, but NEVER linked them via prompt_id.
-- The Default Intake Flow works because the /api/seed-sequence route
-- links them in-code.  This migration fixes all specialty flows.
--
-- Also: removes duplicate Psychiatry Intake Flow (if any).
-- ══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────
-- STEP 0: Clean up duplicate Psychiatry Intake Flow
-- Keep only the first one (oldest created_at)
-- ─────────────────────────────────────────────────
DO $$
DECLARE
    keep_id UUID;
BEGIN
    SELECT id INTO keep_id
    FROM public.prompt_sequences
    WHERE name = 'Psychiatry Intake Flow'
    ORDER BY created_at ASC
    LIMIT 1;

    IF keep_id IS NOT NULL THEN
        DELETE FROM public.prompt_sequences
        WHERE name = 'Psychiatry Intake Flow'
          AND id != keep_id;
    END IF;
END $$;


-- ─────────────────────────────────────────────────
-- STEP 1: DERMATOLOGY  (specialty = 'dermatology')
-- Sequence: "Dermatology Intake Flow"
-- ─────────────────────────────────────────────────
DO $$
DECLARE
    seq_id UUID;
    pid    UUID;
BEGIN
    SELECT id INTO seq_id FROM public.prompt_sequences WHERE name = 'Dermatology Intake Flow' LIMIT 1;
    IF seq_id IS NULL THEN RAISE NOTICE 'Dermatology sequence not found, skipping'; RETURN; END IF;

    -- greeting → Dermatology Greeting
    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Dermatology Greeting' AND specialty = 'dermatology' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'greeting'; END IF;

    -- skin_complaint → Dermatology — Skin Complaint & HPI
    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Dermatology — Skin Complaint & HPI' AND specialty = 'dermatology' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'skin_complaint'; END IF;

    -- skin_triggers → Dermatology — Triggers & Exposures
    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Dermatology — Triggers & Exposures' AND specialty = 'dermatology' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'skin_triggers'; END IF;

    -- skin_history → Dermatology — Past Dermatological History
    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Dermatology — Past Dermatological History' AND specialty = 'dermatology' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'skin_history'; END IF;

    -- past_medical_history → Dermatology — Past Medical History
    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Dermatology — Past Medical History' AND specialty = 'dermatology' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'past_medical_history'; END IF;

    -- medications → Dermatology — Current Medications
    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Dermatology — Current Medications' AND specialty = 'dermatology' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'medications'; END IF;

    -- allergies → Dermatology — Allergies (Enhanced)
    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Dermatology — Allergies (Enhanced)' AND specialty = 'dermatology' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'allergies'; END IF;

    -- family_history → Dermatology — Family Skin & Autoimmune History
    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Dermatology — Family Skin & Autoimmune History' AND specialty = 'dermatology' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'family_history'; END IF;

    -- social_history → Dermatology — Social & Lifestyle History
    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Dermatology — Social & Lifestyle History' AND specialty = 'dermatology' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'social_history'; END IF;

    -- review_of_systems → Dermatology — Review of Systems
    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Dermatology — Review of Systems' AND specialty = 'dermatology' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'review_of_systems'; END IF;

    -- external_reports → Dermatology — External Reports Upload
    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Dermatology — External Reports Upload' AND specialty = 'dermatology' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'external_reports'; END IF;

    -- summary → Dermatology Summary — Clinical Documentation
    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Dermatology Summary — Clinical Documentation' AND specialty = 'dermatology' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'summary'; END IF;

    RAISE NOTICE 'Dermatology: linked prompts to nodes';
END $$;


-- ─────────────────────────────────────────────────
-- STEP 2: FAMILY MEDICINE  (specialty = 'family_medicine')
-- Sequence: "Family Medicine Intake Flow"
-- ─────────────────────────────────────────────────
DO $$
DECLARE
    seq_id UUID;
    pid    UUID;
BEGIN
    SELECT id INTO seq_id FROM public.prompt_sequences WHERE name = 'Family Medicine Intake Flow' LIMIT 1;
    IF seq_id IS NULL THEN RAISE NOTICE 'Family Medicine sequence not found, skipping'; RETURN; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Family Medicine Greeting' AND specialty = 'family_medicine' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'greeting'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Family Medicine — HPI & Chief Complaint' AND specialty = 'family_medicine' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'hpi'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Family Medicine — Past Medical History' AND specialty = 'family_medicine' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'past_medical_history'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Family Medicine — Current Medications' AND specialty = 'family_medicine' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'medications'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Family Medicine — Allergies' AND specialty = 'family_medicine' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'allergies'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Family Medicine — Family History' AND specialty = 'family_medicine' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'family_history'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Family Medicine — Social & Lifestyle History' AND specialty = 'family_medicine' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'social_history'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Family Medicine — Review of Systems' AND specialty = 'family_medicine' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'review_of_systems'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Family Medicine — Preventive Health Screening' AND specialty = 'family_medicine' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'screening_preventive'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Family Medicine — External Reports Upload' AND specialty = 'family_medicine' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'external_reports'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Family Medicine Summary — Clinical Documentation' AND specialty = 'family_medicine' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'summary'; END IF;

    RAISE NOTICE 'Family Medicine: linked prompts to nodes';
END $$;


-- ─────────────────────────────────────────────────
-- STEP 3: PEDIATRICS  (specialty = 'pediatrics')
-- Sequence: "Pediatrics Intake Flow"
-- ─────────────────────────────────────────────────
DO $$
DECLARE
    seq_id UUID;
    pid    UUID;
BEGIN
    SELECT id INTO seq_id FROM public.prompt_sequences WHERE name = 'Pediatrics Intake Flow' LIMIT 1;
    IF seq_id IS NULL THEN RAISE NOTICE 'Pediatrics sequence not found, skipping'; RETURN; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Pediatrics Greeting' AND specialty = 'pediatrics' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'greeting'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Pediatrics — Child Demographics' AND specialty = 'pediatrics' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'child_demographics'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Pediatrics — Presenting Concern & HPI' AND specialty = 'pediatrics' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'hpi'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Pediatrics — Birth & Neonatal History' AND specialty = 'pediatrics' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'birth_neonatal'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Pediatrics — Growth & Developmental History' AND specialty = 'pediatrics' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'growth_development'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Pediatrics — Vaccination History' AND specialty = 'pediatrics' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'vaccination'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Pediatrics — Past Medical & Surgical History' AND specialty = 'pediatrics' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'past_medical_history'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Pediatrics — Current Medications' AND specialty = 'pediatrics' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'medications'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Pediatrics — Allergies' AND specialty = 'pediatrics' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'allergies'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Pediatrics — Family History' AND specialty = 'pediatrics' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'family_history'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Pediatrics — Feeding & Nutrition' AND specialty = 'pediatrics' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'feeding_nutrition'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Pediatrics — Review of Systems' AND specialty = 'pediatrics' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'review_of_systems'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Pediatrics — External Reports Upload' AND specialty = 'pediatrics' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'external_reports'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Pediatrics Summary — Clinical Documentation' AND specialty = 'pediatrics' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'summary'; END IF;

    RAISE NOTICE 'Pediatrics: linked prompts to nodes';
END $$;


-- ─────────────────────────────────────────────────
-- STEP 4: PSYCHIATRY  (specialty = 'psychiatry')
-- Sequence: "Psychiatry Intake Flow"
-- ─────────────────────────────────────────────────
DO $$
DECLARE
    seq_id UUID;
    pid    UUID;
BEGIN
    SELECT id INTO seq_id FROM public.prompt_sequences WHERE name = 'Psychiatry Intake Flow' LIMIT 1;
    IF seq_id IS NULL THEN RAISE NOTICE 'Psychiatry sequence not found, skipping'; RETURN; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Psychiatry Greeting' AND specialty = 'psychiatry' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'greeting'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Psychiatry — Presenting Concern & HPI' AND specialty = 'psychiatry' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'hpi'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Psychiatry — Past Psychiatric History' AND specialty = 'psychiatry' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'past_psych_history'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Psychiatry — Current Medications' AND specialty = 'psychiatry' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'medications'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Psychiatry — Substance Use History' AND specialty = 'psychiatry' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'substance_use'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Psychiatry — Family Psychiatric History' AND specialty = 'psychiatry' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'family_history'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Psychiatry — Psychosocial History' AND specialty = 'psychiatry' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'social_history'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Psychiatry — Safety Screening' AND specialty = 'psychiatry' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'safety_screening'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Psychiatry — Review of Systems' AND specialty = 'psychiatry' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'review_of_systems'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Psychiatry Summary — Clinical Documentation' AND specialty = 'psychiatry' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'summary'; END IF;

    RAISE NOTICE 'Psychiatry: linked prompts to nodes';
END $$;


-- ─────────────────────────────────────────────────
-- STEP 5: ORTHOPEDICS  (specialty = 'orthopedics')
-- Sequence: "Orthopedics Intake Flow"
-- ─────────────────────────────────────────────────
DO $$
DECLARE
    seq_id UUID;
    pid    UUID;
BEGIN
    SELECT id INTO seq_id FROM public.prompt_sequences WHERE name = 'Orthopedics Intake Flow' LIMIT 1;
    IF seq_id IS NULL THEN RAISE NOTICE 'Orthopedics sequence not found, skipping'; RETURN; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Orthopedics Greeting' AND specialty = 'orthopedics' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'greeting'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Orthopedics — MSK Pain Assessment' AND specialty = 'orthopedics' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'msk_pain_assessment'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Orthopedics — Injury & Trauma History' AND specialty = 'orthopedics' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'injury_trauma_history'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Orthopedics — Past MSK & Medical History' AND specialty = 'orthopedics' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'past_msk_history'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Orthopedics — Current Medications' AND specialty = 'orthopedics' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'medications'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Orthopedics — Functional Status & Activity' AND specialty = 'orthopedics' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'functional_status'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Orthopedics — Family MSK History' AND specialty = 'orthopedics' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'family_history'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Orthopedics — Review of Systems' AND specialty = 'orthopedics' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'review_of_systems'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Orthopedics Summary — Clinical Documentation' AND specialty = 'orthopedics' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'summary'; END IF;

    RAISE NOTICE 'Orthopedics: linked prompts to nodes';
END $$;


-- ─────────────────────────────────────────────────
-- STEP 6: DIET & NUTRITION  (specialty = 'diet')
-- Sequence: "Diet & Nutrition Intake Flow"
-- ─────────────────────────────────────────────────
DO $$
DECLARE
    seq_id UUID;
    pid    UUID;
BEGIN
    SELECT id INTO seq_id FROM public.prompt_sequences WHERE name = 'Diet & Nutrition Intake Flow' LIMIT 1;
    IF seq_id IS NULL THEN RAISE NOTICE 'Diet sequence not found, skipping'; RETURN; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Diet & Nutrition Greeting' AND specialty = 'diet' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'greeting'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Diet — Nutritional Goals & HPI' AND specialty = 'diet' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'nutrition_goals'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Diet — Current Dietary Assessment' AND specialty = 'diet' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'dietary_assessment'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Diet — Dietary Restrictions & Preferences' AND specialty = 'diet' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'dietary_restrictions'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Diet — Body Composition & Anthropometrics' AND specialty = 'diet' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'body_composition'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Diet — Medical & Metabolic History' AND specialty = 'diet' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'medical_nutrition'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Diet — Medications & Supplements' AND specialty = 'diet' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'medications_supplements'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Diet — Lifestyle & Physical Activity' AND specialty = 'diet' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'lifestyle_activity'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Diet — Food Allergies & Intolerances' AND specialty = 'diet' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'allergies_intolerances'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Diet — External Reports Upload' AND specialty = 'diet' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'external_reports'; END IF;

    SELECT id INTO pid FROM public.ai_prompts WHERE name = 'Diet & Nutrition Summary — Clinical Documentation' AND specialty = 'diet' LIMIT 1;
    IF pid IS NOT NULL THEN UPDATE public.prompt_sequence_nodes SET prompt_id = pid WHERE sequence_id = seq_id AND step_key = 'summary'; END IF;

    RAISE NOTICE 'Diet & Nutrition: linked prompts to nodes';
END $$;


-- ─────────────────────────────────────────────────
-- STEP 7: Fix the status column constraint if needed
-- The seed-sequence API soft-deletes with status='deleted'
-- but the CHECK constraint only allows draft/active/archived.
-- Drop and re-add the constraint to include 'deleted'.
-- ─────────────────────────────────────────────────
DO $$
BEGIN
    -- Drop old constraint (may have different names depending on migration order)
    ALTER TABLE public.ai_prompts DROP CONSTRAINT IF EXISTS ai_prompts_status_check;
    ALTER TABLE public.ai_prompts DROP CONSTRAINT IF EXISTS ai_prompts_check;

    -- Re-add with 'deleted' included
    ALTER TABLE public.ai_prompts ADD CONSTRAINT ai_prompts_status_check
        CHECK (status IN ('draft', 'active', 'archived', 'deleted'));

    RAISE NOTICE 'Updated status constraint to include deleted';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Status constraint update skipped: %', SQLERRM;
END $$;


-- ─────────────────────────────────────────────────
-- STEP 8: Verify — count linked vs unlinked nodes
-- ─────────────────────────────────────────────────
DO $$
DECLARE
    linked   INT;
    unlinked INT;
BEGIN
    SELECT COUNT(*) INTO linked   FROM public.prompt_sequence_nodes WHERE prompt_id IS NOT NULL;
    SELECT COUNT(*) INTO unlinked FROM public.prompt_sequence_nodes WHERE prompt_id IS NULL;
    RAISE NOTICE '✅ Prompt linking complete: % linked, % unlinked (patient_addendum, pathway nodes are expected to be unlinked)', linked, unlinked;
END $$;
