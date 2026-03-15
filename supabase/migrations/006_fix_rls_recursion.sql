-- ──────────────────────────────────────────
-- 006_fix_rls_recursion.sql  (FINAL)
-- Fixes infinite recursion + creates doctor profile
-- ──────────────────────────────────────────

-- 1. Drop the recursive admin policies on users
DROP POLICY IF EXISTS admin_read_users ON users;
DROP POLICY IF EXISTS admin_update_users ON users;

-- 2. Create is_admin() helper for other tables
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $fn$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$fn$;

-- 3. doctors
DROP POLICY IF EXISTS admin_read_doctors ON doctors;
DROP POLICY IF EXISTS admin_update_doctors ON doctors;
DROP POLICY IF EXISTS admin_insert_doctors ON doctors;
DROP POLICY IF EXISTS doctor_read_own ON doctors;

CREATE POLICY admin_read_doctors ON doctors
    FOR SELECT TO authenticated USING ( public.is_admin() );
CREATE POLICY admin_update_doctors ON doctors
    FOR UPDATE TO authenticated USING ( public.is_admin() );
CREATE POLICY admin_insert_doctors ON doctors
    FOR INSERT TO authenticated WITH CHECK ( public.is_admin() );
CREATE POLICY doctor_read_own ON doctors
    FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 4. consultations
DROP POLICY IF EXISTS admin_read_consultations ON consultations;
DROP POLICY IF EXISTS admin_update_consultations ON consultations;

CREATE POLICY admin_read_consultations ON consultations
    FOR SELECT TO authenticated USING ( public.is_admin() );
CREATE POLICY admin_update_consultations ON consultations
    FOR UPDATE TO authenticated USING ( public.is_admin() );

-- 5. token_transactions
DROP POLICY IF EXISTS admin_read_token_transactions ON token_transactions;
DROP POLICY IF EXISTS admin_insert_token_transactions ON token_transactions;

CREATE POLICY admin_read_token_transactions ON token_transactions
    FOR SELECT TO authenticated USING ( public.is_admin() );
CREATE POLICY admin_insert_token_transactions ON token_transactions
    FOR INSERT TO authenticated WITH CHECK ( public.is_admin() );

-- 6. protocol_logs
DROP POLICY IF EXISTS admin_read_protocol_logs ON protocol_logs;
DROP POLICY IF EXISTS admin_update_protocol_logs ON protocol_logs;

CREATE POLICY admin_read_protocol_logs ON protocol_logs
    FOR SELECT TO authenticated USING ( public.is_admin() );
CREATE POLICY admin_update_protocol_logs ON protocol_logs
    FOR UPDATE TO authenticated USING ( public.is_admin() );

-- 7. doctor_ratings
DROP POLICY IF EXISTS read_own_ratings ON doctor_ratings;

CREATE POLICY read_own_ratings ON doctor_ratings
    FOR SELECT TO authenticated USING (
        auth.uid() = patient_id
        OR auth.uid() IN (SELECT user_id FROM doctors WHERE id = doctor_id)
        OR public.is_admin()
    );

-- 8. doctor_schedules
DROP POLICY IF EXISTS doctor_manage_schedule ON doctor_schedules;

CREATE POLICY doctor_manage_schedule ON doctor_schedules
    FOR ALL TO authenticated USING (
        doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
        OR public.is_admin()
    );

-- 9. ai_prompt_templates
DROP POLICY IF EXISTS admin_manage_prompts ON ai_prompt_templates;

CREATE POLICY admin_manage_prompts ON ai_prompt_templates
    FOR ALL TO authenticated USING ( public.is_admin() );

-- 10. news_articles
DROP POLICY IF EXISTS admin_manage_news ON news_articles;

CREATE POLICY admin_manage_news ON news_articles
    FOR ALL TO authenticated USING ( public.is_admin() );

-- 11. advertisements
DROP POLICY IF EXISTS admin_manage_ads ON advertisements;

CREATE POLICY admin_manage_ads ON advertisements
    FOR ALL TO authenticated USING ( public.is_admin() );

-- 12. error_reports
DROP POLICY IF EXISTS admin_manage_errors ON error_reports;

CREATE POLICY admin_manage_errors ON error_reports
    FOR ALL TO authenticated USING ( public.is_admin() );

-- 13. platform_settings
DROP POLICY IF EXISTS admin_manage_settings ON platform_settings;

CREATE POLICY admin_manage_settings ON platform_settings
    FOR ALL TO authenticated USING ( public.is_admin() );

-- 14. token_packages
DROP POLICY IF EXISTS admin_manage_packages ON token_packages;

CREATE POLICY admin_manage_packages ON token_packages
    FOR ALL TO authenticated USING ( public.is_admin() );

-- 15. Create doctor profile for momen.g.pharaon@gmail.com
UPDATE users SET role = 'doctor' WHERE email = 'momen.g.pharaon@gmail.com';

INSERT INTO doctors (user_id, full_name, display_name, license_number, license_authority, specialty, status)
SELECT id, 'Dr. Momen Pharaon', 'Dr. Momen', 'LIC-001', 'Saudi MOH', 'dermatology', 'active'
FROM users WHERE email = 'momen.g.pharaon@gmail.com'
ON CONFLICT (user_id) DO NOTHING;
