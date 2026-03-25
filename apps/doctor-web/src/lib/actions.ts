'use server';

import { createServerSupabase } from './supabase-server';

// ── Doctor Auth ──────────────────────────────────

export async function fetchCurrentDoctor() {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: doctor } = await supabase
        .from('doctors')
        .select('*')
        .eq('user_id', user.id)
        .single();

    return doctor;
}

// ── Doctor Stats (Dashboard) ─────────────────────

export async function fetchDoctorDashboardStats(doctorId: string) {
    const supabase = await createServerSupabase();

    // Total consultations by this doctor
    const { count: totalConsultations } = await supabase
        .from('consultations')
        .select('*', { count: 'exact', head: true })
        .eq('doctor_id', doctorId);

    // Today's completed
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { count: todayCompleted } = await supabase
        .from('consultations')
        .select('*', { count: 'exact', head: true })
        .eq('doctor_id', doctorId)
        .in('status', ['completed', 'report_ready'])
        .gte('updated_at', todayStart.toISOString());

    // Active (assigned + in_progress)
    const { count: activeCases } = await supabase
        .from('consultations')
        .select('*', { count: 'exact', head: true })
        .eq('doctor_id', doctorId)
        .in('status', ['assigned', 'in_progress', 'inquiry_sent']);

    // Pending in doctor's specialty
    const { data: doctorData } = await supabase
        .from('doctors')
        .select('specialty, tokens_earned, rating_avg, rating_count')
        .eq('id', doctorId)
        .single();

    const { count: pendingCount } = await supabase
        .from('consultations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'submitted')
        .is('doctor_id', null);

    return {
        totalConsultations: totalConsultations || 0,
        todayCompleted: todayCompleted || 0,
        activeCases: activeCases || 0,
        pendingInQueue: pendingCount || 0,
        tokensEarned: doctorData?.tokens_earned || 0,
        ratingAvg: doctorData?.rating_avg || 0,
        ratingCount: doctorData?.rating_count || 0,
    };
}

export async function updateDoctorAccepting(doctorId: string, isAccepting: boolean) {
    const supabase = await createServerSupabase();
    const { error } = await supabase
        .from('doctors')
        .update({ is_accepting: isAccepting })
        .eq('id', doctorId);
    if (error) return { error: error.message };
    return { success: true };
}

// ── Queue ────────────────────────────────────────

export async function fetchQueueConsultations(
    doctorId: string,
    specialty: string,
    page = 1,
    perPage = 25,
    statusFilter?: string,
    priorityFilter?: string,
) {
    const supabase = await createServerSupabase();

    // Get doctor's own active + pending unassigned
    let query = supabase
        .from('consultations')
        .select('*, patient:users!consultations_patient_id_fkey(nickname, gender, year_of_birth, city, country, language)', { count: 'exact' })
        .order('created_at', { ascending: false });

    if (statusFilter === 'mine') {
        query = query.eq('doctor_id', doctorId).in('status', ['assigned', 'in_progress', 'inquiry_sent']);
    } else if (statusFilter === 'pending') {
        query = query.eq('status', 'submitted').is('doctor_id', null);
    } else {
        // All: doctor's active + pending
        query = query.or(`and(doctor_id.eq.${doctorId},status.in.(assigned,in_progress,inquiry_sent)),and(doctor_id.is.null,status.eq.submitted)`);
    }

    if (priorityFilter && priorityFilter !== 'all') {
        query = query.eq('priority', priorityFilter);
    }

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) console.error('fetchQueueConsultations error:', error);

    return { data: data || [], count: count || 0 };
}

// ── Consultation Detail ──────────────────────────

export async function fetchConsultationDetail(consultationId: string) {
    const supabase = await createServerSupabase();

    const { data, error } = await supabase
        .from('consultations')
        .select('*, patient:users!consultations_patient_id_fkey(*)')
        .eq('id', consultationId)
        .single();

    if (error) console.error('fetchConsultationDetail error:', error);
    return data;
}

// ── Consultation History ─────────────────────────

export async function fetchConsultationHistory(
    doctorId: string,
    page = 1,
    perPage = 25,
    search?: string,
    statusFilter?: string,
) {
    const supabase = await createServerSupabase();

    let query = supabase
        .from('consultations')
        .select('*, patient:users!consultations_patient_id_fkey(nickname, gender, year_of_birth)', { count: 'exact' })
        .eq('doctor_id', doctorId)
        .order('created_at', { ascending: false });

    if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
    }

    if (search) {
        query = query.or(`chief_complaint.ilike.%${search}%,id.ilike.%${search}%`);
    }

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) console.error('fetchConsultationHistory error:', error);

    return { data: data || [], count: count || 0 };
}

// ── Doctor Schedule ──────────────────────────────

