import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Image, ActionSheetIOS, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Card, Badge, Button } from '@cliniqone/ui';
import { colors, spacing, typography, radius, shadows } from '@cliniqone/ui';
import { signOut } from '@cliniqone/api';
import { useAuthStore } from '../../stores/authStore';
import { t, toLocalNum, localDate } from '@cliniqone/i18n';
import { TokenPurchaseModal } from '../../components/TokenPurchaseModal';
import { APP } from '@cliniqone/config';
import type { TokenTransaction, Consultation } from '@cliniqone/types';
import { useTokenHistory, useConsultations } from '../../hooks/useConsultations';


const TX_ICONS: Record<string, string> = {
    purchase: '💰',
    spend: '🩺',
    earn: '⭐',
    refund: '↩️',
    bonus: '🎁',
    admin_grant: '🔑',
};

function getSpecialtyLabel(key: string): string {
    const labels: Record<string, string> = {
        general: t('profile.specialtyGeneral'),
        dermatology: t('profile.specialtyDermatology'),
        family_medicine: t('profile.specialtyFamilyMedicine'),
    };
    return labels[key] || key;
}

export default function ProfileScreen() {
    const { user, clear, setUser } = useAuthStore();
    const [showPurchase, setShowPurchase] = useState(false);
    const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatar_url ?? null);

    // Live data (no mock fallback)
    const { data: liveTransactions } = useTokenHistory(user?.id || '');
    const { data: liveConsultations } = useConsultations(user?.id || '');
    const transactions = liveTransactions || [];
    const consultations = liveConsultations || [];
    const consultCount = consultations.length;

    // ── Medical history stats ──────────────
    const completedConsults = consultations.filter((c: any) => c.status === 'completed');
    const lastConsult = completedConsults.length > 0
        ? new Date(completedConsults[completedConsults.length - 1].created_at!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : null;

    // Top specialty
    const specialtyCounts: Record<string, number> = {};
    consultations.forEach((c: any) => {
        if (c.specialty) specialtyCounts[c.specialty] = (specialtyCounts[c.specialty] || 0) + 1;
    });
    const topSpecialty = Object.entries(specialtyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // ── Avatar picker ──────────────────────
    async function pickAvatar(source: 'camera' | 'gallery') {
        const opts: ImagePicker.ImagePickerOptions = {
            mediaTypes: 'images' as any,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        };

        let result: ImagePicker.ImagePickerResult;

        if (source === 'camera') {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Camera access is required to take a photo.');
                return;
            }
            result = await ImagePicker.launchCameraAsync(opts);
        } else {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Gallery access is required to choose a photo.');
                return;
            }
            result = await ImagePicker.launchImageLibraryAsync(opts);
        }

        if (!result.canceled && result.assets?.[0]) {
            setAvatarUri(result.assets[0].uri);
            // In production: upload to Supabase Storage and update user.avatar_url
        }
    }

    function showAvatarOptions() {
        const options = [
            t('profile.takePhoto'),
            t('profile.chooseFromGallery'),
            ...(avatarUri ? [t('profile.removePhoto')] : []),
            t('common.cancel'),
        ];
        const cancelIndex = options.length - 1;
        const destructiveIndex = avatarUri ? options.length - 2 : undefined;

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                { options, cancelButtonIndex: cancelIndex, destructiveButtonIndex: destructiveIndex },
                (idx) => {
                    if (idx === 0) pickAvatar('camera');
                    else if (idx === 1) pickAvatar('gallery');
                    else if (avatarUri && idx === 2) setAvatarUri(null);
                }
            );
        } else {
            Alert.alert(t('profile.changePhoto'), undefined, [
                { text: t('profile.takePhoto'), onPress: () => pickAvatar('camera') },
                { text: t('profile.chooseFromGallery'), onPress: () => pickAvatar('gallery') },
                ...(avatarUri ? [{ text: t('profile.removePhoto'), style: 'destructive' as const, onPress: () => setAvatarUri(null) }] : []),
                { text: t('common.cancel'), style: 'cancel' as const },
            ]);
        }
    }

    async function handleLogout() {
        if (Platform.OS === 'web') {
            const confirmed = (globalThis as any).confirm?.(t('profile.signOutConfirm'));
            if (confirmed) {
                await signOut();
                clear();
                router.replace('/(auth)/landing');
            }
            return;
        }
        Alert.alert(t('profile.signOut'), t('profile.signOutConfirm'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
                text: t('profile.signOut'),
                style: 'destructive',
                onPress: async () => {
                    await signOut();
                    clear();
                    router.replace('/(auth)/landing');
                },
            },
        ]);
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.title}>{t('tabs.profile')}</Text>

                {/* Profile Card with Avatar Upload */}
                <View style={styles.profileCard}>
                    <TouchableOpacity onPress={showAvatarOptions} activeOpacity={0.8} style={styles.avatarContainer}>
                        {avatarUri ? (
                            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                        ) : (
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{user?.nickname?.[0]?.toUpperCase() || '?'}</Text>
                            </View>
                        )}
                        <View style={styles.cameraBadge}>
                            <Text style={styles.cameraIcon}>📷</Text>
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.name}>{user?.nickname || t('profile.userFallback')}</Text>
                    <Text style={styles.email}>{user?.email || ''}</Text>
                    <Badge label={t('profile.patientBadge')} variant="teal" />
                    {user?.kyc_status === 'approved' ? (
                        <Badge label={t('profile.verifiedBadge')} variant="success" />
                    ) : (
                        <TouchableOpacity onPress={() => router.push('/settings/verify-identity')}>
                            <Badge label={t('profile.notVerifiedBadge')} variant="warning" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{toLocalNum(user?.tokens_balance ?? 0)}</Text>
                        <Text style={styles.statLabel}>{t('profile.tokensLabel')}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{toLocalNum(consultCount)}</Text>
                        <Text style={styles.statLabel}>{t('profile.consultationsLabel')}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>
                            {toLocalNum(user?.created_at ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000) : 0)}d
                        </Text>
                        <Text style={styles.statLabel}>{t('profile.memberLabel')}</Text>
                    </View>
                </View>

                {/* ── Medical History Summary ── */}
                <View style={styles.historyCard}>
                    <View style={styles.historyHeader}>
                        <Text style={styles.historyTitle}>📋 {t('profile.medicalHistory')}</Text>
                    </View>

                    <View style={styles.historyGrid}>
                        <View style={styles.historyItem}>
                            <Text style={styles.historyItemIcon}>🩺</Text>
                            <Text style={styles.historyItemValue}>{toLocalNum(completedConsults.length)}</Text>
                            <Text style={styles.historyItemLabel}>{t('profile.completedLabel')}</Text>
                        </View>
                        <View style={styles.historyDivider} />
                        <View style={styles.historyItem}>
                            <Text style={styles.historyItemIcon}>📅</Text>
                            <Text style={styles.historyItemValue} numberOfLines={1}>
                                {lastConsult || '—'}
                            </Text>
                            <Text style={styles.historyItemLabel}>{t('profile.lastConsultation')}</Text>
                        </View>
                        <View style={styles.historyDivider} />
                        <View style={styles.historyItem}>
                            <Text style={styles.historyItemIcon}>⭐</Text>
                            <Text style={styles.historyItemValue} numberOfLines={1}>
                                {topSpecialty ? getSpecialtyLabel(topSpecialty) : '—'}
                            </Text>
                            <Text style={styles.historyItemLabel}>{t('profile.topSpecialty')}</Text>
                        </View>
                    </View>

                    {/* Details rows */}
                    <View style={styles.historyDetails}>
                        <View style={styles.historyDetailRow}>
                            <Text style={styles.historyDetailLabel}>⚠️ {t('profile.knownAllergies')}</Text>
                            <Text style={styles.historyDetailValue}>{t('profile.noAllergies')}</Text>
                        </View>
                        <View style={styles.historyDetailRow}>
                            <Text style={styles.historyDetailLabel}>💊 {t('profile.currentMedications')}</Text>
                            <Text style={styles.historyDetailValue}>{t('profile.noMedications')}</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.viewHistoryBtn}
                        onPress={() => router.push('/(tabs)/consultations')}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.viewHistoryText}>{t('profile.viewFullHistory')} →</Text>
                    </TouchableOpacity>
                </View>

                {/* Token Wallet */}
                <View style={styles.walletCard}>
                    <View style={styles.walletHeader}>
                        <Text style={styles.walletTitle}>{t('profile.tokenWallet')}</Text>
                        <TouchableOpacity onPress={() => setShowPurchase(true)}>
                            <Text style={styles.buyLink}>{t('profile.buyLink')}</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.walletBalance}>
                        <Text style={styles.walletAmount}>{toLocalNum(user?.tokens_balance ?? 0)}</Text>
                        <Text style={styles.walletLabel}>{t('profile.tokensAvailable')}</Text>
                    </View>

                    {/* Transaction History */}
                    <Text style={styles.txTitle}>{t('profile.recentActivity')}</Text>
                    {transactions.map((tx) => (
                        <View key={tx.id} style={styles.txRow}>
                            <Text style={styles.txIcon}>{TX_ICONS[tx.type] || '•'}</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.txDesc}>{tx.description}</Text>
                                <Text style={styles.txDate}>{localDate(tx.created_at)}</Text>
                            </View>
                            <Text style={[styles.txAmount, tx.amount > 0 ? styles.txPositive : styles.txNegative]}>
                                {tx.amount > 0 ? '+' : ''}{toLocalNum(tx.amount)}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Menu Items */}
                <View style={styles.menu}>
                    <Text style={styles.menuSectionTitle}>{t('profile.settingsTitle')}</Text>
                    <MenuItem icon="👤" label={t('profile.editProfile')} onPress={() => router.push('/settings/edit-profile')} />
                    <MenuItem icon="🪪" label={t('profile.verifyIdentity')} onPress={() => router.push('/settings/verify-identity')} />
                    <MenuItem icon="🏥" label={t('profile.insurance')} onPress={() => router.push('/settings/insurance')} />
                    <MenuItem icon="🔔" label={t('profile.notifications')} onPress={() => router.push('/settings/notifications')} />
                    <MenuItem icon="🌐" label={t('profile.language')} onPress={() => router.push('/settings/language')} />
                    <MenuItem icon="🔒" label={t('profile.security')} onPress={() => router.push('/settings/security')} />

                    <Text style={[styles.menuSectionTitle, { marginTop: spacing.xl }]}>{t('profile.supportTitle')}</Text>
                    <MenuItem icon="❓" label={t('profile.help')} onPress={() => router.push('/settings/help')} />
                    <MenuItem icon="🔒" label={t('profile.privacyPolicy')} onPress={() => router.push('/settings/privacy-terms' as any)} />
                    <MenuItem icon="📜" label={t('profile.terms')} onPress={() => router.push('/settings/privacy-terms' as any)} />
                    <MenuItem icon="🐛" label={t('profile.reportBug')} />
                </View>

                {/* App Version */}
                <Text style={styles.versionText}>cliniq.one v{APP.VERSION}</Text>

                {/* Logout */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutText}>🚪 {t('profile.signOut')}</Text>
                </TouchableOpacity>
            </ScrollView>

            <TokenPurchaseModal
                visible={showPurchase}
                onClose={() => setShowPurchase(false)}
                currentBalance={user?.tokens_balance ?? 0}
            />
        </SafeAreaView>
    );
}

