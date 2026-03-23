import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { supabase } from '@cliniqone/api';
import { TOKEN_PACKAGES } from '@cliniqone/types';
import type { TokenPackage } from '@cliniqone/types';
import { useAuthStore } from '../stores/authStore';

// ─────────────────────────────────────────
// IAP Integration Layer
// ─────────────────────────────────────────
// Stub mode: simulates purchase for dev/web
// Real mode: gate behind expo-in-app-purchases
//   when you install it, uncomment the real impl.
// ─────────────────────────────────────────

type PurchaseStatus = 'idle' | 'purchasing' | 'restoring' | 'error';

interface PurchaseResult {
    success: boolean;
    tokens?: number;
    error?: string;
}

const IS_SANDBOX = __DEV__ || Platform.OS === 'web';

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
                // When ready, install expo-in-app-purchases and:
                // import * as IAP from 'expo-in-app-purchases';
                // await IAP.connectAsync();
                // const { results } = await IAP.getProductsAsync([pkg.id]);
                // if (results.length === 0) throw new Error('Product not found');
                // await IAP.purchaseItemAsync(pkg.id);
                console.warn('[usePurchase] Production IAP not yet integrated. Purchase blocked.');
                throw new Error('In-app purchases are not yet available. Please try again later.');
            }

            // Credit tokens to user account
            if (userId) {
                // 1. Add tokens
                const { error: tokenErr } = await supabase.rpc('add_user_tokens', {
                    p_user_id: userId,
                    p_amount: pkg.tokens,
                    p_description: `Purchased ${pkg.name} package`,
                    p_type: 'purchase',
                });

                if (tokenErr) {
                    console.error('Token credit failed:', tokenErr);
                    // In production, queue for retry — payment was processed
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

            // Production: IAP.getPurchaseHistoryAsync()
            // Verify receipts server-side and re-credit

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
