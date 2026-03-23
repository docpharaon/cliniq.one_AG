import { supabase } from './client';
import type { Consultation, Message, SenderRole } from '@cliniqone/types';

// ── Fetch patient's consultations ────────────────
export async function getConsultations(patientId: string) {
    const { data, error } = await supabase
        .from('consultations')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Consultation[];
}

// ── Fetch single consultation with doctor info ───
export async function getConsultation(id: string) {
    const { data, error } = await supabase
        .from('consultations')
        .select(`
            *,
            doctor:doctors(
                id, full_name, display_name, specialty, sub_specialty,
                hospital, city, rating_avg, rating_count, years_experience, avatar_url
            )
        `)
        .eq('id', id)
        .single();

    if (error) throw error;
    return data;
}

// ── Create new consultation (from intake) ────────
export async function createConsultation(params: {
    patientId: string;
    specialty: string;
    chiefComplaint: string;
    medications: string[];
    allergies: string[];
    aiSession: Record<string, unknown>;
    tokenCost: number;
    requestedDoctorId?: string | null;
    doctorSelectionMethod?: string | null;
}) {
    // Check if there's an existing intake_in_progress session to update
    const { data: existing } = await supabase
        .from('consultations')
        .select('id')
        .eq('patient_id', params.patientId)
        .eq('status', 'intake_in_progress')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    let consultation;

    if (existing) {
        // Update the existing intake session → submitted
        const { data, error } = await supabase
            .from('consultations')
            .update({
                specialty: params.specialty,
                status: 'submitted',
                chief_complaint: params.chiefComplaint,
                ai_summary: params.aiSession,
                token_cost: params.tokenCost,
                payment_method: 'tokens',
                ...(params.requestedDoctorId ? { requested_doctor_id: params.requestedDoctorId } : {}),
                ...(params.doctorSelectionMethod ? { doctor_selection_method: params.doctorSelectionMethod } : {}),
            })
            .eq('id', existing.id)
            .select()
            .single();

        if (error) throw error;
        consultation = data;
    } else {
        // No existing session — create fresh
        const { data, error } = await supabase
            .from('consultations')
            .insert({
                patient_id: params.patientId,
                specialty: params.specialty,
                status: 'submitted',
                priority: 'routine',
                chief_complaint: params.chiefComplaint,
                ai_summary: params.aiSession,
                token_cost: params.tokenCost,
                payment_method: 'tokens',
                protocol_flags: [],
                ...(params.requestedDoctorId ? { requested_doctor_id: params.requestedDoctorId } : {}),
                ...(params.doctorSelectionMethod ? { doctor_selection_method: params.doctorSelectionMethod } : {}),
            })
            .select()
            .single();

        if (error) throw error;
        consultation = data;
    }

    // Deduct tokens
    await supabase.rpc('deduct_tokens', {
        p_user_id: params.patientId,
        p_amount: params.tokenCost,
        p_consultation_id: consultation.id,
    });

    return consultation as Consultation;
}

// ── Lookup doctor by identifier code ─────────────
export async function lookupDoctorByCode(code: string) {
    const { data, error } = await supabase
        .from('doctors')
        .select('id, display_name, full_name, specialty, avatar_url, rating_avg, doctor_type, identifier_code, credential_expires_at, is_accepting, status, consultation_fee_tokens')
        .eq('identifier_code', code.toUpperCase())
        .eq('status', 'active')
        .single();

    if (error) return null;
    // Check locum credential expiry
    if (data.doctor_type === 'locum' && data.credential_expires_at) {
        if (new Date(data.credential_expires_at) < new Date()) return null;
    }
    return data;
}

// ── Search doctors for patient selection ──────────
export async function searchDoctorsForPatient(query: string) {
    const { data, error } = await supabase
        .from('doctors')
        .select('id, display_name, full_name, specialty, avatar_url, rating_avg, doctor_type, identifier_code, is_accepting, consultation_fee_tokens')
        .eq('status', 'active')
        .eq('doctor_type', 'permanent')
        .eq('is_accepting', true)
        .or(`display_name.ilike.%${query}%,full_name.ilike.%${query}%,specialty.ilike.%${query}%`)
        .limit(10);

    if (error) return [];
    return data ?? [];
}

// ── Fetch messages for a consultation ────────────
export async function getMessages(consultationId: string) {
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('consultation_id', consultationId)
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data as Message[];
}

// ── Send message (any role) ──────────────────────
export async function sendMessage(params: {
    consultationId: string;
    senderId: string;
    senderRole: SenderRole;
    content: string;
    messageType?: string;
    metadata?: Record<string, unknown>;
}) {
    const { data, error } = await supabase
        .from('messages')
        .insert({
            consultation_id: params.consultationId,
            sender_id: params.senderId,
            sender_role: params.senderRole,
            content: params.content,
            message_type: params.messageType || 'text',
            metadata: params.metadata || null,
        })
        .select()
        .single();

    if (error) throw error;
    return data as Message;
}

// ── Fetch token transaction history ──────────────
export async function getTokenHistory(userId: string) {
    const { data, error } = await supabase
        .from('token_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) throw error;
    return data;
}

// ── Save intake session (auto-save) ──────────────
// Creates or updates an intake_in_progress consultation row
// with the full chat session snapshot stored in ai_entities.
export async function saveIntakeSession(params: {
    sessionId?: string;
    patientId: string;
    specialty: string;
    chiefComplaint?: string;
    snapshot: Record<string, unknown>;
}) {
    if (params.sessionId) {
        // Update existing session
        const { data, error } = await supabase
            .from('consultations')
            .update({
                chief_complaint: params.chiefComplaint || null,
                ai_entities: params.snapshot,
            })
            .eq('id', params.sessionId)
            .select()
            .single();

        if (error) throw error;
        return data as Consultation;
    } else {
        // Create new in-progress session
        const { data, error } = await supabase
            .from('consultations')
            .insert({
                patient_id: params.patientId,
                specialty: params.specialty,
                status: 'intake_in_progress',
                priority: 'routine',
                chief_complaint: params.chiefComplaint || null,
                ai_entities: params.snapshot,
                protocol_flags: [],
            })
            .select()
            .single();

        if (error) throw error;
        return data as Consultation;
    }
}

// ── Get active intake session for a patient ──────
export async function getActiveIntakeSession(patientId: string) {
    const { data, error } = await supabase
        .from('consultations')
        .select('*')
        .eq('patient_id', patientId)
        .eq('status', 'intake_in_progress')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    return data as Consultation | null;
}

// ── Delete intake session (cleanup) ──────────────
export async function deleteIntakeSession(sessionId: string) {
    const { error } = await supabase
        .from('consultations')
        .delete()
        .eq('id', sessionId)
        .eq('status', 'intake_in_progress');

    if (error) throw error;
}

// ── Subscribe to consultation updates (realtime) ─
export function subscribeToConsultation(
    consultationId: string,
    onUpdate: (consultation: Partial<Consultation>) => void,
) {
    return supabase
        .channel(`consultation:${consultationId}`)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'consultations',
                filter: `id=eq.${consultationId}`,
            },
            (payload) => onUpdate(payload.new as Partial<Consultation>),
        )
        .subscribe();
}

// ── Subscribe to new messages (realtime) ─────────
export function subscribeToMessages(
    consultationId: string,
    onMessage: (message: Message) => void,
) {
    return supabase
        .channel(`messages:${consultationId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `consultation_id=eq.${consultationId}`,
            },
            (payload) => onMessage(payload.new as Message),
        )
        .subscribe();
}
