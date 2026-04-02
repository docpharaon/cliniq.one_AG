import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@cliniqone/api';
import { t, setLocale, useLocale, toLocalNum } from '@cliniqone/i18n';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../components/ToastProvider';
import { FadeIn } from '../../components/FadeIn';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { haptic } from '../../hooks/useHaptics';
import { User, Bell, Lock, Globe, Info, FileText, Hospital, Coins, Stethoscope, ChevronRight, Moon, Shield, CheckCircle } from '@cliniqone/ui';
import type { CliniqIconProps } from '@cliniqone/ui';

export default function ProfilePage() {
    const navigate = useNavigate();
    const { user, signOut } = useAuthStore();
    const toast = useToast((s) => s.show);
    const [signingOut, setSigningOut] = useState(false);
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
    const lang = useLocale();

    async function handleSignOut() {
        setShowLogoutDialog(false);
        setSigningOut(true);
        try {
            await signOut();
            haptic.success();
            navigate('/auth/landing', { replace: true });
        } catch {
            haptic.error();
            toast(t('settings.signOutFailed'), 'error');
        } finally {
            setSigningOut(false);
        }
    }

    async function handleLanguageChange() {
        haptic.select();
        const next = lang === 'en' ? 'ar' : 'en';
        await setLocale(next);
    }

    async function handleDeleteAccount() {
        setShowDeleteConfirmDialog(false);
        try {
            await supabase.from('users').update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq('id', user?.id);
            await supabase.auth.signOut();
            haptic.success();
            toast(t('deleteAccount.deleted'), 'info');
            navigate('/auth/landing', { replace: true });
        } catch (err: any) {
            haptic.error();
            toast(err?.message || t('deleteAccount.deleteFailed'), 'error');
        }
    }

    const menuItems: { Icon: React.FC<CliniqIconProps>; label: string; route?: string; action?: () => void; badge?: React.ReactNode }[] = [
        { Icon: User, label: t('settings.editProfile'), route: '/settings/edit-profile' },
        { Icon: Shield, label: t('settings.identityVerification'), route: '/settings/verify-identity',
            badge: user?.kyc_status === 'approved' || user?.kyc_status === 'exempt'
                ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 600, color: '#10B981', backgroundColor: 'rgba(16,185,129,0.08)', padding: '2px 8px', borderRadius: 20 }}><CheckCircle size={10} color="#10B981" />{t('kyc.statusApproved')}</span>
                : user?.kyc_status === 'pending'
                    ? <span style={{ fontSize: 10, fontWeight: 600, color: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.08)', padding: '2px 8px', borderRadius: 20 }}>{t('kyc.statusPending')}</span>
                    : undefined
        },
        { Icon: Bell, label: t('settings.notifications'), route: '/settings/notifications' },
        { Icon: Moon, label: t('settings.appearanceTitle'), route: '/settings/appearance' },
        { Icon: Lock, label: t('settings.security'), route: '/settings/security' },
        { Icon: Globe, label: `${t('settings.language')} (${lang === 'ar' ? 'العربية' : 'English'})`, action: handleLanguageChange },
        { Icon: Info, label: t('settings.helpSupport'), route: '/settings/help' },
        { Icon: FileText, label: t('auth.termsOfService'), route: '/auth/legal' },
        { Icon: Hospital, label: t('settings.about'), route: '/settings/about' },
    ];

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
            <div className="page-fade" style={{ maxWidth: 500, margin: '0 auto', padding: '24px 20px 48px', overflowY: 'auto', height: '100%' }}>
                {/* Profile Header */}
                <FadeIn>
                    <div style={{ textAlign: 'center', marginBottom: 28 }}>
                        <div style={{
                            width: 80, height: 80, borderRadius: 40,
                            background: 'linear-gradient(135deg, #1A8A9E, #0F766E)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 32, fontWeight: 800, color: '#fff',
                            margin: '0 auto 12px',
                        }}>
                            {(user?.nickname || 'U').charAt(0).toUpperCase()}
                        </div>
                        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>
                            {user?.nickname || 'Patient'}
                        </h1>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{user?.email}</p>
                        {user?.phone && <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '4px 0 0' }}>{user.phone}</p>}
                    </div>
                </FadeIn>

                {/* Quick Stats */}
                <FadeIn delay={100}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                        {[
                            { Icon: Coins, value: user?.tokens_balance ?? 0, label: t('tokens.tokensLabel') },
                            { Icon: Stethoscope, value: user?.total_consultations ?? 0, label: t('profile.totalConsultations') },
                        ].map((stat, i) => (
                            <div key={i} style={{
                                flex: 1, textAlign: 'center', backgroundColor: 'var(--bg-card)',
                                borderRadius: 14, padding: 16, border: '1px solid var(--border)',
                            }}>
                                <stat.Icon size={20} color="#2DD4BF" />
                                <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0 2px' }}>{toLocalNum(stat.value)}</p>
                                <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </FadeIn>

                {/* Menu */}
                <FadeIn delay={200}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {menuItems.map((item, i) => (
                            <button key={i}
                                onClick={() => {
                                    haptic.light();
                                    item.action ? item.action() : item.route && navigate(item.route);
                                }}
                                className="pressable"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 14,
                                    width: '100%', padding: '14px 16px', borderRadius: 12,
                                    backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)',
                                    textAlign: 'left',
                                }}>
                                <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2DD4BF15' }}>
                                    <item.Icon size={18} color="#2DD4BF" />
                                </div>
                                <span style={{ flex: 1, fontSize: 14, color: 'var(--text-primary)' }}>{item.label}</span>
                                {item.badge && <span>{item.badge}</span>}
                                <ChevronRight size={14} color="#2DD4BF" />
                            </button>
                        ))}
                    </div>
                </FadeIn>

                {/* Actions */}
                <FadeIn delay={300}>
                    <div style={{ marginTop: 28 }}>
                        <button
                            onClick={() => { haptic.warning(); setShowLogoutDialog(true); }}
                            disabled={signingOut}
                            className="pressable"
                            style={{
                                width: '100%', padding: '14px', borderRadius: 14, border: '1px solid #DC2626',
                                backgroundColor: 'transparent', color: '#DC2626', fontSize: 15,
                                fontWeight: 700, marginBottom: 10,
                                opacity: signingOut ? 0.6 : 1,
                            }}>
                            {signingOut ? t('settings.signingOut') : t('settings.logout')}
                        </button>

                        <button
                            onClick={() => { haptic.heavy(); setShowDeleteDialog(true); }}
                            className="pressable"
                            style={{
                                width: '100%', padding: '12px', borderRadius: 14, border: 'none',
                                backgroundColor: '#DC262620', color: '#DC2626', fontSize: 13,
                            }}>
                            {t('settings.deleteAccount')}
                        </button>
                    </div>
                </FadeIn>

                {/* App version */}
                <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 24 }}>
                    cliniq.one Patient v2.0 (Vite Build)
                </p>
            </div>

            {/* Confirm Dialogs (replace window.confirm) */}
            <ConfirmDialog
                visible={showLogoutDialog}
                title={t('settings.logout')}
                message={t('settings.confirmLogout')}
                confirmLabel={t('settings.logout')}
                cancelLabel={t('common.cancel') || 'Cancel'}
                destructive
                onConfirm={handleSignOut}
                onCancel={() => setShowLogoutDialog(false)}
            />

            <ConfirmDialog
                visible={showDeleteDialog}
                title={t('settings.deleteAccount')}
                message={t('settings.deleteConfirmMessage')}
                confirmLabel={t('settings.deleteConfirmTitle')}
                cancelLabel={t('common.cancel')}
                destructive
                onConfirm={() => { setShowDeleteDialog(false); setShowDeleteConfirmDialog(true); }}
                onCancel={() => setShowDeleteDialog(false)}
            />

            <ConfirmDialog
                visible={showDeleteConfirmDialog}
                title={t('settings.deleteFinalTitle')}
                message={t('settings.deleteFinalMessage')}
                confirmLabel={t('settings.deleteForever')}
                cancelLabel={t('common.cancel')}
                destructive
                onConfirm={handleDeleteAccount}
                onCancel={() => setShowDeleteConfirmDialog(false)}
            />
        </div>
    );
}
