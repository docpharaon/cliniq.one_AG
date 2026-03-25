import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@cliniqone/ui';
import { colors, spacing, typography, radius, shadows } from '@cliniqone/ui';
import { requestKycToken, safeFetch } from '@cliniqone/api';
import { useAuthStore } from '../../stores/authStore';
import { t } from '@cliniqone/i18n';
import type { KycStatus } from '@cliniqone/types';
import { useToast } from '../../components/ToastProvider';

const STATUS_CONFIG: Record<KycStatus, { icon: string; title: string; desc: string; color: string; bg: string }> = {
    not_started: {
        icon: '🪪',
        title: 'Identity Not Verified',
        desc: 'Verify your identity to receive prescriptions and medical reports from your doctor.',
        color: colors.textSecondary,
        bg: colors.bgTertiary,
    },
    pending: {
        icon: '⏳',
        title: 'Verification In Progress',
        desc: 'Your identity is being reviewed. This usually takes a few minutes.',
        color: colors.warning,
        bg: colors.warningFaded,
    },
    approved: {
        icon: '✅',
        title: 'Identity Verified',
        desc: 'Your identity has been verified. You can receive prescriptions and medical reports.',
        color: colors.success,
        bg: colors.successFaded,
    },
    rejected: {
        icon: '❌',
        title: 'Verification Failed',
        desc: 'Your identity verification was not successful. Please try again with a valid ID document.',
        color: colors.error,
        bg: colors.errorFaded,
    },
    resubmission_requested: {
        icon: '🔄',
        title: 'Resubmission Required',
        desc: 'We need additional information. Please re-submit your verification documents.',
        color: colors.warning,
        bg: colors.warningFaded,
    },
    exempt: {
        icon: '✅',
        title: 'Verification Exempt',
        desc: 'Your account has been exempted from identity verification by an administrator.',
        color: colors.success,
        bg: colors.successFaded,
    },
};

