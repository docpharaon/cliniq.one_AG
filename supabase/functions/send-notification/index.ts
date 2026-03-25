// ─────────────────────────────────────────────────────
// Supabase Edge Function: send-notification
// Sends push notifications via Expo Push API
// Called internally by DB triggers or admin actions
// ─────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
};

// ── Rate limiter (in-memory, per-user, 10 req/min) ──

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function isRateLimited(userId: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(userId);

    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
        return false;
    }

    entry.count++;
    return entry.count > RATE_LIMIT;
}

// ── Send via Expo Push API ──────────────────────────

interface PushMessage {
    to: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    sound?: string;
    channelId?: string;
    priority?: 'default' | 'normal' | 'high';
}

async function sendExpoPush(messages: PushMessage[]): Promise<{ ok: boolean; errors?: string[] }> {
    const resp = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify(messages),
    });

    if (!resp.ok) {
        const text = await resp.text();
        return { ok: false, errors: [`Expo API error: ${resp.status} ${text}`] };
    }

    const result = await resp.json();
    const errors: string[] = [];

    // Check individual ticket statuses
    if (result.data) {
        for (const ticket of result.data) {
            if (ticket.status === 'error') {
                errors.push(`${ticket.details?.error || 'Unknown'}: ${ticket.message}`);
            }
        }
    }

    return { ok: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
}

// ── Main handler ────────────────────────────────────

serve(async (req: Request) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...CORS, 'Content-Type': 'application/json' },
        });
    }

    try {
        // ── Auth verification ──
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing auth' }), {
                status: 401,
                headers: { ...CORS, 'Content-Type': 'application/json' },
            });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
        if (authErr || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { ...CORS, 'Content-Type': 'application/json' },
            });
        }

        // ── Rate limiting ──
        if (isRateLimited(user.id)) {
            return new Response(JSON.stringify({ error: 'Rate limited. Try again later.' }), {
                status: 429,
                headers: { ...CORS, 'Content-Type': 'application/json' },
            });
        }

        // ── Validate role (admin or service calls only) ──
        const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return new Response(JSON.stringify({ error: 'Forbidden — admin only' }), {
                status: 403,
                headers: { ...CORS, 'Content-Type': 'application/json' },
            });
        }

        // ── Parse body ──
        const body = await req.json();
        const { userId, userIds, title, body: messageBody, data, channelId } = body as {
            userId?: string;
            userIds?: string[];
            title: string;
            body: string;
            data?: Record<string, unknown>;
            channelId?: string;
        };

        // Input validation
        if (!title || !messageBody) {
            return new Response(JSON.stringify({ error: 'Missing title or body' }), {
                status: 400,
                headers: { ...CORS, 'Content-Type': 'application/json' },
            });
        }

        if (!userId && (!userIds || userIds.length === 0)) {
            return new Response(JSON.stringify({ error: 'Missing userId or userIds' }), {
                status: 400,
                headers: { ...CORS, 'Content-Type': 'application/json' },
            });
        }

        // Limit batch size
        const targetIds = userIds || [userId!];
        if (targetIds.length > 100) {
            return new Response(JSON.stringify({ error: 'Max 100 recipients per request' }), {
                status: 400,
                headers: { ...CORS, 'Content-Type': 'application/json' },
            });
        }

        // ── Fetch push tokens ──
        const { data: users, error: fetchErr } = await supabase
            .from('users')
            .select('id, push_token, push_enabled')
            .in('id', targetIds)
            .eq('push_enabled', true)
            .not('push_token', 'is', null);

        if (fetchErr) {
            throw new Error(`DB error: ${fetchErr.message}`);
        }

        if (!users || users.length === 0) {
            return new Response(JSON.stringify({
                sent: 0,
                message: 'No users with push enabled',
            }), {
                status: 200,
                headers: { ...CORS, 'Content-Type': 'application/json' },
            });
        }

        // ── Build push messages ──
        const pushMessages: PushMessage[] = users.map((u) => ({
            to: u.push_token!,
            title,
            body: messageBody,
            data: data || {},
            sound: 'default',
            channelId: channelId || 'default',
            priority: 'high' as const,
        }));

        // ── Send ──
        const result = await sendExpoPush(pushMessages);

        return new Response(JSON.stringify({
            sent: users.length,
            ok: result.ok,
            errors: result.errors,
        }), {
            status: 200,
            headers: { ...CORS, 'Content-Type': 'application/json' },
        });

    } catch (err) {
        console.error('send-notification error:', err);
        return new Response(JSON.stringify({
            error: 'Failed to send notification',
            details: err instanceof Error ? err.message : String(err),
        }), {
            status: 500,
            headers: { ...CORS, 'Content-Type': 'application/json' },
        });
    }
});
