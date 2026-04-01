import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@cliniqone/ui';
import { colors, spacing, typography, radius } from '@cliniqone/ui';
import { supabase, safeFetch } from '@cliniqone/api';
import { t } from '@cliniqone/i18n';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../components/ToastProvider';

export default function DeleteAccountScreen() {
    const [confirmText, setConfirmText] = useState('');
    const [loading, setLoading] = useState(false);
    const { user } = useAuthStore();
    const clear = useAuthStore((s) => s.clear);
    const toast = useToast((s) => s.show);

    const isConfirmed = confirmText.toLowerCase() === 'delete';

    async function handleDelete() {
        if (!isConfirmed || !user?.id) return;
        setLoading(true);

        try {
            const { data, error } = await safeFetch(
                () => supabase.functions.invoke('delete-account', {
                    body: { userId: user.id },
                }),
                { timeout: 15000, retries: 0, label: 'deleteAccount' },
            );

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            toast(t('deleteAccount.deleted'), 'info');
            await supabase.auth.signOut();
            clear();
            router.replace('/(auth)/landing');
        } catch (err: any) {
            console.error('Delete account error:', err);
            const msg = err?.message?.includes('timed out')
                ? t('deleteAccount.connectionSlow')
                : err?.message || t('deleteAccount.deleteFailed');
            toast(msg, 'error');
        } finally {
            setLoading(false);
        }
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Text style={styles.backText}>← {t('common.back')}</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>🗑️ {t('deleteAccount.title')}</Text>
                </View>

                {/* Warning Card */}
                <View style={styles.warningCard}>
                    <Text style={styles.warningIcon}>⚠️</Text>
                    <Text style={styles.warningTitle}>{t('deleteAccount.permanentAction')}</Text>
                    <Text style={styles.warningBody}>
                        {t('deleteAccount.willRemove')}
                    </Text>

                    <View style={styles.list}>
                        <Text style={styles.listItem}>• {t('deleteAccount.removeProfile')}</Text>
                        <Text style={styles.listItem}>• {t('deleteAccount.removeConsultations')}</Text>
                        <Text style={styles.listItem}>• {t('deleteAccount.removeTokens')}</Text>
                        <Text style={styles.listItem}>• {t('deleteAccount.removeChats')}</Text>
                    </View>

                    <Text style={styles.warningFooter}>
                        {t('deleteAccount.cannotUndo')}
                    </Text>
                </View>

                {/* Confirmation Input */}
                <Text style={styles.confirmLabel}>
                    {t('deleteAccount.typeToConfirm')} <Text style={styles.confirmHighlight}>DELETE</Text> {t('deleteAccount.toConfirm')}
                </Text>
                <TextInput
                    style={[styles.input, isConfirmed && styles.inputConfirmed]}
                    value={confirmText}
                    onChangeText={setConfirmText}
                    placeholder={t('deleteAccount.typePlaceholder')}
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="none"
                />

                {/* Delete Button */}
                <View style={{ marginTop: spacing.xl }}>
                    <TouchableOpacity
                        style={[styles.deleteButton, (!isConfirmed || loading) && styles.deleteDisabled]}
                        onPress={handleDelete}
                        disabled={!isConfirmed || loading}
                    >
                        <Text style={styles.deleteText}>
                            {loading ? t('deleteAccount.deleting') : t('deleteAccount.deleteButton')}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Cancel */}
                <TouchableOpacity onPress={() => router.back()} style={styles.cancelRow}>
                    <Text style={styles.cancelText}>{t('deleteAccount.cancelKeep')}</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing['4xl'] },
    header: { paddingTop: spacing.lg, marginBottom: spacing.xl },
    backText: { ...typography.body, color: colors.accentTeal, marginBottom: spacing.md },
    title: { ...typography.h2, color: colors.error },

    warningCard: {
        backgroundColor: colors.errorFaded,
        borderRadius: radius.xl,
        padding: spacing.xl,
        borderWidth: 1,
        borderColor: colors.error + '40',
        marginBottom: spacing['2xl'],
    },
    warningIcon: { fontSize: 40, textAlign: 'center' as const, marginBottom: spacing.md },
    warningTitle: { ...typography.h3, color: colors.error, textAlign: 'center' as const, marginBottom: spacing.md },
    warningBody: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.md },
    list: { marginBottom: spacing.md, paddingLeft: spacing.sm },
    listItem: { ...typography.bodySm, color: colors.textSecondary, lineHeight: 22 },
    warningFooter: { ...typography.bodySm, color: colors.textTertiary, fontStyle: 'italic' as const },

    confirmLabel: { ...typography.body, color: colors.textPrimary, marginBottom: spacing.sm },
    confirmHighlight: { color: colors.error, fontWeight: '700' },

    input: {
        backgroundColor: colors.bgTertiary,
        borderWidth: 2,
        borderColor: colors.border,
        borderRadius: radius.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        ...typography.body,
        color: colors.textPrimary,
        textAlign: 'center' as const,
        fontSize: 18,
        letterSpacing: 2,
    },
    inputConfirmed: { borderColor: colors.error },

    deleteButton: {
        backgroundColor: colors.error,
        paddingVertical: spacing.lg,
        borderRadius: radius.md,
        alignItems: 'center' as const,
    },
    deleteDisabled: { opacity: 0.4 },
    deleteText: { ...typography.button, color: '#fff', fontWeight: '700' },

    cancelRow: { alignItems: 'center' as const, marginTop: spacing.xl },
    cancelText: { ...typography.body, color: colors.accentTeal, fontWeight: '600' },
});
