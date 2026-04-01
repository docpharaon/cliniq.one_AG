import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography } from '@cliniqone/ui';
import { useAuthStore } from '../../stores/authStore';
import { useDoctorStats } from '../../hooks/useDoctorData';

export default function AnalyticsScreen() {
    const { doctor } = useAuthStore();
    const [refreshing, setRefreshing] = useState(false);
    const { data: stats, isLoading, refetch } = useDoctorStats(doctor?.id || '');

    const tokensEarned = stats?.tokens_earned ?? 0;
    const sarAmount = tokensEarned * 5; // 1 token ≈ 5 SAR
    const usdAmount = Math.round(sarAmount / 3.75);
    const completedToday = stats?.consultations_today ?? 0;
    const ratingAvg = stats?.rating_avg ?? 0;
    const ratingCount = stats?.rating_count ?? 0;

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);
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
                <Text style={styles.title}>📊 Earnings & Performance</Text>

                {isLoading ? (
                    <ActivityIndicator color={colors.accentTeal} style={{ marginTop: 40 }} />
                ) : (
                    <>
                        {/* Monthly Summary */}
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryLabel}>Lifetime Earnings</Text>
                            <View style={styles.summaryRow}>
                                <View>
                                    <Text style={styles.tokensBig}>💎 {tokensEarned.toLocaleString()}</Text>
                                    <Text style={styles.summaryMoney}>
                                        {sarAmount.toLocaleString()} SAR · ${usdAmount.toLocaleString()} USD
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Today's Activity Card */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>📅 Today</Text>
                            <View style={styles.chartCard}>
                                <View style={styles.todayRow}>
                                    <View style={styles.todayStat}>
                                        <Text style={styles.todayValue}>{completedToday}</Text>
                                        <Text style={styles.todayLabel}>Cases Seen</Text>
                                    </View>
                                    <View style={styles.todayStat}>
                                        <Text style={styles.todayValue}>{stats?.daily_limit ?? 10}</Text>
                                        <Text style={styles.todayLabel}>Daily Limit</Text>
                                    </View>
                                    <View style={styles.todayStat}>
                                        <Text style={styles.todayValue}>{Math.max(0, (stats?.daily_limit ?? 10) - completedToday)}</Text>
                                        <Text style={styles.todayLabel}>Remaining</Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Performance Metrics */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>📈 Performance</Text>
                            <View style={styles.perfGrid}>
                                <View style={styles.perfCard}>
                                    <Text style={styles.perfEmoji}>📋</Text>
                                    <Text style={styles.perfValue}>{completedToday}</Text>
                                    <Text style={styles.perfLabel}>Today's Cases</Text>
                                </View>
                                <View style={styles.perfCard}>
                                    <Text style={styles.perfEmoji}>⭐</Text>
                                    <Text style={styles.perfValue}>{ratingAvg.toFixed(1)}</Text>
                                    <Text style={styles.perfLabel}>Rating</Text>
                                    <Text style={styles.perfSub}>{ratingCount} reviews</Text>
                                </View>
                                <View style={styles.perfCard}>
                                    <Text style={styles.perfEmoji}>💎</Text>
                                    <Text style={styles.perfValue}>{tokensEarned}</Text>
                                    <Text style={styles.perfLabel}>Total Tokens</Text>
                                </View>
                                <View style={styles.perfCard}>
                                    <Text style={styles.perfEmoji}>🎯</Text>
                                    <Text style={styles.perfValue}>{stats?.daily_limit ?? 10}</Text>
                                    <Text style={styles.perfLabel}>Daily Limit</Text>
                                </View>
                            </View>
                        </View>
                    </>
                )}

                {/* Payout Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>💳 Payout Information</Text>
                    <View style={styles.payoutCard}>
                        <View style={styles.payoutRow}>
                            <Text style={styles.payoutLabel}>Schedule</Text>
                            <Text style={styles.payoutValue}>Monthly (1st)</Text>
                        </View>
                        <View style={styles.payoutRow}>
                            <Text style={styles.payoutLabel}>Minimum</Text>
                            <Text style={styles.payoutValue}>400 tokens (2,000 SAR)</Text>
                        </View>
                        <View style={styles.payoutRow}>
                            <Text style={styles.payoutLabel}>Processing</Text>
                            <Text style={styles.payoutValue}>3-5 business days</Text>
                        </View>
                        <View style={styles.payoutRow}>
                            <Text style={styles.payoutLabel}>Early payout</Text>
                            <Text style={styles.payoutValue}>Available (2% fee)</Text>
                        </View>
                    </View>
                </View>

                {/* Bonus Targets */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🎯 Bonus Targets</Text>
                    <View style={styles.bonusCard}>
                        <BonusRow emoji="🎯" label="Monthly target" reward="+300 tokens" progress={78} />
                        <BonusRow emoji="⭐" label="High rating (>4.5)" reward="+5% monthly" progress={96} />
                        <BonusRow emoji="⚡" label="Fast response (<20 min)" reward="+5% monthly" progress={85} />
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function BonusRow({ emoji, label, reward, progress }: { emoji: string; label: string; reward: string; progress: number }) {
    return (
        <View style={styles.bonusRow}>
            <Text style={styles.bonusEmoji}>{emoji}</Text>
            <View style={styles.bonusMid}>
                <Text style={styles.bonusLabel}>{label}</Text>
                <View style={styles.progressBg}>
                    <View style={[styles.progressBar, { width: `${progress}%` }]} />
                </View>
            </View>
            <Text style={styles.bonusReward}>{reward}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    scroll: { padding: 20, paddingBottom: 40 },
    title: { ...typography.h2, color: colors.textPrimary, marginBottom: 20 },
    summaryCard: { backgroundColor: colors.bgSecondary, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.border, marginBottom: 24 },
    summaryLabel: { ...typography.caption, color: colors.textTertiary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    tokensBig: { ...typography.h1, color: colors.gold, fontWeight: '800' },
    summaryMoney: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
    changeBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    section: { marginBottom: 24 },
    sectionTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: 12 },
    chartCard: { backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.border },
    todayRow: { flexDirection: 'row', justifyContent: 'space-around' },
    todayStat: { alignItems: 'center', flex: 1 },
    todayValue: { ...typography.h2, color: colors.accentTeal, fontWeight: '800' },
    todayLabel: { ...typography.caption, color: colors.textTertiary, marginTop: 4 },
    chartRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 140 },
    chartCol: { alignItems: 'center', flex: 1 },
    chartValue: { ...typography.caption, color: colors.textSecondary, marginBottom: 4 },
    chartBarBg: { width: 24, height: 100, backgroundColor: colors.bgTertiary, borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' },
    chartBar: { width: '100%', backgroundColor: colors.accentTeal, borderRadius: 6 },
    chartLabel: { ...typography.caption, color: colors.textTertiary, marginTop: 6, fontSize: 11 },
    perfGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    perfCard: { width: '48%', backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
    perfEmoji: { fontSize: 24, marginBottom: 6 },
    perfValue: { ...typography.h2, color: colors.textPrimary, fontWeight: '800' },
    perfLabel: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
    perfSub: { ...typography.caption, color: colors.textTertiary, fontSize: 10 },
    payoutCard: { backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
    payoutRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    payoutLabel: { ...typography.caption, color: colors.textTertiary },
    payoutValue: { ...typography.caption, color: colors.textPrimary, fontWeight: '600' },
    bonusCard: { backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
    bonusRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
    bonusEmoji: { fontSize: 20, marginRight: 10 },
    bonusMid: { flex: 1, marginRight: 10 },
    bonusLabel: { ...typography.caption, color: colors.textPrimary, marginBottom: 4 },
    progressBg: { height: 6, backgroundColor: colors.bgTertiary, borderRadius: 3, overflow: 'hidden' },
    progressBar: { height: '100%', backgroundColor: colors.accentTeal, borderRadius: 3 },
    bonusReward: { ...typography.caption, color: colors.gold, fontWeight: '600' },
});
