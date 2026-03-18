import { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Image,
    ScrollView, Alert, ActivityIndicator, Linking, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, typography, radius } from '@cliniqone/ui';
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
const DISCLAIMER_TEXT = `📋 Photo Consent

Your doctor may benefit from seeing a photo of the affected area.

By proceeding, you consent to:
• Your photo being stored securely and shared only with your treating physician
• Photos are encrypted and stored in compliance with healthcare privacy regulations
• You can request deletion of your photos at any time

This is completely optional. You can skip this step.`;

const PHOTO_INSTRUCTIONS = `📷 Tips for a Good Medical Photo

1. Use good, natural lighting — avoid flash
2. Hold the phone 15–30 cm (6–12 in) from the area
3. Place a coin next to the lesion for size reference
4. Take one close-up and one wider shot showing location
5. Photograph from directly above (not at an angle)
6. Make sure the image is in focus before submitting`;

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
                toast('Please allow camera access in your browser settings.', 'warning');
            } else {
                Alert.alert(
                    'Camera Permission Required',
                    'Please allow camera access in your device settings to take a photo.',
                    [
                        { text: 'Open Settings', onPress: () => Linking.openSettings() },
                        { text: 'Cancel', style: 'cancel' },
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
            toast('Please allow access to your photo library.', 'warning');
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
            toast(`You can add up to ${maxPhotos} photos.`, 'warning');
            return;
        }

        if (Platform.OS === 'web') {
            setShowWebOptions(!showWebOptions);
        } else {
            Alert.alert('Add Photo', 'Choose an option', [
                { text: 'Camera', onPress: takePhoto },
                { text: 'Photo Library', onPress: pickFromGallery },
                { text: 'Cancel', style: 'cancel' },
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
                <Text style={styles.cardTitle}>Would you like to add a photo?</Text>
                <Text style={styles.cardDescription}>
                    A photo of the affected area can help your doctor provide better care.
                    This is completely optional.
                </Text>
                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => setStep('consent')}
                    >
                        <Text style={styles.primaryButtonText}>📷 Yes, add a photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={onSkip}
                    >
                        <Text style={styles.secondaryButtonText}>Skip</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // ── Step: Consent ────────────────────────────
    if (step === 'consent') {
        return (
            <View style={styles.card}>
                <Text style={styles.disclaimerText}>{DISCLAIMER_TEXT}</Text>

                <TouchableOpacity
                    style={styles.checkboxRow}
                    onPress={() => setConsentChecked(!consentChecked)}
                >
                    <View style={[styles.checkbox, consentChecked && styles.checkboxChecked]}>
                        {consentChecked && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.checkboxLabel}>
                        I understand and consent to photo storage
                    </Text>
                </TouchableOpacity>

                {/* Expandable instructions */}
                <TouchableOpacity
                    style={styles.expandButton}
                    onPress={() => setShowInstructions(!showInstructions)}
                >
                    <Text style={styles.expandButtonText}>
                        {showInstructions ? '▼' : '▶'} How to take a good medical photo
                    </Text>
                </TouchableOpacity>
                {showInstructions && (
                    <View style={styles.instructionsBox}>
                        <Text style={styles.instructionsText}>{PHOTO_INSTRUCTIONS}</Text>
                    </View>
                )}

                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        style={[styles.primaryButton, !consentChecked && styles.disabledButton]}
                        onPress={() => consentChecked && setStep('capture')}
                        disabled={!consentChecked}
                    >
                        <Text style={[styles.primaryButtonText, !consentChecked && styles.disabledText]}>
                            Continue
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={onSkip}
                    >
                        <Text style={styles.secondaryButtonText}>Skip</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // ── Step: Capture (camera/gallery + preview) ─
    return (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>📸 Upload Photos</Text>
            <Text style={styles.cardDescription}>
                {photos.length}/{maxPhotos} photos added
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
                        {photos.length === 0 ? 'Take or select a photo' : 'Add another photo'}
                    </Text>
                </TouchableOpacity>
            )}

            {/* Web: inline camera/gallery buttons */}
            {showWebOptions && Platform.OS === 'web' && (
                <View style={styles.webOptions}>
                    <TouchableOpacity style={styles.webOptionBtn} onPress={takePhoto}>
                        <Text style={styles.webOptionText}>📸 Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.webOptionBtn} onPress={pickFromGallery}>
                        <Text style={styles.webOptionText}>🖼️ Gallery</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.webOptionBtnCancel} onPress={() => setShowWebOptions(false)}>
                        <Text style={styles.webOptionCancelText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Instructions reminder */}
            <TouchableOpacity
                style={styles.expandButton}
                onPress={() => setShowInstructions(!showInstructions)}
            >
                <Text style={styles.expandButtonText}>
                    {showInstructions ? '▼' : '▶'} Photo tips
                </Text>
            </TouchableOpacity>
            {showInstructions && (
                <View style={styles.instructionsBox}>
                    <Text style={styles.instructionsText}>{PHOTO_INSTRUCTIONS}</Text>
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
                                ✅ Done ({photos.length} photo{photos.length > 1 ? 's' : ''})
                            </Text>
                        )}
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={onSkip}
                    >
                        <Text style={styles.secondaryButtonText}>Skip without photo</Text>
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
