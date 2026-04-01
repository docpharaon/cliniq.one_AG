import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius } from '@cliniqone/ui';
import { t } from '@cliniqone/i18n';
import { APP } from '@cliniqone/config';

const PRIVACY_URL = 'https://cliniq.one/privacy';
const TERMS_URL = 'https://cliniq.one/terms';

export default function PrivacyTermsScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Text style={styles.backText}>← {t('common.back')}</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>📜 {t('settings.privacyTermsTitle')}</Text>
                </View>

                {/* Privacy Policy Card */}
                <TouchableOpacity
                    style={styles.card}
                    activeOpacity={0.7}
                    onPress={() => Linking.openURL(PRIVACY_URL)}
                >
                    <View style={styles.cardRow}>
                        <Text style={styles.cardIcon}>🔒</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cardTitle}>{t('settings.privacyPolicyTitle')}</Text>
                            <Text style={styles.cardDesc}>
                                {t('settings.privacyPolicyDesc')}
                            </Text>
                        </View>
                        <Text style={styles.cardArrow}>→</Text>
                    </View>
                </TouchableOpacity>

                {/* Terms of Service Card */}
                <TouchableOpacity
                    style={styles.card}
                    activeOpacity={0.7}
                    onPress={() => Linking.openURL(TERMS_URL)}
                >
                    <View style={styles.cardRow}>
                        <Text style={styles.cardIcon}>📋</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cardTitle}>{t('settings.termsOfServiceTitle')}</Text>
                            <Text style={styles.cardDesc}>
                                {t('settings.termsOfServiceDesc')}
                            </Text>
                        </View>
                        <Text style={styles.cardArrow}>→</Text>
                    </View>
                </TouchableOpacity>

                {/* Medical Disclaimer */}
                <View style={styles.disclaimerCard}>
                    <Text style={styles.disclaimerIcon}>⚕️</Text>
                    <Text style={styles.disclaimerTitle}>{t('settings.medicalDisclaimer')}</Text>
                    <Text style={styles.disclaimerBody}>
                        {t('settings.disclaimerP1')}
                    </Text>
                    <Text style={styles.disclaimerBody}>
                        {t('settings.disclaimerP2')}
                    </Text>
                </View>

                {/* Data Rights */}
                <View style={styles.rightsCard}>
                    <Text style={styles.rightsTitle}>{t('settings.dataRightsTitle')}</Text>
                    <View style={styles.rightsList}>
                        <Text style={styles.rightsItem}>✅ {t('settings.rightAccess')}</Text>
                        <Text style={styles.rightsItem}>✅ {t('settings.rightCorrect')}</Text>
                        <Text style={styles.rightsItem}>✅ {t('settings.rightDelete')}</Text>
                        <Text style={styles.rightsItem}>✅ {t('settings.rightExport')}</Text>
                        <Text style={styles.rightsItem}>✅ {t('settings.rightWithdraw')}</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.deleteAccountLink}
                        onPress={() => router.push('/settings/delete-account' as any)}
                    >
                        <Text style={styles.deleteAccountText}>{t('settings.deleteMyAccount')} →</Text>
                    </TouchableOpacity>
                </View>

                {/* Version */}
                <Text style={styles.versionText}>
                    cliniq.one v{APP.VERSION} • {t('settings.lastUpdated')}
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing['4xl'] },
    header: { paddingTop: spacing.lg, marginBottom: spacing.xl },
    backText: { ...typography.body, color: colors.accentTeal, marginBottom: spacing.md },
    title: { ...typography.h2, color: colors.textPrimary },

    card: {
        backgroundColor: colors.bgCard,
        borderRadius: radius.xl,
        padding: spacing.xl,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    cardIcon: { fontSize: 28 },
    cardTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: 2 },
    cardDesc: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
    cardArrow: { fontSize: 20, color: colors.accentTeal },

    disclaimerCard: {
        backgroundColor: colors.accentTealFaded,
        borderRadius: radius.xl,
        padding: spacing.xl,
        marginTop: spacing.lg,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderFocused,
    },
    disclaimerIcon: { fontSize: 28, textAlign: 'center' as const, marginBottom: spacing.sm },
    disclaimerTitle: { ...typography.h4, color: colors.textPrimary, textAlign: 'center' as const, marginBottom: spacing.md },
    disclaimerBody: { ...typography.bodySm, color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.md },

    rightsCard: {
        backgroundColor: colors.bgCard,
        borderRadius: radius.xl,
        padding: spacing.xl,
        marginBottom: spacing.xl,
        borderWidth: 1,
        borderColor: colors.border,
    },
    rightsTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: spacing.md },
    rightsList: { gap: spacing.sm, marginBottom: spacing.lg },
    rightsItem: { ...typography.bodySm, color: colors.textSecondary, lineHeight: 20 },
    deleteAccountLink: {
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: spacing.md,
    },
    deleteAccountText: { ...typography.bodySm, color: colors.error, fontWeight: '600' },

    versionText: {
        ...typography.caption,
        color: colors.textTertiary,
        textAlign: 'center' as const,
    },
});
