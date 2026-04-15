-- 20260413004_doctor_drafts.sql
-- Enable cross-device synchronization for response drafts

CREATE TABLE IF NOT EXISTS public.doctor_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb, -- Store stuff like 'last_save_type' (manual/auto)
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(doctor_id, consultation_id)
);

-- Enable RLS
ALTER TABLE public.doctor_drafts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Doctors can manage their own drafts"
ON public.doctor_drafts
FOR ALL
USING (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()))
WITH CHECK (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()));

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_doctor_drafts_consultation ON public.doctor_drafts(consultation_id);

-- Updated at trigger
CREATE TRIGGER set_doctor_drafts_updated_at
BEFORE UPDATE ON public.doctor_drafts
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
