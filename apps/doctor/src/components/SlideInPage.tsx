import { type ReactNode, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, useTheme } from '@cliniqone/ui';
import { haptic } from '../hooks/useHaptics';

interface SlideInPageProps {
    children: ReactNode;
    title?: string;
    /** Whether to show the back button (default true) */
    showBack?: boolean;
}

/**
 * Native-feel slide-in page wrapper.
 * Animates in from the right with a back button header.
 * Use for all sub-pages (consultation detail, respond, intervention order).
 */
export function SlideInPage({ children, title, showBack = true }: SlideInPageProps) {
    const navigate = useNavigate();
    const { colors } = useTheme();

    function handleBack() {
        haptic.light();
        navigate(-1);
    }

    return (
        <div className="slide-in-page" style={{ ...styles.container, backgroundColor: colors.bgPrimary }}>
            {(showBack || title) && (
                <div style={styles.header}>
                    {showBack && (
                        <button onClick={handleBack} className="pressable" style={{ ...styles.backBtn, backgroundColor: colors.bgCard }}>
                            <ArrowLeft size={22} color={colors.accentTeal} />
                        </button>
                    )}
                    {title && <h1 style={{ ...styles.title, color: colors.textPrimary }}>{title}</h1>}
                    {/* Spacer to center title */}
                    {showBack && <div style={{ width: 40 }} />}
                </div>
            )}
            <div style={styles.content}>
                {children}
            </div>
        </div>
    );
}

const styles: Record<string, CSSProperties> = {
    container: {
        minHeight: '100vh',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 16px 0',
        maxWidth: 500,
        margin: '0 auto',
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 12,
        border: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
    },
    title: {
        fontSize: 18, fontWeight: 700,
        margin: 0, textAlign: 'center', flex: 1,
    },
    content: {
        maxWidth: 500,
        margin: '0 auto',
        padding: '16px 20px 48px',
    },
};
