import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { haptic } from '../hooks/useHaptics';
import { colors, typography, MapPin, Clock, CheckCircle, XCircle, AlertTriangle, Plus, Edit, Smartphone, Phone } from '@cliniqone/ui';
import { useAuthStore } from '../stores/authStore';
import { useDoctorLocations, useUpsertLocation, useDoctorSubscription } from '../hooks/useDoctorData';
import { BrandSpinner } from '../components/BrandSpinner';
import { BackButton } from '../components/BackButton';
import { useToast } from '../components/ToastProvider';
import { useI18n } from '@cliniqone/i18n';
import type { CSSProperties } from 'react';

function StatusBadge({ status, t }: { status: string; t: (k: string) => string }) {
    const map: Record<string, { color: string; label: string }> = {
        approved: { color: colors.success, label: t('doctor.locationApproved') },
        pending_review: { color: colors.warning, label: t('doctor.pendingApproval') },
        rejected: { color: colors.error, label: t('doctor.locationRejected') },
        draft: { color: colors.textTertiary, label: t('doctor.locationDraft') },
    };
    const { color, label } = map[status] || map.draft;
    return <span style={{ fontSize: 10, fontWeight: 700, color, backgroundColor: `${color}18`, paddingInline: 8, paddingBlock: 3, borderRadius: 6 }}>{label}</span>;
}

