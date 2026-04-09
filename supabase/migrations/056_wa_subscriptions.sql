-- ══════════════════════════════════════════════════════════════
-- 056_wa_subscriptions.sql
-- Doctor Subscription & API Key System for WA Intake
-- ══════════════════════════════════════════════════════════════

-- ─── 1. Doctor Subscriptions ─────────────────────
CREATE TABLE IF NOT EXISTS public.doctor_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    plan TEXT NOT NULL DEFAULT 'trial'
        CHECK (plan IN ('trial', 'starter', 'professional', 'enterprise')),
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'expired', 'cancelled', 'suspended')),
    sessions_limit INTEGER NOT NULL DEFAULT 20,
    sessions_used INTEGER NOT NULL DEFAULT 0,
    features JSONB DEFAULT '{"photo_upload": false, "doc_upload": false, "custom_branding": false}'::jsonb,
    started_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days'),
    renewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(doctor_id)
);

ALTER TABLE public.doctor_subscriptions ENABLE ROW LEVEL SECURITY;

-- Admin full access
DROP POLICY IF EXISTS "sub_admin_all" ON public.doctor_subscriptions;
CREATE POLICY "sub_admin_all"
    ON public.doctor_subscriptions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() AND u.role IN ('admin', 'superadmin')
        )
    );

-- Doctor read own subscription
DROP POLICY IF EXISTS "sub_doctor_read" ON public.doctor_subscriptions;
CREATE POLICY "sub_doctor_read"
    ON public.doctor_subscriptions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.doctors d
            WHERE d.id = doctor_subscriptions.doctor_id AND d.user_id = auth.uid()
        )
    );

-- Anon read for WA intake validation
DROP POLICY IF EXISTS "sub_anon_read" ON public.doctor_subscriptions;
CREATE POLICY "sub_anon_read"
    ON public.doctor_subscriptions FOR SELECT
    USING (true);

CREATE INDEX IF NOT EXISTS idx_sub_doctor ON public.doctor_subscriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_sub_status ON public.doctor_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_sub_expires ON public.doctor_subscriptions(expires_at);


-- ─── 2. WA API Keys ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.wa_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    key_code TEXT NOT NULL UNIQUE,
    label TEXT DEFAULT 'Default',
    is_active BOOLEAN DEFAULT true,
    sessions_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ
);

ALTER TABLE public.wa_api_keys ENABLE ROW LEVEL SECURITY;

-- Admin full access
DROP POLICY IF EXISTS "wakey_admin_all" ON public.wa_api_keys;
CREATE POLICY "wakey_admin_all"
    ON public.wa_api_keys FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() AND u.role IN ('admin', 'superadmin')
        )
    );

-- Doctor read own keys
DROP POLICY IF EXISTS "wakey_doctor_read" ON public.wa_api_keys;
CREATE POLICY "wakey_doctor_read"
    ON public.wa_api_keys FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.doctors d
            WHERE d.id = wa_api_keys.doctor_id AND d.user_id = auth.uid()
        )
    );

-- Anon read for WA intake validation (only active keys)
DROP POLICY IF EXISTS "wakey_anon_read" ON public.wa_api_keys;
CREATE POLICY "wakey_anon_read"
    ON public.wa_api_keys FOR SELECT
    USING (is_active = true);

-- Anon update for session counting
DROP POLICY IF EXISTS "wakey_anon_update" ON public.wa_api_keys;
CREATE POLICY "wakey_anon_update"
    ON public.wa_api_keys FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_wakey_doctor ON public.wa_api_keys(doctor_id);
CREATE INDEX IF NOT EXISTS idx_wakey_code ON public.wa_api_keys(key_code);
CREATE INDEX IF NOT EXISTS idx_wakey_active ON public.wa_api_keys(is_active) WHERE is_active = true;


-- ─── 3. Link wa_intake_sessions to api key ───────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'wa_intake_sessions'
        AND column_name = 'api_key_id'
    ) THEN
        ALTER TABLE public.wa_intake_sessions
            ADD COLUMN api_key_id UUID REFERENCES public.wa_api_keys(id);
    END IF;
END $$;


