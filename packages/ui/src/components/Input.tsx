import React, { useState } from 'react';
import {
    View,
    TextInput as RNTextInput,
    Text,
    TouchableOpacity,
    StyleSheet,
    TextInputProps as RNTextInputProps,
} from 'react-native';
import { colors, radius, spacing, typography } from '../tokens';

interface InputProps extends Omit<RNTextInputProps, 'style'> {
    label?: string;
    error?: string;
    hint?: string;
    required?: boolean;
    rightIcon?: React.ReactNode;
    onRightIconPress?: () => void;
}

export function Input({
    label,
    error,
    hint,
    required,
    rightIcon,
    onRightIconPress,
    ...inputProps
}: InputProps) {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <View style={styles.container}>
            {label && (
                <Text style={styles.label}>
                    {label}
                    {required && <Text style={styles.required}> *</Text>}
                </Text>
            )}
            <View
                style={[
                    styles.inputContainer,
                    isFocused && styles.inputFocused,
                    error ? styles.inputError : null,
                ]}
            >
                <RNTextInput
                    placeholderTextColor={colors.textTertiary}
                    style={styles.input}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    {...inputProps}
                />
                {rightIcon && (
                    <TouchableOpacity onPress={onRightIconPress} style={styles.rightIcon}>
                        {rightIcon}
                    </TouchableOpacity>
                )}
            </View>
            {error && <Text style={styles.error}>{error}</Text>}
            {hint && !error && <Text style={styles.hint}>{hint}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.lg,
    },
    label: {
        ...typography.label,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    required: {
        color: colors.error,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgTertiary,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: radius.md,
        paddingHorizontal: spacing.lg,
    },
    inputFocused: {
        borderColor: colors.borderFocused,
    },
    inputError: {
        borderColor: colors.borderError,
    },
    input: {
        flex: 1,
        ...typography.body,
        color: colors.textPrimary,
        paddingVertical: spacing.md + 2,
    },
    rightIcon: {
        paddingLeft: spacing.sm,
    },
    error: {
        ...typography.caption,
        color: colors.error,
        marginTop: spacing.xs,
    },
    hint: {
        ...typography.caption,
        color: colors.textTertiary,
        marginTop: spacing.xs,
    },
});
