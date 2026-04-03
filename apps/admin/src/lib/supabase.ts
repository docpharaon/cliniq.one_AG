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
// LAZY: only created when first accessed to avoid
// "Multiple GoTrueClient instances" warning at startup.
// Auth is disabled — the browser client handles sessions.
// ──────────────────────────────────────────

const supabaseServiceKey =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_SERVICE_ROLE_KEY) ||
    (typeof process !== 'undefined' && process.env?.SUPABASE_SERVICE_ROLE_KEY) ||
    supabaseAnonKey;

let _adminClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
    if (!_adminClient && supabaseUrl && supabaseServiceKey) {
        _adminClient = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false,
            },
        });
    }
    return _adminClient!;
}

/** @deprecated Use getSupabaseAdmin() — kept for backward compat with queries.ts */
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient>, {
    get(_target, prop) {
        return (getSupabaseAdmin() as any)[prop];
    },
});

