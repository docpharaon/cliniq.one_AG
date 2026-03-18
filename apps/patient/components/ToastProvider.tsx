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

// ── Colors ─────────────────────────────────────
const TYPE_STYLES: Record<ToastType, { bg: string; border: string; icon: string }> = {
    success: { bg: '#0D3B2E', border: '#10B981', icon: '✅' },
    error:   { bg: '#3B1A1A', border: '#EF4444', icon: '❌' },
    warning: { bg: '#3B2E0D', border: '#F59E0B', icon: '⚠️' },
    info:    { bg: '#0D2B3B', border: '#2DD4BF', icon: 'ℹ️' },
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
            <Text style={styles.message} numberOfLines={3}>{toast.message}</Text>
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
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },
    icon: { fontSize: 16, marginRight: spacing.sm },
    message: {
        ...typography.bodySm,
        color: '#F1F5F9',
        flex: 1,
        lineHeight: 18,
    },
    close: {
        color: '#94A3B8',
        fontSize: 14,
        paddingLeft: spacing.sm,
        fontWeight: '700',
    },
});