export function LocationsPage() {
    const navigate = useNavigate();
    const { doctor } = useAuthStore();
    const { t, isRTL } = useI18n();
    const toast = useToast((s) => s.show);
    const { data: locations, isLoading } = useDoctorLocations(doctor?.id || '');
    const { data: subscription } = useDoctorSubscription(doctor?.id || '');
    const upsertMutation = useUpsertLocation();

    const bookingEnabled = subscription?.features?.booking !== false;
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | undefined>(undefined);
    const [form, setForm] = useState({ name: '', address: '', city: '', country: '', bookingMode: 'wa_direct', slotDuration: 15, callCenterPhone: '' });

    const handleSubmit = () => {
        if (!form.name.trim()) return;
        haptic.medium();
        upsertMutation.mutate({
            id: editId,
            doctorId: doctor?.id || '',
            ...form,
        }, {
            onSuccess: () => {
                toast(editId ? t('doctor.locationUpdated') : t('doctor.locationSubmitted'), 'success');
                setShowForm(false);
                setEditId(undefined);
                setForm({ name: '', address: '', city: '', country: '', bookingMode: 'wa_direct', slotDuration: 15, callCenterPhone: '' });
            },
            onError: () => toast(t('common.error'), 'error'),
        });
    };

    const handleEdit = (loc: any) => {
        setEditId(loc.id);
        setForm({
            name: loc.name || '',
            address: loc.address || '',
            city: loc.city || '',
            country: loc.country || '',
            bookingMode: loc.booking_mode || 'wa_direct',
            slotDuration: loc.slot_duration_min || 15,
            callCenterPhone: loc.call_center_phone || '',
        });
        setShowForm(true);
    };

    return (
        <div style={s.container}>
            <div style={{ ...s.header, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                <BackButton />
                <span style={{ fontSize: typography.h3.fontSize, fontWeight: 600, color: colors.textPrimary, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={18} color={colors.accentTeal} /> {t('doctor.clinicLocations')}
                </span>
                <button
                    className="pressable"
                    style={{ backgroundColor: colors.accentTeal, borderRadius: 10, paddingInline: 12, paddingBlock: 8 }}
                    onClick={() => { haptic.medium(); setShowForm(true); setEditId(undefined); setForm({ name: '', address: '', city: '', country: '', bookingMode: 'wa_direct', slotDuration: 15, callCenterPhone: '' }); }}
                >
                    <Plus size={16} color="#fff" />
                </button>
            </div>

            {!bookingEnabled && (
                <div style={s.lockedBanner}>
                    <span style={{ fontSize: 12, color: colors.warning, textAlign: 'center' }}>
                        🔒 {t('doctor.bookingLocked')} — <span style={{ textDecoration: 'underline' }}>{t('doctor.contactAdmin')}</span>
                    </span>
                </div>
            )}

            <div style={s.scroll} className="scrollable">
                <div style={s.scrollInner}>
                    {isLoading ? (
                        <BrandSpinner fullScreen={false} />
                    ) : !locations || locations.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60, gap: 12 }}>
                            <MapPin size={48} color={colors.accentTeal} />
                            <span style={{ fontSize: 16, fontWeight: 600, color: colors.textPrimary }}>{t('doctor.noLocations')}</span>
                            <span style={{ fontSize: 13, color: colors.textTertiary }}>{t('doctor.addFirstLocation')}</span>
                            <button className="pressable" style={s.addBtn} onClick={() => { haptic.medium(); setShowForm(true); }}>
                                <Plus size={16} color="#fff" /> {t('doctor.addLocation')}
                            </button>
                        </div>
                    ) : (
                        locations.map((loc: any) => (
                            <div key={loc.id} style={{ ...s.card, textAlign: isRTL ? 'right' : 'left' }}>
                                <div style={{ ...s.cardHeader, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                                    <span style={{ fontSize: 16, fontWeight: 700, color: colors.textPrimary }}>{loc.name}</span>
                                    <StatusBadge status={loc.approval_status || 'draft'} t={t} />
                                </div>
                                {loc.address && <span style={{ fontSize: 12, color: colors.textSecondary, display: 'block', marginBottom: 4 }}>📍 {loc.address}</span>}
                                {loc.city && <span style={{ fontSize: 11, color: colors.textTertiary, display: 'block', marginBottom: 8 }}>{loc.city}{loc.country ? `, ${loc.country}` : ''}</span>}
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                                    <span style={{ fontSize: 10, fontWeight: 600, color: colors.accentTeal, backgroundColor: colors.accentTealFaded, paddingInline: 8, paddingBlock: 3, borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                        {loc.booking_mode === 'call_center' ? <><Phone size={10} /> {t('doctor.callCenter')}</> : <><Smartphone size={10} /> {t('doctor.directBooking')}</>}
                                    </span>
                                    <span style={{ fontSize: 10, fontWeight: 600, color: colors.textTertiary, backgroundColor: colors.bgTertiary, paddingInline: 8, paddingBlock: 3, borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                        <Clock size={10} /> {loc.slot_duration_min || 15} min
                                    </span>
                                </div>
                                <button className="pressable" style={s.editBtn} onClick={() => { haptic.select(); handleEdit(loc); }}>
                                    <Edit size={14} color={colors.accentTeal} /> <span style={{ fontSize: 12, fontWeight: 600, color: colors.accentTeal }}>{t('common.edit')}</span>
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Add/Edit Location Form Modal */}
            {showForm && (
                <div style={s.formOverlay}>
                    <div style={s.formModal}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                            <span style={{ fontSize: typography.h3.fontSize, fontWeight: 700, color: colors.textPrimary }}>{editId ? t('common.edit') : t('doctor.addLocation')}</span>
                            <button className="pressable" onClick={() => setShowForm(false)} style={{ fontSize: 20, color: colors.textTertiary }}>✕</button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <input placeholder={t('doctor.locationName')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={s.input} />
                            <input placeholder={t('doctor.locationAddress')} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} style={s.input} />
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input placeholder={t('doctor.locationCity')} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} style={{ ...s.input, flex: 1 }} />
                                <input placeholder={t('doctor.locationCountry')} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} style={{ ...s.input, flex: 1 }} />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: colors.textTertiary, textTransform: 'uppercase' as any }}>{t('doctor.bookingMode')}</span>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {['wa_direct', 'call_center'].map((mode) => (
                                        <button
                                            key={mode}
                                            className="pressable"
                                            style={{ flex: 1, paddingBlock: 10, borderRadius: 10, backgroundColor: form.bookingMode === mode ? colors.accentTeal : colors.bgTertiary, color: form.bookingMode === mode ? '#fff' : colors.textSecondary, fontSize: 12, fontWeight: 600 }}
                                            onClick={() => setForm({ ...form, bookingMode: mode })}
                                        >
                                            {mode === 'wa_direct' ? `📱 ${t('doctor.directBooking')}` : `📞 ${t('doctor.callCenter')}`}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {form.bookingMode === 'call_center' && (
                                <input placeholder={t('doctor.callCenterPhone')} value={form.callCenterPhone} onChange={(e) => setForm({ ...form, callCenterPhone: e.target.value })} style={s.input} type="tel" />
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: colors.textTertiary, textTransform: 'uppercase' as any }}>{t('doctor.slotDuration')}</span>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {[10, 15, 20, 30].map((dur) => (
                                        <button
                                            key={dur}
                                            className="pressable"
                                            style={{ flex: 1, paddingBlock: 10, borderRadius: 10, backgroundColor: form.slotDuration === dur ? colors.accentTeal : colors.bgTertiary, color: form.slotDuration === dur ? '#fff' : colors.textSecondary, fontSize: 13, fontWeight: 700 }}
                                            onClick={() => setForm({ ...form, slotDuration: dur })}
                                        >
                                            {dur}m
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ backgroundColor: colors.warningFaded, borderRadius: 10, padding: 12, marginTop: 4 }}>
                                <span style={{ fontSize: 11, color: colors.warning, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <AlertTriangle size={14} color={colors.warning} /> {t('doctor.pendingApproval')}
                                </span>
                            </div>

                            <button
                                className="pressable"
                                style={{ ...s.submitBtn, opacity: !form.name.trim() || upsertMutation.isPending ? 0.5 : 1 }}
                                disabled={!form.name.trim() || upsertMutation.isPending}
                                onClick={handleSubmit}
                            >
                                <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
                                    {upsertMutation.isPending ? '...' : editId ? t('common.save') : t('doctor.addLocation')}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const s: Record<string, CSSProperties> = {
    container: { display: 'flex', flexDirection: 'column', flex: 1, height: '100%', backgroundColor: colors.bgPrimary },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingInline: 20, paddingBlock: 12, borderBottom: `1px solid ${colors.border}` },
    lockedBanner: { backgroundColor: colors.warningFaded, borderBottom: `1px solid ${colors.warning}`, paddingInline: 20, paddingBlock: 10, textAlign: 'center' as any },
    scroll: { flex: 1 },
    scrollInner: { padding: 20, paddingBottom: 40 },
    card: { backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 16, marginBottom: 12, border: `1px solid ${colors.border}` },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    addBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: colors.accentTeal, borderRadius: 12, paddingInline: 20, paddingBlock: 12, fontSize: 13, fontWeight: 700, color: '#fff', marginTop: 16 },
    editBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: colors.accentTealFaded, borderRadius: 10, paddingInline: 14, paddingBlock: 8 },
    formOverlay: { position: 'fixed' as any, inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', zIndex: 100 },
    formModal: { backgroundColor: colors.bgPrimary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, width: '100%', maxHeight: '85vh', overflowY: 'auto' as any },
    input: { fontSize: 14, padding: '12px 16px', borderRadius: 12, border: `1px solid ${colors.border}`, backgroundColor: colors.bgSecondary, color: colors.textPrimary, outline: 'none', width: '100%' },
    submitBtn: { width: '100%', backgroundColor: colors.accentTeal, borderRadius: 14, paddingBlock: 16, marginTop: 8 },
};
