-- 20260413000_wa_templates.sql
-- Create table for Meta WhatsApp Templates management

CREATE TABLE public.meta_wa_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('MARKETING', 'UTILITY', 'AUTHENTICATION')),
    language TEXT NOT NULL DEFAULT 'en',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    components JSONB NOT NULL DEFAULT '[]'::jsonb,
    meta_id TEXT,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.meta_wa_templates ENABLE ROW LEVEL SECURITY;

-- Admins have full access to meta_wa_templates
CREATE POLICY "Admins have full access to meta_wa_templates"
ON public.meta_wa_templates
FOR ALL
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Trigger for updated_at
CREATE TRIGGER trg_meta_wa_templates_updated_at
    BEFORE UPDATE ON public.meta_wa_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- Seed initial Meta templates (common automation types)
INSERT INTO public.meta_wa_templates (name, category, language, status, components)
VALUES 
('report_ready', 'UTILITY', 'en', 'approved', '[{"type": "BODY", "text": "Your medical report from cliniq.one is now ready. You can view it in the app or via this link: {{1}}"}]'),
('lab_results', 'UTILITY', 'en', 'approved', '[{"type": "BODY", "text": "Your lab results are now available. Check them here: {{1}}"}]'),
('confirmation', 'UTILITY', 'en', 'approved', '[{"type": "BODY", "text": "Your booking for {{1}} at {{2}} has been confirmed."}]'),
('otp_verification', 'AUTHENTICATION', 'en', 'approved', '[{"type": "BODY", "text": "Your cliniq.one verification code is: {{1}}. It expires in 10 minutes."}]');
