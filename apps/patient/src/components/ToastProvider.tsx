import { create } from 'zustand';
import React, { useEffect, useRef, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info } from '@cliniqone/ui';

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
const TYPE_STYLES: Record<ToastType, { bg: string; border: string; Icon: React.FC<any>; text: string }> = {
    success: { bg: '#ECFDF5', border: '#059669', Icon: CheckCircle, text: '#065F46' },
    error:   { bg: '#FEF2F2', border: '#DC2626', Icon: XCircle, text: '#991B1B' },
    warning: { bg: '#FFFBEB', border: '#D97706', Icon: AlertTriangle, text: '#92400E' },
    info:    { bg: '#F0FDFA', border: '#1A8A9E', Icon: Info, text: '#134E4A' },
};

const toastContainerStyle: React.CSSProperties = {
    position: 'fixed',
    top: 16,
    left: 0,
    right: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    zIndex: 9999,
    pointerEvents: 'none',
};

const toastItemBaseStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    width: '90%',
    maxWidth: 380,
    padding: '10px 14px',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftStyle: 'solid',
    marginBottom: 4,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    pointerEvents: 'auto',
    animation: 'toastSlideIn 0.25s ease-out',
};

// ── Single Toast ───────────────────────────────
function ToastItem({ toast }: { toast: Toast }) {
    const dismiss = useToast((s) => s.dismiss);
    const [fading, setFading] = React.useState(false);

    useEffect(() => {
        const fadeTimer = setTimeout(() => setFading(true), toast.duration - 200);
        const removeTimer = setTimeout(() => dismiss(toast.id), toast.duration);
        return () => {
            clearTimeout(fadeTimer);
            clearTimeout(removeTimer);
        };
    }, []);

    const style = TYPE_STYLES[toast.type];

    return (
        <div
            style={{
                ...toastItemBaseStyle,
                backgroundColor: style.bg,
                borderLeftColor: style.border,
                opacity: fading ? 0 : 1,
                transition: 'opacity 0.2s ease-out, transform 0.2s ease-out',
                transform: fading ? 'translateY(-10px)' : 'translateY(0)',
            }}
        >
            <style.Icon size={16} color={style.border} style={{ marginRight: 8, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 13, lineHeight: '18px', color: style.text }}>{toast.message}</span>
            <button
                onClick={() => dismiss(toast.id)}
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#6B7280',
                    fontSize: 14,
                    fontWeight: 700,
                    paddingLeft: 8,
                }}
            >
                ✕
            </button>
        </div>
    );
}

// ── Provider ───────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
    const toasts = useToast((s) => s.toasts);

    return (
        <>
            {children}
            <div style={toastContainerStyle}>
                {toasts.map((t) => (
                    <ToastItem key={t.id} toast={t} />
                ))}
            </div>
        </>
    );
}
