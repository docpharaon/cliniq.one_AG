import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { haptic } from '../../hooks/useHaptics';
import { colors, typography, Calendar, Clock, CheckCircle, XCircle, User, Smartphone, MessageSquare } from '@cliniqone/ui';
import { useAuthStore } from '../../stores/authStore';
import { useDateBookings, useUpdateBookingStatus, useDoctorSubscription } from '../../hooks/useDoctorData';
import { BrandSpinner } from '../../components/BrandSpinner';
import { PullToRefresh } from '../../components/PullToRefresh';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useToast } from '../../components/ToastProvider';
import { useI18n } from '@cliniqone/i18n';
import type { CSSProperties } from 'react';

function DateStrip({ selectedDate, onSelect, isRTL }: { selectedDate: string; onSelect: (d: string) => void; isRTL: boolean }) {
    const dates: string[] = [];
    const today = new Date();
    for (let i = -3; i <= 10; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        dates.push(d.toISOString().split('T')[0]);
    }

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const todayStr = today.toISOString().split('T')[0];

    return (
        <div style={{ ...s.dateStrip, flexDirection: isRTL ? 'row-reverse' : 'row' }} className="scrollable">
            {dates.map((d) => {
                const date = new Date(d + 'T00:00:00');
                const isSelected = d === selectedDate;
                const isToday = d === todayStr;
                return (
                    <button
                        key={d}
                        onClick={() => { haptic.select(); onSelect(d); }}
                        style={{
                            ...s.dateChip,
                            backgroundColor: isSelected ? colors.accentTeal : 'transparent',
                            border: isToday && !isSelected ? `2px solid ${colors.accentTeal}` : isSelected ? 'none' : `1px solid ${colors.border}`,
                        }}
                        className="pressable"
                    >
                        <span style={{ fontSize: 10, color: isSelected ? '#fff' : colors.textTertiary, fontWeight: 600 }}>
                            {dayNames[date.getDay()]}
                        </span>
                        <span style={{ fontSize: 18, fontWeight: 800, color: isSelected ? '#fff' : colors.textPrimary }}>
                            {date.getDate()}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

function SourceBadge({ source }: { source?: string }) {
    if (source === 'whatsapp' || source === 'wa_intake') {
        return <span style={{ ...s.sourceBadge, backgroundColor: '#25D36622', color: '#25D366' }}>
            <Smartphone size={10} /> WA
        </span>;
    }
    if (source === 'wa_direct') {
        return <span style={{ ...s.sourceBadge, backgroundColor: '#25D36622', color: '#25D366' }}>
            <MessageSquare size={10} /> WA Direct
        </span>;
    }
    return <span style={{ ...s.sourceBadge, backgroundColor: colors.bgTertiary, color: colors.textTertiary }}>Manual</span>;
}

export function CalendarPage() {
    const navigate = useNavigate();
    const { doctor } = useAuthStore();
    const { t, isRTL, locale } = useI18n();
    const toast = useToast((s) => s.show);

    const todayStr = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(todayStr);
    const { data: bookings, isLoading, refetch } = useDateBookings(doctor?.id || '', selectedDate);
    const updateStatus = useUpdateBookingStatus();
    const { data: subscription } = useDoctorSubscription(doctor?.id || '');

    const bookingEnabled = subscription?.features?.booking !== false;

    const [confirmAction, setConfirmAction] = useState<{ id: string; action: string } | null>(null);

    const onRefresh = useCallback(async () => { await refetch(); }, [refetch]);

    const handleAction = (bookingId: string, action: string) => {
        setConfirmAction({ id: bookingId, action });
    };

    const executeAction = () => {
        if (!confirmAction) return;
        const statusMap: Record<string, string> = { complete: 'completed', noshow: 'no_show', cancel: 'cancelled' };
        const msgMap: Record<string, string> = { complete: t('doctor.bookingCompleted'), noshow: t('doctor.bookingNoShow'), cancel: t('doctor.bookingCancelled') };
        updateStatus.mutate(
            { bookingId: confirmAction.id, status: statusMap[confirmAction.action] },
            {
                onSuccess: () => { toast(msgMap[confirmAction.action], 'success'); setConfirmAction(null); },
                onError: () => { toast(t('common.error'), 'error'); setConfirmAction(null); },
            }
        );
    };

    const isToday = selectedDate === todayStr;
    const dateLabel = isToday ? t('doctor.today') : new Date(selectedDate + 'T00:00:00').toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' });

    return (
        <PullToRefresh onRefresh={onRefresh}>
            <div style={s.container}>
                <div style={{ ...s.headerBar, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                    <span style={s.title}>
                        <Calendar size={20} color={colors.textPrimary} style={{ verticalAlign: 'middle', [isRTL ? 'marginLeft' : 'marginRight']: 6 }} />
                        {t('doctor.calendar')}
                    </span>
                </div>

                {!bookingEnabled && (
                    <div style={s.lockedBanner}>
                        <span style={{ fontSize: 12, color: colors.warning, textAlign: 'center' }}>
                            🔒 {t('doctor.bookingLocked')} — <span style={{ textDecoration: 'underline' }}>{t('doctor.contactAdmin')}</span>
                        </span>
                    </div>
                )}

                <DateStrip selectedDate={selectedDate} onSelect={setSelectedDate} isRTL={isRTL} />

                <div style={{ paddingInline: 20, paddingBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary }}>{dateLabel}</span>
                    {bookings && <span style={{ fontSize: 11, color: colors.textTertiary, marginInlineStart: 8 }}>({bookings.length})</span>}
                </div>

                <div style={s.list} className="scrollable">
                    <div style={s.listContent}>
                        {isLoading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
                                <BrandSpinner fullScreen={false} />
                            </div>
                        ) : !bookings || bookings.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60 }}>
                                <Calendar size={48} color={colors.accentTeal} />
                                <span style={{ fontSize: 16, fontWeight: 600, color: colors.textPrimary, marginTop: 12 }}>{t('doctor.noBookingsToday')}</span>
                                <span style={{ fontSize: 13, color: colors.textTertiary, marginTop: 4, textAlign: 'center' }}>{t('doctor.noAppointments')}</span>
                            </div>
                        ) : (
                            bookings.map((booking: any) => {
                                const patient = booking.patient;
                                const location = booking.location;
                                const statusColor = booking.status === 'completed' ? colors.success
                                    : booking.status === 'no_show' ? colors.error
                                    : booking.status === 'cancelled' ? colors.textTertiary
                                    : colors.accentTeal;

                                return (
                                    <div key={booking.id} style={{ ...s.card, textAlign: isRTL ? 'right' : 'left', borderLeftColor: statusColor, borderLeftWidth: 4, borderLeftStyle: 'solid' }}>
                                        <div style={{ ...s.cardHeader, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                                                <Clock size={14} color={colors.accentTeal} />
                                                <span style={{ fontSize: 16, fontWeight: 800, color: colors.textPrimary }}>
                                                    {booking.time_slot || '—'}
                                                </span>
                                            </div>
                                            <SourceBadge source={booking.source} />
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                                            <User size={14} color={colors.textSecondary} />
                                            <span style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary }}>
                                                {patient?.nickname || t('doctor.patient')}
                                            </span>
                                            {patient?.gender && <span style={{ fontSize: 11, color: colors.textTertiary }}>({patient.gender[0]?.toUpperCase()})</span>}
                                        </div>

                                        {location && (
                                            <span style={{ fontSize: 11, color: colors.textTertiary, display: 'block', marginBottom: 8 }}>
                                                📍 {location.name}{location.city ? ` — ${location.city}` : ''}
                                            </span>
                                        )}

                                        {booking.chief_complaint && (
                                            <span style={{ fontSize: 12, color: colors.textSecondary, display: 'block', marginBottom: 10, lineHeight: '18px' }}>
                                                {booking.chief_complaint}
                                            </span>
                                        )}

                                        {/* Status badge */}
                                        <span style={{
                                            fontSize: 10, fontWeight: 700, color: statusColor,
                                            backgroundColor: `${statusColor}18`, padding: '3px 10px',
                                            borderRadius: 8, display: 'inline-block', marginBottom: 10,
                                            textTransform: 'uppercase',
                                        }}>
                                            {booking.status?.replace(/_/g, ' ')}
                                        </span>

                                        {/* Actions */}
                                        {booking.status === 'confirmed' && (
                                            <div style={{ display: 'flex', gap: 8, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                                                <button style={{ ...s.actionBtn, backgroundColor: colors.successFaded, color: colors.success }} className="pressable" onClick={() => { haptic.medium(); handleAction(booking.id, 'complete'); }}>
                                                    <CheckCircle size={14} /> {t('doctor.markCompleted')}
                                                </button>
                                                <button style={{ ...s.actionBtn, backgroundColor: colors.errorFaded, color: colors.error }} className="pressable" onClick={() => { haptic.medium(); handleAction(booking.id, 'noshow'); }}>
                                                    <XCircle size={14} /> {t('doctor.markNoShow')}
                                                </button>
                                            </div>
                                        )}

                                        {/* View intake if linked to consultation */}
                                        {booking.consultation_id && (
                                            <button
                                                style={{ ...s.viewIntakeBtn, flexDirection: isRTL ? 'row-reverse' : 'row' }}
                                                className="pressable"
                                                onClick={() => { haptic.medium(); navigate(`/consultation/${booking.consultation_id}`); }}
                                            >
                                                <span style={{ fontSize: 12, fontWeight: 600, color: colors.accentTeal }}>{t('doctor.viewIntake')}</span>
                                            </button>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            <ConfirmDialog
                visible={!!confirmAction}
                title={confirmAction?.action === 'complete' ? t('doctor.markCompleted') : confirmAction?.action === 'noshow' ? t('doctor.markNoShow') : t('doctor.cancelBooking')}
                message={`${confirmAction?.action === 'complete' ? t('doctor.bookingCompleted') : confirmAction?.action === 'noshow' ? t('doctor.bookingNoShow') : t('doctor.bookingCancelled')}?`}
                confirmLabel={t('doctor.accept')}
                cancelLabel={t('common.cancel')}
                onConfirm={executeAction}
                onCancel={() => setConfirmAction(null)}
            />
        </PullToRefresh>
    );
}

const s: Record<string, CSSProperties> = {
    container: { display: 'flex', flexDirection: 'column', flex: 1, height: '100%', backgroundColor: colors.bgPrimary },
    headerBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingInline: 20, paddingTop: 16, paddingBottom: 8 },
    title: { fontSize: typography.h2.fontSize, fontWeight: 700, color: colors.textPrimary },
    lockedBanner: { backgroundColor: colors.warningFaded, borderBottom: `1px solid ${colors.warning}`, paddingInline: 20, paddingBlock: 10, textAlign: 'center' as any },
    dateStrip: { display: 'flex', gap: 8, paddingInline: 20, paddingBlock: 12, overflowX: 'auto', flexWrap: 'nowrap' },
    dateChip: {
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minWidth: 52, height: 64, borderRadius: 16, gap: 2,
    },
    list: { flex: 1 },
    listContent: { padding: 20, paddingTop: 8, paddingBottom: 40 },
    card: {
        display: 'block', width: '100%', backgroundColor: colors.bgSecondary,
        borderRadius: 16, padding: 16, marginBottom: 12, border: `1px solid ${colors.border}`,
    },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    sourceBadge: {
        fontSize: 10, fontWeight: 700, paddingInline: 8, paddingBlock: 3,
        borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 3,
    },
    actionBtn: {
        flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        gap: 4, paddingBlock: 10, borderRadius: 10, fontSize: 11, fontWeight: 700,
    },
    viewIntakeBtn: {
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        paddingBlock: 8, marginTop: 8, borderRadius: 10,
        background: colors.accentTealFaded, width: '100%',
    },
};
