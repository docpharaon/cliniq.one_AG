-- ──────────────────────────────────────────────────────────
-- 002_admin_tables.sql — Additional tables for admin management
-- ──────────────────────────────────────────────────────────

-- ─── Doctor Schedules ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0=Sun, 6=Sat
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT true,
    daily_limit INT DEFAULT 20,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (doctor_id, day_of_week)
);

-- ─── News / Health Articles ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.news_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE,
    category TEXT NOT NULL DEFAULT 'general',       -- general, dermatology, family_medicine, tips, announcements
    content TEXT NOT NULL DEFAULT '',
    thumbnail_url TEXT,
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,
    author TEXT,
    views INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Advertisements ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.advertisements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    target_url TEXT,
    placement TEXT NOT NULL DEFAULT 'dashboard',    -- dashboard, consultation, profile
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    impressions INT DEFAULT 0,
    clicks INT DEFAULT 0,
    budget_sar NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── AI Prompts ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    specialty TEXT NOT NULL DEFAULT 'general',       -- dermatology, family_medicine, general
    prompt_type TEXT NOT NULL DEFAULT 'system',      -- system, intake, summary, triage
    content TEXT NOT NULL DEFAULT '',
    is_active BOOLEAN DEFAULT true,
    version INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Error Reports ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.error_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
    reporter_name TEXT,
    category TEXT NOT NULL DEFAULT 'other',          -- ai_response, missing_info, wrong_diagnosis, app_crash, ui_bug, other
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'open',             -- open, investigating, resolved, dismissed
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Platform Settings (key-value store) ─────────────────
CREATE TABLE IF NOT EXISTS public.platform_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'general',        -- ai, consultations, pricing, payouts, security, countries
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Indexes ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_schedules_doctor ON public.schedules(doctor_id);
CREATE INDEX IF NOT EXISTS idx_news_published ON public.news_articles(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_category ON public.news_articles(category);
CREATE INDEX IF NOT EXISTS idx_ads_active ON public.advertisements(is_active, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_type ON public.ai_prompts(prompt_type, specialty);
CREATE INDEX IF NOT EXISTS idx_error_reports_status ON public.error_reports(status);
CREATE INDEX IF NOT EXISTS idx_settings_key ON public.platform_settings(key);
CREATE INDEX IF NOT EXISTS idx_settings_category ON public.platform_settings(category);

-- ─── RLS (admin-only tables — service role bypasses RLS) ─
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated users on public-facing tables
CREATE POLICY "Published news readable by all" ON public.news_articles
    FOR SELECT USING (is_published = true);

CREATE POLICY "Active ads readable by all" ON public.advertisements
    FOR SELECT USING (is_active = true);

-- Schedules readable by the doctor who owns them
CREATE POLICY "Doctors can view own schedule" ON public.schedules
    FOR SELECT USING (doctor_id IN (
        SELECT id FROM public.doctors WHERE user_id = auth.uid()
    ));

-- Error reports readable by the reporter
CREATE POLICY "Users can view own reports" ON public.error_reports
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create reports" ON public.error_reports
    FOR INSERT WITH CHECK (user_id = auth.uid());
