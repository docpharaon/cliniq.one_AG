import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { router, Redirect } from 'expo-router';
import { supabase, getDoctorProfile } from '@cliniqone/api';
import { colors, typography } from '@cliniqone/ui';
import { useAuthStore } from '../../stores/authStore';

export default function ChangePasswordScreen() {
    const { session, doctor } = useAuthStore();

    // Guard: redirect if not authenticated
    if (!session || !doctor) {
        return <Redirect href="/(auth)/login" />;
    }

    // Guard: redirect if password change not needed
    if (!doctor.must_change_password) {
        return <Redirect href="/(tabs)" />;
    }

    return <ChangePasswordForm />;
}

function ChangePasswordForm() {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChangePassword = async () => {
        if (!newPassword || newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // 1) Clear must_change_password flag FIRST (while session token is still valid)
            const doctor = useAuthStore.getState().doctor;
            if (doctor) {
                console.log('[ChangePassword] Clearing must_change_password flag...');
                const { error: updateError } = await supabase
                    .from('doctors')
                    .update({ must_change_password: false })
                    .eq('id', doctor.id);

                if (updateError) {
                    console.error('[ChangePassword] Failed to clear flag:', updateError);
                    throw updateError;
                }
            }

            // 2) Update auth password (this may refresh the session token)
            console.log('[ChangePassword] Updating auth password...');
            const { error: authError } = await supabase.auth.updateUser({
                password: newPassword,
            });
            if (authError) throw authError;
            console.log('[ChangePassword] Auth password updated successfully.');

            // 3) Re-fetch doctor profile to update local state
            console.log('[ChangePassword] Re-fetching doctor profile...');
            const session = useAuthStore.getState().session;
            if (session) {
                const updatedDoctor = await getDoctorProfile(session.user.id);
                useAuthStore.getState().setDoctor(updatedDoctor);
            }

            console.log('[ChangePassword] Navigating to tabs...');
            router.replace('/(tabs)');
        } catch (err: any) {
            console.error('[ChangePassword] Error:', err);
            setError(err.message || 'Failed to change password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.icon}>🔒</Text>
                    <Text style={styles.title}>Change Password</Text>
                    <Text style={styles.subtitle}>
                        Your temporary password must be changed before you can continue.
                    </Text>
                </View>

                {/* Form */}
                <View style={styles.form}>
                    {error ? (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>⚠️ {error}</Text>
                        </View>
                    ) : null}

                    <Text style={styles.label}>New Password</Text>
                    <TextInput
                        style={styles.input}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder="Enter new password (min 6 characters)"
                        placeholderTextColor={colors.textTertiary}
                        secureTextEntry
                    />

                    <Text style={styles.label}>Confirm Password</Text>
                    <TextInput
                        style={styles.input}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="Re-enter new password"
                        placeholderTextColor={colors.textTertiary}
                        secureTextEntry
                    />

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleChangePassword}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={colors.bgPrimary} />
                        ) : (
                            <Text style={styles.buttonText}>Set New Password</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <Text style={styles.footer}>
                    This is a one-time requirement set by your administrator.
                </Text>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bgPrimary,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    icon: {
        fontSize: 56,
        marginBottom: 12,
    },
    title: {
        ...typography.h1,
        color: colors.accentTeal,
        fontWeight: '700',
    },
    subtitle: {
        ...typography.body,
        color: colors.textSecondary,
        marginTop: 8,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    form: {
        backgroundColor: colors.bgSecondary,
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: colors.border,
    },
    label: {
        ...typography.caption,
        color: colors.textSecondary,
        marginBottom: 6,
        marginTop: 16,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    input: {
        backgroundColor: colors.bgTertiary,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        color: colors.textPrimary,
        ...typography.body,
        borderWidth: 1,
        borderColor: colors.border,
    },
    button: {
        backgroundColor: colors.accentTeal,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 24,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        ...typography.button,
        color: colors.bgPrimary,
        fontWeight: '700',
    },
    errorBox: {
        backgroundColor: colors.errorFaded,
        borderRadius: 12,
        padding: 12,
    },
    errorText: {
        ...typography.caption,
        color: colors.error,
    },
    footer: {
        ...typography.caption,
        color: colors.textTertiary,
        textAlign: 'center',
        marginTop: 24,
    },
});
