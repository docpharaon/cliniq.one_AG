-- ──────────────────────────────────────────────────────────
-- 010_prompt_status.sql — Add draft/active/archived status to ai_prompts
-- Supports the draft → test → publish workflow
-- ──────────────────────────────────────────────────────────

-- Add status column (all existing prompts default to 'active')
ALTER TABLE public.ai_prompts
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'archived'));

-- Index for fast status-based lookups
CREATE INDEX IF NOT EXISTS idx_ai_prompts_status ON public.ai_prompts(status);

-- Composite index for the common query pattern: find active prompt by type
CREATE INDEX IF NOT EXISTS idx_ai_prompts_status_type ON public.ai_prompts(status, prompt_type);
