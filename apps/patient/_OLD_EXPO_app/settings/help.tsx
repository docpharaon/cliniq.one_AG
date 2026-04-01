import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius, shadows } from '@cliniqone/ui';
import { t } from '@cliniqone/i18n';
import { APP } from '@cliniqone/config';

function FAQItem({ question, answer }: { question: string; answer: string }) {
    return (
        <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>{question}</Text>
            <Text style={styles.faqAnswer}>{answer}</Text>
        </View>
    );
}

export default function HelpScreen() {
    function handleEmail() {
        Linking.openURL('mailto:support@cliniq.one?subject=Patient%20App%20Support');
    }

    function handleWhatsApp() {
        Linking.openURL('https://wa.me/966500000000?text=Hello%20cliniq.one%20support');
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backText}>← {t('common.back')}</Text>
                </TouchableOpacity>

                <Text style={styles.title}>💬 {t('help.title')}</Text>
                <Text style={styles.subtitle}>{t('help.subtitle')}</Text>

                {/* Contact Options */}
                <Text style={styles.sectionTitle}>{t('help.contactUs')}</Text>
                <View style={styles.contactGrid}>
                    <TouchableOpacity style={styles.contactCard} onPress={handleEmail} activeOpacity={0.7}>
                        <Text style={styles.contactIcon}>📧</Text>
                        <Text style={styles.contactLabel}>{t('help.email')}</Text>
                        <Text style={styles.contactValue}>support@cliniq.one</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.contactCard} onPress={handleWhatsApp} activeOpacity={0.7}>
                        <Text style={styles.contactIcon}>💬</Text>
                        <Text style={styles.contactLabel}>{t('help.whatsapp')}</Text>
                        <Text style={styles.contactValue}>{t('help.chatNow')}</Text>
                    </TouchableOpacity>
                </View>

                {/* FAQ */}
                <Text style={styles.sectionTitle}>{t('help.faqTitle')}</Text>

                <FAQItem
                    question={t('help.faq1Q')}
                    answer={t('help.faq1A')}
                />
                <FAQItem
                    question={t('help.faq2Q')}
                    answer={t('help.faq2A')}
                />
                <FAQItem
                    question={t('help.faq3Q')}
                    answer={t('help.faq3A')}
                />
                <FAQItem
                    question={t('help.faq4Q')}
                    answer={t('help.faq4A')}
                />
                <FAQItem
                    question={t('help.faq5Q')}
                    answer={t('help.faq5A')}
                />

                {/* App Info */}
                <View style={styles.appInfo}>
                    <Text style={styles.appName}>cliniq.one</Text>
                    <Text style={styles.appVersion}>v1.0.0</Text>
                    <Text style={styles.appCopy}>© 2025–2026 cliniq.one. {t('help.allRightsReserved')}</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing['4xl'] },

    backButton: { paddingTop: spacing.lg, marginBottom: spacing.lg },
    backText: { ...typography.body, color: colors.accentTeal },

    title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.sm },
    subtitle: { ...typography.body, color: colors.textSecondary, lineHeight: 22, marginBottom: spacing['2xl'] },

    sectionTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: spacing.lg },

    // Contact grid
    contactGrid: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing['3xl'] },
    contactCard: {
        flex: 1,
        backgroundColor: colors.bgCard,
        borderRadius: radius.lg,
        padding: spacing.xl,
        alignItems: 'center',
        ...shadows.card,
    },
    contactIcon: { fontSize: 28, marginBottom: spacing.sm },
    contactLabel: { ...typography.bodySm, color: colors.textPrimary, fontWeight: '600', marginBottom: spacing.xxs },
    contactValue: { ...typography.caption, color: colors.accentTeal },

    // FAQ
    faqItem: {
        backgroundColor: colors.bgCard,
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
        ...shadows.card,
    },
    faqQuestion: { ...typography.body, color: colors.textPrimary, fontWeight: '700', marginBottom: spacing.sm },
    faqAnswer: { ...typography.bodySm, color: colors.textSecondary, lineHeight: 20 },

    // App Info
    appInfo: {
        alignItems: 'center',
        paddingTop: spacing['2xl'],
        paddingBottom: spacing.xl,
    },
    appName: { ...typography.h4, color: colors.textTertiary },
    appVersion: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.xxs },
    appCopy: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.xs },
});
