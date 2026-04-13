-- ══════════════════════════════════════════════════════════════
-- 057_wa_booking.sql
-- Patient Booking Service for WA Intake
-- Multi-location scheduling, Twilio notifications, feature gating
-- Markets: KSA (SA) / UAE (AE)
-- ══════════════════════════════════════════════════════════════


-- ─── 1. Doctor Locations ─────────────────────────
CREATE TABLE IF NOT EXISTS public.doctor_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,

    -- Identity
    name TEXT NOT NULL,
    name_ar TEXT,
    address TEXT,
    address_ar TEXT,
    city TEXT DEFAULT 'Riyadh',
    country TEXT DEFAULT 'SA' CHECK (country IN ('SA', 'AE')),

    -- Booking configuration
    booking_mode TEXT DEFAULT 'call_center'
        CHECK (booking_mode IN ('direct', 'call_center', 'disabled')),
    call_center_phone TEXT,
    call_center_label TEXT,
    call_center_label_ar TEXT,
    call_center_whatsapp BOOLEAN DEFAULT false,

    -- Slot configuration (direct mode)
    slot_duration_minutes INTEGER DEFAULT 30,
    max_bookings_per_slot INTEGER DEFAULT 1,
    advance_booking_days INTEGER DEFAULT 14,
    min_booking_hours INTEGER DEFAULT 2,
    cancellation_hours INTEGER DEFAULT 24,

    -- Display
    sort_order INTEGER DEFAULT 0,
    color TEXT DEFAULT '#4F46E5',
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.doctor_locations ENABLE ROW LEVEL SECURITY;

-- Admin full access
DROP POLICY IF EXISTS "loc_admin_all" ON public.doctor_locations;
CREATE POLICY "loc_admin_all"
    ON public.doctor_locations FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() AND u.role IN ('admin', 'superadmin')
        )
    );

-- Doctor read/write own locations
DROP POLICY IF EXISTS "loc_doctor_rw" ON public.doctor_locations;
CREATE POLICY "loc_doctor_rw"
    ON public.doctor_locations FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.doctors d
            WHERE d.id = doctor_locations.doctor_id AND d.user_id = auth.uid()
        )
    );

-- Anon read for WA intake (only active)
DROP POLICY IF EXISTS "loc_anon_read" ON public.doctor_locations;
CREATE POLICY "loc_anon_read"
    ON public.doctor_locations FOR SELECT
    USING (is_active = true);

CREATE INDEX IF NOT EXISTS idx_loc_doctor ON public.doctor_locations(doctor_id);
CREATE INDEX IF NOT EXISTS idx_loc_active ON public.doctor_locations(is_active) WHERE is_active = true;


-- ─── 2. Doctor Location Hours ────────────────────
CREATE TABLE IF NOT EXISTS public.doctor_location_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES public.doctor_locations(id) ON DELETE CASCADE,

    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    -- 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday

    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT true,

    UNIQUE(location_id, day_of_week, start_time)
);

ALTER TABLE public.doctor_location_hours ENABLE ROW LEVEL SECURITY;

-- Admin full access
DROP POLICY IF EXISTS "hours_admin_all" ON public.doctor_location_hours;
CREATE POLICY "hours_admin_all"
    ON public.doctor_location_hours FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() AND u.role IN ('admin', 'superadmin')
        )
    );

-- Doctor write own
DROP POLICY IF EXISTS "hours_doctor_rw" ON public.doctor_location_hours;
CREATE POLICY "hours_doctor_rw"
    ON public.doctor_location_hours FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.doctor_locations dl
            JOIN public.doctors d ON d.id = dl.doctor_id
            WHERE dl.id = doctor_location_hours.location_id AND d.user_id = auth.uid()
        )
    );

-- Anon read
DROP POLICY IF EXISTS "hours_anon_read" ON public.doctor_location_hours;
CREATE POLICY "hours_anon_read"
    ON public.doctor_location_hours FOR SELECT
    USING (is_active = true);

CREATE INDEX IF NOT EXISTS idx_hours_location ON public.doctor_location_hours(location_id);


