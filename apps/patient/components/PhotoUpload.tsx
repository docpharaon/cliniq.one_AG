import { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert, ScrollView, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, typography, radius } from '@cliniqone/ui';
import { t } from '@cliniqone/i18n';
import { useToast } from './ToastProvider';

interface PhotoUploadProps {
    photos: string[];
    onAdd: (uri: string) => void;
    onRemove: (uri: string) => void;
    maxPhotos?: number;
}

export function PhotoUpload({ photos, onAdd, onRemove, maxPhotos = 5 }: PhotoUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const toast = useToast((s) => s.show);

    async function pickImage() {
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
            onAdd(result.assets[0].uri);
        }
        setShowOptions(false);
    }

    async function takePhoto() {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            toast('Please allow camera access.', 'warning');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            quality: 0.8,
            allowsEditing: true,
        });

        if (!result.canceled && result.assets[0]) {
            onAdd(result.assets[0].uri);
        }
        setShowOptions(false);
    }

    function handleAdd() {
        if (photos.length >= maxPhotos) {
            toast(`You can add up to ${maxPhotos} photos.`, 'warning');
            return;
        }

        if (Platform.OS === 'web') {
            // Web: toggle inline options
            setShowOptions(!showOptions);
        } else {
            // Native: action sheet
            Alert.alert('Add Photo', 'Choose an option', [
                { text: 'Camera', onPress: takePhoto },
                { text: 'Photo Library', onPress: pickImage },
                { text: 'Cancel', style: 'cancel' },
            ]);
        }
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>📸 {t('intake.addPhotos')}</Text>
                <Text style={styles.counter}>{photos.length}/{maxPhotos}</Text>
            </View>
            <Text style={styles.hint}>{t('intake.photosHint')}</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gallery}>
                {photos.map((uri, idx) => (
                    <View key={idx} style={styles.photoWrapper}>
                        <Image source={{ uri }} style={styles.photo} />
                        <TouchableOpacity
                            style={styles.removeButton}
                            onPress={() => onRemove(uri)}
                        >
                            <Text style={styles.removeText}>✕</Text>
                        </TouchableOpacity>
                    </View>
                ))}

                {photos.length < maxPhotos && (
                    <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
                        <Text style={styles.addIcon}>📷</Text>
                        <Text style={styles.addText}>Add</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>

            {/* Web: inline camera/gallery buttons */}
            {showOptions && Platform.OS === 'web' && (
                <View style={styles.webOptions}>
                    <TouchableOpacity style={styles.webOptionBtn} onPress={takePhoto}>
                        <Text style={styles.webOptionText}>📸 Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.webOptionBtn} onPress={pickImage}>
                        <Text style={styles.webOptionText}>🖼️ Gallery</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.webOptionBtnCancel} onPress={() => setShowOptions(false)}>
                        <Text style={styles.webOptionCancelText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginBottom: spacing.xl },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { ...typography.h4, color: colors.textPrimary },
    counter: { ...typography.caption, color: colors.textTertiary },
    hint: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.md },

    gallery: { flexDirection: 'row' },
    photoWrapper: { marginRight: spacing.md, position: 'relative' },
    photo: { width: 100, height: 100, borderRadius: radius.md },
    removeButton: {
        position: 'absolute',
        top: -6,
        right: -6,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.error,
        justifyContent: 'center',
        alignItems: 'center',
    },
    removeText: { color: '#fff', fontSize: 12, fontWeight: '700' },

    addButton: {
        width: 100,
        height: 100,
        borderRadius: radius.md,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.bgTertiary,
    },
    addIcon: { fontSize: 28, marginBottom: 4 },
    addText: { ...typography.caption, color: colors.textTertiary },

    // Web inline options
    webOptions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
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
