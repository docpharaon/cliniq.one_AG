import { useState } from 'react';
import { supabase } from '@cliniqone/api';
import { colors, typography, AlertTriangle, Trash } from '@cliniqone/ui';
import { useAuthStore } from '../../stores/authStore';
import { haptic } from '../../hooks/useHaptics';
import { BackButton } from '../../components/BackButton';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import type { CSSProperties } from 'react';

export function DeleteAccountPage() {
    const { session, signOut } = useAuthStore();
    const [showConfirm, setShowConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState('');
    const [confirmText, setConfirmText] = useState('');

    const handleDelete = async () => {
        if (confirmText.toLowerCase() !== 'delete') return;

        setDeleting(true);
        setError('');
        haptic.heavy();

        try {
            // Call the delete-account edge function
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            const token = currentSession?.access_token;
            if (!token) throw new Error('No session');

            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({ user_id: session?.user?.id }),
                },
            );

            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || 'Account deletion failed');
            }

            // Sign out and redirect
            await signOut();
            window.location.href = '/auth/landing';
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
            setDeleting(false);
        }
    };

    return (
        <div style={s.container} className="slide-in-page">
            <div style={s.header}>
                <BackButton />
                <span style={s.title}>Delete Account</span>
            </div>

            <div style={s.content}>
                <div style={s.warningBox}>
                    <AlertTriangle size={28} color={colors.error} />
                    <div style={{ flex: 1 }}>
                        <span style={s.warningTitle}>This action is permanent</span>
                        <span style={s.warningText}>
                            Deleting your account will permanently remove all your data including
                            consultations, reports, earnings, and documents. This cannot be undone.
                        </span>
                    </div>
                </div>

                <div style={s.consequences}>
                    <span style={s.consTitle}>What will be deleted:</span>
                    {[
                        'Doctor profile and credentials',
                        'All consultation history',
                        'Earnings and payment data',
                        'Uploaded documents and certificates',
                        'Notification history',
                        'Push notification tokens',
                    ].map((item, i) => (
                        <div key={i} style={s.consItem}>
                            <span style={{ color: colors.error, fontWeight: 700 }}>•</span>
                            <span style={{ fontSize: 13, color: colors.textSecondary }}>{item}</span>
                        </div>
                    ))}
                </div>

                {/* Confirmation input */}
                <div style={{ width: '100%', maxWidth: 400, marginTop: 28 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: colors.textSecondary, marginBottom: 8, display: 'block' }}>
                        Type <strong style={{ color: colors.error }}>DELETE</strong> to confirm
                    </label>
                    <input
                        id="delete-confirm-input"
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="Type DELETE"
                        style={s.input}
                        autoComplete="off"
                    />
                </div>

                {error && (
                    <div style={{ marginTop: 16, padding: '10px 16px', borderRadius: 10, backgroundColor: colors.errorFaded, width: '100%', maxWidth: 400 }}>
                        <span style={{ fontSize: 13, color: colors.error }}>{error}</span>
                    </div>
                )}

                <button
                    id="confirm-delete-btn"
                    onClick={() => setShowConfirm(true)}
                    disabled={confirmText.toLowerCase() !== 'delete' || deleting}
                    style={{
                        ...s.deleteBtn,
                        opacity: confirmText.toLowerCase() !== 'delete' || deleting ? 0.4 : 1,
                    }}
                >
                    {deleting ? (
                        <span className="spinner" style={{ width: 20, height: 20, borderTopColor: '#fff' }} />
                    ) : (
                        <>
                            <Trash size={18} color="#fff" />
                            <span>Delete My Account</span>
                        </>
                    )}
                </button>
            </div>

            {showConfirm && (
                <ConfirmDialog
                    visible={showConfirm}
                    title="Final Confirmation"
                    message="Are you absolutely sure? This will permanently delete your account and all associated data."
                    confirmLabel="Yes, Delete Everything"
                    cancelLabel="Cancel"
                    destructive
                    onConfirm={() => { setShowConfirm(false); handleDelete(); }}
                    onCancel={() => setShowConfirm(false)}
                />
            )}
        </div>
    );
}

const s: Record<string, CSSProperties> = {
    container: { display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: colors.bgPrimary },
    header: { display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: `1px solid ${colors.border}` },
    title: { fontSize: typography.h3.fontSize, fontWeight: 700, color: colors.textPrimary },
    content: { padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto', flex: 1 },
    warningBox: {
        display: 'flex', gap: 14, alignItems: 'flex-start',
        padding: 20, borderRadius: 14,
        backgroundColor: colors.errorFaded,
        border: `1px solid ${colors.error}22`,
        width: '100%', maxWidth: 400,
    },
    warningTitle: { fontSize: 15, fontWeight: 700, color: colors.error, display: 'block', marginBottom: 4 },
    warningText: { fontSize: 13, color: colors.textSecondary, lineHeight: '20px' },
    consequences: { width: '100%', maxWidth: 400, marginTop: 24 },
    consTitle: { fontSize: 14, fontWeight: 700, color: colors.textPrimary, marginBottom: 12, display: 'block' },
    consItem: { display: 'flex', alignItems: 'center', gap: 8, paddingBlock: 4 },
    input: {
        width: '100%', padding: '12px 16px', borderRadius: 10,
        border: `1px solid ${colors.border}`,
        backgroundColor: colors.bgSecondary,
        color: colors.textPrimary,
        fontSize: 15, fontWeight: 500,
    },
    deleteBtn: {
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        width: '100%', maxWidth: 400,
        padding: '14px 24px', borderRadius: 14,
        border: 'none',
        backgroundColor: colors.error,
        color: '#fff', fontSize: 15, fontWeight: 700,
        cursor: 'pointer', marginTop: 20,
        transition: 'opacity 0.2s',
    },
};
