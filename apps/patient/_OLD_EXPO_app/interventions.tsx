import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius, shadows } from '@cliniqone/ui';
import { useAuthStore } from '../stores/authStore';
import { INTERVENTION_TYPE_LABELS, INTERVENTION_STATUS_LABELS } from '@cliniqone/types';
import type { InterventionType, InterventionStatus } from '@cliniqone/types';

// ── Status color mapping ────────────────────────
const STATUS_COLORS: Record<string, string> = {
    ordered: colors.warning,
    pending_auth: colors.warning,
    authorized: colors.info,
    scheduled: colors.info,
    in_progress: colors.info,
    completed: colors.success,
    results_ready: colors.success,
    reviewed: colors.success,
    cancelled: colors.error,
};

// ── Filter tabs ──────────────────────────────────
type FilterTab = 'all' | 'active' | 'completed';
const FILTER_TABS: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'completed', label: 'Completed' },
];

const ACTIVE_STATUSES: InterventionStatus[] = ['ordered', 'pending_auth', 'authorized', 'scheduled', 'in_progress'];
const COMPLETED_STATUSES: InterventionStatus[] = ['completed', 'results_ready', 'reviewed'];

// ──────────────────────────────────────────────────
// Mock data (remove when Supabase tables are ready)
// ──────────────────────────────────────────────────

const MOCK_INTERVENTIONS = [
    {
        id: '1',
        title: 'Complete Blood Count',
        type: 'lab_test' as InterventionType,
        status: 'ordered' as InterventionStatus,
        priority: 'routine',
        category: 'Hematology',
        instructions_for_patient: 'Fast for 12 hours before the test.',
        estimated_cost_sar: 120,
        provider_name: 'Saudi German Hospital Lab',
        scheduled_at: null,
        created_at: new Date().toISOString(),
    },
    {
        id: '2',
        title: 'Chest X-Ray',
        type: 'imaging' as InterventionType,
        status: 'scheduled' as InterventionStatus,
        priority: 'urgent',
        category: 'Radiology',
        instructions_for_patient: 'Remove all metal jewelry before the scan.',
        estimated_cost_sar: 350,
        provider_name: 'Dr. Sulaiman Al-Habib Imaging',
        scheduled_at: '2026-02-25T10:00:00Z',
        created_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
        id: '3',
        title: 'Dermatology Referral',
        type: 'referral' as InterventionType,
        status: 'completed' as InterventionStatus,
        priority: 'routine',
        category: 'Dermatology',
        instructions_for_patient: 'Bring previous consultation reports.',
        estimated_cost_sar: 200,
        provider_name: 'King Fahd Specialist Hospital',
        scheduled_at: '2026-02-20T14:30:00Z',
        created_at: new Date(Date.now() - 172800000).toISOString(),
    },
];

// ──────────────────────────────────────────────────
// Main Screen
// ──────────────────────────────────────────────────

