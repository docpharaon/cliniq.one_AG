-- ============================================
-- cliniq.one Migration 032: Consultation Refund System
-- Adds refund request management, token refund processing,
-- and expands consultation lifecycle with 'refunded' status.
-- ============================================

-- ============================================
-- 1. Add 'refunded' to consultation status
-- ============================================
ALTER TABLE public.consultations
  DROP CONSTRAINT IF EXISTS consultations_status_check;

ALTER TABLE public.consultations
  ADD CONSTRAINT consultations_status_check
  CHECK (status IN (
    'draft', 'intake_in_progress', 'pending_payment', 'submitted',
    'assigned', 'in_progress', 'inquiry_sent', 'report_ready',
    'completed', 'cancelled', 'refunded'
  ));

-- ============================================
-- 2. Refund Requests table
-- ============================================
CREATE TABLE IF NOT EXISTS public.refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Links
  consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES public.users(id),

  -- Request details
  requester_role TEXT NOT NULL CHECK (requester_role IN ('patient', 'doctor', 'admin')),
  reason_category TEXT NOT NULL CHECK (reason_category IN (
    -- Doctor reasons
    'insufficient_info', 'inappropriate_case', 'outside_specialty',
    'patient_unresponsive', 'technical_issue', 'duplicate_consultation',
    -- Patient reasons
    'unsatisfactory_response', 'delayed_response', 'wrong_specialty',
    'accidental_submission',
    -- Admin reasons
    'quality_issue', 'system_error', 'policy_violation',
    'patient_complaint', 'doctor_complaint',
    -- Shared
    'other'
  )),
  reason_text TEXT,
  refund_amount INTEGER NOT NULL CHECK (refund_amount > 0),

  -- Review workflow
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'rejected', 'auto_approved', 'processed'
  )),
  reviewed_by UUID REFERENCES public.users(id),
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate pending requests: one pending per consultation per role
  CONSTRAINT unique_pending_refund UNIQUE (consultation_id, requester_role)
    DEFERRABLE INITIALLY DEFERRED
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_refund_requests_consultation
  ON public.refund_requests(consultation_id);

CREATE INDEX IF NOT EXISTS idx_refund_requests_status
  ON public.refund_requests(status)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_refund_requests_requested_by
  ON public.refund_requests(requested_by);

CREATE INDEX IF NOT EXISTS idx_refund_requests_created
  ON public.refund_requests(created_at DESC);

-- ============================================
-- 3. Add refund columns to consultations
-- ============================================
ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refund_request_id UUID REFERENCES public.refund_requests(id);

-- ============================================
-- 4. Expand audit log action types
-- ============================================
ALTER TABLE public.consultation_audit_log
  DROP CONSTRAINT IF EXISTS consultation_audit_log_action_check;

ALTER TABLE public.consultation_audit_log
  ADD CONSTRAINT consultation_audit_log_action_check
  CHECK (action IN (
    'print_pdf', 'archive', 'purge', 'set_deadline', 'mark_overdue',
    'refund_requested', 'refund_approved', 'refund_rejected', 'refund_processed'
  ));

