import { useI18n } from '@cliniqone/i18n';
import type { CSSProperties, ReactNode } from 'react';

function NotifIcon({ type }: { type: DoctorNotification['type'] }) {
    const iconSize = 18;
    switch (type) {
        case 'assigned': return <ClipboardList size={iconSize} color={colors.accentTeal} />;
        case 'report_ready': return <CheckCircle size={iconSize} color={colors.success} />;
        case 'message': return <MessageSquare size={iconSize} color={colors.accentBlue} />;
        case 'system': return <Siren size={iconSize} color={colors.warning} />;
        case 'info':
        default: return <Info size={iconSize} color={colors.textTertiary} />;
    }
}

function timeAgo(dateStr: string, t: any): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('doctor.notifications.justNow');
    if (mins < 60) return t('doctor.notifications.mAgo', { count: mins });
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return t('doctor.notifications.hAgo', { count: hrs });
    const days = Math.floor(hrs / 24);
    return t('doctor.notifications.dAgo', { count: days });
}

export function NotificationsPage() {
    const navigate = useNavigate();
    const { t, isRTL } = useI18n();
    const { notifications, unreadCount, loading, markAsRead, markAllAsRead, refresh } = useDoctorNotifications();

    const handleTap = useCallback((notif: DoctorNotification) => {
        haptic.light();
        markAsRead(notif.id);
        if (notif.data?.consultation_id) {
            navigate(`/consultation/${notif.data.consultation_id}`);
        }
    }, [navigate, markAsRead]);

    return (
        <div style={s.container} className="slide-in-page">
            {/* Header */}
            <div style={{ ...s.header, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                <BackButton />
                <span style={{ ...s.title, textAlign: isRTL ? 'right' : 'left' }}>{t('doctor.notifications.title')}</span>
                {unreadCount > 0 && (
                    <button
                        id="mark-all-read"
                        onClick={() => { haptic.light(); markAllAsRead(); }}
                        style={s.markAllBtn}
                    >
                        {t('doctor.notifications.markAllRead')}
                    </button>
                )}
            </div>

            {/* Content */}
            <div style={s.scroll} className="scrollable">
                {loading ? (
                    <div style={{ padding: 20 }}>
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} style={{ marginBottom: 16 }}>
                                <Skeleton width="100%" height={72} borderRadius={14} />
                            </div>
                        ))}
                    </div>
                ) : notifications.length === 0 ? (
                    <div style={s.empty}>
                        <Bell size={48} color={colors.textTertiary} />
                        <span style={{ fontSize: 16, fontWeight: 600, color: colors.textSecondary, marginTop: 12 }}>
                            {t('doctor.notifications.empty')}
                        </span>
                        <span style={{ fontSize: 13, color: colors.textTertiary, marginTop: 4 }}>
                            {t('doctor.notifications.emptyMsg')}
                        </span>
                    </div>
                ) : (
                    notifications.map((notif) => (
                        <button
                            key={notif.id}
                            onClick={() => handleTap(notif)}
                            style={{
                                ...s.notifCard,
                                backgroundColor: notif.read ? 'transparent' : colors.accentTealFaded,
                                [isRTL ? 'borderRight' : 'borderLeft']: `3px solid ${notif.read ? 'transparent' : colors.accentTeal}`,
                                flexDirection: isRTL ? 'row-reverse' : 'row',
                                textAlign: isRTL ? 'right' : 'left' as any,
                            }}
                            className="pressable"
                        >
                            <div style={s.notifIconWrap}>
                                <NotifIcon type={notif.type} />
                            </div>
                            <div style={{ ...s.notifBody, textAlign: isRTL ? 'right' : 'left' }}>
                                <span style={{
                                    ...s.notifTitle,
                                    fontWeight: notif.read ? 500 : 700,
                                    color: notif.read ? colors.textSecondary : colors.textPrimary,
                                }}>
                                    {notif.title}
                                </span>
                                <span style={s.notifText}>{notif.body}</span>
                                <span style={s.notifTime}>{timeAgo(notif.created_at, t)}</span>
                            </div>
                            {!notif.read && (
                                <div style={s.unreadDot} />
                            )}
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}

const s: Record<string, CSSProperties> = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: colors.bgPrimary,
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '16px 20px',
        borderBottom: `1px solid ${colors.border}`,
    },
    title: {
        flex: 1,
        fontSize: typography.h3.fontSize,
        fontWeight: 700,
        color: colors.textPrimary,
    },
    markAllBtn: {
        fontSize: 12,
        fontWeight: 600,
        color: colors.accentTeal,
        padding: '6px 12px',
        borderRadius: 8,
        backgroundColor: colors.accentTealFaded,
        border: 'none',
        cursor: 'pointer',
    },
    scroll: {
        flex: 1,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
    },
    empty: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        textAlign: 'center',
    },
    notifCard: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        width: '100%',
        padding: '16px 20px',
        border: 'none',
        borderBottom: `1px solid ${colors.border}`,
        cursor: 'pointer',
        background: 'none',
    },
    notifIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: colors.bgSecondary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    notifBody: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
    },
    notifTitle: {
        fontSize: 14,
        lineHeight: '20px',
    },
    notifText: {
        fontSize: 12,
        color: colors.textTertiary,
        lineHeight: '18px',
    },
    notifTime: {
        fontSize: 11,
        color: colors.textTertiary,
        marginTop: 4,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.accentTeal,
        flexShrink: 0,
        marginTop: 6,
    },
};
