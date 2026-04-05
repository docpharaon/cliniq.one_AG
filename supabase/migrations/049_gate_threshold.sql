-- ══════════════════════════════════════════════════════════════
-- Migration 049: Specialty Gate — Admin Threshold Control
-- Adds per-specialty FM confidence threshold (0-100) so admin
-- can control how aggressively the gate redirects to FM.
-- ══════════════════════════════════════════════════════════════

-- Add FM confidence threshold column
ALTER TABLE public.specialty_overrides
  ADD COLUMN IF NOT EXISTS fm_confidence_threshold INTEGER NOT NULL DEFAULT 50;

-- Add check constraint (0-100 range)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'specialty_overrides_fm_threshold_range'
  ) THEN
    ALTER TABLE public.specialty_overrides
      ADD CONSTRAINT specialty_overrides_fm_threshold_range
      CHECK (fm_confidence_threshold >= 0 AND fm_confidence_threshold <= 100);
  END IF;
END $$;

COMMENT ON COLUMN public.specialty_overrides.fm_confidence_threshold IS
  'Minimum AI confidence (0-100) that FM can handle the complaint before redirecting.
   0 = always redirect to FM (lenient), 100 = never redirect (strict, always block).
   Default: 50.';
