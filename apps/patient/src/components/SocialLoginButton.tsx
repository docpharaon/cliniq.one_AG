import React from 'react';
import { isRTL } from '@cliniqone/i18n';

type Provider = 'google' | 'apple';

interface SocialLoginButtonProps {
    provider: Provider;
    label?: string;
    loading?: boolean;
    disabled?: boolean;
    onPress: () => void;
}

// ── Official Apple Logo SVG ─────────────────────────────────────
function AppleLogo({ size = 20, color = '#FFFFFF' }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
                fill={color}
            />
        </svg>
    );
}

// ── Official Google "G" Logo SVG ────────────────────────────────
function GoogleLogo({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
            />
            <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
            />
            <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
            />
            <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
            />
        </svg>
    );
}

/** Social login button for Google and Apple OAuth — with official SVG logos & RTL support */
export function SocialLoginButton({ provider, label, loading, disabled, onPress }: SocialLoginButtonProps) {
    const isApple = provider === 'apple';
    const displayLabel = label || `Continue with ${isApple ? 'Apple' : 'Google'}`;
    const rtl = isRTL();

    return (
        <button
            id={`social-login-${provider}`}
            onClick={onPress}
            disabled={loading || disabled}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: rtl ? 'row-reverse' : 'row',
                gap: 12,
                width: '100%',
                padding: '14px 20px',
                borderRadius: 12,
                border: isApple ? '1.5px solid #333333' : '1.5px solid var(--border)',
                backgroundColor: isApple ? '#000000' : '#FFFFFF',
                color: isApple ? '#FFFFFF' : '#1F2937',
                fontSize: 15,
                fontWeight: 600,
                cursor: loading || disabled ? 'not-allowed' : 'pointer',
                opacity: loading || disabled ? 0.6 : 1,
                transition: 'opacity 0.2s, transform 0.1s, box-shadow 0.2s',
                boxSizing: 'border-box',
                minHeight: 48,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
            onMouseEnter={(e) => {
                if (!loading && !disabled) {
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                }
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
                e.currentTarget.style.transform = 'translateY(0)';
            }}
        >
            {loading ? (
                <span className="spinner" style={{ width: 20, height: 20 }} />
            ) : (
                <span style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 24, height: 24, flexShrink: 0,
                }}>
                    {isApple ? <AppleLogo size={20} color="#FFFFFF" /> : <GoogleLogo size={20} />}
                </span>
            )}
            <span style={{ letterSpacing: 0.2 }}>{displayLabel}</span>
        </button>
    );
}