export async function fetchDoctorSchedule(doctorId: string) {
    const supabase = await createServerSupabase();

    const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('doctor_id', doctorId)
        .order('day_of_week', { ascending: true });

    if (error) console.error('fetchDoctorSchedule error:', error);
    return data || [];
}

// ── Claim Consultation ───────────────────────────

export async function claimConsultationAction(consultationId: string, doctorId: string) {
    const supabase = await createServerSupabase();

    const { error } = await supabase
        .from('consultations')
        .update({
            doctor_id: doctorId,
            status: 'assigned',
            assigned_at: new Date().toISOString(),
        })
        .eq('id', consultationId)
        .eq('status', 'submitted')
        .is('doctor_id', null);

    if (error) return { error: error.message };
    return { success: true };
}

// ── Submit Report ────────────────────────────────

export async function submitReportAction(
    consultationId: string,
    report: Record<string, unknown>,
    prescription?: Record<string, unknown>,
) {
    const supabase = await createServerSupabase();

    const updateData: Record<string, unknown> = {
        report: report,
        status: 'report_ready',
    };

    if (prescription) {
        updateData.prescription = prescription;
    }

    const { error } = await supabase
        .from('consultations')
        .update(updateData)
        .eq('id', consultationId);

    if (error) return { error: error.message };
    return { success: true };
}

// ── Service Catalog ──────────────────────────────

export async function fetchServiceCatalog(
    search?: string,
    category?: string,
    type?: string,
) {
    const supabase = await createServerSupabase();

    let query = supabase
        .from('service_catalog')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

    if (search) {
        query = query.or(`name.ilike.%${search}%,category.ilike.%${search}%,subcategory.ilike.%${search}%`);
    }
    if (category && category !== 'all') {
        query = query.eq('category', category);
    }
    if (type && type !== 'all') {
        query = query.eq('type', type);
    }

    const { data, error } = await query.limit(100);
    if (error) console.error('fetchServiceCatalog error:', error);
    return data || [];
}

// ── Interventions ────────────────────────────────

export async function createIntervention(data: {
    consultation_id: string;
    patient_id: string;
    doctor_id: string;
    type: string;
    priority: string;
    title: string;
    description?: string;
    clinical_indication: string;
    category: string;
    specific_test?: string;
    instructions_for_patient?: string;
    doctor_notes?: string;
}) {
    const supabase = await createServerSupabase();

    const { data: intervention, error } = await supabase
        .from('interventions')
        .insert(data)
        .select()
        .single();

    if (error) return { error: error.message };
    return { data: intervention };
}

export async function fetchConsultationInterventions(consultationId: string) {
    const supabase = await createServerSupabase();

    const { data, error } = await supabase
        .from('interventions')
        .select('*, provider:service_providers(name, type, city)')
        .eq('consultation_id', consultationId)
        .order('created_at', { ascending: false });

    if (error) console.error('fetchConsultationInterventions error:', error);
    return data || [];
}

// ── Chat Messages ────────────────────────────────

export async function fetchConsultationMessages(consultationId: string) {
    const supabase = await createServerSupabase();

    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('consultation_id', consultationId)
        .order('created_at', { ascending: true });

    if (error) console.error('fetchConsultationMessages error:', error);
    return data || [];
}

// ── Analytics ────────────────────────────────────

export async function fetchWeeklyActivity(doctorId: string) {
    const supabase = await createServerSupabase();

    // Get consultations from last 7 days
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const { data } = await supabase
        .from('consultations')
        .select('created_at, token_cost')
        .eq('doctor_id', doctorId)
        .gte('created_at', weekStart.toISOString())
        .order('created_at', { ascending: true });

    // Group by day
    const dayMap: Record<string, { cases: number; earnings: number }> = {};
    for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        const dayName = days[d.getDay()];
        dayMap[dayName] = { cases: 0, earnings: 0 };
    }

    (data || []).forEach(row => {
        const dayName = days[new Date(row.created_at).getDay()];
        if (dayMap[dayName]) {
            dayMap[dayName].cases += 1;
            dayMap[dayName].earnings += row.token_cost || 3;
        }
    });

    // Keep in chronological order (starting from weekStart)
    const result = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        const dayName = days[d.getDay()];
        result.push({ day: dayName, ...dayMap[dayName] });
    }

    return result;
}

export async function fetchCaseDistribution(doctorId: string) {
    const supabase = await createServerSupabase();

    const { data } = await supabase
        .from('consultations')
        .select('specialty')
        .eq('doctor_id', doctorId);

    if (!data || data.length === 0) return [];

    const counts: Record<string, number> = {};
    data.forEach(row => {
        const spec = row.specialty || 'General';
        counts[spec] = (counts[spec] || 0) + 1;
    });

    return Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);
}

