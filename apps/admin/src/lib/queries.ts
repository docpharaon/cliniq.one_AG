import { supabaseAdmin } from './supabase';

// ──────────────────────────────────────────
// Chatbot Version Tracking
// ──────────────────────────────────────────

/**
 * Increment the chatbot version number in platform_settings.
 * Called automatically when admin changes prompts, sequences, or AI settings.
 * Version format: 0.1, 0.2, ... 0.9, 1.0, 1.1, etc.
 */
async function bumpChatbotVersion() {
    try {
        const { data } = await supabaseAdmin
            .from('platform_settings')
            .select('value')
            .eq('key', 'chatbot_version')
            .single();

        const currentVersion = parseFloat(data?.value ?? '0');
        const nextVersion = (currentVersion + 0.1).toFixed(1);

        await supabaseAdmin
            .from('platform_settings')
            .upsert(
                { key: 'chatbot_version', value: nextVersion, category: 'ai', description: 'Auto-incremented chatbot configuration version' },
                { onConflict: 'key' }
            );

        console.log(`[chatbot_version] bumped to v${nextVersion}`);
    } catch (err) {
        console.warn('[chatbot_version] bump failed:', err);
    }
}

// ──────────────────────────────────────────
// Users
// ──────────────────────────────────────────

export async function getUsers(page = 1, perPage = 50, search?: string, status?: string, role?: string) {
    let query = supabaseAdmin
        .from('users')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * perPage, page * perPage - 1);

    if (status && status !== 'all') {
        query = query.eq('status', status);
    }
    if (role && role !== 'all') {
        query = query.eq('role', role);
    }
    if (search) {
        query = query.or(`nickname.ilike.%${search}%,email.ilike.%${search}%,id::text.ilike.%${search}%`);
    }

    const { data, count, error } = await query;
    if (error) { console.error('[getUsers]', error.message); return { data: [], count: 0 }; }
    return { data: data ?? [], count: count ?? 0 };
}

export async function getUserById(id: string) {
    const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
    if (error) { console.error('[getUserById]', error.message); return null; }
    return data;
}

export async function updateUser(id: string, updates: Record<string, unknown>) {
    const { data, error } = await supabaseAdmin
        .from('users')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error) { console.error('[updateUser]', error.message); return { data: null, error: error.message }; }
    return { data, error: null };
}

export async function deleteUser(id: string) {
    // Delete auth user — cascades to public.users via FK
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) { console.error('[deleteUser]', error.message); return { success: false, error: error.message }; }
    return { success: true, error: null };
}

export async function getUserStats() {
    const [totalRes, activeRes, blockedRes, patientRes, doctorRes] = await Promise.all([
        supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('status', 'blocked'),
        supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('role', 'patient'),
        supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('role', 'doctor'),
    ]);

    return {
        total: totalRes.count ?? 0,
        active: activeRes.count ?? 0,
        blocked: blockedRes.count ?? 0,
        patients: patientRes.count ?? 0,
        doctors: doctorRes.count ?? 0,
    };
}

// ──────────────────────────────────────────
// Doctors
// ──────────────────────────────────────────

export async function getDoctors(page = 1, perPage = 50, search?: string, status?: string) {
    let query = supabaseAdmin
        .from('doctors')
        .select('*, user:users!doctors_user_id_fkey ( email )', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * perPage, page * perPage - 1);

    if (status && status !== 'all') {
        query = query.eq('status', status);
    }
    if (search) {
        query = query.or(`display_name.ilike.%${search}%,license_number.ilike.%${search}%,specialty.ilike.%${search}%`);
    }

    const { data, count, error } = await query;
    if (error) { console.error('[getDoctors]', error.message); return { data: [], count: 0 }; }

    const rows = (data ?? []).map((d: Record<string, unknown>) => ({
        ...d,
        email: (d.user as { email?: string } | null)?.email ?? null,
        user: undefined,
    }));

    return { data: rows, count: count ?? 0 };
}

export async function getDoctorById(id: string) {
    const { data, error } = await supabaseAdmin
        .from('doctors')
        .select('*, user:users!doctors_user_id_fkey ( email )')
        .eq('id', id)
        .single();
    if (error) { console.error('[getDoctorById]', error.message); return null; }
    return {
        ...data,
        email: (data.user as { email?: string } | null)?.email ?? null,
        user: undefined,
    };
}

export async function updateDoctor(id: string, updates: Record<string, unknown>) {
    const { data, error } = await supabaseAdmin
        .from('doctors')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error) { console.error('[updateDoctor]', error.message); return { data: null, error: error.message }; }
    return { data, error: null };
}

export async function deleteDoctor(id: string) {
    // Look up user_id first so we can cascade-delete the auth user
    const { data: doc, error: lookupErr } = await supabaseAdmin
        .from('doctors')
        .select('user_id')
        .eq('id', id)
        .single();
    if (lookupErr || !doc) {
        console.error('[deleteDoctor:lookup]', lookupErr?.message);
        return { success: false, error: lookupErr?.message ?? 'Doctor not found' };
    }

    // Delete auth user — cascades to public.users → public.doctors via FK
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(doc.user_id);
    if (authErr) {
        console.error('[deleteDoctor:auth]', authErr.message);
        return { success: false, error: authErr.message };
    }

    return { success: true, error: null };
}

