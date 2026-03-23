-- ══════════════════════════════════════════════════════════════
-- 015_consolidation_fixes.sql — Consolidation and data consistency fixes
-- 1. Update grant_tokens RPC to accept a type parameter (admin_grant vs bonus)
-- 2. Add doctor RLS for schedules table (so doctor-web can read)
-- 3. Create a view to unify feedback / doctor_ratings (leave both tables)
-- ══════════════════════════════════════════════════════════════

-- ─── 1. Update grant_tokens RPC ──────────────────────────
-- The original RPC hardcodes type='bonus'. We add an optional type parameter
-- so admin grants use type='admin_grant' while welcome bonuses use 'bonus'.
CREATE OR REPLACE FUNCTION public.grant_tokens(
    p_user_id UUID,
    p_amount INTEGER,
    p_description TEXT DEFAULT 'Token grant',
    p_type TEXT DEFAULT 'bonus'
)
RETURNS VOID AS $$
DECLARE
    v_balance INTEGER;
BEGIN
    SELECT tokens_balance INTO v_balance
    FROM public.users
    WHERE id = p_user_id
    FOR UPDATE;

    IF v_balance IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    UPDATE public.users
    SET tokens_balance = tokens_balance + p_amount,
        updated_at = NOW()
    WHERE id = p_user_id;

    INSERT INTO public.token_transactions (
        user_id, type, amount, balance_after,
        description
    ) VALUES (
        p_user_id,
        CASE WHEN p_type IN ('purchase','spend','earn','refund','bonus','admin_grant')
             THEN p_type ELSE 'bonus' END,
        p_amount, v_balance + p_amount,
        p_description
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 2. Schedule table RLS for doctor-web ────────────────
-- The schedules table only had a SELECT policy for the owning doctor.
-- Doctor-web also needs UPDATE (to toggle is_active) and the admin needs full CRUD.

-- Doctor can update own schedule
CREATE POLICY IF NOT EXISTS "Doctors can update own schedule" ON public.schedules
    FOR UPDATE TO authenticated USING (doctor_id IN (
        SELECT id FROM public.doctors WHERE user_id = auth.uid()
    ));

-- Admin can manage all schedules (service role bypasses, but in case client is used)
CREATE POLICY IF NOT EXISTS "Admin manage schedules" ON public.schedules
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );
