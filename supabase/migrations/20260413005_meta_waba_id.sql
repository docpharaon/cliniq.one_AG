-- 20260413005_meta_waba_id.sql
-- Add WABA ID setting for template synchronization

INSERT INTO public.platform_settings (key, value, category, description)
VALUES (
    'meta_waba_id',
    'ADD_YOUR_WABA_ID_HERE',
    'whatsapp',
    'The WhatsApp Business Account ID found in Meta Business Suite (required for template sync)'
) ON CONFLICT (key) DO NOTHING;
