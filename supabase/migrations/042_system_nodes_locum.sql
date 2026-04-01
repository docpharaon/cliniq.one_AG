-- ══════════════════════════════════════════════════════════════
-- 042_system_nodes_locum.sql
-- Adds system node types to sequences + locum code support
-- ══════════════════════════════════════════════════════════════

-- ─── 1. Add node_type to prompt_sequence_nodes ───────────────
-- Allows distinguishing between chat nodes (AI conversation)
-- and system nodes (automated analysis/gate checks)
ALTER TABLE public.prompt_sequence_nodes
  ADD COLUMN IF NOT EXISTS node_type TEXT NOT NULL DEFAULT 'chat';

-- Add CHECK constraint (safe — all existing rows are 'chat' which passes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'prompt_sequence_nodes_node_type_check'
  ) THEN
    ALTER TABLE public.prompt_sequence_nodes
      ADD CONSTRAINT prompt_sequence_nodes_node_type_check
      CHECK (node_type IN ('chat', 'system_gate', 'system_analysis'));
  END IF;
END $$;

-- ─── 2. Add locum_code to doctors ────────────────────────────
-- Unique short identifier for locum doctor referral flow
ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS locum_code TEXT;

-- Unique index (only non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_doctors_locum_code_unique
  ON public.doctors(locum_code) WHERE locum_code IS NOT NULL;

-- Fast lookup index
CREATE INDEX IF NOT EXISTS idx_doctors_locum_code
  ON public.doctors(locum_code) WHERE locum_code IS NOT NULL;

-- ─── 3. Insert system nodes into all existing sequences ──────
-- Shift existing nodes at position >= 1 by +2 to make room
UPDATE public.prompt_sequence_nodes
SET sort_order = sort_order + 2
WHERE sort_order >= 1;

-- Insert Complaint Analysis node (position 1) into every sequence
INSERT INTO public.prompt_sequence_nodes
  (sequence_id, step_key, label, emoji, sort_order, node_type)
SELECT
  ps.id,
  'complaint_analysis',
  'Complaint Analysis',
  '🔍',
  1,
  'system_analysis'
FROM public.prompt_sequences ps
WHERE NOT EXISTS (
  SELECT 1 FROM public.prompt_sequence_nodes psn
  WHERE psn.sequence_id = ps.id AND psn.step_key = 'complaint_analysis'
);

-- Insert Specialty Gate node (position 2) into every sequence
INSERT INTO public.prompt_sequence_nodes
  (sequence_id, step_key, label, emoji, sort_order, node_type)
SELECT
  ps.id,
  'specialty_gate',
  'Specialty Gate',
  '🛡️',
  2,
  'system_gate'
FROM public.prompt_sequences ps
WHERE NOT EXISTS (
  SELECT 1 FROM public.prompt_sequence_nodes psn
  WHERE psn.sequence_id = ps.id AND psn.step_key = 'specialty_gate'
);

-- ─── 4. Create index on node_type for fast filtering ─────────
CREATE INDEX IF NOT EXISTS idx_sequence_nodes_type
  ON public.prompt_sequence_nodes(node_type);
