import React from 'react';
import { TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@cliniqone/ui';
import { lightTap } from '../hooks/useHaptics';

interface BackButtonProps {
    onPress?: () => void;
    color?: string;
    size?: number;
}

/**
 * Platform-aware back button that meets 44pt minimum touch target.
 * - iOS: chevron-back (SF-style)
 * - Android/Web: arrow-back
 */
export function BackButton({ onPress, color, size = 24 }: BackButtonProps) {
    const iconName = Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back';
    const iconColor = color || colors.accentTeal;

    return (
        <TouchableOpacity
            onPress={() => { lightTap(); (onPress || (() => router.back()))(); }}
            style={styles.button}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
            <Ionicons name={iconName} size={size} color={iconColor} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.bgCard,
        marginBottom: spacing.md,
    },
});
