import type { CSSProperties, ReactNode } from 'react';

interface FadeInProps {
    children: ReactNode;
    delay?: number;
    duration?: number;
    style?: CSSProperties;
    className?: string;
}

export function FadeIn({ children, delay = 0, duration = 400, style, className }: FadeInProps) {
    return (
        <div
            className={`fade-in ${className ?? ''}`}
            style={{
                animationDelay: `${delay}ms`,
                animationDuration: `${duration}ms`,
                ...style,
            }}
        >
            {children}
        </div>
    );
}
