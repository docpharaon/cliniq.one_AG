-- ─────────────────────────────────────────────────
-- Allow authenticated users to READ AI prompts, sequences, and nodes
-- Required for the patient chatbot to fetch admin-configured sequences
-- ─────────────────────────────────────────────────

-- Prompts (for prompt content used by chatbot)
CREATE POLICY IF NOT EXISTS "authenticated_read_prompts"
    ON ai_prompts FOR SELECT TO authenticated USING (true);

-- Sequences (to find the default sequence)
CREATE POLICY IF NOT EXISTS "authenticated_read_sequences"
    ON prompt_sequences FOR SELECT TO authenticated USING (true);

-- Sequence nodes (to get the ordered nodes with prompt references)
CREATE POLICY IF NOT EXISTS "authenticated_read_nodes"
    ON prompt_sequence_nodes FOR SELECT TO authenticated USING (true);

-- Platform settings: allow authenticated users to read AI/chatbot settings
-- (chatbot enabled flag, active sequence ID, chatbot version, protocol config — NOT api keys)
DROP POLICY IF EXISTS "authenticated_read_ai_settings" ON platform_settings;
CREATE POLICY "authenticated_read_ai_settings"
    ON platform_settings FOR SELECT TO authenticated
    USING (key IN (
        'ai_chatbot_enabled',
        'ai_active_sequence_id',
        'chatbot_version',
        'protocol_emergency_keywords_en',
        'protocol_emergency_keywords_ar',
        'protocol_refusal_keywords',
        'protocol_escalation_thresholds',
        'protocol_cooldown_seconds'
    ));
