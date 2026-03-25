-- ══════════════════════════════════════════════════════════════
-- 20260325004_admin_notifications.sql
-- Admin notification system with per-type on/off toggles
-- Covers: consultation submitted, user registered, user login
-- ══════════════════════════════════════════════════════════════

-- ── 1. admin_notifications table ────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL DEFAULT 'info'
      CHECK (type IN ('consultation_submitted', 'user_registered', 'user_login', 'system', 'info')),
    title TEXT NOT NULL,
    message TEXT NOT NULL DEFAULT '',
    metadata JSONB DEFAULT '{}',
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_unread
  ON public.admin_notifications(read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_type
  ON public.admin_notifications(type, created_at DESC);

-- ── 2. RLS: admin-only access ───────────────────────────────
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all notifications"
  ON public.admin_notifications FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can update notifications"
  ON public.admin_notifications FOR UPDATE TO authenticated
  USING (public.is_admin());

-- No INSERT policy for authenticated — inserts via SECURITY DEFINER triggers only

-- ── 3. Enable realtime ─────────────────────────────────────
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 4. Seed notification toggle settings ───────────────────
INSERT INTO public.app_settings (key, value) VALUES
  ('admin_notify_consultation_submitted', '"true"'::jsonb),
  ('admin_notify_user_registered', '"true"'::jsonb),
  ('admin_notify_user_login', '"false"'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ── 5. Helper: check if a notification toggle is ON ────────
CREATE OR REPLACE FUNCTION public.is_admin_notify_enabled(p_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT value::text = '"true"' OR value::text = 'true'
     FROM public.app_settings WHERE key = p_key),
    FALSE
  );
$$;

-- ── 6. Update consultation trigger to also notify admins ───
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

  -- Status: assigned → notify patient + doctor
  IF NEW.status = 'assigned' AND NEW.doctor_id IS NOT NULL THEN
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

  -- Status: submitted → notify doctors + ADMIN
  IF NEW.status = 'submitted' THEN
    -- Notify matching doctors
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

    -- ★ NEW: Notify admins (if toggle is ON)
    IF public.is_admin_notify_enabled('admin_notify_consultation_submitted') THEN
      INSERT INTO public.admin_notifications
        (type, title, message, metadata)
      VALUES (
        'consultation_submitted',
        'New Consultation Submitted',
        'Patient ' || COALESCE(v_patient_nickname, 'Unknown') || ' — ' || COALESCE(NEW.chief_complaint, 'No complaint'),
        jsonb_build_object(
          'consultation_id', NEW.id,
          'patient_id', NEW.patient_id,
          'specialty', COALESCE(NEW.specialty, 'general')
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$fn$;

-- ── 7. Trigger: notify admin on new user registration ──────
CREATE OR REPLACE FUNCTION public.notify_admin_user_registered()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
BEGIN
  -- Only fire for patient registrations (not doctors/admins created by admin)
  IF NEW.role = 'patient' AND public.is_admin_notify_enabled('admin_notify_user_registered') THEN
    INSERT INTO public.admin_notifications
      (type, title, message, metadata)
    VALUES (
      'user_registered',
      'New User Registered',
      COALESCE(NEW.nickname, 'Unknown') || ' (' || COALESCE(NEW.email, 'no email') || ')',
      jsonb_build_object(
        'user_id', NEW.id,
        'nickname', COALESCE(NEW.nickname, ''),
        'email', COALESCE(NEW.email, '')
      )
    );
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_admin_notify_user_registered ON public.users;
CREATE TRIGGER trg_admin_notify_user_registered
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_user_registered();

-- ── 8. Trigger: notify admin on user login ─────────────────
-- Supabase syncs auth.users.last_sign_in_at → public.users via auth hooks.
-- We detect login by watching for last_sign_in_at UPDATE changes.

-- First: ensure the column exists
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.notify_admin_user_login()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
BEGIN
  -- Only fire when last_sign_in_at actually changes
  IF OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at
     AND NEW.last_sign_in_at IS NOT NULL
     AND NEW.role = 'patient'
     AND public.is_admin_notify_enabled('admin_notify_user_login') THEN
    INSERT INTO public.admin_notifications
      (type, title, message, metadata)
    VALUES (
      'user_login',
      'User Logged In',
      COALESCE(NEW.nickname, 'Unknown') || ' just signed in',
      jsonb_build_object(
        'user_id', NEW.id,
        'nickname', COALESCE(NEW.nickname, ''),
        'signed_in_at', NEW.last_sign_in_at
      )
    );
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_admin_notify_user_login ON public.users;
CREATE TRIGGER trg_admin_notify_user_login
  AFTER UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_user_login();
