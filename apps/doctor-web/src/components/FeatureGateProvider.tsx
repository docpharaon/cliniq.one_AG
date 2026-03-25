'use client';

import { type ReactNode } from 'react';
import {
    FeatureGateContext,
    useDoctorTier,
} from '@/hooks/useFeatureGate';

/**
 * Wraps the app to provide feature gate context.
 * Place around the dashboard layout.
 */
export function FeatureGateProvider({ children }: { children: ReactNode }) {
    const ctx = useDoctorTier();
    const Provider = FeatureGateContext.Provider as any;

    return (
        <Provider value={ctx}>
            {children}
        </Provider>
    );
}
