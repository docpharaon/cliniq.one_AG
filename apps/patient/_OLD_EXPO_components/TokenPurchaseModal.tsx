import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { Button } from '@cliniqone/ui';
import { colors, spacing, typography, radius, shadows } from '@cliniqone/ui';
import { TOKEN_PACKAGES } from '@cliniqone/types';
import type { TokenPackage } from '@cliniqone/types';
import { t } from '@cliniqone/i18n';
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
        if (pkg.id === 'standard') return { label: 'Most Popular', color: colors.accentBlue };
        if (pkg.id === 'premium') return { label: 'Best Value', color: colors.success };
        return null;
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={styles.bottomSheet}>
                    {/* Handle */}
                    <View style={styles.handle} />

                    {/* Header */}
                    <Text style={styles.title}>{t('tokens.buyTokens')}</Text>
                    <Text style={styles.subtitle}>
                        {t('tokens.currentBalance')}: <Text style={styles.balanceValue}>{currentBalance}</Text> {t('tokens.tokensLabel')}
                    </Text>

                    {/* Packages */}
                    <View style={styles.packages}>
                        {activePackages.map((pkg) => {
                            const isSelected = selectedPackage === pkg.id;
                            const badge = getBadge(pkg);
                            const perToken = (pkg.price_usd / pkg.tokens).toFixed(2);

                            return (
                                <TouchableOpacity
                                    key={pkg.id}
                                    style={[styles.packageCard, isSelected && styles.packageSelected]}
                                    onPress={() => setSelectedPackage(pkg.id)}
                                    activeOpacity={0.8}
                                >
                                    {badge && (
                                        <View style={[styles.badge, { backgroundColor: badge.color + '20' }]}>
                                            <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                                        </View>
                                    )}
                                    <Text style={styles.packageName}>{pkg.name}</Text>
                                    <Text style={styles.packageTokens}>{pkg.tokens}</Text>
                                    <Text style={styles.packageTokensLabel}>{t('tokens.tokensLabel')}</Text>
                                    <View style={styles.packagePriceRow}>
                                        <Text style={styles.packagePrice}>${pkg.price_usd.toFixed(2)}</Text>
                                        <Text style={styles.packageSar}>({pkg.price_sar.toFixed(2)} SAR)</Text>
                                    </View>
                                    <Text style={styles.perToken}>${perToken}/{t('tokens.perToken')}</Text>
                                    {isSelected && (
                                        <View style={styles.checkmark}>
                                            <Text style={styles.checkmarkText}>✓</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Hint */}
                    <Text style={styles.hint}>💡 {t('tokens.hint')}</Text>

                    {/* Actions */}
                    <View style={styles.actions}>
                        <Button
                            title={purchasing ? t('tokens.purchasing') : t('tokens.purchase')}
                            onPress={handlePurchase}
                            size="lg"
                            loading={purchasing}
                            disabled={!selectedPackage}
                        />
                        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'flex-end',
    },
    bottomSheet: {
        backgroundColor: colors.bgSecondary,
        borderTopLeftRadius: radius['2xl'],
        borderTopRightRadius: radius['2xl'],
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing['4xl'],
        paddingTop: spacing.md,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.textTertiary,
        alignSelf: 'center',
        marginBottom: spacing.xl,
    },
    title: { ...typography.h2, color: colors.textPrimary, textAlign: 'center' },
    subtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing['2xl'] },
    balanceValue: { color: colors.accentTeal, fontWeight: '700' },

    // Packages
    packages: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
    packageCard: {
        flex: 1,
        backgroundColor: colors.bgCard,
        borderRadius: radius.xl,
        padding: spacing.lg,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.border,
        position: 'relative',
    },
    packageSelected: {
        borderColor: colors.accentTeal,
        backgroundColor: colors.accentTealFaded,
    },
    badge: {
        position: 'absolute',
        top: -10,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: radius.full,
    },
    badgeText: { ...typography.caption, fontWeight: '700' },
    packageName: { ...typography.label, color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.sm },
    packageTokens: { fontSize: 32, fontWeight: '800', color: colors.textPrimary },
    packageTokensLabel: { ...typography.caption, color: colors.textTertiary, marginBottom: spacing.md },
    packagePriceRow: { alignItems: 'center' },
    packagePrice: { ...typography.h4, color: colors.accentTeal },
    packageSar: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },
    perToken: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.sm },
    checkmark: {
        position: 'absolute',
        top: spacing.sm,
        right: spacing.sm,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: colors.accentTeal,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkmarkText: { color: colors.textInverse, fontSize: 13, fontWeight: '700' },

    hint: { ...typography.bodySm, color: colors.textTertiary, textAlign: 'center', marginBottom: spacing['2xl'] },

    actions: {},
    cancelButton: { alignItems: 'center', marginTop: spacing.lg },
    cancelText: { ...typography.body, color: colors.textTertiary },
});
