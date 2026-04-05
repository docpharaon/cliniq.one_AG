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
    } else {
        query = query.neq('role', 'doctor');
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
    const [totalRes, activeRes, blockedRes, patientRes] = await Promise.all([
        supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).neq('role', 'doctor'),
        supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('status', 'active').neq('role', 'doctor'),
        supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('status', 'blocked').neq('role', 'doctor'),
        supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('role', 'patient'),
    ]);

    return {
        total: totalRes.count ?? 0,
        active: activeRes.count ?? 0,
        blocked: blockedRes.count ?? 0,
        patients: patientRes.count ?? 0,
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
    doctor_type?: 'permanent' | 'locum';
}) {
    const docType = doctor.doctor_type ?? 'permanent';
    const isLocum = docType === 'locum';
    // Generate unique identifier code: DR-XXXX
    const identifierCode = 'DR-' + Math.random().toString(36).substring(2, 6).toUpperCase();
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
            is_accepting: isLocum ? false : (doctor.is_accepting ?? true),
            must_change_password: true,
            status: 'active',
            doctor_type: docType,
            identifier_code: identifierCode,
            credential_expires_at: isLocum ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null,
            sandbox_mode: isLocum,
            qr_payload: JSON.stringify({ code: identifierCode, type: docType }),
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

// ── Locum Management ─────────────────────────

export async function renewLocumCredential(doctorId: string) {
    const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabaseAdmin
        .from('doctors')
        .update({ credential_expires_at: newExpiry })
        .eq('id', doctorId)
        .eq('doctor_type', 'locum')
        .select()
        .single();
    if (error) { console.error('[renewLocumCredential]', error.message); return { data: null, error: error.message }; }
    return { data, error: null };
}

export async function getExpiredLocumDoctors() {
    const { data, error } = await supabaseAdmin
        .from('doctors')
        .select('id, display_name, specialty, credential_expires_at, identifier_code, status')
        .eq('doctor_type', 'locum')
        .lt('credential_expires_at', new Date().toISOString())
        .order('credential_expires_at', { ascending: true });
    if (error) { console.error('[getExpiredLocumDoctors]', error.message); return []; }
    return data ?? [];
}

export async function getExpiringLocumDoctors(withinDays = 2) {
    const futureDate = new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
        .from('doctors')
        .select('id, display_name, specialty, credential_expires_at, identifier_code')
        .eq('doctor_type', 'locum')
        .gt('credential_expires_at', now)
        .lt('credential_expires_at', futureDate)
        .order('credential_expires_at', { ascending: true });
    if (error) { console.error('[getExpiringLocumDoctors]', error.message); return []; }
    return data ?? [];
}

export async function lookupDoctorByCode(code: string) {
    const { data, error } = await supabaseAdmin
        .from('doctors')
        .select('id, display_name, full_name, specialty, avatar_url, rating_avg, doctor_type, identifier_code, credential_expires_at, is_accepting, status')
        .eq('identifier_code', code.toUpperCase())
        .eq('status', 'active')
        .single();
    if (error) { console.error('[lookupDoctorByCode]', error.message); return null; }
    // Check if locum credentials are valid
    if (data.doctor_type === 'locum' && data.credential_expires_at) {
        if (new Date(data.credential_expires_at) < new Date()) {
            return null; // Expired locum
        }
    }
    return data;
}

// ── Locum Onboarding Pipeline ────────────────

/** Generate a short unique invite code like INV-A3F2 */
function generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 for readability
    let code = 'INV-';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

export async function createLocumInvitation(adminId: string, specialty: string, expiresInDays = 14, notes?: string) {
    if (!adminId) {
        console.error('[createLocumInvitation] adminId is empty');
        return { data: null, error: 'Admin ID is required' };
    }

    // Ensure admin exists in users table (FK constraint)
    const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', adminId)
        .single();

    if (!existingUser) {
        // Auto-create user row for admin (may have been created via auth but not inserted into users)
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(adminId);
        if (authUser?.user) {
            await supabaseAdmin.from('users').upsert({
                id: adminId,
                email: authUser.user.email || '',
                nickname: authUser.user.email?.split('@')[0] || 'admin',
                role: 'admin',
                status: 'active',
            }, { onConflict: 'id' });
        }
    }

    const inviteCode = generateInviteCode();
    // QR payload is a URL pointing to the doctor-web locum signup page
    const baseUrl = process.env.NEXT_PUBLIC_DOCTOR_WEB_URL || 'https://doctor.cliniq.one';
    const qrPayload = `${baseUrl}/locum-signup/${inviteCode}`;

    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabaseAdmin
        .from('locum_invitations')
        .insert({
            invited_by: adminId,
            invite_code: inviteCode,
            qr_payload: qrPayload,
            specialty,
            status: 'pending',
            notes: notes || null,
            expires_at: expiresAt,
        })
        .select()
        .single();

    if (error) { console.error('[createLocumInvitation]', error.message); return { data: null, error: error.message }; }
    return { data, error: null };
}


export async function getLocumInvitations() {
    const { data, error } = await supabaseAdmin
        .from('locum_invitations')
        .select('*, invited_user:users!invited_by(nickname)')
        .order('created_at', { ascending: false });
    if (error) { console.error('[getLocumInvitations]', error.message); return []; }
    return data ?? [];
}

export async function revokeLocumInvitation(invitationId: string) {
    const { data, error } = await supabaseAdmin
        .from('locum_invitations')
        .update({ status: 'revoked' })
        .eq('id', invitationId)
        .eq('status', 'pending')
        .select()
        .single();
    if (error) { console.error('[revokeLocumInvitation]', error.message); return { data: null, error: error.message }; }
    return { data, error: null };
}

export async function getLocumDocuments(doctorId: string) {
    const { data, error } = await supabaseAdmin
        .from('locum_documents')
        .select('*')
        .eq('doctor_id', doctorId)
        .order('uploaded_at', { ascending: false });
    if (error) { console.error('[getLocumDocuments]', error.message); return []; }
    return data ?? [];
}

export async function getPendingLocumOnboarding() {
    const { data, error } = await supabaseAdmin
        .from('doctors')
        .select('id, display_name, full_name, specialty, identifier_code, onboarding_status, created_at')
        .in('onboarding_status', ['documents_pending', 'review_pending'])
        .eq('doctor_type', 'locum')
        .order('created_at', { ascending: true });
    if (error) { console.error('[getPendingLocumOnboarding]', error.message); return []; }
    return data ?? [];
}

export async function approveLocumOnboarding(doctorId: string, adminId: string) {
    // 1. Set onboarding status to approved
    const { error: docError } = await supabaseAdmin
        .from('doctors')
        .update({
            onboarding_status: 'approved',
            status: 'active',
            credential_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', doctorId);
    if (docError) { console.error('[approveLocumOnboarding]', docError.message); return { error: docError.message }; }

    // 2. Mark all documents as verified
    await supabaseAdmin
        .from('locum_documents')
        .update({ verified: true, verified_by: adminId, verified_at: new Date().toISOString() })
        .eq('doctor_id', doctorId);

    return { error: null };
}

export async function rejectLocumOnboarding(doctorId: string, reason: string) {
    const { error } = await supabaseAdmin
        .from('doctors')
        .update({ onboarding_status: 'rejected', status: 'suspended' })
        .eq('id', doctorId);
    if (error) { console.error('[rejectLocumOnboarding]', error.message); return { error: error.message }; }
    return { error: null };
}

export async function updateDoctorPricing(doctorId: string, feeTokens: number) {
    const { data, error } = await supabaseAdmin
        .from('doctors')
        .update({ consultation_fee_tokens: feeTokens })
        .eq('id', doctorId)
        .select('id, consultation_fee_tokens')
        .single();
    if (error) { console.error('[updateDoctorPricing]', error.message); return { data: null, error: error.message }; }
    return { data, error: null };
}

export async function getLocumPricingLimits() {
    const [minRes, maxRes] = await Promise.all([
        supabaseAdmin.from('app_settings').select('value').eq('key', 'locum_fee_min_tokens').single(),
        supabaseAdmin.from('app_settings').select('value').eq('key', 'locum_fee_max_tokens').single(),
    ]);
    return {
        min: parseInt(minRes.data?.value ?? '2', 10),
        max: parseInt(maxRes.data?.value ?? '10', 10),
    };
}

export async function setLocumPricingLimits(min: number, max: number) {
    await Promise.all([
        supabaseAdmin.from('app_settings').upsert({ key: 'locum_fee_min_tokens', value: String(min), description: 'Minimum consultation fee (tokens) a locum can charge' }),
        supabaseAdmin.from('app_settings').upsert({ key: 'locum_fee_max_tokens', value: String(max), description: 'Maximum consultation fee (tokens) a locum can charge' }),
    ]);
    return { error: null };
}

export async function getActiveLocums() {
    const { data, error } = await supabaseAdmin
        .from('doctors')
        .select('id, display_name, full_name, specialty, identifier_code, credential_expires_at, sandbox_mode, status, consultation_fee_tokens, created_at')
        .eq('doctor_type', 'locum')
        .eq('onboarding_status', 'approved')
        .order('created_at', { ascending: false });
    if (error) { console.error('[getActiveLocums]', error.message); return []; }

    // Get consultation counts per doctor
    const ids = (data ?? []).map(d => d.id);
    if (ids.length === 0) return [];

    const { data: counts } = await supabaseAdmin
        .from('consultations')
        .select('doctor_id')
        .in('doctor_id', ids);

    const countMap: Record<string, number> = {};
    (counts ?? []).forEach((c: { doctor_id: string }) => {
        countMap[c.doctor_id] = (countMap[c.doctor_id] || 0) + 1;
    });

    return (data ?? []).map(d => ({ ...d, consultation_count: countMap[d.id] || 0 }));
}

// ── Locum Codes (AI Routing) ─────────────────
export async function getLocumCodeDoctors() {
    const { data, error } = await supabaseAdmin
        .from('doctors')
        .select('id, display_name, full_name, specialty, locum_code, doctor_type, status, created_at')
        .not('locum_code', 'is', null)
        .order('created_at', { ascending: false });
    if (error) { console.error('[getLocumCodeDoctors]', error.message); return []; }
    return data ?? [];
}

export function generateLocumCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'LC-';
    for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

export async function assignLocumCode(doctorId: string, code: string) {
    const { error } = await supabaseAdmin
        .from('doctors')
        .update({ locum_code: code })
        .eq('id', doctorId);
    if (error) { console.error('[assignLocumCode]', error.message); return { error: error.message }; }
    return { error: null };
}

export async function revokeLocumCode(doctorId: string) {
    const { error } = await supabaseAdmin
        .from('doctors')
        .update({ locum_code: null })
        .eq('id', doctorId);
    if (error) { console.error('[revokeLocumCode]', error.message); return { error: error.message }; }
    return { error: null };
}

export async function searchDoctorsForLocum(query: string) {
    const { data, error } = await supabaseAdmin
        .from('doctors')
        .select('id, display_name, full_name, specialty, doctor_type, locum_code')
        .or(`display_name.ilike.%${query}%,full_name.ilike.%${query}%`)
        .limit(10);
    if (error) { console.error('[searchDoctorsForLocum]', error.message); return []; }
    return data ?? [];
}

export async function suspendLocum(doctorId: string) {
    const { data: doc } = await supabaseAdmin.from('doctors').select('status').eq('id', doctorId).single();
    const newStatus = doc?.status === 'suspended' ? 'active' : 'suspended';
    const { error } = await supabaseAdmin
        .from('doctors')
        .update({ status: newStatus })
        .eq('id', doctorId)
        .eq('doctor_type', 'locum');
    if (error) { console.error('[suspendLocum]', error.message); return { error: error.message }; }
    return { error: null, newStatus };
}

export async function toggleLocumSandbox(doctorId: string, sandbox: boolean) {
    const { error } = await supabaseAdmin
        .from('doctors')
        .update({ sandbox_mode: sandbox })
        .eq('id', doctorId)
        .eq('doctor_type', 'locum');
    if (error) { console.error('[toggleLocumSandbox]', error.message); return { error: error.message }; }
    return { error: null };
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

export async function getPendingArchiveCount() {
    // Concluded but not yet archived or purged
    const { count, error } = await supabaseAdmin
        .from('consultations')
        .select('*', { count: 'exact', head: true })
        .not('concluded_at', 'is', null)
        .is('archived_at', null)
        .is('purged_at', null);
    if (error) { console.error('[getPendingArchiveCount]', error.message); return 0; }
    return count ?? 0;
}

export async function getPendingArchiveConsultations() {
    const { data, error } = await supabaseAdmin
        .from('consultations')
        .select('id, patient_name, doctor_name, specialty, status, priority, chief_complaint, concluded_at, created_at')
        .not('concluded_at', 'is', null)
        .is('archived_at', null)
        .is('purged_at', null)
        .order('concluded_at', { ascending: true });
    if (error) { console.error('[getPendingArchiveConsultations]', error.message); return []; }
    return data ?? [];
}

export async function batchArchiveConsultations(ids: string[], adminUserId: string) {
    const now = new Date().toISOString();
    let successCount = 0;
    const errors: string[] = [];

    for (const id of ids) {
        const { error } = await supabaseAdmin
            .from('consultations')
            .update({ archived_at: now, archived_by: adminUserId })
            .eq('id', id);
        if (error) {
            console.error(`[batchArchive:${id}]`, error.message);
            errors.push(`${id.slice(0, 8)}: ${error.message}`);
        } else {
            successCount++;
            await supabaseAdmin.from('consultation_audit_log').insert({
                consultation_id: id,
                action: 'archive',
                performed_by: adminUserId,
                metadata: { archived_at: now, batch: true },
            });
        }
    }

    return { successCount, totalCount: ids.length, errors };
}

export async function batchPurgeConsultations(ids: string[], adminUserId: string) {
    const now = new Date().toISOString();
    let successCount = 0;
    const errors: string[] = [];

    for (const id of ids) {
        // Delete messages
        await supabaseAdmin.from('messages').delete().eq('consultation_id', id);
        // Delete AI sessions
        await supabaseAdmin.from('ai_sessions').delete().eq('consultation_id', id);
        // Delete protocol logs
        await supabaseAdmin.from('protocol_logs').delete().eq('consultation_id', id);
        // Null out data and mark purged
        const { error } = await supabaseAdmin
            .from('consultations')
            .update({
                purged_at: now,
                purged_by: adminUserId,
                ai_summary: null,
                ai_entities: null,
                report: null,
                prescription: null,
            })
            .eq('id', id);
        if (error) {
            console.error(`[batchPurge:${id}]`, error.message);
            errors.push(`${id.slice(0, 8)}: ${error.message}`);
        } else {
            successCount++;
            await supabaseAdmin.from('consultation_audit_log').insert({
                consultation_id: id,
                action: 'purge',
                performed_by: adminUserId,
                metadata: { purged_at: now, batch: true },
            });
        }
    }

    return { successCount, totalCount: ids.length, errors };
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

/**
 * Get consultation counts grouped by 3-hour windows over the last 24 hours.
 */
export async function getConsultationFlow() {
    const now = new Date();
    const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const { data, error } = await supabaseAdmin
        .from('consultations')
        .select('created_at')
        .gte('created_at', past24h.toISOString())
        .order('created_at', { ascending: true });

    if (error) { console.error('[getConsultationFlow]', error.message); return []; }

    const windows: Record<string, number> = {};
    for (let h = 0; h < 24; h += 3) {
        windows[`${String(h).padStart(2, '0')}:00`] = 0;
    }

    (data ?? []).forEach((c: { created_at: string }) => {
        const hour = new Date(c.created_at).getHours();
        const windowStart = Math.floor(hour / 3) * 3;
        const key = `${String(windowStart).padStart(2, '0')}:00`;
        windows[key] = (windows[key] || 0) + 1;
    });

    return Object.entries(windows).map(([time, consultations]) => ({ time, consultations }));
}

/**
 * Get consultation counts grouped by specialty.
 */
export async function getSpecialtyBreakdown() {
    const { data, error } = await supabaseAdmin
        .from('consultations')
        .select('specialty');

    if (error) { console.error('[getSpecialtyBreakdown]', error.message); return []; }

    const counts: Record<string, number> = {};
    (data ?? []).forEach((c: { specialty: string }) => {
        const s = c.specialty || 'unknown';
        counts[s] = (counts[s] || 0) + 1;
    });

    const FILL_COLORS: Record<string, string> = {
        dermatology: '#2DD4BF',
        family_medicine: '#5EEAD4',
        general: '#3B82F6',
    };

    return Object.entries(counts)
        .map(([name, count]) => ({
            name: name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            count,
            fill: FILL_COLORS[name] || '#9B72CF',
        }))
        .sort((a, b) => b.count - a.count);
}

/**
 * Get recent activity feed from real data (registrations + consultation events).
 */
export async function getRecentActivity() {
    const [usersRes, consultsRes] = await Promise.all([
        supabaseAdmin
            .from('users')
            .select('id, nickname, email, created_at')
            .order('created_at', { ascending: false })
            .limit(5),
        supabaseAdmin
            .from('consultations')
            .select('id, status, chief_complaint, specialty, created_at, updated_at')
            .order('updated_at', { ascending: false })
            .limit(5),
    ]);

    const items: { id: string; text: string; time: string; type: 'info' | 'success' | 'error' }[] = [];

    (usersRes.data ?? []).forEach((u: any) => {
        items.push({
            id: `user-${u.id}`,
            text: `New patient ${u.nickname || u.email || 'Anonymous'} registered`,
            time: u.created_at,
            type: 'info',
        });
    });

    (consultsRes.data ?? []).forEach((c: any) => {
        const typeMap: Record<string, 'info' | 'success' | 'error'> = {
            submitted: 'info', assigned: 'info', in_progress: 'info',
            completed: 'success', report_ready: 'success', cancelled: 'error',
        };
        const statusLabel = (c.status || '').replace(/_/g, ' ');
        items.push({
            id: `consult-${c.id}`,
            text: `Consultation "${c.chief_complaint || c.specialty || 'Unknown'}" \u2014 ${statusLabel}`,
            time: c.updated_at || c.created_at,
            type: typeMap[c.status] || 'info',
        });
    });

    items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    function formatTimeAgo(isoDate: string): string {
        const diff = Date.now() - new Date(isoDate).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins} min ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }

    return items.slice(0, 8).map(item => ({ ...item, time: formatTimeAgo(item.time) }));
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
// AI Prompts
// ──────────────────────────────────────────

export async function getAIPrompts(page = 1, perPage = 50, search?: string) {
    let query = supabaseAdmin
        .from('ai_prompts')
        .select('*', { count: 'exact' })
        .neq('status', 'deleted')
        .order('name', { ascending: true })
        .range((page - 1) * perPage, page * perPage - 1);

    if (search) {
        query = query.or(`name.ilike.%${search}%,specialty.ilike.%${search}%,prompt_type.ilike.%${search}%`);
    }

    const { data, count, error } = await query;
    if (error) { console.error('[getAIPrompts]', error.message); return { data: [], count: 0 }; }
    return { data: data ?? [], count: count ?? 0 };
}

/** Get recent prompt changes for dashboard "Recent Activity" */
export async function getRecentPromptActivity(limit = 5) {
    const { data, error } = await supabaseAdmin
        .from('ai_prompts')
        .select('id, name, version, is_active, status, updated_at')
        .neq('status', 'deleted')
        .order('updated_at', { ascending: false })
        .limit(limit);
    if (error) { console.error('[getRecentPromptActivity]', error.message); return []; }
    return data ?? [];
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
    // Check if any sequence nodes are linked to this prompt
    const { data: linkedNodes, error: checkErr } = await supabaseAdmin
        .from('prompt_sequence_nodes')
        .select('id, label, prompt_sequences(name)')
        .eq('prompt_id', id);
    if (checkErr) { console.error('[deleteAIPrompt-check]', checkErr.message); }
    if (linkedNodes && linkedNodes.length > 0) {
        const nodeNames = linkedNodes.map((n: any) => `"${n.label}" in ${n.prompt_sequences?.name || 'unknown'}`).join(', ');
        return { success: false, error: `Cannot delete: prompt is linked to ${linkedNodes.length} sequence node(s): ${nodeNames}. Unlink them first.` };
    }

    // Soft-delete: mark as deleted instead of hard-removing
    const { error } = await supabaseAdmin
        .from('ai_prompts')
        .update({ is_active: false, status: 'deleted', updated_at: new Date().toISOString() })
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

// ── Three-Phase Model: fetch sequence by type + optional specialty ──
export async function getSequenceByType(
    sequenceType: 'global_intake' | 'global_wrapup' | 'specialty' | 'refill' | 'followup',
    specialty?: string,
) {
    let query = supabaseAdmin
        .from('prompt_sequences')
        .select('id')
        .eq('sequence_type', sequenceType);

    if (sequenceType === 'specialty' && specialty) {
        query = query.eq('specialty', specialty);
    }

    const { data: seq, error } = await query.limit(1).maybeSingle();
    if (error || !seq) {
        console.warn(`[getSequenceByType] No sequence for type="${sequenceType}" specialty="${specialty || 'none'}"`);
        return null;
    }
    return getSequenceWithNodes(seq.id);
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
    // Block deletion if this is the active production sequence
    const activeSeqId = await getPlatformSetting('ai_active_sequence_id');
    if (activeSeqId === id) {
        return { success: false, error: 'Cannot delete: this is the active production sequence. Deactivate it or switch to a different sequence first.' };
    }
    // Block deletion of the only remaining sequence
    const { count } = await supabaseAdmin
        .from('prompt_sequences')
        .select('*', { count: 'exact', head: true });
    if ((count ?? 0) <= 1) {
        return { success: false, error: 'Cannot delete: this is the only sequence. Create another one first.' };
    }
    const { error } = await supabaseAdmin
        .from('prompt_sequences')
        .delete()
        .eq('id', id);
    if (error) { console.error('[deletePromptSequence]', error.message); return { success: false, error: error.message }; }
    await bumpChatbotVersion();
    return { success: true, error: null };
}

export async function clonePromptSequence(sourceId: string, newName: string) {
    // 1) Fetch the source sequence's nodes
    const { data: sourceNodes, error: nodesErr } = await supabaseAdmin
        .from('prompt_sequence_nodes')
        .select('*')
        .eq('sequence_id', sourceId)
        .order('sort_order');
    if (nodesErr) {
        console.error('[clonePromptSequence:nodes]', nodesErr.message);
        return { data: null, error: nodesErr.message };
    }

    // 2) Create the new sequence (never default)
    const { data: newSeq, error: seqErr } = await supabaseAdmin
        .from('prompt_sequences')
        .insert({ name: newName, is_default: false })
        .select()
        .single();
    if (seqErr || !newSeq) {
        console.error('[clonePromptSequence:seq]', seqErr?.message);
        return { data: null, error: seqErr?.message ?? 'Failed to create clone' };
    }

    // 3) Clone each node — first pass without parent_node_id, then remap
    const oldToNewId: Record<string, string> = {};
    for (const node of (sourceNodes ?? [])) {
        const { data: newNode, error: nErr } = await supabaseAdmin
            .from('prompt_sequence_nodes')
            .insert({
                sequence_id: newSeq.id,
                step_key: node.step_key,
                label: node.label,
                emoji: node.emoji,
                prompt_id: node.prompt_id,
                sort_order: node.sort_order,
                pathway_condition: node.pathway_condition,
                gender_condition: node.gender_condition,
                specialty_condition: node.specialty_condition,
                node_type: node.node_type,
                parent_node_id: null, // set in second pass
            })
            .select()
            .single();
        if (nErr || !newNode) {
            console.error('[clonePromptSequence:cloneNode]', nErr?.message);
            continue;
        }
        oldToNewId[node.id] = newNode.id;
    }

    // 4) Second pass — remap parent_node_id references
    for (const node of (sourceNodes ?? [])) {
        if (node.parent_node_id && oldToNewId[node.parent_node_id] && oldToNewId[node.id]) {
            await supabaseAdmin
                .from('prompt_sequence_nodes')
                .update({ parent_node_id: oldToNewId[node.parent_node_id] })
                .eq('id', oldToNewId[node.id]);
        }
    }

    return { data: newSeq, error: null };
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
    gender_condition?: string | null;
    specialty_condition?: string | null;
    node_type?: string;
}) {
    const { data, error } = await supabaseAdmin
        .from('prompt_sequence_nodes')
        .insert(node)
        .select('*, ai_prompts(id, name, prompt_type, is_active, version)')
        .single();
    if (error) { console.error('[createSequenceNode]', error.message); return { data: null, error: error.message }; }
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
    gender_condition?: string | null;
    specialty_condition?: string | null;
    node_type?: string;
}) {
    const { data, error } = await supabaseAdmin
        .from('prompt_sequence_nodes')
        .update(updates)
        .eq('id', id)
        .select('*, ai_prompts(id, name, prompt_type, is_active, version)')
        .single();
    if (error) { console.error('[updateSequenceNode]', error.message); return { data: null, error: error.message }; }
    return { data, error: null };
}

export async function deleteSequenceNode(id: string) {
    const { error } = await supabaseAdmin
        .from('prompt_sequence_nodes')
        .delete()
        .eq('id', id);
    if (error) { console.error('[deleteSequenceNode]', error.message); return { success: false, error: error.message }; }
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
    return { success: true };
}

// ──────────────────────────────────────────
// Integrity Report Analytics
// ──────────────────────────────────────────

export async function getIntegrityReportStats() {
    // Fetch the most recent integrity reports from intake_sessions
    const { data, error } = await supabaseAdmin
        .from('intake_sessions')
        .select('id, integrity_report, created_at, specialty, status')
        .not('integrity_report', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) {
        console.error('[getIntegrityReportStats]', error.message);
        return { reports: [], stats: null };
    }

    const reports = data ?? [];
    if (reports.length === 0) {
        return { reports: [], stats: null };
    }

    // Compute aggregate stats
    let totalConfidence = 0;
    let totalFluidity = 0;
    let totalCompletion = 0;
    let totalRedFlags = 0;

    for (const r of reports) {
        const ir = r.integrity_report as Record<string, unknown> | null;
        if (!ir) continue;
        totalConfidence += (ir.confidence_score as number) || 0;
        totalFluidity += (ir.fluidity_score as number) || 0;
        totalCompletion += (ir.completion_rate as number) || 0;
        totalRedFlags += ((ir.red_flags as unknown[]) || []).length;
    }

    const count = reports.length;
    return {
        reports: reports.slice(0, 20), // Return top 20 for display
        stats: {
            avgConfidence: Math.round(totalConfidence / count),
            avgFluidity: Math.round(totalFluidity / count),
            avgCompletion: Math.round(totalCompletion / count),
            totalRedFlags,
            totalReports: count,
        },
    };
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
    // Save previous value for changelog / rollback
    const previousValue = await getPlatformSetting(key);

    const { data, error } = await supabaseAdmin
        .from('platform_settings')
        .upsert(
            { key, value, category, description: description ?? null, previous_value: previousValue ?? null },
            { onConflict: 'key' }
        )
        .select()
        .single();
    if (error) { console.error('[upsertPlatformSetting]', error.message); return { data: null, error: error.message }; }
    return { data, error: null, previousValue };
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

/**
 * C3 Fix: Test OpenAI API key server-side.
 * The key never leaves the server — the browser only gets a pass/fail result.
 */
export async function testOpenAIConnection(): Promise<{ success: boolean; error?: string }> {
    try {
        const apiKey = await getPlatformSetting('openai_api_key');
        if (!apiKey) return { success: false, error: 'No API key configured' };

        const res = await fetch('https://api.openai.com/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` },
        });

        if (res.ok) return { success: true };
        if (res.status === 401) return { success: false, error: 'Invalid API key — authentication failed' };
        return { success: false, error: `OpenAI returned status ${res.status}` };
    } catch {
        return { success: false, error: 'Network error — could not reach OpenAI' };
    }
}

/**
 * H2 Fix: Invite a user as admin/superadmin using service role.
 * Handles both existing users (role upgrade) and unknown emails (creates pending entry).
 */
export async function inviteAdminUser(
    email: string,
    role: 'admin' | 'superadmin',
): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
        const trimmedEmail = email.trim().toLowerCase();

        // 1. Check if user exists in users table
        const { data: existingUser } = await supabaseAdmin
            .from('users')
            .select('id, role')
            .eq('email', trimmedEmail)
            .single();

        if (existingUser) {
            // User exists — update their role
            const { error } = await supabaseAdmin
                .from('users')
                .update({ role })
                .eq('id', existingUser.id);
            if (error) return { success: false, error: error.message };
            return { success: true, message: `${trimmedEmail} has been updated to ${role}` };
        }

        // 2. Check if auth user exists but no profile row
        const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
        const authUser = authData?.users?.find(u => u.email === trimmedEmail);

        if (authUser) {
            const { error } = await supabaseAdmin.from('users').insert({
                id: authUser.id,
                email: trimmedEmail,
                nickname: trimmedEmail.split('@')[0],
                role,
                status: 'active',
                tokens_balance: 0,
                language: 'en',
                onboarding_completed: true,
            });
            if (error) return { success: false, error: error.message };
            return { success: true, message: `${trimmedEmail} has been added as ${role}` };
        }

        // 3. No auth user — cannot create a proper entry without a valid auth.users ID
        // Instead of a placeholder UUID (which violates FK), we return an instruction
        return {
            success: false,
            error: `No account found for ${trimmedEmail}. Ask them to sign in via OAuth first, then you can assign the role.`,
        };
    } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to invite admin' };
    }
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

// ──────────────────────────────────────────
// KYC / ID Verification
// ──────────────────────────────────────────

export async function getKycStats() {
    const statuses = ['not_started', 'pending', 'approved', 'rejected', 'resubmission_requested', 'exempt'] as const;
    const results = await Promise.all(
        statuses.map((s) =>
            supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('role', 'patient').eq('kyc_status', s),
        ),
    );

    const stats: Record<string, number> = {};
    statuses.forEach((s, i) => {
        stats[s] = results[i].count || 0;
    });
    return stats;
}

export async function getKycUsers(page = 1, perPage = 50, search?: string, status?: string) {
    let query = supabaseAdmin
        .from('users')
        .select('id, nickname, email, kyc_status, kyc_applicant_id, kyc_verified_at, kyc_rejection_reason, created_at', { count: 'exact' })
        .eq('role', 'patient')
        .order('created_at', { ascending: false })
        .range((page - 1) * perPage, page * perPage - 1);

    if (status && status !== 'all') {
        query = query.eq('kyc_status', status);
    }
    if (search) {
        query = query.or(`nickname.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, count, error } = await query;
    if (error) { console.error('[getKycUsers]', error.message); return { data: [], count: 0 }; }
    return { data: data ?? [], count: count ?? 0 };
}

export async function updateUserKycStatus(userId: string, kycStatus: string) {
    const updates: Record<string, unknown> = { kyc_status: kycStatus, updated_at: new Date().toISOString() };

    // If resetting, clear related fields
    if (kycStatus === 'not_started') {
        updates.kyc_applicant_id = null;
        updates.kyc_verified_at = null;
        updates.kyc_rejection_reason = null;
    }

    const { data, error } = await supabaseAdmin
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

    if (error) { console.error('[updateUserKycStatus]', error.message); return { data: null, error: error.message }; }
    return { data, error: null };
}

export async function getKycSetting() {
    const { data, error } = await supabaseAdmin
        .from('app_settings')
        .select('value')
        .eq('key', 'kyc_enabled')
        .single();

    if (error) return true; // Default: enabled
    return data?.value === true || data?.value === 'true';
}

export async function setKycSetting(enabled: boolean) {
    const { error } = await supabaseAdmin
        .from('app_settings')
        .upsert({
            key: 'kyc_enabled',
            value: enabled,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'key' });

    if (error) { console.error('[setKycSetting]', error.message); return { success: false, error: error.message }; }
    return { success: true, error: null };
}

// ──────────────────────────────────────────
// Campaigns (unified news / promotions / announcements)
// ──────────────────────────────────────────

export async function getCampaigns(page = 1, perPage = 50, search?: string, type?: string) {
    let query = supabaseAdmin
        .from('campaigns')
        .select('*', { count: 'exact' })
        .order('sort_order')
        .order('created_at', { ascending: false })
        .range((page - 1) * perPage, page * perPage - 1);

    if (type && type !== 'all') {
        query = query.eq('type', type);
    }
    if (search) {
        query = query.or(`title_en.ilike.%${search}%,title_ar.ilike.%${search}%,body_en.ilike.%${search}%`);
    }

    const { data, count, error } = await query;
    if (error) { console.error('[getCampaigns]', error.message); return { data: [], count: 0 }; }
    return { data: data ?? [], count: count ?? 0 };
}

export async function createCampaign(campaign: {
    type: string;
    title_en: string;
    title_ar?: string;
    body_en?: string;
    body_ar?: string;
    icon?: string;
    image_url?: string;
    link_url?: string;
    is_active?: boolean;
    starts_at?: string | null;
    expires_at?: string | null;
    sort_order?: number;
}) {
    const { data, error } = await supabaseAdmin
        .from('campaigns')
        .insert(campaign)
        .select()
        .single();
    if (error) { console.error('[createCampaign]', error.message); return { data: null, error: error.message }; }
    return { data, error: null };
}

export async function updateCampaign(id: string, updates: Record<string, unknown>) {
    const { data, error } = await supabaseAdmin
        .from('campaigns')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error) { console.error('[updateCampaign]', error.message); return { data: null, error: error.message }; }
    return { data, error: null };
}

export async function deleteCampaign(id: string) {
    const { error } = await supabaseAdmin
        .from('campaigns')
        .delete()
        .eq('id', id);
    if (error) { console.error('[deleteCampaign]', error.message); return { success: false, error: error.message }; }
    return { success: true, error: null };
}

// Backward-compat stubs used by existing admin pages
export async function getNewsArticles(page = 1, perPage = 50, search?: string) {
    return getCampaigns(page, perPage, search, 'news');
}

export async function getAdvertisements(page = 1, perPage = 50, search?: string) {
    return getCampaigns(page, perPage, search, 'promotion');
}

// ──────────────────────────────────────────
// Health Tips
// ──────────────────────────────────────────

export async function getHealthTips() {
    const { data, error } = await supabaseAdmin
        .from('health_tips')
        .select('*')
        .order('sort_order')
        .order('created_at');
    if (error) { console.error('[getHealthTips]', error.message); return []; }
    return data ?? [];
}

export async function createHealthTip(tip: {
    icon?: string;
    title_en: string;
    title_ar?: string;
    text_en: string;
    text_ar?: string;
    is_active?: boolean;
    sort_order?: number;
}) {
    const { data, error } = await supabaseAdmin
        .from('health_tips')
        .insert(tip)
        .select()
        .single();
    if (error) { console.error('[createHealthTip]', error.message); return { data: null, error: error.message }; }
    return { data, error: null };
}

export async function updateHealthTip(id: string, updates: Record<string, unknown>) {
    const { data, error } = await supabaseAdmin
        .from('health_tips')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error) { console.error('[updateHealthTip]', error.message); return { data: null, error: error.message }; }
    return { data, error: null };
}

export async function deleteHealthTip(id: string) {
    const { error } = await supabaseAdmin
        .from('health_tips')
        .delete()
        .eq('id', id);
    if (error) { console.error('[deleteHealthTip]', error.message); return { success: false, error: error.message }; }
    return { success: true, error: null };
}

// ──────────────────────────────────────────
// Response Time Auto-Measurement
// ──────────────────────────────────────────

/**
 * Compute the median response time from completed consultations
 * over the last 30 days (submitted → report_ready/completed).
 * Outliers > 48 hours are capped at 48h.
 */
export async function computeAvgResponseTime() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabaseAdmin
        .from('consultations')
        .select('created_at, concluded_at')
        .in('status', ['completed', 'report_ready'])
        .not('concluded_at', 'is', null)
        .gte('created_at', thirtyDaysAgo);

    if (error) {
        console.error('[computeAvgResponseTime]', error.message);
        return { medianMinutes: 180, sampleSize: 0 };
    }

    if (!data || data.length === 0) {
        return { medianMinutes: 180, sampleSize: 0 };
    }

    const CAP_MINUTES = 48 * 60; // 48 hours cap
    const durations = data
        .map((c: { created_at: string; concluded_at: string }) => {
            const mins = (new Date(c.concluded_at).getTime() - new Date(c.created_at).getTime()) / 60000;
            return Math.min(Math.max(mins, 0), CAP_MINUTES);
        })
        .sort((a: number, b: number) => a - b);

    const mid = Math.floor(durations.length / 2);
    const median = durations.length % 2 === 0
        ? (durations[mid - 1] + durations[mid]) / 2
        : durations[mid];

    // Also save the computed value to platform_settings
    await supabaseAdmin
        .from('platform_settings')
        .upsert(
            { key: 'avg_response_minutes', value: String(Math.round(median)), category: 'announcements', description: 'Auto-computed median response time (minutes)' },
            { onConflict: 'key' }
        );

    return { medianMinutes: Math.round(median), sampleSize: data.length };
}

// ──────────────────────────────────────────
// ICD Codes
// ──────────────────────────────────────────

export async function getIcdCodes(page = 1, perPage = 50, search?: string, specialty?: string) {
    let query = supabaseAdmin
        .from('icd_codes')
        .select('*', { count: 'exact' })
        .order('code', { ascending: true })
        .range((page - 1) * perPage, page * perPage - 1);

    if (search) {
        query = query.or(`code.ilike.%${search}%,description.ilike.%${search}%,description_ar.ilike.%${search}%`);
    }
    if (specialty && specialty !== 'all') {
        query = query.contains('specialty_tags', [specialty]);
    }

    const { data, count, error } = await query;
    if (error) { console.error('[getIcdCodes]', error.message); return { data: [], count: 0 }; }
    return { data: data ?? [], count: count ?? 0 };
}

export async function getIcdCodeStats() {
    const [totalRes, activeRes] = await Promise.all([
        supabaseAdmin.from('icd_codes').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('icd_codes').select('*', { count: 'exact', head: true }).eq('is_active', true),
    ]);

    // Get counts per specialty
    const { data: allCodes } = await supabaseAdmin.from('icd_codes').select('specialty_tags').eq('is_active', true);
    const specCounts: Record<string, number> = {};
    (allCodes ?? []).forEach((row: { specialty_tags: string[] }) => {
        (row.specialty_tags ?? []).forEach(tag => {
            specCounts[tag] = (specCounts[tag] || 0) + 1;
        });
    });

    return {
        total: totalRes.count ?? 0,
        active: activeRes.count ?? 0,
        inactive: (totalRes.count ?? 0) - (activeRes.count ?? 0),
        bySpecialty: specCounts,
    };
}

export async function createIcdCode(data: {
    code: string;
    description: string;
    description_ar?: string;
    category?: string;
    specialty_tags?: string[];
    is_active?: boolean;
}) {
    const { data: result, error } = await supabaseAdmin
        .from('icd_codes')
        .insert({
            code: data.code,
            description: data.description,
            description_ar: data.description_ar || '',
            category: data.category || '',
            specialty_tags: data.specialty_tags || [],
            is_active: data.is_active ?? true,
        })
        .select()
        .single();
    if (error) { console.error('[createIcdCode]', error.message); return { data: null, error: error.message }; }
    return { data: result, error: null };
}

export async function updateIcdCode(id: string, updates: Record<string, unknown>) {
    const { data, error } = await supabaseAdmin
        .from('icd_codes')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error) { console.error('[updateIcdCode]', error.message); return { data: null, error: error.message }; }
    return { data, error: null };
}

export async function toggleIcdCodeActive(id: string, isActive: boolean) {
    const { data, error } = await supabaseAdmin
        .from('icd_codes')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error) { console.error('[toggleIcdCodeActive]', error.message); return { data: null, error: error.message }; }
    return { data, error: null };
}

// ──────────────────────────────────────────
// Admin Notifications
// ──────────────────────────────────────────

export async function getAdminNotifications(limit = 30) {
    const { data, error } = await supabaseAdmin
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
    if (error) { console.error('[getAdminNotifications]', error.message); return []; }
    return data ?? [];
}

export async function getUnreadAdminNotificationCount() {
    const { count, error } = await supabaseAdmin
        .from('admin_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('read', false);
    if (error) { console.error('[getUnreadAdminNotificationCount]', error.message); return 0; }
    return count ?? 0;
}

export async function markAdminNotificationRead(id: string) {
    const { error } = await supabaseAdmin
        .from('admin_notifications')
        .update({ read: true })
        .eq('id', id);
    if (error) { console.error('[markAdminNotificationRead]', error.message); return { error: error.message }; }
    return { error: null };
}

export async function markAllAdminNotificationsRead() {
    const { error } = await supabaseAdmin
        .from('admin_notifications')
        .update({ read: true })
        .eq('read', false);
    if (error) { console.error('[markAllAdminNotificationsRead]', error.message); return { error: error.message }; }
    return { error: null };
}

export async function getNotificationToggles() {
    const keys = ['admin_notify_consultation_submitted', 'admin_notify_user_registered', 'admin_notify_user_login'];
    const { data, error } = await supabaseAdmin
        .from('app_settings')
        .select('key, value')
        .in('key', keys);
    if (error) { console.error('[getNotificationToggles]', error.message); return {}; }

    const result: Record<string, boolean> = {};
    (data ?? []).forEach((row: { key: string; value: unknown }) => {
        const raw = typeof row.value === 'string' ? row.value : JSON.stringify(row.value);
        result[row.key] = raw === '"true"' || raw === 'true';
    });
    return result;
}

export async function setNotificationToggle(key: string, enabled: boolean) {
    const { error } = await supabaseAdmin
        .from('app_settings')
        .upsert(
            { key, value: JSON.stringify(enabled) },
            { onConflict: 'key' }
        );
    if (error) { console.error('[setNotificationToggle]', error.message); return { error: error.message }; }
    return { error: null };
}

// ──────────────────────────────────────────
// Broadcast Notifications (Admin → Users)
// ──────────────────────────────────────────

export async function broadcastToAllPatients(title: string, message: string) {
    // Get all patient IDs
    const { data: patients, error: fetchErr } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('role', 'patient')
        .eq('status', 'active');
    if (fetchErr) { console.error('[broadcastToAllPatients]', fetchErr.message); return { sent: 0, error: fetchErr.message }; }

    const rows = (patients ?? []).map((p: { id: string }) => ({
        patient_id: p.id,
        type: 'system',
        title,
        message,
    }));

    if (rows.length === 0) return { sent: 0, error: null };

    const { error } = await supabaseAdmin
        .from('patient_notifications')
        .insert(rows);
    if (error) { console.error('[broadcastToAllPatients:insert]', error.message); return { sent: 0, error: error.message }; }
    return { sent: rows.length, error: null };
}

export async function broadcastToAllDoctors(title: string, message: string) {
    const { data: doctors, error: fetchErr } = await supabaseAdmin
        .from('doctors')
        .select('id')
        .eq('status', 'active');
    if (fetchErr) { console.error('[broadcastToAllDoctors]', fetchErr.message); return { sent: 0, error: fetchErr.message }; }

    const rows = (doctors ?? []).map((d: { id: string }) => ({
        doctor_id: d.id,
        type: 'system',
        title,
        message,
    }));

    if (rows.length === 0) return { sent: 0, error: null };

    const { error } = await supabaseAdmin
        .from('doctor_notifications')
        .insert(rows);
    if (error) { console.error('[broadcastToAllDoctors:insert]', error.message); return { sent: 0, error: error.message }; }
    return { sent: rows.length, error: null };
}

export async function sendNotificationToUsers(
    userIds: string[],
    title: string,
    message: string,
    targetRole: 'patient' | 'doctor'
) {
    if (userIds.length === 0) return { sent: 0, error: null };

    if (targetRole === 'patient') {
        const rows = userIds.map(id => ({
            patient_id: id,
            type: 'system',
            title,
            message,
        }));
        const { error } = await supabaseAdmin.from('patient_notifications').insert(rows);
        if (error) { console.error('[sendNotificationToUsers:patient]', error.message); return { sent: 0, error: error.message }; }
        return { sent: rows.length, error: null };
    } else {
        // For doctors we need doctor table IDs (not user IDs)
        const { data: docs } = await supabaseAdmin
            .from('doctors')
            .select('id')
            .in('user_id', userIds);
        const doctorIds = (docs ?? []).map((d: { id: string }) => d.id);
        if (doctorIds.length === 0) return { sent: 0, error: 'No matching doctors found' };

        const rows = doctorIds.map((id: string) => ({
            doctor_id: id,
            type: 'system',
            title,
            message,
        }));
        const { error } = await supabaseAdmin.from('doctor_notifications').insert(rows);
        if (error) { console.error('[sendNotificationToUsers:doctor]', error.message); return { sent: 0, error: error.message }; }
        return { sent: rows.length, error: null };
    }
}

export async function searchUsersForNotification(search: string, role?: 'patient' | 'doctor') {
    let query = supabaseAdmin
        .from('users')
        .select('id, nickname, email, role, avatar_url')
        .eq('status', 'active')
        .or(`nickname.ilike.%${search}%,email.ilike.%${search}%`)
        .limit(20);

    if (role) {
        query = query.eq('role', role);
    } else {
        query = query.in('role', ['patient', 'doctor']);
    }

    const { data, error } = await query;
    if (error) { console.error('[searchUsersForNotification]', error.message); return []; }
    return data ?? [];
}

// ──────────────────────────────────────────
// Doctor Applications (Admin Review Pipeline)
// ──────────────────────────────────────────

/** Fire-and-forget email notification via the application-notification edge function */
async function sendApplicationNotification(payload: {
    type: 'application_received' | 'interview_scheduled' | 'approved' | 'rejected' | 'resubmission_requested';
    doctor_name: string;
    doctor_email: string;
    interview_date?: string;
    interview_type?: string;
    interview_url?: string;
    interview_phone?: string;
    rejection_reason?: string;
    resubmission_feedback?: string;
}) {
    try {
        const { error } = await supabaseAdmin.functions.invoke('application-notification', {
            body: payload,
        });
        if (error) console.error('[sendApplicationNotification]', error.message);
    } catch (err) {
        // Non-blocking — don't fail the status transition if email fails
        console.error('[sendApplicationNotification] edge function error:', err);
    }
}

export async function getApplications(
    status?: string, page = 1, perPage = 20, search?: string
) {
    let query = supabaseAdmin
        .from('doctor_applications')
        .select('*', { count: 'exact' })
        .order('submitted_at', { ascending: false, nullsFirst: false })
        .range((page - 1) * perPage, page * perPage - 1);

    if (status && status !== 'all') {
        query = query.eq('status', status);
    }
    if (search) {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,license_number.ilike.%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) { console.error('[getApplications]', error.message); return { data: [], total: 0, error: error.message }; }
    return { data: data ?? [], total: count ?? 0, error: null };
}

export async function getApplicationById(id: string) {
    const { data, error } = await supabaseAdmin
        .from('doctor_applications')
        .select(`
            *,
            documents:doctor_application_documents(*),
            audit:doctor_application_audit(*)
        `)
        .eq('id', id)
        .single();

    if (error) { console.error('[getApplicationById]', error.message); return null; }
    return data;
}

export async function getApplicationStats() {
    const statuses = ['submitted', 'documents_review', 'interview_scheduled', 'interview_completed', 'approved', 'rejected', 'resubmission_requested'];
    const result: Record<string, number> = {};

    for (const status of statuses) {
        const { count } = await supabaseAdmin
            .from('doctor_applications')
            .select('id', { count: 'exact', head: true })
            .eq('status', status);
        result[status] = count ?? 0;
    }
    return result;
}

export async function moveApplicationToDocumentsReview(applicationId: string, adminId: string) {
    const { data: app } = await supabaseAdmin
        .from('doctor_applications')
        .select('status')
        .eq('id', applicationId)
        .single();

    const oldStatus = app?.status || 'submitted';

    const { error } = await supabaseAdmin
        .from('doctor_applications')
        .update({ status: 'documents_review', reviewed_by: adminId })
        .eq('id', applicationId);

    if (error) { console.error('[moveToDocumentsReview]', error.message); return { error: error.message }; }

    await supabaseAdmin.from('doctor_application_audit').insert({
        application_id: applicationId,
        action: 'documents_review',
        performed_by: adminId,
        old_status: oldStatus,
        new_status: 'documents_review',
    });

    return { error: null };
}

export async function scheduleInterview(
    applicationId: string,
    adminId: string,
    scheduledAt: string,
    interviewType: 'video_call' | 'phone_call',
    meetingUrl?: string,
    phoneNumber?: string,
    notes?: string,
) {
    const { data: app } = await supabaseAdmin
        .from('doctor_applications')
        .select('status')
        .eq('id', applicationId)
        .single();

    const oldStatus = app?.status || 'documents_review';

    const { error } = await supabaseAdmin
        .from('doctor_applications')
        .update({
            status: 'interview_scheduled',
            interview_scheduled_at: scheduledAt,
            interview_type: interviewType,
            interview_meeting_url: meetingUrl || null,
            interview_phone_number: phoneNumber || null,
            interview_notes: notes || null,
            reviewed_by: adminId,
        })
        .eq('id', applicationId);

    if (error) { console.error('[scheduleInterview]', error.message); return { error: error.message }; }

    await supabaseAdmin.from('doctor_application_audit').insert({
        application_id: applicationId,
        action: 'interview_scheduled',
        performed_by: adminId,
        old_status: oldStatus,
        new_status: 'interview_scheduled',
        metadata: { scheduled_at: scheduledAt, type: interviewType },
    });

    // Notify doctor
    const { data: appData } = await supabaseAdmin.from('doctor_applications').select('full_name, email').eq('id', applicationId).single();
    if (appData) {
        sendApplicationNotification({
            type: 'interview_scheduled',
            doctor_name: appData.full_name,
            doctor_email: appData.email,
            interview_date: scheduledAt,
            interview_type: interviewType,
            interview_url: meetingUrl,
            interview_phone: phoneNumber,
        });
    }

    return { error: null };
}

export async function completeInterview(applicationId: string, adminId: string, notes?: string) {
    const { error } = await supabaseAdmin
        .from('doctor_applications')
        .update({
            status: 'interview_completed',
            interview_completed_at: new Date().toISOString(),
            interview_notes: notes || null,
            reviewed_by: adminId,
        })
        .eq('id', applicationId);

    if (error) { console.error('[completeInterview]', error.message); return { error: error.message }; }

    await supabaseAdmin.from('doctor_application_audit').insert({
        application_id: applicationId,
        action: 'interview_completed',
        performed_by: adminId,
        old_status: 'interview_scheduled',
        new_status: 'interview_completed',
    });

    return { error: null };
}

export async function approveApplication(applicationId: string, adminId: string, reviewNotes?: string) {
    // 1. Get the application
    const { data: app, error: fetchErr } = await supabaseAdmin
        .from('doctor_applications')
        .select('*')
        .eq('id', applicationId)
        .single();

    if (fetchErr || !app) {
        return { error: fetchErr?.message || 'Application not found' };
    }

    const oldStatus = app.status;

    // 2. Create the doctors row
    const isLocum = app.doctor_type === 'locum';
    const { error: doctorErr } = await supabaseAdmin.from('doctors').insert({
        user_id: app.user_id,
        full_name: app.full_name,
        display_name: app.display_name,
        license_number: app.license_number,
        license_authority: app.license_authority,
        specialty: app.specialty,
        sub_specialty: app.sub_specialty,
        years_experience: app.years_experience,
        languages: app.languages,
        hospital: app.hospital,
        city: app.city,
        bio: app.bio,
        status: 'active',
        verified_at: new Date().toISOString(),
        verified_by: adminId,
        doctor_type: app.doctor_type || 'permanent',
        disclaimer_accepted_at: app.disclaimer_accepted_at,
        // Locum-specific fields
        ...(isLocum ? {
            onboarding_status: 'approved',
            credential_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
        } : {}),
    });

    if (doctorErr) {
        console.error('[approveApplication:doctors]', doctorErr.message);
        return { error: 'Failed to create doctor profile: ' + doctorErr.message };
    }

    // 3. Update users row
    await supabaseAdmin.from('users').update({
        role: 'doctor',
        status: 'active',
    }).eq('id', app.user_id);

    // 4. Mark application as approved
    const { error: updateErr } = await supabaseAdmin
        .from('doctor_applications')
        .update({
            status: 'approved',
            reviewed_by: adminId,
            review_notes: reviewNotes || null,
        })
        .eq('id', applicationId);

    if (updateErr) { console.error('[approveApplication:update]', updateErr.message); }

    // 5. Verify all documents
    await supabaseAdmin
        .from('doctor_application_documents')
        .update({ verified: true, verified_by: adminId, verified_at: new Date().toISOString() })
        .eq('application_id', applicationId);

    // 6. Audit trail
    await supabaseAdmin.from('doctor_application_audit').insert({
        application_id: applicationId,
        action: 'approved',
        performed_by: adminId,
        old_status: oldStatus,
        new_status: 'approved',
        metadata: { review_notes: reviewNotes },
    });

    // Notify doctor
    sendApplicationNotification({
        type: 'approved',
        doctor_name: app.full_name,
        doctor_email: app.email,
    });

    return { error: null };
}

export async function rejectApplication(applicationId: string, adminId: string, reason: string) {
    const { data: app } = await supabaseAdmin
        .from('doctor_applications')
        .select('status')
        .eq('id', applicationId)
        .single();

    const oldStatus = app?.status || 'submitted';

    const { error } = await supabaseAdmin
        .from('doctor_applications')
        .update({
            status: 'rejected',
            reviewed_by: adminId,
            rejection_reason: reason,
        })
        .eq('id', applicationId);

    if (error) { console.error('[rejectApplication]', error.message); return { error: error.message }; }

    await supabaseAdmin.from('doctor_application_audit').insert({
        application_id: applicationId,
        action: 'rejected',
        performed_by: adminId,
        old_status: oldStatus,
        new_status: 'rejected',
        metadata: { reason },
    });

    // Notify doctor
    const { data: rejApp } = await supabaseAdmin.from('doctor_applications').select('full_name, email').eq('id', applicationId).single();
    if (rejApp) {
        sendApplicationNotification({
            type: 'rejected',
            doctor_name: rejApp.full_name,
            doctor_email: rejApp.email,
            rejection_reason: reason,
        });
    }

    return { error: null };
}

export async function requestApplicationResubmission(applicationId: string, adminId: string, feedback: string) {
    const { data: app } = await supabaseAdmin
        .from('doctor_applications')
        .select('status')
        .eq('id', applicationId)
        .single();

    const oldStatus = app?.status || 'submitted';

    const { error } = await supabaseAdmin
        .from('doctor_applications')
        .update({
            status: 'resubmission_requested',
            reviewed_by: adminId,
            resubmission_feedback: feedback,
        })
        .eq('id', applicationId);

    if (error) { console.error('[requestResubmission]', error.message); return { error: error.message }; }

    await supabaseAdmin.from('doctor_application_audit').insert({
        application_id: applicationId,
        action: 'resubmission_requested',
        performed_by: adminId,
        old_status: oldStatus,
        new_status: 'resubmission_requested',
        metadata: { feedback },
    });

    // Notify doctor
    const { data: resubApp } = await supabaseAdmin.from('doctor_applications').select('full_name, email').eq('id', applicationId).single();
    if (resubApp) {
        sendApplicationNotification({
            type: 'resubmission_requested',
            doctor_name: resubApp.full_name,
            doctor_email: resubApp.email,
            resubmission_feedback: feedback,
        });
    }

    return { error: null };
}

export async function getApplicationDocumentsAdmin(applicationId: string) {
    const { data, error } = await supabaseAdmin
        .from('doctor_application_documents')
        .select('*')
        .eq('application_id', applicationId)
        .order('uploaded_at', { ascending: true });

    if (error) { console.error('[getApplicationDocuments]', error.message); return []; }
    return data ?? [];
}

export async function getApplicationDocumentSignedUrl(storagePath: string) {
    const { data, error } = await supabaseAdmin.storage
        .from('doctor-applications')
        .createSignedUrl(storagePath, 3600);

    if (error) { console.error('[getDocumentSignedUrl]', error.message); return null; }
    return data.signedUrl;
}

// ──────────────────────────────────────────
// Specialty Overrides (Temporary Disable)
// ──────────────────────────────────────────

/**
 * Get all active specialty overrides (disabled specialties).
 */
export async function getActiveSpecialtyOverrides() {
    const { data, error } = await supabaseAdmin
        .from('specialty_overrides')
        .select('*, admin:users!specialty_overrides_disabled_by_fkey(nickname, email)')
        .eq('is_disabled', true)
        .order('disabled_at', { ascending: false });

    if (error) { console.error('[getActiveSpecialtyOverrides]', error.message); return []; }
    return (data ?? []).map((o: Record<string, unknown>) => ({
        ...o,
        admin_name: (o.admin as { nickname?: string } | null)?.nickname ?? 'Unknown',
        admin: undefined,
    }));
}

/**
 * Get all specialty overrides (active + history).
 */
export async function getSpecialtyOverrideHistory(specialty?: string) {
    let query = supabaseAdmin
        .from('specialty_overrides')
        .select('*, admin:users!specialty_overrides_disabled_by_fkey(nickname)')
        .order('created_at', { ascending: false })
        .limit(100);

    if (specialty) {
        query = query.eq('specialty', specialty);
    }

    const { data, error } = await query;
    if (error) { console.error('[getSpecialtyOverrideHistory]', error.message); return []; }
    return (data ?? []).map((o: Record<string, unknown>) => ({
        ...o,
        admin_name: (o.admin as { nickname?: string } | null)?.nickname ?? 'Unknown',
        admin: undefined,
    }));
}

/**
 * Disable a specialty.
 */
export async function disableSpecialty(params: {
    specialty: string;
    mode: 'silent' | 'announced';
    reasonCode: string;
    reasonText: string;
    patientMessage?: string;
    adminUserId: string;
    fmConfidenceThreshold?: number;
}) {
    // Safety: family_medicine can never be disabled
    if (params.specialty === 'family_medicine') {
        return { data: null, error: 'Family Medicine is the universal fallback and cannot be disabled.' };
    }

    const { data, error } = await supabaseAdmin
        .from('specialty_overrides')
        .insert({
            specialty: params.specialty,
            is_disabled: true,
            mode: params.mode,
            reason_code: params.reasonCode,
            reason_text: params.reasonText,
            patient_message: params.patientMessage || null,
            disabled_by: params.adminUserId,
            disabled_at: new Date().toISOString(),
            fm_confidence_threshold: params.fmConfidenceThreshold ?? 50,
        })
        .select()
        .single();

    if (error) {
        // Unique constraint violation = specialty already disabled
        if (error.code === '23505') {
            return { data: null, error: 'This specialty is already disabled.' };
        }
        console.error('[disableSpecialty]', error.message);
        return { data: null, error: error.message };
    }

    // Best-effort audit
    try {
        await supabaseAdmin.from('consultation_audit_log').insert({
            consultation_id: null,
            action: 'specialty_disabled',
            performed_by: params.adminUserId,
            metadata: {
                specialty: params.specialty,
                mode: params.mode,
                reason_code: params.reasonCode,
                reason_text: params.reasonText,
            },
        });
    } catch { /* non-blocking */ }

    return { data, error: null };
}

/**
 * Restore (re-enable) a specialty.
 */
export async function restoreSpecialty(overrideId: string, adminUserId: string) {
    const { data, error } = await supabaseAdmin
        .from('specialty_overrides')
        .update({
            is_disabled: false,
            restored_by: adminUserId,
            restored_at: new Date().toISOString(),
        })
        .eq('id', overrideId)
        .eq('is_disabled', true)
        .select()
        .single();

    if (error) { console.error('[restoreSpecialty]', error.message); return { data: null, error: error.message }; }

    // Best-effort audit
    try {
        await supabaseAdmin.from('consultation_audit_log').insert({
            consultation_id: null,
            action: 'specialty_restored',
            performed_by: adminUserId,
            metadata: {
                specialty: data.specialty,
                override_id: overrideId,
            },
        });
    } catch { /* non-blocking */ }

    return { data, error: null };
}

/**
 * Get specialty incidents with optional filters.
 */
export async function getSpecialtyIncidents(params?: {
    status?: string;
    specialty?: string;
    limit?: number;
}) {
    let query = supabaseAdmin
        .from('specialty_incidents')
        .select(`
            *,
            patient:users!specialty_incidents_patient_id_fkey(nickname, email),
            override:specialty_overrides!specialty_incidents_override_id_fkey(mode, reason_code, reason_text)
        `)
        .order('created_at', { ascending: false })
        .limit(params?.limit ?? 50);

    if (params?.status && params.status !== 'all') {
        query = query.eq('status', params.status);
    }
    if (params?.specialty) {
        query = query.eq('specialty', params.specialty);
    }

    const { data, error } = await query;
    if (error) { console.error('[getSpecialtyIncidents]', error.message); return []; }
    return (data ?? []).map((inc: Record<string, unknown>) => ({
        ...inc,
        patient_name: (inc.patient as { nickname?: string } | null)?.nickname ?? 'Unknown',
        patient_email: (inc.patient as { email?: string } | null)?.email ?? '',
        override_mode: (inc.override as { mode?: string } | null)?.mode ?? 'unknown',
        override_reason: (inc.override as { reason_code?: string } | null)?.reason_code ?? 'unknown',
        patient: undefined,
        override: undefined,
    }));
}

/**
 * Update an incident (acknowledge, add notes, resolve).
 */
export async function updateSpecialtyIncident(incidentId: string, updates: {
    status?: string;
    admin_notes?: string;
    resolved_by?: string;
}) {
    const updatePayload: Record<string, unknown> = {};
    if (updates.status) updatePayload.status = updates.status;
    if (updates.admin_notes !== undefined) updatePayload.admin_notes = updates.admin_notes;
    if (updates.status === 'resolved' && updates.resolved_by) {
        updatePayload.resolved_by = updates.resolved_by;
        updatePayload.resolved_at = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin
        .from('specialty_incidents')
        .update(updatePayload)
        .eq('id', incidentId)
        .select()
        .single();

    if (error) { console.error('[updateSpecialtyIncident]', error.message); return { data: null, error: error.message }; }
    return { data, error: null };
}

/**
 * Get open incident count (for dashboard alert badge).
 */
export async function getOpenSpecialtyIncidentCount() {
    const { count, error } = await supabaseAdmin
        .from('specialty_incidents')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open');

    if (error) { console.error('[getOpenSpecialtyIncidentCount]', error.message); return 0; }
    return count ?? 0;
}

/**
 * Get count of currently disabled specialties (for dashboard alert).
 */
export async function getDisabledSpecialtyCount() {
    const { count, error } = await supabaseAdmin
        .from('specialty_overrides')
        .select('*', { count: 'exact', head: true })
        .eq('is_disabled', true);

    if (error) { console.error('[getDisabledSpecialtyCount]', error.message); return 0; }
    return count ?? 0;
}

// ──────────────────────────────────────────
// Audit Log
// ──────────────────────────────────────────

export async function getAuditLog(page = 1, perPage = 20, search?: string) {
    let query = supabaseAdmin
        .from('audit_log')
        .select('*, actor:users!audit_log_actor_id_fkey(nickname, email)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * perPage, page * perPage - 1);

    if (search) {
        query = query.or(`action.ilike.%${search}%,entity_type.ilike.%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) { console.error('[getAuditLog]', error.message); return { data: [], total: 0, error: error.message }; }

    const rows = (data ?? []).map((row: Record<string, unknown>) => ({
        ...row,
        actor_name: (row.actor as { nickname?: string } | null)?.nickname ?? 'System',
        actor_email: (row.actor as { email?: string } | null)?.email ?? '',
        actor: undefined,
    }));

    return { data: rows, total: count ?? 0, error: null };
}
