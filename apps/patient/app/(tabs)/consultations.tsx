import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, TextInput } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card } from '@cliniqone/ui';
import { colors, spacing, typography, radius, shadows } from '@cliniqone/ui';
import { t } from '@cliniqone/i18n';
import type { Consultation, ConsultationStatus } from '@cliniqone/types';
import { useAuthStore } from '../../stores/authStore';
import { useConsultations } from '../../hooks/useConsultations';

const STATUS_FILTERS: { key: string; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Completed' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    draft: { label: 'Draft', color: colors.textTertiary, bg: colors.bgTertiary },
    intake_in_progress: { label: 'Intake', color: colors.accentBlue, bg: colors.infoFaded },
    pending_payment: { label: 'Pending', color: colors.warning, bg: colors.warningFaded },
    submitted: { label: 'Submitted', color: colors.accentTeal, bg: colors.accentTealFaded },
    assigned: { label: 'Assigned', color: colors.accentBlue, bg: colors.infoFaded },
    in_progress: { label: 'In Progress', color: colors.accentBlue, bg: colors.infoFaded },
    report_ready: { label: 'Report Ready', color: colors.success, bg: colors.successFaded },
    completed: { label: 'Completed', color: colors.success, bg: colors.successFaded },
    cancelled: { label: 'Cancelled', color: colors.error, bg: colors.errorFaded },
};

function filterConsultations(consultations: Consultation[], filter: string): Consultation[] {
    if (filter === 'all') return consultations;
    if (filter === 'active') return consultations.filter((c) =>
        ['submitted', 'assigned', 'in_progress', 'report_ready'].includes(c.status)
    );
    if (filter === 'completed') return consultations.filter((c) => c.status === 'completed');
    return consultations;
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
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
                <Text style={styles.title}>{t('tabs.consultations')}</Text>

                {/* Search Bar */}
                <View style={styles.searchBar}>
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

                {/* Filters + Sort */}
                <View style={styles.filtersRow}>
                    <View style={styles.filters}>
                        {STATUS_FILTERS.map((f) => (
                            <TouchableOpacity
                                key={f.key}
                                style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
                                onPress={() => setFilter(f.key)}
                            >
                                <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                                    {f.label}
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
                        const status = STATUS_CONFIG[consultation.status];
                        return (
                            <TouchableOpacity
                                key={consultation.id}
                                style={styles.consultCard}
                                activeOpacity={0.8}
                                onPress={() => router.push({
                                    pathname: '/consultation/[id]',
                                    params: { id: consultation.id },
                                })}
                            >
                                <View style={styles.consultHeader}>
                                    <View style={styles.consultSpecialty}>
                                        <Text style={styles.consultIcon}>🩺</Text>
                                        <Text style={styles.consultSpecialtyText}>
                                            {consultation.specialty === 'dermatology' ? 'Dermatology' : 'Family Medicine'}
                                        </Text>
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                                        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                                    </View>
                                </View>

                                <Text style={styles.consultComplaint} numberOfLines={2}>
                                    {consultation.chief_complaint}
                                </Text>

                                <View style={styles.consultFooter}>
                                    <Text style={styles.consultTime}>{timeAgo(consultation.created_at)}</Text>
                                    <Text style={styles.consultCost}>{consultation.token_cost} tokens</Text>
                                </View>

                                {consultation.status === 'completed' && consultation.report && (
                                    <View style={styles.reportBanner}>
                                        <Text style={styles.reportBannerText}>📋 Report & Prescription Available</Text>
                                        <View style={styles.reportActions}>
                                            <TouchableOpacity style={styles.reportActionBtn}>
                                                <Text style={styles.reportActionText}>📥 {t('consultations.downloadReport')}</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.reportActionBtn}>
                                                <Text style={styles.reportActionText}>📤 {t('consultations.shareReport')}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}

                                {/* Intervention notification */}
                                {consultation.status === 'completed' && consultation.report && (
                                    <View style={styles.interventionBanner}>
                                        <Text style={styles.interventionBannerText}>🧪 Interventions suggested — View details</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })
                )}

                {/* Start New */}
                <View style={{ marginTop: spacing.xl }}>
                    <Button
                        title="🩺 Start New Consultation"
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
