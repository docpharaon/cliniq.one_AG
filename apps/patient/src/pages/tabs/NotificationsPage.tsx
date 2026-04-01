import { useState } from 'react';
import { t, localDate } from '@cliniqone/i18n';
import { usePatientNotifications, PatientNotification } from '../../hooks/usePatientNotifications';
import { useNavigate } from 'react-router-dom';
import { FadeIn } from '../../components/FadeIn';
import { NotificationsSkeleton } from '../../components/Skeleton';
import { PullToRefresh } from '../../components/PullToRefresh';
import { Bell, Doctor, ClipboardList, MessageSquare, Info, Refresh } from '@cliniqone/ui';

const TYPE_ICONS: Record<string, React.FC<{ size?: number; color?: string }>> = {
    assigned: Doctor, report_ready: ClipboardList, message: MessageSquare, system: Bell, info: Info,
};

export default function NotificationsPage() {
    const navigate = useNavigate();
    const { notifications, unreadCount, loading, markAsRead, markAllAsRead, refresh } = usePatientNotifications();

    function handleTap(notif: PatientNotification) {
        if (!notif.read) markAsRead(notif.id);
        if (notif.consultation_id) {
            navigate(`/consultation/${notif.consultation_id}`);
        }
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
            <PullToRefresh onRefresh={refresh}>
            <div style={{ maxWidth: 500, margin: '0 auto', padding: '24px 20px 48px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <FadeIn>
                        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                            {t('notifications.title')}
                            {unreadCount > 0 && (
                                <span style={{ fontSize: 14, fontWeight: 600, color: '#1A8A9E', marginLeft: 8 }}>
                                    ({unreadCount})
                                </span>
                            )}
                        </h1>
                    </FadeIn>
                    {unreadCount > 0 && (
                        <button onClick={markAllAsRead} style={{
                            background: 'none', border: 'none', color: '#1A8A9E',
                            fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        }}>
                            {t('notifications.markAllRead')}
                        </button>
                    )}
                </div>

                {loading ? (
                    <NotificationsSkeleton />
                ) : notifications.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 16px', backgroundColor: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                            <Bell size={48} color="#2DD4BF" />
                        </div>
                        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 4px' }}>{t('notifications.empty')}</p>
                        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0 }}>{t('notifications.emptyDesc')}</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {notifications.map((notif) => {
                            const IconComponent = TYPE_ICONS[notif.type] || Bell;
                            return (
                                <div key={notif.id} onClick={() => handleTap(notif)} style={{
                                    display: 'flex', alignItems: 'flex-start', gap: 12,
                                    backgroundColor: notif.read ? 'var(--bg-card)' : 'var(--bg-card)',
                                    borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
                                    border: `1px solid ${notif.read ? '#334155' : '#1A8A9E40'}`,
                                    opacity: notif.read ? 0.7 : 1,
                                }}>
                                    <div style={{
                                        width: 36, height: 36, borderRadius: 18,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        backgroundColor: '#2DD4BF20',
                                        flexShrink: 0,
                                    }}>
                                        <IconComponent size={16} color="#2DD4BF" />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <p style={{ fontSize: 14, fontWeight: notif.read ? 400 : 700, color: 'var(--text-primary)', margin: 0 }}>
                                                {notif.title}
                                            </p>
                                            {!notif.read && <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#1A8A9E', flexShrink: 0 }} />}
                                        </div>
                                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0', lineHeight: '18px' }}>
                                            {notif.message}
                                        </p>
                                        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '6px 0 0' }}>
                                            {localDate(notif.created_at)}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

            </div>
            </PullToRefresh>
        </div>
    );
}