function MenuItem({ icon, label, onPress }: { icon: string; label: string; onPress?: () => void }) {
    return (
        <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={onPress}>
            <Text style={styles.menuIcon}>{icon}</Text>
            <Text style={styles.menuLabel}>{label}</Text>
            <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing['2xl'], paddingBottom: spacing['4xl'] },
    title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.xl },

    // Profile
    profileCard: {
        alignItems: 'center',
        backgroundColor: colors.bgCard,
        padding: spacing.xl,
        borderRadius: radius.xl,
        marginBottom: spacing.xl,
        ...shadows.card,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: spacing.md,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.accentTealFaded,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: colors.accentTeal,
    },
    avatarText: { fontSize: 30, fontWeight: '700', color: colors.accentTeal },
    cameraBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.accentTeal,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.bgCard,
    },
    cameraIcon: { fontSize: 13 },
    name: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.xxs },
    email: { ...typography.bodySm, color: colors.textSecondary, marginBottom: spacing.sm },

    // Stats
    statsGrid: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
    statCard: {
        flex: 1,
        backgroundColor: colors.bgCard,
        borderRadius: radius.lg,
        padding: spacing.md,
        alignItems: 'center',
        ...shadows.card,
    },
    statValue: { ...typography.h3, color: colors.accentTeal },
    statLabel: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },

    // Medical History
    historyCard: {
        backgroundColor: colors.bgCard,
        borderRadius: radius.xl,
        padding: spacing.xl,
        marginBottom: spacing.xl,
        ...shadows.card,
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    historyTitle: { ...typography.h4, color: colors.textPrimary },
    historyGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    historyItem: {
        flex: 1,
        alignItems: 'center',
    },
    historyItemIcon: { fontSize: 20, marginBottom: spacing.xs },
    historyItemValue: { ...typography.h4, color: colors.accentTeal, marginBottom: 2 },
    historyItemLabel: { ...typography.caption, color: colors.textTertiary, textAlign: 'center' },
    historyDivider: {
        width: 1,
        height: 40,
        backgroundColor: colors.border,
    },
    historyDetails: {
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: spacing.md,
        gap: spacing.sm,
    },
    historyDetailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    historyDetailLabel: { ...typography.bodySm, color: colors.textSecondary },
    historyDetailValue: { ...typography.bodySm, color: colors.textPrimary, fontWeight: '600' },
    viewHistoryBtn: {
        marginTop: spacing.lg,
        paddingVertical: spacing.sm,
        alignItems: 'center',
        backgroundColor: colors.accentTealFaded,
        borderRadius: radius.lg,
    },
    viewHistoryText: { ...typography.bodySm, color: colors.accentTeal, fontWeight: '700' },

    // Wallet
    walletCard: {
        backgroundColor: colors.bgCard,
        borderRadius: radius.xl,
        padding: spacing.xl,
        marginBottom: spacing.xl,
        ...shadows.card,
    },
    walletHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
    walletTitle: { ...typography.h4, color: colors.textPrimary },
    buyLink: { ...typography.body, color: colors.accentTeal, fontWeight: '600' },
    walletBalance: { alignItems: 'center', marginBottom: spacing.xl },
    walletAmount: { fontSize: 40, fontWeight: '800', color: colors.accentTeal },
    walletLabel: { ...typography.bodySm, color: colors.textSecondary },
    txTitle: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.md },
    txRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 0.5, borderBottomColor: colors.border },
    txIcon: { fontSize: 18 },
    txDesc: { ...typography.body, color: colors.textPrimary },
    txDate: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },
    txAmount: { ...typography.h4 },
    txPositive: { color: colors.success },
    txNegative: { color: colors.error },

    // Menu
    menu: { marginTop: spacing.lg },
    menuSectionTitle: { ...typography.label, color: colors.textTertiary, marginBottom: spacing.sm, textTransform: 'uppercase' as const },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    menuIcon: { fontSize: 20, marginRight: spacing.lg },
    menuLabel: { ...typography.body, color: colors.textPrimary, flex: 1 },
    menuArrow: { fontSize: 22, color: colors.textTertiary },

    // Version
    versionText: { ...typography.caption, color: colors.textTertiary, textAlign: 'center', marginTop: spacing['2xl'] },

    // Logout
    logoutButton: {
        marginTop: spacing.lg,
        marginBottom: spacing.xl,
        paddingVertical: spacing.lg,
        alignItems: 'center',
        backgroundColor: colors.errorFaded,
        borderRadius: radius.lg,
    },
    logoutText: { ...typography.button, color: colors.error },
});
