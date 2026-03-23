-- ══════════════════════════════════════════════════════════════
-- 014_missing_tables.sql — Create tables that were missing from migrations
-- Tables: prompt_sequences, prompt_sequence_nodes, ai_prompt_versions
-- These tables were created manually in Supabase and used by admin + patient apps
-- ══════════════════════════════════════════════════════════════

-- ─── Prompt Sequences ─────────────────────────────────────
-- Defines named sequences of intake steps (e.g., "Default Derma Flow")
CREATE TABLE IF NOT EXISTS public.prompt_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Prompt Sequence Nodes ────────────────────────────────
-- Individual steps within a prompt sequence
CREATE TABLE IF NOT EXISTS public.prompt_sequence_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence_id UUID NOT NULL REFERENCES public.prompt_sequences(id) ON DELETE CASCADE,
    step_key TEXT NOT NULL,
    label TEXT NOT NULL,
    emoji TEXT DEFAULT '📋',
    prompt_id UUID REFERENCES public.ai_prompts(id) ON DELETE SET NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    parent_node_id UUID REFERENCES public.prompt_sequence_nodes(id) ON DELETE SET NULL,
    pathway_condition TEXT,
    gender_condition TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── AI Prompt Versions (Snapshot History) ────────────────
-- Stores historical versions of ai_prompts for rollback support
CREATE TABLE IF NOT EXISTS public.ai_prompt_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id UUID NOT NULL REFERENCES public.ai_prompts(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    name TEXT NOT NULL,
    specialty TEXT NOT NULL,
    prompt_type TEXT NOT NULL,
    content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Indexes ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_prompt_sequences_default ON public.prompt_sequences(is_default);
CREATE INDEX IF NOT EXISTS idx_sequence_nodes_sequence ON public.prompt_sequence_nodes(sequence_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_sequence_nodes_prompt ON public.prompt_sequence_nodes(prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_prompt ON public.ai_prompt_versions(prompt_id, version DESC);

-- ─── RLS ─────────────────────────────────────────────────
ALTER TABLE public.prompt_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_sequence_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prompt_versions ENABLE ROW LEVEL SECURITY;

-- Sequences + Nodes: readable by all authenticated (patient chatbot needs these)
-- Policies from 007_patient_read_prompts.sql reference these tables
-- Re-create them here safely with IF NOT EXISTS
CREATE POLICY IF NOT EXISTS "authenticated_read_sequences"
    ON public.prompt_sequences FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "authenticated_read_nodes"
    ON public.prompt_sequence_nodes FOR SELECT TO authenticated USING (true);

-- Prompt versions: admin-only (service role bypasses RLS)
-- No explicit read policy needed since admin uses service role
CREATE POLICY IF NOT EXISTS "admin_read_versions"
    ON public.ai_prompt_versions FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- ─── Updated_at trigger for prompt_sequences ─────────────
CREATE TRIGGER IF NOT EXISTS trg_prompt_sequences_updated
    BEFORE UPDATE ON public.prompt_sequences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
