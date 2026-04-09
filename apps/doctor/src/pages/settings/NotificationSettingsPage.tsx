import { useState, useEffect } from 'react';
import { supabase } from '@cliniqone/api';
import { colors, typography, Bell, ClipboardList, Siren, MessageSquare, Info } from '@cliniqone/ui';
import { useAuthStore } from '../../stores/authStore';
import { haptic } from '../../hooks/useHaptics';
import { BackButton } from '../../components/BackButton';
import { useToast } from '../../components/ToastProvider';
import type { CSSProperties } from 'react';

interface NotifPrefs {
    consultation_assigned: boolean;
    urgent_cases: boolean;
    report_ready: boolean;
    messages: boolean;
    system_alerts: boolean;
}

const DEFAULT_PREFS: NotifPrefs = {
    consultation_assigned: true,
    urgent_cases: true,
    report_ready: true,
    messages: true,
    system_alerts: true,
};

export function NotificationSettingsPage() {
    const { session } = useAuthStore();
    const { show } = useToast();
    const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
    const [saving, setSaving] = useState(false);

    // Load existing prefs
    useEffect(() => {
        if (!session?.user?.id) return;
        (async () => {
            try {
                const { data } = await supabase
                    .from('user_preferences')
                    .select('notification_prefs')
                    .eq('user_id', session.user.id)
                    .single();
                if (data?.notification_prefs) {
                    setPrefs({ ...DEFAULT_PREFS, ...data.notification_prefs });
                }
            } catch { /* use defaults */ }
        })();
    }, [session?.user?.id]);

    const togglePref = async (key: keyof NotifPrefs) => {
        haptic.light();
        const updated = { ...prefs, [key]: !prefs[key] };
        setPrefs(updated);

        // Persist
        setSaving(true);
        try {
            await supabase
                .from('user_preferences')
                .upsert(
                    { user_id: session!.user.id, notification_prefs: updated, updated_at: new Date().toISOString() },
                    { onConflict: 'user_id' },
                );
            show('Preferences saved', 'success');
        } catch {
            show('Failed to save', 'error');
        } finally {
            setSaving(false);
        }
    };

    const TOGGLES: { key: keyof NotifPrefs; label: string; desc: string; Icon: any; color: string }[] = [
        { key: 'consultation_assigned', label: 'New Consultations', desc: 'When a consultation is assigned to you', Icon: ClipboardList, color: colors.accentTeal },
        { key: 'urgent_cases', label: 'Urgent Cases', desc: 'Priority alerts for urgent consultations', Icon: Siren, color: colors.error },
        { key: 'report_ready', label: 'Reports Ready', desc: 'When AI report is ready for review', Icon: Info, color: colors.accentBlue },
        { key: 'messages', label: 'Messages', desc: 'Patient follow-up messages', Icon: MessageSquare, color: colors.success },
        { key: 'system_alerts', label: 'System Alerts', desc: 'Credential expiry, maintenance, updates', Icon: Bell, color: colors.warning },
    ];

    return (
        <div style={s.container} className="slide-in-page">
            <div style={s.header}>
                <BackButton />
                <span style={s.title}>Notification Settings</span>
            </div>

            <div style={s.content} className="scrollable">
                {TOGGLES.map(({ key, label, desc, Icon, color }) => (
                    <div key={key} style={s.toggleCard} className="pressable">
                        <div style={{ ...s.toggleIcon, backgroundColor: `${color}15` }}>
                            <Icon size={18} color={color} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <span style={s.toggleLabel}>{label}</span>
                            <span style={s.toggleDesc}>{desc}</span>
                        </div>
                        <button
                            onClick={() => togglePref(key)}
                            style={{
                                ...s.switch,
                                backgroundColor: prefs[key] ? colors.accentTeal : colors.bgTertiary,
                            }}
                        >
                            <div style={{
                                ...s.switchKnob,
                                transform: prefs[key] ? 'translateX(18px)' : 'translateX(2px)',
                            }} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

const s: Record<string, CSSProperties> = {
    container: { display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: colors.bgPrimary },
    header: { display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: `1px solid ${colors.border}` },
    title: { fontSize: typography.h3.fontSize, fontWeight: 700, color: colors.textPrimary },
    content: { flex: 1, padding: '16px 20px', overflowY: 'auto' },
    toggleCard: {
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '16px 0',
        borderBottom: `1px solid ${colors.border}`,
    },
    toggleIcon: {
        width: 38, height: 38, borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
    },
    toggleLabel: { fontSize: 14, fontWeight: 600, color: colors.textPrimary, display: 'block' },
    toggleDesc: { fontSize: 12, color: colors.textTertiary, marginTop: 2 },
    switch: {
        width: 44, height: 26, borderRadius: 13,
        border: 'none', cursor: 'pointer',
        position: 'relative',
        transition: 'background-color 0.2s',
        flexShrink: 0,
    },
    switchKnob: {
        width: 22, height: 22, borderRadius: 11,
        backgroundColor: '#fff',
        position: 'absolute', top: 2,
        transition: 'transform 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    },
};
