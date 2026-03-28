import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useState, useCallback } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography } from '@cliniqone/ui';
import { useAuthStore } from '../../stores/authStore';
import { useDoctorStats, usePendingQueue, useDoctorConsultations } from '../../hooks/useDoctorData';

export default function DashboardScreen() {
    const { doctor } = useAuthStore();
    const [refreshing, setRefreshing] = useState(false);

    // Real data hooks
    const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useDoctorStats(doctor?.id || '');
    const { data: pendingItems, isLoading: pendingLoading, refetch: refetchPending } = usePendingQueue(doctor?.specialty || '');
    const { data: myConsultations, isLoading: myLoading, refetch: refetchMy } = useDoctorConsultations(doctor?.id || '', undefined);

    // Combine: doctor's active assignments + pending unassigned
    const myActiveItems = (myConsultations || []).filter((c: any) => ['assigned', 'in_progress'].includes(c.status));
    const allQueueItems = [...myActiveItems, ...(pendingItems || [])];
    const queueCount = allQueueItems.length;
    const urgentCount = allQueueItems.filter((c: any) => c.priority === 'urgent').length;
    const queuePreview = allQueueItems.slice(0, 3);
    const queueLoading = pendingLoading || myLoading;

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([refetchStats(), refetchPending(), refetchMy()]);
        setRefreshing(false);
    }, [refetchStats, refetchPending, refetchMy]);

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
                {/* Header */}
                <View style={styles.header}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.greeting}>Welcome back,</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={styles.name}>{doctor?.display_name || 'Doctor'}</Text>
                            {doctor?.doctor_type === 'locum' && (
                                <View style={styles.locumBadge}>
                                    <Text style={styles.locumBadgeText}>LOCUM</Text>
                                </View>
                            )}
                        </View>
                        {doctor?.sandbox_mode && (
                            <Text style={styles.sandboxHint}>⚠️ Sandbox Mode</Text>
                        )}
                    </View>
                    <View style={styles.statusBadge}>
                        <View style={[styles.statusDot, { backgroundColor: doctor?.is_accepting ? colors.success : colors.warning }]} />
                        <Text style={styles.statusText}>{doctor?.is_accepting ? 'Accepting' : 'Paused'}</Text>
                    </View>
                </View>

                {/* Locum credential expiry warning */}
                {doctor?.doctor_type === 'locum' && doctor.credential_expires_at && (() => {
                    const daysLeft = Math.ceil((new Date(doctor.credential_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    if (daysLeft <= 30) return (
                        <View style={[styles.credentialWarning, daysLeft <= 7 && styles.credentialDanger]}>
                            <Text style={styles.credentialText}>
                                {daysLeft <= 0 ? '🔴 Credentials expired — contact admin' : `⚠️ Credentials expire in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`}
                            </Text>
                        </View>
                    );
                    return null;
                })()}

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <StatCard emoji="⏳" label="In Queue" value={queueCount} color={queueCount > 5 ? colors.error : queueCount > 0 ? colors.warning : colors.success} />
                    <StatCard emoji="🔴" label="Urgent" value={urgentCount} color={colors.error} />
                    <StatCard emoji="✅" label="Done" value={stats?.consultations_today ?? 0} color={colors.success} />
                    <StatCard emoji="💎" label="Tokens" value={stats?.tokens_earned ?? 0} color={colors.accentTeal} />
                </View>

                {/* Queue Preview */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>📋 Queue Preview</Text>
                        <TouchableOpacity onPress={() => router.push('/(tabs)/queue')}>
                            <Text style={styles.seeAll}>See all →</Text>
                        </TouchableOpacity>
                    </View>

                    {queueLoading ? (
                        <ActivityIndicator color={colors.accentTeal} style={{ marginVertical: 20 }} />
                    ) : queuePreview.length === 0 ? (
                        <View style={styles.emptyQueue}>
                            <Text style={styles.emptyEmoji}>🎉</Text>
                            <Text style={styles.emptyText}>No cases in queue</Text>
                        </View>
                    ) : (
                        queuePreview.map((item: any) => (
                            <TouchableOpacity
                                key={item.id}
                                style={styles.queueCard}
                                onPress={() => router.push(`/consultation/${item.id}`)}
                            >
                                <View style={styles.queueCardHeader}>
                                    <View style={[styles.priorityBadge, { backgroundColor: item.priority === 'urgent' ? colors.errorFaded : colors.successFaded }]}>
                                        <Text style={{ color: item.priority === 'urgent' ? colors.error : colors.success, fontSize: 11, fontWeight: '700' }}>
                                            {item.priority === 'urgent' ? '🔴 URGENT' : '⚪ ROUTINE'}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.patientId}>{item.patient?.nickname || 'Patient'} · {item.patient?.gender?.[0]?.toUpperCase() || '?'}</Text>
                                <Text style={styles.complaint} numberOfLines={1}>{item.chief_complaint || 'Consultation'}</Text>
                                <View style={styles.queueCardFooter}>
                                    <Text style={styles.specialty}>{item.specialty}</Text>
                                    <Text style={styles.tokenValue}>💎 {item.token_cost || 3}</Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>

                {/* Quick Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
                    <View style={styles.actionsGrid}>
                        {[
                            { emoji: '📋', label: 'Queue', route: '/(tabs)/queue' },
                            { emoji: '💰', label: 'Earnings', route: '/(tabs)/analytics' },
                            { emoji: '⚙️', label: 'Settings', route: '/(tabs)/settings' },
                            { emoji: '❓', label: 'Help', route: '/(tabs)/settings' },
                        ].map((action) => (
                            <TouchableOpacity
                                key={action.label}
                                style={styles.actionCard}
                                onPress={() => router.push(action.route as any)}
                            >
                                <Text style={styles.actionEmoji}>{action.emoji}</Text>
                                <Text style={styles.actionLabel}>{action.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function StatCard({ emoji, label, value, color }: { emoji: string; label: string; value: number; color: string }) {
    return (
        <View style={styles.statCard}>
            <Text style={styles.statEmoji}>{emoji}</Text>
            <Text style={[styles.statValue, { color }]}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    scroll: { padding: 20, paddingBottom: 40 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    greeting: { ...typography.body, color: colors.textTertiary },
    name: { ...typography.h2, color: colors.textPrimary, fontWeight: '700' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgSecondary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    statusText: { ...typography.caption, color: colors.textSecondary },
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
    statCard: { flex: 1, backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    statEmoji: { fontSize: 20, marginBottom: 4 },
    statValue: { ...typography.h3, fontWeight: '800' },
    statLabel: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },
    section: { marginBottom: 24 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { ...typography.h3, color: colors.textPrimary },
    seeAll: { ...typography.caption, color: colors.accentTeal },
    queueCard: { backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
    queueCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    priorityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    waitTime: { ...typography.caption, color: colors.textTertiary },
    patientId: { ...typography.caption, color: colors.textSecondary, marginBottom: 4 },
    complaint: { ...typography.body, color: colors.textPrimary, marginBottom: 8 },
    queueCardFooter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    specialty: { ...typography.caption, color: colors.accentTeal },
    photoTag: { ...typography.caption, color: colors.purple },
    tokenValue: { ...typography.caption, color: colors.gold, marginLeft: 'auto' },
    actionsGrid: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    actionCard: { width: '47%', backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    actionEmoji: { fontSize: 28, marginBottom: 8 },
    actionLabel: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
    emptyQueue: { alignItems: 'center', paddingVertical: 24 },
    emptyEmoji: { fontSize: 36, marginBottom: 8 },
    emptyText: { ...typography.body, color: colors.textTertiary },
    locumBadge: { backgroundColor: '#6366F1', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    locumBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    sandboxHint: { ...typography.caption, color: colors.warning, marginTop: 2 },
    credentialWarning: { backgroundColor: colors.warningFaded, borderWidth: 1, borderColor: colors.warning, borderRadius: 12, padding: 12, marginBottom: 16 },
    credentialDanger: { backgroundColor: colors.errorFaded, borderColor: colors.error },
    credentialText: { ...typography.bodySm, color: colors.textPrimary, textAlign: 'center' },
});
