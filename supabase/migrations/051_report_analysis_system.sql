-- ══════════════════════════════════════════════════════════════════
-- 051_report_analysis_system.sql
-- AI-Verified Medical Report Upload System
--
-- Extends the external report upload infrastructure (039) with:
-- 1. AI analysis columns (integrity, context, date verification)
-- 2. system_upload node type for the intake pipeline
-- 3. Increased storage limit (20MB)
-- 4. Report upload + analysis nodes seeded into specialty sequences
-- 5. Admin-configurable settings (token cost, AI model)
-- ══════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════
-- 1. ADD AI ANALYSIS COLUMNS TO REPORT UPLOADS TABLE
-- ═══════════════════════════════════════════════════

ALTER TABLE public.consultation_report_uploads
  ADD COLUMN IF NOT EXISTS ai_analysis JSONB,
  ADD COLUMN IF NOT EXISTS document_date DATE,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS report_summary TEXT,
  ADD COLUMN IF NOT EXISTS ai_confidence DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS date_relevance TEXT DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS document_language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS admin_override BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_override_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS admin_override_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS file_names TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS file_sizes INTEGER[] DEFAULT '{}';

-- Document type constraint
DO $$
BEGIN
  ALTER TABLE public.consultation_report_uploads
    DROP CONSTRAINT IF EXISTS report_uploads_document_type_check;
  ALTER TABLE public.consultation_report_uploads
    ADD CONSTRAINT report_uploads_document_type_check
    CHECK (document_type IN (
      'lab', 'imaging', 'pathology', 'prescription',
      'psychiatric_evaluation', 'therapy_notes', 'growth_chart',
      'vaccination', 'body_composition', 'surgical_report',
      'previous_report', 'general', 'unknown'
    ));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'document_type constraint skipped: %', SQLERRM;
END $$;

-- Date relevance constraint
DO $$
BEGIN
  ALTER TABLE public.consultation_report_uploads
    DROP CONSTRAINT IF EXISTS report_uploads_date_relevance_check;
  ALTER TABLE public.consultation_report_uploads
    ADD CONSTRAINT report_uploads_date_relevance_check
    CHECK (date_relevance IN ('current', 'recent', 'outdated', 'unknown'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'date_relevance constraint skipped: %', SQLERRM;
END $$;

-- Index for verified/unverified lookups
CREATE INDEX IF NOT EXISTS idx_report_uploads_verified
  ON public.consultation_report_uploads(is_verified);

CREATE INDEX IF NOT EXISTS idx_report_uploads_document_type
  ON public.consultation_report_uploads(document_type);

COMMENT ON COLUMN public.consultation_report_uploads.ai_analysis IS
  'Full AI Vision analysis result (integrity, context, date, extracted data)';
COMMENT ON COLUMN public.consultation_report_uploads.is_verified IS
  'AI verified this is a legitimate medical document';
COMMENT ON COLUMN public.consultation_report_uploads.report_summary IS
  'AI-generated one-line summary for doctor quick view';
COMMENT ON COLUMN public.consultation_report_uploads.date_relevance IS
  'AI-determined date relevance: current (<3mo), recent (<1yr), outdated (>1yr), unknown';


-- ═══════════════════════════════════════════════════
-- 2. EXTEND node_type CONSTRAINT TO INCLUDE system_upload
-- ═══════════════════════════════════════════════════

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
      'system_gate',
      'system_analysis',
      'system_integrity',
      'system_classify',
      'system_extract',
      'system_upload'          -- NEW: triggers patient file upload UI
    ));
END $$;


-- ═══════════════════════════════════════════════════
-- 3. INCREASE STORAGE BUCKET LIMIT TO 20MB
-- ═══════════════════════════════════════════════════

UPDATE storage.buckets
SET file_size_limit = 20971520  -- 20MB
WHERE id = 'consultation-reports';

