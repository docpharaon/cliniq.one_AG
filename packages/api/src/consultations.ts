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
}) {
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
        })
        .select()
        .single();

    if (error) throw error;

    // Deduct tokens
    await supabase.rpc('deduct_tokens', {
        p_user_id: params.patientId,
        p_amount: params.tokenCost,
        p_consultation_id: data.id,
    });

    return data as Consultation;
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
