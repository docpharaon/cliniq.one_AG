import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius, shadows } from '@cliniqone/ui';
import { t, getLocale } from '@cliniqone/i18n';
import { APP } from '@cliniqone/config';
import { useToast } from '../../components/ToastProvider';

const isAr = () => getLocale() === 'ar';

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
    const toast = useToast((s) => s.show);

    function handleSelectProvider(id: string) {
        setSelectedProvider(id);
    }

    async function handleUploadCard(side: 'front' | 'back') {
        // In production, use expo-image-picker here
        toast(t('insurance.uploadDesc', { side: side === 'front' ? t('insurance.frontSide') : t('insurance.backSide') }), 'info');
    }

    function handleSave() {
        if (!selectedProvider) {
            toast(t('insurance.selectProviderError'), 'warning');
            return;
        }
        toast(t('insurance.saved'), 'success');
        router.back();
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Text style={styles.backText}>← {t('common.back')}</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>🏥 {t('insurance.title')}</Text>
                    <Text style={styles.subtitle}>
                        {t('insurance.subtitle')}
                    </Text>
                </View>

                {/* Provider Selection */}
                <Text style={styles.sectionTitle}>{t('insurance.selectProvider')}</Text>
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
                                {isAr() ? ins.nameAr : ins.name}
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
                        <Text style={styles.sectionTitle}>📸 {t('insurance.cardPhotos')}</Text>
                        <Text style={styles.sectionSubtitle}>
                            {t('insurance.cardPhotosDesc')}
                        </Text>

                        <View style={styles.cardUploadRow}>
                            <TouchableOpacity
                                style={styles.uploadCard}
                                onPress={() => handleUploadCard('front')}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.uploadIcon}>📄</Text>
                                <Text style={styles.uploadLabel}>{t('insurance.frontSide')}</Text>
                                <Text style={styles.uploadHint}>{t('insurance.tapToUpload')}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.uploadCard}
                                onPress={() => handleUploadCard('back')}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.uploadIcon}>📄</Text>
                                <Text style={styles.uploadLabel}>{t('insurance.backSide')}</Text>
                                <Text style={styles.uploadHint}>{t('insurance.tapToUpload')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Info */}
                <View style={styles.infoCard}>
                    <Text style={styles.infoIcon}>ℹ️</Text>
                    <Text style={styles.infoText}>
                        {t('insurance.securityNote')}
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
                        <Text style={styles.saveButtonText}>{t('insurance.save')}</Text>
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
