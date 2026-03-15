import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@cliniqone/ui';
import { colors, spacing, typography, radius, shadows } from '@cliniqone/ui';
import { t } from '@cliniqone/i18n';
import { useAuthStore } from '../../stores/authStore';
import { useTokenHistory } from '../../hooks/useConsultations';
import { TokenPurchaseModal } from '../../components/TokenPurchaseModal';
import { TOKEN_PACKAGES } from '@cliniqone/types';
import type { TokenTransaction, TokenTransactionType } from '@cliniqone/types';

// ── Filter tabs ──────────────────────────────────
const FILTER_TABS: { key: string; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'purchase', label: 'Purchases' },
    { key: 'spend', label: 'Spent' },
    { key: 'earn', label: 'Earned' },
    { key: 'bonus', label: 'Bonuses' },
];

const TX_ICONS: Record<string, string> = {
    purchase: '💰',
    spend: '🩺',
    earn: '⭐',
    refund: '↩️',
    bonus: '🎁',
    admin_grant: '🔑',
};

const TX_COLORS: Record<string, string> = {
    purchase: colors.accentTeal,
    spend: colors.warning,
    earn: colors.success,
    refund: colors.info,
    bonus: colors.gold,
    admin_grant: colors.purple,
};

// ── Mock transactions for fallback ───────────────
const MOCK_TRANSACTIONS: TokenTransaction[] = [
    { id: 't1', user_id: 'p1', type: 'bonus', amount: 100, balance_after: 100, consultation_id: null, description: 'Welcome bonus', created_at: '2026-02-14T10:00:00Z' },
    { id: 't2', user_id: 'p1', type: 'spend', amount: -3, balance_after: 97, consultation_id: 'c1', description: 'Dermatology consultation', created_at: '2026-02-15T10:30:00Z' },
    { id: 't3', user_id: 'p1', type: 'purchase', amount: 7, balance_after: 104, consultation_id: null, description: 'Standard package', created_at: '2026-02-16T08:00:00Z' },
];

