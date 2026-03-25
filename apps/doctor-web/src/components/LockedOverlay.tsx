'use client';

import { Lock, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface LockedOverlayProps {
    reason?: string;
    ctaHref?: string;
    ctaLabel?: string;
}

/**
 * Premium lock overlay shown when a feature is gated.
 * Positioned absolutely over the parent container.
 */
export default function LockedOverlay({
    reason = 'Complete onboarding to unlock this feature',
    ctaHref = '/dashboard/profile',
    ctaLabel = 'Complete Onboarding',
}: LockedOverlayProps) {
    return (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-bg-primary/80 backdrop-blur-[2px] rounded-2xl">
            <div className="flex flex-col items-center text-center px-6 py-8 max-w-xs">
                <div className="w-14 h-14 rounded-2xl bg-warning/10 flex items-center justify-center mb-4 border border-warning/20">
                    <Lock className="w-7 h-7 text-warning" />
                </div>
                <p className="text-sm text-text-secondary mb-4 leading-relaxed">
                    {reason}
                </p>
                <Link
                    href={ctaHref}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent to-purple text-white text-sm font-semibold hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(45,212,191,0.3)] transition-all"
                >
                    {ctaLabel}
                    <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
        </div>
    );
}
