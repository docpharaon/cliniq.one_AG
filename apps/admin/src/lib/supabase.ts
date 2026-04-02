import { createClient } from '@supabase/supabase-js';

// ──────────────────────────────────────────
// Environment (client-safe — no server-only imports)
// Supports both Vite (import.meta.env) and Node (process.env)
// ──────────────────────────────────────────

const supabaseUrl =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
    '';
const supabaseAnonKey =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    '';

// ──────────────────────────────────────────
// Browser client — singleton for SPA (localStorage-based)
// Uses standard createClient which stores auth tokens and
// PKCE code verifiers in localStorage, reliable across redirects.
// ──────────────────────────────────────────

let _browserClient: ReturnType<typeof createClient> | null = null;

export function createBrowserSupabase() {
    if (!_browserClient) {
        _browserClient = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                detectSessionInUrl: true,
            },
        });
    }
    return _browserClient;
}

/** Legacy browser client — alias to singleton */
export const supabase = supabaseUrl && supabaseAnonKey
    ? createBrowserSupabase()
    : (null as unknown as ReturnType<typeof createClient>);

// ──────────────────────────────────────────
// Admin client — bypasses RLS (uses service role key)
// Auth management is disabled to avoid multiple GoTrueClient conflicts
// in the browser (the auth singleton handles sessions).
// ──────────────────────────────────────────

const supabaseServiceKey =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_SERVICE_ROLE_KEY) ||
    (typeof process !== 'undefined' && process.env?.SUPABASE_SERVICE_ROLE_KEY) ||
    supabaseAnonKey;
export const supabaseAdmin = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
        },
    })
    : (null as unknown as ReturnType<typeof createClient>);

