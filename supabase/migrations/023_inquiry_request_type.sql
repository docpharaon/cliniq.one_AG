-- ──────────────────────────────────────────────────────────
-- Add request_type to doctor_inquiries table
-- Enables structured photo/document requests from doctors
-- Default 'text' for backward compatibility
-- ──────────────────────────────────────────────────────────

ALTER TABLE public.doctor_inquiries
    ADD COLUMN IF NOT EXISTS request_type TEXT NOT NULL DEFAULT 'text'
    CONSTRAINT chk_request_type CHECK (request_type IN ('text', 'skin_photo', 'medication_photo', 'document_photo'));

CREATE INDEX IF NOT EXISTS idx_doctor_inquiries_request_type
    ON public.doctor_inquiries(request_type)
    WHERE status = 'pending';

COMMENT ON COLUMN public.doctor_inquiries.request_type IS
    'Type of request: text (question), skin_photo (request skin photo), medication_photo (request drug label photo), document_photo (request document scan)';
