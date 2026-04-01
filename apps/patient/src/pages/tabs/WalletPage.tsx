import { useState, useCallback } from 'react';
import { t, toLocalNum } from '@cliniqone/i18n';
import { useAuthStore } from '../../stores/authStore';
import { useTokenHistory } from '../../hooks/useConsultations';
import { TokenPurchaseModal } from '../../components/TokenPurchaseModal';
import { BrandSpinner } from '../../components/BrandSpinner';
import { PullToRefresh } from '../../components/PullToRefresh';
import { TOKEN_PACKAGES } from '@cliniqone/types';
import type { TokenTransaction } from '@cliniqone/types';
import { haptic } from '../../hooks/useHaptics';
import { Coins, Gift, Stethoscope, Star, Key, Gem, Download, Refresh, ClipboardList } from '@cliniqone/ui';

const FILTER_TABS = [
    { key: 'all', labelKey: 'wallet.filterAll' },
    { key: 'purchase', labelKey: 'wallet.filterPurchases' },
    { key: 'spend', labelKey: 'wallet.filterSpent' },
    { key: 'earn', labelKey: 'wallet.filterEarned' },
    { key: 'bonus', labelKey: 'wallet.filterBonuses' },
];

const TX_ICONS: Record<string, React.FC<{ size?: number; color?: string }>> = { purchase: Coins, spend: Stethoscope, earn: Star, refund: Download, bonus: Gift, admin_grant: Key };

