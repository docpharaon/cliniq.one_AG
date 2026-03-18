-- ──────────────────────────────────────────────────────────
-- Doctor Notifications table
-- Stores notifications for doctors (assignments, completions, payments, system)
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.doctor_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'info',         -- assignment, completion, payment, system, urgent
    title TEXT NOT NULL,
    message TEXT NOT NULL DEFAULT '',
    consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_doctor_notifications_doctor ON public.doctor_notifications(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_notifications_read ON public.doctor_notifications(doctor_id, read, created_at DESC);

-- RLS
ALTER TABLE public.doctor_notifications ENABLE ROW LEVEL SECURITY;

-- Doctors can view their own notifications
CREATE POLICY "Doctors can view own notifications" ON public.doctor_notifications
    FOR SELECT TO authenticated USING (doctor_id IN (
        SELECT id FROM public.doctors WHERE user_id = auth.uid()
    ));

-- Doctors can update (mark read) their own notifications
CREATE POLICY "Doctors can update own notifications" ON public.doctor_notifications
    FOR UPDATE TO authenticated USING (doctor_id IN (
        SELECT id FROM public.doctors WHERE user_id = auth.uid()
    ));

-- Service role can insert notifications (for triggers/backend)
CREATE POLICY "Service can insert notifications" ON public.doctor_notifications
    FOR INSERT TO authenticated WITH CHECK (true);