export async function fetchAvgResponseTime(doctorId: string) {
    const supabase = await createServerSupabase();

    const { data } = await supabase
        .from('consultations')
        .select('assigned_at, updated_at, status')
        .eq('doctor_id', doctorId)
        .in('status', ['completed', 'report_ready'])
        .not('assigned_at', 'is', null);

    if (!data || data.length === 0) return '—';

    let totalMinutes = 0;
    let count = 0;
    data.forEach(row => {
        if (row.assigned_at && row.updated_at) {
            const diff = new Date(row.updated_at).getTime() - new Date(row.assigned_at).getTime();
            totalMinutes += diff / (1000 * 60);
            count++;
        }
    });

    if (count === 0) return '—';
    const avgMin = Math.round(totalMinutes / count);
    if (avgMin < 60) return `~${avgMin} min`;
    const hours = Math.floor(avgMin / 60);
    const mins = avgMin % 60;
    return `~${hours}h ${mins}m`;
}

// ── Analytics Extra (Today's Activity + Schedule) ─

export async function fetchDoctorAnalyticsExtra(doctorId: string) {
    const supabase = await createServerSupabase();

    // Today's completed count
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { count: todayCompleted } = await supabase
        .from('consultations')
        .select('*', { count: 'exact', head: true })
        .eq('doctor_id', doctorId)
        .in('status', ['completed', 'report_ready'])
        .gte('updated_at', todayStart.toISOString());

    // Get daily limit from active schedule for today
    const dayOfWeek = new Date().getDay();
    const { data: scheduleSlots } = await supabase
        .from('schedules')
        .select('daily_limit')
        .eq('doctor_id', doctorId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true)
        .limit(1);

    const dailyLimit = scheduleSlots?.[0]?.daily_limit || 20;

    // Rating data
    const { data: doctor } = await supabase
        .from('doctors')
        .select('rating_avg, rating_count')
        .eq('id', doctorId)
        .single();

    return {
        todayCompleted: todayCompleted || 0,
        dailyLimit,
        remaining: Math.max(0, dailyLimit - (todayCompleted || 0)),
        ratingAvg: doctor?.rating_avg || 0,
        ratingCount: doctor?.rating_count || 0,
    };
}

// ── Notifications ────────────────────────────────

export async function fetchDoctorNotifications(doctorId: string) {
    const supabase = await createServerSupabase();

    const { data, error } = await supabase
        .from('doctor_notifications')
        .select('*')
        .eq('doctor_id', doctorId)
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) console.error('fetchDoctorNotifications error:', error);
    return data || [];
}

export async function markNotificationRead(notificationId: string) {
    const supabase = await createServerSupabase();

    const { error } = await supabase
        .from('doctor_notifications')
        .update({ read: true })
        .eq('id', notificationId);

    if (error) return { error: error.message };
    return { success: true };
}

export async function markAllNotificationsRead(doctorId: string) {
    const supabase = await createServerSupabase();

    const { error } = await supabase
        .from('doctor_notifications')
        .update({ read: true })
        .eq('doctor_id', doctorId)
        .eq('read', false);

    if (error) return { error: error.message };
    return { success: true };
}

// ── Psychiatry Module ────────────────────────────

export async function fetchMentalStatusExam(consultationId: string) {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
        .from('mental_status_exam')
        .select('*')
        .eq('consultation_id', consultationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error) console.error('fetchMentalStatusExam error:', error);
    return data;
}

export async function saveMentalStatusExam(payload: {
    consultation_id: string;
    doctor_id: string;
    appearance?: string;
    behavior?: string;
    speech?: string;
    mood?: string;
    affect?: string;
    thought_process?: string;
    thought_content?: string;
    perceptions?: string;
    cognition?: string;
    insight?: string;
    judgment?: string;
    risk_level?: string;
    notes?: string;
}) {
    const supabase = await createServerSupabase();

    // Upsert: update existing or insert new
    const existing = await fetchMentalStatusExam(payload.consultation_id);
    if (existing) {
        const { error } = await supabase
            .from('mental_status_exam')
            .update(payload)
            .eq('id', existing.id);
        if (error) return { error: error.message };
    } else {
        const { error } = await supabase
            .from('mental_status_exam')
            .insert(payload);
        if (error) return { error: error.message };
    }
    return { success: true };
}

export async function fetchRiskAssessment(consultationId: string) {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
        .from('risk_assessment')
        .select('*')
        .eq('consultation_id', consultationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error) console.error('fetchRiskAssessment error:', error);
    return data;
}

