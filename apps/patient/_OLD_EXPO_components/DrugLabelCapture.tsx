// ─────────────────────────────────────────────────
// FIG_54: Drug Label Photography Component
// Camera viewfinder with alignment guides for medication label capture.
// Follows the same patterns as SkinPhotoCapture but tailored for drug labels.
// EPHEMERAL: Photos are base64-encoded on device, never stored in cloud.
// ─────────────────────────────────────────────────
import { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Image,
    ScrollView, Alert, ActivityIndicator, Linking, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { colors, spacing, typography, radius, shadows } from '@cliniqone/ui';
import { t } from '@cliniqone/i18n';
import { useToast } from './ToastProvider';

// ── Types ────────────────────────────────────────
interface DrugLabelCaptureProps {
    /** The medication name the patient stated (displayed in instructions) */
    medicationName: string;
    /** Called when user completes with photos (base64 encoded) */
    onComplete: (photos: { uri: string; base64: string }[]) => void;
    /** Called when user skips photo capture */
    onSkip: () => void;
    /** Max photos allowed */
    maxPhotos?: number;
}

type CaptureStep = 'offer' | 'tips' | 'capture';

// ── Component ────────────────────────────────────
export function DrugLabelCapture({
    medicationName,
    onComplete,
    onSkip,
    maxPhotos = 3,
}: DrugLabelCaptureProps) {
    const [step, setStep] = useState<CaptureStep>('offer');
    const [photos, setPhotos] = useState<{ uri: string; base64: string }[]>([]);
    const [processing, setProcessing] = useState(false);
    const [showWebOptions, setShowWebOptions] = useState(false);
    const toast = useToast((s) => s.show);

    // ── Convert URI to Base64 (ephemeral — for Vision API) ──
    const uriToBase64 = useCallback(async (uri: string): Promise<string> => {
        if (Platform.OS === 'web') {
            // On web, fetch blob and convert
            const response = await fetch(uri);
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const dataUrl = reader.result as string;
                    resolve(dataUrl.split(',')[1] || '');
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        }
        // On native, use FileSystem
        const result = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
        });
        return result;
    }, []);

    // ── Camera capture ──────────────────────────────
    const takePhoto = useCallback(async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            if (Platform.OS === 'web') {
                toast(t('photo.browserCameraHint'), 'warning');
            } else {
                Alert.alert(
                    t('photo.cameraPermission'),
                    t('photo.cameraPermissionDesc'),
                    [
                        { text: t('photo.openSettings'), onPress: () => Linking.openSettings() },
                        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
                    ],
                );
            }
            return;
        }

        setProcessing(true);
        try {
            const result = await ImagePicker.launchCameraAsync({
                quality: 0.9, // Higher quality for OCR accuracy
                allowsEditing: false,
                aspect: [4, 3],
            });

            if (!result.canceled && result.assets[0]) {
                const base64 = await uriToBase64(result.assets[0].uri);
                setPhotos(prev => [...prev, { uri: result.assets[0].uri, base64 }]);
            }
        } catch (err) {
            toast(t('common.error'), 'error');
        }
        setProcessing(false);
        setShowWebOptions(false);
    }, [toast, uriToBase64]);

    // ── Gallery pick ────────────────────────────────
    const pickFromGallery = useCallback(async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            toast(t('photo.libraryPermission'), 'warning');
            return;
        }

        setProcessing(true);
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 0.9,
                allowsMultipleSelection: false,
            });

            if (!result.canceled && result.assets[0]) {
                const base64 = await uriToBase64(result.assets[0].uri);
                setPhotos(prev => [...prev, { uri: result.assets[0].uri, base64 }]);
            }
        } catch (err) {
            toast(t('common.error'), 'error');
        }
        setProcessing(false);
        setShowWebOptions(false);
    }, [toast, uriToBase64]);

    // ── Handle add photo ────────────────────────────
    const handleAddPhoto = useCallback(() => {
        if (photos.length >= maxPhotos) {
            toast(t('photo.maxPhotosReached', { max: String(maxPhotos) }), 'warning');
            return;
        }
        if (Platform.OS === 'web') {
            setShowWebOptions(true);
        } else {
            Alert.alert(
                t('drugLabel.addPhoto'),
                undefined,
                [
                    { text: t('photo.camera'), onPress: takePhoto },
                    { text: t('photo.photoLibrary'), onPress: pickFromGallery },
                    { text: t('common.cancel'), style: 'cancel' },
                ],
            );
        }
    }, [photos.length, maxPhotos, takePhoto, pickFromGallery, toast]);

    // ── Remove photo ────────────────────────────────
    const removePhoto = useCallback((index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
    }, []);

    // ── Render: Offer step ──────────────────────────
    if (step === 'offer') {
        return (
            <View style={styles.container}>
                <View style={styles.offerCard}>
                    <Text style={styles.offerEmoji}>📷</Text>
                    <Text style={styles.offerTitle}>{t('drugLabel.offerTitle')}</Text>
                    <Text style={styles.offerDesc}>
                        {t('drugLabel.offerDesc', { medication: medicationName })}
                    </Text>

                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => setStep('tips')}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.primaryButtonText}>📸 {t('drugLabel.takePhoto')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.skipButton}
                        onPress={onSkip}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.skipButtonText}>{t('common.skip')} →</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // ── Render: Tips step ────────────────────────────
    if (step === 'tips') {
        return (
            <View style={styles.container}>
                <View style={styles.tipsCard}>
                    <Text style={styles.tipsTitle}>{t('drugLabel.tipsTitle')}</Text>

                    <View style={styles.tipItem}>
                        <Text style={styles.tipIcon}>💡</Text>
                        <View style={styles.tipContent}>
                            <Text style={styles.tipLabel}>{t('drugLabel.tipLighting')}</Text>
                            <Text style={styles.tipDesc}>{t('drugLabel.tipLightingDesc')}</Text>
                        </View>
                    </View>

                    <View style={styles.tipItem}>
                        <Text style={styles.tipIcon}>📐</Text>
                        <View style={styles.tipContent}>
                            <Text style={styles.tipLabel}>{t('drugLabel.tipAlignment')}</Text>
                            <Text style={styles.tipDesc}>{t('drugLabel.tipAlignmentDesc')}</Text>
                        </View>
                    </View>

                    <View style={styles.tipItem}>
                        <Text style={styles.tipIcon}>🔍</Text>
                        <View style={styles.tipContent}>
                            <Text style={styles.tipLabel}>{t('drugLabel.tipReadability')}</Text>
                            <Text style={styles.tipDesc}>{t('drugLabel.tipReadabilityDesc')}</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => setStep('capture')}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.primaryButtonText}>{t('photo.continue')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // ── Render: Capture step ─────────────────────────
    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.captureContent}>
            {/* Header instruction */}
            <View style={styles.instructionBar}>
                <Text style={styles.instructionText}>
                    {t('drugLabel.captureInstruction', { medication: medicationName })}
                </Text>
            </View>

            {/* Photo grid */}
            <View style={styles.photoGrid}>
                {photos.map((photo, index) => (
                    <View key={index} style={styles.photoThumb}>
                        <Image source={{ uri: photo.uri }} style={styles.thumbImage} />
                        <TouchableOpacity
                            style={styles.removeBtn}
                            onPress={() => removePhoto(index)}
                        >
                            <Text style={styles.removeBtnText}>✕</Text>
                        </TouchableOpacity>
                        <View style={styles.checkBadge}>
                            <Text style={styles.checkBadgeText}>✓</Text>
                        </View>
                    </View>
                ))}

                {/* Add photo button */}
                {photos.length < maxPhotos && (
                    <TouchableOpacity
                        style={styles.addPhotoBtn}
                        onPress={handleAddPhoto}
                        disabled={processing}
                    >
                        {processing ? (
                            <ActivityIndicator color={colors.accentTeal} />
                        ) : (
                            <>
                                <Text style={styles.addPhotoIcon}>＋</Text>
                                <Text style={styles.addPhotoText}>
                                    {photos.length === 0
                                        ? t('drugLabel.takePhoto')
                                        : t('photo.addAnother')}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}
            </View>

            {/* Web camera/gallery options */}
            {showWebOptions && (
                <View style={styles.webOptions}>
                    <TouchableOpacity style={styles.webOptionBtn} onPress={takePhoto}>
                        <Text style={styles.webOptionText}>{t('photo.cameraBtn')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.webOptionBtn} onPress={pickFromGallery}>
                        <Text style={styles.webOptionText}>{t('photo.gallery')}</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Photo count */}
            <Text style={styles.photoCount}>
                {t('photo.photosAdded', {
                    current: String(photos.length),
                    max: String(maxPhotos),
                })}
            </Text>

            {/* Ephemeral notice */}
            <View style={styles.ephemeralNotice}>
                <Text style={styles.ephemeralIcon}>🔒</Text>
                <Text style={styles.ephemeralText}>{t('drugLabel.ephemeralNotice')}</Text>
            </View>

            {/* Action buttons */}
            <View style={styles.captureActions}>
                {photos.length > 0 && (
                    <TouchableOpacity
                        style={styles.analyzeButton}
                        onPress={() => onComplete(photos)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.analyzeButtonText}>
                            🔬 {t('drugLabel.analyze')} ({photos.length})
                        </Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={styles.skipButton}
                    onPress={onSkip}
                    activeOpacity={0.7}
                >
                    <Text style={styles.skipButtonText}>
                        {photos.length > 0
                            ? t('drugLabel.skipAnalysis')
                            : t('photo.skipWithout')}
                    </Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

// ── Styles ────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    // Offer step
    offerCard: {
        backgroundColor: colors.bgCard,
        borderRadius: radius.xl,
        padding: spacing['3xl'],
        margin: spacing.lg,
        alignItems: 'center',
        ...shadows.elevated,
    },
    offerEmoji: {
        fontSize: 48,
        marginBottom: spacing.lg,
    },
    offerTitle: {
        ...typography.h3,
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    offerDesc: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing['2xl'],
        lineHeight: 22,
    },
    primaryButton: {
        backgroundColor: colors.accentTeal,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing['3xl'],
        borderRadius: radius.lg,
        width: '100%',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    primaryButtonText: {
        ...typography.button,
        color: colors.textInverse,
    },
    skipButton: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
    },
    skipButtonText: {
        ...typography.body,
        color: colors.textSecondary,
    },
    // Tips step
    tipsCard: {
        backgroundColor: colors.bgCard,
        borderRadius: radius.xl,
        padding: spacing['2xl'],
        margin: spacing.lg,
        ...shadows.elevated,
    },
    tipsTitle: {
        ...typography.h3,
        color: colors.textPrimary,
        marginBottom: spacing.xl,
    },
    tipItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: spacing.lg,
    },
    tipIcon: {
        fontSize: 24,
        marginRight: spacing.md,
        marginTop: 2,
    },
    tipContent: {
        flex: 1,
    },
    tipLabel: {
        ...typography.h4,
        color: colors.textPrimary,
        marginBottom: 2,
    },
    tipDesc: {
        ...typography.bodySm,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    // Capture step
    captureContent: {
        padding: spacing.lg,
    },
    instructionBar: {
        backgroundColor: colors.accentTealFaded,
        borderRadius: radius.md,
        padding: spacing.md,
        marginBottom: spacing.lg,
        borderLeftWidth: 3,
        borderLeftColor: colors.accentTeal,
    },
    instructionText: {
        ...typography.body,
        color: colors.accentTealDark,
    },
    photoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    photoThumb: {
        width: 100,
        height: 100,
        borderRadius: radius.md,
        overflow: 'hidden',
        position: 'relative',
    },
    thumbImage: {
        width: '100%',
        height: '100%',
    },
    removeBtn: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(0,0,0,0.6)',
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
    },
    removeBtnText: {
        color: colors.white,
        fontSize: 12,
        fontWeight: '700',
    },
    checkBadge: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        backgroundColor: colors.success,
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkBadgeText: {
        color: colors.white,
        fontSize: 12,
        fontWeight: '700',
    },
    addPhotoBtn: {
        width: 100,
        height: 100,
        borderRadius: radius.md,
        borderWidth: 2,
        borderColor: colors.border,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addPhotoIcon: {
        fontSize: 28,
        color: colors.textTertiary,
    },
    addPhotoText: {
        ...typography.caption,
        color: colors.textTertiary,
        textAlign: 'center',
        marginTop: 4,
    },
    webOptions: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    webOptionBtn: {
        flex: 1,
        paddingVertical: spacing.md,
        backgroundColor: colors.bgTertiary,
        borderRadius: radius.md,
        alignItems: 'center',
    },
    webOptionText: {
        ...typography.buttonSm,
        color: colors.textPrimary,
    },
    photoCount: {
        ...typography.bodySm,
        color: colors.textTertiary,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    ephemeralNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.infoFaded,
        borderRadius: radius.md,
        padding: spacing.md,
        marginBottom: spacing.xl,
        gap: spacing.sm,
    },
    ephemeralIcon: {
        fontSize: 16,
    },
    ephemeralText: {
        ...typography.caption,
        color: colors.info,
        flex: 1,
    },
    captureActions: {
        gap: spacing.md,
    },
    analyzeButton: {
        backgroundColor: colors.accentTeal,
        paddingVertical: spacing.lg,
        borderRadius: radius.lg,
        alignItems: 'center',
        ...shadows.elevated,
    },
    analyzeButtonText: {
        ...typography.button,
        color: colors.textInverse,
    },
});
