import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { haptic } from '../../hooks/useHaptics';
import { colors, typography, Clock, Siren, CheckCircle, Gem, ClipboardList, PartyPopper, Zap, Coins, Settings, Calendar, Bell } from '@cliniqone/ui';
import type { CliniqIconProps } from '@cliniqone/ui';
import { useAuthStore } from '../../stores/authStore';
import { useDoctorStats, usePendingQueue, useDoctorConsultations, useTodaysBookings } from '../../hooks/useDoctorData';
import { useDoctorNotifications } from '../../hooks/useDoctorNotifications';
import { BrandSpinner } from '../../components/BrandSpinner';
import { PullToRefresh } from '../../components/PullToRefresh';
import { useI18n } from '@cliniqone/i18n';
import type { CSSProperties, ReactNode } from 'react';

function StatCard({ Icon, label, value, color }: { Icon: (p: CliniqIconProps) => ReactNode; label: string; value: number; color: string }) {
    return (
        <div style={s.statCard} className="pressable">
            <Icon size={20} color={color} />
            <span style={{ fontSize: typography.h3.fontSize, fontWeight: 800, color, marginTop: 4 }}>{value}</span>
            <span style={{ fontSize: typography.caption.fontSize, color: colors.textTertiary, marginTop: 2 }}>{label}</span>
        </div>
    );
}