export async function saveRiskAssessment(payload: {
    consultation_id: string;
    patient_id: string;
    assessed_by: string;
    suicidal_ideation?: boolean;
    suicidal_plan?: boolean;
    suicidal_intent?: boolean;
    prior_attempts?: number;
    self_harm?: boolean;
    homicidal_ideation?: boolean;
    psychosis_active?: boolean;
    risk_level: string;
    protective_factors?: string;
    safety_plan?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    disposition?: string;
    notes?: string;
}) {
    const supabase = await createServerSupabase();

    const existing = await fetchRiskAssessment(payload.consultation_id);
    if (existing) {
        const { error } = await supabase
            .from('risk_assessment')
            .update(payload)
            .eq('id', existing.id);
        if (error) return { error: error.message };
    } else {
        const { error } = await supabase
            .from('risk_assessment')
            .insert(payload);
        if (error) return { error: error.message };
    }
    return { success: true };
}

export async function fetchPsychiatricDiagnosis(consultationId: string) {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
        .from('psychiatric_diagnosis')
        .select('*')
        .eq('consultation_id', consultationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error) console.error('fetchPsychiatricDiagnosis error:', error);
    return data;
}

export async function savePsychiatricDiagnosis(payload: {
    consultation_id: string;
    doctor_id: string;
    primary_diagnosis: string;
    icd10_code?: string;
    secondary_diagnoses?: { diagnosis: string; icd10_code?: string }[];
    differential?: string;
    clinical_reasoning?: string;
}) {
    const supabase = await createServerSupabase();

    const existing = await fetchPsychiatricDiagnosis(payload.consultation_id);
    if (existing) {
        const { error } = await supabase
            .from('psychiatric_diagnosis')
            .update(payload)
            .eq('id', existing.id);
        if (error) return { error: error.message };
    } else {
        const { error } = await supabase
            .from('psychiatric_diagnosis')
            .insert(payload);
        if (error) return { error: error.message };
    }
    return { success: true };
}

export async function fetchMedicationPlans(consultationId: string) {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
        .from('medication_plan')
        .select('*')
        .eq('consultation_id', consultationId)
        .order('created_at', { ascending: true });
    if (error) console.error('fetchMedicationPlans error:', error);
    return data || [];
}

export async function saveMedicationPlan(payload: {
    id?: string;
    consultation_id: string;
    patient_id: string;
    doctor_id: string;
    medication_name: string;
    generic_name?: string;
    dose: string;
    frequency: string;
    route?: string;
    indication?: string;
    start_date?: string;
    titration_schedule?: Record<string, number>;
    side_effects_to_monitor?: string[];
    interactions_noted?: string[];
    status?: string;
    discontinued_reason?: string;
}) {
    const supabase = await createServerSupabase();
    const { id, ...rest } = payload;

    if (id) {
        const { error } = await supabase
            .from('medication_plan')
            .update(rest)
            .eq('id', id);
        if (error) return { error: error.message };
    } else {
        const { error } = await supabase
            .from('medication_plan')
            .insert(rest);
        if (error) return { error: error.message };
    }
    return { success: true };
}

export async function fetchScreeningScores(patientId: string, instrument?: string) {
    const supabase = await createServerSupabase();
    let query = supabase
        .from('screening_scores')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

    if (instrument) {
        query = query.eq('instrument', instrument);
    }

    const { data, error } = await query.limit(20);
    if (error) console.error('fetchScreeningScores error:', error);
    return data || [];
}

export async function fetchPsychiatricIntake(consultationId: string) {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
        .from('psychiatric_intake')
        .select('*')
        .eq('consultation_id', consultationId)
        .maybeSingle();
    if (error) console.error('fetchPsychiatricIntake error:', error);
    return data;
}

export async function saveTherapyPlan(payload: {
    consultation_id: string;
    patient_id: string;
    doctor_id: string;
    therapy_type: string;
    goals?: string;
    frequency?: string;
    duration_weeks?: number;
    notes?: string;
    status?: string;
}) {
    const supabase = await createServerSupabase();
    const { error } = await supabase
        .from('therapy_plan')
        .insert(payload);
    if (error) return { error: error.message };
    return { success: true };
}

export async function saveFollowupPlan(payload: {
    consultation_id: string;
    patient_id: string;
    doctor_id: string;
    followup_type: string;
    interval_weeks: number;
    scheduled_date?: string;
    notes?: string;
}) {
    const supabase = await createServerSupabase();
    const { error } = await supabase
        .from('followup_plan')
        .insert(payload);
    if (error) return { error: error.message };
    return { success: true };
}

// ── ICD Code Search ──────────────────────────────

export async function searchIcdCodes(query: string, specialty?: string) {
    const supabase = await createServerSupabase();

    let q = supabase
        .from('icd_codes')
        .select('id, code, description, description_ar, category, specialty_tags')
        .eq('is_active', true)
        .order('code', { ascending: true })
        .limit(20);

    if (query && query.length >= 2) {
        q = q.or(`code.ilike.%${query}%,description.ilike.%${query}%`);
    }
    if (specialty && specialty !== 'all') {
        q = q.contains('specialty_tags', [specialty]);
    }

    const { data, error } = await q;
    if (error) console.error('searchIcdCodes error:', error);
    return data || [];
}
