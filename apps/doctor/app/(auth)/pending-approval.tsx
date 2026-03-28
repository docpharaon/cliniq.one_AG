import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radius } from '@cliniqone/ui';
import { supabase } from '@cliniqone/api';
import { useAuthStore } from '../../stores/authStore';

export default function PendingApprovalScreen() {
    const { clear } = useAuthStore();

    async function handleLogout() {
        try {
            await supabase.auth.signOut();
            clear();
            router.replace('/(auth)/login');
        } catch (err) {
            console.error('Logout error:', err);
        }
    }

    async function handleRefresh() {
        await useAuthStore.getState().initialize();
        const doctor = useAuthStore.getState().doctor;
        if (doctor && doctor.status === 'active') {
            router.replace('/(tabs)');
        }
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {/* Icon */}
                <Text style={styles.icon}>⏳</Text>

                {/* Title */}
                <Text style={styles.title}>Application Under Review</Text>

                {/* Description */}
                <Text style={styles.description}>
                    Your doctor account has been created successfully. An administrator will review and approve your registration.
                </Text>

                {/* Status card */}
                <View style={styles.statusCard}>
                    <View style={styles.statusRow}>
                        <Text style={styles.statusLabel}>Status</Text>
                        <View style={styles.statusBadge}>
                            <Text style={styles.statusBadgeText}>Pending Review</Text>
                        </View>
                    </View>
                    <Text style={styles.statusHint}>
                        You'll be notified once your account is approved. This usually takes 1-2 business days.
                    </Text>
                </View>

                {/* What happens next */}
                <View style={styles.stepsCard}>
                    <Text style={styles.stepsTitle}>What Happens Next?</Text>
                    <StepItem num="1" text="Admin reviews your credentials" done />
                    <StepItem num="2" text="Account gets approved" />
                    <StepItem num="3" text="You can start accepting consultations" />
                </View>

                {/* Actions */}
                <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
                    <Text style={styles.refreshText}>🔄 Check Status</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutText}>← Sign Out</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

function StepItem({ num, text, done }: { num: string; text: string; done?: boolean }) {
    return (
        <View style={styles.stepRow}>
            <View style={[styles.stepNum, done && styles.stepNumDone]}>
                <Text style={[styles.stepNumText, done && styles.stepNumTextDone]}>
                    {done ? '✓' : num}
                </Text>
            </View>
            <Text style={[styles.stepText, done && styles.stepTextDone]}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    icon: { fontSize: 64, textAlign: 'center', marginBottom: spacing.xl },
    title: {
        ...typography.h2,
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    description: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: spacing['2xl'],
    },
    statusCard: {
        backgroundColor: colors.warningFaded,
        borderWidth: 1,
        borderColor: colors.warning,
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.xl,
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    statusLabel: {
        ...typography.body,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    statusBadge: {
        backgroundColor: colors.warning,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: radius.full,
    },
    statusBadgeText: {
        ...typography.caption,
        color: '#000',
        fontWeight: '700',
    },
    statusHint: {
        ...typography.bodySm,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    stepsCard: {
        backgroundColor: colors.bgCard,
        borderRadius: radius.lg,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: spacing['2xl'],
    },
    stepsTitle: {
        ...typography.h4,
        color: colors.textPrimary,
        marginBottom: spacing.md,
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        marginBottom: spacing.sm,
    },
    stepNum: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.bgTertiary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    stepNumDone: {
        backgroundColor: colors.success,
        borderColor: colors.success,
    },
    stepNumText: { ...typography.label, color: colors.textSecondary },
    stepNumTextDone: { color: '#fff', fontWeight: '700' },
    stepText: { ...typography.body, color: colors.textPrimary, flex: 1 },
    stepTextDone: { color: colors.textSecondary, textDecorationLine: 'line-through' },
    refreshButton: {
        backgroundColor: colors.accentTealFaded,
        borderWidth: 1,
        borderColor: colors.accentTeal,
        borderRadius: radius.md,
        paddingVertical: spacing.md,
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    refreshText: { ...typography.body, color: colors.accentTeal, fontWeight: '600' },
    logoutButton: {
        paddingVertical: spacing.md,
        alignItems: 'center',
    },
    logoutText: { ...typography.body, color: colors.textTertiary },
});
