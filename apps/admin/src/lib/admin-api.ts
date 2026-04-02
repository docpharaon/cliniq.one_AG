import { createBrowserSupabase } from './supabase';

// Helper: getSession with timeout — prevents infinite hang when no user is logged in
async function getSessionToken(timeoutMs = 3000): Promise<string> {
    try {
        const supabase = createBrowserSupabase();
        const result = await Promise.race([
            supabase.auth.getSession(),
            new Promise<null>((_, reject) =>
                setTimeout(() => reject(new Error('getSession timeout')), timeoutMs)
            ),
        ]);
        const token = (result as any)?.data?.session?.access_token || '';
        console.log('[admin-api] session check:', { hasToken: !!token, tokenLen: token.length });
        return token;
    } catch (err) {
        console.warn('[admin-api] getSession skipped:', (err as Error).message);
        return '';
    }
}

/**
 * Call the admin-api edge function with an action and payload.
 * Uses direct fetch() with explicit auth headers (same pattern as callAdminApiStream).
 * supabase.functions.invoke() fails silently in some Vite/browser contexts.
 */
export async function callAdminApi<T = unknown>(
    action: string,
    payload: Record<string, unknown> = {},
): Promise<T> {
    const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
        (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) || '';
    const anonKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
        (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) || '';
    const serviceKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_SERVICE_ROLE_KEY) ||
        (typeof process !== 'undefined' && process.env?.SUPABASE_SERVICE_ROLE_KEY) || '';

    // Skip getSession entirely when we have a service role key — no user session needed
    let token = '';
    if (!serviceKey) {
        token = await getSessionToken();
    } else {
        console.log('[admin-api] Using service role key (skipping getSession)');
    }

    const res = await fetch(`${supabaseUrl}/functions/v1/admin-api`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token || serviceKey || anonKey}`,
            'Content-Type': 'application/json',
            'apikey': anonKey,
            ...(serviceKey ? { 'x-admin-key': serviceKey } : {}),
        },
        body: JSON.stringify({ action, ...payload }),
    });

    if (!res.ok) {
        const errText = await res.text().catch(() => '(unreadable)');
        throw new Error(`admin-api error: ${res.status} ${errText.substring(0, 200)}`);
    }

    return await res.json() as T;
}

/**
 * Call the admin-api edge function for SSE streaming.
 * Returns the raw Response for streaming consumption.
 */
export async function callAdminApiStream(
    action: string,
    payload: Record<string, unknown> = {},
): Promise<Response> {
    const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
        (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) || '';
    const anonKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
        (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) || '';
    const serviceKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_SERVICE_ROLE_KEY) ||
        (typeof process !== 'undefined' && process.env?.SUPABASE_SERVICE_ROLE_KEY) || '';

    if (!supabaseUrl) {
        throw new Error('Supabase URL not configured');
    }

    // Skip getSession when we have service role key — no user session needed
    let token = '';
    if (!serviceKey) {
        token = await getSessionToken();
    }

    // Timeout after 30 seconds to prevent infinite hang
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
        console.log(`[admin-api] → ${action}`, { hasToken: !!token, url: supabaseUrl });

        const res = await fetch(`${supabaseUrl}/functions/v1/admin-api`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token || serviceKey || anonKey}`,
                'Content-Type': 'application/json',
                'apikey': anonKey,
                ...(serviceKey ? { 'x-admin-key': serviceKey } : {}),
            },
            body: JSON.stringify({ action, ...payload }),
            signal: controller.signal,
        });

        clearTimeout(timeout);

        console.log(`[admin-api] ← ${action} status=${res.status} type=${res.headers.get('Content-Type')}`);

        if (!res.ok) {
            const errText = await res.text().catch(() => '(unreadable body)');
            throw new Error(`Edge function error: ${res.status} ${errText}`);
        }

        return res;
    } catch (err: any) {
        clearTimeout(timeout);
        if (err?.name === 'AbortError') {
            throw new Error(`Edge function timed out after 30s (action: ${action})`);
        }
        throw err;
    }
}
