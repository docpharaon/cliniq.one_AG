import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography, radius } from '@cliniqone/ui';
import { t } from '@cliniqone/i18n';

interface DisclaimerBannerProps {
    variant?: 'default' | 'compact';
}

/**
 * Medical disclaimer banner — required by Google Play and Apple App Store
 * for healthcare/telemedicine apps.
 */
export function DisclaimerBanner({ variant = 'default' }: DisclaimerBannerProps) {
    const isCompact = variant === 'compact';

    return (
        <View style={[styles.container, isCompact && styles.containerCompact]}>
            <Text style={styles.icon}>⚕️</Text>
            <Text style={[styles.text, isCompact && styles.textCompact]}>
                {isCompact
                    ? t('disclaimer.compact')
                    : t('disclaimer.full')}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: colors.bgCard,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 2,
        borderRadius: radius.md,
        borderLeftWidth: 3,
        borderLeftColor: colors.accentTeal,
        gap: spacing.sm,
    },
    containerCompact: {
        paddingVertical: spacing.xs + 2,
        paddingHorizontal: spacing.sm,
    },
    icon: {
        fontSize: 14,
        marginTop: 2,
    },
    text: {
        ...typography.caption,
        color: colors.textTertiary,
        flex: 1,
        lineHeight: 16,
    },
    textCompact: {
        fontSize: 10,
        lineHeight: 14,
    },
});
