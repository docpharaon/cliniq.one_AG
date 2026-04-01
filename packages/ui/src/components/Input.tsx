import React, { useState } from 'react';
import type { CSSProperties } from 'react';
import { colors, radius, spacing, typography } from '../tokens';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'style'> {
    label?: string;
    error?: string;
    hint?: string;
    required?: boolean;
    rightIcon?: React.ReactNode;
    onRightIconPress?: () => void;
}

export function Input({ label, error, hint, required, rightIcon, onRightIconPress, ...inputProps }: InputProps) {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <div style={styles.container}>
            {label && (
                <label style={styles.label}>
                    {label}
                    {required && <span style={styles.required}> *</span>}
                </label>
            )}
            <div style={{ ...styles.inputContainer, ...(isFocused ? styles.inputFocused : {}), ...(error ? styles.inputError : {}) }}>
                <input
                    style={styles.input}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    {...inputProps}
                />
                {rightIcon && (
                    <button onClick={onRightIconPress} style={styles.rightIcon}>
                        {rightIcon}
                    </button>
                )}
            </div>
            {error && <span style={styles.error}>{error}</span>}
            {hint && !error && <span style={styles.hint}>{hint}</span>}
        </div>
    );
}

const styles: Record<string, CSSProperties> = {
    container: { marginBottom: spacing.lg },
    label: { display: 'block', fontSize: typography.label.fontSize, color: colors.textSecondary, marginBottom: spacing.xs },
    required: { color: colors.error },
    inputContainer: { display: 'flex', alignItems: 'center', backgroundColor: colors.bgTertiary, border: `1.5px solid ${colors.border}`, borderRadius: radius.md, paddingInline: spacing.lg },
    inputFocused: { borderColor: colors.borderFocused },
    inputError: { borderColor: colors.borderError },
    input: { flex: 1, fontSize: typography.body.fontSize, color: colors.textPrimary, paddingBlock: spacing.md + 2, backgroundColor: 'transparent', border: 'none', outline: 'none', fontFamily: 'inherit', width: '100%' },
    rightIcon: { paddingLeft: spacing.sm, background: 'none', border: 'none', cursor: 'pointer' },
    error: { display: 'block', fontSize: typography.caption.fontSize, color: colors.error, marginTop: spacing.xs },
    hint: { display: 'block', fontSize: typography.caption.fontSize, color: colors.textTertiary, marginTop: spacing.xs },
};
