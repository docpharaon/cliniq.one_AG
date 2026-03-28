import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, TextInput, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card } from '@cliniqone/ui';
import { colors, spacing, typography, radius, shadows } from '@cliniqone/ui';
import { t, toLocalNum, localDate } from '@cliniqone/i18n';
import type { Consultation, ConsultationStatus } from '@cliniqone/types';
import { useAuthStore } from '../../stores/authStore';
import { useConsultations } from '../../hooks/useConsultations';
import { FadeIn } from '../../components/FadeIn';

const STATUS_FILTERS: { key: string; labelKey: string }[] = [
    { key: 'all', labelKey: 'consultations.filterAll' },
    { key: 'active', labelKey: 'consultations.filterActive' },
    { key: 'completed', labelKey: 'consultations.filterCompleted' },
];

const STATUS_CONFIG: Record<string, { labelKey: string; color: string; bg: string }> = {
    draft: { labelKey: 'consultations.statusDraft', color: colors.textTertiary, bg: colors.bgTertiary },
    intake_in_progress: { labelKey: 'consultations.statusIntake', color: colors.accentBlue, bg: colors.infoFaded },
    pending_payment: { labelKey: 'consultations.statusPending', color: colors.warning, bg: colors.warningFaded },
    submitted: { labelKey: 'consultations.statusSubmitted', color: colors.accentTeal, bg: colors.accentTealFaded },
    assigned: { labelKey: 'consultations.statusAssigned', color: colors.accentBlue, bg: colors.infoFaded },
    in_progress: { labelKey: 'consultations.statusInProgress', color: colors.accentBlue, bg: colors.infoFaded },
    inquiry_sent: { labelKey: 'consultations.statusInquirySent', color: colors.warning, bg: colors.warningFaded },
    report_ready: { labelKey: 'consultations.statusReportReady', color: colors.success, bg: colors.successFaded },
    completed: { labelKey: 'consultations.statusCompleted', color: colors.success, bg: colors.successFaded },
    cancelled: { labelKey: 'consultations.statusCancelled', color: colors.error, bg: colors.errorFaded },
};

function filterConsultations(consultations: Consultation[], filter: string): Consultation[] {
    if (filter === 'all') return consultations;
    if (filter === 'active') return consultations.filter((c) =>
        ['submitted', 'assigned', 'in_progress', 'report_ready', 'inquiry_sent', 'pending_payment', 'intake_in_progress'].includes(c.status)
    );
    if (filter === 'completed') return consultations.filter((c) => c.status === 'completed');
    return consultations;
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return t('consultations.justNow');
    if (hours < 24) return t('consultations.hoursAgo', { count: hours });
    const days = Math.floor(hours / 24);
    return t('consultations.daysAgo', { count: days });
}

