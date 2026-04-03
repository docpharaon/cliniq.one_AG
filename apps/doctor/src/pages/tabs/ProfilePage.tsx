import { useState } from 'react';
import { haptic } from '../../hooks/useHaptics';
import { colors, typography, User, Stethoscope, Mail, Star, Share, Coins, Gem, CheckCircle, ClipboardList } from '@cliniqone/ui';
import { useAuthStore } from '../../stores/authStore';
import { useToggleAccepting, useUpdateDoctorProfile } from '../../hooks/useDoctorData';
import { useToast } from '../../components/ToastProvider';
import type { CSSProperties } from 'react';

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div style={s.infoRow}>
            <span style={{ fontSize: 11, color: colors.textTertiary }}>{label}</span>
            <span style={{ fontSize: 14, color: colors.textPrimary, fontWeight: 500, maxWidth: '60%', textAlign: 'right' }}>{value}</span>
        </div>
    );
}

export function ProfilePage() {
    const { doctor, session, setDoctor } = useAuthStore();
    const [isAccepting, setIsAccepting] = useState(doctor?.is_accepting ?? true);
    const [dailyLimit, setDailyLimit] = useState(doctor?.daily_limit ?? 10);
    const [consultationFee, setConsultationFee] = useState(doctor?.consultation_fee_tokens ?? 3);
    const toast = useToast((s) => s.show);

    const toggleMutation = useToggleAccepting();
    const updateProfileMutation = useUpdateDoctorProfile();
    const isLocum = doctor?.doctor_type === 'locum';
    const recruitmentLink = isLocum && doctor?.identifier_code ? `https://cliniq.one/doctor/${doctor.identifier_code}` : null;

    const handleToggleAccepting = (value: boolean) => {
        setIsAccepting(value);
        if (doctor) {
            toggleMutation.mutate({ doctorId: doctor.id, isAccepting: value }, {
                onSuccess: () => setDoctor({ ...doctor, is_accepting: value }),
                onError: () => { setIsAccepting(!value); toast('Failed to update availability', 'error'); },
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
            navigator.share({ text: `Consult with me on cliniq.one! Use my code: ${doctor?.identifier_code}\n${recruitmentLink}` }).catch(() => {});
        } else {
            navigator.clipboard?.writeText(recruitmentLink);
            toast('Link copied to clipboard!', 'success');
        }
    };

    return (
        <div style={s.container} className="scrollable">
            <div style={s.scroll}>
                <span style={{ ...s.title, display: 'inline-flex', alignItems: 'center', gap: 8 }}><User size={22} color={colors.textPrimary} /> My Profile</span>

                {/* Doctor Card */}
                <div style={s.doctorCard}>
                    <div style={s.avatar}><Stethoscope size={36} color={colors.accentTeal} /></div>
                    <span style={{ fontSize: typography.h2.fontSize, fontWeight: 700, color: colors.textPrimary }}>{doctor?.display_name || 'Dr. Unknown'}</span>
                    <span style={{ fontSize: 14, color: colors.accentTeal, marginTop: 4 }}>{doctor?.specialty || 'General'}</span>
                    {isLocum && <span style={s.locumBadge}>LOCUM</span>}
                    {doctor?.identifier_code && <span style={{ fontSize: 11, color: colors.accentTeal, marginTop: 4, fontWeight: 600 }}>Code: {doctor.identifier_code}</span>}
                    {session?.user?.email && <span style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Mail size={12} color={colors.textSecondary} /> {session.user.email}</span>}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                        <span style={{ fontSize: 14, color: colors.gold, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Star size={14} color={colors.gold} /> {doctor?.rating_avg?.toFixed(1) || '0.0'}</span>
                        <span style={{ fontSize: 11, color: colors.textTertiary }}>({doctor?.rating_count || 0} reviews)</span>
                    </div>
                </div>

                {/* Recruitment */}
                {isLocum && recruitmentLink && (
                    <div style={s.section}>
                        <span style={{ ...s.sectionTitle, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Share size={16} color={colors.textPrimary} /> Patient Recruitment</span>
                        <div style={s.card}>
                            <span style={{ fontSize: 11, color: colors.textSecondary, display: 'block', marginBottom: 12 }}>Share this link with patients to book consultations directly.</span>
                            <div style={{ backgroundColor: colors.bgTertiary, borderRadius: 10, paddingInline: 12, paddingBlock: 10, marginBottom: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <span style={{ fontSize: 11, color: colors.accentTeal, fontWeight: 500 }}>{recruitmentLink}</span>
                            </div>
                            <button style={s.shareBtn} className="pressable" onClick={() => { haptic.medium(); handleShareRecruitment(); }}>
                                <span style={{ fontSize: 14, color: colors.bgPrimary, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Share size={16} color={colors.bgPrimary} /> Share Recruitment Link</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Consultation Fee */}
                {isLocum && (
                    <div style={s.section}>
                        <span style={{ ...s.sectionTitle, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Coins size={16} color={colors.textPrimary} /> Consultation Fee</span>
                        <div style={s.card}>
                            <span style={{ fontSize: 11, color: colors.textTertiary, display: 'block' }}>Set your fee (2–10 tokens)</span>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, paddingBlock: 16 }}>
                                <button style={s.counterBtn} className="pressable" onClick={() => { haptic.light(); handleFeeChange(Math.max(2, consultationFee - 1)); }}><span style={s.counterBtnText}>−</span></button>
                                <div style={{ textAlign: 'center' }}>
                                    <span style={{ fontSize: typography.h2.fontSize, fontWeight: 800, color: colors.gold, display: 'flex', alignItems: 'center', gap: 6 }}><Gem size={20} color={colors.gold} /> {consultationFee}</span>
                                    <span style={{ fontSize: 11, color: colors.textTertiary }}>tokens</span>
                                </div>
                                <button style={s.counterBtn} className="pressable" onClick={() => { haptic.light(); handleFeeChange(Math.min(10, consultationFee + 1)); }}><span style={s.counterBtnText}>+</span></button>
                            </div>
                            <span style={{ fontSize: 11, color: colors.textTertiary, textAlign: 'center', display: 'block' }}>≈ {consultationFee * 5} SAR per consultation</span>
                        </div>
                    </div>
                )}

                {/* Availability */}
                <div style={s.section}>
                    <span style={{ ...s.sectionTitle, display: 'inline-flex', alignItems: 'center', gap: 6 }}><CheckCircle size={16} color={colors.success} /> Availability</span>
                    <div style={s.card}>
                        <div style={s.settingRow}>
                            <div><span style={{ fontSize: 14, color: colors.textPrimary, display: 'block' }}>Accepting Consultations</span><span style={{ fontSize: 11, color: colors.textTertiary }}>Toggle to pause new cases</span></div>
                            <input type="checkbox" checked={isAccepting} onChange={(e) => { haptic.select(); handleToggleAccepting(e.target.checked); }} style={{ width: 44, height: 24, accentColor: colors.accentTeal }} />
                        </div>
                        <div style={s.settingRow}>
                            <div><span style={{ fontSize: 14, color: colors.textPrimary, display: 'block' }}>Daily Limit</span><span style={{ fontSize: 11, color: colors.textTertiary }}>Max consultations per day</span></div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <button style={s.counterBtn} className="pressable" onClick={() => { haptic.light(); handleDailyLimitChange(Math.max(1, dailyLimit - 1)); }}><span style={s.counterBtnText}>−</span></button>
                                <span style={{ fontSize: typography.h3.fontSize, fontWeight: 700, color: colors.accentTeal, minWidth: 24, textAlign: 'center' }}>{dailyLimit}</span>
                                <button style={s.counterBtn} className="pressable" onClick={() => { haptic.light(); handleDailyLimitChange(Math.min(30, dailyLimit + 1)); }}><span style={s.counterBtnText}>+</span></button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Professional Info */}
                <div style={s.section}>
                    <span style={{ ...s.sectionTitle, display: 'inline-flex', alignItems: 'center', gap: 6 }}><ClipboardList size={16} color={colors.textPrimary} /> Professional Information</span>
                    <div style={s.card}>
                        <InfoRow label="Email" value={session?.user?.email || '—'} />
                        <InfoRow label="Full Name" value={doctor?.full_name || '—'} />
                        <InfoRow label="License #" value={doctor?.license_number || '—'} />
                        <InfoRow label="Authority" value={doctor?.license_authority || '—'} />
                        <InfoRow label="Specialty" value={doctor?.specialty || '—'} />
                        <InfoRow label="Sub-specialty" value={doctor?.sub_specialty || '—'} />
                        <InfoRow label="Experience" value={doctor?.years_experience ? `${doctor.years_experience} years` : '—'} />
                        <InfoRow label="Languages" value={doctor?.languages?.join(', ') || '—'} />
                        <InfoRow label="Status" value={doctor?.status || '—'} />
                    </div>
                </div>

                {/* Earnings */}
                <div style={s.section}>
                    <span style={{ ...s.sectionTitle, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Gem size={16} color={colors.gold} /> Earnings</span>
                    <div style={s.card}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 14, color: colors.textTertiary }}>Total Earned</span>
                            <span style={{ fontSize: typography.h2.fontSize, fontWeight: 800, color: colors.gold, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Gem size={20} color={colors.gold} /> {doctor?.tokens_earned?.toLocaleString() || '0'}</span>
                        </div>
                        <span style={{ fontSize: 11, color: colors.textTertiary, marginTop: 4, display: 'block' }}>≈ {((doctor?.tokens_earned || 0) * 5).toLocaleString()} SAR</span>
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
};
