import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getPendingConsultations,
    getDoctorConsultations,
    getDoctorStats,
    claimConsultation,
    updateConsultationStatus,
    submitReport,
    toggleDoctorAccepting,
    updateDoctorProfile,
    getConsultationForDoctor,
    createInterventionOrder,
    createDoctorInquiry,
    getDoctorInquiries,
} from '@cliniqone/api';
import type { Consultation, Doctor } from '@cliniqone/types';

// ── Query Keys ───────────────────────────────
export const doctorQueryKeys = {
    stats: (doctorId: string) => ['doctorStats', doctorId] as const,
    pendingQueue: (specialty: string) => ['pendingQueue', specialty] as const,
    myConsultations: (doctorId: string, status?: string) => ['doctorConsultations', doctorId, status] as const,
    consultationDetail: (id: string) => ['consultationDetail', id] as const,
};

// ── Doctor Stats (dashboard) ─────────────────
export function useDoctorStats(doctorId: string) {
    return useQuery({
        queryKey: doctorQueryKeys.stats(doctorId),
        queryFn: () => getDoctorStats(doctorId),
        enabled: !!doctorId,
        staleTime: 30_000,
        refetchInterval: 60_000, // Refresh every minute
    });
}

// ── Pending Queue (unassigned consultations) ──
export function usePendingQueue(specialty: string) {
    return useQuery({
        queryKey: doctorQueryKeys.pendingQueue(specialty),
        queryFn: () => getPendingConsultations(specialty),
        enabled: !!specialty,
        staleTime: 15_000,
        refetchInterval: 30_000, // Poll queue every 30s
    });
}

// ── Doctor's Own Consultations ────────────────
export function useDoctorConsultations(doctorId: string, statusFilter?: string) {
    return useQuery({
        queryKey: doctorQueryKeys.myConsultations(doctorId, statusFilter),
        queryFn: () => getDoctorConsultations(doctorId, statusFilter),
        enabled: !!doctorId,
        staleTime: 30_000,
    });
}

// ── Single Consultation Detail (with patient) ─
export function useConsultationDetail(consultationId: string) {
    return useQuery({
        queryKey: doctorQueryKeys.consultationDetail(consultationId),
        queryFn: () => getConsultationForDoctor(consultationId),
        enabled: !!consultationId,
        staleTime: 60_000,
    });
}

// ── Claim Consultation (mutation) ─────────────
export function useClaimConsultation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ consultationId, doctorId }: { consultationId: string; doctorId: string }) =>
            claimConsultation(consultationId, doctorId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pendingQueue'] });
            queryClient.invalidateQueries({ queryKey: ['doctorConsultations'] });
            queryClient.invalidateQueries({ queryKey: ['doctorStats'] });
        },
    });
}

// ── Update Consultation Status (mutation) ─────
export function useUpdateConsultationStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ consultationId, status, extras }: {
            consultationId: string;
            status: string;
            extras?: Record<string, unknown>;
        }) => updateConsultationStatus(consultationId, status, extras),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['doctorConsultations'] });
            queryClient.invalidateQueries({ queryKey: ['doctorStats'] });
        },
    });
}

// ── Submit Report (mutation) ──────────────────
export function useSubmitReport() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ consultationId, report, prescription }: {
            consultationId: string;
            report: Record<string, unknown>;
            prescription?: Record<string, unknown>;
        }) => submitReport(consultationId, report, prescription),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['doctorConsultations'] });
            queryClient.invalidateQueries({ queryKey: ['doctorStats'] });
            queryClient.invalidateQueries({ queryKey: ['consultationDetail'] });
        },
    });
}

// ── Toggle Accepting (mutation) ───────────────
export function useToggleAccepting() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ doctorId, isAccepting }: { doctorId: string; isAccepting: boolean }) =>
            toggleDoctorAccepting(doctorId, isAccepting),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['doctorStats'] });
        },
    });
}

// ── Update Doctor Profile (mutation) ──────────
export function useUpdateDoctorProfile() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ doctorId, updates }: { doctorId: string; updates: Partial<Doctor> }) =>
            updateDoctorProfile(doctorId, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['doctorStats'] });
        },
    });
}