export async function getDoctorStats() {
    const [totalRes, activeRes, pendingRes, suspendedRes, ratingRes] = await Promise.all([
        supabaseAdmin.from('doctors').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('doctors').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabaseAdmin.from('doctors').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabaseAdmin.from('doctors').select('*', { count: 'exact', head: true }).eq('status', 'suspended'),
        supabaseAdmin.from('doctors').select('rating_avg'),
    ]);

    const ratings = (ratingRes.data ?? []) as { rating_avg: number }[];
    const avgRating = ratings.length > 0
        ? ratings.reduce((sum, r) => sum + Number(r.rating_avg || 0), 0) / ratings.length
        : 0;

    return {
        total: totalRes.count ?? 0,
        active: activeRes.count ?? 0,
        pending: pendingRes.count ?? 0,
        suspended: suspendedRes.count ?? 0,
        avgRating: Math.round(avgRating * 10) / 10,
    };
}

export async function createDoctor(doctor: {
    email: string;
    password: string;
    phone?: string;
    full_name: string;
    display_name: string;
    license_number: string;
    license_authority: string;
    specialty: 'dermatology' | 'family_medicine';
    sub_specialty?: string;
    years_experience?: number;
    languages?: string[];
    hospital?: string;
    city?: string;
    bio?: string;
    daily_limit?: number;
    is_accepting?: boolean;
}) {
    // 1) Create auth user via Supabase Admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: doctor.email,
        password: doctor.password,
        email_confirm: true, // auto-confirm since admin is creating
    });
    if (authError || !authData?.user) {
        console.error('[createDoctor:auth]', authError?.message);
        return { data: null, error: authError?.message ?? 'Failed to create auth user' };
    }

    const userId = authData.user.id;

    // 2) Insert into public.users
    const { error: userError } = await supabaseAdmin
        .from('users')
        .insert({
            id: userId,
            email: doctor.email,
            phone: doctor.phone ?? null,
            nickname: doctor.display_name,
            role: 'doctor',
            status: 'active',
            city: doctor.city ?? null,
        });
    if (userError) {
        console.error('[createDoctor:users]', userError.message);
        // Rollback: delete auth user
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return { data: null, error: userError.message };
    }

    // 3) Insert into public.doctors
    const { data: doctorData, error: doctorError } = await supabaseAdmin
        .from('doctors')
        .insert({
            user_id: userId,
            full_name: doctor.full_name,
            display_name: doctor.display_name,
            license_number: doctor.license_number,
            license_authority: doctor.license_authority,
            specialty: doctor.specialty,
            sub_specialty: doctor.sub_specialty ?? null,
            years_experience: doctor.years_experience ?? null,
            languages: doctor.languages ?? ['en'],
            hospital: doctor.hospital ?? null,
            city: doctor.city ?? null,
            bio: doctor.bio ?? null,
            daily_limit: doctor.daily_limit ?? 8,
            is_accepting: doctor.is_accepting ?? true,
            must_change_password: true,
            status: 'active',
        })
        .select()
        .single();
    if (doctorError) {
        console.error('[createDoctor:doctors]', doctorError.message);
        // Rollback: delete user + auth
        await supabaseAdmin.from('users').delete().eq('id', userId);
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return { data: null, error: doctorError.message };
    }

    return { data: doctorData, error: null };
}

export async function resetDoctorPassword(doctorId: string, newPassword: string) {
    // 1) Look up user_id
    const { data: doc, error: lookupErr } = await supabaseAdmin
        .from('doctors')
        .select('user_id')
        .eq('id', doctorId)
        .single();
    if (lookupErr || !doc) {
        console.error('[resetDoctorPassword:lookup]', lookupErr?.message);
        return { success: false, error: lookupErr?.message ?? 'Doctor not found' };
    }

    // 2) Update auth password via admin API
    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(doc.user_id, {
        password: newPassword,
    });
    if (authErr) {
        console.error('[resetDoctorPassword:auth]', authErr.message);
        return { success: false, error: authErr.message };
    }

    // 3) Flag must_change_password
    const { error: updateErr } = await supabaseAdmin
        .from('doctors')
        .update({ must_change_password: true, updated_at: new Date().toISOString() })
        .eq('id', doctorId);
    if (updateErr) {
        console.error('[resetDoctorPassword:flag]', updateErr.message);
        return { success: false, error: updateErr.message };
    }

    return { success: true, error: null };
}

// ──────────────────────────────────────────
// Consultations
// ──────────────────────────────────────────

