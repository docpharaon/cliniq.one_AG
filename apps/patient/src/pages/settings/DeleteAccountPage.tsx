import { useNavigate } from 'react-router-dom';
import { supabase } from '@cliniqone/api';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../components/ToastProvider';
import { BackButton } from '../../components/BackButton';

export default function DeleteAccountPage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const toast = useToast(s => s.show);

    async function handleDelete() {
        const confirmed = window.confirm('Are you sure you want to delete your account? This action cannot be undone.');
        if (!confirmed) return;
        const doubleConfirm = window.confirm('This is your LAST CHANCE. All your data will be permanently deleted.');
        if (!doubleConfirm) return;

        try {
            await supabase.from('users').update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq('id', user?.id);
            await supabase.auth.signOut();
            toast('Account deleted. We\'re sorry to see you go.', 'info');
            navigate('/auth/landing', { replace: true });
        } catch (err: any) {
            toast(err?.message || 'Failed to delete account', 'error');
        }
    }

    return (
        <div className="slide-in-page" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
            <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 20px 48px' }}>
                <BackButton />
                <h1 style={{ fontSize: 22, fontWeight: 700, color: '#DC2626', margin: '20px 0 16px' }}>Delete Account</h1>
                <div style={{ backgroundColor: '#DC262615', borderRadius: 14, padding: 18, marginBottom: 20, border: '1px solid #DC262640' }}>
                    <p style={{ fontSize: 14, color: '#DC2626', margin: 0, lineHeight: '22px', fontWeight: 600 }}>Warning: This action is irreversible</p>
                    <ul style={{ color: '#FCA5A5', fontSize: 13, lineHeight: '22px', paddingLeft: 20, marginTop: 8, marginBottom: 0 }}>
                        <li>All your personal data will be deleted</li>
                        <li>Your consultation history will be removed</li>
                        <li>Any remaining tokens will be forfeited</li>
                        <li>You will not be able to recover your account</li>
                    </ul>
                </div>
                <button onClick={handleDelete}
                    style={{ width: '100%', padding: '16px', borderRadius: 14, border: 'none', backgroundColor: '#DC2626', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
                    Delete My Account Permanently
                </button>
            </div>
        </div>
    );
}
