-- ============================================
-- cliniq.one Migration 005: Consultation Lifecycle
-- Adds deadline enforcement, urgency fees, archival & purge support
-- ============================================

-- ============================================
-- 1. New columns on consultations
-- ============================================
ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS deadline_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS urgent_fee INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS concluded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS purged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS purged_by UUID REFERENCES public.users(id);

-- Index for overdue queries
CREATE INDEX IF NOT EXISTS idx_consultations_deadline
  ON public.consultations(deadline_at)
  WHERE deadline_at IS NOT NULL AND purged_at IS NULL;

-- Index for archive/purge filtering
CREATE INDEX IF NOT EXISTS idx_consultations_archived
  ON public.consultations(archived_at)
  WHERE archived_at IS NOT NULL;

-- ============================================
-- 2. Consultation audit log
-- ============================================
CREATE TABLE IF NOT EXISTS public.consultation_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('print_pdf', 'archive', 'purge', 'set_deadline', 'mark_overdue')),
  performed_by UUID NOT NULL REFERENCES public.users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_consultation
  ON public.consultation_audit_log(consultation_id);

CREATE INDEX IF NOT EXISTS idx_audit_action
  ON public.consultation_audit_log(action);

-- RLS: admin-only access (via service role key, no RLS needed for admin panel)
ALTER TABLE public.consultation_audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. Auto-set deadline when doctor is assigned
-- ============================================
CREATE OR REPLACE FUNCTION public.set_consultation_deadline()
RETURNS TRIGGER AS $$
DECLARE
  v_target_minutes INTEGER;
  v_is_urgent BOOLEAN;
  v_urgent_minutes INTEGER;
BEGIN
  -- Only fire when doctor_id changes from NULL to a value
  IF OLD.doctor_id IS NULL AND NEW.doctor_id IS NOT NULL THEN
    -- Check if urgent
    v_is_urgent := (NEW.priority = 'urgent');

    -- Try to read from platform_settings, fall back to defaults
    BEGIN
      SELECT value::INTEGER INTO v_target_minutes
      FROM public.platform_settings
      WHERE key = 'consultation_deadline_minutes'
      LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      v_target_minutes := NULL;
    END;

    IF v_target_minutes IS NULL THEN
      v_target_minutes := 30; -- default from config
    END IF;

    IF v_is_urgent THEN
      BEGIN
        SELECT value::INTEGER INTO v_urgent_minutes
        FROM public.platform_settings
        WHERE key = 'urgent_deadline_minutes'
        LIMIT 1;
      EXCEPTION WHEN OTHERS THEN
        v_urgent_minutes := NULL;
      END;

      IF v_urgent_minutes IS NULL THEN
        v_urgent_minutes := 15; -- default from config
      END IF;

      v_target_minutes := v_urgent_minutes;
    END IF;

    NEW.deadline_at := NOW() + (v_target_minutes || ' minutes')::INTERVAL;
    NEW.assigned_at := COALESCE(NEW.assigned_at, NOW());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop if exists to allow re-run
DROP TRIGGER IF EXISTS trg_set_consultation_deadline ON public.consultations;

CREATE TRIGGER trg_set_consultation_deadline
  BEFORE UPDATE ON public.consultations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_consultation_deadline();