export default function WalletPage() {
    const { user } = useAuthStore();
    const [filter, setFilter] = useState('all');
    const [showPurchase, setShowPurchase] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const { data: liveHistory, isLoading, refetch } = useTokenHistory(user?.id || '');
    const transactions = (liveHistory || []) as TokenTransaction[];

    const filteredTx = filter === 'all' ? transactions : transactions.filter(tx => tx.type === filter);
    const totalSpent = transactions.filter(tx => tx.type === 'spend').reduce((s, tx) => s + Math.abs(tx.amount), 0);
    const totalEarned = transactions.filter(tx => tx.type === 'earn' || tx.type === 'bonus').reduce((s, tx) => s + tx.amount, 0);
    const totalPurchased = transactions.filter(tx => tx.type === 'purchase').reduce((s, tx) => s + tx.amount, 0);

    function formatDate(dateStr: string) {
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    const handleRefresh = useCallback(async () => {
        haptic.medium();
        await refetch();
        haptic.success();
    }, [refetch]);

    if (isLoading) return <BrandSpinner />;

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
            <PullToRefresh onRefresh={handleRefresh}>
            <div className="page-fade" style={{ maxWidth: 500, margin: '0 auto', padding: '24px 20px 48px' }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 20px' }}>{t('wallet.title')}</h1>

                {/* Balance Card */}
                <div style={styles.balanceCard}>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{t('wallet.totalBalance')}</p>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ fontSize: 52, fontWeight: 800, color: '#1A8A9E' }}>{toLocalNum(user?.tokens_balance ?? 0)}</span>
                        <span style={{ fontSize: 18, color: 'var(--text-tertiary)' }}>{t('tokens.tokensLabel')}</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '8px 0 16px' }}>{t('tokens.hint')}</p>
                    <button onClick={() => { haptic.medium(); setShowPurchase(true); }} className="pressable" style={styles.buyButton}>
                        + {t('tokens.buyTokens')}
                    </button>
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                    {[
                        { Icon: Download, value: totalSpent, label: t('wallet.spent') },
                        { Icon: Gift, value: totalEarned, label: t('wallet.earned') },
                        { Icon: Coins, value: totalPurchased, label: t('wallet.purchased') },
                    ].map((stat, i) => (
                        <div key={i} style={styles.statCard}>
                            <stat.Icon size={20} color="#2DD4BF" />
                            <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{stat.value}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{stat.label}</span>
                        </div>
                    ))}
                </div>

                {/* Packages */}
                <p style={styles.sectionTitle}>{t('wallet.packages')}</p>
                <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                    {TOKEN_PACKAGES.map(pkg => (
                        <button key={pkg.id} onClick={() => { haptic.medium(); setShowPurchase(true); }} className="pressable" style={{
                            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                            backgroundColor: pkg.id === 'standard' ? '#1A8A9E15' : 'var(--bg-card)',
                            borderRadius: 16, padding: 14,
                            border: `1px solid ${pkg.id === 'standard' ? '#1A8A9E' : '#334155'}`,
                            cursor: 'pointer', position: 'relative',
                        }}>
                            {pkg.id === 'standard' && (
                                <span style={{ position: 'absolute', top: -1, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: '0 0 6px 6px', backgroundColor: '#1A8A9E', color: '#fff' }}>
                                    {t('wallet.popular')}
                                </span>
                            )}
                            <span style={{ fontSize: 28, fontWeight: 800, color: '#1A8A9E', marginTop: pkg.id === 'standard' ? 16 : 0 }}>{pkg.tokens}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 6 }}>{t('tokens.tokensLabel')}</span>
                            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>${pkg.price_usd}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{pkg.price_sar} SAR</span>
                        </button>
                    ))}
                </div>

                {/* Transaction History */}
                <p style={styles.sectionTitle}>{t('wallet.history')}</p>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16, paddingBottom: 4 }}>
                    {FILTER_TABS.map(tab => (
                        <button key={tab.key} onClick={() => { haptic.select(); setFilter(tab.key); }} className="pressable" style={{
                            padding: '6px 16px', borderRadius: 20, whiteSpace: 'nowrap',
                            backgroundColor: filter === tab.key ? '#1A8A9E20' : 'var(--bg-card)',
                            border: `1px solid ${filter === tab.key ? '#1A8A9E' : '#334155'}`,
                            color: filter === tab.key ? '#1A8A9E' : '#64748B', fontSize: 12,
                        }}>{t(tab.labelKey)}</button>
                    ))}
                </div>

                {isLoading ? (
                    <BrandSpinner fullScreen={false} />
                ) : filteredTx.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {filteredTx.map(tx => (
                            <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 12, backgroundColor: 'var(--bg-card)', padding: '14px 16px', borderRadius: 12 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2DD4BF15' }}>
                                    {(() => { const TxIcon = TX_ICONS[tx.type] || Gem; return <TxIcon size={18} color="#2DD4BF" />; })()}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>{tx.description}</p>
                                    <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>{formatDate(tx.created_at)}</p>
                                </div>
                                <span style={{ fontSize: 16, fontWeight: 700, color: tx.amount >= 0 ? '#059669' : '#DC2626' }}>
                                    {tx.amount >= 0 ? '+' : ''}{tx.amount}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: 32 }}>
                        <div style={{ marginBottom: 12 }}><ClipboardList size={36} color="#2DD4BF" /></div>
                        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{t('wallet.noTransactions')}</p>
                    </div>
                )}

                {/* Refresh removed — using PullToRefresh gesture */}
            </div>
            </PullToRefresh>

            <TokenPurchaseModal visible={showPurchase} onClose={() => setShowPurchase(false)} currentBalance={user?.tokens_balance ?? 0} />
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    balanceCard: {
        backgroundColor: 'var(--bg-card)', borderRadius: 20, padding: 24,
        textAlign: 'center', marginBottom: 20, border: '1px solid #1A8A9E30',
        position: 'relative', overflow: 'hidden',
    },
    buyButton: {
        padding: '12px 32px', borderRadius: 24, border: 'none',
        backgroundColor: '#1A8A9E', color: '#fff', fontSize: 15,
        fontWeight: 700, cursor: 'pointer',
    },
    statCard: {
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        backgroundColor: 'var(--bg-card)', borderRadius: 12, padding: 14, gap: 4,
    },
    sectionTitle: { fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' },
};
