import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button } from '@cliniqone/ui';
import { colors, spacing, typography, radius, shadows } from '@cliniqone/ui';
import { useAuthStore } from '../../stores/authStore';
import { t, getLocale, setLocale } from '@cliniqone/i18n';
import { TokenPurchaseModal } from '../../components/TokenPurchaseModal';
import { useConsultations } from '../../hooks/useConsultations';
import { CONSULTATION_STATUS_LABELS } from '@cliniqone/config';
import type { ConsultationStatus } from '@cliniqone/types';

// ── Status colors ────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
    draft: colors.textTertiary,
    intake_in_progress: colors.accentTeal,
    pending_payment: colors.warning,
    submitted: colors.info,
    assigned: colors.accentTealDark,
    in_progress: colors.info,
    report_ready: colors.purple,
    completed: colors.success,
    cancelled: colors.error,
};

// ── Active statuses (show banner) ────────────────
const ACTIVE_STATUSES: ConsultationStatus[] = ['submitted', 'assigned', 'in_progress'];

// ── Quick Actions ────────────────────────────────
const QUICK_ACTIONS = [
    { icon: '🩺', label: 'New Consultation', route: '/intake' },
    { icon: '📋', label: 'View History', route: '/(tabs)/consultations' },
    { icon: '🧪', label: 'My Tests', route: '/interventions' },
    { icon: '💰', label: 'Buy Tokens', action: 'purchase' },
    { icon: '❓', label: 'Help', route: '/settings/help' },
];

// ── Health Tips ──────────────────────────────────
const HEALTH_TIPS = [
    { icon: '💧', title: 'Stay Hydrated', text: 'Drink 8 glasses of water daily for better health.' },
    { icon: '🚶', title: 'Stay Active', text: 'A 30-min daily walk boosts mood and heart health.' },
    { icon: '😴', title: 'Sleep Well', text: 'Adults need 7-9 hours of sleep each night.' },
];