-- ============================================
-- 5. process_refund RPC — atomic refund execution
-- ============================================
CREATE OR REPLACE FUNCTION public.process_refund(
  p_refund_request_id UUID,
  p_admin_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_request RECORD;
  v_consultation RECORD;
  v_patient_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- 1. Fetch the refund request
  SELECT * INTO v_request
  FROM public.refund_requests
  WHERE id = p_refund_request_id;

  IF v_request IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Refund request not found');
  END IF;

  -- 2. Validate status (must be approved or auto_approved)
  IF v_request.status NOT IN ('approved', 'auto_approved') THEN
    RETURN jsonb_build_object('success', false, 'error',
      'Refund request must be approved before processing. Current status: ' || v_request.status);
  END IF;

  -- 3. Fetch the consultation
  SELECT * INTO v_consultation
  FROM public.consultations
  WHERE id = v_request.consultation_id;

  IF v_consultation IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Consultation not found');
  END IF;

  -- 4. Prevent double-processing
  IF v_consultation.status = 'refunded' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Consultation already refunded');
  END IF;

  -- 5. Get current patient balance
  SELECT tokens_balance INTO v_patient_balance
  FROM public.users
  WHERE id = v_consultation.patient_id;

  v_new_balance := v_patient_balance + v_request.refund_amount;

  -- 6. Credit tokens back to patient
  UPDATE public.users
  SET tokens_balance = v_new_balance,
      updated_at = NOW()
  WHERE id = v_consultation.patient_id;

  -- 7. Record the refund transaction
  INSERT INTO public.token_transactions (
    user_id, type, amount, balance_after, consultation_id, description
  ) VALUES (
    v_consultation.patient_id,
    'refund',
    v_request.refund_amount,
    v_new_balance,
    v_consultation.id,
    'Refund for consultation: ' || COALESCE(v_request.reason_category, 'N/A')
      || CASE WHEN v_request.requester_role = 'doctor' THEN ' (doctor-initiated)'
              WHEN v_request.requester_role = 'admin'  THEN ' (admin-initiated)'
              ELSE ' (patient-initiated)' END
  );

  -- 8. If doctor was assigned, reduce their tokens_earned
  IF v_consultation.doctor_id IS NOT NULL THEN
    UPDATE public.doctors
    SET tokens_earned = GREATEST(0, tokens_earned - v_request.refund_amount),
        updated_at = NOW()
    WHERE id = v_consultation.doctor_id;
  END IF;

  -- 9. Mark consultation as refunded
  UPDATE public.consultations
  SET status = 'refunded',
      refunded_at = NOW(),
      refund_request_id = p_refund_request_id
  WHERE id = v_consultation.id;

  -- 10. Mark refund request as processed
  UPDATE public.refund_requests
  SET status = 'processed'
  WHERE id = p_refund_request_id;

  -- 11. Audit log
  INSERT INTO public.consultation_audit_log (
    consultation_id, action, performed_by, metadata
  ) VALUES (
    v_consultation.id,
    'refund_processed',
    COALESCE(p_admin_user_id, v_request.requested_by),
    jsonb_build_object(
      'refund_request_id', p_refund_request_id,
      'refund_amount', v_request.refund_amount,
      'reason_category', v_request.reason_category,
      'requester_role', v_request.requester_role,
      'patient_new_balance', v_new_balance
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'refund_amount', v_request.refund_amount,
    'patient_new_balance', v_new_balance,
    'consultation_id', v_consultation.id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. Row Level Security
-- ============================================
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

-- Patients can see their own refund requests
CREATE POLICY "Patients see own refund requests"
  ON public.refund_requests FOR SELECT
  USING (
    requested_by = auth.uid()
    OR consultation_id IN (
      SELECT id FROM public.consultations WHERE patient_id = auth.uid()
    )
  );

-- Patients can create refund requests for their consultations
CREATE POLICY "Patients can request refunds"
  ON public.refund_requests FOR INSERT
  WITH CHECK (
    requested_by = auth.uid()
    AND requester_role = 'patient'
    AND consultation_id IN (
      SELECT id FROM public.consultations WHERE patient_id = auth.uid()
    )
  );

-- Doctors can see refund requests for their consultations
CREATE POLICY "Doctors see consultation refund requests"
  ON public.refund_requests FOR SELECT
  USING (
    consultation_id IN (
      SELECT id FROM public.consultations
      WHERE doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
    )
  );

-- Doctors can create refund requests for their assigned consultations
CREATE POLICY "Doctors can request refunds"
  ON public.refund_requests FOR INSERT
  WITH CHECK (
    requested_by = auth.uid()
    AND requester_role = 'doctor'
    AND consultation_id IN (
      SELECT id FROM public.consultations
      WHERE doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
    )
  );

-- ============================================
-- 7. Platform settings defaults for refund policy
-- ============================================
INSERT INTO public.platform_settings (key, value, description)
VALUES
  ('refund_eligibility_hours', '72', 'Hours after report_ready that patient can request refund'),
  ('refund_auto_approve_doctor_unstarted', 'true', 'Auto-approve doctor refunds if consultation is still in assigned status'),
  ('refund_max_per_doctor_monthly', '5', 'Maximum refund requests a doctor can submit per month before admin alert')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- 8. Enable Realtime for refund_requests
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.refund_requests;
