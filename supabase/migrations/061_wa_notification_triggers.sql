-- ══════════════════════════════════════════════════════════════
-- 061_wa_notification_triggers.sql
-- Automate WhatsApp notifications for reports and results
-- ══════════════════════════════════════════════════════════════

-- 1. Expand wa_notification_log to support consultations
ALTER TABLE public.wa_notification_log
    ADD COLUMN IF NOT EXISTS consultation_id UUID REFERENCES public.consultations(id) ON DELETE CASCADE,
    ALTER COLUMN booking_id DROP NOT NULL;

-- 2. Update notification_type constraint
ALTER TABLE public.wa_notification_log
    DROP CONSTRAINT IF EXISTS wa_notification_log_notification_type_check,
    ADD CONSTRAINT wa_notification_log_notification_type_check
    CHECK (notification_type IN (
        'confirmation', 
        'reminder_24h', 
        'reminder_2h', 
        'cancellation',
        'report_ready',
        'lab_results'
    ));

-- 3. Trigger Function: Queue Report Ready Notification
CREATE OR REPLACE FUNCTION public.fn_notify_report_ready()
RETURNS TRIGGER AS $$
DECLARE
    v_phone TEXT;
BEGIN
    -- Only trigger when status changes to 'report_ready'
    IF (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'report_ready') THEN
        -- Get patient phone
        SELECT phone INTO v_phone
        FROM public.users
        WHERE id = NEW.patient_id;

        IF v_phone IS NOT NULL AND v_phone != '' THEN
            INSERT INTO public.wa_notification_log (
                consultation_id, 
                channel, 
                notification_type, 
                recipient_phone
            ) VALUES (
                NEW.id,
                'whatsapp',
                'report_ready',
                v_phone
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger: trg_notify_report_ready
DROP TRIGGER IF EXISTS trg_notify_report_ready ON public.consultations;
CREATE TRIGGER trg_notify_report_ready
    AFTER UPDATE ON public.consultations
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_notify_report_ready();

-- 5. Trigger Function: Queue Lab Results Notification
CREATE OR REPLACE FUNCTION public.fn_notify_lab_results()
RETURNS TRIGGER AS $$
DECLARE
    v_phone TEXT;
BEGIN
    -- Trigger when intervention status changes to 'results_ready' or 'completed'
    IF (OLD.status IS DISTINCT FROM NEW.status AND (NEW.status = 'results_ready' OR NEW.status = 'completed')) THEN
        -- Get patient phone via consultation
        SELECT u.phone INTO v_phone
        FROM public.users u
        JOIN public.consultations c ON c.patient_id = u.id
        WHERE c.id = NEW.consultation_id;

        IF v_phone IS NOT NULL AND v_phone != '' THEN
            INSERT INTO public.wa_notification_log (
                consultation_id, 
                channel, 
                notification_type, 
                recipient_phone
            ) VALUES (
                NEW.consultation_id,
                'whatsapp',
                'lab_results',
                v_phone
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger: trg_notify_lab_results
DROP TRIGGER IF EXISTS trg_notify_lab_results ON public.interventions;
CREATE TRIGGER trg_notify_lab_results
    AFTER UPDATE ON public.interventions
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_notify_lab_results();


-- 7. Trigger Function: Queue Booking Notifications (Confirmation/Cancellation)
CREATE OR REPLACE FUNCTION public.fn_notify_booking_updates()
RETURNS TRIGGER AS $$
DECLARE
    v_notif_type TEXT;
BEGIN
    -- Determine notification type
    IF (TG_OP = 'INSERT' AND NEW.status = 'confirmed') OR
       (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'confirmed') THEN
        v_notif_type := 'confirmation';
    ELSIF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'cancelled') THEN
        v_notif_type := 'cancellation';
    ELSE
        RETURN NEW;
    END IF;

    IF NEW.patient_phone IS NOT NULL AND NEW.patient_phone != '' THEN
        INSERT INTO public.wa_notification_log (
            booking_id, 
            channel, 
            notification_type, 
            recipient_phone
        ) VALUES (
            NEW.id,
            'whatsapp',
            v_notif_type,
            NEW.patient_phone
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Trigger: trg_notify_booking_updates
DROP TRIGGER IF EXISTS trg_notify_booking_confirmation ON public.wa_bookings;
DROP TRIGGER IF EXISTS trg_notify_booking_updates ON public.wa_bookings;
CREATE TRIGGER trg_notify_booking_updates
    AFTER INSERT OR UPDATE ON public.wa_bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_notify_booking_updates();

-- ══════════════════════════════════════════════════════════════
-- Done. Automated notifications enabled for:
--   • Consultations -> 'report_ready'
--   • Interventions -> 'results_ready' OR 'completed'
-- ══════════════════════════════════════════════════════════════
