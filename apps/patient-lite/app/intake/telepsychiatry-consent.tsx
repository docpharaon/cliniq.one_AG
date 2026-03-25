import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius } from '@cliniqone/ui';
import { t } from '@cliniqone/i18n';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '@cliniqone/api';

export default function TelepsychiatryConsentScreen() {
    const { user } = useAuthStore();
    const params = useLocalSearchParams<{ consultation_id?: string }>();
    const consultationId = params.consultation_id;

    const [accepted, setAccepted] = useState(false);
    const [saving, setSaving] = useState(false);

    async function handleGrant() {
        if (!user?.id) return;
        setSaving(true);
        try {
            await supabase.from('consent_records').insert({
                patient_id: user.id,
                consultation_id: consultationId || null,
                consent_type: 'telepsychiatry',
                granted: true,
                granted_at: new Date().toISOString(),
            });
            // Navigate to next step (screening or AI chat)
            router.push({
                pathname: '/intake/psych-screening',
                params: { consultation_id: consultationId || '' },
            } as never);
        } catch (err) {
            console.error('Consent save error:', err);
        }
        setSaving(false);
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Text style={styles.backText}>← {t('common.back')}</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>{t('psychiatry.telepsychiatryConsent')}</Text>
                    <Text style={styles.subtitle}>{t('psychiatry.consent')}</Text>
                </View>

                {/* Consent Card */}
                <View style={styles.consentCard}>
                    <Text style={styles.consentIcon}>🔒</Text>
                    <Text style={styles.consentTitle}>{t('psychiatry.telepsychiatryConsent')}</Text>
                    <Text style={styles.consentBody}>
                        {t('psychiatry.telepsychiatryConsentDesc')}
                    </Text>

                    {/* Key points */}
                    <View style={styles.bulletList}>
                        <View style={styles.bulletItem}>
                            <Text style={styles.bulletIcon}>🏥</Text>
                            <Text style={styles.bulletText}>
                                Services are provided by licensed psychiatrists via telemedicine
                            </Text>
                        </View>
                        <View style={styles.bulletItem}>
                            <Text style={styles.bulletIcon}>🔐</Text>
                            <Text style={styles.bulletText}>
                                Your psychiatric records are encrypted and separated from general medical records
                            </Text>
                        </View>
                        <View style={styles.bulletItem}>
                            <Text style={styles.bulletIcon}>📋</Text>
                            <Text style={styles.bulletText}>
                                You will complete standardized screening questionnaires (PHQ-9, GAD-7)
                            </Text>
                        </View>
                        <View style={styles.bulletItem}>
                            <Text style={styles.bulletIcon}>⚠️</Text>
                            <Text style={styles.bulletText}>
                                In case of emergency, call 997 (ambulance) or go to the nearest ER
                            </Text>
                        </View>
                        <View style={styles.bulletItem}>
                            <Text style={styles.bulletIcon}>🚫</Text>
                            <Text style={styles.bulletText}>
                                Telepsychiatry may not be suitable for acute crises requiring immediate in-person intervention
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Acceptance checkbox */}
                <TouchableOpacity
                    style={styles.checkboxRow}
                    onPress={() => setAccepted(!accepted)}
                    activeOpacity={0.7}
                >
                    <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
                        {accepted && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.checkboxLabel}>
                        {t('psychiatry.telepsychiatryConsentDesc')}
                    </Text>
                </TouchableOpacity>

                {/* Grant button */}
                <TouchableOpacity
                    style={[styles.grantButton, !accepted && styles.grantButtonDisabled]}
                    onPress={handleGrant}
                    disabled={!accepted || saving}
                    activeOpacity={0.7}
                >
                    {saving ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.grantButtonText}>
                            {t('psychiatry.consentGranted')} →
                        </Text>
                    )}
                </TouchableOpacity>

                {/* Revoke note */}
                <Text style={styles.revokeNote}>
                    You can revoke this consent at any time from your profile settings.
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing['4xl'] },

    header: { paddingTop: spacing.lg, marginBottom: spacing['2xl'] },
    backButton: { marginBottom: spacing.md },
    backText: { ...typography.body, color: colors.accentTeal },
    title: { ...typography.h2, color: colors.textPrimary },
    subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },

    consentCard: {
        backgroundColor: colors.bgCard,
        borderRadius: radius.xl,
        padding: spacing.xl,
        marginBottom: spacing.xl,
        borderWidth: 1,
        borderColor: colors.border,
    },
    consentIcon: { fontSize: 40, marginBottom: spacing.md },
    consentTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.sm },
    consentBody: {
        ...typography.body,
        color: colors.textSecondary,
        lineHeight: 22,
        marginBottom: spacing.xl,
    },
    bulletList: { gap: spacing.md },
    bulletItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
    },
    bulletIcon: { fontSize: 18, marginTop: 2 },
    bulletText: { ...typography.body, color: colors.textPrimary, flex: 1, lineHeight: 22 },

    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
        marginBottom: spacing.xl,
        padding: spacing.lg,
        backgroundColor: colors.bgCard,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: colors.textTertiary,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
    },
    checkboxChecked: {
        backgroundColor: colors.accentTeal,
        borderColor: colors.accentTeal,
    },
    checkmark: { color: '#fff', fontWeight: '800', fontSize: 14 },
    checkboxLabel: { ...typography.body, color: colors.textPrimary, flex: 1, lineHeight: 22 },

    grantButton: {
        backgroundColor: colors.accentTeal,
        paddingVertical: spacing.lg,
        borderRadius: radius.md,
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    grantButtonDisabled: { opacity: 0.4 },
    grantButtonText: { ...typography.body, color: '#fff', fontWeight: '700', fontSize: 16 },

    revokeNote: {
        ...typography.caption,
        color: colors.textTertiary,
        textAlign: 'center',
    },
});