export function HomePage() {
    const navigate = useNavigate();
    const { doctor } = useAuthStore();
    const [refreshing, setRefreshing] = useState(false);
    const { unreadCount } = useDoctorNotifications();
    const { t, isRTL } = useI18n();

    const { data: stats, refetch: refetchStats } = useDoctorStats(doctor?.id || '');
    const { data: pendingItems, isLoading: pendingLoading, refetch: refetchPending } = usePendingQueue(doctor?.specialty || '');
    const { data: myConsultations, isLoading: myLoading, refetch: refetchMy } = useDoctorConsultations(doctor?.id || '', undefined);

    const myActiveItems = (myConsultations || []).filter((c: any) => ['assigned', 'in_progress'].includes(c.status));
    const allQueueItems = [...myActiveItems, ...(pendingItems || [])];
    const queueCount = allQueueItems.length;
    const urgentCount = allQueueItems.filter((c: any) => c.priority === 'urgent').length;
    const queuePreview = allQueueItems.slice(0, 3);
    const queueLoading = pendingLoading || myLoading;
    const { data: todaysBookings } = useTodaysBookings(doctor?.id || '');
    const appointmentCount = todaysBookings?.length ?? 0;

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([refetchStats(), refetchPending(), refetchMy()]);
        setRefreshing(false);
    }, [refetchStats, refetchPending, refetchMy]);

    const quickActions: { Icon: (p: CliniqIconProps) => ReactNode; label: string; route: string }[] = [
        { Icon: ClipboardList, label: t('doctor.queue'), route: '/tabs/queue' },
        { Icon: Calendar, label: t('doctor.calendar'), route: '/tabs/calendar' },
        { Icon: Coins, label: t('doctor.earnings'), route: '/tabs/analytics' },
        { Icon: Settings, label: t('doctor.settings'), route: '/tabs/settings' },
    ];

    return (
        <PullToRefresh onRefresh={onRefresh}>
        <div style={s.container} className="scrollable">
            <div style={s.scroll}>
                {/* Header */}
                <div style={{ ...s.header, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                    <div style={{ flex: 1, textAlign: isRTL ? 'right' : 'left' }}>
                        <span style={s.greeting}>{t('doctor.welcomeBack')}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: isRTL ? 'flex-end' : 'flex-start' }}>
                            <span style={s.name}>{doctor?.display_name || 'Doctor'}</span>
                            {doctor?.doctor_type === 'locum' && (
                                <span style={s.locumBadge}>{t('doctor.locum')}</span>
                            )}
                        </div>
                        {doctor?.sandbox_mode && <span style={{ fontSize: 11, color: colors.warning, marginTop: 2, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Siren size={12} color={colors.warning} /> {t('doctor.sandboxMode')}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {/* Notification bell */}
                        <button
                            id="notification-bell"
                            onClick={() => { haptic.light(); navigate('/notifications'); }}
                            style={{ position: 'relative', background: 'none', border: 'none', padding: 8, cursor: 'pointer' }}
                        >
                            <Bell size={22} color={colors.textSecondary} />
                            {unreadCount > 0 && (
                                <span style={{
                                    position: 'absolute', top: 2, right: 2,
                                    minWidth: 18, height: 18, borderRadius: 9,
                                    backgroundColor: colors.error, color: '#fff',
                                    fontSize: 10, fontWeight: 800,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    padding: '0 4px', lineHeight: 1,
                                }}>
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>
                        <div style={{ ...s.statusBadge, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                            <div style={{ width: 8, height: 8, borderRadius: 4, [isRTL ? 'marginLeft' : 'marginRight']: 6, backgroundColor: doctor?.is_accepting ? colors.success : colors.warning }} />
                            <span style={{ fontSize: typography.caption.fontSize, color: colors.textSecondary }}>{doctor?.is_accepting ? t('doctor.accepting') : t('doctor.paused')}</span>
                        </div>
                    </div>
                </div>

                {/* Credential warning */}
                {doctor?.doctor_type === 'locum' && doctor.credential_expires_at && (() => {
                    const daysLeft = Math.ceil((new Date(doctor.credential_expires_at).getTime() - Date.now()) / 86400000);
                    if (daysLeft <= 30) return (
                        <div style={{ ...s.credWarn, ...(daysLeft <= 7 ? { backgroundColor: colors.errorFaded, borderColor: colors.error } : {}) }}>
                            <span style={{ fontSize: 12, color: colors.textPrimary, textAlign: 'center', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                {daysLeft <= 0
                                    ? <><Siren size={14} color={colors.error} /> Credentials expired — contact admin</>
                                    : <><Siren size={14} color={colors.warning} /> Credentials expire in {daysLeft} day{daysLeft !== 1 ? 's' : ''}</>
                                }
                            </span>
                        </div>
                    );
                    return null;
                })()}

                {/* Stats */}
                <div style={{ ...s.statsRow, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                    <StatCard Icon={Clock} label={t('doctor.inQueue')} value={queueCount} color={queueCount > 5 ? colors.error : queueCount > 0 ? colors.warning : colors.success} />
                    <StatCard Icon={Siren} label={t('doctor.urgentStatus')} value={urgentCount} color={colors.error} />
                    <StatCard Icon={CheckCircle} label={t('doctor.done')} value={stats?.consultations_today ?? 0} color={colors.success} />
                    <StatCard Icon={Calendar} label={t('doctor.todaysAppointments')} value={appointmentCount} color={colors.purple || '#8B5CF6'} />
                </div>

                {/* Queue Preview */}
                <div style={s.section}>
                    <div style={{ ...s.sectionHeader, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                        <span style={s.sectionTitle}><ClipboardList size={16} color={colors.textPrimary} style={{ verticalAlign: 'middle', [isRTL ? 'marginLeft' : 'marginRight']: 6 }} /> {t('doctor.queuePreview')}</span>
                        <button onClick={() => { haptic.light(); navigate('/tabs/queue'); }} className="pressable">
                            <span style={{ fontSize: 11, color: colors.accentTeal }}>{t('doctor.seeAll')}</span>
                        </button>
                    </div>
                    {queueLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', paddingBlock: 20 }}>
                            <BrandSpinner fullScreen={false} />
                        </div>
                    ) : queuePreview.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBlock: 24 }}>
                            <PartyPopper size={36} color={colors.accentTeal} />
                            <span style={{ fontSize: 14, color: colors.textTertiary, marginTop: 8 }}>{t('doctor.noCases')}</span>
                        </div>
                    ) : (
                        queuePreview.map((item: any) => (
                            <button key={item.id} style={{ ...s.queueCard, textAlign: isRTL ? 'right' : 'left' }} className="pressable" onClick={() => { haptic.medium(); navigate(`/consultation/${item.id}`); }}>
                                <div style={{ ...s.queueCardHeader, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                                    <span style={{ ...s.priorityBadge, backgroundColor: item.priority === 'urgent' ? colors.errorFaded : colors.successFaded, color: item.priority === 'urgent' ? colors.error : colors.success }}>
                                        {item.priority === 'urgent' ? <><Siren size={11} /> {t('doctor.urgent')}</> : t('doctor.routine')}
                                    </span>
                                </div>
                                <span style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 4, display: 'block' }}>{item.patient?.nickname || t('doctor.patient')} · {item.patient?.gender?.[0]?.toUpperCase() || '?'}</span>
                                <span style={{ fontSize: 14, color: colors.textPrimary, marginBottom: 8, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.chief_complaint || t('intake.consultation')}</span>
                                <div style={{ ...s.queueCardFooter, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                                    <span style={{ fontSize: 11, color: colors.accentTeal }}>{item.specialty}</span>
                                    <span style={{ fontSize: 11, color: colors.gold, [isRTL ? 'marginRight' : 'marginLeft']: 'auto', display: 'inline-flex', alignItems: 'center', gap: 3 }}><Gem size={11} color={colors.gold} /> {item.token_cost || 3}</span>
                                </div>
                            </button>
                        ))
                    )}
                </div>

                {/* Quick Actions */}
                <div style={s.section}>
                    <span style={{ ...s.sectionTitle, textAlign: isRTL ? 'right' : 'left', alignSelf: isRTL ? 'flex-end' : 'flex-start' }}><Zap size={16} color={colors.textPrimary} style={{ verticalAlign: 'middle', [isRTL ? 'marginLeft' : 'marginRight']: 6 }} /> {t('doctor.quickActions')}</span>
                    <div style={{ ...s.actionsGrid, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                        {quickActions.map((action) => (
                            <button key={action.label} style={s.actionCard} className="pressable" onClick={() => { haptic.medium(); navigate(action.route); }}>
                                <action.Icon size={28} color={colors.accentTeal} />
                                <span style={{ fontSize: 11, color: colors.textSecondary, fontWeight: 600, marginTop: 8 }}>{action.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
        </PullToRefresh>
    );
}

const s: Record<string, CSSProperties> = {
    container: { flex: 1, height: '100%', backgroundColor: colors.bgPrimary },
    scroll: { padding: 20, paddingBottom: 40 },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    greeting: { display: 'block', fontSize: 14, color: colors.textTertiary },
    name: { fontSize: typography.h2.fontSize, fontWeight: 700, color: colors.textPrimary },
    locumBadge: { backgroundColor: '#6366F1', paddingInline: 8, paddingBlock: 2, borderRadius: 6, fontSize: 10, fontWeight: 800, letterSpacing: 1, color: '#fff' },
    statusBadge: { display: 'flex', alignItems: 'center', backgroundColor: colors.bgSecondary, paddingInline: 12, paddingBlock: 6, borderRadius: 20, border: `1px solid ${colors.border}` },
    credWarn: { backgroundColor: colors.warningFaded, border: `1px solid ${colors.warning}`, borderRadius: 12, padding: 12, marginBottom: 16, textAlign: 'center' as any },
    statsRow: { display: 'flex', gap: 10, marginBottom: 24 },
    statCard: { flex: 1, backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', border: `1px solid ${colors.border}` },
    section: { marginBottom: 24 },
    sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: typography.h3.fontSize, fontWeight: 600, color: colors.textPrimary, display: 'inline-flex', alignItems: 'center' },
    queueCard: { display: 'block', width: '100%', backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 16, marginBottom: 10, border: `1px solid ${colors.border}`, textAlign: 'left' as any },
    queueCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    priorityBadge: { paddingInline: 10, paddingBlock: 4, borderRadius: 8, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 },
    queueCardFooter: { display: 'flex', alignItems: 'center', gap: 12 },
    actionsGrid: { display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 },
    actionCard: { width: 'calc(50% - 5px)', backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', border: `1px solid ${colors.border}` },
};