-- Also ensure bucket exists (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'consultation-reports',
    'consultation-reports',
    false,
    20971520, -- 20MB
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO UPDATE
SET file_size_limit = 20971520;


-- ═══════════════════════════════════════════════════
-- 4. SEED ADMIN-CONFIGURABLE SETTINGS
-- ═══════════════════════════════════════════════════

INSERT INTO public.platform_settings (key, value, description)
VALUES
  ('report_upload_token_cost', '1', 'Number of tokens charged per report upload session (0 = free)'),
  ('report_analysis_model', 'gpt-4o', 'OpenAI model used for document analysis (Vision API). Options: gpt-4o, gpt-4o-mini'),
  ('report_max_files', '5', 'Maximum number of files per upload session'),
  ('report_upload_enabled', 'true', 'Enable/disable the report upload feature globally')
ON CONFLICT (key) DO NOTHING;


-- ═══════════════════════════════════════════════════
-- 5. SEED report_upload + report_analysis NODES INTO
--    ALL SPECIALTY SEQUENCES
-- ═══════════════════════════════════════════════════

-- For each specialty sequence that has an external_reports node,
-- add the system_upload and system_extract nodes right after it.

DO $$
DECLARE
    rec RECORD;
    ext_sort INT;
BEGIN
    FOR rec IN
        SELECT
            n.sequence_id,
            n.sort_order,
            s.name AS seq_name,
            s.specialty
        FROM public.prompt_sequence_nodes n
        JOIN public.prompt_sequences s ON s.id = n.sequence_id
        WHERE n.step_key = 'external_reports'
          AND s.sequence_type = 'specialty'
    LOOP
        ext_sort := rec.sort_order;

        -- Bump any nodes after external_reports by 20 to make room
        UPDATE public.prompt_sequence_nodes
        SET sort_order = sort_order + 20
        WHERE sequence_id = rec.sequence_id
          AND sort_order > ext_sort
          AND step_key NOT IN ('report_upload', 'report_analysis');

        -- Insert report_upload (system_upload) after external_reports
        INSERT INTO public.prompt_sequence_nodes
            (sequence_id, step_key, label, emoji, prompt_id, sort_order, node_type, max_turns)
        VALUES
            (rec.sequence_id, 'report_upload', 'Upload Documents', '📤', NULL, ext_sort + 5, 'system_upload', NULL)
        ON CONFLICT DO NOTHING;

        -- Insert report_analysis (system_extract) after report_upload
        INSERT INTO public.prompt_sequence_nodes
            (sequence_id, step_key, label, emoji, prompt_id, sort_order, node_type, max_turns)
        VALUES
            (rec.sequence_id, 'report_analysis', 'Analyzing Documents', '🔬', NULL, ext_sort + 10, 'system_extract', NULL)
        ON CONFLICT DO NOTHING;

        RAISE NOTICE 'Added report_upload + report_analysis to: %', rec.seq_name;
    END LOOP;
END $$;


-- ═══════════════════════════════════════════════════
-- 6. VERIFY
-- ═══════════════════════════════════════════════════

DO $$
DECLARE
    upload_count INT;
    analysis_count INT;
BEGIN
    SELECT COUNT(*) INTO upload_count
    FROM public.prompt_sequence_nodes WHERE step_key = 'report_upload';

    SELECT COUNT(*) INTO analysis_count
    FROM public.prompt_sequence_nodes WHERE step_key = 'report_analysis';

    RAISE NOTICE '✅ Report system ready: % upload nodes, % analysis nodes seeded', upload_count, analysis_count;
END $$;

-- ══════════════════════════════════════════════════════════════════
-- Done.
-- - consultation_report_uploads extended with AI analysis columns
-- - system_upload node type added
-- - Storage bucket increased to 20MB
-- - Admin settings seeded (token cost, model, max files)
-- - report_upload + report_analysis nodes added to all specialties
-- ══════════════════════════════════════════════════════════════════
