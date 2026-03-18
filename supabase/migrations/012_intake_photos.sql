-- ═══════════════════════════════════════════════════════════
-- Migration 012: Intake Photos
-- Stores references to patient-uploaded skin lesion photos
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS intake_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES intake_sessions(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL,
    storage_path TEXT NOT NULL,
    file_size_bytes INTEGER,
    mime_type TEXT DEFAULT 'image/jpeg',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    consent_given_at TIMESTAMPTZ NOT NULL,
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Index for fast lookup by session
CREATE INDEX IF NOT EXISTS idx_intake_photos_session ON intake_photos(session_id);
CREATE INDEX IF NOT EXISTS idx_intake_photos_patient ON intake_photos(patient_id);

-- RLS: patients can insert/read their own, staff can read all
ALTER TABLE intake_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY intake_photos_patient_insert ON intake_photos
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = patient_id);

CREATE POLICY intake_photos_patient_select ON intake_photos
    FOR SELECT TO authenticated
    USING (auth.uid() = patient_id);

-- Storage bucket policy (run via Supabase dashboard or SQL):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('intake-photos', 'intake-photos', false);
