import type { CSSProperties } from 'react';

export interface CliniqIconProps {
  /** Icon size in pixels (default: 20) */
  size?: number;
  /** Icon color (default: 'currentColor') */
  color?: string;
  /** Stroke width (default: 2) */
  strokeWidth?: number;
  /** Additional CSS class */
  className?: string;
  /** Inline styles */
  style?: CSSProperties;
}
