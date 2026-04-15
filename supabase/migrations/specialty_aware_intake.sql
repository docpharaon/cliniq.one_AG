-- =====================================================
-- Specialty-Aware Intake: DB Schema Changes
-- =====================================================

-- 1. Add is_essential column to prompt_sequence_nodes
ALTER TABLE prompt_sequence_nodes
  ADD COLUMN IF NOT EXISTS is_essential boolean DEFAULT false;

COMMENT ON COLUMN prompt_sequence_nodes.is_essential IS
  'When true, this node runs even during fast-track skip. Admin-controlled via Sequence Builder.';

-- 2. Create WA Doctor Greeting prompt
INSERT INTO ai_prompts (name, prompt_type, content, is_active, status, version)
VALUES (
  'WA — Doctor Greeting',
  'wa_section',
  E'You are a medical intake AI assistant for cliniq.one. The patient has just entered their doctor\u0027s code on WhatsApp.\n\nYOUR TASK:\n1. Greet the patient warmly (1-2 sentences).\n2. Mention the doctor\u0027s name and specialty from the PATIENT CONTEXT below.\n3. Explain: "This chat will gather all the information your doctor needs for your consultation, so nothing important is missed."\n4. Set expectation: "It will only take a few minutes."\n5. IMMEDIATELY emit [SECTION_COMPLETE] at the end.\n\nRULES:\n- Do NOT ask any questions in this greeting.\n- Keep it very brief \u2014 this is WhatsApp.\n- Be warm, friendly, and reassuring.\n- Use the doctor\u0027s name naturally: "Dr. [Name]" or "\u062f. [Name]"\n- Mention specialty in patient-friendly terms (e.g., "\u0623\u062e\u0635\u0627\u0626\u064a \u062c\u0644\u062f\u064a\u0629" not "dermatology")\n- If language is Arabic, greet in Arabic.',
  true,
  'active',
  1
)
ON CONFLICT DO NOTHING;

-- 3. Mark essential nodes in specialty sequences
-- Dermatology: photo_capture + medications
UPDATE prompt_sequence_nodes SET is_essential = true
WHERE sequence_id = '282d0490-0c08-4b26-b96a-fb0a43586464'
  AND step_key IN ('photo_capture', 'medications');

-- Orthopedics: imaging upload + medications nodes
UPDATE prompt_sequence_nodes SET is_essential = true
WHERE sequence_id = 'e40b10f7-bd3a-4734-b36f-9d0a6de67c82'
  AND step_key IN ('report_upload', 'medications');

-- Psychiatry: safety screening + medications
UPDATE prompt_sequence_nodes SET is_essential = true
WHERE sequence_id = '5d6c9a45-4e53-4a33-9f7f-7d1b5b0fedfe'
  AND step_key IN ('safety_screening', 'medications', 'current_medications');

-- Pediatrics: demographics + medications
UPDATE prompt_sequence_nodes SET is_essential = true
WHERE sequence_id = '6785fb61-751a-4e6b-86d1-52dad23e7534'
  AND step_key IN ('demographics', 'age_weight', 'medications', 'current_medications');

-- Family Medicine: medications + allergies
UPDATE prompt_sequence_nodes SET is_essential = true
WHERE sequence_id = '6e6942f1-3e1f-45d1-b789-37c5f730b1f8'
  AND step_key IN ('medications', 'current_medications', 'allergies');

-- Diet & Nutrition: measurements / dietary habits
UPDATE prompt_sequence_nodes SET is_essential = true
WHERE sequence_id = 'd83df56b-02e7-40e4-93bd-7bc23442c5a0'
  AND step_key IN ('measurements', 'body_composition', 'dietary_habits');

-- 4. Archive orphan prompt
UPDATE ai_prompts SET is_active = false, status = 'archived' WHERE name = 'WA — Visit Type';

-- Verify essential nodes
SELECT psn.step_key, psn.label, psn.is_essential, ps.name as sequence_name
FROM prompt_sequence_nodes psn
JOIN prompt_sequences ps ON ps.id = psn.sequence_id
WHERE psn.is_essential = true
ORDER BY ps.name, psn.sort_order;
