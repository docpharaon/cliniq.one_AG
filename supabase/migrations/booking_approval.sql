-- Migration: Add approval_status to doctor_locations for admin-gated management
-- All scheduling and location changes submitted by doctors are set to pending_review

-- Add approval_status to doctor_locations if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'doctor_locations' AND column_name = 'approval_status'
    ) THEN
        ALTER TABLE public.doctor_locations
            ADD COLUMN approval_status text NOT NULL DEFAULT 'pending_review'
            CHECK (approval_status IN ('pending_review', 'approved', 'rejected', 'draft'));
    END IF;
END $$;

-- Add approval_status to wa_bookings if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'wa_bookings' AND column_name = 'approval_status'
    ) THEN
        ALTER TABLE public.wa_bookings
            ADD COLUMN approval_status text DEFAULT 'confirmed';
    END IF;
END $$;

-- Add source column to wa_bookings if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'wa_bookings' AND column_name = 'source'
    ) THEN
        ALTER TABLE public.wa_bookings
            ADD COLUMN source text DEFAULT 'manual';
    END IF;
END $$;

-- Add source column to consultations if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'consultations' AND column_name = 'source'
    ) THEN
        ALTER TABLE public.consultations
            ADD COLUMN source text DEFAULT 'app';
    END IF;
END $$;

-- Create wa_doctor_requests table for follow-up requests
CREATE TABLE IF NOT EXISTS public.wa_doctor_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    consultation_id uuid NOT NULL REFERENCES public.consultations(id),
    doctor_id uuid NOT NULL REFERENCES public.doctors(id),
    request_type text NOT NULL CHECK (request_type IN ('photo', 'lab_result', 'text_question', 'medication_label')),
    metadata jsonb DEFAULT '{}',
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'completed', 'expired')),
    patient_response jsonb DEFAULT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- RLS policies for wa_doctor_requests
ALTER TABLE public.wa_doctor_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Doctors can manage their own requests"
    ON public.wa_doctor_requests
    FOR ALL
    USING (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()));

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_wa_doctor_requests_consultation
    ON public.wa_doctor_requests(consultation_id);

CREATE INDEX IF NOT EXISTS idx_wa_doctor_requests_doctor
    ON public.wa_doctor_requests(doctor_id, status);

-- Add skipped_sections to wa_chat_sessions if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'wa_chat_sessions' AND column_name = 'skipped_sections'
    ) THEN
        ALTER TABLE public.wa_chat_sessions
            ADD COLUMN skipped_sections text[] DEFAULT '{}';
    END IF;
END $$;