export default function InterventionsScreen() {
    const { user } = useAuthStore();
    const [filter, setFilter] = useState<FilterTab>('all');
    const [refreshing, setRefreshing] = useState(false);
    const [loading] = useState(false);

    // TODO: Replace with Supabase query
    const interventions = MOCK_INTERVENTIONS;

    const filtered = interventions.filter(item => {
        if (filter === 'active') return ACTIVE_STATUSES.includes(item.status);
        if (filter === 'completed') return COMPLETED_STATUSES.includes(item.status);
        return true;
    });

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        // TODO: refetch from Supabase
        setTimeout(() => setRefreshing(false), 500);
    }, []);

    const getTypeInfo = (type: InterventionType) => INTERVENTION_TYPE_LABELS[type];
    const getStatusInfo = (status: InterventionStatus) => INTERVENTION_STATUS_LABELS[status];

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.backBtn}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Interventions</Text>
                <View style={{ width: 60 }} />
            </View>

            {/* Summary Card */}
            <View style={styles.summaryCard}>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>
                        {interventions.filter(i => ACTIVE_STATUSES.includes(i.status)).length}
                    </Text>
                    <Text style={styles.summaryLabel}>Active</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>
                        {interventions.filter(i => i.scheduled_at).length}
                    </Text>
                    <Text style={styles.summaryLabel}>Scheduled</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>
                        {interventions.filter(i => COMPLETED_STATUSES.includes(i.status)).length}
                    </Text>
                    <Text style={styles.summaryLabel}>Done</Text>
                </View>
            </View>

            {/* Filter tabs */}
            <View style={styles.filterRow}>
                {FILTER_TABS.map(tab => (
                    <TouchableOpacity
                        key={tab.id}
                        style={[styles.filterTab, filter === tab.id && styles.filterTabActive]}
                        onPress={() => setFilter(tab.id)}
                    >
                        <Text style={[styles.filterText, filter === tab.id && styles.filterTextActive]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

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
                {loading ? (
                    <ActivityIndicator color={colors.accentTeal} style={{ marginVertical: spacing['4xl'] }} />
                ) : filtered.length > 0 ? (
                    <View style={{ gap: spacing.md }}>
                        {filtered.map(item => {
                            const typeInfo = getTypeInfo(item.type);
                            const statusInfo = getStatusInfo(item.status);
                            const statusColor = STATUS_COLORS[item.status] || colors.textTertiary;

                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={styles.card}
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        // TODO: Navigate to intervention detail
                                    }}
                                >
                                    {/* Top row: icon + title + status */}
                                    <View style={styles.cardTop}>
                                        <View style={styles.cardIconWrap}>
                                            <Text style={styles.cardIcon}>{typeInfo.icon}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.cardTitle}>{item.title}</Text>
                                            <Text style={styles.cardCategory}>{typeInfo.en} • {item.category}</Text>
                                        </View>
                                        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                                            <Text style={[styles.statusText, { color: statusColor }]}>
                                                {statusInfo.en}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Details */}
                                    <View style={styles.cardDetails}>
                                        {item.provider_name && (
                                            <View style={styles.detailRow}>
                                                <Text style={styles.detailIcon}>🏥</Text>
                                                <Text style={styles.detailText}>{item.provider_name}</Text>
                                            </View>
                                        )}
                                        {item.scheduled_at && (
                                            <View style={styles.detailRow}>
                                                <Text style={styles.detailIcon}>📅</Text>
                                                <Text style={styles.detailText}>
                                                    {new Date(item.scheduled_at).toLocaleDateString('en-US', {
                                                        weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                                                    })}
                                                </Text>
                                            </View>
                                        )}
                                        {item.estimated_cost_sar && (
                                            <View style={styles.detailRow}>
                                                <Text style={styles.detailIcon}>💰</Text>
                                                <Text style={styles.detailText}>{item.estimated_cost_sar} SAR</Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Patient instructions */}
                                    {item.instructions_for_patient && (
                                        <View style={styles.instructionBox}>
                                            <Text style={styles.instructionLabel}>📋 Instructions</Text>
                                            <Text style={styles.instructionText}>{item.instructions_for_patient}</Text>
                                        </View>
                                    )}

                                    {/* Priority badge for urgent/stat */}
                                    {item.priority !== 'routine' && (
                                        <View style={[styles.priorityBadge, { backgroundColor: item.priority === 'stat' ? colors.error + '20' : colors.warning + '20' }]}>
                                            <Text style={{ color: item.priority === 'stat' ? colors.error : colors.warning, ...typography.caption, fontWeight: '700' }}>
                                                {item.priority === 'stat' ? '🔴 STAT' : '🟡 Urgent'}
                                            </Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>🧪</Text>
                        <Text style={styles.emptyTitle}>No interventions</Text>
                        <Text style={styles.emptySubtitle}>
                            {filter === 'all'
                                ? 'You have no ordered interventions yet.'
                                : filter === 'active'
                                    ? 'No active interventions right now.'
                                    : 'No completed interventions yet.'}
                        </Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

// ──────────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
        borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    backBtn: { ...typography.body, color: colors.accentTeal },
    headerTitle: { ...typography.h3, color: colors.textPrimary },

    // Summary card
    summaryCard: {
        flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
        backgroundColor: colors.bgCard, marginHorizontal: spacing.xl, marginTop: spacing.lg,
        borderRadius: radius.xl, padding: spacing.lg, ...shadows.card,
    },
    summaryItem: { alignItems: 'center' },
    summaryValue: { fontSize: 28, fontWeight: '800', color: colors.accentTeal },
    summaryLabel: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.xxs },
    summaryDivider: { width: 1, height: 32, backgroundColor: colors.border },

    // Filter
    filterRow: {
        flexDirection: 'row', gap: spacing.sm,
        paddingHorizontal: spacing.xl, paddingVertical: spacing.lg,
    },
    filterTab: {
        paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
        borderRadius: radius.full, backgroundColor: colors.bgCard,
    },
    filterTabActive: { backgroundColor: colors.accentTealFaded, borderWidth: 1, borderColor: colors.accentTeal + '40' },
    filterText: { ...typography.buttonSm, color: colors.textTertiary },
    filterTextActive: { color: colors.accentTeal, fontWeight: '700' },

    // Scroll
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing['4xl'] },

    // Intervention card
    card: {
        backgroundColor: colors.bgCard, borderRadius: radius.xl,
        padding: spacing.lg, ...shadows.card,
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    cardIconWrap: {
        width: 44, height: 44, borderRadius: radius.lg,
        backgroundColor: colors.accentTealFaded,
        alignItems: 'center', justifyContent: 'center',
    },
    cardIcon: { fontSize: 22 },
    cardTitle: { ...typography.body, color: colors.textPrimary, fontWeight: '700' },
    cardCategory: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.xxs },

    // Status badge
    statusBadge: {
        paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
        borderRadius: radius.full, marginLeft: spacing.sm,
    },
    statusText: { ...typography.caption, fontWeight: '600', fontSize: 11 },

    // Details
    cardDetails: { marginTop: spacing.md, gap: spacing.sm },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    detailIcon: { fontSize: 14 },
    detailText: { ...typography.bodySm, color: colors.textSecondary },

    // Instructions
    instructionBox: {
        marginTop: spacing.md, backgroundColor: colors.warningFaded,
        borderRadius: radius.md, padding: spacing.md,
    },
    instructionLabel: { ...typography.caption, color: colors.warning, fontWeight: '700', marginBottom: spacing.xxs },
    instructionText: { ...typography.bodySm, color: colors.textSecondary },

    // Priority badge
    priorityBadge: {
        marginTop: spacing.md, alignSelf: 'flex-start',
        paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
        borderRadius: radius.full,
    },

    // Empty state
    emptyState: { alignItems: 'center', paddingVertical: spacing['4xl'] },
    emptyIcon: { fontSize: 48, marginBottom: spacing.md },
    emptyTitle: { ...typography.body, color: colors.textSecondary, fontWeight: '600' },
    emptySubtitle: { ...typography.bodySm, color: colors.textTertiary, marginTop: spacing.xs, textAlign: 'center' },
});
