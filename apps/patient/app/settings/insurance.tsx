import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius, shadows } from '@cliniqone/ui';
import { t } from '@cliniqone/i18n';
import { APP } from '@cliniqone/config';

const INSURERS = [
    { id: 'bupa', name: 'Bupa Arabia', nameAr: 'بوبا العربية', logo: '🏥' },
    { id: 'tawuniya', name: 'Tawuniya', nameAr: 'التعاونية', logo: '🛡️' },
    { id: 'medgulf', name: 'MedGulf', nameAr: 'ميدغلف', logo: '🏦' },
    { id: 'malath', name: 'Malath Insurance', nameAr: 'ملاذ للتأمين', logo: '🔒' },
    { id: 'walaa', name: 'Walaa Insurance', nameAr: 'ولاء للتأمين', logo: '✅' },
    { id: 'other', name: 'Other Provider', nameAr: 'مزود آخر', logo: '➕' },
];

type InsuranceCard = {
    provider: string;
    memberId: string;
    frontUri?: string;
    backUri?: string;
};

export default function InsuranceScreen() {
    const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
    const [card, setCard] = useState<InsuranceCard | null>(null);
    const [uploading, setUploading] = useState(false);

    function handleSelectProvider(id: string) {
        setSelectedProvider(id);
    }

    async function handleUploadCard(side: 'front' | 'back') {
        // In production, use expo-image-picker here
        Alert.alert(
            'Upload Insurance Card',
            `Select a photo of the ${side} of your insurance card.`,
            [{ text: 'OK' }]
        );
    }

    function handleSave() {
        if (!selectedProvider) {
            Alert.alert('Error', 'Please select your insurance provider.');
            return;
        }
        Alert.alert(
            'Saved',
            'Your insurance information has been saved successfully.',
            [{ text: 'OK', onPress: () => router.back() }]
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Text style={styles.backText}>← {t('common.back')}</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>🏥 Insurance</Text>
                    <Text style={styles.subtitle}>
                        Add your insurance details for seamless billing and claims processing.
                    </Text>
                </View>

                {/* Provider Selection */}
                <Text style={styles.sectionTitle}>Select Insurance Provider</Text>
                <View style={styles.providerGrid}>
                    {INSURERS.map((ins) => (
                        <TouchableOpacity
                            key={ins.id}
                            style={[
                                styles.providerCard,
                                selectedProvider === ins.id && styles.providerCardSelected,
                            ]}
                            onPress={() => handleSelectProvider(ins.id)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.providerLogo}>{ins.logo}</Text>
                            <Text style={[
                                styles.providerName,
                                selectedProvider === ins.id && styles.providerNameSelected,
                            ]}>
                                {ins.name}
                            </Text>
                            {selectedProvider === ins.id && (
                                <View style={styles.checkBadge}>
                                    <Text style={styles.checkText}>✓</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Card Upload Section */}
                {selectedProvider && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📸 Insurance Card Photos</Text>
                        <Text style={styles.sectionSubtitle}>
                            Upload photos of your card for faster verification.
                        </Text>

                        <View style={styles.cardUploadRow}>
                            <TouchableOpacity
                                style={styles.uploadCard}
                                onPress={() => handleUploadCard('front')}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.uploadIcon}>📄</Text>
                                <Text style={styles.uploadLabel}>Front Side</Text>
                                <Text style={styles.uploadHint}>Tap to upload</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.uploadCard}
                                onPress={() => handleUploadCard('back')}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.uploadIcon}>📄</Text>
                                <Text style={styles.uploadLabel}>Back Side</Text>
                                <Text style={styles.uploadHint}>Tap to upload</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Info */}
                <View style={styles.infoCard}>
                    <Text style={styles.infoIcon}>ℹ️</Text>
                    <Text style={styles.infoText}>
                        Insurance information is used to process claims directly with your provider. Your data is encrypted and stored securely.
                    </Text>
                </View>

                {/* Save Button */}
                <TouchableOpacity
                    style={[styles.saveButton, !selectedProvider && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={!selectedProvider}
                >
                    {uploading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.saveButtonText}>Save Insurance Details</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing['4xl'] },

    // Header
    header: { paddingTop: spacing.lg, marginBottom: spacing['2xl'] },
    backButton: { marginBottom: spacing.md },
    backText: { ...typography.body, color: colors.accentTeal },
    title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.sm },
    subtitle: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },

    // Section
    section: { marginBottom: spacing['2xl'] },
    sectionTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: spacing.md },
    sectionSubtitle: { ...typography.bodySm, color: colors.textSecondary, marginBottom: spacing.lg },

    // Provider grid
    providerGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing['2xl'],
    },
    providerCard: {
        width: '48%' as any,
        backgroundColor: colors.bgCard,
        borderRadius: radius.lg,
        padding: spacing.lg,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
        ...shadows.card,
    },
    providerCardSelected: {
        borderColor: colors.accentTeal,
        backgroundColor: colors.accentTealFaded,
    },
    providerLogo: { fontSize: 28, marginBottom: spacing.sm },
    providerName: { ...typography.bodySm, color: colors.textPrimary, textAlign: 'center', fontWeight: '600' },
    providerNameSelected: { color: colors.accentTeal },
    checkBadge: {
        position: 'absolute',
        top: spacing.sm,
        right: spacing.sm,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: colors.accentTeal,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkText: { color: '#fff', fontSize: 12, fontWeight: '700' },

    // Card upload
    cardUploadRow: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    uploadCard: {
        flex: 1,
        backgroundColor: colors.bgTertiary,
        borderRadius: radius.lg,
        padding: spacing.xl,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: colors.border,
        borderStyle: 'dashed',
    },
    uploadIcon: { fontSize: 28, marginBottom: spacing.sm },
    uploadLabel: { ...typography.bodySm, color: colors.textPrimary, fontWeight: '600' },
    uploadHint: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.xs },

    // Info
    infoCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
        backgroundColor: colors.infoFaded,
        padding: spacing.lg,
        borderRadius: radius.lg,
        marginBottom: spacing['2xl'],
    },
    infoIcon: { fontSize: 16, marginTop: 2 },
    infoText: { ...typography.bodySm, color: colors.textSecondary, flex: 1, lineHeight: 20 },

    // Save
    saveButton: {
        backgroundColor: colors.accentTeal,
        paddingVertical: spacing.lg,
        borderRadius: radius.full,
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    saveButtonDisabled: { opacity: 0.4 },
    saveButtonText: { ...typography.button, color: '#fff' },
});
