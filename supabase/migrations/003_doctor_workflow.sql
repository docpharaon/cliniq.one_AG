-- ============================================
-- cliniq.one Migration 003: Doctor Workflow
-- Adds missing RPC + RLS for doctor/patient flow
-- ============================================

-- ============================================
-- 1. deduct_tokens RPC
--    Called by createConsultation() in @cliniqone/api
-- ============================================
CREATE OR REPLACE FUNCTION public.deduct_tokens(
    p_user_id UUID,
    p_amount INTEGER,
    p_consultation_id UUID
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

    IF v_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient token balance. Have %, need %', v_balance, p_amount;
    END IF;

    -- Deduct from user balance
    UPDATE public.users
    SET tokens_balance = tokens_balance - p_amount,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Record the transaction
    INSERT INTO public.token_transactions (
        user_id, type, amount, balance_after,
        consultation_id, description
    ) VALUES (
        p_user_id, 'spend', p_amount, v_balance - p_amount,
        p_consultation_id, 'Consultation payment'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. grant_tokens RPC (for welcome bonus, admin grants)
-- ============================================
CREATE OR REPLACE FUNCTION public.grant_tokens(
    p_user_id UUID,
    p_amount INTEGER,
    p_description TEXT DEFAULT 'Token grant'
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
        p_user_id, 'bonus', p_amount, v_balance + p_amount,
        p_description
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. Doctor RLS — UPDATE consultations
--    Doctors must update status, submit reports
-- ============================================
CREATE POLICY "Doctors can update assigned consultations"
    ON public.consultations FOR UPDATE TO authenticated
    USING (
        doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
    );

-- Doctors can claim unassigned consultations in their specialty
CREATE POLICY "Doctors can claim consultations"
    ON public.consultations FOR UPDATE TO authenticated
    USING (
        doctor_id IS NULL
        AND specialty IN (
            SELECT specialty FROM public.doctors WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- 4. Doctor RLS — SELECT unassigned consultations
--    Doctors need to see the queue
-- ============================================
CREATE POLICY "Doctors see unassigned consultations in specialty"
    ON public.consultations FOR SELECT TO authenticated
    USING (
        doctor_id IS NULL
        AND specialty IN (
            SELECT specialty FROM public.doctors WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- 5. Doctors can read own profile
-- ============================================
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can view own profile"
    ON public.doctors FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Doctors can update own profile"
    ON public.doctors FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

-- ============================================
-- 6. Feedback table
-- ============================================
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.users(id),
    doctor_id UUID NOT NULL REFERENCES public.doctors(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(consultation_id, patient_id)
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can insert own feedback"
    ON public.feedback FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients can view own feedback"
    ON public.feedback FOR SELECT TO authenticated
    USING (auth.uid() = patient_id);

CREATE POLICY "Doctors can view their feedback"
    ON public.feedback FOR SELECT TO authenticated
    USING (
        doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
    );

CREATE INDEX idx_feedback_consultation ON public.feedback(consultation_id);
CREATE INDEX idx_feedback_doctor ON public.feedback(doctor_id);
