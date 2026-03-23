import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography } from '@cliniqone/ui';
import { useConsultationDetail } from '../../hooks/useDoctorData';

export default function PatientFileScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { data: consultation, isLoading, error } = useConsultationDetail(id || '');

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.accentTeal} />
                    <Text style={styles.loadingText}>Loading patient file...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (error || !consultation) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Text style={styles.backBtn}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Patient File</Text>
                    <View style={{ width: 50 }} />
                </View>
                <View style={styles.loadingContainer}>
                    <Text style={{ fontSize: 48, marginBottom: 12 }}>⚠️</Text>
                    <Text style={styles.errorTitle}>Failed to load</Text>
                    <Text style={styles.errorMessage}>{(error as any)?.message || 'Consultation not found.'}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
                        <Text style={styles.retryText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const patient = consultation.patient as any;
    const aiSummary = consultation.ai_summary as Record<string, any> | null;
    const patientAge = patient?.year_of_birth
        ? new Date().getFullYear() - patient.year_of_birth
        : null;

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.backBtn}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Patient File</Text>
                <Text style={styles.headerBadge}>💎 {consultation.token_cost || 3}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* 1. Patient Information */}
                <Section title="👤 Patient Information">
                    <InfoRow label="Nickname" value={patient?.nickname || 'Patient'} />
                    {patientAge && <InfoRow label="Age / Gender" value={`${patientAge} / ${patient?.gender || '—'}`} />}
                    {!patientAge && patient?.gender && <InfoRow label="Gender" value={patient.gender} />}
                    {patient?.city && <InfoRow label="Location" value={`${patient.city}${patient?.country ? `, ${patient.country}` : ''}`} />}
                    {patient?.language && <InfoRow label="Language" value={patient.language === 'ar' ? 'Arabic' : 'English'} />}
                    {patient?.insurance_provider && (
                        <InfoRow label="Insurance" value={`${patient.insurance_provider}${patient.insurance_policy_number ? ` – ${patient.insurance_policy_number}` : ''}`} />
                    )}
                </Section>

                {/* 2. Chief Complaint */}
                <Section title="🗣️ Chief Complaint">
                    <Text style={styles.bodyText}>{consultation.chief_complaint || 'No complaint provided'}</Text>
                    <View style={styles.tagRow}>
                        <Tag label={consultation.specialty} color={colors.accentTeal} />
                        <Tag label={consultation.priority} color={consultation.priority === 'urgent' ? colors.error : colors.warning} />
                    </View>
                </Section>

                {/* 3. AI Analysis (from ai_summary JSON) */}
                {aiSummary && (
                    <Section title="🤖 AI Preliminary Assessment">
                        {aiSummary.summary && <Text style={styles.bodyText}>{aiSummary.summary}</Text>}

                        {aiSummary.keyFindings && aiSummary.keyFindings.length > 0 && (
                            <>
                                <Text style={styles.subTitle}>Key Findings</Text>
                                {aiSummary.keyFindings.map((f: string, i: number) => (
                                    <Text key={i} style={styles.listItem}>✓ {f}</Text>
                                ))}
                            </>
                        )}

                        {aiSummary.differentialDx && aiSummary.differentialDx.length > 0 && (
                            <>
                                <Text style={styles.subTitle}>Differential Diagnosis</Text>
                                {aiSummary.differentialDx.map((dx: any, i: number) => (
                                    <View key={i} style={styles.dxRow}>
                                        <Text style={styles.dxName}>{dx.diagnosis}</Text>
                                        <View style={styles.dxBarBg}>
                                            <View style={[styles.dxBar, { width: `${dx.likelihood}%` }]} />
                                        </View>
                                        <Text style={styles.dxPercent}>{dx.likelihood}%</Text>
                                    </View>
                                ))}
                            </>
                        )}

                        {/* AI entities can contain structured HPI, PMH, etc. */}
                        {aiSummary.entities && (
                            <>
                                {aiSummary.entities.medications && aiSummary.entities.medications.length > 0 && (
                                    <>
                                        <Text style={styles.subTitle}>Current Medications</Text>
                                        {aiSummary.entities.medications.map((med: string, i: number) => (
                                            <Text key={i} style={styles.listItem}>• {med}</Text>
                                        ))}
                                    </>
                                )}
                                {aiSummary.entities.allergies && aiSummary.entities.allergies.length > 0 && (
                                    <>
                                        <Text style={styles.subTitle}>Allergies</Text>
                                        {aiSummary.entities.allergies.map((a: string, i: number) => (
                                            <Text key={i} style={styles.listItem}>🚫 {a}</Text>
                                        ))}
                                    </>
                                )}
                            </>
                        )}

                        {/* Fallback: show raw summary if structured data not available */}
                        {!aiSummary.summary && !aiSummary.keyFindings && (
                            <Text style={styles.bodyText}>
                                {JSON.stringify(aiSummary, null, 2).slice(0, 500)}
                            </Text>
                        )}
                    </Section>
                )}

                {/* 4. Consultation Metadata */}
                <Section title="📄 Consultation Metadata">
                    <InfoRow label="ID" value={consultation.id.slice(0, 8)} />
                    <InfoRow label="Status" value={consultation.status} />
                    <InfoRow label="Priority" value={consultation.priority} />
                    <InfoRow label="Specialty" value={consultation.specialty} />
                    <InfoRow label="Submitted" value={new Date(consultation.created_at).toLocaleString()} />
                    {consultation.assigned_at && <InfoRow label="Assigned" value={new Date(consultation.assigned_at).toLocaleString()} />}
                    <InfoRow label="Token Cost" value={`💎 ${consultation.token_cost || 3}`} />
                </Section>

                {/* CTA */}
                <TouchableOpacity
                    style={styles.composeButton}
                    onPress={() => router.push({
                        pathname: '/consultation/respond',
                        params: { consultationId: consultation.id, doctorId: consultation.doctor_id || '' },
                    })}
                >
                    <Text style={styles.composeText}>✍️ Compose Medical Response</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

