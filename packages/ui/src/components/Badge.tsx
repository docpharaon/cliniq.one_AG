import React from 'react';
import type { CSSProperties } from 'react';
import { colors, radius, spacing } from '../tokens';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'teal';

interface BadgeProps {
    label: string;
    variant?: BadgeVariant;
    size?: 'sm' | 'md';
    style?: CSSProperties;
}

export function Badge({ label, variant = 'default', size = 'sm', style }: BadgeProps) {
    return (
        <span style={{ ...styles.base, ...sizeStyles[size], ...variantBg[variant], ...style }}>
            <span style={{ ...styles.text, ...sizeText[size], ...variantText[variant] }}>{label}</span>
        </span>
    );
}

const styles: Record<string, CSSProperties> = {
    base: { alignSelf: 'flex-start', borderRadius: radius.full, display: 'inline-flex' },
    text: { fontWeight: 600 },
};

const sizeStyles: Record<string, CSSProperties> = {
    sm: { paddingBlock: spacing.xxs, paddingInline: spacing.sm },
    md: { paddingBlock: spacing.xs, paddingInline: spacing.md },
};

const sizeText: Record<string, CSSProperties> = {
    sm: { fontSize: 10 },
    md: { fontSize: 12 },
};

const variantBg: Record<BadgeVariant, CSSProperties> = {
    default: { backgroundColor: colors.bgElevated },
    success: { backgroundColor: colors.successFaded },
    warning: { backgroundColor: colors.warningFaded },
    error: { backgroundColor: colors.errorFaded },
    info: { backgroundColor: colors.infoFaded },
    teal: { backgroundColor: colors.accentTealFaded },
};

const variantText: Record<BadgeVariant, CSSProperties> = {
    default: { color: colors.textSecondary },
    success: { color: colors.success },
    warning: { color: colors.warning },
    error: { color: colors.error },
    info: { color: colors.info },
    teal: { color: colors.accentTeal },
};
