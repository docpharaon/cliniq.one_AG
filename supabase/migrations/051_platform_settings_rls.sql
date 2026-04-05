-- ══════════════════════════════════════════════════════════════
-- 051_platform_settings_rls.sql
-- Allow authenticated users to read platform_settings
-- Required for voice config, feature flags, etc. in the patient app
-- ══════════════════════════════════════════════════════════════

-- Ensure RLS is ENABLED  (idempotent)
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone (including authenticated patients) to SELECT
-- platform_settings values like voice_input_enabled, feature flags, etc.
-- Only INSERT/UPDATE/DELETE remain restricted to admin roles.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'platform_settings'
          AND policyname = 'platform_settings_authenticated_read'
    ) THEN
        EXECUTE 'CREATE POLICY platform_settings_authenticated_read
                 ON public.platform_settings
                 FOR SELECT
                 TO authenticated
                 USING (true)';
    END IF;
END $$;
