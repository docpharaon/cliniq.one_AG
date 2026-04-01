import React, { useState } from 'react';
import { supabase } from '@cliniqone/api';
import { useToast } from './ToastProvider';
import { t } from '@cliniqone/i18n';

interface PatientRefundModalProps {
    visible: boolean;
    onClose: () => void;
    consultationId: string;
    consultationFee: number;
}

export function PatientRefundModal({ visible, onClose, consultationId, consultationFee }: PatientRefundModalProps) {
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const toast = useToast((s) => s.show);

    if (!visible) return null;

    async function handleSubmit() {
        if (!reason.trim()) {
            toast('Please provide a reason for the refund request.', 'warning');
            return;
        }

        setSubmitting(true);
        try {
            const { error } = await supabase.from('refund_requests').insert({
                consultation_id: consultationId,
                requested_by: 'patient',
                reason: reason.trim(),
                token_amount: consultationFee,
                status: 'pending',
            });

            if (error) throw error;

            toast('Refund request submitted successfully.', 'success');
            setReason('');
            onClose();
        } catch (err: any) {
            toast(err?.message || 'Failed to submit refund request.', 'error');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div style={styles.handle} />

                <h2 style={styles.title}>Request Refund</h2>
                <p style={styles.subtitle}>
                    You're requesting a refund of <strong style={{ color: '#1A8A9E' }}>{consultationFee}</strong> tokens for this consultation.
                </p>

                <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                        Reason for refund
                    </label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Please explain why you're requesting a refund..."
                        style={{
                            width: '100%', minHeight: 100, padding: '12px',
                            borderRadius: 10, border: '1px solid var(--border)',
                            backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)',
                            fontSize: 14, resize: 'vertical', boxSizing: 'border-box',
                        }}
                    />
                </div>

                <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 10, padding: 12, marginBottom: 20 }}>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: '18px', margin: 0 }}>
                        ℹ️ Your request will be reviewed by our admin team. If approved, tokens will be returned to your wallet within 24 hours.
                    </p>
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={submitting || !reason.trim()}
                    style={{
                        width: '100%', padding: '14px', borderRadius: 14, border: 'none',
                        backgroundColor: reason.trim() ? '#DC2626' : '#334155',
                        color: '#fff', fontSize: 16, fontWeight: 700,
                        cursor: reason.trim() ? 'pointer' : 'not-allowed',
                        opacity: submitting ? 0.7 : 1,
                    }}
                >
                    {submitting ? 'Submitting...' : 'Submit Refund Request'}
                </button>

                <button onClick={onClose} style={styles.cancelButton}>
                    Cancel
                </button>
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    overlay: {
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000,
    },
    modal: {
        backgroundColor: 'var(--bg-primary)', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: '12px 20px 32px', width: '100%', maxWidth: 500,
    },
    handle: {
        width: 40, height: 4, borderRadius: 2, backgroundColor: 'var(--text-tertiary)',
        margin: '0 auto 20px',
    },
    title: { fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center', margin: 0 },
    subtitle: { fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', marginTop: 6, marginBottom: 20 },
    cancelButton: {
        background: 'none', border: 'none', color: 'var(--text-tertiary)',
        fontSize: 15, cursor: 'pointer', display: 'block',
        margin: '16px auto 0', padding: 8,
    },
};
