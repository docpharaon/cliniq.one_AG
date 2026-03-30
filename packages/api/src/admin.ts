import { supabase } from './client';
import type { User, Doctor, Consultation, TokenTransaction, ProtocolLog, RefundRequest, AdminRefundReason, RefundRequestStatus } from '@cliniqone/types';

// ──────────────────────────────────────────
// Admin API Functions
// Used by admin panel to manage the platform
// ──────────────────────────────────────────

// ── Users ────────────────────────────────────────

/**
 * Get all users with optional filters.
 */
export async function getAllUsers(params?: {
    role?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
}) {
    let query = supabase
        .from('users')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

    if (params?.role) query = query.eq('role', params.role);
    if (params?.status) query = query.eq('status', params.status);
    if (params?.search) {
        query = query.or(`nickname.ilike.%${params.search}%,email.ilike.%${params.search}%`);
    }
    if (params?.limit) query = query.limit(params.limit);
    if (params?.offset) query = query.range(params.offset, params.offset + (params.limit || 20) - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return { users: data as User[], total: count || 0 };
}

/**
 * Update any user's status or role (admin action).
 */
export async function adminUpdateUser(userId: string, updates: Partial<User>) {
    const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

    if (error) throw error;
    return data as User;
}

// ── Doctors ──────────────────────────────────────

/**
 * Get all doctors with user info.
 */
export async function getAllDoctors(params?: {
    status?: string;
    specialty?: string;
    search?: string;
}) {
    let query = supabase
        .from('doctors')
        .select(`
            *,
            user:users!doctors_user_id_fkey(email, phone, status)
        `)
        .order('created_at', { ascending: false });

    if (params?.status) query = query.eq('status', params.status);
    if (params?.specialty) query = query.eq('specialty', params.specialty);
    if (params?.search) {
        query = query.or(`full_name.ilike.%${params.search}%,display_name.ilike.%${params.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

/**
 * Create a new doctor profile (HR management).
 */
export async function createDoctor(doctor: Omit<Doctor, 'id' | 'created_at' | 'updated_at' | 'rating_avg' | 'rating_count' | 'tokens_earned'>) {
    const { data, error } = await supabase
        .from('doctors')
        .insert(doctor)
        .select()
        .single();

    if (error) throw error;
    return data as Doctor;
}

/**
 * Verify/approve a doctor.
 */
export async function verifyDoctor(doctorId: string, adminUserId: string) {
    const { data, error } = await supabase
        .from('doctors')
        .update({
            status: 'active',
            verified_at: new Date().toISOString(),
            verified_by: adminUserId,
        })
        .eq('id', doctorId)
        .select()
        .single();

    if (error) throw error;
    return data as Doctor;
}

/**
 * Update doctor status (suspend, activate, etc).
 */
export async function updateDoctorStatus(doctorId: string, status: string) {
    const { data, error } = await supabase
        .from('doctors')
        .update({ status })
        .eq('id', doctorId)
        .select()
        .single();

    if (error) throw error;
    return data as Doctor;
}

// ── Consultations ────────────────────────────────

/**
 * Get all consultations with patient and doctor info.
 */
export async function getAllConsultations(params?: {
    status?: string;
    specialty?: string;
    priority?: string;
    limit?: number;
    offset?: number;
}) {
    let query = supabase
        .from('consultations')
        .select(`
            *,
            patient:users!consultations_patient_id_fkey(id, nickname, email, avatar_url),
            doctor:doctors!consultations_doctor_id_fkey(id, full_name, display_name, specialty, avatar_url)
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

    if (params?.status) query = query.eq('status', params.status);
    if (params?.specialty) query = query.eq('specialty', params.specialty);
    if (params?.priority) query = query.eq('priority', params.priority);
    if (params?.limit) query = query.limit(params.limit);
    if (params?.offset) query = query.range(params.offset, params.offset + (params.limit || 20) - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return { consultations: data as any[], total: count || 0 };
}

/**
 * Force-assign a consultation to a doctor (admin override).
 */
export async function forceAssignConsultation(consultationId: string, doctorId: string) {
    const { data, error } = await supabase
        .from('consultations')
        .update({
            doctor_id: doctorId,
            status: 'assigned',
            assigned_at: new Date().toISOString(),
        })
        .eq('id', consultationId)
        .select()
        .single();

    if (error) throw error;
    return data as Consultation;
}

// ── Token Management ─────────────────────────────

/**
 * Grant tokens to a user (admin action).
 * Uses the grant_tokens RPC for atomic balance update (prevents race conditions).
 */
export async function grantTokens(userId: string, amount: number, description: string) {
    const { error: rpcError } = await supabase.rpc('grant_tokens', {
        p_user_id: userId,
        p_amount: amount,
        p_description: description || `Admin granted ${amount} tokens`,
        p_type: 'admin_grant',
    });

    if (rpcError) throw rpcError;

    // Fetch the latest transaction that was just created by the RPC
    const { data, error } = await supabase
        .from('token_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error) throw error;
    return data as TokenTransaction;
}

/**
 * Get all token transactions (admin view).
 */
export async function getAllTokenTransactions(params?: {
    userId?: string;
    type?: string;
    limit?: number;
}) {
    let query = supabase
        .from('token_transactions')
        .select(`
            *,
            user:users!token_transactions_user_id_fkey(id, nickname, email)
        `)
        .order('created_at', { ascending: false })
        .limit(params?.limit || 50);

    if (params?.userId) query = query.eq('user_id', params.userId);
    if (params?.type) query = query.eq('type', params.type);

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

// ── Protocol Logs ────────────────────────────────

/**
 * Get all protocol violation logs.
 */
export async function getProtocolLogs(params?: {
    resolved?: boolean;
    severity?: string;
    limit?: number;
}) {
    let query = supabase
        .from('protocol_logs')
        .select(`
            *,
            patient:users!protocol_logs_patient_id_fkey(id, nickname, email),
            consultation:consultations!protocol_logs_consultation_id_fkey(id, specialty, status)
        `)
        .order('created_at', { ascending: false })
        .limit(params?.limit || 50);

    if (params?.resolved !== undefined) query = query.eq('resolved', params.resolved);
    if (params?.severity) query = query.eq('severity', params.severity);

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

/**
 * Resolve a protocol log entry.
 */
export async function resolveProtocolLog(logId: string, actionTaken: string) {
    const { data, error } = await supabase
        .from('protocol_logs')
        .update({ resolved: true, action_taken: actionTaken })
        .eq('id', logId)
        .select()
        .single();

    if (error) throw error;
    return data as ProtocolLog;
}

// ── Analytics / Dashboard ────────────────────────

/**
 * Get platform-wide statistics.
 */
export async function getPlatformStats() {
    const [
        { count: totalUsers },
        { count: totalDoctors },
        { count: activeDoctors },
        { count: totalConsultations },
        { count: activeConsultations },
        { count: unresolvedProtocols },
    ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'patient'),
        supabase.from('doctors').select('*', { count: 'exact', head: true }),
        supabase.from('doctors').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('consultations').select('*', { count: 'exact', head: true }),
        supabase.from('consultations').select('*', { count: 'exact', head: true }).not('status', 'in', '("completed","cancelled")'),
        supabase.from('protocol_logs').select('*', { count: 'exact', head: true }).eq('resolved', false),
    ]);

    return {
        totalUsers: totalUsers || 0,
        totalDoctors: totalDoctors || 0,
        activeDoctors: activeDoctors || 0,
        totalConsultations: totalConsultations || 0,
        activeConsultations: activeConsultations || 0,
        unresolvedProtocols: unresolvedProtocols || 0,
    };
}

// ── KYC Management ───────────────────────────────

/**
 * Get KYC status counts for all patients.
 */
export async function getKycStats() {
    const statuses = ['not_started', 'pending', 'approved', 'rejected', 'resubmission_requested', 'exempt'] as const;
    const results = await Promise.all(
        statuses.map((s) =>
            supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'patient').eq('kyc_status', s),
        ),
    );

    const stats: Record<string, number> = {};
    statuses.forEach((s, i) => {
        stats[s] = results[i].count || 0;
    });
    return stats;
}

/**
 * Get an app setting value.
 */
export async function getAppSetting(key: string) {
    const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', key)
        .single();

    if (error) return null;
    return data?.value;
}

/**
 * Set an app setting value.
 */
export async function setAppSetting(key: string, value: unknown, adminUserId?: string) {
    const { error } = await supabase
        .from('app_settings')
        .upsert({
            key,
            value: JSON.stringify(value),
            updated_at: new Date().toISOString(),
            updated_by: adminUserId || null,
        });

    if (error) throw error;
}

/**
 * Exempt a user from KYC (admin override).
 */
export async function adminExemptUser(userId: string) {
    const { data, error } = await supabase
        .from('users')
        .update({ kyc_status: 'exempt' })
        .eq('id', userId)
        .select()
        .single();

    if (error) throw error;
    return data as User;
}

/**
 * Reset a user's KYC status back to not_started.
 */
export async function adminResetKyc(userId: string) {
    const { data, error } = await supabase
        .from('users')
        .update({
            kyc_status: 'not_started',
            kyc_applicant_id: null,
            kyc_verified_at: null,
            kyc_rejection_reason: null,
        })
        .eq('id', userId)
        .select()
        .single();

    if (error) throw error;
    return data as User;
}

/**
 * Get users with KYC status for admin view.
 */
export async function getKycUsers(params?: {
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
}) {
    let query = supabase
        .from('users')
        .select('id, nickname, email, kyc_status, kyc_applicant_id, kyc_verified_at, kyc_rejection_reason, created_at', { count: 'exact' })
        .eq('role', 'patient')
        .order('created_at', { ascending: false });

    if (params?.status) query = query.eq('kyc_status', params.status);
    if (params?.search) {
        query = query.or(`nickname.ilike.%${params.search}%,email.ilike.%${params.search}%`);
    }
    if (params?.limit) query = query.limit(params.limit);
    if (params?.offset) query = query.range(params.offset, params.offset + (params.limit || 20) - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return { users: data || [], total: count || 0 };
}

// ── Refund Management ──────────────────────────

/**
 * Get all refund requests with filtering (admin view).
 */
export async function getAllRefundRequests(params?: {
    status?: RefundRequestStatus;
    requesterRole?: string;
    limit?: number;
    offset?: number;
}) {
    let query = supabase
        .from('refund_requests')
        .select(`
            *,
            requester:users!refund_requests_requested_by_fkey(id, nickname, email, role),
            reviewer:users!refund_requests_reviewed_by_fkey(id, nickname, email),
            consultation:consultations!refund_requests_consultation_id_fkey(
                id, specialty, chief_complaint, status, token_cost, patient_id, doctor_id,
                patient:users!consultations_patient_id_fkey(id, nickname, email),
                doctor:doctors!consultations_doctor_id_fkey(id, display_name, specialty)
            )
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

    if (params?.status) query = query.eq('status', params.status);
    if (params?.requesterRole) query = query.eq('requester_role', params.requesterRole);
    if (params?.limit) query = query.limit(params.limit);
    if (params?.offset) query = query.range(params.offset, params.offset + (params.limit || 20) - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return { refundRequests: data as any[], total: count || 0 };
}

/**
 * Review (approve or reject) a refund request.
 */
export async function reviewRefundRequest(params: {
    requestId: string;
    adminUserId: string;
    decision: 'approved' | 'rejected';
    notes?: string;
    adjustedAmount?: number;
}): Promise<RefundRequest> {
    const updates: Record<string, unknown> = {
        status: params.decision,
        reviewed_by: params.adminUserId,
        review_notes: params.notes || null,
        reviewed_at: new Date().toISOString(),
    };

    // Allow admin to adjust the refund amount (partial refund)
    if (params.adjustedAmount !== undefined && params.decision === 'approved') {
        updates.refund_amount = params.adjustedAmount;
    }

    const { data, error } = await supabase
        .from('refund_requests')
        .update(updates)
        .eq('id', params.requestId)
        .select()
        .single();

    if (error) throw error;

    // Audit log
    const refund = data as RefundRequest;
    await supabase.from('consultation_audit_log').insert({
        consultation_id: refund.consultation_id,
        action: params.decision === 'approved' ? 'refund_approved' : 'refund_rejected',
        performed_by: params.adminUserId,
        metadata: {
            refund_request_id: params.requestId,
            decision: params.decision,
            notes: params.notes,
            adjusted_amount: params.adjustedAmount,
        },
    });

    return refund;
}

/**
 * Create an admin-initiated refund (auto-approved, immediate).
 * Used from ConsultationDetailPanel or PatientDetailPanel.
 */
export async function createAdminRefund(params: {
    consultationId: string;
    adminUserId: string;
    reasonCategory: AdminRefundReason;
    reasonText: string;
    customAmount?: number;
}): Promise<RefundRequest> {
    // Get consultation token cost
    const { data: consultation, error: consultationError } = await supabase
        .from('consultations')
        .select('token_cost')
        .eq('id', params.consultationId)
        .single();

    if (consultationError) throw consultationError;

    const refundAmount = params.customAmount ?? consultation.token_cost;

    const { data, error } = await supabase
        .from('refund_requests')
        .insert({
            consultation_id: params.consultationId,
            requested_by: params.adminUserId,
            requester_role: 'admin',
            reason_category: params.reasonCategory,
            reason_text: params.reasonText,
            refund_amount: refundAmount,
            status: 'auto_approved', // Admin refunds are auto-approved
            reviewed_by: params.adminUserId,
            reviewed_at: new Date().toISOString(),
        })
        .select()
        .single();

    if (error) throw error;
    return data as RefundRequest;
}

/**
 * Process an approved refund — executes the token transfer atomically.
 * Calls the process_refund RPC function.
 */
export async function processRefund(refundRequestId: string, adminUserId: string) {
    const { data, error } = await supabase.rpc('process_refund', {
        p_refund_request_id: refundRequestId,
        p_admin_user_id: adminUserId,
    });

    if (error) throw error;

    const result = data as { success: boolean; error?: string; refund_amount?: number; patient_new_balance?: number };
    if (!result.success) {
        throw new Error(result.error || 'Refund processing failed');
    }

    return result;
}

/**
 * Get refund statistics for the admin dashboard.
 */
export async function getRefundStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [
        { count: pendingCount },
        { count: approvedToday },
        { count: rejectedToday },
        { data: monthlyRefunds },
    ] = await Promise.all([
        supabase.from('refund_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('refund_requests').select('*', { count: 'exact', head: true }).in('status', ['approved', 'auto_approved', 'processed']).gte('reviewed_at', todayStart),
        supabase.from('refund_requests').select('*', { count: 'exact', head: true }).eq('status', 'rejected').gte('reviewed_at', todayStart),
        supabase.from('refund_requests').select('refund_amount').in('status', ['processed']).gte('created_at', monthStart),
    ]);

    const totalTokensRefundedMonth = (monthlyRefunds || []).reduce(
        (sum: number, r: { refund_amount: number }) => sum + r.refund_amount, 0
    );

    return {
        pendingCount: pendingCount || 0,
        approvedToday: approvedToday || 0,
        rejectedToday: rejectedToday || 0,
        totalTokensRefundedMonth,
    };
}
