import { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Image,
    ScrollView, Alert, ActivityIndicator, Linking, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, typography, radius } from '@cliniqone/ui';
import { t } from '@cliniqone/i18n';
import { useToast } from './ToastProvider';

// ── Types ────────────────────────────────────────
interface SkinPhotoCaptureProps {
    /** Called when user completes (with or without photos) */
    onComplete: (photoUris: string[]) => void;
    /** Called when user skips photo upload entirely */
    onSkip: () => void;
    /** Max photos allowed */
    maxPhotos?: number;
}

type CaptureStep = 'offer' | 'consent' | 'capture' | 'done';

// ── Constants ────────────────────────────────────
function getDisclaimerText() {
    return `${t('photo.consentTitle')}\n\n${t('photo.consentLine1')}\n\n• ${t('photo.consentBullet1')}\n• ${t('photo.consentBullet2')}\n• ${t('photo.consentBullet3')}\n\n${t('photo.consentOptional')}`;
}

function getPhotoInstructions() {
    return `📷 ${t('photo.instructionsTitle')}\n\n1. ${t('photo.tip1')}\n2. ${t('photo.tip2')}\n3. ${t('photo.tip3')}\n4. ${t('photo.tip4')}\n5. ${t('photo.tip5')}\n6. ${t('photo.tip6')}`;
}

