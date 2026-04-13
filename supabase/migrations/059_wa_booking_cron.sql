-- ══════════════════════════════════════════════════════════════
-- 059_wa_booking_cron.sql
-- Sets up pg_cron job to:
--   1. Flag reminders every 30 minutes (wa_send_reminders RPC)
--   2. Invoke wa-notify edge function to process notification queue
-- ══════════════════════════════════════════════════════════════

-- Enable pg_cron extension (already enabled on most Supabase projects)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- ── Cron Job: Flag booking reminders every 30 min ──
-- This calls the wa_send_reminders() RPC which:
--   • Finds bookings needing 24h reminder and queues them
--   • Finds bookings needing 2h reminder and queues them
--   • Returns count of flagged notifications

SELECT cron.schedule(
    'wa-flag-reminders',         -- job name
    '*/30 * * * *',              -- every 30 minutes
    $$SELECT public.wa_send_reminders()$$
);

-- ── Cron Job: Process notification queue every 5 min ──
-- This invokes the wa-notify edge function to send queued messages
-- via Twilio (WhatsApp + SMS fallback)

SELECT cron.schedule(
    'wa-process-notifications',   -- job name
    '*/5 * * * *',                -- every 5 minutes
    $$
    SELECT
        net.http_post(
            url := current_setting('app.settings.supabase_url') || '/functions/v1/wa-notify',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
            ),
            body := '{"action":"process_queue"}'::jsonb
        )
    $$
);

-- ── Cron Job: Auto-complete past bookings daily at midnight ──
-- Marks "confirmed" bookings from yesterday as "completed"

SELECT cron.schedule(
    'wa-auto-complete-bookings',
    '0 0 * * *',                  -- daily at midnight
    $$
    UPDATE public.wa_bookings
    SET status = 'completed',
        completed_at = NOW()
    WHERE status = 'confirmed'
      AND booking_date < CURRENT_DATE
    $$
);


-- ══════════════════════════════════════════════════════════════
-- Done. Created 3 cron jobs:
--   1. wa-flag-reminders        — every 30 min (flag 24h/2h reminders)
--   2. wa-process-notifications — every 5 min  (send via Twilio)
--   3. wa-auto-complete-bookings — daily        (auto-complete past bookings)
-- ══════════════════════════════════════════════════════════════
