import { supabase } from './client';
import type { Consultation, Doctor, Message } from '@cliniqone/types';

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
