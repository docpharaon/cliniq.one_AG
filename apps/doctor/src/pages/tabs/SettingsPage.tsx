import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@cliniqone/api';
import { haptic } from '../../hooks/useHaptics';
import { colors, typography, Settings as SettingsIcon, Bell, Globe, Trash, Info, CreditCard, BookOpen, Mail, FileText, Lock, LogOut, ChevronRight } from '@cliniqone/ui';
import { useAuthStore } from '../../stores/authStore';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useToast } from '../../components/ToastProvider';
import type { CSSProperties, ReactNode } from 'react';
import type { CliniqIconProps } from '@cliniqone/ui';

function SettingsLink({ Icon, label, hint, route, color, onTap }: {
    Icon: (p: CliniqIconProps) => ReactNode;
    label: string;
    hint?: string;
    route?: string;
    color?: string;
    onTap?: () => void;
}) {
    const navigate = useNavigate();
    return (
        <button
            className="pressable"
            onClick={() => {
                haptic.light();
                if (onTap) onTap();
                else if (route) navigate(route);
            }}
            style={s.linkRow}
        >
            <div style={{ ...s.linkIcon, backgroundColor: `${color || colors.accentTeal}12` }}>
                <Icon size={18} color={color || colors.accentTeal} />
            </div>
            <div style={{ flex: 1 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary, display: 'block' }}>{label}</span>
                {hint && <span style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2, display: 'block' }}>{hint}</span>}
            </div>
            <ChevronRight size={16} color={colors.textTertiary} />
        </button>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div style={s.infoRow}>
            <span style={{ fontSize: 11, color: colors.textTertiary }}>{label}</span>
            <span style={{ fontSize: 14, color: colors.textPrimary }}>{value}</span>
        </div>
    );
}

export function SettingsPage() {
    const navigate = useNavigate();
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    const toast = useToast((s) => s.show);
    const { doctor } = useAuthStore();

    const confirmLogout = () => {
        setShowLogoutDialog(false);
        supabase.auth.signOut().then(() => {
            useAuthStore.getState().clear();
            navigate('/auth/login', { replace: true });
        });
    };

    return (
        <>
        <div style={s.container} className="scrollable">
            <div style={s.scroll}>
                <span style={{ ...s.title, display: 'inline-flex', alignItems: 'center', gap: 8 }}><SettingsIcon size={22} color={colors.textPrimary} /> Settings</span>

                {/* General */}
                <div style={s.section}>
                    <span style={s.sectionTitle}>General</span>
                    <div style={s.card}>
                        <SettingsLink Icon={Globe} label="Language" hint="Choose app language" route="/settings/language" />
                        <SettingsLink Icon={Bell} label="Notifications" hint="Manage notification preferences" route="/settings/notifications" color={colors.warning} />
                    </div>
                </div>

                {/* Payment */}
                <div style={s.section}>
                    <span style={s.sectionTitle}>Payment</span>
                    <div style={s.card}>
                        <InfoRow label="Bank / IBAN" value={(doctor as any)?.bank_iban ? `••••${((doctor as any).bank_iban as string).slice(-4)}` : 'Not configured'} />
                        <InfoRow label="Tax ID (VAT)" value={(doctor as any)?.tax_id || 'Not set'} />
                        <button style={s.editBtn} className="pressable" onClick={() => { haptic.medium(); toast('Payment settings coming soon.', 'info'); }}>
                            <CreditCard size={16} color={colors.accentTeal} />
                            <span style={{ fontSize: 14, color: colors.accentTeal, fontWeight: 600 }}>Update Payment Info</span>
                        </button>
                    </div>
                </div>

                {/* Support */}
                <div style={s.section}>
                    <span style={s.sectionTitle}>Support & Legal</span>
                    <div style={s.card}>
                        <SettingsLink Icon={BookOpen} label="Help Center" onTap={() => toast('Help center coming soon.', 'info')} color={colors.accentBlue} />
                        <SettingsLink Icon={Mail} label="Contact Support" onTap={() => window.open('mailto:support@cliniq.one?subject=Doctor%20App%20Support', '_blank')} color={colors.success} />
                        <SettingsLink Icon={FileText} label="Terms of Service" onTap={() => window.open('https://cliniq.one/terms', '_blank')} color={colors.textSecondary} />
                        <SettingsLink Icon={Lock} label="Privacy Policy" onTap={() => window.open('https://cliniq.one/privacy', '_blank')} color={colors.textSecondary} />
                        <SettingsLink Icon={Info} label="About" hint="App info and version" route="/settings/about" color={colors.textTertiary} />
                    </div>
                </div>

                {/* Danger Zone */}
                <div style={s.section}>
                    <span style={s.sectionTitle}>Account</span>
                    <div style={s.card}>
                        <SettingsLink Icon={Trash} label="Delete Account" hint="Permanently delete your account" route="/settings/delete-account" color={colors.error} />
                    </div>
                </div>

                {/* Sign Out */}
                <button style={s.logoutBtn} className="pressable" onClick={() => { haptic.warning(); setShowLogoutDialog(true); }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: colors.error, display: 'inline-flex', alignItems: 'center', gap: 6 }}><LogOut size={16} color={colors.error} /> Sign Out</span>
                </button>
            </div>
        </div>

        <ConfirmDialog
            visible={showLogoutDialog}
            title="Sign Out"
            message="Are you sure you want to sign out? You'll need to log in again to access your dashboard."
            confirmLabel="Sign Out"
            cancelLabel="Cancel"
            destructive
            onConfirm={confirmLogout}
            onCancel={() => setShowLogoutDialog(false)}
        />
        </>
    );
}

const s: Record<string, CSSProperties> = {
    container: { flex: 1, height: '100%', backgroundColor: colors.bgPrimary },
    scroll: { padding: 20, paddingBottom: 40 },
    title: { display: 'block', fontSize: typography.h2.fontSize, fontWeight: 700, color: colors.textPrimary, marginBottom: 20 },
    section: { marginBottom: 24 },
    sectionTitle: { display: 'block', fontSize: 12, fontWeight: 700, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, paddingLeft: 4 },
    card: { backgroundColor: colors.bgSecondary, borderRadius: 16, overflow: 'hidden', border: `1px solid ${colors.border}` },
    linkRow: {
        display: 'flex', alignItems: 'center', gap: 14,
        width: '100%', padding: '14px 16px',
        borderBottom: `1px solid ${colors.border}`,
        textAlign: 'left' as any,
        background: 'none', border: 'none', cursor: 'pointer',
    },
    linkIcon: {
        width: 36, height: 36, borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
    },
    infoRow: { display: 'flex', justifyContent: 'space-between', paddingBlock: 12, paddingInline: 16, borderBottom: `1px solid ${colors.border}` },
    editBtn: {
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        width: '100%', backgroundColor: colors.accentTealFaded, paddingBlock: 12,
        border: 'none', cursor: 'pointer',
    },
    logoutBtn: { width: '100%', backgroundColor: colors.errorFaded, borderRadius: 16, paddingBlock: 16, marginTop: 8, border: 'none', cursor: 'pointer' },
};