-- ─── 4. RPC: Validate WA Key (used by frontend) ─
CREATE OR REPLACE FUNCTION public.validate_wa_key(p_key_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_key RECORD;
    v_sub RECORD;
    v_doc RECORD;
    v_phone TEXT;
BEGIN
    -- Find the key
    SELECT * INTO v_key
    FROM public.wa_api_keys
    WHERE key_code = p_key_code
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('valid', false, 'reason', 'invalid_key');
    END IF;

    IF NOT v_key.is_active THEN
        RETURN jsonb_build_object('valid', false, 'reason', 'key_disabled');
    END IF;

    IF v_key.expires_at IS NOT NULL AND v_key.expires_at < now() THEN
        RETURN jsonb_build_object('valid', false, 'reason', 'key_expired');
    END IF;

    -- Find doctor
    SELECT * INTO v_doc
    FROM public.doctors
    WHERE id = v_key.doctor_id AND status = 'active'
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('valid', false, 'reason', 'doctor_inactive');
    END IF;

    -- Get phone
    SELECT phone INTO v_phone
    FROM public.users
    WHERE id = v_doc.user_id;

    -- Find subscription
    SELECT * INTO v_sub
    FROM public.doctor_subscriptions
    WHERE doctor_id = v_key.doctor_id
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('valid', false, 'reason', 'no_subscription');
    END IF;

    IF v_sub.status != 'active' THEN
        RETURN jsonb_build_object('valid', false, 'reason', 'subscription_' || v_sub.status);
    END IF;

    IF v_sub.expires_at < now() THEN
        -- Auto-expire
        UPDATE public.doctor_subscriptions SET status = 'expired' WHERE id = v_sub.id;
        RETURN jsonb_build_object('valid', false, 'reason', 'subscription_expired');
    END IF;

    IF v_sub.sessions_used >= v_sub.sessions_limit THEN
        RETURN jsonb_build_object('valid', false, 'reason', 'limit_reached');
    END IF;

    -- Valid!
    RETURN jsonb_build_object(
        'valid', true,
        'doctor', jsonb_build_object(
            'id', v_doc.id,
            'display_name', v_doc.display_name,
            'full_name', v_doc.full_name,
            'specialty', v_doc.specialty,
            'avatar_url', v_doc.avatar_url,
            'whatsapp_number', v_phone
        ),
        'features', v_sub.features,
        'sessions_remaining', v_sub.sessions_limit - v_sub.sessions_used,
        'plan', v_sub.plan,
        'key_id', v_key.id
    );
END;
$$;

-- Grant anon access to the RPC
GRANT EXECUTE ON FUNCTION public.validate_wa_key(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_wa_key(TEXT) TO authenticated;


-- ─── 5. RPC: Increment session usage ────────────
CREATE OR REPLACE FUNCTION public.wa_session_complete(p_key_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_doctor_id UUID;
BEGIN
    -- Increment key usage
    UPDATE public.wa_api_keys
    SET sessions_count = sessions_count + 1,
        last_used_at = now()
    WHERE id = p_key_id
    RETURNING doctor_id INTO v_doctor_id;

    -- Increment subscription usage
    IF v_doctor_id IS NOT NULL THEN
        UPDATE public.doctor_subscriptions
        SET sessions_used = sessions_used + 1
        WHERE doctor_id = v_doctor_id;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.wa_session_complete(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.wa_session_complete(UUID) TO authenticated;


-- ─── 6. RPC: Generate WA API Key (admin only) ───
CREATE OR REPLACE FUNCTION public.generate_wa_key(
    p_doctor_id UUID,
    p_label TEXT DEFAULT 'Default'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_code TEXT;
    v_key RECORD;
BEGIN
    -- Check admin
    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    ) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Generate unique code: WA- + 2 random hex + doctor initials
    LOOP
        v_code := 'WA-' || UPPER(SUBSTR(MD5(gen_random_uuid()::TEXT), 1, 6));
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.wa_api_keys WHERE key_code = v_code);
    END LOOP;

    INSERT INTO public.wa_api_keys (doctor_id, key_code, label)
    VALUES (p_doctor_id, v_code, p_label)
    RETURNING * INTO v_key;

    RETURN jsonb_build_object(
        'id', v_key.id,
        'key_code', v_key.key_code,
        'label', v_key.label,
        'created_at', v_key.created_at
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_wa_key(UUID, TEXT) TO authenticated;


-- ─── 7. RPC: Create / Update Subscription (admin) ─
CREATE OR REPLACE FUNCTION public.manage_wa_subscription(
    p_doctor_id UUID,
    p_plan TEXT,
    p_action TEXT DEFAULT 'create'  -- 'create', 'upgrade', 'renew', 'suspend', 'cancel'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_limit INTEGER;
    v_duration INTERVAL;
    v_features JSONB;
    v_sub RECORD;
BEGIN
    -- Check admin
    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    ) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Plan defaults
    CASE p_plan
        WHEN 'trial' THEN
            v_limit := 20;
            v_duration := interval '14 days';
            v_features := '{"photo_upload": false, "doc_upload": false, "custom_branding": false}'::jsonb;
        WHEN 'starter' THEN
            v_limit := 100;
            v_duration := interval '30 days';
            v_features := '{"photo_upload": true, "doc_upload": false, "custom_branding": false}'::jsonb;
        WHEN 'professional' THEN
            v_limit := 500;
            v_duration := interval '30 days';
            v_features := '{"photo_upload": true, "doc_upload": true, "custom_branding": true}'::jsonb;
        WHEN 'enterprise' THEN
            v_limit := 999999;
            v_duration := interval '30 days';
            v_features := '{"photo_upload": true, "doc_upload": true, "custom_branding": true}'::jsonb;
        ELSE
            RAISE EXCEPTION 'Invalid plan: %', p_plan;
    END CASE;

    IF p_action = 'suspend' THEN
        UPDATE public.doctor_subscriptions
        SET status = 'suspended'
        WHERE doctor_id = p_doctor_id
        RETURNING * INTO v_sub;
        RETURN jsonb_build_object('status', 'suspended', 'id', v_sub.id);
    END IF;

    IF p_action = 'cancel' THEN
        UPDATE public.doctor_subscriptions
        SET status = 'cancelled'
        WHERE doctor_id = p_doctor_id
        RETURNING * INTO v_sub;
        RETURN jsonb_build_object('status', 'cancelled', 'id', v_sub.id);
    END IF;

    -- Create or update
    INSERT INTO public.doctor_subscriptions (doctor_id, plan, status, sessions_limit, sessions_used, features, expires_at)
    VALUES (p_doctor_id, p_plan, 'active', v_limit, 0, v_features, now() + v_duration)
    ON CONFLICT (doctor_id) DO UPDATE SET
        plan = p_plan,
        status = 'active',
        sessions_limit = v_limit,
        sessions_used = CASE WHEN p_action = 'renew' THEN 0 ELSE doctor_subscriptions.sessions_used END,
        features = v_features,
        expires_at = now() + v_duration,
        renewed_at = CASE WHEN p_action = 'renew' THEN now() ELSE doctor_subscriptions.renewed_at END
    RETURNING * INTO v_sub;

    RETURN jsonb_build_object(
        'id', v_sub.id,
        'plan', v_sub.plan,
        'status', v_sub.status,
        'sessions_limit', v_sub.sessions_limit,
        'expires_at', v_sub.expires_at
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.manage_wa_subscription(UUID, TEXT, TEXT) TO authenticated;


-- ─── 8. Monthly usage reset (cron-ready) ─────────
CREATE OR REPLACE FUNCTION public.wa_monthly_reset()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Reset session counts for active subscriptions
    UPDATE public.doctor_subscriptions
    SET sessions_used = 0,
        renewed_at = now(),
        expires_at = now() + interval '30 days'
    WHERE status = 'active'
    AND plan != 'trial';

    -- Auto-expire trials past their date
    UPDATE public.doctor_subscriptions
    SET status = 'expired'
    WHERE status = 'active'
    AND expires_at < now();
END;
$$;


-- ══════════════════════════════════════════════════════════════
-- Done. Created:
--   • doctor_subscriptions table (with RLS)
--   • wa_api_keys table (with RLS)
--   • validate_wa_key() RPC — frontend validation
--   • wa_session_complete() RPC — usage metering
--   • generate_wa_key() RPC — admin key generation
--   • manage_wa_subscription() RPC — admin plan management
--   • wa_monthly_reset() function — monthly usage reset
-- ══════════════════════════════════════════════════════════════
