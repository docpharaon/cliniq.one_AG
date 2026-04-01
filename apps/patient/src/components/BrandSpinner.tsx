import React from 'react';
import logoImg from '../../assets/logo.png';

interface BrandSpinnerProps {
    /** Optional message below the logo */
    message?: string;
    /** If true, renders as a full-screen overlay; if false, inline centered */
    fullScreen?: boolean;
}

/**
 * Branded loading spinner matching the Cliniq.One logo design.
 * Features the logo centered inside a rotating gradient ring
 * with the brand's teal-to-blue gradient arc.
 */
export function BrandSpinner({ message, fullScreen = true }: BrandSpinnerProps) {
    return (
        <div
            className="brand-spinner-container"
            style={{
                ...(fullScreen ? containerFullScreen : containerInline),
            }}
        >
            {/* Spinning gradient ring */}
            <div className="brand-spinner-ring-wrapper">
                <svg
                    className="brand-spinner-ring"
                    width="140"
                    height="140"
                    viewBox="0 0 140 140"
                >
                    <defs>
                        <linearGradient id="spinnerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#0A4D68" />
                            <stop offset="35%" stopColor="#1A8A9E" />
                            <stop offset="70%" stopColor="#3EC6D5" />
                            <stop offset="100%" stopColor="#7EE8F2" />
                        </linearGradient>
                    </defs>
                    {/* Background track */}
                    <circle
                        cx="70"
                        cy="70"
                        r="62"
                        fill="none"
                        stroke="var(--border, rgba(255,255,255,0.08))"
                        strokeWidth="5"
                    />
                    {/* Gradient arc (~270°) */}
                    <circle
                        cx="70"
                        cy="70"
                        r="62"
                        fill="none"
                        stroke="url(#spinnerGrad)"
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeDasharray="292 98"
                    />
                </svg>

                {/* Logo in center */}
                <div className="brand-spinner-logo">
                    <img
                        src={logoImg}
                        alt="Cliniq.One"
                        style={{ width: 72, height: 72, objectFit: 'contain' }}
                    />
                </div>
            </div>

            {/* Animated loading dots */}
            <div className="brand-spinner-dots">
                <span />
                <span />
                <span />
            </div>

            {/* Optional message */}
            {message && (
                <p
                    className="brand-spinner-message"
                    style={{
                        fontSize: 13,
                        color: 'var(--text-tertiary, #94A3B8)',
                        marginTop: 12,
                        fontWeight: 500,
                        letterSpacing: 0.3,
                    }}
                >
                    {message}
                </p>
            )}
        </div>
    );
}

const containerFullScreen: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 9998,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'var(--bg-primary, #0B1120)',
};

const containerInline: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
    width: '100%',
};
