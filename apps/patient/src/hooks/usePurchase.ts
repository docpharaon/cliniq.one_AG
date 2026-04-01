import { useState, useCallback } from 'react';
import { supabase } from '@cliniqone/api';
import { TOKEN_PACKAGES } from '@cliniqone/types';
import type { TokenPackage } from '@cliniqone/types';
import { useAuthStore } from '../stores/authStore';

// ─────────────────────────────────────────
// IAP Integration Layer
// ─────────────────────────────────────────
// Stub mode: simulates purchase for dev/web
// Real mode: gate behind platform-specific IAP
// ─────────────────────────────────────────

type PurchaseStatus = 'idle' | 'purchasing' | 'restoring' | 'error';

interface PurchaseResult {
    success: boolean;
    tokens?: number;
    error?: string;
}

const IS_SANDBOX = import.meta.env.DEV;

/**
 * In-app purchase hook.
 * Returns purchase functions and state.
 * In sandbox mode, simulates purchases with a delay.
 */
export function usePurchase(userId?: string) {
    const [status, setStatus] = useState<PurchaseStatus>('idle');

    const purchasePackage = useCallback(async (packageId: string): Promise<PurchaseResult> => {
        const pkg = TOKEN_PACKAGES.find(p => p.id === packageId);
        if (!pkg) return { success: false, error: 'Invalid package' };

        setStatus('purchasing');

        try {
            if (IS_SANDBOX) {
                // ── Sandbox: simulate purchase ──
                await new Promise(r => setTimeout(r, 1500));
            } else {
                // Production: Real IAP integration required
                console.warn('[usePurchase] Production IAP not yet integrated. Purchase blocked.');
                throw new Error('In-app purchases are not yet available. Please try again later.');
            }

            // Credit tokens to user account
            if (userId) {
                const { error: tokenErr } = await supabase.rpc('add_user_tokens', {
                    p_user_id: userId,
                    p_amount: pkg.tokens,
                    p_description: `Purchased ${pkg.name} package`,
                    p_type: 'purchase',
                });

                if (tokenErr) {
                    console.error('Token credit failed:', tokenErr);
                }
            }

            // Refresh user balance in auth store
            await useAuthStore.getState().refreshUser();

            setStatus('idle');
            return { success: true, tokens: pkg.tokens };
        } catch (err: any) {
            setStatus('error');
            const message = err?.message || 'Purchase failed. Please try again.';
            return { success: false, error: message };
        }
    }, [userId]);

    const restorePurchases = useCallback(async (): Promise<PurchaseResult> => {
        setStatus('restoring');

        try {
            if (IS_SANDBOX) {
                await new Promise(r => setTimeout(r, 1000));
                setStatus('idle');
                return { success: true, tokens: 0 };
            }

            setStatus('idle');
            return { success: true, tokens: 0 };
        } catch (err: any) {
            setStatus('error');
            return { success: false, error: err?.message || 'Restore failed' };
        }
    }, []);

    return {
        status,
        isSandbox: IS_SANDBOX,
        purchasing: status === 'purchasing',
        restoring: status === 'restoring',
        purchasePackage,
        restorePurchases,
    };
}