// ── Report generation helper (plain-text fallback for native) ────
function generateReportText(consultation: Consultation, lang?: string): string {
    const report = consultation.report as Record<string, any> | null;
    if (!report) return '';
    const isAr = lang === 'ar' || lang === 'Arabic';

    // Helper to pick Arabic or English field
    const pick = (enKey: string, arKey: string) => {
        if (isAr && report[arKey]) return report[arKey];
        return report[enKey] || '';
    };

    const lines: string[] = [
        `MEDICAL CONSULTATION REPORT — cliniq.one`,
        `Date: ${new Date(consultation.created_at).toLocaleDateString()}`,
        `Case ID: ${consultation.id.slice(0, 8).toUpperCase()}`,
        `Status: ${consultation.status}`,
        ``,
        `CHIEF COMPLAINT:`,
        consultation.chief_complaint || 'N/A',
        ``,
    ];
    if (report.diagnosis) { lines.push(`DIAGNOSIS: ${report.diagnosis}`); }
    if (report.icd10 || report.icd10_code) { lines.push(`ICD-10: ${report.icd10 || report.icd10_code}`); }
    const tp = pick('treatment_plan', 'treatment_plan_ar');
    if (tp) { lines.push(``, isAr ? `خطة العلاج:` : `TREATMENT PLAN:`, tp); }
    const pe = pick('patient_education', 'patient_education_ar');
    if (pe) { lines.push(``, isAr ? `تثقيف المريض:` : `PATIENT EDUCATION:`, pe); }
    const np = pick('non_pharmacologic', 'non_pharmacologic_ar');
    if (np) { lines.push(``, isAr ? `العلاج غير الدوائي:` : `NON-PHARMACOLOGIC:`, np); }
    const fu = pick('follow_up', 'follow_up_ar');
    if (fu) { lines.push(``, isAr ? `المتابعة:` : `FOLLOW-UP:`, fu); }
    const ws = pick('warning_signs', 'warning_signs_ar');
    if (ws) { lines.push(``, isAr ? `علامات التحذير:` : `WARNING SIGNS:`, typeof ws === 'string' ? ws : (Array.isArray(ws) ? ws.join(', ') : '')); }
    const meds = consultation.prescription?.medications || report.prescriptions;
    if (meds?.length) {
        lines.push(``, `PRESCRIPTION:`);
        for (const rx of meds) {
            lines.push(`  - ${rx.name || rx.medication} — ${rx.dose || rx.dosage || ''} (${rx.duration || ''})`);
        }
    }
    lines.push(``, `--- cliniq.one ---`);
    lines.push(``, `DISCLAIMER: This report is generated from a telemedicine consultation. It does not constitute an in-person medical examination. Seek in-person care for emergencies.`);
    return lines.join('\n');
}

async function handleDownloadReport(consultation: Consultation, lang?: string) {
    if (!consultation.report) { Alert.alert('No Report', 'Report data is not available.'); return; }
    if (Platform.OS === 'web') {
        // Use PDF generation on web
        try {
            const { downloadPatientPdf } = await import('../../lib/generatePatientPdf');
            const success = await downloadPatientPdf(consultation, lang);
            if (!success) {
                Alert.alert('Error', 'Failed to generate PDF report.');
            }
        } catch {
            // Fallback to text if PDF fails
            const text = generateReportText(consultation, lang);
            const g = globalThis as any;
            const blob = new g.Blob([text], { type: 'text/plain' });
            const url = g.URL.createObjectURL(blob);
            const a = g.document.createElement('a');
            a.href = url;
            a.download = `consultation-report-${consultation.id.slice(0, 8)}.txt`;
            a.click();
            g.URL.revokeObjectURL(url);
        }
    } else {
        const text = generateReportText(consultation, lang);
        Alert.alert('Report', text);
    }
}

async function handleShareReport(consultation: Consultation, lang?: string) {
    if (!consultation.report) { Alert.alert('No Report', 'Report data is not available.'); return; }
    const g = globalThis as any;
    if (Platform.OS === 'web') {
        // Try PDF blob for sharing
        try {
            const { getPatientPdfBlob } = await import('../../lib/generatePatientPdf');
            const blob = await getPatientPdfBlob(consultation, lang);
            if (blob && g.navigator?.share) {
                const file = new (g.File)([blob], `cliniq-report-${consultation.id.slice(0, 8)}.pdf`, { type: 'application/pdf' });
                await g.navigator.share({ title: 'Medical Report', files: [file] });
                return;
            }
        } catch { /* fall through */ }
        // Fallback to text sharing
        const text = generateReportText(consultation, lang);
        if (g.navigator?.share) {
            try {
                await g.navigator.share({ title: 'Medical Report', text });
            } catch { /* user cancelled */ }
        } else if (g.navigator?.clipboard) {
            await g.navigator.clipboard.writeText(text);
            Alert.alert('Copied', 'Report copied to clipboard.');
        }
    } else {
        const text = generateReportText(consultation, lang);
        Alert.alert('Report', text);
    }
}

