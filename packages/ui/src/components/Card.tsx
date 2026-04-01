import React from 'react';
import type { CSSProperties } from 'react';
import { colors, radius, spacing, typography, shadows } from '../tokens';

interface CardProps {
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
    variant?: 'default' | 'elevated' | 'outlined';
    style?: CSSProperties;
}

export function Card({ children, title, subtitle, variant = 'default', style }: CardProps) {
    return (
        <div style={{ ...styles.base, ...variantStyles[variant], ...style }}>
            {title && (
                <div style={styles.header}>
                    <span style={styles.title}>{title}</span>
                    {subtitle && <span style={styles.subtitle}>{subtitle}</span>}
                </div>
            )}
            {children}
        </div>
    );
}

const styles: Record<string, CSSProperties> = {
    base: { backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.xl },
    header: { marginBottom: spacing.lg },
    title: { display: 'block', fontSize: typography.h4.fontSize, fontWeight: typography.h4.fontWeight, color: colors.textPrimary },
    subtitle: { display: 'block', fontSize: typography.bodySm.fontSize, color: colors.textSecondary, marginTop: spacing.xxs },
};

const variantStyles: Record<string, CSSProperties> = {
    default: {},
    elevated: { backgroundColor: colors.bgElevated },
    outlined: { backgroundColor: 'transparent', border: `1px solid ${colors.border}` },
};