-- ─── 3. Doctor Location Overrides ────────────────
CREATE TABLE IF NOT EXISTS public.doctor_location_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES public.doctor_locations(id) ON DELETE CASCADE,

    override_date DATE NOT NULL,
    override_type TEXT NOT NULL CHECK (override_type IN ('blocked', 'custom_hours')),

    -- For 'custom_hours' type only
    start_time TIME,
    end_time TIME,

    reason TEXT,
    reason_ar TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(location_id, override_date)
);

ALTER TABLE public.doctor_location_overrides ENABLE ROW LEVEL SECURITY;

-- Admin full access
DROP POLICY IF EXISTS "override_admin_all" ON public.doctor_location_overrides;
CREATE POLICY "override_admin_all"
    ON public.doctor_location_overrides FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() AND u.role IN ('admin', 'superadmin')
        )
    );

-- Doctor write own
DROP POLICY IF EXISTS "override_doctor_rw" ON public.doctor_location_overrides;
CREATE POLICY "override_doctor_rw"
    ON public.doctor_location_overrides FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.doctor_locations dl
            JOIN public.doctors d ON d.id = dl.doctor_id
            WHERE dl.id = doctor_location_overrides.location_id AND d.user_id = auth.uid()
        )
    );

-- Anon read
DROP POLICY IF EXISTS "override_anon_read" ON public.doctor_location_overrides;
CREATE POLICY "override_anon_read"
    ON public.doctor_location_overrides FOR SELECT
    USING (true);

CREATE INDEX IF NOT EXISTS idx_override_location ON public.doctor_location_overrides(location_id);
CREATE INDEX IF NOT EXISTS idx_override_date ON public.doctor_location_overrides(override_date);


-- ─── 4. WA Bookings ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.wa_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES public.doctors(id),
    location_id UUID NOT NULL REFERENCES public.doctor_locations(id),
    api_key_id UUID REFERENCES public.wa_api_keys(id),
    session_id UUID REFERENCES public.wa_intake_sessions(id),

    -- Patient info
    patient_name TEXT NOT NULL,
    patient_phone TEXT,
    patient_language TEXT DEFAULT 'ar' CHECK (patient_language IN ('ar', 'en')),

    -- Appointment
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    slot_end_time TIME NOT NULL,

    -- Status
    status TEXT DEFAULT 'confirmed'
        CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
    booking_source TEXT DEFAULT 'wa_intake'
        CHECK (booking_source IN ('wa_intake', 'wa_direct', 'admin_manual')),

    -- Notifications
    confirmation_sent BOOLEAN DEFAULT false,
    reminder_24h_sent BOOLEAN DEFAULT false,
    reminder_2h_sent BOOLEAN DEFAULT false,

    -- Context from intake
    intake_summary TEXT,
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    confirmed_at TIMESTAMPTZ DEFAULT now(),
    cancelled_at TIMESTAMPTZ,
    cancel_reason TEXT,
    completed_at TIMESTAMPTZ
);

ALTER TABLE public.wa_bookings ENABLE ROW LEVEL SECURITY;

-- Admin full access
DROP POLICY IF EXISTS "booking_admin_all" ON public.wa_bookings;
CREATE POLICY "booking_admin_all"
    ON public.wa_bookings FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() AND u.role IN ('admin', 'superadmin')
        )
    );

-- Doctor read own bookings
DROP POLICY IF EXISTS "booking_doctor_read" ON public.wa_bookings;
CREATE POLICY "booking_doctor_read"
    ON public.wa_bookings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.doctors d
            WHERE d.id = wa_bookings.doctor_id AND d.user_id = auth.uid()
        )
    );

-- Anon insert (patients create bookings)
DROP POLICY IF EXISTS "booking_anon_insert" ON public.wa_bookings;
CREATE POLICY "booking_anon_insert"
    ON public.wa_bookings FOR INSERT
    WITH CHECK (true);

-- Anon read own booking (for cancel page)
DROP POLICY IF EXISTS "booking_anon_read" ON public.wa_bookings;
CREATE POLICY "booking_anon_read"
    ON public.wa_bookings FOR SELECT
    USING (true);

