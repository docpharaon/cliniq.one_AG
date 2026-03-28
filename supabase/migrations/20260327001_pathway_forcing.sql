-- ══════════════════════════════════════════════════════════════════
-- Migration: Add specialty column to prompt_sequences
-- Enables loading a specialty-specific sequence when a patient
-- has pre-selected a doctor with a mapped specialty.
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE public.prompt_sequences ADD COLUMN IF NOT EXISTS specialty TEXT;

-- Tag existing specialty sequences
UPDATE public.prompt_sequences SET specialty = 'orthopedics' WHERE name ILIKE '%orthopedics%' AND specialty IS NULL;
UPDATE public.prompt_sequences SET specialty = 'psychiatry'  WHERE name ILIKE '%psychiatry%'  AND specialty IS NULL;
