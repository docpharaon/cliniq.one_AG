-- ──────────────────────────────────────────
-- 045: add_user_tokens RPC
-- Called by usePurchase.ts after IAP completes
-- Credits tokens to a user and records the transaction.
-- ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.add_user_tokens(
    p_user_id UUID,
    p_amount INTEGER,
    p_description TEXT DEFAULT 'Token purchase',
    p_type TEXT DEFAULT 'purchase'
)
RETURNS VOID AS $$
DECLARE
    v_balance INTEGER;
BEGIN
    -- Lock the user row to prevent race conditions
    SELECT tokens_balance INTO v_balance
    FROM public.users
    WHERE id = p_user_id
    FOR UPDATE;

    IF v_balance IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive';
    END IF;

    -- Credit tokens
    UPDATE public.users
    SET tokens_balance = tokens_balance + p_amount,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Record the transaction
    INSERT INTO public.token_transactions (
        user_id, type, amount, balance_after,
        description
    ) VALUES (
        p_user_id, p_type, p_amount, v_balance + p_amount,
        p_description
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
