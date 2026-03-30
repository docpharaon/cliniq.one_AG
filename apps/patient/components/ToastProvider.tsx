import { create } from 'zustand';
import React, { useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, Animated, TouchableOpacity, Platform,
} from 'react-native';
import { colors, spacing, typography, radius } from '@cliniqone/ui';

// ── Types ──────────────────────────────────────
export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration: number;
}

interface ToastStore {
    toasts: Toast[];
    show: (message: string, type?: ToastType, duration?: number) => void;
    dismiss: (id: string) => void;
}

// ── Store ──────────────────────────────────────
let _counter = 0;

export const useToast = create<ToastStore>((set) => ({
    toasts: [],
    show: (message, type = 'info', duration = 3500) => {
        const id = `toast_${++_counter}_${Date.now()}`;
        set((s) => ({ toasts: [...s.toasts.slice(-4), { id, message, type, duration }] }));
    },
    dismiss: (id) => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    },
}));

// ── Colors (Light-theme optimized) ─────────────
const TYPE_STYLES: Record<ToastType, { bg: string; border: string; icon: string; text: string }> = {
    success: { bg: '#ECFDF5', border: '#059669', icon: '✅', text: '#065F46' },
    error:   { bg: '#FEF2F2', border: '#DC2626', icon: '❌', text: '#991B1B' },
    warning: { bg: '#FFFBEB', border: '#D97706', icon: '⚠️', text: '#92400E' },
    info:    { bg: '#F0FDFA', border: '#1A8A9E', icon: 'ℹ️', text: '#134E4A' },
};

// ── Single Toast ───────────────────────────────
function ToastItem({ toast }: { toast: Toast }) {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(-30)).current;
    const dismiss = useToast((s) => s.dismiss);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
            Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]).start();

        const timer = setTimeout(() => {
            Animated.parallel([
                Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
                Animated.timing(translateY, { toValue: -20, duration: 200, useNativeDriver: true }),
            ]).start(() => dismiss(toast.id));
        }, toast.duration);

        return () => clearTimeout(timer);
    }, []);

    const style = TYPE_STYLES[toast.type];

    return (
        <Animated.View
            style={[
                styles.toast,
                { backgroundColor: style.bg, borderLeftColor: style.border, opacity, transform: [{ translateY }] },
            ]}
        >
            <Text style={styles.icon}>{style.icon}</Text>
            <Text style={[styles.message, { color: style.text }]} numberOfLines={3}>{toast.message}</Text>
            <TouchableOpacity onPress={() => dismiss(toast.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

// ── Provider ───────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
    const toasts = useToast((s) => s.toasts);

    return (
        <>
            {children}
            <View style={styles.container} pointerEvents="box-none">
                {toasts.map((t) => (
                    <ToastItem key={t.id} toast={t} />
                ))}
            </View>
        </>
    );
}

// ── Styles ─────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: Platform.OS === 'web' ? 16 : 56,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 9999,
        pointerEvents: 'box-none' as any,
    },
    toast: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '90%',
        maxWidth: 380,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 2,
        borderRadius: radius.md,
        borderLeftWidth: 4,
        marginBottom: spacing.xs,
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 4,
    },
    icon: { fontSize: 16, marginRight: spacing.sm },
    message: {
        ...typography.bodySm,
        color: colors.textPrimary,
        flex: 1,
        lineHeight: 18,
    },
    close: {
        color: colors.textSecondary,
        fontSize: 14,
        paddingLeft: spacing.sm,
        fontWeight: '700',
    },
});
