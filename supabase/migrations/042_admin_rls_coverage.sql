-- ══════════════════════════════════════════════════════════════
-- 042_admin_rls_coverage.sql
-- Security audit fix: Add admin RLS policies to tables that
-- have RLS enabled but no explicit admin access policy.
-- These tables currently work because queries.ts uses
-- supabaseAdmin (service role), but this migration ensures
-- admin access is properly defined at the DB level as a
-- safety net for any future code changes.
-- ══════════════════════════════════════════════════════════════

-- ── Orthopedics module (030) ────────────────────────────────
DROP POLICY IF EXISTS "admin_read_orthopedic_intake" ON public.orthopedic_intake;
CREATE POLICY "admin_read_orthopedic_intake" ON public.orthopedic_intake
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admin_read_musculoskeletal_exam" ON public.musculoskeletal_exam;
CREATE POLICY "admin_read_musculoskeletal_exam" ON public.musculoskeletal_exam
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admin_read_physical_therapy_plan" ON public.physical_therapy_plan;
CREATE POLICY "admin_read_physical_therapy_plan" ON public.physical_therapy_plan
  FOR SELECT TO authenticated USING (public.is_admin());

-- ── Psychiatry module (025) ─────────────────────────────────
DROP POLICY IF EXISTS "admin_read_psychiatric_intake" ON public.psychiatric_intake;
CREATE POLICY "admin_read_psychiatric_intake" ON public.psychiatric_intake
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admin_read_mental_status_exam" ON public.mental_status_exam;
CREATE POLICY "admin_read_mental_status_exam" ON public.mental_status_exam
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admin_read_risk_assessment" ON public.risk_assessment;
CREATE POLICY "admin_read_risk_assessment" ON public.risk_assessment
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admin_read_screening_scores" ON public.screening_scores;
CREATE POLICY "admin_read_screening_scores" ON public.screening_scores
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admin_read_psychiatric_diagnosis" ON public.psychiatric_diagnosis;
CREATE POLICY "admin_read_psychiatric_diagnosis" ON public.psychiatric_diagnosis
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admin_read_medication_plan" ON public.medication_plan;
CREATE POLICY "admin_read_medication_plan" ON public.medication_plan
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admin_read_therapy_plan" ON public.therapy_plan;
CREATE POLICY "admin_read_therapy_plan" ON public.therapy_plan
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admin_read_followup_plan" ON public.followup_plan;
CREATE POLICY "admin_read_followup_plan" ON public.followup_plan
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admin_read_consent_records" ON public.consent_records;
CREATE POLICY "admin_read_consent_records" ON public.consent_records
  FOR SELECT TO authenticated USING (public.is_admin());

-- ── Chat reports (013) ──────────────────────────────────────
DROP POLICY IF EXISTS "admin_read_chat_reports" ON public.chat_reports;
CREATE POLICY "admin_read_chat_reports" ON public.chat_reports
  FOR SELECT TO authenticated USING (public.is_admin());

-- ── Intake photos (012) ─────────────────────────────────────
DROP POLICY IF EXISTS "admin_read_intake_photos" ON public.intake_photos;
CREATE POLICY "admin_read_intake_photos" ON public.intake_photos
  FOR SELECT TO authenticated USING (public.is_admin());

-- ── Campaigns (026) ─────────────────────────────────────────
DROP POLICY IF EXISTS "admin_manage_campaigns" ON public.campaigns;
CREATE POLICY "admin_manage_campaigns" ON public.campaigns
  FOR ALL TO authenticated USING (public.is_admin());

-- ── Health tips (026) ───────────────────────────────────────
DROP POLICY IF EXISTS "admin_manage_health_tips" ON public.health_tips;
CREATE POLICY "admin_manage_health_tips" ON public.health_tips
  FOR ALL TO authenticated USING (public.is_admin());

-- ── Doctor applications (033) ───────────────────────────────
DROP POLICY IF EXISTS "admin_manage_doctor_applications" ON public.doctor_applications;
CREATE POLICY "admin_manage_doctor_applications" ON public.doctor_applications
  FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admin_manage_application_documents" ON public.doctor_application_documents;
CREATE POLICY "admin_manage_application_documents" ON public.doctor_application_documents
  FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admin_read_application_audit" ON public.doctor_application_audit;
CREATE POLICY "admin_read_application_audit" ON public.doctor_application_audit
  FOR SELECT TO authenticated USING (public.is_admin());

-- ── Consultation report uploads (039) ───────────────────────
DROP POLICY IF EXISTS "admin_read_report_uploads" ON public.consultation_report_uploads;
CREATE POLICY "admin_read_report_uploads" ON public.consultation_report_uploads
  FOR SELECT TO authenticated USING (public.is_admin());

-- ── Refund requests (032) ───────────────────────────────────
DROP POLICY IF EXISTS "admin_manage_refund_requests" ON public.refund_requests;
CREATE POLICY "admin_manage_refund_requests" ON public.refund_requests
  FOR ALL TO authenticated USING (public.is_admin());

-- ── Consultation audit log (005) ────────────────────────────
DROP POLICY IF EXISTS "admin_read_consultation_audit" ON public.consultation_audit_log;
CREATE POLICY "admin_read_consultation_audit" ON public.consultation_audit_log
  FOR SELECT TO authenticated USING (public.is_admin());

-- ── Messages — add admin read policy ────────────────────────
DROP POLICY IF EXISTS "admin_read_messages" ON public.messages;
CREATE POLICY "admin_read_messages" ON public.messages
  FOR SELECT TO authenticated USING (public.is_admin());

-- ── AI Sessions — add admin read policy ─────────────────────
DROP POLICY IF EXISTS "admin_read_ai_sessions" ON public.ai_sessions;
CREATE POLICY "admin_read_ai_sessions" ON public.ai_sessions
  FOR SELECT TO authenticated USING (public.is_admin());

-- ── Doctor inquiries (021) ──────────────────────────────────
DROP POLICY IF EXISTS "admin_manage_doctor_inquiries" ON public.doctor_inquiries;
CREATE POLICY "admin_manage_doctor_inquiries" ON public.doctor_inquiries
  FOR ALL TO authenticated USING (public.is_admin());

-- ── ICD codes (027) — public read, admin write ──────────────
DROP POLICY IF EXISTS "admin_manage_icd_codes" ON public.icd_codes;
CREATE POLICY "admin_manage_icd_codes" ON public.icd_codes
  FOR ALL TO authenticated USING (public.is_admin());
