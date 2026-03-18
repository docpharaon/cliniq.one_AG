-- ═══════════════════════════════════════════════════════════
-- Migration 013: Chat Reports
-- Patient-submitted reports about AI chat errors/misbehavior
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS chat_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL,
    session_id TEXT,
    category TEXT NOT NULL DEFAULT 'other'
        CHECK (category IN (
            'wrong_question', 'repeated_question',
            'inappropriate', 'stuck_loop',
            'skipped_section', 'other'
        )),
    note TEXT NOT NULL,
    chat_snapshot JSONB NOT NULL DEFAULT '[]',
    diagnostic_data JSONB DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'new'
        CHECK (status IN ('new', 'reviewed', 'resolved')),
    admin_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_reports_patient ON chat_reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_chat_reports_status ON chat_reports(status);
CREATE INDEX IF NOT EXISTS idx_chat_reports_created ON chat_reports(created_at DESC);

-- RLS
ALTER TABLE chat_reports ENABLE ROW LEVEL SECURITY;

-- Patients can insert their own reports
CREATE POLICY chat_reports_patient_insert ON chat_reports
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = patient_id);

-- Patients can see their own reports
CREATE POLICY chat_reports_patient_select ON chat_reports
    FOR SELECT TO authenticated
    USING (auth.uid() = patient_id);
