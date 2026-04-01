import { createBrowserSupabase } from './supabase';

/**
 * Call the admin-api edge function with an action and payload.
 * This replaces the old `/api/<route>` Next.js API routes.
 */
export async function callAdminApi<T = unknown>(
    action: string,
    payload: Record<string, unknown> = {},
): Promise<T> {
    const supabase = createBrowserSupabase();
    const { data, error } = await supabase.functions.invoke('admin-api', {
        body: { action, ...payload },
    });
    if (error) throw error;
    return data as T;
}

/**
 * Call the admin-api edge function for SSE streaming.
 * Returns the raw Response for streaming consumption.
 */
export async function callAdminApiStream(
    action: string,
    payload: Record<string, unknown> = {},
): Promise<Response> {
    const supabase = createBrowserSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || '';

    const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
        (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) || '';

    const res = await fetch(`${supabaseUrl}/functions/v1/admin-api`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'apikey': (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
                (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) || '',
        },
        body: JSON.stringify({ action, ...payload }),
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Edge function error: ${res.status} ${errText}`);
    }

    return res;
}
