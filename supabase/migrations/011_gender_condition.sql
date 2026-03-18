-- ══════════════════════════════════════════════════════════════
-- Migration: Add gender_condition to prompt_sequence_nodes
-- Allows sections to be conditionally shown based on patient sex
-- NULL = show for all, 'female' = female only, 'male' = male only
-- ══════════════════════════════════════════════════════════════

ALTER TABLE prompt_sequence_nodes
  ADD COLUMN IF NOT EXISTS gender_condition TEXT DEFAULT NULL;
