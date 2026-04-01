import { useState } from 'react';
import { View, Text, ScrollView, Switch, TouchableOpacity, StyleSheet, Alert, Share, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography } from '@cliniqone/ui';
import { useAuthStore } from '../../stores/authStore';
import { useToggleAccepting, useUpdateDoctorProfile } from '../../hooks/useDoctorData';

export default function ProfileScreen() {
    const { doctor, session, setDoctor } = useAuthStore();
    const [isAccepting, setIsAccepting] = useState(doctor?.is_accepting ?? true);
    const [dailyLimit, setDailyLimit] = useState(doctor?.daily_limit ?? 10);
    const [consultationFee, setConsultationFee] = useState(doctor?.consultation_fee_tokens ?? 3);

    const toggleMutation = useToggleAccepting();
    const updateProfileMutation = useUpdateDoctorProfile();

    const isLocum = doctor?.doctor_type === 'locum';
    const recruitmentLink = isLocum && doctor?.identifier_code
        ? `https://cliniq.one/doctor/${doctor.identifier_code}`
        : null;

    const handleToggleAccepting = (value: boolean) => {
        setIsAccepting(value);
        if (doctor) {
            toggleMutation.mutate(
                { doctorId: doctor.id, isAccepting: value },
                {
                    onSuccess: () => setDoctor({ ...doctor, is_accepting: value }),
                    onError: () => {
                        setIsAccepting(!value);
                        Alert.alert('Error', 'Failed to update availability');
                    },
                },
            );
        }
    };

    const handleDailyLimitChange = (newLimit: number) => {
        setDailyLimit(newLimit);
        if (doctor) {
            updateProfileMutation.mutate(
                { doctorId: doctor.id, updates: { daily_limit: newLimit } },
                {
                    onSuccess: () => setDoctor({ ...doctor, daily_limit: newLimit }),
                    onError: () => Alert.alert('Error', 'Failed to update daily limit'),
                },
            );
        }
    };

    const handleFeeChange = (newFee: number) => {
        setConsultationFee(newFee);
        if (doctor) {
            updateProfileMutation.mutate(
                { doctorId: doctor.id, updates: { consultation_fee_tokens: newFee } },
                {
                    onSuccess: () => setDoctor({ ...doctor, consultation_fee_tokens: newFee }),
                    onError: () => Alert.alert('Error', 'Failed to update consultation fee'),
                },
            );
        }
    };

    const handleShareRecruitment = async () => {
        if (!recruitmentLink) return;
        try {
            await Share.share({
                message: `Consult with me on cliniq.one! Use my code: ${doctor?.identifier_code}\n${recruitmentLink}`,
            });
        } catch {
            // User cancelled
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.title}>👤 My Profile</Text>

                {/* Doctor Card */}
                <View style={styles.doctorCard}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>🩺</Text>
                    </View>
                    <Text style={styles.doctorName}>{doctor?.display_name || 'Dr. Unknown'}</Text>
                    <Text style={styles.doctorSpecialty}>{doctor?.specialty || 'General'}</Text>
                    {isLocum && (
                        <View style={styles.locumBadge}>
                            <Text style={styles.locumBadgeText}>LOCUM</Text>
                        </View>
                    )}
                    {doctor?.identifier_code && (
                        <Text style={styles.identifierCode}>Code: {doctor.identifier_code}</Text>
                    )}
                    {session?.user?.email ? (
                        <Text style={styles.doctorEmail}>✉️ {session.user.email}</Text>
                    ) : null}
                    <View style={styles.ratingRow}>
                        <Text style={styles.ratingText}>⭐ {doctor?.rating_avg?.toFixed(1) || '0.0'}</Text>
                        <Text style={styles.ratingCount}>({doctor?.rating_count || 0} reviews)</Text>
                    </View>
                </View>

                {/* Locum: Patient Recruitment */}
                {isLocum && recruitmentLink && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📣 Patient Recruitment</Text>
                        <View style={styles.recruitmentCard}>
                            <Text style={styles.recruitmentHint}>
                                Share this link with your patients so they can book consultations with you directly.
                            </Text>
                            <View style={styles.linkBox}>
                                <Text style={styles.linkText} numberOfLines={1}>{recruitmentLink}</Text>
                            </View>
                            <TouchableOpacity style={styles.shareButton} onPress={handleShareRecruitment}>
                                <Text style={styles.shareButtonText}>📤 Share Recruitment Link</Text>
                            </TouchableOpacity>
                            <Text style={styles.recruitmentNote}>
                                Your identifier: <Text style={{ color: colors.accentTeal, fontWeight: '700' }}>{doctor?.identifier_code}</Text>
                            </Text>
                        </View>
                    </View>
                )}

                {/* Locum: Custom Pricing */}
                {isLocum && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>💰 Consultation Fee</Text>
                        <View style={styles.settingCard}>
                            <Text style={styles.settingHint}>
                                Set your fee within platform limits (2–10 tokens)
                            </Text>
                            <View style={styles.feeRow}>
                                <TouchableOpacity
                                    style={styles.counterBtn}
                                    onPress={() => handleFeeChange(Math.max(2, consultationFee - 1))}
                                >
                                    <Text style={styles.counterBtnText}>−</Text>
                                </TouchableOpacity>
                                <View style={styles.feeDisplay}>
                                    <Text style={styles.feeValue}>💎 {consultationFee}</Text>
                                    <Text style={styles.feeLabel}>tokens</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.counterBtn}
                                    onPress={() => handleFeeChange(Math.min(10, consultationFee + 1))}
                                >
                                    <Text style={styles.counterBtnText}>+</Text>
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.feeHint}>
                                ≈ {consultationFee * 5} SAR per consultation
                            </Text>
                        </View>
                    </View>
                )}

                {/* Locum: Credential Status */}
                {isLocum && doctor?.credential_expires_at && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>🔐 Credential Status</Text>
                        <View style={[styles.settingCard, new Date(doctor.credential_expires_at) < new Date() && styles.expiredCard]}>
                            <View style={styles.settingRow}>
                                <View>
                                    <Text style={styles.settingLabel}>
                                        {new Date(doctor.credential_expires_at) < new Date() ? '🔴 Expired' : '🟢 Active'}
                                    </Text>
                                    <Text style={styles.settingHint}>
                                        Expires: {new Date(doctor.credential_expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </Text>
                                </View>
                            </View>
                            {new Date(doctor.credential_expires_at) < new Date() && (
                                <Text style={styles.expiredText}>
                                    ⚠️ Contact admin to renew your credentials
                                </Text>
                            )}
                        </View>
                    </View>
                )}

                {/* Availability Toggle */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🟢 Availability</Text>
                    <View style={styles.settingCard}>
                        <View style={styles.settingRow}>
                            <View>
                                <Text style={styles.settingLabel}>Accepting Consultations</Text>
                                <Text style={styles.settingHint}>Toggle to pause new cases</Text>
                            </View>
                            <Switch
                                value={isAccepting}
                                onValueChange={handleToggleAccepting}
                                trackColor={{ false: colors.bgTertiary, true: colors.accentTealFaded }}
                                thumbColor={isAccepting ? colors.accentTeal : colors.textTertiary}
                            />
                        </View>
                        <View style={styles.settingRow}>
                            <View>
                                <Text style={styles.settingLabel}>Daily Limit</Text>
                                <Text style={styles.settingHint}>Max consultations per day</Text>
                            </View>
                            <View style={styles.counter}>
                                <TouchableOpacity
                                    style={styles.counterBtn}
                                    onPress={() => handleDailyLimitChange(Math.max(1, dailyLimit - 1))}
                                >
                                    <Text style={styles.counterBtnText}>−</Text>
                                </TouchableOpacity>
                                <Text style={styles.counterValue}>{dailyLimit}</Text>
                                <TouchableOpacity
                                    style={styles.counterBtn}
                                    onPress={() => handleDailyLimitChange(Math.min(30, dailyLimit + 1))}
                                >
                                    <Text style={styles.counterBtnText}>+</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Professional Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📋 Professional Information</Text>
                    <View style={styles.infoCard}>
                        <InfoRow label="Email" value={session?.user?.email || '—'} />
                        <InfoRow label="Full Name" value={doctor?.full_name || '—'} />
                        <InfoRow label="License #" value={doctor?.license_number || '—'} />
                        <InfoRow label="Authority" value={doctor?.license_authority || '—'} />
                        <InfoRow label="Specialty" value={doctor?.specialty || '—'} />
                        <InfoRow label="Sub-specialty" value={doctor?.sub_specialty || '—'} />
                        <InfoRow label="Experience" value={doctor?.years_experience ? `${doctor.years_experience} years` : '—'} />
                        <InfoRow label="Languages" value={doctor?.languages?.join(', ') || '—'} />
                        <InfoRow label="Status" value={doctor?.status || '—'} />
                    </View>
                </View>

                {/* Earnings Summary */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>💎 Earnings</Text>
                    <View style={styles.earningsCard}>
                        <View style={styles.earningsRow}>
                            <Text style={styles.earningsLabel}>Total Earned</Text>
                            <Text style={styles.earningsValue}>💎 {doctor?.tokens_earned?.toLocaleString() || '0'}</Text>
                        </View>
                        <Text style={styles.earningsHint}>
                            ≈ {((doctor?.tokens_earned || 0) * 5).toLocaleString()} SAR
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    scroll: { padding: 20, paddingBottom: 40 },
    title: { ...typography.h2, color: colors.textPrimary, marginBottom: 20 },
    doctorCard: { backgroundColor: colors.bgSecondary, borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginBottom: 24 },
    avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.accentTealFaded, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    avatarText: { fontSize: 36 },
    doctorName: { ...typography.h2, color: colors.textPrimary, fontWeight: '700' },
    doctorSpecialty: { ...typography.body, color: colors.accentTeal, marginTop: 4 },
    doctorEmail: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
    ratingText: { ...typography.body, color: colors.gold, fontWeight: '700' },
    ratingCount: { ...typography.caption, color: colors.textTertiary },
    section: { marginBottom: 24 },
    sectionTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: 12 },
    settingCard: { backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
    settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
    settingLabel: { ...typography.body, color: colors.textPrimary },
    settingHint: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },
    counter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    counterBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgTertiary, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    counterBtnText: { ...typography.h3, color: colors.textPrimary },
    counterValue: { ...typography.h3, color: colors.accentTeal, fontWeight: '700', minWidth: 24, textAlign: 'center' },
    infoCard: { backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    infoLabel: { ...typography.caption, color: colors.textTertiary },
    infoValue: { ...typography.body, color: colors.textPrimary, fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
    earningsCard: { backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.border },
    earningsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    earningsLabel: { ...typography.body, color: colors.textTertiary },
    earningsValue: { ...typography.h2, color: colors.gold, fontWeight: '800' },
    earningsHint: { ...typography.caption, color: colors.textTertiary, marginTop: 4 },
    // Locum styles
    locumBadge: { backgroundColor: colors.warningFaded, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 8 },
    locumBadgeText: { ...typography.caption, color: colors.warning, fontWeight: '700', textTransform: 'uppercase' as const },
    identifierCode: { ...typography.caption, color: colors.accentTeal, marginTop: 4, fontWeight: '600' as const },
    recruitmentCard: { backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.accentTealFaded },
    recruitmentHint: { ...typography.caption, color: colors.textSecondary, marginBottom: 12 },
    linkBox: { backgroundColor: colors.bgTertiary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
    linkText: { ...typography.caption, color: colors.accentTeal, fontWeight: '500' as const },
    shareButton: { backgroundColor: colors.accentTeal, borderRadius: 12, paddingVertical: 12, alignItems: 'center' as const, marginBottom: 8 },
    shareButtonText: { ...typography.body, color: colors.bgPrimary, fontWeight: '700' as const },
    recruitmentNote: { ...typography.caption, color: colors.textTertiary, textAlign: 'center' as const, marginTop: 4 },
    feeRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 20, paddingVertical: 16 },
    feeDisplay: { alignItems: 'center' as const },
    feeValue: { ...typography.h2, color: colors.gold, fontWeight: '800' as const },
    feeLabel: { ...typography.caption, color: colors.textTertiary },
    feeHint: { ...typography.caption, color: colors.textTertiary, textAlign: 'center' as const },
    expiredCard: { borderColor: colors.errorFaded },
    expiredText: { ...typography.caption, color: colors.error, marginTop: 8 },
});
