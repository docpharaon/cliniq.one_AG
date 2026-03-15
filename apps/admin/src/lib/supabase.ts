import { createClient } from '@supabase/supabase-js';
import { createBrowserClient as createSSRBrowserClient } from '@supabase/ssr';

// ──────────────────────────────────────────
// Environment (client-safe — no server-only imports)
// ──────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// ──────────────────────────────────────────
// Browser client — for client components (auth flow)
// ──────────────────────────────────────────

export function createBrowserSupabase() {
    return createSSRBrowserClient(supabaseUrl, supabaseAnonKey);
}

/** Legacy browser client (kept for backward compat) */
export const supabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : (null as unknown as ReturnType<typeof createClient>);

// ──────────────────────────────────────────
// Admin client — bypasses RLS (server-side only)
// On client side falls back to anon key so the import doesn't crash.
// ──────────────────────────────────────────

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;
export const supabaseAdmin = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : (null as unknown as ReturnType<typeof createClient>);
