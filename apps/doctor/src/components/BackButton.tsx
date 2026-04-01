import React from 'react';
import { useNavigate } from 'react-router-dom';
import { haptic } from '../hooks/useHaptics';

interface BackButtonProps {
    label?: string;
    style?: React.CSSProperties;
}

/** Native-style back button with haptic feedback and SVG chevron */
export function BackButton({ label, style }: BackButtonProps) {
    const navigate = useNavigate();

    return (
        <button
            onClick={() => { haptic.light(); navigate(-1); }}
            className="pressable"
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: 'none',
                border: 'none',
                color: '#1A8A9E',
                fontSize: 15,
                fontWeight: 600,
                padding: '8px 0',
                ...style,
            }}
        >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
            </svg>
            {label && <span>{label}</span>}
        </button>
    );
}