export default function WalletScreen() {
    const { user } = useAuthStore();
    const [filter, setFilter] = useState('all');
    const [showPurchase, setShowPurchase] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const { data: liveHistory, isLoading, refetch } = useTokenHistory(user?.id || '');
    const transactions = (liveHistory && liveHistory.length > 0)
        ? (liveHistory as TokenTransaction[])
        : MOCK_TRANSACTIONS;

    const filteredTx = filter === 'all'
        ? transactions
        : transactions.filter((tx) => tx.type === filter);

    // Stats
    const totalSpent = transactions
        .filter((tx) => tx.type === 'spend')
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    const totalEarned = transactions
        .filter((tx) => tx.type === 'earn' || tx.type === 'bonus')
        .reduce((sum, tx) => sum + tx.amount, 0);
    const totalPurchased = transactions
        .filter((tx) => tx.type === 'purchase')
        .reduce((sum, tx) => sum + tx.amount, 0);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    function formatDate(dateStr: string) {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        });
    }

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
                <Text style={styles.pageTitle}>{t('wallet.title')}</Text>

                {/* Balance Card */}
                <View style={styles.balanceCard}>
                    <View style={styles.balanceGlow} />
                    <Text style={styles.balanceLabel}>{t('wallet.totalBalance')}</Text>
                    <View style={styles.balanceRow}>
                        <Text style={styles.balanceValue}>{user?.tokens_balance ?? 0}</Text>
                        <Text style={styles.balanceUnit}>{t('tokens.tokensLabel')}</Text>
                    </View>
                    <Text style={styles.balanceHint}>{t('tokens.hint')}</Text>
                    <TouchableOpacity
                        style={styles.buyButton}
                        onPress={() => setShowPurchase(true)}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.buyButtonText}>+ {t('tokens.buyTokens')}</Text>
                    </TouchableOpacity>
                </View>

                {/* Quick Stats */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statIcon}>📤</Text>
                        <Text style={styles.statValue}>{totalSpent}</Text>
                        <Text style={styles.statLabel}>{t('wallet.spent')}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statIcon}>🎁</Text>
                        <Text style={styles.statValue}>{totalEarned}</Text>
                        <Text style={styles.statLabel}>{t('wallet.earned')}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statIcon}>💰</Text>
                        <Text style={styles.statValue}>{totalPurchased}</Text>
                        <Text style={styles.statLabel}>{t('wallet.purchased')}</Text>
                    </View>
                </View>

                {/* Token Packages */}
                <Text style={styles.sectionTitle}>{t('wallet.packages')}</Text>
                <View style={styles.packagesRow}>
                    {TOKEN_PACKAGES.map((pkg) => (
                        <TouchableOpacity
                            key={pkg.id}
                            style={[
                                styles.packageCard,
                                pkg.id === 'standard' && styles.packageCardPopular,
                            ]}
                            onPress={() => setShowPurchase(true)}
                            activeOpacity={0.8}
                        >
                            {pkg.id === 'standard' && (
                                <View style={styles.popularBadge}>
                                    <Text style={styles.popularBadgeText}>{t('wallet.popular')}</Text>
                                </View>
                            )}
                            <Text style={styles.packageTokens}>{pkg.tokens}</Text>
                            <Text style={styles.packageTokenLabel}>{t('tokens.tokensLabel')}</Text>
                            <Text style={styles.packagePrice}>${pkg.price_usd}</Text>
                            <Text style={styles.packagePriceSar}>{pkg.price_sar} SAR</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Transaction History */}
                <Text style={styles.sectionTitle}>{t('wallet.history')}</Text>

                {/* Filter Tabs */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.filterScroll}
                    contentContainerStyle={styles.filterContainer}
                >
                    {FILTER_TABS.map((tab) => (
                        <TouchableOpacity
                            key={tab.key}
                            style={[styles.filterTab, filter === tab.key && styles.filterTabActive]}
                            onPress={() => setFilter(tab.key)}
                        >
                            <Text style={[styles.filterText, filter === tab.key && styles.filterTextActive]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Transaction List */}
                {isLoading ? (
                    <ActivityIndicator color={colors.accentTeal} style={{ marginVertical: spacing['3xl'] }} />
                ) : filteredTx.length > 0 ? (
                    <View style={styles.txList}>
                        {filteredTx.map((tx) => (
                            <View key={tx.id} style={styles.txItem}>
                                <View style={[styles.txIconWrap, { backgroundColor: (TX_COLORS[tx.type] || colors.textTertiary) + '20' }]}>
                                    <Text style={styles.txIcon}>{TX_ICONS[tx.type] || '💎'}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.txDesc}>{tx.description}</Text>
                                    <Text style={styles.txDate}>{formatDate(tx.created_at)}</Text>
                                </View>
                                <Text style={[
                                    styles.txAmount,
                                    { color: tx.amount >= 0 ? colors.success : colors.error },
                                ]}>
                                    {tx.amount >= 0 ? '+' : ''}{tx.amount}
                                </Text>
                            </View>
                        ))}
                    </View>
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>📜</Text>
                        <Text style={styles.emptyTitle}>{t('wallet.noTransactions')}</Text>
                    </View>
                )}
            </ScrollView>

            {/* Purchase Modal */}
            <TokenPurchaseModal
                visible={showPurchase}
                onClose={() => setShowPurchase(false)}
                currentBalance={user?.tokens_balance ?? 0}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing['4xl'] },
    pageTitle: { ...typography.h2, color: colors.textPrimary, paddingTop: spacing['2xl'], marginBottom: spacing.xl },

    // Balance Card
    balanceCard: {
        backgroundColor: colors.bgCard,
        borderRadius: radius.xl,
        padding: spacing['2xl'],
        alignItems: 'center',
        marginBottom: spacing.xl,
        borderWidth: 1,
        borderColor: colors.accentTeal + '30',
        overflow: 'hidden',
        ...shadows.elevated,
    },
    balanceGlow: {
        position: 'absolute',
        top: -40,
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: colors.accentTeal + '08',
    },
    balanceLabel: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.sm },
    balanceRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
    balanceValue: { fontSize: 52, fontWeight: '800', color: colors.accentTeal },
    balanceUnit: { ...typography.h3, color: colors.textTertiary },
    balanceHint: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.sm, marginBottom: spacing.xl },
    buyButton: {
        backgroundColor: colors.accentTeal,
        paddingHorizontal: spacing['3xl'],
        paddingVertical: spacing.md,
        borderRadius: radius.full,
    },
    buyButtonText: { ...typography.button, color: colors.textInverse },

    // Stats
    statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing['2xl'] },
    statCard: {
        flex: 1,
        backgroundColor: colors.bgCard,
        borderRadius: radius.lg,
        padding: spacing.lg,
        alignItems: 'center',
        ...shadows.card,
    },
    statIcon: { fontSize: 20, marginBottom: spacing.xs },
    statValue: { ...typography.h3, color: colors.textPrimary },
    statLabel: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.xxs },

    // Packages
    sectionTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: spacing.md },
    packagesRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing['2xl'] },
    packageCard: {
        flex: 1,
        backgroundColor: colors.bgCard,
        borderRadius: radius.xl,
        padding: spacing.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        ...shadows.card,
    },
    packageCardPopular: {
        borderColor: colors.accentTeal,
        backgroundColor: colors.accentTealFaded,
    },
    popularBadge: {
        position: 'absolute',
        top: -1,
        backgroundColor: colors.accentTeal,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xxs,
        borderBottomLeftRadius: radius.sm,
        borderBottomRightRadius: radius.sm,
    },
    popularBadgeText: { ...typography.caption, color: colors.textInverse, fontWeight: '700' },
    packageTokens: { fontSize: 28, fontWeight: '800', color: colors.accentTeal, marginTop: spacing.lg },
    packageTokenLabel: { ...typography.caption, color: colors.textTertiary, marginBottom: spacing.sm },
    packagePrice: { ...typography.h4, color: colors.textPrimary },
    packagePriceSar: { ...typography.caption, color: colors.textTertiary },

    // Filters
    filterScroll: { marginBottom: spacing.lg },
    filterContainer: { gap: spacing.sm },
    filterTab: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radius.full,
        backgroundColor: colors.bgTertiary,
    },
    filterTabActive: { backgroundColor: colors.accentTealFaded, borderWidth: 1, borderColor: colors.accentTeal },
    filterText: { ...typography.buttonSm, color: colors.textTertiary },
    filterTextActive: { color: colors.accentTeal },

    // Transaction list
    txList: { gap: spacing.sm },
    txItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        backgroundColor: colors.bgCard,
        padding: spacing.lg,
        borderRadius: radius.lg,
    },
    txIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    txIcon: { fontSize: 18 },
    txDesc: { ...typography.body, color: colors.textPrimary, fontWeight: '500' },
    txDate: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.xxs },
    txAmount: { ...typography.h4, fontWeight: '700' },

    // Empty
    emptyState: { alignItems: 'center', paddingVertical: spacing['3xl'] },
    emptyIcon: { fontSize: 36, marginBottom: spacing.md },
    emptyTitle: { ...typography.body, color: colors.textSecondary },
});
