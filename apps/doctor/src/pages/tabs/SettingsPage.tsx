import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@cliniqone/api';
import { haptic } from '../../hooks/useHaptics';
import { colors, typography, Settings as SettingsIcon, Bell, CreditCard, Smartphone, Info, BookOpen, Mail, FileText, Lock, LogOut } from '@cliniqone/ui';
import { useAuthStore } from '../../stores/authStore';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useToast } from '../../components/ToastProvider';
import type { CSSProperties } from 'react';

const NOTIFICATION_SETTINGS_KEY = 'doctor_notification_settings';

const DEFAULT_NOTIFICATIONS = {
    newConsultation: true,
    urgentCase: true,
    patientMessage: true,
    weeklySummary: true,
    marketing: false,
};

function SettingToggle({ label, hint, value, onToggle }: { label: string; hint: string; value: boolean; onToggle: (v: boolean) => void }) {
    return (
        <div style={s.toggleRow}>
            <div style={{ flex: 1, marginRight: 12 }}>
                <span style={{ fontSize: 14, color: colors.textPrimary, display: 'block' }}>{label}</span>
                <span style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2, display: 'block' }}>{hint}</span>
            </div>
            <input type="checkbox" checked={value} onChange={(e) => { haptic.select(); onToggle(e.target.checked); }} style={{ width: 44, height: 24, accentColor: colors.accentTeal }} />
        </div>
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
    const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);

    useEffect(() => {
        const stored = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
        if (stored) {
            try { setNotifications({ ...DEFAULT_NOTIFICATIONS, ...JSON.parse(stored) }); } catch {}
        }
    }, []);

    const updateNotification = useCallback((key: keyof typeof DEFAULT_NOTIFICATIONS, value: boolean) => {
        setNotifications((prev) => {
            const updated = { ...prev, [key]: value };
            localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(updated));
            return updated;
        });
    }, []);

    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    const toast = useToast((s) => s.show);
    const { doctor } = useAuthStore();

    const handleLogout = () => {
        setShowLogoutDialog(true);
    };

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

                {/* Notifications */}
                <div style={s.section}>
                    <span style={{ ...s.sectionTitle, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Bell size={16} color={colors.textPrimary} /> Notifications</span>
                    <div style={s.card}>
                        <SettingToggle label="New Consultation" hint="When a new case enters your queue" value={notifications.newConsultation} onToggle={(v) => updateNotification('newConsultation', v)} />
                        <SettingToggle label="Urgent Cases" hint="Immediate alerts for urgent cases" value={notifications.urgentCase} onToggle={(v) => updateNotification('urgentCase', v)} />
                        <SettingToggle label="Patient Messages" hint="When a patient follows up" value={notifications.patientMessage} onToggle={(v) => updateNotification('patientMessage', v)} />
                        <SettingToggle label="Weekly Summary" hint="Performance and earnings digest" value={notifications.weeklySummary} onToggle={(v) => updateNotification('weeklySummary', v)} />
                        <SettingToggle label="Marketing" hint="News and promotions" value={notifications.marketing} onToggle={(v) => updateNotification('marketing', v)} />
                    </div>
                </div>

                {/* Payment */}
                <div style={s.section}>
                    <span style={{ ...s.sectionTitle, display: 'inline-flex', alignItems: 'center', gap: 6 }}><CreditCard size={16} color={colors.textPrimary} /> Payment Information</span>
                    <div style={s.card}>
                        <InfoRow label="Bank / IBAN" value={(doctor as any)?.bank_iban ? `••••${((doctor as any).bank_iban as string).slice(-4)}` : 'Not configured'} />
                        <InfoRow label="Tax ID (VAT)" value={(doctor as any)?.tax_id || 'Not set'} />
                        <button style={s.editBtn} className="pressable" onClick={() => { haptic.medium(); toast('Payment settings coming soon.', 'info'); }}><span style={{ fontSize: 14, color: colors.accentTeal, fontWeight: 600 }}>Update Payment Info</span></button>
                    </div>
                </div>

                {/* App */}
                <div style={s.section}>
                    <span style={{ ...s.sectionTitle, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Smartphone size={16} color={colors.textPrimary} /> App</span>
                    <div style={s.card}>
                        <InfoRow label="Language" value="English" />
                        <InfoRow label="Version" value="1.2.0" />
                    </div>
                </div>

                {/* Support */}
                <div style={s.section}>
                    <span style={{ ...s.sectionTitle, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Info size={16} color={colors.textPrimary} /> Support</span>
                    <div style={s.card}>
                        {[
                            { Icon: BookOpen, text: 'Help Center', action: () => { toast('Help center coming soon.', 'info'); } },
                            { Icon: Mail, text: 'Contact Support', action: () => { window.open('mailto:support@cliniq.one?subject=Doctor%20App%20Support', '_blank'); } },
                            { Icon: FileText, text: 'Terms of Service', action: () => { window.open('https://cliniq.one/terms', '_blank'); } },
                            { Icon: Lock, text: 'Privacy Policy', action: () => { window.open('https://cliniq.one/privacy', '_blank'); } },
                        ].map((item) => (
                            <button key={item.text} style={s.linkRow} className="pressable" onClick={() => { haptic.light(); item.action(); }}><span style={{ fontSize: 14, color: colors.textPrimary, display: 'inline-flex', alignItems: 'center', gap: 8 }}><item.Icon size={16} color={colors.textSecondary} /> {item.text}</span></button>
                        ))}
                    </div>
                </div>

                {/* Sign Out */}
                <button style={s.logoutBtn} className="pressable" onClick={() => { haptic.warning(); handleLogout(); }}>
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
    sectionTitle: { display: 'block', fontSize: typography.h3.fontSize, fontWeight: 600, color: colors.textPrimary, marginBottom: 12 },
    card: { backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 16, border: `1px solid ${colors.border}` },
    toggleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBlock: 10, borderBottom: `1px solid ${colors.border}` },
    infoRow: { display: 'flex', justifyContent: 'space-between', paddingBlock: 12, borderBottom: `1px solid ${colors.border}` },
    editBtn: { marginTop: 12, width: '100%', backgroundColor: colors.accentTealFaded, borderRadius: 12, paddingBlock: 12 },
    linkRow: { display: 'block', width: '100%', paddingBlock: 14, borderBottom: `1px solid ${colors.border}`, textAlign: 'left' as any },
    logoutBtn: { width: '100%', backgroundColor: colors.errorFaded, borderRadius: 16, paddingBlock: 16, marginTop: 8 },
};
