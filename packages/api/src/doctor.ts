import { supabase } from './client';
import type { Consultation, Doctor, Message, DoctorInquiry, RefundRequest, DoctorRefundReason } from '@cliniqone/types';

// ──────────────────────────────────────────
// Doctor API Functions
// Used by doctor panel to manage their work
// ──────────────────────────────────────────

/**
 * Get doctor profile by user_id (for current logged-in doctor).
 */
export async function getDoctorProfile(userId: string): Promise<Doctor | null> {
    const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
    }
    return data as Doctor;
}

/**
 * Update doctor profile (bio, availability, etc).
 */
export async function updateDoctorProfile(doctorId: string, updates: Partial<Doctor>) {
    const { data, error } = await supabase
        .from('doctors')
        .update(updates)
        .eq('id', doctorId)
        .select()
        .single();

    if (error) throw error;
    return data as Doctor;
}

/**
 * Toggle doctor accepting status.
 */
export async function toggleDoctorAccepting(doctorId: string, isAccepting: boolean) {
    return updateDoctorProfile(doctorId, { is_accepting: isAccepting } as Partial<Doctor>);
}

/**
 * Get consultations assigned to a doctor.
 */
export async function getDoctorConsultations(doctorId: string, statusFilter?: string) {
    let query = supabase
        .from('consultations')
        .select(`
            *,
            patient:users!consultations_patient_id_fkey(
                id, nickname, year_of_birth, gender, country, city, avatar_url
            )
        `)
        .eq('doctor_id', doctorId)
        .order('created_at', { ascending: false });

    if (statusFilter) {
        query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

/**
 * Get pending (unassigned) consultations for doctor to claim.
 */
export async function getPendingConsultations(specialty: string) {
    const { data, error } = await supabase
        .from('consultations')
        .select(`
            *,
            patient:users!consultations_patient_id_fkey(
                id, nickname, year_of_birth, gender, country, city
            )
        `)
        .eq('status', 'submitted')
        .eq('specialty', specialty)
        .is('doctor_id', null)
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
}

/**
 * Claim (assign) a consultation to a doctor.
 */
export async function claimConsultation(consultationId: string, doctorId: string) {
    const { data, error } = await supabase
        .from('consultations')
        .update({
            doctor_id: doctorId,
            status: 'assigned',
            assigned_at: new Date().toISOString(),
        })
        .eq('id', consultationId)
        .is('doctor_id', null) // Only if not yet assigned
        .select()
        .single();

    if (error) throw error;
    return data as Consultation;
}

/**
 * Update consultation status (doctor workflow).
 */
export async function updateConsultationStatus(
    consultationId: string,
    status: string,
    extras?: Record<string, unknown>,
) {
    const updates: Record<string, unknown> = { status, ...extras };

    if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
        .from('consultations')
        .update(updates)
        .eq('id', consultationId)
        .select()
        .single();

    if (error) throw error;
    return data as Consultation;
}

/**
 * Submit doctor report and/or prescription.
 */
export async function submitReport(
    consultationId: string,
    report: Record<string, unknown>,
    prescription?: Record<string, unknown>,
) {
    const updates: Record<string, unknown> = {
        report,
        status: 'report_ready',
    };

    if (prescription) {
        updates.prescription = prescription;
    }

    const { data, error } = await supabase
        .from('consultations')
        .update(updates)
        .eq('id', consultationId)
        .select()
        .single();

    if (error) throw error;
    return data as Consultation;
}

/**
 * Get doctor's earnings/stats summary.
 */
export async function getDoctorStats(doctorId: string) {
    const { data: doctor } = await supabase
        .from('doctors')
        .select('rating_avg, rating_count, tokens_earned, daily_limit')
        .eq('id', doctorId)
        .single();

    const { count: todayCount } = await supabase
        .from('consultations')
        .select('*', { count: 'exact', head: true })
        .eq('doctor_id', doctorId)
        .gte('created_at', new Date().toISOString().split('T')[0]);

    return {
        ...doctor,
        consultations_today: todayCount || 0,
    };
}

/**
 * Get single consultation with patient info (for doctor view).
 */
export async function getConsultationForDoctor(consultationId: string) {
    const { data, error } = await supabase
        .from('consultations')
        .select(`
            *,
            patient:users!consultations_patient_id_fkey(
                id, nickname, year_of_birth, gender, country, city,
                language, insurance_provider, insurance_policy_number
            )
        `)
        .eq('id', consultationId)
        .single();

    if (error) throw error;
    return data;
}

/**
 * Create intervention orders for a consultation.
 */
export async function createInterventionOrder(interventions: Array<{
    consultation_id: string;
    patient_id: string;
    doctor_id: string;
    type: string;
    title: string;
    category: string;
    clinical_indication: string;
    doctor_notes: string;
    priority: string;
    estimated_cost_sar: number;
}>) {
    const { data, error } = await supabase
        .from('interventions')
        .insert(interventions.map(i => ({ ...i, status: 'ordered' })))
        .select();

    if (error) throw error;
    return data;
}

// ──────────────────────────────────────────
// Doctor Inquiries
// ──────────────────────────────────────────

/**
 * Create a doctor inquiry for additional patient information.
 * Also updates consultation status to 'inquiry_sent'.
 */
export async function createDoctorInquiry(params: {
    consultationId: string;
    doctorId: string;
    questionText: string;
    aiImprovedText?: string;
    requestType?: 'text' | 'skin_photo' | 'medication_photo' | 'document_photo';
    maxTurns?: number;
    deadlineHours?: number;
}): Promise<DoctorInquiry> {
    const deadlineAt = new Date(
        Date.now() + (params.deadlineHours || 48) * 60 * 60 * 1000
    ).toISOString();

    const { data, error } = await supabase
        .from('doctor_inquiries')
        .insert({
            consultation_id: params.consultationId,
            doctor_id: params.doctorId,
            question_text: params.questionText,
            ai_improved_text: params.aiImprovedText || null,
            request_type: params.requestType || 'text',
            max_turns: params.maxTurns || 7,
            deadline_at: deadlineAt,
        })
        .select()
        .single();

    if (error) throw error;

    // Update consultation status to 'inquiry_sent'
    await supabase
        .from('consultations')
        .update({ status: 'inquiry_sent' })
        .eq('id', params.consultationId);

    return data as DoctorInquiry;
}

/**
 * Get all inquiries for a consultation.
 */
export async function getDoctorInquiries(consultationId: string): Promise<DoctorInquiry[]> {
    const { data, error } = await supabase
        .from('doctor_inquiries')
        .select('*')
        .eq('consultation_id', consultationId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as DoctorInquiry[];
}

/**
 * Get pending inquiries for a patient (across all their consultations).
 */
export async function getPatientPendingInquiries(patientId: string): Promise<(DoctorInquiry & { consultation: { specialty: string; chief_complaint: string } })[]> {
    // Step 1: Get patient's consultation IDs
    const { data: consultations } = await supabase
        .from('consultations')
        .select('id')
        .eq('patient_id', patientId);

    if (!consultations || consultations.length === 0) return [];

    const consultationIds = consultations.map(c => c.id);

    // Step 2: Get pending inquiries for those consultations
    const { data, error } = await supabase
        .from('doctor_inquiries')
        .select(`
            *,
            consultation:consultations!doctor_inquiries_consultation_id_fkey(
                specialty, chief_complaint
            )
        `)
        .eq('status', 'pending')
        .in('consultation_id', consultationIds);

    if (error) throw error;
    return (data || []) as any;
}

/**
 * Submit patient's inquiry response. Marks inquiry as answered
 * and resets consultation status to 'in_progress'.
 */
export async function submitInquiryResponse(params: {
    inquiryId: string;
    responseSummary: Record<string, unknown>;
    chatHistory: { role: string; content: string }[];
    turnCount: number;
}): Promise<DoctorInquiry> {
    const { data, error } = await supabase
        .from('doctor_inquiries')
        .update({
            status: 'answered',
            response_summary: params.responseSummary,
            chat_history: params.chatHistory,
            turn_count: params.turnCount,
            answered_at: new Date().toISOString(),
        })
        .eq('id', params.inquiryId)
        .select()
        .single();

    if (error) throw error;

    // Reset consultation back to 'in_progress' so doctor can continue
    await supabase
        .from('consultations')
        .update({ status: 'in_progress' })
        .eq('id', (data as DoctorInquiry).consultation_id);

    return data as DoctorInquiry;
}

// ──────────────────────────────────────────
// Doctor Refund Requests
// ──────────────────────────────────────────

/**
 * Request a refund for a consultation (doctor-initiated).
 * Creates a refund_request with requester_role='doctor'.
 */
export async function requestDoctorRefund(params: {
    consultationId: string;
    doctorUserId: string;
    reasonCategory: DoctorRefundReason;
    reasonText: string;
}): Promise<RefundRequest> {
    // Get the consultation to find the token cost
    const { data: consultation, error: consultationError } = await supabase
        .from('consultations')
        .select('token_cost, status')
        .eq('id', params.consultationId)
        .single();

    if (consultationError) throw consultationError;

    const { data, error } = await supabase
        .from('refund_requests')
        .insert({
            consultation_id: params.consultationId,
            requested_by: params.doctorUserId,
            requester_role: 'doctor',
            reason_category: params.reasonCategory,
            reason_text: params.reasonText,
            refund_amount: consultation.token_cost,
        })
        .select()
        .single();

    if (error) throw error;

    // Log to consultation audit
    await supabase.from('consultation_audit_log').insert({
        consultation_id: params.consultationId,
        action: 'refund_requested',
        performed_by: params.doctorUserId,
        metadata: {
            requester_role: 'doctor',
            reason_category: params.reasonCategory,
            refund_amount: consultation.token_cost,
        },
    });

    return data as RefundRequest;
}

/**
 * Get refund requests submitted by this doctor.
 */
export async function getDoctorRefundRequests(doctorUserId: string): Promise<RefundRequest[]> {
    const { data, error } = await supabase
        .from('refund_requests')
        .select(`
            *,
            consultation:consultations!refund_requests_consultation_id_fkey(
                id, specialty, chief_complaint, status, patient_id
            )
        `)
        .eq('requested_by', doctorUserId)
        .eq('requester_role', 'doctor')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as RefundRequest[];
}

/**
 * Check if a pending refund request already exists for a consultation (from any role).
 */
export async function hasRefundPending(consultationId: string): Promise<boolean> {
    const { count } = await supabase
        .from('refund_requests')
        .select('*', { count: 'exact', head: true })
        .eq('consultation_id', consultationId)
        .eq('status', 'pending');

    return (count || 0) > 0;
}
