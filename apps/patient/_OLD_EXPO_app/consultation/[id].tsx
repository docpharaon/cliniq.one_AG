import { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card } from '@cliniqone/ui';
import { colors, spacing, typography, radius, shadows } from '@cliniqone/ui';
import { t, localDate, toLocalNum } from '@cliniqone/i18n';
import type { Consultation, Message as MessageType, CatalogIntervention } from '@cliniqone/types';
import { INTERVENTION_TYPE_LABELS } from '@cliniqone/types';
import { useConsultation, useMessages, useSendMessage } from '../../hooks/useConsultations';
import { useAuthStore } from '../../stores/authStore';
import { PatientRefundModal } from '../../components/PatientRefundModal';

/** Compute initials from a doctor display name, e.g. "Dr. Sarah Ahmed" → "SA" */
function getInitials(name: string): string {
    const parts = name.replace(/^Dr\.?\s*/i, '').trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    if (parts.length === 1 && parts[0]) return parts[0].substring(0, 2).toUpperCase();
    return '??';
}

export default function ConsultationDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuthStore();
    const scrollRef = useRef<ScrollView>(null);
    const [messageText, setMessageText] = useState('');
    const [showRefund, setShowRefund] = useState(false);

    // Live data from API
    const { data: consultation, isLoading: loadingConsult } = useConsultation(id);
    const { data: messages, isLoading: loadingMessages } = useMessages(id);
    const sendMessage = useSendMessage(id);

    // Extract doctor info from the joined consultation data
    const doctor = (consultation as any)?.doctor as {
        id: string;
        full_name: string;
        display_name: string;
        specialty: string;
        sub_specialty: string | null;
        hospital: string | null;
        city: string | null;
        rating_avg: number;
        rating_count: number;
        years_experience: number | null;
        avatar_url: string | null;
    } | null;

    const doctorDisplayName = doctor?.display_name || doctor?.full_name || 'Doctor';
    const doctorInitials = doctor ? getInitials(doctor.display_name || doctor.full_name) : '??';

    const report = consultation?.report as Record<string, any> | null;
    const prescription = consultation?.prescription as Record<string, any> | null;
    const isActive = consultation?.status === 'assigned' || consultation?.status === 'in_progress' || consultation?.status === 'inquiry_sent';
    const isLoading = loadingConsult || loadingMessages;

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (messages?.length) {
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
        }
    }, [messages?.length]);

    function handleSendMessage() {
        if (!messageText.trim() || !user?.id) return;
        sendMessage.mutate({
            consultationId: id,
            senderId: user.id,
            senderRole: 'patient' as const,
            content: messageText.trim(),
        });
        setMessageText('');
    }

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.accentTeal} />
                <Text style={[styles.statusLabel, { marginTop: spacing.md }]}>{t('common.loading')}</Text>
            </SafeAreaView>
        );
    }

    if (!consultation) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={styles.statusLabel}>{t('consultDetail.notFound')}</Text>
                <TouchableOpacity onPress={() => router.back()} style={{ marginTop: spacing.lg }}>
                    <Text style={styles.backText}>{t('consultDetail.goBack')}</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={0}
            >
                <ScrollView
                    ref={scrollRef}
                    contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <Text style={styles.backText}>← {t('common.back')}</Text>
                        </TouchableOpacity>
                        <Text style={styles.title}>{t('consultDetail.title')}</Text>
                    </View>

                    {/* Status Banner */}
                    <View style={[styles.statusBanner, consultation.status === 'completed' ? styles.statusCompleted : styles.statusActive]}>
                        <Text style={styles.statusIcon}>{consultation.status === 'completed' ? '✅' : consultation.status === 'inquiry_sent' ? '🔍' : '🔄'}</Text>
                        <View>
                            <Text style={styles.statusLabel}>
                                {consultation.status === 'completed' ? t('consultDetail.completed') : consultation.status === 'assigned' ? t('consultDetail.doctorReviewing') : consultation.status === 'inquiry_sent' ? 'Inquiry Sent' : t('consultDetail.inProgress')}
                            </Text>
                            <Text style={styles.statusTime}>
                                {localDate(consultation.created_at)}
                            </Text>
                        </View>
                    </View>

                    {/* Chief Complaint */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('consultDetail.chiefComplaint')}</Text>
                        <Text style={styles.complaintText}>{consultation.chief_complaint || t('consultDetail.noComplaint')}</Text>
                    </View>

                    {/* Doctor Card */}
                    {doctor && (
                        <View style={styles.doctorCard}>
                            <View style={styles.doctorAvatar}>
                                <Text style={styles.doctorAvatarText}>{doctorInitials}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.doctorName}>{doctorDisplayName}</Text>
                                <Text style={styles.doctorSpecialty}>
                                    {doctor.specialty ? doctor.specialty.charAt(0).toUpperCase() + doctor.specialty.slice(1).replace('_', ' ') : ''}
                                    {doctor.hospital ? ` • ${doctor.hospital}` : ''}
                                </Text>
                                <View style={styles.doctorStats}>
                                    {doctor.rating_avg > 0 && (
                                        <Text style={styles.doctorStat}>⭐ {doctor.rating_avg}</Text>
                                    )}
                                    {doctor.years_experience && (
                                        <Text style={styles.doctorStat}>🏥 {t('consultDetail.yearsExperience', { count: doctor.years_experience })}</Text>
                                    )}
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Messages / Timeline */}
                    <Text style={styles.sectionTitle}>{t('consultDetail.conversation')}</Text>
                    <View style={styles.messagesContainer}>
                        {messages && messages.length > 0 ? (
                            messages.map((msg) => (
                                <View
                                    key={msg.id}
                                    style={[
                                        styles.messageBubble,
                                        msg.sender_role === 'system' ? styles.systemMsg :
                                            msg.sender_role === 'doctor' ? styles.doctorMsg :
                                                styles.patientMsg,
                                    ]}
                                >
                                    {msg.sender_role === 'system' && <Text style={styles.systemIcon}>ℹ️</Text>}
                                    {msg.sender_role === 'doctor' && <Text style={styles.senderLabel}>{doctorDisplayName}</Text>}
                                    {msg.sender_role === 'patient' && <Text style={styles.senderLabelPatient}>{t('consultDetail.you')}</Text>}
                                    <Text style={[
                                        styles.messageText,
                                        msg.sender_role === 'system' && styles.systemText,
                                    ]}>
                                        {msg.content}
                                    </Text>
                                    <Text style={styles.messageTime}>
                                        {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>
                            ))
                        ) : (
                            // Show AI chat from ai_summary when no messages exist yet
                            (() => {
                                const aiData = consultation.ai_summary as Record<string, any> | null;
                                const qaHistory = aiData?.qaHistory as { question: string; answer: string }[] | undefined;

                                if (qaHistory && qaHistory.length > 0) {
                                    return qaHistory.map((qa, idx) => (
                                        <View key={idx}>
                                            {/* AI question */}
                                            <View style={[styles.messageBubble, styles.doctorMsg]}>
                                                <Text style={styles.senderLabel}>{t('consultDetail.aiAssistant')}</Text>
                                                <Text style={styles.messageText}>{qa.question}</Text>
                                            </View>
                                            {/* Patient answer */}
                                            <View style={[styles.messageBubble, styles.patientMsg]}>
                                                <Text style={styles.senderLabelPatient}>{t('consultDetail.you')}</Text>
                                                <Text style={styles.messageText}>{qa.answer}</Text>
                                            </View>
                                        </View>
                                    ));
                                }
                                return <Text style={styles.complaintText}>{t('consultDetail.noMessages')}</Text>;
                            })()
                        )}
                    </View>

                    {/* Report */}
                    {report && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{t('consultDetail.medicalReport')}</Text>
                            <View style={styles.reportCard}>
                                {report.diagnosis && <ReportRow label={t('consultDetail.diagnosis')} value={report.diagnosis as string} />}
                                {report.icd10 && <ReportRow label={t('consultDetail.icd10')} value={report.icd10 as string} />}
                                {report.treatment && <ReportRow label={t('consultDetail.treatmentPlan')} value={report.treatment as string} />}
                                {report.followUp && <ReportRow label={t('consultDetail.followUp')} value={report.followUp as string} />}
                            </View>
                        </View>
                    )}

                    {/* Prescription */}
                    {prescription?.medications && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{t('consultDetail.ePrescription')}</Text>
                            {(prescription.medications as any[]).map((med: any, idx: number) => (
                                <View key={idx} style={styles.prescriptionItem}>
                                    <Text style={styles.prescMedName}>💊 {med.name}</Text>
                                    <Text style={styles.prescDetail}>{t('consultDetail.dosage')}: {med.dosage}</Text>
                                    <Text style={styles.prescDetail}>{t('consultDetail.duration')}: {med.duration}</Text>
                                </View>
                            ))}
                            <View style={styles.prescNote}>
                                <Text style={styles.prescNoteText}>{t('consultDetail.mohCompliant')}</Text>
                            </View>
                        </View>
                    )}

                    {/* Follow-up CTA */}
                    {consultation.status === 'completed' && (
                        <View style={{ marginTop: spacing.xl, marginBottom: spacing.md }}>
                            <Button
                                title={t('consultDetail.startFollowUp')}
                                onPress={() => router.push('/intake')}
                                variant="outline"
                                size="lg"
                            />
                        </View>
                    )}

                    {/* Refund Request */}
                    {(consultation.status === 'report_ready' || consultation.status === 'completed') && (
                        <TouchableOpacity
                            style={styles.refundButton}
                            onPress={() => setShowRefund(true)}
                        >
                            <Text style={styles.refundButtonText}>↩️ Request Refund</Text>
                        </TouchableOpacity>
                    )}
                </ScrollView>

                {/* Message Input Bar (only for active consultations) */}
                {isActive && (
                    <View style={styles.inputBar}>
                        <TextInput
                            style={styles.inputField}
                            value={messageText}
                            onChangeText={setMessageText}
                            placeholder={t('consultDetail.typeMessage')}
                            placeholderTextColor={colors.textTertiary}
                            multiline
                            maxLength={500}
                        />
                        <TouchableOpacity
                            style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
                            onPress={handleSendMessage}
                            disabled={!messageText.trim() || sendMessage.isPending}
                        >
                            <Text style={styles.sendButtonText}>
                                {sendMessage.isPending ? '...' : '➤'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </KeyboardAvoidingView>

            {/* Refund Modal */}
            <PatientRefundModal
                visible={showRefund}
                onClose={() => setShowRefund(false)}
                consultationId={consultation.id}
                patientId={user?.id || ''}
                tokenCost={consultation.token_cost || 3}
                onSuccess={() => setShowRefund(false)}
            />
        </SafeAreaView>
    );
}

function ReportRow({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.reportRow}>
            <Text style={styles.reportLabel}>{label}</Text>
            <Text style={styles.reportValue}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing['4xl'] },
    header: { paddingTop: spacing.lg, marginBottom: spacing.xl },
    backButton: { marginBottom: spacing.md },
    backText: { ...typography.body, color: colors.accentTeal },
    title: { ...typography.h2, color: colors.textPrimary },

    // Status
    statusBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.lg,
        borderRadius: radius.lg,
        marginBottom: spacing['2xl'],
    },
    statusCompleted: { backgroundColor: colors.successFaded },
    statusActive: { backgroundColor: colors.infoFaded },
    statusIcon: { fontSize: 24 },
    statusLabel: { ...typography.h4, color: colors.textPrimary },
    statusTime: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },

    // Section
    section: { marginBottom: spacing['2xl'] },
    sectionTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: spacing.md },
    complaintText: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },

    // Doctor
    doctorCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.lg,
        backgroundColor: colors.bgCard,
        padding: spacing.lg,
        borderRadius: radius.xl,
        marginBottom: spacing['2xl'],
        ...shadows.card,
    },
    doctorAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: colors.accentTealFaded,
        justifyContent: 'center',
        alignItems: 'center',
    },
    doctorAvatarText: { ...typography.h4, color: colors.accentTeal },
    doctorName: { ...typography.h4, color: colors.textPrimary },
    doctorSpecialty: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
    doctorStats: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.xs },
    doctorStat: { ...typography.caption, color: colors.textTertiary },

    // Messages
    messagesContainer: { gap: spacing.sm, marginBottom: spacing['2xl'] },
    messageBubble: { padding: spacing.md, borderRadius: radius.lg, maxWidth: '85%' as any },
    systemMsg: {
        alignSelf: 'center',
        backgroundColor: colors.bgTertiary,
        maxWidth: '100%' as any,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    doctorMsg: { alignSelf: 'flex-start', backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
    patientMsg: { alignSelf: 'flex-end', backgroundColor: colors.accentTealFaded },
    systemIcon: { fontSize: 14 },
    senderLabel: { ...typography.caption, color: colors.accentTeal, fontWeight: '700', marginBottom: 4 },
    senderLabelPatient: { ...typography.caption, color: colors.textSecondary, fontWeight: '600', marginBottom: 4 },
    messageText: { ...typography.body, color: colors.textPrimary, lineHeight: 20 },
    systemText: { ...typography.bodySm, color: colors.textSecondary },
    messageTime: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.xs, textAlign: 'right' },

    // Report
    reportCard: {
        backgroundColor: colors.bgCard,
        borderRadius: radius.lg,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    reportRow: { paddingVertical: spacing.sm, borderBottomWidth: 0.5, borderBottomColor: colors.border },
    reportLabel: { ...typography.label, color: colors.textTertiary, marginBottom: 4 },
    reportValue: { ...typography.body, color: colors.textPrimary },

    // Prescription
    prescriptionItem: {
        backgroundColor: colors.bgCard,
        padding: spacing.lg,
        borderRadius: radius.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    prescMedName: { ...typography.body, color: colors.textPrimary, fontWeight: '600', marginBottom: spacing.xs },
    prescDetail: { ...typography.bodySm, color: colors.textSecondary, marginTop: 2 },
    prescNote: {
        backgroundColor: colors.successFaded,
        padding: spacing.md,
        borderRadius: radius.md,
        alignItems: 'center',
        marginTop: spacing.sm,
    },
    prescNoteText: { ...typography.bodySm, color: colors.success, fontWeight: '600' },

    // Interventions
    interventionNotice: {
        backgroundColor: colors.accentTealFaded,
        padding: spacing.md,
        borderRadius: radius.md,
        marginBottom: spacing.md,
    },
    interventionNoticeText: { ...typography.bodySm, color: colors.accentTeal, fontWeight: '500' },
    interventionCard: {
        backgroundColor: colors.bgCard,
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    interventionCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    interventionName: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
    interventionMeta: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },
    interventionPrice: {
        backgroundColor: colors.warningFaded,
        paddingHorizontal: spacing.md,
        paddingVertical: 4,
        borderRadius: radius.md,
    },
    interventionPriceText: { ...typography.caption, color: colors.warning, fontWeight: '700' },
    interventionInstructions: {
        backgroundColor: colors.bgTertiary,
        padding: spacing.sm,
        borderRadius: radius.md,
        marginTop: spacing.sm,
    },
    interventionInstructionsText: { ...typography.caption, color: colors.textSecondary },
    bookBtn: {
        backgroundColor: colors.accentTeal,
        borderRadius: radius.md,
        paddingVertical: spacing.md,
        alignItems: 'center',
        marginTop: spacing.md,
    },
    bookBtnText: { ...typography.button, color: '#fff', fontWeight: '700' },

    // Input Bar
    inputBar: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.bgCard,
    },
    inputField: {
        flex: 1,
        ...typography.body,
        color: colors.textPrimary,
        backgroundColor: colors.bgTertiary,
        borderRadius: radius.lg,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        maxHeight: 100,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.accentTeal,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: { opacity: 0.4 },
    sendButtonText: { fontSize: 18, color: '#fff' },

    // Refund
    refundButton: {
        backgroundColor: colors.warningFaded,
        borderWidth: 1,
        borderColor: colors.warning,
        borderRadius: radius.lg,
        paddingVertical: spacing.md,
        alignItems: 'center',
        marginBottom: spacing['2xl'],
    },
    refundButtonText: { ...typography.button, color: colors.warning, fontWeight: '600', fontSize: 14 },
});
