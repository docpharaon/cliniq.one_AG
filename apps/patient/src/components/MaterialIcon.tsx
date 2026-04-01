import type { CSSProperties } from 'react';

interface MaterialIconProps {
    /** Material Symbol name, e.g. 'stethoscope', 'assignment', 'home' */
    name: string;
    /** Icon size in px (default: 20) */
    size?: number;
    /** Icon color (CSS value) */
    color?: string;
    /** Additional inline styles */
    style?: CSSProperties;
    /** Additional class names */
    className?: string;
}

/**
 * Material Symbols Rounded icon component.
 * Uses the variable Google font loaded in index.html.
 * 
 * @see https://fonts.google.com/icons?icon.set=Material+Symbols
 * @example <MaterialIcon name="stethoscope" size={24} color="#1A8A9E" />
 */
export function MaterialIcon({ name, size = 20, color, style, className }: MaterialIconProps) {
    return (
        <span
            className={`mi${className ? ` ${className}` : ''}`}
            style={{
                fontSize: size,
                color,
                ...style,
            }}
            aria-hidden="true"
        >
            {name}
        </span>
    );
}
