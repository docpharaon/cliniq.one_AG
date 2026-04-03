-- ══════════════════════════════════════════════════════════════
-- 046_sequence_type_phase_model.sql
-- Three-Phase Sequence Model: sequence_type + per-node max_turns
-- Enables Global Intake → Specialty → Global Wrapup pipeline
-- ══════════════════════════════════════════════════════════════

-- ─── 1. Add sequence_type to prompt_sequences ────────────────
ALTER TABLE public.prompt_sequences
  ADD COLUMN IF NOT EXISTS sequence_type TEXT DEFAULT 'legacy';

-- Constraint: only allowed types
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

-- Index for fast type lookups
CREATE INDEX IF NOT EXISTS idx_sequences_type
  ON public.prompt_sequences(sequence_type);

CREATE INDEX IF NOT EXISTS idx_sequences_type_specialty
  ON public.prompt_sequences(sequence_type, specialty)
  WHERE sequence_type = 'specialty';

-- ─── 2. Add max_turns to prompt_sequence_nodes ───────────────
-- Per-node turn limit (NULL = use global default of 8)
ALTER TABLE public.prompt_sequence_nodes
  ADD COLUMN IF NOT EXISTS max_turns INTEGER;

COMMENT ON COLUMN public.prompt_sequence_nodes.max_turns IS
  'Per-node turn limit. NULL = use global default (SECTION_MAX_TURNS=8). Problem Input uses 3.';

-- ─── 3. Extend node_type to include new system types ─────────
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
      'system_gate',           -- specialty gate (availability check)
      'system_analysis',       -- concern/specialty analysis
      'system_integrity',      -- end-of-session quality analysis
      'system_classify',       -- pathway classification (new/refill/followup)
      'system_extract'         -- file data extraction (Phase 3)
    ));
END $$;

-- ─── 4. Tag existing specialty sequences ─────────────────────
-- Mark the orphaned specialty flows with proper sequence_type
UPDATE public.prompt_sequences
  SET sequence_type = 'specialty'
  WHERE specialty IS NOT NULL
    AND sequence_type = 'legacy';

-- Mark the current Default Intake Flow as legacy
-- (it will be superseded by global_intake + global_wrapup)
UPDATE public.prompt_sequences
  SET sequence_type = 'legacy'
  WHERE is_default = true
    AND sequence_type = 'legacy';

-- ══════════════════════════════════════════════════════════════
-- Done. No data loss — existing sequences tagged as 'legacy'.
-- New global_intake and global_wrapup sequences seeded in 047.
-- ══════════════════════════════════════════════════════════════
