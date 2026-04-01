import React, { useEffect, useState } from 'react';

interface FadeInProps {
    children: React.ReactNode;
    delay?: number;
    duration?: number;
    style?: React.CSSProperties;
}

/**
 * FadeIn animation wrapper using CSS transitions.
 * Replaces React Native Animated.View with opacity + translateY.
 */
export function FadeIn({ children, delay = 0, duration = 400, style }: FadeInProps) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), delay);
        return () => clearTimeout(timer);
    }, [delay]);

    return (
        <div
            style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(12px)',
                transition: `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`,
                ...style,
            }}
        >
            {children}
        </div>
    );
}
