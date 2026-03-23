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
