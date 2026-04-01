-- ══════════════════════════════════════════════════════════════════
-- Migration: Pathway Forcing for All 6 Specialties
-- Tags all prompt sequences with their specialty for auto-routing
-- ══════════════════════════════════════════════════════════════════

-- Ensure the specialty column exists on prompt_sequences
ALTER TABLE public.prompt_sequences ADD COLUMN IF NOT EXISTS specialty TEXT;

-- Tag each specialty sequence
UPDATE public.prompt_sequences SET specialty = 'dermatology'     WHERE name = 'Dermatology Intake Flow'       AND specialty IS NULL;
UPDATE public.prompt_sequences SET specialty = 'family_medicine'  WHERE name = 'Family Medicine Intake Flow'   AND specialty IS NULL;
UPDATE public.prompt_sequences SET specialty = 'pediatrics'       WHERE name = 'Pediatrics Intake Flow'        AND specialty IS NULL;
UPDATE public.prompt_sequences SET specialty = 'psychiatry'       WHERE name = 'Psychiatry Intake Flow'        AND specialty IS NULL;
UPDATE public.prompt_sequences SET specialty = 'orthopedics'      WHERE name = 'Orthopedics Intake Flow'       AND specialty IS NULL;
UPDATE public.prompt_sequences SET specialty = 'diet'             WHERE name = 'Diet & Nutrition Intake Flow'  AND specialty IS NULL;

-- Add index for fast specialty lookups
CREATE INDEX IF NOT EXISTS idx_prompt_sequences_specialty ON public.prompt_sequences(specialty);