// ── Create Intervention Order (mutation) ──────
export function useCreateInterventionOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (interventions: Parameters<typeof createInterventionOrder>[0]) =>
            createInterventionOrder(interventions),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['doctorConsultations'] });
            queryClient.invalidateQueries({ queryKey: ['consultationDetail'] });
        },
    });
}

// ── Create Doctor Inquiry (mutation) ──────────
export function useCreateInquiry() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (params: Parameters<typeof createDoctorInquiry>[0]) =>
            createDoctorInquiry(params),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['doctorConsultations'] });
            queryClient.invalidateQueries({ queryKey: ['consultationDetail'] });
            queryClient.invalidateQueries({ queryKey: ['doctorInquiries'] });
        },
    });
}

// ── Doctor Inquiries (query) ──────────────────
export function useDoctorInquiries(consultationId: string) {
    return useQuery({
        queryKey: ['doctorInquiries', consultationId],
        queryFn: () => getDoctorInquiries(consultationId),
        enabled: !!consultationId,
        staleTime: 15_000,
    });
}

// ── Consultation Report Uploads (AI-verified documents) ───
export interface ConsultationReport {
    id: string;
    consultation_id: string;
    patient_id: string;
    report_type: string;
    file_path: string;
    status: string;
    ai_analysis: Record<string, any> | null;
    document_date: string | null;
    is_verified: boolean;
    rejection_reason: string | null;
    report_summary: string | null;
    ai_confidence: number | null;
    document_type: string;
    date_relevance: string;
    document_language: string;
    created_at: string;
}

export function useConsultationReports(consultationId: string) {
    return useQuery({
        queryKey: ['consultationReports', consultationId],
        queryFn: async () => {
            const { supabase } = await import('@cliniqone/api');
            const { data, error } = await supabase
                .from('consultation_report_uploads')
                .select('*')
                .eq('consultation_id', consultationId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return (data || []) as ConsultationReport[];
        },
        enabled: !!consultationId,
        staleTime: 30_000,
    });
}

// ── WA Session for Consultation ───────────────
export function useWaSession(consultationId: string) {
    return useQuery({
        queryKey: ['waSession', consultationId],
        queryFn: async () => {
            const { supabase } = await import('@cliniqone/api');
            const { data, error } = await supabase
                .from('wa_chat_sessions')
                .select('id, phone_number, current_node, language, fast_track_mode, skipped_sections, created_at')
                .eq('consultation_id', consultationId)
                .maybeSingle();
            if (error) throw error;
            return data;
        },
        enabled: !!consultationId,
        staleTime: 60_000,
    });
}

// ── Create WA Follow-Up Request (mutation) ────
export function useCreateFollowUpRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: {
            consultationId: string;
            doctorId: string;
            requestType: 'photo' | 'lab_result' | 'text_question' | 'medication_label';
            metadata?: Record<string, unknown>;
        }) => {
            const { supabase } = await import('@cliniqone/api');
            const { data, error } = await supabase
                .from('wa_doctor_requests')
                .insert({
                    consultation_id: params.consultationId,
                    doctor_id: params.doctorId,
                    request_type: params.requestType,
                    metadata: params.metadata || {},
                    status: 'pending',
                })
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: (_data, vars) => {
            queryClient.invalidateQueries({ queryKey: ['waFollowUps', vars.consultationId] });
            queryClient.invalidateQueries({ queryKey: ['consultationDetail', vars.consultationId] });
        },
    });
}

