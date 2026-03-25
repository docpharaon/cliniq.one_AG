'use client';

import { type ReactNode } from 'react';
import { useFeatureGate, type Feature } from '@/hooks/useFeatureGate';
import LockedOverlay from '@/components/LockedOverlay';

interface FeatureGateProps {
    /** The feature to gate */
    feature: Feature;
    /** Content to render when allowed */
    children: ReactNode;
    /** Optional custom fallback (defaults to LockedOverlay) */
    fallback?: ReactNode;
    /** If true, show blurred content behind the lock instead of nothing */
    showBlurred?: boolean;
}

/**
 * Wraps content that requires a specific doctor tier.
 * If the doctor doesn't have access, shows a lock overlay.
 */
export default function FeatureGate({ feature, children, fallback, showBlurred = true }: FeatureGateProps) {
    const { gate, loading } = useFeatureGate();

    if (loading) return null;

    const { allowed, reason } = gate(feature);

    if (allowed) return <>{children}</>;

    if (fallback) return <>{fallback}</>;

    if (showBlurred) {
        return (
            <div className="relative">
                <div className="blur-sm pointer-events-none select-none opacity-50" aria-hidden>
                    {children as any}
                </div>
                <LockedOverlay reason={reason} />
            </div>
        );
    }

    return <LockedOverlay reason={reason} />;
}
