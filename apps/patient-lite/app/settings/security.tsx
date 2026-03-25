import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert, Switch } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@cliniqone/ui';
import { colors, spacing, typography, radius } from '@cliniqone/ui';
import { t } from '@cliniqone/i18n';
import { SECURITY } from '@cliniqone/config';
import { useToast } from '../../components/ToastProvider';

export default function SecurityScreen() {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [biometric, setBiometric] = useState(false);
    const [saving, setSaving] = useState(false);
    const toast = useToast((s) => s.show);

    const canSave = currentPassword.length >= SECURITY.PASSWORD_MIN_LENGTH &&
        newPassword.length >= SECURITY.PASSWORD_MIN_LENGTH &&
        newPassword === confirmPassword;

    async function handleChangePassword() {
        if (!canSave) return;
        setSaving(true);
        try {
            // In production: call supabase auth.updateUser
            await new Promise((r) => setTimeout(r, 1000));
            toast(t('settings.passwordChanged'), 'success');
            router.back();
        } catch {
            toast(t('settings.passwordChangeFailed'), 'error');
        } finally {
            setSaving(false);
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
                    <Text style={styles.title}>🔒 {t('profile.security')}</Text>
                </View>

                {/* Biometric */}
                <View style={styles.card}>
                    <View style={styles.biometricRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.biometricLabel}>🔐 {t('settings.biometricLogin')}</Text>
                            <Text style={styles.biometricDesc}>{t('settings.biometricDesc')}</Text>
                        </View>
                        <Switch
                            value={biometric}
                            onValueChange={setBiometric}
                            trackColor={{ false: colors.bgTertiary, true: colors.accentTealFaded }}
                            thumbColor={biometric ? colors.accentTeal : colors.textTertiary}
                        />
                    </View>
                </View>

                {/* Change Password */}
                <Text style={styles.sectionTitle}>{t('settings.changePassword')}</Text>
                <View style={styles.card}>
                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>{t('settings.currentPassword')}</Text>
                        <TextInput
                            style={styles.input}
                            secureTextEntry
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                            placeholder={t('settings.currentPasswordPlaceholder')}
                            placeholderTextColor={colors.textTertiary}
                        />
                    </View>

                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>{t('settings.newPassword')}</Text>
                        <TextInput
                            style={styles.input}
                            secureTextEntry
                            value={newPassword}
                            onChangeText={setNewPassword}
                            placeholder={`${SECURITY.PASSWORD_MIN_LENGTH} ${t('settings.minCharsPlaceholder', { count: SECURITY.PASSWORD_MIN_LENGTH })}`}
                            placeholderTextColor={colors.textTertiary}
                        />
                    </View>

                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>{t('settings.confirmNewPassword')}</Text>
                        <TextInput
                            style={styles.input}
                            secureTextEntry
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            placeholder={t('settings.reenterPassword')}
                            placeholderTextColor={colors.textTertiary}
                        />
                        {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                            <Text style={styles.errorText}>{t('settings.passwordsDontMatch')}</Text>
                        )}
                    </View>
                </View>

                <View style={{ marginTop: spacing.xl }}>
                    <Button
                        title={saving ? t('settings.changingPassword') : t('settings.changePassword')}
                        onPress={handleChangePassword}
                        size="lg"
                        disabled={!canSave || saving}
                    />
                </View>

                {/* Danger Zone */}
                <Text style={styles.sectionTitle}>{t('settings.dangerZone')}</Text>
                <View style={[styles.card, styles.dangerCard]}>
                    <Text style={styles.dangerTitle}>🗑️ {t('settings.deleteAccount')}</Text>
                    <Text style={styles.dangerDesc}>
                        {t('settings.deleteAccountDesc')}
                    </Text>
                    <TouchableOpacity
                        style={styles.dangerButton}
                        onPress={() => router.push('/settings/delete-account' as any)}
                    >
                        <Text style={styles.dangerButtonText}>{t('settings.deleteMyAccount')}</Text>
                    </TouchableOpacity>
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

    sectionTitle: { ...typography.label, color: colors.textTertiary, textTransform: 'uppercase' as const, marginBottom: spacing.sm, marginTop: spacing['2xl'] },

    card: {
        backgroundColor: colors.bgCard,
        borderRadius: radius.xl,
        padding: spacing.xl,
        borderWidth: 1,
        borderColor: colors.border,
    },

    biometricRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    biometricLabel: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
    biometricDesc: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },

    fieldGroup: { marginBottom: spacing.lg },
    fieldLabel: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.xs },
    input: {
        backgroundColor: colors.bgTertiary,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        ...typography.body,
        color: colors.textPrimary,
    },
    errorText: { ...typography.caption, color: colors.error, marginTop: spacing.xs },

    dangerCard: { borderColor: colors.error + '40' },
    dangerTitle: { ...typography.h4, color: colors.error, marginBottom: spacing.sm },
    dangerDesc: { ...typography.bodySm, color: colors.textSecondary, lineHeight: 18 },
    dangerButton: {
        marginTop: spacing.lg,
        paddingVertical: spacing.md,
        alignItems: 'center',
        borderRadius: radius.md,
        backgroundColor: colors.errorFaded,
        borderWidth: 1,
        borderColor: colors.error + '40',
    },
    dangerButtonText: { ...typography.button, color: colors.error },
});
