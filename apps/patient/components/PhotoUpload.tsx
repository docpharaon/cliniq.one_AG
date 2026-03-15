import { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, typography, radius } from '@cliniqone/ui';
import { t } from '@cliniqone/i18n';

interface PhotoUploadProps {
    photos: string[];
    onAdd: (uri: string) => void;
    onRemove: (uri: string) => void;
    maxPhotos?: number;
}

export function PhotoUpload({ photos, onAdd, onRemove, maxPhotos = 5 }: PhotoUploadProps) {
    const [uploading, setUploading] = useState(false);

    async function pickImage() {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please allow access to your photo library.');
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
    }

    async function takePhoto() {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please allow camera access.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            quality: 0.8,
            allowsEditing: true,
        });

        if (!result.canceled && result.assets[0]) {
            onAdd(result.assets[0].uri);
        }
    }

    function handleAdd() {
        if (photos.length >= maxPhotos) {
            Alert.alert('Limit Reached', `You can add up to ${maxPhotos} photos.`);
            return;
        }

        Alert.alert('Add Photo', 'Choose an option', [
            { text: 'Camera', onPress: takePhoto },
            { text: 'Photo Library', onPress: pickImage },
            { text: 'Cancel', style: 'cancel' },
        ]);
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
});
