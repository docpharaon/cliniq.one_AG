-- ══════════════════════════════════════════════════════════════
-- 20260325001_push_notifications.sql
-- Push notification infrastructure + patient notifications
-- + security fix for doctor_notifications INSERT policy
-- ══════════════════════════════════════════════════════════════

-- ── 0. Ensure is_admin() helper exists ──────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ── 1. Add push columns to users ─────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS push_token TEXT,
  ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT FALSE;

-- Index for looking up users by push_token
CREATE INDEX IF NOT EXISTS idx_users_push_token
  ON public.users (push_token)
  WHERE push_token IS NOT NULL AND push_enabled = TRUE;

-- ── 2. Patient notifications table ──────────────────────────
CREATE TABLE IF NOT EXISTS public.patient_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'info'
      CHECK (type IN ('assigned', 'report_ready', 'message', 'system', 'info')),
    title TEXT NOT NULL,
    message TEXT NOT NULL DEFAULT '',
    consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_notifications_patient
  ON public.patient_notifications(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_notifications_unread
  ON public.patient_notifications(patient_id, read, created_at DESC);

ALTER TABLE public.patient_notifications ENABLE ROW LEVEL SECURITY;

-- Patients see only their own
CREATE POLICY "Patients read own notifications"
  ON public.patient_notifications FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

-- Patients can mark their own as read
CREATE POLICY "Patients update own notifications"
  ON public.patient_notifications FOR UPDATE TO authenticated
  USING (patient_id = auth.uid());

-- Only service role can insert (via triggers / edge functions that bypass RLS)
-- No INSERT policy for authenticated users = denied by default

-- ── 3. Ensure doctor_notifications table exists ─────────────
-- (Copied from 20260318 migration as a safety net for remote DBs that didn't run it)
CREATE TABLE IF NOT EXISTS public.doctor_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'info',
    title TEXT NOT NULL,
    message TEXT NOT NULL DEFAULT '',
    consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doctor_notifications_doctor ON public.doctor_notifications(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_notifications_read ON public.doctor_notifications(doctor_id, read, created_at DESC);

ALTER TABLE public.doctor_notifications ENABLE ROW LEVEL SECURITY;

-- Doctor read/update policies (idempotent via IF NOT EXISTS workaround)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'doctor_notifications' AND policyname = 'Doctors can view own notifications'
  ) THEN
    CREATE POLICY "Doctors can view own notifications" ON public.doctor_notifications
      FOR SELECT TO authenticated USING (doctor_id IN (
        SELECT id FROM public.doctors WHERE user_id = auth.uid()
      ));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'doctor_notifications' AND policyname = 'Doctors can update own notifications'
  ) THEN
    CREATE POLICY "Doctors can update own notifications" ON public.doctor_notifications
      FOR UPDATE TO authenticated USING (doctor_id IN (
        SELECT id FROM public.doctors WHERE user_id = auth.uid()
      ));
  END IF;
END $$;

-- ── 4. Fix doctor_notifications INSERT policy ───────────────
-- Current policy is too permissive (allows any authenticated user)
DROP POLICY IF EXISTS "Service can insert notifications" ON public.doctor_notifications;

-- Only admin or service role can insert
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'doctor_notifications' AND policyname = 'Admin can insert doctor notifications'
  ) THEN
    CREATE POLICY "Admin can insert doctor notifications"
      ON public.doctor_notifications FOR INSERT TO authenticated
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- ── 5. Enable realtime on notification tables ───────────────
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.doctor_notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 5. Consultation status change trigger ───────────────────
-- Automatically creates notifications when consultation status changes

CREATE OR REPLACE FUNCTION public.notify_consultation_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  v_patient_nickname TEXT;
  v_doctor_name TEXT;
  v_doctor_id UUID;
BEGIN
  -- Only fire on status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get patient info
  SELECT nickname INTO v_patient_nickname
    FROM public.users WHERE id = NEW.patient_id;

  -- Status: assigned → notify patient
  IF NEW.status = 'assigned' AND NEW.doctor_id IS NOT NULL THEN
    -- Get doctor display name
    SELECT display_name, id INTO v_doctor_name, v_doctor_id
      FROM public.doctors WHERE id = NEW.doctor_id;

    INSERT INTO public.patient_notifications
      (patient_id, type, title, message, consultation_id)
    VALUES (
      NEW.patient_id,
      'assigned',
      'Doctor Assigned',
      COALESCE(v_doctor_name, 'A doctor') || ' has been assigned to your consultation.',
      NEW.id
    );

    -- Also notify doctor
    INSERT INTO public.doctor_notifications
      (doctor_id, type, title, message, consultation_id)
    VALUES (
      NEW.doctor_id,
      'assignment',
      'New Consultation Assigned',
      'Patient ' || COALESCE(v_patient_nickname, 'Unknown') || ' — ' || COALESCE(NEW.chief_complaint, 'No complaint'),
      NEW.id
    );
  END IF;

  -- Status: report_ready → notify patient
  IF NEW.status = 'report_ready' THEN
    INSERT INTO public.patient_notifications
      (patient_id, type, title, message, consultation_id)
    VALUES (
      NEW.patient_id,
      'report_ready',
      'Your Report is Ready',
      'Your doctor has completed their review. Tap to view your report.',
      NEW.id
    );
  END IF;

  -- Status: submitted → notify admins (system notification)
  IF NEW.status = 'submitted' THEN
    -- Insert into doctor_notifications for all active doctors of this specialty
    INSERT INTO public.doctor_notifications
      (doctor_id, type, title, message, consultation_id)
    SELECT
      d.id,
      'assignment',
      'New Consultation Available',
      'Patient ' || COALESCE(v_patient_nickname, 'Unknown') || ' — ' || COALESCE(NEW.chief_complaint, 'No complaint'),
      NEW.id
    FROM public.doctors d
    WHERE d.status = 'active'
      AND d.is_accepting = TRUE
      AND (d.specialty = NEW.specialty OR NEW.specialty IS NULL);
  END IF;

  RETURN NEW;
END;
$fn$;

-- Drop if exists to allow re-running
DROP TRIGGER IF EXISTS trg_consultation_status_notify ON public.consultations;

CREATE TRIGGER trg_consultation_status_notify
  AFTER UPDATE ON public.consultations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_consultation_status_change();
