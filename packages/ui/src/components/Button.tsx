import React from 'react';
import {
    Pressable,
    Text,
    ActivityIndicator,
    StyleSheet,
    ViewStyle,
    TextStyle,
} from 'react-native';
import { colors, radius, spacing, typography } from '../tokens';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    icon?: React.ReactNode;
    style?: ViewStyle;
}

export function Button({
    title,
    onPress,
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    icon,
    style,
}: ButtonProps) {
    const isDisabled = disabled || loading;

    return (
        <Pressable
            onPress={onPress}
            disabled={isDisabled}
            style={({ pressed }) => [
                styles.base,
                sizeStyles[size],
                variantStyles[variant],
                isDisabled && styles.disabled,
                pressed && !isDisabled && { opacity: 0.8 },
                style,
            ]}
        >
            {loading ? (
                <ActivityIndicator
                    size="small"
                    color={variant === 'outline' || variant === 'ghost' ? colors.accentTeal : colors.textInverse}
                />
            ) : (
                <>
                    {icon}
                    <Text
                        style={[
                            styles.text,
                            sizeTextStyles[size],
                            variantTextStyles[variant],
                            isDisabled && styles.disabledText,
                        ]}
                    >
                        {title}
                    </Text>
                </>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    base: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.lg,
        gap: spacing.sm,
    },
    text: {
        ...typography.button,
    },
    disabled: {
        opacity: 0.5,
    },
    disabledText: {
        opacity: 0.7,
    },
});

const sizeStyles: Record<string, ViewStyle> = {
    sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
    md: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
    lg: { paddingVertical: spacing.lg, paddingHorizontal: spacing['2xl'], width: '100%' },
};

const sizeTextStyles: Record<string, TextStyle> = {
    sm: { ...typography.buttonSm },
    md: { ...typography.button },
    lg: { ...typography.button, fontSize: 17 },
};

const variantStyles: Record<string, ViewStyle> = {
    primary: { backgroundColor: colors.accentTeal },
    secondary: { backgroundColor: colors.bgElevated },
    outline: { backgroundColor: colors.transparent, borderWidth: 1.5, borderColor: colors.accentTeal },
    ghost: { backgroundColor: colors.transparent },
};

const variantTextStyles: Record<string, TextStyle> = {
    primary: { color: colors.textInverse },
    secondary: { color: colors.textPrimary },
    outline: { color: colors.accentTeal },
    ghost: { color: colors.accentTeal },
};