// --- Reusable sub-components ---

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <View style={styles.sectionBody}>{children}</View>
        </View>
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

function Tag({ label, color }: { label: string; color: string }) {
    return (
        <View style={[styles.tag, { backgroundColor: `${color}22` }]}>
            <Text style={[styles.tagText, { color }]}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    backBtn: { ...typography.body, color: colors.accentTeal },
    headerTitle: { ...typography.h3, color: colors.textPrimary },
    headerBadge: { ...typography.caption, color: colors.gold, backgroundColor: colors.goldFaded, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    scroll: { padding: 20, paddingBottom: 40 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    loadingText: { ...typography.body, color: colors.textTertiary, marginTop: 12 },
    errorTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: 4 },
    errorMessage: { ...typography.body, color: colors.textTertiary, textAlign: 'center', marginBottom: 20 },
    retryButton: { backgroundColor: colors.accentTeal, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
    retryText: { ...typography.button, color: colors.bgPrimary },
    section: { marginBottom: 20 },
    sectionTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: 10 },
    sectionBody: { backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
    bodyText: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
    subTitle: { ...typography.caption, color: colors.accentTeal, fontWeight: '700', marginTop: 14, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
    tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
    tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    tagText: { fontSize: 11, fontWeight: '600' },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
    infoLabel: { ...typography.caption, color: colors.textTertiary, flex: 1 },
    infoValue: { ...typography.body, color: colors.textPrimary, flex: 2, textAlign: 'right' },
    listItem: { ...typography.body, color: colors.textSecondary, paddingVertical: 4 },
    dxRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
    dxName: { ...typography.caption, color: colors.textPrimary, width: 120 },
    dxBarBg: { flex: 1, height: 8, backgroundColor: colors.bgTertiary, borderRadius: 4, overflow: 'hidden' },
    dxBar: { height: '100%', backgroundColor: colors.accentTeal, borderRadius: 4 },
    dxPercent: { ...typography.caption, color: colors.textSecondary, width: 36, textAlign: 'right' },
    composeButton: { backgroundColor: colors.accentTeal, borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 8 },
    composeText: { ...typography.button, color: colors.bgPrimary, fontWeight: '700', fontSize: 16 },
});
