import React from 'react';
import { Info, AlertTriangle, Siren, X } from '@cliniqone/ui';

interface DisclaimerBannerProps {
    message: string;
    type?: 'info' | 'warning' | 'error';
    onDismiss?: () => void;
}

const TYPE_COLORS = {
    info: { bg: '#F0FDFA', border: '#1A8A9E', text: '#134E4A', Icon: Info },
    warning: { bg: '#FFFBEB', border: '#D97706', text: '#92400E', Icon: AlertTriangle },
    error: { bg: '#FEF2F2', border: '#DC2626', text: '#991B1B', Icon: Siren },
};

/** Disclaimer/info banner for legal and safety notices */
export function DisclaimerBanner({ message, type = 'info', onDismiss }: DisclaimerBannerProps) {
    const colors = TYPE_COLORS[type];

    return (
        <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            padding: '12px 14px',
            backgroundColor: colors.bg,
            borderRadius: 10,
            borderLeft: `3px solid ${colors.border}`,
            marginBottom: 12,
        }}>
            <colors.Icon size={16} color={colors.border} style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ flex: 1, fontSize: 13, lineHeight: '18px', color: colors.text, margin: 0 }}>
                {message}
            </p>
            {onDismiss && (
                <button
                    onClick={onDismiss}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.text, fontWeight: 700, fontSize: 14 }}
                >
                    <X size={12} color={colors.text} strokeWidth={2.5} />
                </button>
            )}
        </div>
    );
}
