'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createBrowserSupabase } from '@/lib/supabase';

// ── Types ──────────────────────────────────────

export type DoctorTier = 'sandbox' | 'locum' | 'staff';

export type Feature =
    | 'claim_cases'
    | 'respond'
    | 'submit_report'
    | 'order_interventions'
    | 'view_analytics'
    | 'view_schedule'
    | 'view_history'
    | 'notifications'
    | 'manage_profile';

// ── Feature Matrix ──────────────────────────────

const FEATURE_MATRIX: Record<Feature, DoctorTier[]> = {
    claim_cases:         ['locum', 'staff'],
    respond:             ['locum', 'staff'],
    submit_report:       ['locum', 'staff'],
    order_interventions: ['locum', 'staff'],
    view_analytics:      ['sandbox', 'locum', 'staff'],  // sandbox sees demo data
    view_schedule:       ['locum', 'staff'],
    view_history:        ['locum', 'staff'],
    notifications:       ['locum', 'staff'],
    manage_profile:      ['sandbox', 'locum', 'staff'],
};

// ── Context ─────────────────────────────────────

export interface FeatureGateContextType {
    tier: DoctorTier;
    loading: boolean;
    can: (feature: Feature) => boolean;
    gate: (feature: Feature) => { allowed: boolean; reason?: string };
    isSandbox: boolean;
    isLocum: boolean;
    isStaff: boolean;
}

export const FeatureGateContext = createContext<FeatureGateContextType>({
    tier: 'staff',
    loading: true,
    can: () => true,
    gate: () => ({ allowed: true }),
    isSandbox: false,
    isLocum: false,
    isStaff: true,
});

// ── Hook ────────────────────────────────────────

export function useFeatureGate(): FeatureGateContextType {
    return useContext(FeatureGateContext);
}

// ── Tier derivation helper ──────────────────────

export function deriveTier(doctorType: string | null, sandboxMode: boolean): DoctorTier {
    if (doctorType !== 'locum') return 'staff';
    if (sandboxMode) return 'sandbox';
    return 'locum';
}

// ── Hook to load tier from DB (used by provider) ─

export function useDoctorTier() {
    const [tier, setTier] = useState<DoctorTier>('staff');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const sb = createBrowserSupabase();
                const { data: { user } } = await sb.auth.getUser();
                if (!user) { setLoading(false); return; }

                const { data: doc } = await sb
                    .from('doctors')
                    .select('doctor_type, sandbox_mode')
                    .eq('user_id', user.id)
                    .single();

                if (doc) {
                    setTier(deriveTier(doc.doctor_type, doc.sandbox_mode ?? false));
                }
            } catch { /* ignore */ }
            setLoading(false);
        })();
    }, []);

    const can = (feature: Feature): boolean => {
        return FEATURE_MATRIX[feature]?.includes(tier) ?? false;
    };

    const gate = (feature: Feature): { allowed: boolean; reason?: string } => {
        const allowed = can(feature);
        if (allowed) return { allowed };
        if (tier === 'sandbox') {
            return { allowed: false, reason: 'Complete onboarding to unlock this feature' };
        }
        return { allowed: false, reason: 'This feature is not available for your account tier' };
    };

    return {
        tier,
        loading,
        can,
        gate,
        isSandbox: tier === 'sandbox',
        isLocum: tier === 'locum',
        isStaff: tier === 'staff',
    };
}
