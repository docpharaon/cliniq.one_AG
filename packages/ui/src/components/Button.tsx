import React from 'react';
import type { CSSProperties } from 'react';
import { colors, radius, spacing, typography } from '../tokens';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    icon?: React.ReactNode;
    style?: CSSProperties;
}

export function Button({ title, onPress, variant = 'primary', size = 'md', disabled = false, loading = false, icon, style }: ButtonProps) {
    const isDisabled = disabled || loading;
    const btnStyle: CSSProperties = { ...styles.base, ...sizeStyles[size], ...variantStyles[variant], ...(isDisabled ? styles.disabled : {}), ...style };
    const textStyle: CSSProperties = { ...styles.text, ...sizeTextStyles[size], ...variantTextStyles[variant], ...(isDisabled ? styles.disabledText : {}) };

    return (
        <button style={btnStyle} onClick={onPress} disabled={isDisabled}>
            {loading ? (
                <div className="spinner" style={{ color: variant === 'outline' || variant === 'ghost' ? colors.accentTeal : colors.textInverse }} />
            ) : (
                <>
                    {icon}
                    <span style={textStyle}>{title}</span>
                </>
            )}
        </button>
    );
}

const styles: Record<string, CSSProperties> = {
    base: { display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, gap: spacing.sm, cursor: 'pointer', border: 'none' },
    text: { fontWeight: typography.button.fontWeight, fontSize: typography.button.fontSize },
    disabled: { opacity: 0.5, cursor: 'not-allowed' },
    disabledText: { opacity: 0.7 },
};

const sizeStyles: Record<string, CSSProperties> = {
    sm: { paddingBlock: spacing.sm, paddingInline: spacing.lg },
    md: { paddingBlock: spacing.md, paddingInline: spacing.xl },
    lg: { paddingBlock: spacing.lg, paddingInline: spacing['2xl'], width: '100%' },
};

const sizeTextStyles: Record<string, CSSProperties> = {
    sm: { fontSize: typography.buttonSm.fontSize },
    md: { fontSize: typography.button.fontSize },
    lg: { fontSize: 17 },
};

const variantStyles: Record<string, CSSProperties> = {
    primary: { backgroundColor: colors.accentTeal },
    secondary: { backgroundColor: colors.bgElevated },
    outline: { backgroundColor: 'transparent', border: `1.5px solid ${colors.accentTeal}` },
    ghost: { backgroundColor: 'transparent' },
};

const variantTextStyles: Record<string, CSSProperties> = {
    primary: { color: colors.textInverse },
    secondary: { color: colors.textPrimary },
    outline: { color: colors.accentTeal },
    ghost: { color: colors.accentTeal },
};
