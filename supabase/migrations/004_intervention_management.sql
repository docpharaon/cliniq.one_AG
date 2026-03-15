-- ──────────────────────────────────────────────────────────
-- 004_intervention_management.sql — Intervention tables, service catalog, providers
-- ──────────────────────────────────────────────────────────

-- ─── Service Catalog ─────────────────────────────────────
-- Defines the library of available services (tests, imaging, referrals, etc.)
CREATE TABLE IF NOT EXISTS public.service_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,                              -- e.g. Hematology, Radiology, Cardiology
    subcategory TEXT,                                    -- e.g. Complete Blood Count, Allergy Panel
    name TEXT NOT NULL,
    name_ar TEXT NOT NULL DEFAULT '',
    description TEXT,
    description_ar TEXT,
    type TEXT NOT NULL DEFAULT 'lab_test',               -- lab_test, imaging, referral, therapy, home_health, follow_up
    sample_required TEXT,                                -- e.g. "Blood (serum)", "Urine"
    fasting_required BOOLEAN DEFAULT false,
    avg_cost_sar NUMERIC(10,2),
    avg_turnaround_days INT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Service Providers ───────────────────────────────────
-- Labs, imaging centers, specialist clinics, therapy centers
CREATE TABLE IF NOT EXISTS public.service_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    name_ar TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL DEFAULT 'lab',                    -- lab, imaging_center, specialist, therapy_center, home_health
    address TEXT NOT NULL DEFAULT '',
    address_ar TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    phone TEXT,
    email TEXT,
    website TEXT,
    operating_hours JSONB,                              -- {"sunday": {"open":"08:00","close":"20:00"}, ...}
    rating_avg NUMERIC(3,2) DEFAULT 0,
    rating_count INT DEFAULT 0,
    insurance_accepted TEXT[] DEFAULT '{}',
    services_offered TEXT[] DEFAULT '{}',
    home_collection_available BOOLEAN DEFAULT false,
    home_collection_fee_sar NUMERIC(10,2),
    avg_result_turnaround_hours INT,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Interventions ───────────────────────────────────────
-- Medical procedures/tests ordered by doctors for patients
CREATE TABLE IF NOT EXISTS public.interventions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'lab_test',               -- lab_test, imaging, referral, therapy, home_health, follow_up
    status TEXT NOT NULL DEFAULT 'ordered',              -- ordered, pending_auth, authorized, scheduled, in_progress, completed, results_ready, reviewed, cancelled
    priority TEXT NOT NULL DEFAULT 'routine',            -- routine, urgent, stat
    title TEXT NOT NULL,
    description TEXT,
    clinical_indication TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT '',                   -- e.g. Hematology, Cardiology
    specific_test TEXT,                                  -- e.g. CBC, Allergy Panel
    instructions_for_patient TEXT,
    doctor_notes TEXT,
    provider_id UUID REFERENCES public.service_providers(id) ON DELETE SET NULL,
    scheduled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    estimated_cost_sar NUMERIC(10,2),
    actual_cost_sar NUMERIC(10,2),
    insurance_pre_auth_required BOOLEAN DEFAULT false,
    insurance_pre_auth_status TEXT DEFAULT 'not_required',  -- not_required, pending, approved, denied
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_intervention_id UUID REFERENCES public.interventions(id) ON DELETE SET NULL,
    results_url TEXT,
    results_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Intervention Status Log (Audit Trail) ───────────────
CREATE TABLE IF NOT EXISTS public.intervention_status_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intervention_id UUID NOT NULL REFERENCES public.interventions(id) ON DELETE CASCADE,
    from_status TEXT,
    to_status TEXT NOT NULL,
    changed_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Indexes ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_interventions_consultation ON public.interventions(consultation_id);