// ── Component ────────────────────────────────────
export function SkinPhotoCapture({
    onComplete,
    onSkip,
    maxPhotos = 3,
}: SkinPhotoCaptureProps) {
    const [step, setStep] = useState<CaptureStep>('offer');
    const [consentChecked, setConsentChecked] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);
    const [photos, setPhotos] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [showWebOptions, setShowWebOptions] = useState(false);
    const toast = useToast((s) => s.show);

    // ── Camera / Gallery ─────────────────────────
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

        const result = await ImagePicker.launchCameraAsync({
            quality: 0.8,
            allowsEditing: false,
            aspect: [4, 3],
        });

        if (!result.canceled && result.assets[0]) {
            setPhotos(prev => [...prev, result.assets[0].uri]);
        }
        setShowWebOptions(false);
    }, [toast]);

    const pickFromGallery = useCallback(async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            toast(t('photo.libraryPermission'), 'warning');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsMultipleSelection: false,
        });

        if (!result.canceled && result.assets[0]) {
            setPhotos(prev => [...prev, result.assets[0].uri]);
        }
        setShowWebOptions(false);
    }, [toast]);

    const handleAddPhoto = useCallback(() => {
        if (photos.length >= maxPhotos) {
            toast(t('photo.maxPhotosReached', { max: String(maxPhotos) }), 'warning');
            return;
        }

        if (Platform.OS === 'web') {
            setShowWebOptions(!showWebOptions);
        } else {
            Alert.alert(t('photo.addPhotoTitle'), '', [
                { text: t('photo.camera'), onPress: takePhoto },
                { text: t('photo.photoLibrary'), onPress: pickFromGallery },
                { text: t('common.cancel') || 'Cancel', style: 'cancel' },
            ]);
        }
    }, [photos.length, maxPhotos, takePhoto, pickFromGallery, showWebOptions, toast]);

    const removePhoto = useCallback((idx: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== idx));
    }, []);

    const handleDone = useCallback(() => {
        onComplete(photos);
    }, [photos, onComplete]);

    // ── Step: Offer ──────────────────────────────
    if (step === 'offer') {
        return (
            <View style={styles.card}>
                <Text style={styles.cardEmoji}>📸</Text>
                <Text style={styles.cardTitle}>{t('photo.offerTitle')}</Text>
                <Text style={styles.cardDescription}>
                    {t('photo.offerDesc')}
                </Text>
                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => setStep('consent')}
                    >
                        <Text style={styles.primaryButtonText}>{t('photo.yesAdd')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={onSkip}
                    >
                        <Text style={styles.secondaryButtonText}>{t('photo.skip')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // ── Step: Consent ────────────────────────────
    if (step === 'consent') {
        return (
            <View style={styles.card}>
                <Text style={styles.disclaimerText}>{getDisclaimerText()}</Text>

                <TouchableOpacity
                    style={styles.checkboxRow}
                    onPress={() => setConsentChecked(!consentChecked)}
                >
                    <View style={[styles.checkbox, consentChecked && styles.checkboxChecked]}>
                        {consentChecked && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.checkboxLabel}>
                        {t('photo.checkboxLabel')}
                    </Text>
                </TouchableOpacity>

                {/* Expandable instructions */}
                <TouchableOpacity
                    style={styles.expandButton}
                    onPress={() => setShowInstructions(!showInstructions)}
                >
                    <Text style={styles.expandButtonText}>
                        {showInstructions ? '▼' : '▶'} {t('photo.instructionsTitle')}
                    </Text>
                </TouchableOpacity>
                {showInstructions && (
                    <View style={styles.instructionsBox}>
                        <Text style={styles.instructionsText}>{getPhotoInstructions()}</Text>
                    </View>
                )}

                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        style={[styles.primaryButton, !consentChecked && styles.disabledButton]}
                        onPress={() => consentChecked && setStep('capture')}
                        disabled={!consentChecked}
                    >
                        <Text style={[styles.primaryButtonText, !consentChecked && styles.disabledText]}>
                            {t('photo.continue')}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={onSkip}
                    >
                        <Text style={styles.secondaryButtonText}>{t('photo.skip')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // ── Step: Capture (camera/gallery + preview) ─
    return (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('photo.uploadTitle')}</Text>
            <Text style={styles.cardDescription}>
                {t('photo.photosAdded', { current: String(photos.length), max: String(maxPhotos) })}
            </Text>

            {/* Photo grid */}
            {photos.length > 0 && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.photoGallery}
                >
                    {photos.map((uri, idx) => (
                        <View key={idx} style={styles.photoWrapper}>
                            <Image source={{ uri }} style={styles.photoThumb} />
                            <TouchableOpacity
                                style={styles.removeButton}
                                onPress={() => removePhoto(idx)}
                            >
                                <Text style={styles.removeText}>✕</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </ScrollView>
            )}

            {/* Add photo button */}
            {photos.length < maxPhotos && (
                <TouchableOpacity style={styles.addPhotoButton} onPress={handleAddPhoto}>
                    <Text style={styles.addPhotoIcon}>📷</Text>
                    <Text style={styles.addPhotoText}>
                        {photos.length === 0 ? t('photo.takeOrSelect') : t('photo.addAnother')}
                    </Text>
                </TouchableOpacity>
            )}

            {/* Web: inline camera/gallery buttons */}
            {showWebOptions && Platform.OS === 'web' && (
                <View style={styles.webOptions}>
                    <TouchableOpacity style={styles.webOptionBtn} onPress={takePhoto}>
                        <Text style={styles.webOptionText}>{t('photo.cameraBtn')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.webOptionBtn} onPress={pickFromGallery}>
                        <Text style={styles.webOptionText}>{t('photo.gallery')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.webOptionBtnCancel} onPress={() => setShowWebOptions(false)}>
                        <Text style={styles.webOptionCancelText}>{t('common.cancel') || 'Cancel'}</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Instructions reminder */}
            <TouchableOpacity
                style={styles.expandButton}
                onPress={() => setShowInstructions(!showInstructions)}
            >
                <Text style={styles.expandButtonText}>
                    {showInstructions ? '▼' : '▶'} {t('photo.photoTips')}
                </Text>
            </TouchableOpacity>
            {showInstructions && (
                <View style={styles.instructionsBox}>
                    <Text style={styles.instructionsText}>{getPhotoInstructions()}</Text>
                </View>
            )}

            {/* Action buttons */}
            <View style={styles.buttonRow}>
                {photos.length > 0 ? (
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={handleDone}
                        disabled={uploading}
                    >
                        {uploading ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.primaryButtonText}>
                                {t('photo.done', { count: String(photos.length) })}
                            </Text>
                        )}
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={onSkip}
                    >
                        <Text style={styles.secondaryButtonText}>{t('photo.skipWithout')}</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

// ── Styles ───────────────────────────────────────
const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.bgSecondary,
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginVertical: spacing.md,
        marginHorizontal: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cardEmoji: {
        fontSize: 40,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    cardTitle: {
        ...typography.h4,
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: spacing.xs,
    },
    cardDescription: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },

    // Buttons
    buttonRow: {
        marginTop: spacing.md,
        gap: spacing.sm,
    },
    primaryButton: {
        backgroundColor: colors.accentTeal,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.md,
        alignItems: 'center',
    },
    primaryButtonText: {
        ...typography.button,
        color: '#fff',
        fontWeight: '600',
    },
    secondaryButton: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    secondaryButtonText: {
        ...typography.button,
        color: colors.textSecondary,
    },
    disabledButton: {
        backgroundColor: colors.bgTertiary,
    },
    disabledText: {
        color: colors.textTertiary,
    },

    // Consent / Disclaimer
    disclaimerText: {
        ...typography.body,
        color: colors.textSecondary,
        lineHeight: 22,
        marginBottom: spacing.lg,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: radius.sm,
        borderWidth: 2,
        borderColor: colors.accentTeal,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    checkboxChecked: {
        backgroundColor: colors.accentTeal,
    },
    checkmark: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    checkboxLabel: {
        ...typography.body,
        color: colors.textPrimary,
        flex: 1,
    },

    // Instructions
    expandButton: {
        paddingVertical: spacing.sm,
    },
    expandButtonText: {
        ...typography.caption,
        color: colors.accentTeal,
        fontWeight: '600',
    },
    instructionsBox: {
        backgroundColor: colors.bgTertiary,
        borderRadius: radius.md,
        padding: spacing.md,
        marginTop: spacing.xs,
        marginBottom: spacing.sm,
    },
    instructionsText: {
        ...typography.caption,
        color: colors.textSecondary,
        lineHeight: 20,
    },

    // Photo Gallery
    photoGallery: {
        flexDirection: 'row',
        marginBottom: spacing.md,
    },
    photoWrapper: {
        marginRight: spacing.sm,
        position: 'relative',
    },
    photoThumb: {
        width: 90,
        height: 90,
        borderRadius: radius.md,
    },
    removeButton: {
        position: 'absolute',
        top: -6,
        right: -6,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: colors.error,
        justifyContent: 'center',
        alignItems: 'center',
    },
    removeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },

    // Add photo
    addPhotoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: colors.accentTeal,
        borderRadius: radius.md,
        backgroundColor: colors.bgTertiary,
        marginBottom: spacing.sm,
    },
    addPhotoIcon: {
        fontSize: 20,
        marginRight: spacing.sm,
    },
    addPhotoText: {
        ...typography.body,
        color: colors.accentTeal,
        fontWeight: '600',
    },

    // Web inline options
    webOptions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.sm },
    webOptionBtn: {
        flex: 1,
        paddingVertical: spacing.sm,
        borderRadius: radius.md,
        backgroundColor: colors.accentTealFaded,
        alignItems: 'center' as const,
    },
    webOptionText: { ...typography.bodySm, color: colors.accentTeal, fontWeight: '600' as const },
    webOptionBtnCancel: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radius.md,
        backgroundColor: colors.bgTertiary,
        alignItems: 'center' as const,
    },
    webOptionCancelText: { ...typography.bodySm, color: colors.textTertiary },
});
