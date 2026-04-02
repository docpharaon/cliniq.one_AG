import React, { useEffect, useState } from 'react';
import { haptic } from '../hooks/useHaptics';

interface ConfirmDialogProps {
    visible: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({
    visible, title, message,
    confirmLabel = 'Confirm', cancelLabel = 'Cancel',
    destructive = false, onConfirm, onCancel,
}: ConfirmDialogProps) {
    const [show, setShow] = useState(false);
    const [animating, setAnimating] = useState(false);

    useEffect(() => {
        if (visible) {
            setShow(true);
            requestAnimationFrame(() => setAnimating(true));
            haptic.medium();
        } else {
            setAnimating(false);
            const t = setTimeout(() => setShow(false), 200);
            return () => clearTimeout(t);
        }
    }, [visible]);

    if (!show) return null;

    const handleConfirm = () => {
        if (destructive) haptic.heavy(); else haptic.success();
        onConfirm();
    };

    const handleCancel = () => {
        haptic.light();
        onCancel();
    };

    return (
        <div style={{ ...s.backdrop, opacity: animating ? 1 : 0 }} onClick={handleCancel}>
            <div
                style={{
                    ...s.dialog,
                    transform: animating ? 'scale(1)' : 'scale(0.9)',
                    opacity: animating ? 1 : 0,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h3 style={s.title}>{title}</h3>
                <p style={s.message}>{message}</p>
                <div style={s.actions}>
                    <button onClick={handleCancel} className="pressable" style={s.cancelBtn}>
                        {cancelLabel}
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="pressable"
                        style={{
                            ...s.confirmBtn,
                            backgroundColor: destructive ? '#DC2626' : '#1A8A9E',
                        }}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

const s: Record<string, React.CSSProperties> = {
    backdrop: {
        position: 'fixed', inset: 0, zIndex: 9998,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        padding: 24,
        transition: 'opacity 0.2s ease',
    },
    dialog: {
        width: '100%', maxWidth: 340,
        backgroundColor: 'var(--bg-card)',
        borderRadius: 20,
        padding: '28px 24px 20px',
        border: '1px solid var(--border)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease',
    },
    title: {
        fontSize: 18, fontWeight: 700, color: 'var(--text-primary)',
        margin: '0 0 8px', textAlign: 'center',
    },
    message: {
        fontSize: 14, color: 'var(--text-secondary)', lineHeight: '20px',
        margin: '0 0 24px', textAlign: 'center',
    },
    actions: {
        display: 'flex', gap: 10,
    },
    cancelBtn: {
        flex: 1, padding: '13px 16px', borderRadius: 14,
        border: '1px solid #475569', backgroundColor: 'transparent',
        color: 'var(--text-secondary)', fontSize: 15, fontWeight: 600,
    },
    confirmBtn: {
        flex: 1, padding: '13px 16px', borderRadius: 14,
        border: 'none', color: '#fff',
        fontSize: 15, fontWeight: 700,
    },
};
