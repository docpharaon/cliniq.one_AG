import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { haptic } from '../../hooks/useHaptics';
import { colors, typography, User, Stethoscope, Mail, Star, Share, Coins, Gem, CheckCircle, ClipboardList, Settings, Calendar, MapPin, Smartphone } from '@cliniqone/ui';
import { useI18n } from '@cliniqone/i18n';
import { useAuthStore } from '../../stores/authStore';
import { useToggleAccepting, useUpdateDoctorProfile } from '../../hooks/useDoctorData';
import { useToast } from '../../components/ToastProvider';
import type { CSSProperties } from 'react';

function InfoRow({ label, value, isRTL }: { label: string; value: string; isRTL: boolean }) {
    return (
        <div style={{ ...s.infoRow, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
            <span style={{ fontSize: 11, color: colors.textTertiary }}>{label}</span>
            <span style={{ fontSize: 14, color: colors.textPrimary, fontWeight: 500, maxWidth: '60%', textAlign: isRTL ? 'left' : 'right' }}>{value}</span>
        </div>
    );
}

export function ProfilePage() {
    const navigate = useNavigate();
    const { doctor, session, setDoctor } = useAuthStore();
    const [isAccepting, setIsAccepting] = useState(doctor?.is_accepting ?? true);
    const [dailyLimit, setDailyLimit] = useState(doctor?.daily_limit ?? 10);
    const [consultationFee, setConsultationFee] = useState(doctor?.consultation_fee_tokens ?? 3);
    const toast = useToast((s) => s.show);
    const { t, isRTL, locale } = useI18n();

    const toggleMutation = useToggleAccepting();
    const updateProfileMutation = useUpdateDoctorProfile();
    const isLocum = doctor?.doctor_type === 'locum';
    const recruitmentLink = isLocum && doctor?.identifier_code ? `https://cliniq.one/doctor/${doctor.identifier_code}` : null;

    const handleToggleAccepting = (value: boolean) => {
        setIsAccepting(value);
        if (doctor) {
            toggleMutation.mutate({ doctorId: doctor.id, isAccepting: value }, {
                onSuccess: () => setDoctor({ ...doctor, is_accepting: value }),
                onError: () => { setIsAccepting(!value); toast(t('doctor.availabilityError'), 'error'); },
            });
        }
    };

    const handleDailyLimitChange = (newLimit: number) => {
        setDailyLimit(newLimit);
        if (doctor) updateProfileMutation.mutate({ doctorId: doctor.id, updates: { daily_limit: newLimit } }, { onSuccess: () => setDoctor({ ...doctor, daily_limit: newLimit }) });
    };

    const handleFeeChange = (newFee: number) => {
        setConsultationFee(newFee);
        if (doctor) updateProfileMutation.mutate({ doctorId: doctor.id, updates: { consultation_fee_tokens: newFee } }, { onSuccess: () => setDoctor({ ...doctor, consultation_fee_tokens: newFee }) });
    };

    const handleShareRecruitment = () => {
        if (!recruitmentLink) return;
        if (navigator.share) {
            navigator.share({ text: `${t('doctor.shareLink')}: ${doctor?.identifier_code}\n${recruitmentLink}` }).catch(() => {});
        } else {
            navigator.clipboard?.writeText(recruitmentLink);
            toast(t('doctor.linkCopied'), 'success');
        }
    };

    return (
        <div style={s.container} className="scrollable">
            <div style={s.scroll}>
                <span style={{ ...s.title, display: 'inline-flex', alignItems: 'center', gap: 8, flexDirection: isRTL ? 'row-reverse' : 'row' }}><User size={22} color={colors.textPrimary} /> {t('doctor.myProfile')}</span>

                {/* Doctor Card */}
                <div style={s.doctorCard}>
                    <div style={s.avatar}><Stethoscope size={36} color={colors.accentTeal} /></div>
                    <span style={{ fontSize: typography.h2.fontSize, fontWeight: 700, color: colors.textPrimary }}>{doctor?.display_name || 'Dr. Unknown'}</span>
                    <span style={{ fontSize: 14, color: colors.accentTeal, marginTop: 4 }}>{doctor?.specialty || 'General'}</span>
                    {isLocum && <span style={s.locumBadge}>{t('doctor.locum')}</span>}
                    {doctor?.identifier_code && <span style={{ fontSize: 11, color: colors.accentTeal, marginTop: 4, fontWeight: 600 }}>{t('common.code')}: {doctor.identifier_code}</span>}
                    {session?.user?.email && <span style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Mail size={12} color={colors.textSecondary} /> {session.user.email}</span>}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                        <span style={{ fontSize: 14, color: colors.gold, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Star size={14} color={colors.gold} /> {doctor?.rating_avg?.toFixed(1) || '0.0'}</span>
                        <span style={{ fontSize: 11, color: colors.textTertiary }}>({doctor?.rating_count || 0} reviews)</span>
                    </div>
                </div>

                {/* Recruitment */}
                {isLocum && recruitmentLink && (
                    <div style={s.section}>
                        <span style={{ ...s.sectionTitle, display: 'inline-flex', alignItems: 'center', gap: 6, flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: isRTL ? 'flex-end' : 'flex-start' }}><Share size={16} color={colors.textPrimary} /> {t('doctor.recruitment')}</span>
                        <div style={{ ...s.card, textAlign: isRTL ? 'right' : 'left' }}>
                            <span style={{ fontSize: 11, color: colors.textSecondary, display: 'block', marginBottom: 12 }}>{t('doctor.recruitmentDesc')}</span>
                            <div style={{ backgroundColor: colors.bgTertiary, borderRadius: 10, paddingInline: 12, paddingBlock: 10, marginBottom: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <span style={{ fontSize: 11, color: colors.accentTeal, fontWeight: 500 }}>{recruitmentLink}</span>
                            </div>
                            <button style={s.shareBtn} className="pressable" onClick={() => { haptic.medium(); handleShareRecruitment(); }}>
                                <span style={{ fontSize: 14, color: colors.bgPrimary, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Share size={16} color={colors.bgPrimary} /> {t('doctor.shareLink')}</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Consultation Fee */}
                {isLocum && (
                    <div style={s.section}>
                        <span style={{ ...s.sectionTitle, display: 'inline-flex', alignItems: 'center', gap: 6, flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: isRTL ? 'flex-end' : 'flex-start' }}><Coins size={16} color={colors.textPrimary} /> {t('doctor.consultationFee')}</span>
                        <div style={{ ...s.card, textAlign: 'center' }}>
                            <span style={{ fontSize: 11, color: colors.textTertiary, display: 'block' }}>{t('doctor.setFee')}</span>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, paddingBlock: 16 }}>
                                <button style={s.counterBtn} className="pressable" onClick={() => { haptic.light(); handleFeeChange(Math.max(2, consultationFee - 1)); }}><span style={s.counterBtnText}>−</span></button>
                                <div style={{ textAlign: 'center' }}>
                                    <span style={{ fontSize: typography.h2.fontSize, fontWeight: 800, color: colors.gold, display: 'flex', alignItems: 'center', gap: 6 }}><Gem size={20} color={colors.gold} /> {consultationFee}</span>
                                    <span style={{ fontSize: 11, color: colors.textTertiary }}>{t('doctor.tokens')}</span>
                                </div>
                                <button style={s.counterBtn} className="pressable" onClick={() => { haptic.light(); handleFeeChange(Math.min(10, consultationFee + 1)); }}><span style={s.counterBtnText}>+</span></button>
                            </div>
                            <span style={{ fontSize: 11, color: colors.textTertiary, textAlign: 'center', display: 'block' }}>≈ {consultationFee * 5} {t('doctor.perConsultation')}</span>
                        </div>
                    </div>
                )}

                {/* Availability */}
                <div style={s.section}>
                    <span style={{ ...s.sectionTitle, display: 'inline-flex', alignItems: 'center', gap: 6, flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: isRTL ? 'flex-end' : 'flex-start' }}><CheckCircle size={16} color={colors.success} /> {t('doctor.availability')}</span>
                    <div style={s.card}>
                        <div style={{ ...s.settingRow, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                            <div style={{ textAlign: isRTL ? 'right' : 'left' }}><span style={{ fontSize: 14, color: colors.textPrimary, display: 'block' }}>{t('doctor.acceptingConsultations')}</span><span style={{ fontSize: 11, color: colors.textTertiary }}>{t('doctor.availabilityToggle')}</span></div>
                            <input type="checkbox" checked={isAccepting} onChange={(e) => { haptic.select(); handleToggleAccepting(e.target.checked); }} style={{ width: 44, height: 24, accentColor: colors.accentTeal }} />
                        </div>
                        <div style={{ ...s.settingRow, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                            <div style={{ textAlign: isRTL ? 'right' : 'left' }}><span style={{ fontSize: 14, color: colors.textPrimary, display: 'block' }}>{t('doctor.dailyLimit')}</span><span style={{ fontSize: 11, color: colors.textTertiary }}>{t('doctor.maxPerDay')}</span></div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                                <button style={s.counterBtn} className="pressable" onClick={() => { haptic.light(); handleDailyLimitChange(Math.max(1, dailyLimit - 1)); }}><span style={s.counterBtnText}>−</span></button>
                                <span style={{ fontSize: typography.h3.fontSize, fontWeight: 700, color: colors.accentTeal, minWidth: 24, textAlign: 'center' }}>{dailyLimit}</span>
                                <button style={s.counterBtn} className="pressable" onClick={() => { haptic.light(); handleDailyLimitChange(Math.min(30, dailyLimit + 1)); }}><span style={s.counterBtnText}>+</span></button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Professional Info */}
                <div style={s.section}>
                    <span style={{ ...s.sectionTitle, display: 'inline-flex', alignItems: 'center', gap: 6, flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: isRTL ? 'flex-end' : 'flex-start' }}><ClipboardList size={16} color={colors.textPrimary} /> {t('doctor.professionalInfo')}</span>
                    <div style={s.card}>
                        <InfoRow label={t('common.email')} value={session?.user?.email || '—'} isRTL={isRTL} />
                        <InfoRow label={t('doctor.profileFields.fullName')} value={doctor?.full_name || '—'} isRTL={isRTL} />
                        <InfoRow label={t('doctor.profileFields.license')} value={doctor?.license_number || '—'} isRTL={isRTL} />
                        <InfoRow label={t('doctor.profileFields.authority')} value={doctor?.license_authority || '—'} isRTL={isRTL} />
                        <InfoRow label={t('doctor.specialty')} value={doctor?.specialty || '—'} isRTL={isRTL} />
                        <InfoRow label={t('doctor.profileFields.subSpecialty')} value={doctor?.sub_specialty || '—'} isRTL={isRTL} />
                        <InfoRow label={t('doctor.profileFields.experience')} value={doctor?.years_experience ? t('doctor.profileFields.experienceVal', { years: doctor.years_experience }) : '—'} isRTL={isRTL} />
                        <InfoRow label={t('doctor.profileFields.languages')} value={doctor?.languages?.join(', ') || '—'} isRTL={isRTL} />
                        <InfoRow label={t('common.status')} value={doctor?.status || '—'} isRTL={isRTL} />
                    </div>
                </div>

                {/* Earnings */}
                <div style={s.section}>
                    <span style={{ ...s.sectionTitle, display: 'inline-flex', alignItems: 'center', gap: 6, flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: isRTL ? 'flex-end' : 'flex-start' }}><Gem size={16} color={colors.gold} /> {t('doctor.earnings')}</span>
                    <div style={s.card}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                            <span style={{ fontSize: 14, color: colors.textTertiary }}>{t('doctor.totalEarned')}</span>
                            <span style={{ fontSize: typography.h2.fontSize, fontWeight: 800, color: colors.gold, display: 'inline-flex', alignItems: 'center', gap: 6, flexDirection: isRTL ? 'row-reverse' : 'row' }}><Gem size={20} color={colors.gold} /> {doctor?.tokens_earned?.toLocaleString() || '0'}</span>
                        </div>
                        <span style={{ fontSize: 11, color: colors.textTertiary, marginTop: 4, display: 'block', textAlign: isRTL ? 'right' : 'left' }}>≈ {((doctor?.tokens_earned || 0) * 5).toLocaleString()} SAR</span>
                    </div>
                </div>

                {/* Quick Links (Settings, Locations, QR Card) */}
                <div style={s.section}>
                    <span style={{ ...s.sectionTitle, display: 'inline-flex', alignItems: 'center', gap: 6, flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: isRTL ? 'flex-end' : 'flex-start' }}>
                        <Settings size={16} color={colors.textPrimary} /> {t('doctor.settings')}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {[
                            { icon: <Settings size={18} color={colors.accentTeal} />, label: t('doctor.settings'), route: '/tabs/settings' },
                            { icon: <Calendar size={18} color="#8B5CF6" />, label: t('doctor.calendar'), route: '/tabs/calendar' },
                            { icon: <MapPin size={18} color={colors.warning} />, label: t('doctor.clinicLocations'), route: '/locations' },
                            { icon: <Smartphone size={18} color="#25D366" />, label: t('doctor.myQrCard'), route: '/qr-card' },
                        ].map((item) => (
                            <button
                                key={item.route}
                                style={{ ...s.quickLinkBtn, flexDirection: isRTL ? 'row-reverse' : 'row' }}
                                className="pressable"
                                onClick={() => { haptic.select(); navigate(item.route); }}
                            >
                                {item.icon}
                                <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }}>{item.label}</span>
                                <span style={{ fontSize: 18, color: colors.textTertiary }}>{isRTL ? '‹' : '›'}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

const s: Record<string, CSSProperties> = {
    container: { flex: 1, height: '100%', backgroundColor: colors.bgPrimary },
    scroll: { padding: 20, paddingBottom: 40 },
    title: { display: 'block', fontSize: typography.h2.fontSize, fontWeight: 700, color: colors.textPrimary, marginBottom: 20 },
    doctorCard: { backgroundColor: colors.bgSecondary, borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', border: `1px solid ${colors.border}`, marginBottom: 24 },
    avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.accentTealFaded, display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    locumBadge: { backgroundColor: colors.warningFaded, paddingInline: 10, paddingBlock: 4, borderRadius: 8, marginTop: 8, fontSize: 11, color: colors.warning, fontWeight: 700, textTransform: 'uppercase' as any },
    section: { marginBottom: 24 },
    sectionTitle: { display: 'block', fontSize: typography.h3.fontSize, fontWeight: 600, color: colors.textPrimary, marginBottom: 12 },
    card: { backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 16, border: `1px solid ${colors.border}` },
    settingRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBlock: 12 },
    counterBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgTertiary, display: 'flex', justifyContent: 'center', alignItems: 'center', border: `1px solid ${colors.border}` },
    counterBtnText: { fontSize: typography.h3.fontSize, color: colors.textPrimary },
    shareBtn: { width: '100%', backgroundColor: colors.accentTeal, borderRadius: 12, paddingBlock: 12, marginBottom: 8 },
    infoRow: { display: 'flex', justifyContent: 'space-between', paddingBlock: 10, borderBottom: `1px solid ${colors.border}` },
    quickLinkBtn: {
        display: 'flex', alignItems: 'center', gap: 12,
        backgroundColor: colors.bgSecondary, borderRadius: 14,
        padding: '14px 16px', border: `1px solid ${colors.border}`,
    },
};