CREATE INDEX IF NOT EXISTS idx_interventions_patient ON public.interventions(patient_id);
CREATE INDEX IF NOT EXISTS idx_interventions_doctor ON public.interventions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_interventions_status ON public.interventions(status);
CREATE INDEX IF NOT EXISTS idx_interventions_type ON public.interventions(type);
CREATE INDEX IF NOT EXISTS idx_interventions_provider ON public.interventions(provider_id);
CREATE INDEX IF NOT EXISTS idx_interventions_created ON public.interventions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_status_logs_intervention ON public.intervention_status_logs(intervention_id);
CREATE INDEX IF NOT EXISTS idx_service_catalog_type ON public.service_catalog(type);
CREATE INDEX IF NOT EXISTS idx_service_catalog_category ON public.service_catalog(category);
CREATE INDEX IF NOT EXISTS idx_providers_type ON public.service_providers(type);
CREATE INDEX IF NOT EXISTS idx_providers_city ON public.service_providers(city);
CREATE INDEX IF NOT EXISTS idx_providers_active ON public.service_providers(is_active, is_verified);

-- ─── RLS ─────────────────────────────────────────────────
ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervention_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;

-- Service catalog: readable by all authenticated users
CREATE POLICY "Service catalog readable by all" ON public.service_catalog
    FOR SELECT TO authenticated USING (is_active = true);

-- Service providers: readable by all authenticated users
CREATE POLICY "Service providers readable by all" ON public.service_providers
    FOR SELECT TO authenticated USING (is_active = true);

-- Interventions: patients see own, doctors see orders they created
CREATE POLICY "Patients can view own interventions" ON public.interventions
    FOR SELECT TO authenticated USING (patient_id = auth.uid());

CREATE POLICY "Doctors can view own orders" ON public.interventions
    FOR SELECT TO authenticated USING (doctor_id IN (
        SELECT id FROM public.doctors WHERE user_id = auth.uid()
    ));

CREATE POLICY "Doctors can create interventions" ON public.interventions
    FOR INSERT TO authenticated WITH CHECK (doctor_id IN (
        SELECT id FROM public.doctors WHERE user_id = auth.uid()
    ));

CREATE POLICY "Doctors can update own orders" ON public.interventions
    FOR UPDATE TO authenticated USING (doctor_id IN (
        SELECT id FROM public.doctors WHERE user_id = auth.uid()
    ));

-- Patients can update their own intervention (for booking, uploading results)
CREATE POLICY "Patients can update own interventions" ON public.interventions
    FOR UPDATE TO authenticated USING (patient_id = auth.uid());

-- Status logs: readable by involved parties
CREATE POLICY "Status logs readable by patient" ON public.intervention_status_logs
    FOR SELECT TO authenticated USING (intervention_id IN (
        SELECT id FROM public.interventions WHERE patient_id = auth.uid()
    ));

CREATE POLICY "Status logs readable by doctor" ON public.intervention_status_logs
    FOR SELECT TO authenticated USING (intervention_id IN (
        SELECT id FROM public.interventions WHERE doctor_id IN (
            SELECT id FROM public.doctors WHERE user_id = auth.uid()
        )
    ));

-- Status logs: writable by involved parties
CREATE POLICY "Users can create status logs" ON public.intervention_status_logs
    FOR INSERT TO authenticated WITH CHECK (changed_by = auth.uid());

-- ─── Auto-update updated_at trigger ──────────────────────
CREATE OR REPLACE FUNCTION public.update_intervention_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_intervention_updated
    BEFORE UPDATE ON public.interventions
    FOR EACH ROW EXECUTE FUNCTION public.update_intervention_timestamp();

CREATE TRIGGER trg_provider_updated
    BEFORE UPDATE ON public.service_providers
    FOR EACH ROW EXECUTE FUNCTION public.update_intervention_timestamp();

-- ─── Auto-log status changes ─────────────────────────────
CREATE OR REPLACE FUNCTION public.log_intervention_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.intervention_status_logs (intervention_id, from_status, to_status, changed_by)
        VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_intervention_status_log
    AFTER UPDATE ON public.interventions
    FOR EACH ROW EXECUTE FUNCTION public.log_intervention_status_change();