export async function getConsultations(page = 1, perPage = 50, search?: string, status?: string) {
    // Fetch consultations with patient nickname via a join
    let query = supabaseAdmin
        .from('consultations')
        .select(`
            *,
            patient:users!consultations_patient_id_fkey ( nickname ),
            doctor:doctors!consultations_doctor_id_fkey ( display_name )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * perPage, page * perPage - 1);

    if (status && status !== 'all') {
        query = query.eq('status', status);
    }
    if (search) {
        query = query.or(`id::text.ilike.%${search}%,chief_complaint.ilike.%${search}%`);
    }

    const { data, count, error } = await query;
    if (error) { console.error('[getConsultations]', error.message); return { data: [], count: 0 }; }

    // Flatten joined data for easier consumption
    const rows = (data ?? []).map((c: Record<string, unknown>) => ({
        ...c,
        patient_name: (c.patient as { nickname?: string } | null)?.nickname ?? 'Unknown',
        doctor_name: (c.doctor as { display_name?: string } | null)?.display_name ?? null,
    }));

    return { data: rows, count: count ?? 0 };
}

export async function getConsultationById(id: string) {
    const { data, error } = await supabaseAdmin
        .from('consultations')
        .select(`
            *,
            patient:users!consultations_patient_id_fkey ( id, nickname, email, phone, avatar_url ),
            doctor:doctors!consultations_doctor_id_fkey ( id, display_name, specialty, avatar_url )
        `)
        .eq('id', id)
        .single();
    if (error) { console.error('[getConsultationById]', error.message); return null; }
    return {
        ...data,
        patient_name: (data.patient as { nickname?: string } | null)?.nickname ?? 'Unknown',
        doctor_name: (data.doctor as { display_name?: string } | null)?.display_name ?? null,
    };
}

export async function getConsultationStats() {
    const [totalRes, inProgressRes, overdueRes, concludedRes, archivedRes, purgedRes] = await Promise.all([
        supabaseAdmin.from('consultations').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('consultations').select('*', { count: 'exact', head: true })
            .in('status', ['assigned', 'in_progress']),
        supabaseAdmin.from('consultations').select('*', { count: 'exact', head: true })
            .in('status', ['assigned', 'in_progress'])
            .lt('deadline_at', new Date().toISOString())
            .is('purged_at', null),
        supabaseAdmin.from('consultations').select('*', { count: 'exact', head: true })
            .not('concluded_at', 'is', null),
        supabaseAdmin.from('consultations').select('*', { count: 'exact', head: true })
            .not('archived_at', 'is', null)
            .is('purged_at', null),
        supabaseAdmin.from('consultations').select('*', { count: 'exact', head: true })
            .not('purged_at', 'is', null),
    ]);

    return {
        total: totalRes.count ?? 0,
        inProgress: inProgressRes.count ?? 0,
        overdue: overdueRes.count ?? 0,
        concluded: concludedRes.count ?? 0,
        archived: archivedRes.count ?? 0,
        purged: purgedRes.count ?? 0,
    };
}

export async function getOverdueConsultations(page = 1, perPage = 50) {
    const { data, count, error } = await supabaseAdmin
        .from('consultations')
        .select(`
            *,
            patient:users!consultations_patient_id_fkey ( nickname ),
            doctor:doctors!consultations_doctor_id_fkey ( display_name )
        `, { count: 'exact' })
        .in('status', ['assigned', 'in_progress'])
        .lt('deadline_at', new Date().toISOString())
        .is('purged_at', null)
        .order('deadline_at', { ascending: true })
        .range((page - 1) * perPage, page * perPage - 1);

    if (error) { console.error('[getOverdueConsultations]', error.message); return { data: [], count: 0 }; }

    const rows = (data ?? []).map((c: Record<string, unknown>) => ({
        ...c,
        patient_name: (c.patient as { nickname?: string } | null)?.nickname ?? 'Unknown',
        doctor_name: (c.doctor as { display_name?: string } | null)?.display_name ?? null,
    }));

    return { data: rows, count: count ?? 0 };
}

export async function archiveConsultation(id: string, adminUserId: string) {
    const { data, error } = await supabaseAdmin
        .from('consultations')
        .update({
            archived_at: new Date().toISOString(),
            archived_by: adminUserId,
        })
        .eq('id', id)
        .select()
        .single();

    if (error) { console.error('[archiveConsultation]', error.message); return { success: false, error: error.message }; }

    // Audit log
    await supabaseAdmin.from('consultation_audit_log').insert({
        consultation_id: id,
        action: 'archive',
        performed_by: adminUserId,
        metadata: { archived_at: data.archived_at },
    });

    return { success: true, error: null };
}

export async function purgeConsultationData(id: string, adminUserId: string) {
    // 1) Delete messages
    const { error: msgErr } = await supabaseAdmin
        .from('messages')
        .delete()
        .eq('consultation_id', id);
    if (msgErr) console.error('[purge:messages]', msgErr.message);

    // 2) Delete AI sessions
    const { error: aiErr } = await supabaseAdmin
        .from('ai_sessions')
        .delete()
        .eq('consultation_id', id);
    if (aiErr) console.error('[purge:ai_sessions]', aiErr.message);

    // 3) Delete protocol logs for this consultation
    const { error: plErr } = await supabaseAdmin
        .from('protocol_logs')
        .delete()
        .eq('consultation_id', id);
    if (plErr) console.error('[purge:protocol_logs]', plErr.message);

    // 4) Mark consultation as purged (keep the row for audit trail)
    const { error: upErr } = await supabaseAdmin
        .from('consultations')
        .update({
            purged_at: new Date().toISOString(),
            purged_by: adminUserId,
            ai_summary: null,
            ai_entities: null,
            report: null,
            prescription: null,
        })
        .eq('id', id);
    if (upErr) { console.error('[purge:consultation]', upErr.message); return { success: false, error: upErr.message }; }

    // 5) Audit log
    await supabaseAdmin.from('consultation_audit_log').insert({
        consultation_id: id,
        action: 'purge',
        performed_by: adminUserId,
        metadata: { purged_at: new Date().toISOString() },
    });

    return { success: true, error: null };
}

export async function assignConsultationToDoctor(consultationId: string, doctorId: string) {
    const { data, error } = await supabaseAdmin
        .from('consultations')
        .update({
            doctor_id: doctorId,
            status: 'assigned',
            assigned_at: new Date().toISOString(),
        })
        .eq('id', consultationId)
        .select()
        .single();

    if (error) { console.error('[assignConsultation]', error.message); return { success: false, error: error.message }; }

    // Audit log
    await supabaseAdmin.from('consultation_audit_log').insert({
        consultation_id: consultationId,
        action: 'admin_assign',
        performed_by: 'admin',
        metadata: { doctor_id: doctorId, assigned_at: data.assigned_at },
    });

    return { success: true, error: null };
}

// ──────────────────────────────────────────
// Protocol Logs
// ──────────────────────────────────────────

export async function getProtocolLogs(page = 1, perPage = 50, search?: string) {
    let query = supabaseAdmin
        .from('protocol_logs')
        .select(`
            *,
            patient:users!protocol_logs_patient_id_fkey ( nickname ),
            consultation:consultations!protocol_logs_consultation_id_fkey ( id )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * perPage, page * perPage - 1);

    if (search) {
        query = query.or(`protocol_code.ilike.%${search}%,trigger_text.ilike.%${search}%`);
    }

    const { data, count, error } = await query;
    if (error) { console.error('[getProtocolLogs]', error.message); return { data: [], count: 0 }; }

    const rows = (data ?? []).map((p: Record<string, unknown>) => ({
        ...p,
        patient_name: (p.patient as { nickname?: string } | null)?.nickname ?? 'Unknown',
    }));

    return { data: rows, count: count ?? 0 };
}

