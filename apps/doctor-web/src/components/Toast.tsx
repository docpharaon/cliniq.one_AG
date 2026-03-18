'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { create } from 'zustand';

// ──────────────────────────────────────────
// Toast System for Doctor-Web (Zustand-based)
// ──────────────────────────────────────────

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
    id: number;
    message: string;
    type: ToastType;
    duration: number;
}

interface ToastStore {
    toasts: ToastItem[];
    show: (message: string, type?: ToastType, duration?: number) => void;
    dismiss: (id: number) => void;
}

let toastId = 0;

export const useToast = create<ToastStore>((set) => ({
    toasts: [],
    show: (message, type = 'info', duration = 4000) => {
        const id = ++toastId;
        set(s => ({ toasts: [...s.toasts, { id, message, type, duration }] }));
    },
    dismiss: (id) => {
        set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }));
    },
}));

const TYPE_CONFIG: Record<ToastType, { icon: string; bg: string; border: string }> = {
    success: { icon: '✅', bg: 'rgba(34, 197, 94, 0.12)', border: 'rgba(34, 197, 94, 0.4)' },
    error:   { icon: '❌', bg: 'rgba(239, 68, 68, 0.12)',  border: 'rgba(239, 68, 68, 0.4)' },
    warning: { icon: '⚠️', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.4)' },
    info:    { icon: 'ℹ️', bg: 'rgba(59, 130, 246, 0.12)',  border: 'rgba(59, 130, 246, 0.4)' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const toasts = useToast(s => s.toasts);
    const dismiss = useToast(s => s.dismiss);

    return (
        <>
            {children}
            <div style={{
                position: 'fixed', top: 20, right: 20, zIndex: 9999,
                display: 'flex', flexDirection: 'column', gap: 8,
                pointerEvents: 'none',
            }}>
                {toasts.map(toast => (
                    <ToastCard key={toast.id} toast={toast} onDismiss={dismiss} />
                ))}
            </div>
        </>
    );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
    const [exiting, setExiting] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        timerRef.current = setTimeout(() => {
            setExiting(true);
            setTimeout(() => onDismiss(toast.id), 300);
        }, toast.duration);

        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [toast.id, toast.duration, onDismiss]);

    const config = TYPE_CONFIG[toast.type];

    return (
        <div
            style={{
                pointerEvents: 'auto',
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 18px',
                borderRadius: 10,
                border: `1px solid ${config.border}`,
                backdropFilter: 'blur(12px)',
                minWidth: 280, maxWidth: 420,
                fontSize: 14, color: '#f1f5f9',
                cursor: 'pointer',
                backgroundColor: config.bg,
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                opacity: exiting ? 0 : 1,
                transform: exiting ? 'translateX(40px)' : 'translateX(0)',
                transition: 'opacity 0.3s, transform 0.3s',
            }}
            onClick={() => {
                setExiting(true);
                setTimeout(() => onDismiss(toast.id), 300);
            }}
        >
            <span style={{ fontSize: 16, flexShrink: 0 }}>{config.icon}</span>
            <span style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</span>
        </div>
    );
}

