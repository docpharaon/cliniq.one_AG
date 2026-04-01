import { useState } from 'react';
import { t } from '@cliniqone/i18n';
import { useToast } from '../../components/ToastProvider';
import { BackButton } from '../../components/BackButton';
import { Bell } from '@cliniqone/ui';

export default function NotificationSettingsPage() {
    const toast = useToast(s => s.show);
    const [settings, setSettings] = useState({
        consultationUpdates: true,
        reportReady: true,
        doctorMessages: true,
        promotions: false,
        reminders: true,
    });

    function toggle(key: keyof typeof settings) {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
        toast('Setting updated', 'success');
    }

    return (
        <div className="slide-in-page" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
            <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 20px 48px' }}>
                <BackButton />
                <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '20px 0 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Bell size={22} color="#2DD4BF" />
                    {t('settings.notifications')}
                </h1>
                {[
                    { key: 'consultationUpdates' as const, label: t('settings.consultationUpdates'), desc: t('settings.consultationUpdatesDesc') },
                    { key: 'reportReady' as const, label: t('settings.reportReady'), desc: t('settings.reportReadyDesc') },
                    { key: 'doctorMessages' as const, label: t('notifications.doctorReply'), desc: t('notifications.pushPermissionDesc') },
                    { key: 'reminders' as const, label: t('settings.tokenPurchases'), desc: t('settings.tokenPurchasesDesc') },
                    { key: 'promotions' as const, label: t('settings.promotions'), desc: t('settings.promotionsDesc') },
                ].map(item => (
                    <div key={item.key} onClick={() => toggle(item.key)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 12, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', marginBottom: 8, cursor: 'pointer' }}>
                        <div>
                            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{item.label}</p>
                            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>{item.desc}</p>
                        </div>
                        <div style={{ width: 44, height: 24, borderRadius: 12, backgroundColor: settings[item.key] ? '#1A8A9E' : '#334155', position: 'relative', transition: 'background-color 0.2s' }}>
                            <div style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', position: 'absolute', top: 2, left: settings[item.key] ? 22 : 2, transition: 'left 0.2s' }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
