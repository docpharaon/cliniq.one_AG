-- ══════════════════════════════════════════════════════════════════
-- Migration: External Report Upload System
-- Adds infrastructure for patients to upload external medical reports
-- (labs, imaging, pathology) for an extra token cost.
-- Also supports doctor re-enforcement (request reports post-consult).
-- ══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════
-- 1. Report Upload Tracking Table
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.consultation_report_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_urls TEXT[] NOT NULL DEFAULT '{}',
    report_type TEXT NOT NULL DEFAULT 'general',
    -- report_type values: 'lab', 'imaging', 'pathology', 'growth_chart',
    --                     'vaccination', 'body_composition', 'previous_report', 'general'
    token_charged BOOLEAN DEFAULT false,
    tokens_amount INTEGER DEFAULT 1,
    requested_by TEXT NOT NULL DEFAULT 'patient_voluntary',
    -- requested_by values: 'patient_voluntary', 'doctor_request'
    doctor_inquiry_id UUID REFERENCES public.doctor_inquiries(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    -- status values: 'pending', 'uploaded', 'reviewed'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_report_uploads_consultation
    ON public.consultation_report_uploads(consultation_id);
CREATE INDEX IF NOT EXISTS idx_report_uploads_patient
    ON public.consultation_report_uploads(patient_id);

-- RLS
ALTER TABLE public.consultation_report_uploads ENABLE ROW LEVEL SECURITY;

-- Patients can see their own uploads
DROP POLICY IF EXISTS "patients_view_own_uploads" ON public.consultation_report_uploads;
CREATE POLICY "patients_view_own_uploads"
    ON public.consultation_report_uploads FOR SELECT TO authenticated
    USING (patient_id = auth.uid());

-- Patients can insert their own uploads
DROP POLICY IF EXISTS "patients_insert_own_uploads" ON public.consultation_report_uploads;
CREATE POLICY "patients_insert_own_uploads"
    ON public.consultation_report_uploads FOR INSERT TO authenticated
    WITH CHECK (patient_id = auth.uid());

-- Doctors can view uploads for their consultations
DROP POLICY IF EXISTS "doctors_view_consultation_uploads" ON public.consultation_report_uploads;
CREATE POLICY "doctors_view_consultation_uploads"
    ON public.consultation_report_uploads FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.consultations c
            WHERE c.id = consultation_id
            AND c.doctor_id = auth.uid()
        )
    );

-- Doctors can update status (mark as reviewed)
DROP POLICY IF EXISTS "doctors_update_upload_status" ON public.consultation_report_uploads;
CREATE POLICY "doctors_update_upload_status"
    ON public.consultation_report_uploads FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.consultations c
            WHERE c.id = consultation_id
            AND c.doctor_id = auth.uid()
        )
    );

-- Admins can see all
DROP POLICY IF EXISTS "admins_manage_uploads" ON public.consultation_report_uploads;
CREATE POLICY "admins_manage_uploads"
    ON public.consultation_report_uploads FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );


-- ═══════════════════════════════════════════════════
-- 2. Storage Bucket for Report Files
-- ═══════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'consultation-reports',
    'consultation-reports',
    false,
    10485760, -- 10MB per file
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- Patients can upload to their own folder
DROP POLICY IF EXISTS "patients_upload_reports" ON storage.objects;
CREATE POLICY "patients_upload_reports"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'consultation-reports'
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
    );

-- Patients can view their own files
DROP POLICY IF EXISTS "patients_view_own_reports" ON storage.objects;
CREATE POLICY "patients_view_own_reports"
    ON storage.objects FOR SELECT TO authenticated
    USING (
        bucket_id = 'consultation-reports'
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
    );

-- Doctors can view files for their consultations
DROP POLICY IF EXISTS "doctors_view_patient_reports" ON storage.objects;
CREATE POLICY "doctors_view_patient_reports"
    ON storage.objects FOR SELECT TO authenticated
    USING (
        bucket_id = 'consultation-reports'
        AND EXISTS (
            SELECT 1 FROM public.consultation_report_uploads ru
            JOIN public.consultations c ON c.id = ru.consultation_id
            WHERE c.doctor_id = auth.uid()
            AND ru.patient_id::TEXT = (storage.foldername(name))[1]
        )
    );