export default function VerifyIdentityScreen() {
    const { user, refreshUser } = useAuthStore();
    const kycStatus: KycStatus = (user?.kyc_status as KycStatus) || 'not_started';
    const config = STATUS_CONFIG[kycStatus];
    const [loading, setLoading] = useState(false);
    const toast = useToast((s) => s.show);

    const canStartVerification = kycStatus === 'not_started' || kycStatus === 'rejected' || kycStatus === 'resubmission_requested';

    async function handleStartVerification() {
        setLoading(true);
        try {
            const result = await safeFetch(
                () => requestKycToken(),
                { timeout: 10000, retries: 1, label: 'requestKycToken' },
            );

            if ('status' in result && result.status === 'already_verified') {
                toast('Your identity is already verified!', 'info');
                await refreshUser?.();
                return;
            }

            if ('token' in result) {
                // In production, launch Sumsub SDK with the token:
                // SNSMobileSDK.init(result.token, () => requestKycToken())
                //   .withHandlers({ ... })
                //   .build()
                //   .launch();

                toast('Verification ready! SDK token generated.', 'success');
            }
        } catch (err) {
            console.error('KYC token error:', err);
            const message = err instanceof Error ? err.message : 'Please try again later.';
            toast(`Could not start verification: ${message}`, 'error');
        } finally {
            setLoading(false);
        }
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Text style={styles.backText}>← {t('common.back')}</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>🪪 Identity Verification</Text>
                </View>

                {/* Status Card */}
                <View style={[styles.statusCard, { borderColor: config.color }]}>
                    <Text style={styles.statusIcon}>{config.icon}</Text>
                    <Text style={[styles.statusTitle, { color: config.color }]}>{config.title}</Text>
                    <Text style={styles.statusDesc}>{config.desc}</Text>

                    {user?.kyc_verified_at && (
                        <Text style={styles.verifiedDate}>
                            Verified on {new Date(user.kyc_verified_at).toLocaleDateString()}
                        </Text>
                    )}

                    {user?.kyc_rejection_reason && kycStatus === 'rejected' && (
                        <View style={styles.rejectionBox}>
                            <Text style={styles.rejectionLabel}>Reason:</Text>
                            <Text style={styles.rejectionText}>{user.kyc_rejection_reason}</Text>
                        </View>
                    )}
                </View>

                {/* Why Verify */}
                <View style={styles.whyCard}>
                    <Text style={styles.whyTitle}>Why verify your identity?</Text>
                    <View style={styles.whyItem}>
                        <Text style={styles.whyIcon}>💊</Text>
                        <Text style={styles.whyText}>Receive prescriptions from your doctor</Text>
                    </View>
                    <View style={styles.whyItem}>
                        <Text style={styles.whyIcon}>📋</Text>
                        <Text style={styles.whyText}>Access detailed medical reports</Text>
                    </View>
                    <View style={styles.whyItem}>
                        <Text style={styles.whyIcon}>🔒</Text>
                        <Text style={styles.whyText}>Ensure medical-legal compliance</Text>
                    </View>
                    <View style={styles.whyItem}>
                        <Text style={styles.whyIcon}>⚡</Text>
                        <Text style={styles.whyText}>Quick process — takes under 2 minutes</Text>
                    </View>
                </View>

                {/* What You Need */}
                <View style={styles.needsCard}>
                    <Text style={styles.needsTitle}>What you'll need</Text>
                    <Text style={styles.needsItem}>📄 A valid government-issued ID (passport, national ID, or driver's license)</Text>
                    <Text style={styles.needsItem}>📸 A clear selfie for liveness verification</Text>
                    <Text style={styles.needsItem}>💡 Good lighting and a steady hand</Text>
                </View>

                {/* Action Button */}
                {canStartVerification && (
                    <View style={{ marginTop: spacing.xl }}>
                        <Button
                            title={loading ? 'Starting Verification...' : kycStatus === 'not_started' ? 'Start Verification' : 'Retry Verification'}
                            onPress={handleStartVerification}
                            size="lg"
                            disabled={loading}
                        />
                    </View>
                )}

                {kycStatus === 'pending' && (
                    <TouchableOpacity
                        style={styles.refreshButton}
                        onPress={async () => {
                            await refreshUser?.();
                        }}
                    >
                        <Text style={styles.refreshText}>🔄 Refresh Status</Text>
                    </TouchableOpacity>
                )}

                {/* Privacy Note */}
                <View style={styles.privacyNote}>
                    <Text style={styles.privacyText}>
                        🔒 Your documents are securely processed by Sumsub, a certified identity verification provider.
                        cliniq.one does not store your ID documents.
                    </Text>
                </View>
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

    statusCard: {
        backgroundColor: colors.bgCard,
        borderRadius: radius.xl,
        padding: spacing['2xl'],
        alignItems: 'center',
        marginBottom: spacing.xl,
        borderWidth: 2,
        ...shadows.card,
    },
    statusIcon: { fontSize: 48, marginBottom: spacing.md },
    statusTitle: { ...typography.h3, marginBottom: spacing.sm, textAlign: 'center' },
    statusDesc: { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
    verifiedDate: { ...typography.caption, color: colors.success, marginTop: spacing.md },

    rejectionBox: {
        backgroundColor: colors.errorFaded,
        borderRadius: radius.md,
        padding: spacing.md,
        marginTop: spacing.md,
        width: '100%',
    },
    rejectionLabel: { ...typography.label, color: colors.error, marginBottom: spacing.xs },
    rejectionText: { ...typography.bodySm, color: colors.textPrimary },

    whyCard: {
        backgroundColor: colors.bgCard,
        borderRadius: radius.xl,
        padding: spacing.xl,
        marginBottom: spacing.xl,
        ...shadows.card,
    },
    whyTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: spacing.lg },
    whyItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
    whyIcon: { fontSize: 20 },
    whyText: { ...typography.body, color: colors.textSecondary, flex: 1 },

    needsCard: {
        backgroundColor: colors.bgCard,
        borderRadius: radius.xl,
        padding: spacing.xl,
        marginBottom: spacing.xl,
        ...shadows.card,
    },
    needsTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: spacing.lg },
    needsItem: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.md, lineHeight: 22 },

    refreshButton: {
        marginTop: spacing.xl,
        paddingVertical: spacing.lg,
        alignItems: 'center',
        backgroundColor: colors.accentTealFaded,
        borderRadius: radius.lg,
    },
    refreshText: { ...typography.body, color: colors.accentTeal, fontWeight: '600' },

    privacyNote: {
        marginTop: spacing['2xl'],
        padding: spacing.lg,
        backgroundColor: colors.bgTertiary,
        borderRadius: radius.md,
    },
    privacyText: { ...typography.caption, color: colors.textTertiary, textAlign: 'center', lineHeight: 18 },
});
