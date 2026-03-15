import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography, shadows } from '../tokens';

interface CardProps {
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
    variant?: 'default' | 'elevated' | 'outlined';
    style?: ViewStyle;
}

export function Card({ children, title, subtitle, variant = 'default', style }: CardProps) {
    return (
        <View style={[styles.base, variantStyles[variant], style]}>
            {title && (
                <View style={styles.header}>
                    <Text style={styles.title}>{title}</Text>
                    {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                </View>
            )}
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    base: {
        backgroundColor: colors.bgCard,
        borderRadius: radius.xl,
        padding: spacing.xl,
        ...shadows.card,
    },
    header: {
        marginBottom: spacing.lg,
    },
    title: {
        ...typography.h4,
        color: colors.textPrimary,
    },
    subtitle: {
        ...typography.bodySm,
        color: colors.textSecondary,
        marginTop: spacing.xxs,
    },
});

const variantStyles: Record<string, ViewStyle> = {
    default: {},
    elevated: {
        backgroundColor: colors.bgElevated,
        ...shadows.elevated,
    },
    outlined: {
        backgroundColor: colors.transparent,
        borderWidth: 1,
        borderColor: colors.border,
        shadowOpacity: 0,
        elevation: 0,
    },
};