-- ═══════════════════════════════════════════════════
-- 3. Add external_report nodes to existing sequences
-- ═══════════════════════════════════════════════════

-- Psychiatry — add external_reports node before patient_addendum
DO $$
DECLARE
    seq_id UUID;
BEGIN
    SELECT id INTO seq_id FROM prompt_sequences WHERE name = 'Psychiatry Intake Flow' LIMIT 1;
    IF seq_id IS NOT NULL THEN
        INSERT INTO prompt_sequence_nodes (sequence_id, step_key, label, emoji, sort_order, pathway_condition)
        VALUES (seq_id, 'external_reports', 'External Reports Upload', '📎', 105, 'psychiatry_general')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Orthopedics — add external_reports node before patient_addendum
DO $$
DECLARE
    seq_id UUID;
BEGIN
    SELECT id INTO seq_id FROM prompt_sequences WHERE name = 'Orthopedics Intake Flow' LIMIT 1;
    IF seq_id IS NOT NULL THEN
        INSERT INTO prompt_sequence_nodes (sequence_id, step_key, label, emoji, sort_order, pathway_condition)
        VALUES (seq_id, 'external_reports', 'External Reports Upload', '📎', 95, 'orthopedics_general')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;


-- ═══════════════════════════════════════════════════
-- 4. Shared External Report Prompts for Psych & Ortho
-- ═══════════════════════════════════════════════════
INSERT INTO ai_prompts (name, specialty, prompt_type, content, is_active, version)
VALUES (
    'Psychiatry — External Reports Upload',
    'psychiatry',
    'intake',
    'You are offering the patient the option to upload existing psychiatric reports for the doctor''s review.

SECTION RULES:

1. ASK: "Do you have any existing reports that might help the psychiatrist? For example:
   - Previous psychiatric evaluation reports
   - Psychological testing results (e.g., PHQ-9, MMPI, neuropsychological testing)
   - Previous therapy notes or treatment summaries
   - Blood test results related to your treatment (thyroid, lithium levels, metabolic panel)
   - Brain imaging reports (EEG, MRI) if available"

2. If YES: "Great! Uploading reports for the psychiatrist''s review costs 1 additional token. Having your previous evaluations helps avoid repeating assessments and ensures continuity of care. Would you like to upload now?"
   - If they agree: end with [UPLOAD_REPORTS]
   - If they decline: "No problem at all. Your psychiatrist can request them later if needed."
     End with [REPORTS_DECLINED]

3. If NO: "That''s perfectly fine. Let''s continue."
   End with [SECTION_COMPLETE]

4. Do NOT pressure the patient. One ask only. Be supportive.',
    true,
    1
)
ON CONFLICT DO NOTHING;

INSERT INTO ai_prompts (name, specialty, prompt_type, content, is_active, version)
VALUES (
    'Orthopedics — External Reports Upload',
    'orthopedics',
    'intake',
    'You are offering the patient the option to upload existing medical reports for the orthopedic specialist''s review.

SECTION RULES:

1. ASK: "Do you have any existing reports or images that might help the orthopedic specialist? For example:
   - X-ray reports or images
   - MRI scan reports or images
   - CT scan reports
   - Bone density (DEXA) scan results
   - Previous orthopedic surgeon reports
   - Physical therapy progress notes
   - Blood test results (ESR, CRP, uric acid, vitamin D)"

2. If YES: "Great! Uploading reports for the specialist''s review costs 1 additional token. Having your imaging and previous reports helps the doctor assess your condition much more accurately. Would you like to upload now?"
   - If they agree: end with [UPLOAD_REPORTS]
   - If they decline: "No problem. The specialist can request them later if felt necessary."
     End with [REPORTS_DECLINED]

3. If NO: "That''s fine. Let''s continue."
   End with [SECTION_COMPLETE]

4. Do NOT pressure the patient. One ask only.',
    true,
    1
)
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════
-- 5. Updated_at trigger
-- ═══════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_report_uploads_updated ON public.consultation_report_uploads;
CREATE TRIGGER trg_report_uploads_updated
    BEFORE UPDATE ON public.consultation_report_uploads
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
