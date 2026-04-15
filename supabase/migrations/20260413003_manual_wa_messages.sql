-- 20260413003_manual_wa_messages.sql
-- Allow manual text messages in WhatsApp notification log

ALTER TABLE public.wa_notification_log
    DROP CONSTRAINT IF EXISTS wa_notification_log_notification_type_check,
    ADD CONSTRAINT wa_notification_log_notification_type_check
    CHECK (notification_type IN (
        'confirmation', 
        'reminder_24h', 
        'reminder_2h', 
        'cancellation',
        'report_ready',
        'lab_results',
        'manual_text',
        'manual_template'
    ));

-- Add RLS for manual insertions by admins
CREATE POLICY "Admins can insert manual notifications"
ON public.wa_notification_log
FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
