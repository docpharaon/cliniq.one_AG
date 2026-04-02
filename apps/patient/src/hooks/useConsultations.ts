import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getConsultations,
    getConsultation,
    createConsultation,
    getMessages,
    sendMessage,
    getTokenHistory,
} from '@cliniqone/api';
import type { Consultation, Message } from '@cliniqone/types';

// ── Keys ─────────────────────────────────────
export const queryKeys = {
    consultations: (patientId: string) => ['consultations', patientId] as const,
    consultation: (id: string) => ['consultation', id] as const,
    messages: (consultationId: string) => ['messages', consultationId] as const,
    tokenHistory: (userId: string) => ['tokenHistory', userId] as const,
};

// ── Consultation List ────────────────────────
export function useConsultations(patientId: string) {
    return useQuery({
        queryKey: queryKeys.consultations(patientId),
        queryFn: () => getConsultations(patientId),
        enabled: !!patientId,
        staleTime: 30_000,
        retry: 1,
    });
}

// ── Single Consultation ──────────────────────
export function useConsultation(id: string) {
    return useQuery({
        queryKey: queryKeys.consultation(id),
        queryFn: () => getConsultation(id),
        enabled: !!id,
    });
}

// ── Messages ─────────────────────────────────
export function useMessages(consultationId: string) {
    return useQuery({
        queryKey: queryKeys.messages(consultationId),
        queryFn: () => getMessages(consultationId),
        enabled: !!consultationId,
        refetchInterval: 10_000, // Poll every 10s as fallback
    });
}

// ── Create Consultation ──────────────────────
export function useCreateConsultation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createConsultation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['consultations'] });
        },
    });
}

// ── Send Message ─────────────────────────────
export function useSendMessage(consultationId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: sendMessage,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.messages(consultationId) });
        },
    });
}

// ── Token History ────────────────────────────
export function useTokenHistory(userId: string) {
    return useQuery({
        queryKey: queryKeys.tokenHistory(userId),
        queryFn: () => getTokenHistory(userId),
        enabled: !!userId,
        staleTime: 60_000,
    });
}