// ── WA Follow-Up Requests for a Consultation ──
export function useWaFollowUps(consultationId: string) {
    return useQuery({
        queryKey: ['waFollowUps', consultationId],
        queryFn: async () => {
            const { supabase } = await import('@cliniqone/api');
            const { data, error } = await supabase
                .from('wa_doctor_requests')
                .select('*')
                .eq('consultation_id', consultationId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },
        enabled: !!consultationId,
        staleTime: 15_000,
    });
}

// ── Today's Bookings for Doctor ───────────────
export function useTodaysBookings(doctorId: string) {
    return useQuery({
        queryKey: ['todaysBookings', doctorId],
        queryFn: async () => {
            const { supabase } = await import('@cliniqone/api');
            const today = new Date();
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
            const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
            const { data, error } = await supabase
                .from('wa_bookings')
                .select('*, patient:patients(nickname, phone_number, gender, year_of_birth), location:doctor_locations(name, city)')
                .eq('doctor_id', doctorId)
                .gte('booking_date', startOfDay)
                .lt('booking_date', endOfDay)
                .order('time_slot', { ascending: true });
            if (error) throw error;
            return data || [];
        },
        enabled: !!doctorId,
        staleTime: 30_000,
        refetchInterval: 60_000,
    });
}

// ── Bookings for a Specific Date ──────────────
export function useDateBookings(doctorId: string, date: string) {
    return useQuery({
        queryKey: ['dateBookings', doctorId, date],
        queryFn: async () => {
            const { supabase } = await import('@cliniqone/api');
            const startOfDay = new Date(date).toISOString();
            const endOfDay = new Date(new Date(date).getTime() + 86400000).toISOString();
            const { data, error } = await supabase
                .from('wa_bookings')
                .select('*, patient:patients(nickname, phone_number, gender, year_of_birth), location:doctor_locations(name, city)')
                .eq('doctor_id', doctorId)
                .gte('booking_date', startOfDay)
                .lt('booking_date', endOfDay)
                .order('time_slot', { ascending: true });
            if (error) throw error;
            return data || [];
        },
        enabled: !!doctorId && !!date,
        staleTime: 30_000,
    });
}

// ── Update Booking Status (mutation) ──────────
export function useUpdateBookingStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ bookingId, status }: { bookingId: string; status: string }) => {
            const { supabase } = await import('@cliniqone/api');
            const { error } = await supabase
                .from('wa_bookings')
                .update({ status })
                .eq('id', bookingId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['todaysBookings'] });
            queryClient.invalidateQueries({ queryKey: ['dateBookings'] });
        },
    });
}

// ── Doctor Locations (admin-gated) ────────────
export function useDoctorLocations(doctorId: string) {
    return useQuery({
        queryKey: ['doctorLocations', doctorId],
        queryFn: async () => {
            const { supabase } = await import('@cliniqone/api');
            const { data, error } = await supabase
                .from('doctor_locations')
                .select('*, hours:doctor_location_hours(*)')
                .eq('doctor_id', doctorId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },
        enabled: !!doctorId,
        staleTime: 60_000,
    });
}

// ── Create / Update Location (pending approval) ─
export function useUpsertLocation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: {
            id?: string;
            doctorId: string;
            name: string;
            address?: string;
            city?: string;
            country?: string;
            bookingMode?: string;
            slotDuration?: number;
            callCenterPhone?: string;
        }) => {
            const { supabase } = await import('@cliniqone/api');
            const payload = {
                doctor_id: params.doctorId,
                name: params.name,
                address: params.address || '',
                city: params.city || '',
                country: params.country || '',
                booking_mode: params.bookingMode || 'wa_direct',
                slot_duration_min: params.slotDuration || 15,
                call_center_phone: params.callCenterPhone || null,
                approval_status: 'pending_review' as const,
            };
            if (params.id) {
                const { error } = await supabase.from('doctor_locations').update(payload).eq('id', params.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('doctor_locations').insert(payload);
                if (error) throw error;
            }
        },
        onSuccess: (_data, vars) => {
            queryClient.invalidateQueries({ queryKey: ['doctorLocations', vars.doctorId] });
        },
    });
}

// ── Doctor Subscription (feature flags) ───────
export function useDoctorSubscription(doctorId: string) {
    return useQuery({
        queryKey: ['doctorSubscription', doctorId],
        queryFn: async () => {
            const { supabase } = await import('@cliniqone/api');
            const { data, error } = await supabase
                .from('doctor_subscriptions')
                .select('*')
                .eq('doctor_id', doctorId)
                .maybeSingle();
            if (error) throw error;
            return data;
        },
        enabled: !!doctorId,
        staleTime: 300_000,
    });
}

