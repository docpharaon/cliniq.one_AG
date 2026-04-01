import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography } from '@cliniqone/ui';
import { useAuthStore } from '../../stores/authStore';
import { usePendingQueue, useClaimConsultation, useDoctorConsultations } from '../../hooks/useDoctorData';

const sortOptions = ['By Priority', 'By Time', 'By Specialty'];
const filterOptions = ['All', 'Urgent', 'Dermatology', 'Family Medicine'];

export default function QueueScreen() {
    const { doctor } = useAuthStore();
    const [activeSort, setActiveSort] = useState('By Priority');
    const [activeFilter, setActiveFilter] = useState('All');
    const [refreshing, setRefreshing] = useState(false);

    // Real data from Supabase
    const { data: rawPending, isLoading: pendingLoading, refetch: refetchPending } = usePendingQueue(doctor?.specialty || '');
    const { data: rawMy, isLoading: myLoading, refetch: refetchMy } = useDoctorConsultations(doctor?.id || '', undefined);
    const claimMutation = useClaimConsultation();

    // Combine: doctor's assigned/in-progress cases + unassigned pending
    const myActiveItems = (rawMy || []).filter((c: any) => ['assigned', 'in_progress'].includes(c.status));
    const consultations = [...myActiveItems, ...(rawPending || [])];
    const isLoading = pendingLoading || myLoading;

    // Filter
    const filteredConsultations = consultations.filter((c: any) => {
        if (activeFilter === 'Urgent') return c.priority === 'urgent';
        if (activeFilter === 'Dermatology') return c.specialty === 'dermatology';
        if (activeFilter === 'Family Medicine') return c.specialty === 'family_medicine';
        return true;
    });

    // Sort
    const sortedConsultations = [...filteredConsultations].sort((a: any, b: any) => {
        if (activeSort === 'By Priority') {
            const priorityOrder: Record<string, number> = { urgent: 0, high: 1, routine: 2 };
            return (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
        }
        if (activeSort === 'By Time') {
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        return 0;
    });

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([refetchPending(), refetchMy()]);
        setRefreshing(false);
    }, [refetchPending, refetchMy]);

    const handleClaim = (consultationId: string) => {
        if (!doctor?.id) return;
        Alert.alert('Claim Case', 'Accept this consultation?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Accept',
                onPress: () => {
                    claimMutation.mutate(
                        { consultationId, doctorId: doctor.id },
                        {
                            onSuccess: () => Alert.alert('Claimed', 'Consultation assigned to you.'),
                            onError: (err) => Alert.alert('Error', err.message || 'Failed to claim'),
                        },
                    );
                },
            },
        ]);
    };

    // Calculate wait time from created_at
    const getWaitTime = (createdAt: string) => {
        const diffMs = Date.now() - new Date(createdAt).getTime();
        const mins = Math.floor(diffMs / 60000);
        if (mins < 60) return `${mins} min`;
        const hours = Math.floor(mins / 60);
        return `${hours}h ${mins % 60}m`;
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerBar}>
                <Text style={styles.title}>📋 Consultation Queue</Text>
                <Text style={styles.badge}>{sortedConsultations.length} cases</Text>
            </View>

            {/* Sort Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={styles.chipContent}>
                {sortOptions.map((opt) => (
                    <TouchableOpacity
                        key={opt}
                        style={[styles.chip, activeSort === opt && styles.chipActive]}
                        onPress={() => setActiveSort(opt)}
                    >
                        <Text style={[styles.chipText, activeSort === opt && styles.chipTextActive]}>{opt}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Filter Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={styles.chipContent}>
                {filterOptions.map((opt) => (
                    <TouchableOpacity
                        key={opt}
                        style={[styles.chip, activeFilter === opt && styles.chipActiveFilter]}
                        onPress={() => setActiveFilter(opt)}
                    >
                        <Text style={[styles.chipText, activeFilter === opt && styles.chipTextActive]}>{opt}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Queue List */}
            <ScrollView
                style={styles.list}
                contentContainerStyle={styles.listContent}
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
                {isLoading ? (
                    <ActivityIndicator color={colors.accentTeal} style={{ marginTop: 40 }} />
                ) : sortedConsultations.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyEmoji}>🎉</Text>
                        <Text style={styles.emptyTitle}>All caught up!</Text>
                        <Text style={styles.emptyMessage}>No consultations match the current filter.</Text>
                    </View>
                ) : (
                    sortedConsultations.map((item: any) => (
                        <TouchableOpacity
                            key={item.id}
                            style={styles.card}
                            onPress={() => {
                                if (item.doctor_id === doctor?.id) {
                                    // Already assigned to this doctor, go to detail
                                    router.push(`/consultation/${item.id}`);
                                } else {
                                    handleClaim(item.id);
                                }
                            }}
                            activeOpacity={0.7}
                        >
                            {/* Priority + Wait Time */}
                            <View style={styles.cardHeader}>
                                <View style={[styles.priorityBadge, { backgroundColor: item.priority === 'urgent' ? colors.errorFaded : colors.successFaded }]}>
                                    <Text style={{ color: item.priority === 'urgent' ? colors.error : colors.success, fontSize: 11, fontWeight: '700' }}>
                                        {item.priority === 'urgent' ? '🔴 URGENT' : '⚪ ROUTINE'}
                                    </Text>
                                </View>
                                {item.doctor_id === doctor?.id ? (
                                    <Text style={{ color: colors.accentTeal, fontSize: 11, fontWeight: '700', backgroundColor: colors.accentTealFaded, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>✓ ASSIGNED</Text>
                                ) : (
                                    <Text style={styles.waitTime}>⏱ {getWaitTime(item.created_at)}</Text>
                                )}
                            </View>

                            {/* Patient Info */}
                            <Text style={styles.patientId}>
                                {item.patient?.nickname || 'Patient'} · {item.patient?.gender?.[0]?.toUpperCase() || '?'}
                            </Text>
                            <Text style={styles.complaint}>{item.chief_complaint || 'Consultation'}</Text>

                            {/* AI Assessment (if available) */}
                            {item.ai_summary && (
                                <View style={styles.aiBox}>
                                    <Text style={styles.aiLabel}>🤖 AI Assessment</Text>
                                    <Text style={styles.aiText}>
                                        {typeof item.ai_summary === 'object'
                                            ? item.ai_summary.summary || JSON.stringify(item.ai_summary).slice(0, 100)
                                            : String(item.ai_summary).slice(0, 100)}
                                    </Text>
                                </View>
                            )}

                            {/* Footer Tags */}
                            <View style={styles.cardFooter}>
                                <Text style={styles.specialtyTag}>{item.specialty}</Text>
                                <Text style={styles.tokenTag}>💎 {item.token_cost || 3}</Text>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
    title: { ...typography.h2, color: colors.textPrimary },
    badge: { ...typography.caption, color: colors.accentTeal, backgroundColor: colors.accentTealFaded, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    chipRow: { maxHeight: 44, paddingVertical: 4 },
    chipContent: { paddingHorizontal: 20, gap: 8 },
    chip: { backgroundColor: colors.bgSecondary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
    chipActive: { backgroundColor: colors.accentTealFaded, borderColor: colors.accentTeal },
    chipActiveFilter: { backgroundColor: colors.purpleFaded, borderColor: colors.purple },
    chipText: { ...typography.caption, color: colors.textTertiary },
    chipTextActive: { color: colors.textPrimary, fontWeight: '600' },
    list: { flex: 1 },
    listContent: { padding: 20, paddingTop: 8, paddingBottom: 40 },
    emptyState: { alignItems: 'center', paddingTop: 60 },
    emptyEmoji: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { ...typography.h3, color: colors.textPrimary },
    emptyMessage: { ...typography.body, color: colors.textTertiary, marginTop: 4 },
    card: { backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    priorityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    waitTime: { ...typography.caption, color: colors.textTertiary },
    patientId: { ...typography.caption, color: colors.textSecondary, marginBottom: 4 },
    complaint: { ...typography.body, color: colors.textPrimary, marginBottom: 10, fontWeight: '500' },
    aiBox: { backgroundColor: colors.bgTertiary, borderRadius: 10, padding: 10, marginBottom: 10 },
    aiLabel: { ...typography.caption, color: colors.accentTeal, marginBottom: 4, fontWeight: '600' },
    aiText: { ...typography.caption, color: colors.textSecondary },
    cardFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
    specialtyTag: { ...typography.caption, color: colors.accentTeal },
    tokenTag: { ...typography.caption, color: colors.gold, marginLeft: 'auto' },
});
