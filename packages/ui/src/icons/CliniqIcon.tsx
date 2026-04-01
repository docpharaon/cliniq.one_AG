import type { CliniqIconProps } from './types';

interface CliniqIconWrapperProps extends CliniqIconProps {
  children: React.ReactNode;
  viewBox?: string;
}

export function CliniqIcon({
  size = 20,
  color = 'currentColor',
  strokeWidth = 2,
  children,
  viewBox = '0 0 24 24',
  className,
  style,
}: CliniqIconWrapperProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ flexShrink: 0, ...style }}
      role="img"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