export default function DashboardScreen() {
    const { user } = useAuthStore();
    const name = user?.nickname || 'there';
    const [showPurchase, setShowPurchase] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [lang, setLang] = useState<'en' | 'ar'>(getLocale());

    function toggleLanguage() {
        const next = lang === 'en' ? 'ar' : 'en';
        Alert.alert(
            next === 'ar' ? 'تغيير اللغة' : 'Change Language',
            next === 'ar'
                ? 'سيتم إعادة تشغيل التطبيق لتطبيق اللغة العربية.'
                : 'The app will restart to apply English.',
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: next === 'ar' ? 'تغيير' : 'Change',
                    onPress: async () => {
                        setLang(next);
                        await setLocale(next);
                        try {
                            const Updates = require('expo-updates');
                            await Updates.reloadAsync();
                        } catch {
                            if (Platform.OS === 'web') {
                                (globalThis as any).location?.reload();
                            } else {
                                router.replace('/(tabs)');
                            }
                        }
                    },
                },
            ]
        );
    }

    // Live recent consultations
    const { data: consultations, isLoading, refetch } = useConsultations(user?.id || '');
    const recentConsultations = (consultations || []).slice(0, 3);

    // Find active consultation for banner
    const activeConsultation = (consultations || []).find(
        (c: any) => ACTIVE_STATUSES.includes(c.status)
    );

    const getStatusLabel = (status: string) => {
        const entry = CONSULTATION_STATUS_LABELS[status];
        return entry ? `${entry.emoji} ${entry.label}` : status;
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    function handleQuickAction(action: typeof QUICK_ACTIONS[0]) {
        if (action.action === 'purchase') {
            setShowPurchase(true);
        } else if (action.route) {
            router.push(action.route as any);
        }
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
                {/* Greeting + Language Toggle */}
                <View style={styles.greetingRow}>
                    <Text style={styles.greeting}>
                        {t('dashboard.greeting', { name })}
                    </Text>
                    <TouchableOpacity style={styles.langToggle} onPress={toggleLanguage}>
                        <Text style={styles.langToggleText}>
                            {lang === 'ar' ? '🇬🇧' : '🇸🇦'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Active Consultation Banner */}
                {activeConsultation && (
                    <TouchableOpacity
                        style={styles.activeBanner}
                        onPress={() => router.push(`/consultation/waiting-room?id=${activeConsultation.id}`)}
                        activeOpacity={0.8}
                    >
                        <View style={styles.activeBannerDot} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.activeBannerTitle}>{t('dashboard.activeConsultation')}</Text>
                            <Text style={styles.activeBannerStatus}>
                                {getStatusLabel(activeConsultation.status)}
                            </Text>
                        </View>
                        <Text style={styles.activeBannerArrow}>→</Text>
                    </TouchableOpacity>
                )}

                {/* Token Balance Card */}
                <View style={styles.tokenCard}>
                    <View style={styles.tokenContent}>
                        <Text style={styles.tokenLabel}>{t('dashboard.tokenBalance')}</Text>
                        <View style={styles.tokenRow}>
                            <Text style={styles.tokenValue}>{user?.tokens_balance ?? 0}</Text>
                            <Text style={styles.tokenUnit}>tokens</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.buyBtn} onPress={() => setShowPurchase(true)}>
                        <Text style={styles.buyBtnText}>+ {t('dashboard.buyTokens')}</Text>
                    </TouchableOpacity>
                </View>

                {/* Start Consultation CTA */}
                <TouchableOpacity style={styles.ctaCard} activeOpacity={0.85} onPress={() => router.push('/intake')}>
                    <View style={styles.ctaContent}>
                        <Text style={styles.ctaIcon}>🩺</Text>
                        <View>
                            <Text style={styles.ctaTitle}>{t('dashboard.startConsultation')}</Text>
                            <Text style={styles.ctaSubtitle}>AI-powered intake → Doctor review</Text>
                        </View>
                    </View>
                    <Text style={styles.ctaArrow}>→</Text>
                </TouchableOpacity>

                {/* Quick Actions */}
                <Text style={styles.sectionTitle}>{t('dashboard.quickActions')}</Text>
                <View style={styles.actionsGrid}>
                    {QUICK_ACTIONS.map((action, i) => (
                        <TouchableOpacity
                            key={i}
                            style={styles.actionCard}
                            onPress={() => handleQuickAction(action)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.actionIcon}>{action.icon}</Text>
                            <Text style={styles.actionLabel}>{action.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Recent Consultations */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('dashboard.recentConsults')}</Text>
                    {isLoading ? (
                        <ActivityIndicator color={colors.accentTeal} style={{ marginVertical: spacing.xl }} />
                    ) : recentConsultations.length > 0 ? (
                        <View style={{ gap: spacing.sm }}>
                            {recentConsultations.map((c: any) => (
                                <TouchableOpacity
                                    key={c.id}
                                    style={styles.consultCard}
                                    onPress={() => router.push(`/consultation/${c.id}`)}
                                    activeOpacity={0.7}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.consultComplaint} numberOfLines={1}>
                                            {c.chief_complaint || 'Consultation'}
                                        </Text>
                                        <Text style={styles.consultDate}>
                                            {new Date(c.created_at).toLocaleDateString('en-US', {
                                                month: 'short', day: 'numeric', year: 'numeric',
                                            })}
                                        </Text>
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[c.status] || colors.textTertiary) + '20' }]}>
                                        <Text style={[styles.statusText, { color: STATUS_COLORS[c.status] || colors.textTertiary }]}>
                                            {getStatusLabel(c.status)}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                            {(consultations?.length || 0) > 3 && (
                                <TouchableOpacity onPress={() => router.push('/(tabs)/consultations')} style={styles.viewAllButton}>
                                    <Text style={styles.viewAllText}>View All Consultations →</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : (
                        <Card variant="outlined">
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyIcon}>📋</Text>
                                <Text style={styles.emptyTitle}>{t('dashboard.noConsults')}</Text>
                                <Text style={styles.emptySubtitle}>{t('dashboard.startFirst')}</Text>
                            </View>
                        </Card>
                    )}
                </View>

                {/* Health Tips */}
                <Text style={styles.sectionTitle}>{t('dashboard.healthTips')}</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tipsScroll}
                >
                    {HEALTH_TIPS.map((tip, i) => (
                        <View key={i} style={styles.tipCard}>
                            <Text style={styles.tipIcon}>{tip.icon}</Text>
                            <Text style={styles.tipTitle}>{tip.title}</Text>
                            <Text style={styles.tipText}>{tip.text}</Text>
                        </View>
                    ))}
                </ScrollView>

                {/* Quick Info */}
                <View style={styles.infoGrid}>
                    <View style={styles.infoCard}>
                        <Text style={styles.infoIcon}>⏱️</Text>
                        <Text style={styles.infoLabel}>Response Time</Text>
                        <Text style={styles.infoValue}>2-4 hours</Text>
                    </View>
                    <View style={styles.infoCard}>
                        <Text style={styles.infoIcon}>💰</Text>
                        <Text style={styles.infoLabel}>Per Consultation</Text>
                        <Text style={styles.infoValue}>3 tokens</Text>
                    </View>
                </View>
            </ScrollView>

            {/* Token Purchase Modal */}
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
    greeting: { ...typography.h2, color: colors.textPrimary, flex: 1 },
    greetingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: spacing['2xl'],
        marginBottom: spacing.xl,
    },
    langToggle: {
        backgroundColor: colors.bgCard,
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    langToggleText: {
        fontSize: 18,
    },

    // Active consultation banner
    activeBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        backgroundColor: colors.infoFaded,
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.info + '40',
    },
    activeBannerDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.info,
    },
    activeBannerTitle: { ...typography.label, color: colors.textSecondary },
    activeBannerStatus: { ...typography.body, color: colors.textPrimary, fontWeight: '600', marginTop: spacing.xxs },
    activeBannerArrow: { fontSize: 18, color: colors.info, fontWeight: '600' },

    // Token card
    tokenCard: {
        backgroundColor: colors.bgCard,
        borderRadius: radius.xl,
        padding: spacing.xl,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.lg,
        ...shadows.card,
    },
    tokenContent: {},
    tokenLabel: { ...typography.bodySm, color: colors.textSecondary, marginBottom: spacing.xs },
    tokenRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
    tokenValue: { fontSize: 36, fontWeight: '800', color: colors.accentTeal },
    tokenUnit: { ...typography.body, color: colors.textTertiary },
    buyBtn: {
        backgroundColor: colors.accentTealFaded,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radius.full,
    },
    buyBtnText: { ...typography.buttonSm, color: colors.accentTeal },

    // CTA
    ctaCard: {
        backgroundColor: colors.accentTealFaded,
        borderRadius: radius.xl,
        padding: spacing.xl,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing['2xl'],
        borderWidth: 1,
        borderColor: colors.accentTeal + '40',
    },
    ctaContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    ctaIcon: { fontSize: 28 },
    ctaTitle: { ...typography.h4, color: colors.accentTeal },
    ctaSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xxs },
    ctaArrow: { fontSize: 20, color: colors.accentTeal, fontWeight: '600' },

    // Quick Actions
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing['2xl'],
    },
    actionCard: {
        width: '48%' as any,
        backgroundColor: colors.bgCard,
        borderRadius: radius.lg,
        padding: spacing.lg,
        alignItems: 'center',
        ...shadows.card,
    },
    actionIcon: { fontSize: 24, marginBottom: spacing.sm },
    actionLabel: { ...typography.buttonSm, color: colors.textPrimary, textAlign: 'center' },

    // Section
    section: { marginBottom: spacing['2xl'] },
    sectionTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: spacing.md },

    // Consultation cards
    consultCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgCard,
        padding: spacing.lg,
        borderRadius: radius.lg,
        ...shadows.card,
    },
    consultComplaint: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
    consultDate: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.xxs },
    statusBadge: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: radius.full,
        marginLeft: spacing.sm,
    },
    statusText: { ...typography.caption, fontWeight: '600', fontSize: 11 },
    viewAllButton: { alignItems: 'center', paddingVertical: spacing.md },
    viewAllText: { ...typography.bodySm, color: colors.accentTeal, fontWeight: '600' },

    // Empty state
    emptyState: { alignItems: 'center', paddingVertical: spacing['2xl'] },
    emptyIcon: { fontSize: 36, marginBottom: spacing.md },
    emptyTitle: { ...typography.body, color: colors.textSecondary, fontWeight: '600' },
    emptySubtitle: { ...typography.bodySm, color: colors.textTertiary, marginTop: spacing.xs },

    // Health Tips
    tipsScroll: { gap: spacing.sm, paddingBottom: spacing.sm, marginBottom: spacing['2xl'] },
    tipCard: {
        width: 200,
        backgroundColor: colors.bgCard,
        borderRadius: radius.lg,
        padding: spacing.lg,
        ...shadows.card,
    },
    tipIcon: { fontSize: 24, marginBottom: spacing.sm },
    tipTitle: { ...typography.buttonSm, color: colors.textPrimary, marginBottom: spacing.xs },
    tipText: { ...typography.caption, color: colors.textTertiary, lineHeight: 16 },

    // Info grid
    infoGrid: { flexDirection: 'row', gap: spacing.md },
    infoCard: {
        flex: 1,
        backgroundColor: colors.bgCard,
        borderRadius: radius.lg,
        padding: spacing.lg,
        alignItems: 'center',
        ...shadows.card,
    },
    infoIcon: { fontSize: 24, marginBottom: spacing.sm },
    infoLabel: { ...typography.caption, color: colors.textTertiary, marginBottom: spacing.xxs },
    infoValue: { ...typography.h4, color: colors.textPrimary },
});
