-- ============================================
-- cliniq.one Migration 027: ICD-10 Disease Codes
-- Reference table for standardized diagnosis coding
-- ============================================

-- Enable trigram extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- 1. ICD Codes Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.icd_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  description_ar TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  specialty_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. Indexes
-- ============================================

-- GIN index for specialty filtering
CREATE INDEX IF NOT EXISTS idx_icd_codes_specialty_tags
  ON public.icd_codes USING GIN (specialty_tags);

-- Trigram index for fuzzy search on code + description
CREATE INDEX IF NOT EXISTS idx_icd_codes_search
  ON public.icd_codes USING GIN ((code || ' ' || description) gin_trgm_ops);

-- Active codes index
CREATE INDEX IF NOT EXISTS idx_icd_codes_active
  ON public.icd_codes (is_active)
  WHERE is_active = TRUE;

-- ============================================
-- 3. Auto-update timestamp trigger
-- ============================================
CREATE TRIGGER icd_codes_updated_at
  BEFORE UPDATE ON public.icd_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 4. Row Level Security
-- ============================================
ALTER TABLE public.icd_codes ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read active codes
CREATE POLICY "Authenticated users can read ICD codes"
  ON public.icd_codes FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Admin write access is via service role key (no RLS policy needed)
