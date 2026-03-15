import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../tokens';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'teal';

interface BadgeProps {
    label: string;
    variant?: BadgeVariant;
    size?: 'sm' | 'md';
    style?: ViewStyle;
}

export function Badge({ label, variant = 'default', size = 'sm', style }: BadgeProps) {
    return (
        <View style={[styles.base, sizeStyles[size], variantBg[variant], style]}>
            <Text style={[styles.text, sizeText[size], variantText[variant]]}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    base: {
        alignSelf: 'flex-start',
        borderRadius: radius.full,
    },
    text: {
        fontWeight: '600',
    },
});

const sizeStyles: Record<string, ViewStyle> = {
    sm: { paddingVertical: spacing.xxs, paddingHorizontal: spacing.sm },
    md: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
};

const sizeText: Record<string, any> = {
    sm: { fontSize: 10 },
    md: { fontSize: 12 },
};

const variantBg: Record<BadgeVariant, ViewStyle> = {
    default: { backgroundColor: colors.bgElevated },
    success: { backgroundColor: colors.successFaded },
    warning: { backgroundColor: colors.warningFaded },
    error: { backgroundColor: colors.errorFaded },
    info: { backgroundColor: colors.infoFaded },
    teal: { backgroundColor: colors.accentTealFaded },
};

const variantText: Record<BadgeVariant, any> = {
    default: { color: colors.textSecondary },
    success: { color: colors.success },
    warning: { color: colors.warning },
    error: { color: colors.error },
    info: { color: colors.info },
    teal: { color: colors.accentTeal },
};
