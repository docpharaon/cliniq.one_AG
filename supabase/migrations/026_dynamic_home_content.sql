-- ══════════════════════════════════════════════════════════════
-- 026_dynamic_home_content.sql — Dynamic patient dashboard content
-- Tables: campaigns, health_tips  +  platform_settings seeds
-- ══════════════════════════════════════════════════════════════

-- ─── Campaigns (unified news / promotions / announcements) ──
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL DEFAULT 'news' CHECK (type IN ('news', 'promotion', 'announcement')),
    title_en TEXT NOT NULL,
    title_ar TEXT,
    body_en TEXT,
    body_ar TEXT,
    icon TEXT DEFAULT '📢',
    image_url TEXT,
    link_url TEXT,
    is_active BOOLEAN DEFAULT false,
    starts_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Health Tips ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.health_tips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    icon TEXT DEFAULT '💡',
    title_en TEXT NOT NULL,
    title_ar TEXT,
    text_en TEXT NOT NULL,
    text_ar TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_campaigns_active ON public.campaigns (is_active, starts_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_type ON public.campaigns (type);
CREATE INDEX IF NOT EXISTS idx_health_tips_active ON public.health_tips (is_active, sort_order);

-- ─── RLS ────────────────────────────────────────────────────
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_tips ENABLE ROW LEVEL SECURITY;

-- Patients can read active content
CREATE POLICY "authenticated_read_campaigns"
    ON public.campaigns FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_health_tips"
    ON public.health_tips FOR SELECT TO authenticated USING (true);

-- Admin write via service role (bypasses RLS)

-- ─── Updated_at triggers ────────────────────────────────────
CREATE OR REPLACE TRIGGER trg_campaigns_updated
    BEFORE UPDATE ON public.campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_health_tips_updated
    BEFORE UPDATE ON public.health_tips
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Seed default health tips ───────────────────────────────
INSERT INTO public.health_tips (icon, title_en, title_ar, text_en, text_ar, is_active, sort_order) VALUES
    ('💧', 'Stay Hydrated', 'حافظ على ترطيبك', 'Drink 8 glasses of water daily for better health.', 'اشرب ٨ أكواب من الماء يومياً لصحة أفضل.', true, 1),
    ('🚶', 'Stay Active', 'ابقَ نشيطاً', 'A 30-min daily walk boosts mood and heart health.', 'المشي ٣٠ دقيقة يومياً يعزز المزاج وصحة القلب.', true, 2),
    ('😴', 'Sleep Well', 'نم جيداً', 'Adults need 7-9 hours of sleep each night.', 'يحتاج البالغون ٧-٩ ساعات نوم كل ليلة.', true, 3)
ON CONFLICT DO NOTHING;

-- ─── Seed announcement settings ─────────────────────────────
INSERT INTO public.platform_settings (key, value, category, description) VALUES
    ('response_time_value', '2-4 hours', 'announcements', 'Response time displayed on patient dashboard (EN)'),
    ('response_time_value_ar', '٢-٤ ساعات', 'announcements', 'Response time displayed on patient dashboard (AR)'),
    ('consultation_price_value', '3 tokens', 'announcements', 'Consultation price displayed on patient dashboard (EN)'),
    ('consultation_price_value_ar', '٣ رموز', 'announcements', 'Consultation price displayed on patient dashboard (AR)'),
    ('avg_response_minutes', '180', 'announcements', 'Auto-computed average response time in minutes')
ON CONFLICT (key) DO NOTHING;
