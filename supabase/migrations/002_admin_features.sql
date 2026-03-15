-- ──────────────────────────────────────────
-- 002_admin_features.sql
-- Additional tables for admin panel features
-- ──────────────────────────────────────────

-- ──────────────────────────────────
-- Doctor Ratings
-- ──────────────────────────────────
CREATE TABLE IF NOT EXISTS doctor_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(consultation_id, patient_id) -- one rating per consultation per patient
);

-- ──────────────────────────────────
-- Doctor Schedules
-- ──────────────────────────────────
CREATE TABLE IF NOT EXISTS doctor_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(doctor_id, day_of_week)
);

-- ──────────────────────────────────
-- AI Prompt Templates
-- ──────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_prompt_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    specialty TEXT NOT NULL,
    prompt_type TEXT NOT NULL CHECK (prompt_type IN ('system', 'intake', 'summary', 'suggestion')),
    content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────
-- News / Health Articles
-- ──────────────────────────────────
CREATE TABLE IF NOT EXISTS news_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    title_ar TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL,
    content_ar TEXT NOT NULL DEFAULT '',
    image_url TEXT,
    category TEXT NOT NULL DEFAULT 'general',
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────
-- Advertisements
-- ──────────────────────────────────
CREATE TABLE IF NOT EXISTS advertisements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    image_url TEXT NOT NULL,
    link_url TEXT,
    placement TEXT NOT NULL CHECK (placement IN ('dashboard', 'consultation', 'profile')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────
-- Error Reports (user bug reports)
-- ──────────────────────────────────
CREATE TABLE IF NOT EXISTS error_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
    category TEXT NOT NULL CHECK (category IN ('chat', 'payment', 'ui', 'other')),
    description TEXT NOT NULL,
    screenshot_url TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- ──────────────────────────────────
-- Platform Settings (key-value store)
-- ──────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────
-- Token Packages (purchasable)
-- ──────────────────────────────────
CREATE TABLE IF NOT EXISTS token_packages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tokens INTEGER NOT NULL,
    price_usd DECIMAL(10,2) NOT NULL,
    price_sar DECIMAL(10,2) NOT NULL,
    apple_product_id TEXT,
    google_product_id TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default token packages
INSERT INTO token_packages (id, name, tokens, price_usd, price_sar, apple_product_id, google_product_id)
VALUES
    ('basic', 'Basic', 3, 9.99, 37.49, 'com.cliniqone.tokens.basic', 'tokens_basic'),
    ('standard', 'Standard', 7, 19.99, 74.99, 'com.cliniqone.tokens.standard', 'tokens_standard'),
    ('premium', 'Premium', 15, 39.99, 149.99, 'com.cliniqone.tokens.premium', 'tokens_premium')
ON CONFLICT (id) DO NOTHING;

-- Insert default platform settings
INSERT INTO platform_settings (key, value, description)
VALUES
    ('maintenance_mode', 'false', 'Whether the platform is in maintenance mode'),
    ('min_app_version', '1.0.0', 'Minimum app version required'),
    ('welcome_tokens', '100', 'Number of tokens given to new users'),
    ('consultation_cost', '3', 'Default token cost per consultation'),
    ('doctor_revenue_split', '0.7', 'Doctor revenue share (0-1)')
ON CONFLICT (key) DO NOTHING;

-- ──────────────────────────────────
-- RLS Policies for Admin
-- ──────────────────────────────────

-- Admin can read all users
CREATE POLICY admin_read_users ON users
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

-- Admin can update all users
CREATE POLICY admin_update_users ON users
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

-- Admin can read all doctors
CREATE POLICY admin_read_doctors ON doctors
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

-- Admin can update all doctors
CREATE POLICY admin_update_doctors ON doctors
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

-- Admin can insert doctors
CREATE POLICY admin_insert_doctors ON doctors
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

-- Admin can read all consultations
CREATE POLICY admin_read_consultations ON consultations
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

-- Admin can update all consultations
CREATE POLICY admin_update_consultations ON consultations
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

-- Admin can read all token transactions
CREATE POLICY admin_read_token_transactions ON token_transactions
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

-- Admin can insert token transactions (granting tokens)
CREATE POLICY admin_insert_token_transactions ON token_transactions
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

-- Admin can read all protocol logs
CREATE POLICY admin_read_protocol_logs ON protocol_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

-- Admin can update protocol logs (resolve)
CREATE POLICY admin_update_protocol_logs ON protocol_logs
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

-- ── New table policies ──

-- Doctor ratings: patient can insert, doctor/admin can read
ALTER TABLE doctor_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY patient_insert_rating ON doctor_ratings
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = patient_id);

CREATE POLICY read_own_ratings ON doctor_ratings
    FOR SELECT TO authenticated
    USING (
        auth.uid() = patient_id
        OR auth.uid() IN (SELECT user_id FROM doctors WHERE id = doctor_id)
        OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
    );

-- Doctor schedules
ALTER TABLE doctor_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY doctor_manage_schedule ON doctor_schedules
    FOR ALL TO authenticated
    USING (
        doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
    );

-- AI Prompt Templates: admin only
ALTER TABLE ai_prompt_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_manage_prompts ON ai_prompt_templates
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
    );

-- News articles: public read, admin write
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY public_read_news ON news_articles
    FOR SELECT TO authenticated
    USING (is_published = true);

CREATE POLICY admin_manage_news ON news_articles
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
    );

-- Advertisements: public read active, admin manage
ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;

CREATE POLICY public_read_ads ON advertisements
    FOR SELECT TO authenticated
    USING (is_active = true AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE);

CREATE POLICY admin_manage_ads ON advertisements
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
    );

-- Error reports: user can insert own, admin can read/update all
ALTER TABLE error_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_insert_error ON error_reports
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_read_own_errors ON error_reports
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY admin_manage_errors ON error_reports
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
    );

-- Platform settings: admin only
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_manage_settings ON platform_settings
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
    );

-- Token packages: public read, admin manage
ALTER TABLE token_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY public_read_packages ON token_packages
    FOR SELECT TO authenticated
    USING (is_active = true);

CREATE POLICY admin_manage_packages ON token_packages
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
    );

-- ── Updated_at triggers for new tables ──

CREATE TRIGGER update_ai_prompt_templates_timestamp
    BEFORE UPDATE ON ai_prompt_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_news_articles_timestamp
    BEFORE UPDATE ON news_articles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_platform_settings_timestamp
    BEFORE UPDATE ON platform_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