// ──────────────────────────────────────────
// Token Transactions
// ──────────────────────────────────────────

export async function getTokenTransactions(page = 1, perPage = 50, search?: string) {
    let query = supabaseAdmin
        .from('token_transactions')
        .select(`
            *,
            user:users!token_transactions_user_id_fkey ( nickname )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * perPage, page * perPage - 1);

    if (search) {
        query = query.or(`description.ilike.%${search}%,type.ilike.%${search}%`);
    }

    const { data, count, error } = await query;
    if (error) { console.error('[getTokenTransactions]', error.message); return { data: [], count: 0 }; }

    const rows = (data ?? []).map((t: Record<string, unknown>) => ({
        ...t,
        user_name: (t.user as { nickname?: string } | null)?.nickname ?? 'Unknown',
    }));

    return { data: rows, count: count ?? 0 };
}

// ──────────────────────────────────────────
// Dashboard Statistics
// ──────────────────────────────────────────

export async function getDashboardStats() {
    const [usersRes, doctorsRes, activeRes, tokensRes, protocolsRes] = await Promise.all([
        supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('doctors').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('consultations').select('*', { count: 'exact', head: true })
            .in('status', ['submitted', 'assigned', 'in_progress']),
        supabaseAdmin.from('users').select('tokens_balance'),
        supabaseAdmin.from('protocol_logs').select('*', { count: 'exact', head: true })
            .eq('resolved', false),
    ]);

    const totalTokens = (tokensRes.data ?? []).reduce(
        (sum: number, u: { tokens_balance?: number }) => sum + (u.tokens_balance ?? 0), 0
    );

    return {
        totalUsers: usersRes.count ?? 0,
        totalDoctors: doctorsRes.count ?? 0,
        activeConsultations: activeRes.count ?? 0,
        totalTokensInCirculation: totalTokens,
        unresolvedProtocols: protocolsRes.count ?? 0,
    };
}

// ──────────────────────────────────────────
// Schedules
// ──────────────────────────────────────────

export async function getSchedules(page = 1, perPage = 50, search?: string, dayOfWeek?: number, doctorId?: string) {
    let query = supabaseAdmin
        .from('schedules')
        .select(`
            *,
            doctor:doctors!schedules_doctor_id_fkey ( id, display_name, specialty )
        `, { count: 'exact' })
        .order('doctor_id')
        .range((page - 1) * perPage, page * perPage - 1);

    if (dayOfWeek !== undefined && dayOfWeek >= 0) {
        query = query.eq('day_of_week', dayOfWeek);
    }
    if (doctorId) {
        query = query.eq('doctor_id', doctorId);
    }

    const { data, count, error } = await query;
    if (error) { console.error('[getSchedules]', error.message); return { data: [], count: 0 }; }

    const rows = (data ?? []).map((s: Record<string, unknown>) => ({
        ...s,
        doctor_name: (s.doctor as { display_name?: string } | null)?.display_name ?? 'Unknown',
        doctor_specialty: (s.doctor as { specialty?: string } | null)?.specialty ?? '',
    }));

    return { data: rows, count: count ?? 0 };
}

export async function createSchedule(schedule: {
    doctor_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_active?: boolean;
    daily_limit?: number;
}) {
    const { data, error } = await supabaseAdmin
        .from('schedules')
        .insert({
            doctor_id: schedule.doctor_id,
            day_of_week: schedule.day_of_week,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            is_active: schedule.is_active ?? true,
            daily_limit: schedule.daily_limit ?? 20,
        })
        .select()
        .single();
    if (error) { console.error('[createSchedule]', error.message); return { data: null, error: error.message }; }
    return { data, error: null };
}

export async function updateSchedule(id: string, updates: Record<string, unknown>) {
    const { data, error } = await supabaseAdmin
        .from('schedules')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error) { console.error('[updateSchedule]', error.message); return { data: null, error: error.message }; }
    return { data, error: null };
}

export async function deleteSchedule(id: string) {
    const { error } = await supabaseAdmin
        .from('schedules')
        .delete()
        .eq('id', id);
    if (error) { console.error('[deleteSchedule]', error.message); return { success: false, error: error.message }; }
    return { success: true, error: null };
}

// ──────────────────────────────────────────
// News Articles
// ──────────────────────────────────────────

export async function getNewsArticles(page = 1, perPage = 50, search?: string) {
    let query = supabaseAdmin
        .from('news_articles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * perPage, page * perPage - 1);

    if (search) {
        query = query.or(`title.ilike.%${search}%,category.ilike.%${search}%`);
    }

    const { data, count, error } = await query;
    if (error) { console.error('[getNewsArticles]', error.message); return { data: [], count: 0 }; }
    return { data: data ?? [], count: count ?? 0 };
}

// ──────────────────────────────────────────
// Advertisements
// ──────────────────────────────────────────

export async function getAdvertisements(page = 1, perPage = 50, search?: string) {
    let query = supabaseAdmin
        .from('advertisements')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * perPage, page * perPage - 1);

    if (search) {
        query = query.or(`title.ilike.%${search}%,placement.ilike.%${search}%`);
    }

    const { data, count, error } = await query;
    if (error) { console.error('[getAdvertisements]', error.message); return { data: [], count: 0 }; }
    return { data: data ?? [], count: count ?? 0 };
}

// ──────────────────────────────────────────
// AI Prompts
// ──────────────────────────────────────────

export async function getAIPrompts(page = 1, perPage = 50, search?: string) {
    let query = supabaseAdmin
        .from('ai_prompts')
        .select('*', { count: 'exact' })
        .order('updated_at', { ascending: false })
        .range((page - 1) * perPage, page * perPage - 1);

    if (search) {
        query = query.or(`name.ilike.%${search}%,specialty.ilike.%${search}%,prompt_type.ilike.%${search}%`);
    }

    const { data, count, error } = await query;
    if (error) { console.error('[getAIPrompts]', error.message); return { data: [], count: 0 }; }
    return { data: data ?? [], count: count ?? 0 };
}

export async function getAIPromptById(id: string) {
    const { data, error } = await supabaseAdmin
        .from('ai_prompts')
        .select('*')
        .eq('id', id)
        .single();
    if (error) { console.error('[getAIPromptById]', error.message); return null; }
    return data;
}

export async function createAIPrompt(prompt: {
    name: string;
    specialty: string;
    prompt_type: string;
    content: string;
    is_active: boolean;
}) {
    const { data, error } = await supabaseAdmin
        .from('ai_prompts')
        .insert({ ...prompt, version: 1, status: 'draft' })
        .select()
        .single();
    if (error) { console.error('[createAIPrompt]', error.message); return { data: null, error: error.message }; }
    return { data, error: null };
}

export async function updateAIPrompt(id: string, prompt: {
    name?: string;
    specialty?: string;
    prompt_type?: string;
    content?: string;
    is_active?: boolean;
}) {
    // First get current version to snapshot it
    const current = await getAIPromptById(id);
    if (!current) return { data: null, error: 'Prompt not found' };

    const nextVersion = (current.version ?? 0) + 1;

    // Snapshot the current state into ai_prompt_versions
    const { error: snapError } = await supabaseAdmin
        .from('ai_prompt_versions')
        .insert({
            prompt_id: id,
            version: current.version ?? 1,
            name: current.name,
            specialty: current.specialty,
            prompt_type: current.prompt_type,
            content: current.content,
            is_active: current.is_active,
        });
    if (snapError) console.error('[snapshot]', snapError.message);

    // Mark as draft if content changed (edits need to be published)
    const isDraftWorthy = prompt.content !== undefined || prompt.name !== undefined || prompt.prompt_type !== undefined;

    // Now update the prompt
    const { data, error } = await supabaseAdmin
        .from('ai_prompts')
        .update({
            ...prompt,
            version: nextVersion,
            ...(isDraftWorthy ? { status: 'draft' } : {}),
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
    if (error) { console.error('[updateAIPrompt]', error.message); return { data: null, error: error.message }; }
    return { data, error: null };
}

export async function deleteAIPrompt(id: string) {
    const { error } = await supabaseAdmin
        .from('ai_prompts')
        .delete()
        .eq('id', id);
    if (error) { console.error('[deleteAIPrompt]', error.message); return { success: false, error: error.message }; }
    return { success: true, error: null };
}

// ── Draft → Publish workflow ──────────────────

/**
 * Get count of draft prompts (pending publish).
 */
export async function getDraftCount(): Promise<number> {
    const { count, error } = await supabaseAdmin
        .from('ai_prompts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'draft');
    if (error) { console.error('[getDraftCount]', error.message); return 0; }
    return count ?? 0;
}

/**
 * Publish all draft prompts:
 * 1. Set status='active' on all drafts
 * 2. Bump chatbot_version
 * Returns the new version number.
 */
export async function publishDrafts(): Promise<{ success: boolean; newVersion: string; publishedCount: number; error: string | null }> {
    try {
        // Get all drafts
        const { data: drafts, error: fetchErr } = await supabaseAdmin
            .from('ai_prompts')
            .select('id')
            .eq('status', 'draft');
        if (fetchErr) throw fetchErr;
        if (!drafts || drafts.length === 0) {
            return { success: true, newVersion: '', publishedCount: 0, error: null };
        }

        // Activate all drafts
        const { error: updateErr } = await supabaseAdmin
            .from('ai_prompts')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('status', 'draft');
        if (updateErr) throw updateErr;

        // Bump chatbot version
        await bumpChatbotVersion();

        // Get new version
        const { data: versionData } = await supabaseAdmin
            .from('platform_settings')
            .select('value')
            .eq('key', 'chatbot_version')
            .single();
        const newVersion = versionData?.value ?? '?';

        return { success: true, newVersion, publishedCount: drafts.length, error: null };
    } catch (err: any) {
        console.error('[publishDrafts]', err.message);
        return { success: false, newVersion: '', publishedCount: 0, error: err.message };
    }
}

// ── Version History ──────────────────────────

export async function getPromptVersions(promptId: string) {
    const { data, error } = await supabaseAdmin
        .from('ai_prompt_versions')
        .select('*')
        .eq('prompt_id', promptId)
        .order('version', { ascending: false });
    if (error) { console.error('[getPromptVersions]', error.message); return []; }
    return data ?? [];
}

export async function rollbackPrompt(promptId: string, versionId: string) {
    // 1) Get the historical version
    const { data: histVersion, error: hErr } = await supabaseAdmin
        .from('ai_prompt_versions')
        .select('*')
        .eq('id', versionId)
        .single();
    if (hErr || !histVersion) return { data: null, error: hErr?.message ?? 'Version not found' };

    // 2) Use updateAIPrompt which will snapshot current state before applying
    return updateAIPrompt(promptId, {
        name: histVersion.name,
        specialty: histVersion.specialty,
        prompt_type: histVersion.prompt_type,
        content: histVersion.content,
        is_active: histVersion.is_active,
    });
}

export async function getActivePromptByType(promptType: string, specialty?: string) {
    let query = supabaseAdmin
        .from('ai_prompts')
        .select('*')
        .eq('prompt_type', promptType)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1);

    if (specialty) {
        query = query.eq('specialty', specialty);
    }

    const { data, error } = await query;
    if (error) { console.error('[getActivePromptByType]', error.message); return null; }
    return data?.[0] ?? null;
}

// ──────────────────────────────────────────
// Prompt Sequences
// ──────────────────────────────────────────

export async function getPromptSequences() {
    const { data, error } = await supabaseAdmin
        .from('prompt_sequences')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name');
    if (error) { console.error('[getPromptSequences]', error.message); return []; }
    return data ?? [];
}

export async function getSequenceWithNodes(sequenceId: string) {
    const { data: sequence, error: sErr } = await supabaseAdmin
        .from('prompt_sequences')
        .select('*')
        .eq('id', sequenceId)
        .single();
    if (sErr) { console.error('[getSequenceWithNodes]', sErr.message); return null; }

    const { data: nodes, error: nErr } = await supabaseAdmin
        .from('prompt_sequence_nodes')
        .select('*, ai_prompts(id, name, prompt_type, is_active, version)')
        .eq('sequence_id', sequenceId)
        .order('sort_order');
    if (nErr) { console.error('[getSequenceNodes]', nErr.message); return null; }

    return { ...sequence, nodes: nodes ?? [] };
}

export async function getDefaultSequence() {
    const { data, error } = await supabaseAdmin
        .from('prompt_sequences')
        .select('id')
        .eq('is_default', true)
        .single();
    if (error || !data) {
        // Fallback to first sequence
        const { data: fallback } = await supabaseAdmin
            .from('prompt_sequences')
            .select('id')
            .order('created_at')
            .limit(1)
            .single();
        if (!fallback) return null;
        return getSequenceWithNodes(fallback.id);
    }
    return getSequenceWithNodes(data.id);
}

export async function createPromptSequence(name: string, isDefault = false) {
    // If setting as default, unset current default
    if (isDefault) {
        await supabaseAdmin
            .from('prompt_sequences')
            .update({ is_default: false })
            .eq('is_default', true);
    }
    const { data, error } = await supabaseAdmin
        .from('prompt_sequences')
        .insert({ name, is_default: isDefault })
        .select()
        .single();
    if (error) { console.error('[createPromptSequence]', error.message); return { data: null, error: error.message }; }
    await bumpChatbotVersion();
    return { data, error: null };
}

export async function updatePromptSequence(id: string, updates: { name?: string; is_default?: boolean }) {
    if (updates.is_default) {
        await supabaseAdmin
            .from('prompt_sequences')
            .update({ is_default: false })
            .eq('is_default', true);
    }
    const { data, error } = await supabaseAdmin
        .from('prompt_sequences')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error) { console.error('[updatePromptSequence]', error.message); return { data: null, error: error.message }; }
    await bumpChatbotVersion();
    return { data, error: null };
}

export async function deletePromptSequence(id: string) {
    const { error } = await supabaseAdmin
        .from('prompt_sequences')
        .delete()
        .eq('id', id);
    if (error) { console.error('[deletePromptSequence]', error.message); return { success: false, error: error.message }; }
    await bumpChatbotVersion();
    return { success: true, error: null };
}

// ── Sequence Nodes ──────────────────────────

export async function createSequenceNode(node: {
    sequence_id: string;
    step_key: string;
    label: string;
    emoji?: string;
    prompt_id?: string | null;
    sort_order: number;
    parent_node_id?: string | null;
    pathway_condition?: string | null;
}) {
    const { data, error } = await supabaseAdmin
        .from('prompt_sequence_nodes')
        .insert(node)
        .select('*, ai_prompts(id, name, prompt_type, is_active, version)')
        .single();
    if (error) { console.error('[createSequenceNode]', error.message); return { data: null, error: error.message }; }
    await bumpChatbotVersion();
    return { data, error: null };
}

export async function updateSequenceNode(id: string, updates: {
    step_key?: string;
    label?: string;
    emoji?: string;
    prompt_id?: string | null;
    sort_order?: number;
    parent_node_id?: string | null;
    pathway_condition?: string | null;
}) {
    const { data, error } = await supabaseAdmin
        .from('prompt_sequence_nodes')
        .update(updates)
        .eq('id', id)
        .select('*, ai_prompts(id, name, prompt_type, is_active, version)')
        .single();
    if (error) { console.error('[updateSequenceNode]', error.message); return { data: null, error: error.message }; }
    await bumpChatbotVersion();
    return { data, error: null };
}

export async function deleteSequenceNode(id: string) {
    const { error } = await supabaseAdmin
        .from('prompt_sequence_nodes')
        .delete()
        .eq('id', id);
    if (error) { console.error('[deleteSequenceNode]', error.message); return { success: false, error: error.message }; }
    await bumpChatbotVersion();
    return { success: true, error: null };
}

export async function reorderSequenceNodes(sequenceId: string, orderedIds: string[]) {
    const updates = orderedIds.map((id, idx) =>
        supabaseAdmin
            .from('prompt_sequence_nodes')
            .update({ sort_order: idx })
            .eq('id', id)
            .eq('sequence_id', sequenceId)
    );
    await Promise.all(updates);
    await bumpChatbotVersion();
    return { success: true };
}

// ──────────────────────────────────────────
// Error Reports
// ──────────────────────────────────────────

export async function getErrorReports(page = 1, perPage = 50, search?: string) {
    let query = supabaseAdmin
        .from('error_reports')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * perPage, page * perPage - 1);

    if (search) {
        query = query.or(`category.ilike.%${search}%,description.ilike.%${search}%,reporter_name.ilike.%${search}%`);
    }

    const { data, count, error } = await query;
    if (error) { console.error('[getErrorReports]', error.message); return { data: [], count: 0 }; }
    return { data: data ?? [], count: count ?? 0 };
}

// ──────────────────────────────────────────
// Platform Settings
// ──────────────────────────────────────────

export async function getSettings(category?: string) {
    let query = supabaseAdmin
        .from('platform_settings')
        .select('*')
        .order('category')
        .order('key');

    if (category) {
        query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) { console.error('[getSettings]', error.message); return []; }
    return data ?? [];
}

export async function upsertPlatformSetting(key: string, value: string, category: string, description?: string) {
    const { data, error } = await supabaseAdmin
        .from('platform_settings')
        .upsert(
            { key, value, category, description: description ?? null },
            { onConflict: 'key' }
        )
        .select()
        .single();
    if (error) { console.error('[upsertPlatformSetting]', error.message); return { data: null, error: error.message }; }
    // Bump chatbot version if AI/protocol-related setting changed
    if (key.startsWith('ai_') || key.startsWith('protocol_') || key.startsWith('openai_')) {
        await bumpChatbotVersion();
    }
    return { data, error: null };
}

export async function getPlatformSetting(key: string) {
    const { data, error } = await supabaseAdmin
        .from('platform_settings')
        .select('value')
        .eq('key', key)
        .single();
    if (error) return null;
    return data?.value ?? null;
}

// ──────────────────────────────────────────
// Interventions
// ──────────────────────────────────────────

export async function getInterventions(page = 1, perPage = 50, search?: string, status?: string, type?: string) {
    let query = supabaseAdmin
        .from('interventions')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * perPage, page * perPage - 1);

    if (status && status !== 'all') {
        query = query.eq('status', status);
    }
    if (type && type !== 'all') {
        query = query.eq('type', type);
    }
    if (search) {
        query = query.or(`title.ilike.%${search}%,category.ilike.%${search}%,clinical_indication.ilike.%${search}%`);
    }

    const { data, count, error } = await query;
    if (error) { console.error('[getInterventions]', error.message); return { data: [], count: 0 }; }
    return { data: data ?? [], count: count ?? 0 };
}

export async function getInterventionStats() {
    const [totalRes, pendingRes, completedRes, cancelledRes] = await Promise.all([
        supabaseAdmin.from('interventions').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('interventions').select('*', { count: 'exact', head: true })
            .in('status', ['ordered', 'pending_auth', 'scheduled']),
        supabaseAdmin.from('interventions').select('*', { count: 'exact', head: true })
            .in('status', ['completed', 'results_ready', 'reviewed']),
        supabaseAdmin.from('interventions').select('*', { count: 'exact', head: true })
            .eq('status', 'cancelled'),
    ]);

    return {
        total: totalRes.count ?? 0,
        pending: pendingRes.count ?? 0,
        completed: completedRes.count ?? 0,
        cancelled: cancelledRes.count ?? 0,
    };
}

// ──────────────────────────────────────────
// Service Catalog
// ──────────────────────────────────────────

export async function getServiceCatalog(page = 1, perPage = 50, search?: string, type?: string) {
    let query = supabaseAdmin
        .from('service_catalog')
        .select('*', { count: 'exact' })
        .order('category')
        .order('name')
        .range((page - 1) * perPage, page * perPage - 1);

    if (type && type !== 'all') {
        query = query.eq('type', type);
    }
    if (search) {
        query = query.or(`name.ilike.%${search}%,category.ilike.%${search}%`);
    }

    const { data, count, error } = await query;
    if (error) { console.error('[getServiceCatalog]', error.message); return { data: [], count: 0 }; }
    return { data: data ?? [], count: count ?? 0 };
}

export async function createServiceCatalogItem(item: {
    category: string;
    subcategory?: string | null;
    name: string;
    name_ar: string;
    description?: string | null;
    description_ar?: string | null;
    type: string;
    sample_required?: string | null;
    fasting_required: boolean;
    avg_cost_sar?: number | null;
    avg_turnaround_days?: number | null;
    is_active: boolean;
}) {
    const { data, error } = await supabaseAdmin
        .from('service_catalog')
        .insert(item)
        .select()
        .single();
    if (error) { console.error('[createServiceCatalogItem]', error.message); return { data: null, error: error.message }; }
    return { data, error: null };
}

export async function updateServiceCatalogItem(id: string, updates: Record<string, unknown>) {
    const { data, error } = await supabaseAdmin
        .from('service_catalog')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    if (error) { console.error('[updateServiceCatalogItem]', error.message); return { data: null, error: error.message }; }
    return { data, error: null };
}

export async function deleteServiceCatalogItem(id: string) {
    const { error } = await supabaseAdmin
        .from('service_catalog')
        .delete()
        .eq('id', id);
    if (error) { console.error('[deleteServiceCatalogItem]', error.message); return { success: false, error: error.message }; }
    return { success: true, error: null };
}

// ──────────────────────────────────────────
// Service Providers
// ──────────────────────────────────────────

export async function getServiceProviders(page = 1, perPage = 50, search?: string, type?: string) {
    let query = supabaseAdmin
        .from('service_providers')
        .select('*', { count: 'exact' })
        .order('name')
        .range((page - 1) * perPage, page * perPage - 1);

    if (type && type !== 'all') {
        query = query.eq('type', type);
    }
    if (search) {
        query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%`);
    }

    const { data, count, error } = await query;
    if (error) { console.error('[getServiceProviders]', error.message); return { data: [], count: 0 }; }
    return { data: data ?? [], count: count ?? 0 };
}

export async function createServiceProvider(provider: Record<string, unknown>) {
    const { data, error } = await supabaseAdmin
        .from('service_providers')
        .insert(provider)
        .select()
        .single();
    if (error) { console.error('[createServiceProvider]', error.message); return { data: null, error: error.message }; }
    return { data, error: null };
}

export async function updateServiceProvider(id: string, updates: Record<string, unknown>) {
    const { data, error } = await supabaseAdmin
        .from('service_providers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    if (error) { console.error('[updateServiceProvider]', error.message); return { data: null, error: error.message }; }
    return { data, error: null };
}

export async function deleteServiceProvider(id: string) {
    const { error } = await supabaseAdmin
        .from('service_providers')
        .delete()
        .eq('id', id);
    if (error) { console.error('[deleteServiceProvider]', error.message); return { success: false, error: error.message }; }
    return { success: true, error: null };
}

