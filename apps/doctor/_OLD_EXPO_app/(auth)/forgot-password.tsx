import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@cliniqone/api';
import { colors, typography } from '@cliniqone/ui';

export default function ForgotPasswordScreen() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleReset = async () => {
        if (!email) return;
        setLoading(true);
        try {
            await supabase.auth.resetPasswordForEmail(email.trim());
            setSent(true);
        } catch {
            // Show success anyway to prevent email enumeration
            setSent(true);
        } finally {
            setLoading(false);
        }
    };

    if (sent) {
        return (
            <View style={styles.container}>
                <View style={styles.content}>
                    <Text style={styles.emoji}>📧</Text>
                    <Text style={styles.title}>Check your email</Text>
                    <Text style={styles.message}>
                        If an account exists with {email}, you'll receive a password reset link.
                    </Text>
                    <TouchableOpacity style={styles.button} onPress={() => router.back()}>
                        <Text style={styles.buttonText}>Back to Login</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.content}>
                <Text style={styles.emoji}>🔑</Text>
                <Text style={styles.title}>Reset Password</Text>
                <Text style={styles.message}>
                    Enter your email to receive a reset link.
                </Text>

                <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="doctor@cliniq.one"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />

                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleReset}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color={colors.bgPrimary} />
                    ) : (
                        <Text style={styles.buttonText}>Send Reset Link</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
                    <Text style={styles.backText}>← Back to Login</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bgPrimary,
        justifyContent: 'center',
    },
    content: {
        paddingHorizontal: 24,
        alignItems: 'center',
    },
    emoji: { fontSize: 48, marginBottom: 16 },
    title: {
        ...typography.h2,
        color: colors.textPrimary,
        marginBottom: 8,
    },
    message: {
        ...typography.body,
        color: colors.textTertiary,
        textAlign: 'center',
        marginBottom: 24,
    },
    input: {
        width: '100%',
        backgroundColor: colors.bgSecondary,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        color: colors.textPrimary,
        ...typography.body,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 16,
    },
    button: {
        width: '100%',
        backgroundColor: colors.accentTeal,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: {
        ...typography.button,
        color: colors.bgPrimary,
        fontWeight: '700',
    },
    backLink: { marginTop: 16 },
    backText: {
        ...typography.caption,
        color: colors.accentTeal,
    },
});