-- Anon update (for cancellation)
DROP POLICY IF EXISTS "booking_anon_update" ON public.wa_bookings;
CREATE POLICY "booking_anon_update"
    ON public.wa_bookings FOR UPDATE
    USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_booking_doctor ON public.wa_bookings(doctor_id);
CREATE INDEX IF NOT EXISTS idx_booking_location ON public.wa_bookings(location_id);
CREATE INDEX IF NOT EXISTS idx_booking_date ON public.wa_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_booking_status ON public.wa_bookings(status);
CREATE INDEX IF NOT EXISTS idx_booking_date_status ON public.wa_bookings(booking_date, status)
    WHERE status IN ('confirmed', 'pending');


-- ─── 5. Notification Log ─────────────────────────
CREATE TABLE IF NOT EXISTS public.wa_notification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.wa_bookings(id) ON DELETE CASCADE,

    channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms')),
    notification_type TEXT NOT NULL
        CHECK (notification_type IN ('confirmation', 'reminder_24h', 'reminder_2h', 'cancellation')),

    recipient_phone TEXT NOT NULL,
    message_body TEXT,
    message_sid TEXT,
    status TEXT DEFAULT 'queued'
        CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed')),
    error_message TEXT,

    sent_at TIMESTAMPTZ DEFAULT now(),
    delivered_at TIMESTAMPTZ
);

ALTER TABLE public.wa_notification_log ENABLE ROW LEVEL SECURITY;

-- Admin full access
DROP POLICY IF EXISTS "notif_admin_all" ON public.wa_notification_log;
CREATE POLICY "notif_admin_all"
    ON public.wa_notification_log FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() AND u.role IN ('admin', 'superadmin')
        )
    );

CREATE INDEX IF NOT EXISTS idx_notif_booking ON public.wa_notification_log(booking_id);
CREATE INDEX IF NOT EXISTS idx_notif_status ON public.wa_notification_log(status) WHERE status = 'queued';


-- ═══════════════════════════════════════════════════
-- 6. RPCs
-- ═══════════════════════════════════════════════════

