import { CSSProperties } from 'react';
import { colors, typography, radius } from '@cliniqone/ui';
import { haptic } from '../hooks/useHaptics';

interface SocialLoginButtonProps {
    provider: 'google' | 'apple';
    label: string;
    loading?: boolean;
    disabled?: boolean;
    onPress: () => void;
}

export function SocialLoginButton({ provider, label, loading, disabled, onPress }: SocialLoginButtonProps) {
    const isApple = provider === 'apple';
    
    // Fallback simple svg icons
    const GoogleIcon = () => (
        <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
    );

    const AppleIcon = () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" fill="#FFFFFF"/>
        </svg>
    );

    const containerStyle: CSSProperties = {
        ...s.button,
        ...(isApple ? s.appleButton : s.googleButton),
        ...(disabled ? s.disabled : {}),
    };

    return (
        <button 
            style={containerStyle} 
            onClick={() => { haptic.light(); onPress(); }}
            disabled={disabled || loading}
            className="pressable"
        >
            {loading ? (
                <div className="spinner" style={{ color: isApple ? '#FFFFFF' : colors.textPrimary }} />
            ) : (
                <>
                    <div style={s.iconContainer}>
                        {isApple ? <AppleIcon /> : <GoogleIcon />}
                    </div>
                    <span style={isApple ? s.appleLabel : s.googleLabel}>{label}</span>
                </>
            )}
        </button>
    );
}

const s: Record<string, CSSProperties> = {
    button: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingBlock: 14,
        paddingInline: 24,
        borderRadius: radius.lg,
        gap: 12,
        minHeight: 48,
        border: 'none',
        cursor: 'pointer',
        width: '100%',
        marginBottom: 12,
    },
    appleButton: {
        backgroundColor: '#000000',
        border: '1px solid #333333',
    },
    googleButton: {
        backgroundColor: colors.bgCard,
        border: `1px solid ${colors.border}`,
    },
    disabled: {
        opacity: 0.5,
        cursor: 'not-allowed',
    },
    iconContainer: {
        width: 24,
        height: 24,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
    },
    appleLabel: {
        fontSize: typography.button.fontSize,
        fontWeight: 600,
        color: '#FFFFFF',
    },
    googleLabel: {
        fontSize: typography.button.fontSize,
        fontWeight: 600,
        color: colors.textPrimary,
    },
};