export default function ConsultationsScreen() {
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [sortNewest, setSortNewest] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { user } = useAuthStore();
    const { data: liveData, isLoading, refetch } = useConsultations(user?.id || '');

    // Use live data from Supabase
    const consultations = liveData || [];

    // Search + Filter + Sort
    let results = filterConsultations(consultations, filter);
    if (search.trim()) {
        const q = search.trim().toLowerCase();
        results = results.filter((c) =>
            (c.chief_complaint || '').toLowerCase().includes(q) ||
            (c.specialty || '').toLowerCase().includes(q)
        );
    }
    results = [...results].sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortNewest ? dateB - dateA : dateA - dateB;
    });

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.accentTeal}
                        colors={[colors.accentTeal]}
                    />
                }
            >
                <FadeIn delay={0}>
                <Text style={styles.title} accessibilityRole="header">{t('tabs.consultations')}</Text>
                </FadeIn>

                {/* Search Bar */}
                <FadeIn delay={100}>
                <View style={styles.searchBar} accessibilityLabel="Search consultations">
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                        style={styles.searchInput}
                        placeholder={t('consultations.searchPlaceholder')}
                        placeholderTextColor={colors.textTertiary}
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Text style={styles.clearBtn}>✕</Text>
                        </TouchableOpacity>
                    )}
                </View>
                </FadeIn>

                {/* Filters + Sort */}
                <FadeIn delay={200}>
                <View style={styles.filtersRow}>
                    <View style={styles.filters}>
                        {STATUS_FILTERS.map((f) => (
                            <TouchableOpacity
                                key={f.key}
                                style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
                                onPress={() => setFilter(f.key)}
                                accessibilityRole="button"
                                accessibilityState={{ selected: filter === f.key }}
                                accessibilityLabel={`Filter: ${t(f.labelKey)}`}
                            >
                                <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                                    {t(f.labelKey)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TouchableOpacity
                        style={styles.sortBtn}
                        onPress={() => setSortNewest(!sortNewest)}
                    >
                        <Text style={styles.sortText}>
                            {sortNewest ? '↓ ' + t('consultations.sortNewest') : '↑ ' + t('consultations.sortOldest')}
                        </Text>
                    </TouchableOpacity>
                </View>
                </FadeIn>

                {/* List */}
                {results.length === 0 ? (
                    <Card variant="outlined">
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyIcon}>📋</Text>
                            <Text style={styles.emptyTitle}>{t('dashboard.noConsults')}</Text>
                            <Text style={styles.emptySubtitle}>{t('dashboard.startFirst')}</Text>
                        </View>
                    </Card>
                ) : (
                    results.map((consultation) => {
                        const status = STATUS_CONFIG[consultation.status] || { labelKey: consultation.status, color: colors.textTertiary, bg: colors.bgTertiary };
                        return (
                            <TouchableOpacity
                                key={consultation.id}
                                style={styles.consultCard}
                                activeOpacity={0.8}
                                onPress={() => router.push({
                                    pathname: '/consultation/[id]',
                                    params: { id: consultation.id },
                                })}
                                accessibilityLabel={`${consultation.specialty || 'General'} consultation: ${consultation.chief_complaint || ''}`}
                                accessibilityRole="button"
                            >
                                <View style={styles.consultHeader}>
                                    <View style={styles.consultSpecialty}>
                                        <Text style={styles.consultIcon}>🩺</Text>
                                        <Text style={styles.consultSpecialtyText}>
                                            {(consultation.specialty || t('consultations.general')).replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                                        </Text>
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                                        <Text style={[styles.statusText, { color: status.color }]}>{t(status.labelKey)}</Text>
                                    </View>
                                </View>

                                <Text style={styles.consultComplaint} numberOfLines={2}>
                                    {consultation.chief_complaint}
                                </Text>

                                <View style={styles.consultFooter}>
                                    <Text style={styles.consultTime}>{timeAgo(consultation.created_at)}</Text>
                                    <Text style={styles.consultCost}>{toLocalNum(consultation.token_cost)} {t('tokens.tokensLabel')}</Text>
                                </View>

                                {consultation.status === 'completed' && consultation.report && (
                                    <View style={styles.reportBanner}>
                                        <Text style={styles.reportBannerText}>{t('consultations.reportAvailable')}</Text>
                                        <View style={styles.reportActions}>
                                            <TouchableOpacity style={styles.reportActionBtn} onPress={() => handleDownloadReport(consultation, user?.language)}>
                                                <Text style={styles.reportActionText}>📥 {t('consultations.downloadReport')}</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.reportActionBtn} onPress={() => handleShareReport(consultation, user?.language)}>
                                                <Text style={styles.reportActionText}>📤 {t('consultations.shareReport')}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}

                                {/* Intervention notification */}
                                {consultation.status === 'completed' && consultation.report && (
                                    <View style={styles.interventionBanner}>
                                        <Text style={styles.interventionBannerText}>{t('consultations.interventionsSuggested')}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })
                )}

                {/* Start New */}
                <View style={{ marginTop: spacing.xl }}>
                    <Button
                        title={t('consultations.startNewConsultation')}
                        onPress={() => router.push('/intake')}
                        variant="outline"
                        size="lg"
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing['2xl'], paddingBottom: spacing['4xl'] },
    title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.lg },

    // Filters
    filters: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
    filterChip: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radius.full,
        backgroundColor: colors.bgTertiary,
        borderWidth: 1,
        borderColor: colors.border,
    },
    filterChipActive: { backgroundColor: colors.accentTealFaded, borderColor: colors.accentTeal },
    filterText: { ...typography.bodySm, color: colors.textSecondary },
    filterTextActive: { color: colors.accentTeal, fontWeight: '600' },

    // Consultation Card
    consultCard: {
        backgroundColor: colors.bgCard,
        borderRadius: radius.xl,
        padding: spacing.lg,
        marginBottom: spacing.md,
        ...shadows.card,
        borderWidth: 1,
        borderColor: colors.border,
    },
    consultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
    consultSpecialty: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    consultIcon: { fontSize: 18 },
    consultSpecialtyText: { ...typography.label, color: colors.textSecondary },
    statusBadge: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.full },
    statusText: { ...typography.caption, fontWeight: '700' },
    consultComplaint: { ...typography.body, color: colors.textPrimary, marginBottom: spacing.md, lineHeight: 20 },
    consultFooter: { flexDirection: 'row', justifyContent: 'space-between' },
    consultTime: { ...typography.caption, color: colors.textTertiary },
    consultCost: { ...typography.caption, color: colors.textTertiary },

    reportBanner: {
        backgroundColor: colors.successFaded,
        marginTop: spacing.md,
        padding: spacing.sm,
        borderRadius: radius.md,
        alignItems: 'center',
    },
    reportBannerText: { ...typography.bodySm, color: colors.success, fontWeight: '600' },
    reportActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    reportActionBtn: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: radius.md,
        backgroundColor: colors.successFaded,
    },
    reportActionText: { ...typography.caption, color: colors.success, fontWeight: '600' },

    // Intervention Banner
    interventionBanner: {
        backgroundColor: colors.accentTealFaded,
        marginTop: spacing.sm,
        padding: spacing.sm,
        borderRadius: radius.md,
        alignItems: 'center',
    },
    interventionBannerText: { ...typography.bodySm, color: colors.accentTeal, fontWeight: '600' },

    // Search
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgCard,
        borderRadius: radius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        gap: spacing.sm,
    },
    searchIcon: { fontSize: 16 },
    searchInput: { flex: 1, ...typography.body, color: colors.textPrimary, padding: 0 },
    clearBtn: { ...typography.body, color: colors.textTertiary, paddingHorizontal: spacing.xs },

    // Filters row
    filtersRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
    sortBtn: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: radius.full,
        backgroundColor: colors.bgTertiary,
    },
    sortText: { ...typography.caption, color: colors.textSecondary },

    // Empty
    emptyState: { alignItems: 'center', paddingVertical: spacing['3xl'] },
    emptyIcon: { fontSize: 48, marginBottom: spacing.md },
    emptyTitle: { ...typography.body, color: colors.textSecondary, fontWeight: '600' },
    emptySubtitle: { ...typography.bodySm, color: colors.textTertiary, marginTop: spacing.xs },
});
