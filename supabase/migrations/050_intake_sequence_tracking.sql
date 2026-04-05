-- ══════════════════════════════════════════════════════════════
-- 050_intake_sequence_tracking.sql
-- Sequence Tracking: record which AI sequences were used
-- during each patient intake session for admin follow-up
-- ══════════════════════════════════════════════════════════════

-- ─── 1. Add sequence tracking columns to intake_sessions ─────
-- sequence_flow: array of sequence entries for each phase
-- Example: [
--   { "phase": "intake", "sequence_id": "uuid", "sequence_name": "Global Intake",
--     "sequence_type": "global_intake", "specialty": null,
--     "started_at": "2026-04-04T10:00:00Z", "node_count": 4 },
--   { "phase": "specialty", "sequence_id": "uuid", "sequence_name": "Dermatology Intake",
--     "sequence_type": "specialty", "specialty": "dermatology",
--     "started_at": "2026-04-04T10:05:00Z", "node_count": 8 }
-- ]
ALTER TABLE public.intake_sessions
  ADD COLUMN IF NOT EXISTS sequence_flow JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.intake_sessions
  ADD COLUMN IF NOT EXISTS detected_pathway TEXT;

ALTER TABLE public.intake_sessions
  ADD COLUMN IF NOT EXISTS current_phase TEXT DEFAULT 'intake';

COMMENT ON COLUMN public.intake_sessions.sequence_flow IS
  'Ordered array of sequence phases used during intake: [{phase, sequence_id, sequence_name, sequence_type, specialty, started_at, node_count}]';

COMMENT ON COLUMN public.intake_sessions.detected_pathway IS
  'AI-classified pathway: new_visit, refill, or follow_up';

COMMENT ON COLUMN public.intake_sessions.current_phase IS
  'Current/last phase: intake, specialty, refill, followup, wrapup';

-- ─── 2. Add sequence tracking to consultations ──────────────
ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS sequence_flow JSONB;

ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS detected_pathway TEXT;

COMMENT ON COLUMN public.consultations.sequence_flow IS
  'Copy of intake_sessions.sequence_flow — which AI sequences were used for this consultation';

COMMENT ON COLUMN public.consultations.detected_pathway IS
  'AI-classified visit type: new_visit, refill, or follow_up';

-- ══════════════════════════════════════════════════════════════
-- Done. No data migration needed — defaults to empty/null.
-- ══════════════════════════════════════════════════════════════
