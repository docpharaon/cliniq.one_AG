import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ENV } from '@cliniqone/config';

/**
 * Platform-aware Supabase client factory.
 *
 * - React Native: uses AsyncStorage for session persistence
 * - Web (Next.js): uses default localStorage
 * - Server: no persistence
 */

let _supabase: SupabaseClient | null = null;

function createSupabaseClient(): SupabaseClient {
    // Detect if running in React Native (AsyncStorage available)
    try {
        // Dynamic import attempt — only succeeds in RN environment
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        return createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
            auth: {
                storage: AsyncStorage,
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: false,
            },
        });
    } catch {
        // Not React Native — use default (web localStorage or no persistence)
        return createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true,
            },
        });
    }
}

/** Shared Supabase client (singleton) */
export function getSupabase(): SupabaseClient {
    if (!_supabase) {
        _supabase = createSupabaseClient();
    }
    return _supabase;
}

/** Direct export for backward-compatibility */
export const supabase = new Proxy({} as SupabaseClient, {
    get(_target, prop) {
        return (getSupabase() as any)[prop];
    },
});
