import React, { useState } from 'react';
import { TOKEN_PACKAGES } from '@cliniqone/types';
import type { TokenPackage } from '@cliniqone/types';
import { t, toLocalNum } from '@cliniqone/i18n';
import { useToast } from './ToastProvider';
import { usePurchase } from '../hooks/usePurchase';
import { useAuthStore } from '../stores/authStore';

interface TokenPurchaseModalProps {
    visible: boolean;
    onClose: () => void;
    currentBalance: number;
}

export function TokenPurchaseModal({ visible, onClose, currentBalance }: TokenPurchaseModalProps) {
    const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
    const toast = useToast((s) => s.show);
    const { user } = useAuthStore();
    const { purchasing, isSandbox, purchasePackage } = usePurchase(user?.id);

    const activePackages = TOKEN_PACKAGES.filter((p) => p.is_active);

    if (!visible) return null;

    async function handlePurchase() {
        if (!selectedPackage) return;
        const result = await purchasePackage(selectedPackage);
        if (result.success) {
            toast(`🎉 ${result.tokens ?? 0} tokens purchased!`, 'success');
            onClose();
        } else {
            toast(result.error || t('errors.serverError'), 'error');
        }
        setSelectedPackage(null);
    }

    const getBadge = (pkg: TokenPackage) => {
        if (pkg.id === 'standard') return { label: 'Most Popular', color: '#3B82F6' };
        if (pkg.id === 'premium') return { label: 'Best Value', color: '#059669' };
        return null;
    };

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.bottomSheet} onClick={(e) => e.stopPropagation()}>
                <div style={styles.handle} />

                <h2 style={styles.title}>{t('tokens.buyTokens')}</h2>
                <p style={styles.subtitle}>
                    {t('tokens.currentBalance')}: <strong style={{ color: '#1A8A9E' }}>{toLocalNum(currentBalance)}</strong> {t('tokens.tokensLabel')}
                </p>

                <div style={styles.packages}>
                    {activePackages.map((pkg) => {
                        const isSelected = selectedPackage === pkg.id;
                        const badge = getBadge(pkg);
                        const perToken = (pkg.price_usd / pkg.tokens).toFixed(2);

                        return (
                            <button
                                key={pkg.id}
                                style={{
                                    ...styles.packageCard,
                                    ...(isSelected ? styles.packageSelected : {}),
                                }}
                                onClick={() => setSelectedPackage(pkg.id)}
                            >
                                {badge && (
                                    <span style={{ ...styles.badge, backgroundColor: badge.color + '20', color: badge.color }}>
                                        {badge.label}
                                    </span>
                                )}
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8, marginBottom: 4 }}>{pkg.name}</span>
                                <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)' }}>{toLocalNum(pkg.tokens)}</span>
                                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 10 }}>{t('tokens.tokensLabel')}</span>
                                <span style={{ fontSize: 17, fontWeight: 700, color: '#1A8A9E' }}>{toLocalNum(pkg.price_sar.toFixed(2))} <span style={{ fontSize: 12 }}>ر.س</span></span>
                                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>(${toLocalNum(pkg.price_usd.toFixed(2))})</span>
                                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>{toLocalNum(perToken)} {t('tokens.perToken')}</span>
                                {isSelected && <span style={styles.checkmark}>✓</span>}
                            </button>
                        );
                    })}
                </div>

                <p style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center', marginBottom: 20 }}>💡 {t('tokens.hint')}</p>

                <button
                    onClick={handlePurchase}
                    disabled={!selectedPackage || purchasing}
                    style={{
                        width: '100%',
                        padding: '14px 20px',
                        borderRadius: 14,
                        border: 'none',
                        backgroundColor: selectedPackage ? '#1A8A9E' : '#334155',
                        color: '#fff',
                        fontSize: 16,
                        fontWeight: 700,
                        cursor: selectedPackage ? 'pointer' : 'not-allowed',
                        opacity: purchasing ? 0.7 : 1,
                    }}
                >
                    {purchasing ? t('tokens.purchasing') : t('tokens.purchase')}
                </button>
                <button onClick={onClose} style={styles.cancelButton}>
                    {t('common.cancel')}
                </button>
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    overlay: {
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000,
    },
    bottomSheet: {
        backgroundColor: 'var(--bg-primary)', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: '12px 20px 32px', width: '100%', maxWidth: 500,
    },
    handle: {
        width: 40, height: 4, borderRadius: 2, backgroundColor: 'var(--text-tertiary)',
        margin: '0 auto 20px',
    },
    title: { fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center', margin: 0 },
    subtitle: { fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', marginTop: 6, marginBottom: 20 },
    packages: { display: 'flex', gap: 10, marginBottom: 16 },
    packageCard: {
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        backgroundColor: 'var(--bg-card)', borderRadius: 16, padding: 14,
        border: '2px solid var(--border)', cursor: 'pointer', position: 'relative',
    },
    packageSelected: { borderColor: '#1A8A9E', backgroundColor: '#1A8A9E15' },
    badge: {
        position: 'absolute', top: -10, fontSize: 10, fontWeight: 700,
        padding: '2px 8px', borderRadius: 12,
    },
    checkmark: {
        position: 'absolute', top: 8, right: 8, width: 22, height: 22,
        borderRadius: 11, backgroundColor: '#1A8A9E', display: 'flex',
        alignItems: 'center', justifyContent: 'center', color: '#fff',
        fontSize: 13, fontWeight: 700,
    },
    cancelButton: {
        background: 'none', border: 'none', color: 'var(--text-tertiary)',
        fontSize: 15, cursor: 'pointer', display: 'block',
        margin: '16px auto 0', padding: 8,
    },
};