-- ─── 6.1 Get Doctor Locations ────────────────────
CREATE OR REPLACE FUNCTION public.get_doctor_locations(p_doctor_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_agg(loc_row ORDER BY loc_row->>'sort_order')
    INTO v_result
    FROM (
        SELECT jsonb_build_object(
            'id', dl.id,
            'name', dl.name,
            'name_ar', dl.name_ar,
            'address', dl.address,
            'address_ar', dl.address_ar,
            'city', dl.city,
            'country', dl.country,
            'booking_mode', dl.booking_mode,
            'call_center_phone', dl.call_center_phone,
            'call_center_label', dl.call_center_label,
            'call_center_label_ar', dl.call_center_label_ar,
            'call_center_whatsapp', dl.call_center_whatsapp,
            'slot_duration_minutes', dl.slot_duration_minutes,
            'advance_booking_days', dl.advance_booking_days,
            'min_booking_hours', dl.min_booking_hours,
            'cancellation_hours', dl.cancellation_hours,
            'color', dl.color,
            'sort_order', dl.sort_order,
            'hours', COALESCE((
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'day_of_week', h.day_of_week,
                        'start_time', h.start_time::TEXT,
                        'end_time', h.end_time::TEXT
                    )
                    ORDER BY h.day_of_week, h.start_time
                )
                FROM public.doctor_location_hours h
                WHERE h.location_id = dl.id AND h.is_active = true
            ), '[]'::jsonb)
        ) AS loc_row
        FROM public.doctor_locations dl
        WHERE dl.doctor_id = p_doctor_id
        AND dl.is_active = true
        AND dl.booking_mode != 'disabled'
    ) sub;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_doctor_locations(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_doctor_locations(UUID) TO authenticated;


-- ─── 6.2 Get Available Dates ─────────────────────
CREATE OR REPLACE FUNCTION public.get_available_dates(
    p_location_id UUID,
    p_days_ahead INTEGER DEFAULT 14
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_loc RECORD;
    v_date DATE;
    v_end_date DATE;
    v_result JSONB := '[]'::jsonb;
    v_dow INTEGER;
    v_has_hours BOOLEAN;
    v_override RECORD;
    v_total_slots INTEGER;
    v_booked_slots INTEGER;
    v_is_override BOOLEAN;
BEGIN
    -- Get location config
    SELECT * INTO v_loc FROM public.doctor_locations WHERE id = p_location_id AND is_active = true;
    IF NOT FOUND THEN RETURN '[]'::jsonb; END IF;

    v_date := CURRENT_DATE;
    v_end_date := CURRENT_DATE + p_days_ahead;

    WHILE v_date <= v_end_date LOOP
        v_dow := EXTRACT(DOW FROM v_date)::INTEGER;  -- 0=Sun
        v_is_override := false;
        v_total_slots := 0;

        -- Check for override
        SELECT * INTO v_override
        FROM public.doctor_location_overrides
        WHERE location_id = p_location_id AND override_date = v_date;

        IF FOUND THEN
            IF v_override.override_type = 'blocked' THEN
                -- Skip this date entirely
                v_date := v_date + 1;
                CONTINUE;
            ELSIF v_override.override_type = 'custom_hours' THEN
                v_is_override := true;
                -- Calculate slots from custom hours
                v_total_slots := GREATEST(0,
                    EXTRACT(EPOCH FROM (v_override.end_time - v_override.start_time))::INTEGER
                    / (v_loc.slot_duration_minutes * 60)
                );
            END IF;
        ELSE
            -- Check normal hours
            SELECT true INTO v_has_hours
            FROM public.doctor_location_hours
            WHERE location_id = p_location_id AND day_of_week = v_dow AND is_active = true
            LIMIT 1;

            IF NOT FOUND THEN
                v_date := v_date + 1;
                CONTINUE;
            END IF;

            -- Calculate total slots from all hour blocks
            SELECT COALESCE(SUM(
                GREATEST(0,
                    EXTRACT(EPOCH FROM (h.end_time - h.start_time))::INTEGER
                    / (v_loc.slot_duration_minutes * 60)
                )
            ), 0)
            INTO v_total_slots
            FROM public.doctor_location_hours h
            WHERE h.location_id = p_location_id AND h.day_of_week = v_dow AND h.is_active = true;
        END IF;

        -- Count existing bookings
        SELECT COUNT(*) INTO v_booked_slots
        FROM public.wa_bookings
        WHERE location_id = p_location_id
        AND booking_date = v_date
        AND status IN ('confirmed', 'pending');

        -- Only include dates with available slots
        IF v_total_slots > 0 AND (v_total_slots * v_loc.max_bookings_per_slot) > v_booked_slots THEN
            v_result := v_result || jsonb_build_object(
                'slot_date', v_date::TEXT,
                'day_of_week', v_dow,
                'total_slots', v_total_slots,
                'available_slots', (v_total_slots * v_loc.max_bookings_per_slot) - v_booked_slots,
                'is_override', v_is_override
            );
        END IF;

        v_date := v_date + 1;
    END LOOP;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_available_dates(UUID, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.get_available_dates(UUID, INTEGER) TO authenticated;


-- ─── 6.3 Get Available Slots ─────────────────────
CREATE OR REPLACE FUNCTION public.get_available_slots(
    p_location_id UUID,
    p_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_loc RECORD;
    v_dow INTEGER;
    v_override RECORD;
    v_start TIME;
    v_end TIME;
    v_slot TIME;
    v_slot_end TIME;
    v_booked INTEGER;
    v_result JSONB := '[]'::jsonb;
    v_hours RECORD;
    v_now TIMESTAMPTZ := now();
    v_min_time TIMESTAMPTZ;
BEGIN
    -- Get location
    SELECT * INTO v_loc FROM public.doctor_locations WHERE id = p_location_id AND is_active = true;
    IF NOT FOUND THEN RETURN '[]'::jsonb; END IF;

    v_dow := EXTRACT(DOW FROM p_date)::INTEGER;

    -- Minimum booking time (now + min_booking_hours)
    v_min_time := v_now + (v_loc.min_booking_hours || ' hours')::INTERVAL;

    -- Check override
    SELECT * INTO v_override
    FROM public.doctor_location_overrides
    WHERE location_id = p_location_id AND override_date = p_date;

    IF FOUND AND v_override.override_type = 'blocked' THEN
        RETURN '[]'::jsonb;
    END IF;

    IF FOUND AND v_override.override_type = 'custom_hours' THEN
        -- Use custom hours
        v_slot := v_override.start_time;
        WHILE v_slot < v_override.end_time LOOP
            v_slot_end := v_slot + (v_loc.slot_duration_minutes || ' minutes')::INTERVAL;
            IF v_slot_end > v_override.end_time THEN EXIT; END IF;

            -- Count bookings for this slot
            SELECT COUNT(*) INTO v_booked
            FROM public.wa_bookings
            WHERE location_id = p_location_id
            AND booking_date = p_date
            AND booking_time = v_slot
            AND status IN ('confirmed', 'pending');

            -- Check if slot is in the future (respecting min_booking_hours)
            IF (p_date + v_slot) >= v_min_time::TIME OR p_date > v_now::DATE THEN
                v_result := v_result || jsonb_build_object(
                    'slot_time', v_slot::TEXT,
                    'slot_end', v_slot_end::TEXT,
                    'available', v_booked < v_loc.max_bookings_per_slot,
                    'remaining', v_loc.max_bookings_per_slot - v_booked
                );
            END IF;

            v_slot := v_slot_end;
        END LOOP;
    ELSE
        -- Use regular hours
        FOR v_hours IN
            SELECT start_time, end_time
            FROM public.doctor_location_hours
            WHERE location_id = p_location_id AND day_of_week = v_dow AND is_active = true
            ORDER BY start_time
        LOOP
            v_slot := v_hours.start_time;
            WHILE v_slot < v_hours.end_time LOOP
                v_slot_end := v_slot + (v_loc.slot_duration_minutes || ' minutes')::INTERVAL;
                IF v_slot_end > v_hours.end_time THEN EXIT; END IF;

                SELECT COUNT(*) INTO v_booked
                FROM public.wa_bookings
                WHERE location_id = p_location_id
                AND booking_date = p_date
                AND booking_time = v_slot
                AND status IN ('confirmed', 'pending');

                -- Future check: if date is today, respect min_booking_hours
                IF p_date > v_now::DATE OR (p_date + v_slot)::TIMESTAMPTZ >= v_min_time THEN
                    v_result := v_result || jsonb_build_object(
                        'slot_time', v_slot::TEXT,
                        'slot_end', v_slot_end::TEXT,
                        'available', v_booked < v_loc.max_bookings_per_slot,
                        'remaining', v_loc.max_bookings_per_slot - v_booked
                    );
                END IF;

                v_slot := v_slot_end;
            END LOOP;
        END LOOP;
    END IF;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_available_slots(UUID, DATE) TO anon;
GRANT EXECUTE ON FUNCTION public.get_available_slots(UUID, DATE) TO authenticated;


-- ─── 6.4 Create WA Booking ──────────────────────
CREATE OR REPLACE FUNCTION public.create_wa_booking(
    p_key_code TEXT,
    p_location_id UUID,
    p_date DATE,
    p_time TIME,
    p_patient_name TEXT,
    p_patient_phone TEXT DEFAULT NULL,
    p_patient_language TEXT DEFAULT 'ar',
    p_session_id UUID DEFAULT NULL,
    p_intake_summary TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_source TEXT DEFAULT 'wa_intake'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_key RECORD;
    v_loc RECORD;
    v_sub RECORD;
    v_slot_end TIME;
    v_booked INTEGER;
    v_booking RECORD;
    v_doctor RECORD;
BEGIN
    -- Validate API key (optional — admin can book without key)
    IF p_key_code IS NOT NULL AND p_key_code != '' THEN
        SELECT * INTO v_key FROM public.wa_api_keys WHERE key_code = p_key_code AND is_active = true;
        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'invalid_key');
        END IF;

        -- Check subscription has booking feature
        SELECT * INTO v_sub FROM public.doctor_subscriptions WHERE doctor_id = v_key.doctor_id;
        IF FOUND AND NOT COALESCE((v_sub.features->>'booking')::BOOLEAN, false) THEN
            RETURN jsonb_build_object('success', false, 'error', 'booking_not_enabled');
        END IF;
    END IF;

    -- Get location
    SELECT * INTO v_loc FROM public.doctor_locations WHERE id = p_location_id AND is_active = true;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'invalid_location');
    END IF;

    IF v_loc.booking_mode != 'direct' THEN
        RETURN jsonb_build_object('success', false, 'error', 'direct_booking_not_enabled');
    END IF;

    -- Calculate slot end
    v_slot_end := p_time + (v_loc.slot_duration_minutes || ' minutes')::INTERVAL;

    -- Check slot availability (with row-level lock for race safety)
    SELECT COUNT(*) INTO v_booked
    FROM public.wa_bookings
    WHERE location_id = p_location_id
    AND booking_date = p_date
    AND booking_time = p_time
    AND status IN ('confirmed', 'pending')
    FOR UPDATE;

    IF v_booked >= v_loc.max_bookings_per_slot THEN
        RETURN jsonb_build_object('success', false, 'error', 'slot_full');
    END IF;

    -- Get doctor info
    SELECT * INTO v_doctor FROM public.doctors WHERE id = v_loc.doctor_id;

    -- Create booking (auto-confirmed)
    INSERT INTO public.wa_bookings (
        doctor_id, location_id, api_key_id, session_id,
        patient_name, patient_phone, patient_language,
        booking_date, booking_time, slot_end_time,
        status, booking_source, intake_summary, notes,
        confirmed_at
    ) VALUES (
        v_loc.doctor_id, p_location_id,
        CASE WHEN p_key_code IS NOT NULL THEN v_key.id ELSE NULL END,
        p_session_id,
        p_patient_name, p_patient_phone, p_patient_language,
        p_date, p_time, v_slot_end,
        'confirmed', p_source, p_intake_summary, p_notes,
        now()
    )
    RETURNING * INTO v_booking;

    -- Queue confirmation notification
    IF p_patient_phone IS NOT NULL AND p_patient_phone != '' THEN
        INSERT INTO public.wa_notification_log (
            booking_id, channel, notification_type, recipient_phone
        ) VALUES (
            v_booking.id, 'whatsapp', 'confirmation', p_patient_phone
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'booking', jsonb_build_object(
            'id', v_booking.id,
            'date', v_booking.booking_date,
            'time', v_booking.booking_time::TEXT,
            'slot_end', v_booking.slot_end_time::TEXT,
            'status', v_booking.status,
            'location_name', v_loc.name,
            'location_name_ar', v_loc.name_ar,
            'location_address', v_loc.address,
            'doctor_name', v_doctor.display_name,
            'doctor_full_name', v_doctor.full_name
        )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_wa_booking(TEXT, UUID, DATE, TIME, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.create_wa_booking(TEXT, UUID, DATE, TIME, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT) TO authenticated;


-- ─── 6.5 Cancel WA Booking ──────────────────────
CREATE OR REPLACE FUNCTION public.cancel_wa_booking(
    p_booking_id UUID,
    p_phone TEXT DEFAULT NULL,
    p_reason TEXT DEFAULT 'patient_cancelled'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking RECORD;
    v_loc RECORD;
    v_cancel_deadline TIMESTAMPTZ;
BEGIN
    SELECT * INTO v_booking FROM public.wa_bookings WHERE id = p_booking_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'booking_not_found');
    END IF;

    -- Verify phone matches (for patient self-cancel)
    IF p_phone IS NOT NULL AND v_booking.patient_phone IS NOT NULL
       AND v_booking.patient_phone != p_phone THEN
        RETURN jsonb_build_object('success', false, 'error', 'phone_mismatch');
    END IF;

    IF v_booking.status IN ('cancelled', 'completed') THEN
        RETURN jsonb_build_object('success', false, 'error', 'already_' || v_booking.status);
    END IF;

    -- Check cancellation window
    SELECT * INTO v_loc FROM public.doctor_locations WHERE id = v_booking.location_id;
    v_cancel_deadline := (v_booking.booking_date + v_booking.booking_time)::TIMESTAMPTZ
                         - (COALESCE(v_loc.cancellation_hours, 24) || ' hours')::INTERVAL;

    IF now() > v_cancel_deadline THEN
        RETURN jsonb_build_object('success', false, 'error', 'cancellation_window_passed',
            'deadline', v_cancel_deadline);
    END IF;

    -- Cancel
    UPDATE public.wa_bookings
    SET status = 'cancelled',
        cancelled_at = now(),
        cancel_reason = p_reason
    WHERE id = p_booking_id;

    -- Queue cancellation notification
    IF v_booking.patient_phone IS NOT NULL THEN
        INSERT INTO public.wa_notification_log (
            booking_id, channel, notification_type, recipient_phone
        ) VALUES (
            p_booking_id, 'whatsapp', 'cancellation', v_booking.patient_phone
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'status', 'cancelled');
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_wa_booking(UUID, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.cancel_wa_booking(UUID, TEXT, TEXT) TO authenticated;


-- ─── 6.6 Flag Reminders (Cron) ──────────────────
CREATE OR REPLACE FUNCTION public.wa_send_reminders()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count_24h INTEGER := 0;
    v_count_2h INTEGER := 0;
    v_booking RECORD;
    v_appt_time TIMESTAMPTZ;
BEGIN
    -- 24-hour reminders
    FOR v_booking IN
        SELECT * FROM public.wa_bookings
        WHERE status = 'confirmed'
        AND reminder_24h_sent = false
        AND patient_phone IS NOT NULL
        AND (booking_date + booking_time)::TIMESTAMPTZ <= now() + interval '24 hours'
        AND (booking_date + booking_time)::TIMESTAMPTZ > now()
    LOOP
        INSERT INTO public.wa_notification_log (
            booking_id, channel, notification_type, recipient_phone
        ) VALUES (
            v_booking.id, 'whatsapp', 'reminder_24h', v_booking.patient_phone
        );

        UPDATE public.wa_bookings SET reminder_24h_sent = true WHERE id = v_booking.id;
        v_count_24h := v_count_24h + 1;
    END LOOP;

    -- 2-hour reminders
    FOR v_booking IN
        SELECT * FROM public.wa_bookings
        WHERE status = 'confirmed'
        AND reminder_2h_sent = false
        AND patient_phone IS NOT NULL
        AND (booking_date + booking_time)::TIMESTAMPTZ <= now() + interval '2 hours'
        AND (booking_date + booking_time)::TIMESTAMPTZ > now()
    LOOP
        INSERT INTO public.wa_notification_log (
            booking_id, channel, notification_type, recipient_phone
        ) VALUES (
            v_booking.id, 'whatsapp', 'reminder_2h', v_booking.patient_phone
        );

        UPDATE public.wa_bookings SET reminder_2h_sent = true WHERE id = v_booking.id;
        v_count_2h := v_count_2h + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'reminders_24h', v_count_24h,
        'reminders_2h', v_count_2h,
        'processed_at', now()
    );
END;
$$;


-- ─── 7. Update Subscription Feature Gate ─────────
-- Add booking + max_locations to plan features
CREATE OR REPLACE FUNCTION public.manage_wa_subscription(
    p_doctor_id UUID,
    p_plan TEXT,
    p_action TEXT DEFAULT 'create'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_limit INTEGER;
    v_duration INTERVAL;
    v_features JSONB;
    v_sub RECORD;
BEGIN
    -- Check admin
    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    ) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Plan defaults (updated with booking features)
    CASE p_plan
        WHEN 'trial' THEN
            v_limit := 20;
            v_duration := interval '14 days';
            v_features := '{
                "photo_upload": false,
                "doc_upload": false,
                "booking": false,
                "max_locations": 0,
                "custom_branding": false
            }'::jsonb;
        WHEN 'starter' THEN
            v_limit := 100;
            v_duration := interval '30 days';
            v_features := '{
                "photo_upload": true,
                "doc_upload": false,
                "booking": false,
                "max_locations": 0,
                "custom_branding": false
            }'::jsonb;
        WHEN 'professional' THEN
            v_limit := 500;
            v_duration := interval '30 days';
            v_features := '{
                "photo_upload": true,
                "doc_upload": true,
                "booking": true,
                "max_locations": 3,
                "custom_branding": true
            }'::jsonb;
        WHEN 'enterprise' THEN
            v_limit := 999999;
            v_duration := interval '30 days';
            v_features := '{
                "photo_upload": true,
                "doc_upload": true,
                "booking": true,
                "max_locations": 99,
                "custom_branding": true
            }'::jsonb;
        ELSE
            RAISE EXCEPTION 'Invalid plan: %', p_plan;
    END CASE;

    IF p_action = 'suspend' THEN
        UPDATE public.doctor_subscriptions
        SET status = 'suspended'
        WHERE doctor_id = p_doctor_id
        RETURNING * INTO v_sub;
        RETURN jsonb_build_object('status', 'suspended', 'id', v_sub.id);
    END IF;

    IF p_action = 'cancel' THEN
        UPDATE public.doctor_subscriptions
        SET status = 'cancelled'
        WHERE doctor_id = p_doctor_id
        RETURNING * INTO v_sub;
        RETURN jsonb_build_object('status', 'cancelled', 'id', v_sub.id);
    END IF;

    -- Create or update
    INSERT INTO public.doctor_subscriptions (doctor_id, plan, status, sessions_limit, sessions_used, features, expires_at)
    VALUES (p_doctor_id, p_plan, 'active', v_limit, 0, v_features, now() + v_duration)
    ON CONFLICT (doctor_id) DO UPDATE SET
        plan = p_plan,
        status = 'active',
        sessions_limit = v_limit,
        sessions_used = CASE WHEN p_action = 'renew' THEN 0 ELSE doctor_subscriptions.sessions_used END,
        features = v_features,
        expires_at = now() + v_duration,
        renewed_at = CASE WHEN p_action = 'renew' THEN now() ELSE doctor_subscriptions.renewed_at END
    RETURNING * INTO v_sub;

    RETURN jsonb_build_object(
        'id', v_sub.id,
        'plan', v_sub.plan,
        'status', v_sub.status,
        'sessions_limit', v_sub.sessions_limit,
        'expires_at', v_sub.expires_at,
        'features', v_sub.features
    );
END;
$$;


-- ─── 8. Extend sequence_type for booking ─────────
DO $$
BEGIN
    ALTER TABLE public.prompt_sequences
        DROP CONSTRAINT IF EXISTS prompt_sequences_type_check;

    ALTER TABLE public.prompt_sequences
        ADD CONSTRAINT prompt_sequences_type_check
        CHECK (sequence_type IN (
            'global_intake', 'global_wrapup', 'specialty',
            'refill', 'followup', 'legacy',
            'wa_intake', 'wa_followup', 'wa_new_visit', 'wa_wrapup',
            'wa_booking'
        ));

    RAISE NOTICE 'Extended sequence_type constraint for wa_booking.';
END $$;


-- ══════════════════════════════════════════════════════════════
-- Done. Created:
--   • doctor_locations table (with RLS)
--   • doctor_location_hours table (with RLS)
--   • doctor_location_overrides table (with RLS)
--   • wa_bookings table (with RLS + indexes)
--   • wa_notification_log table (with RLS)
--   • get_doctor_locations() RPC
--   • get_available_dates() RPC
--   • get_available_slots() RPC
--   • create_wa_booking() RPC (race-safe)
--   • cancel_wa_booking() RPC (with cancellation window)
--   • wa_send_reminders() RPC (cron-ready)
--   • Updated manage_wa_subscription() with booking features
--   • Extended sequence_type for wa_booking
-- ══════════════════════════════════════════════════════════════
