// ─────────────────────────────────────────────────
// Supabase Edge Function: kyc-token
// Generates a Sumsub access token for the patient
// to start identity verification via the SDK.
// ─────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encode as hexEncode } from 'https://deno.land/std@0.177.0/encoding/hex.ts';

const SUMSUB_BASE_URL = 'https://api.sumsub.com';
const SUMSUB_APP_TOKEN = Deno.env.get('SUMSUB_APP_TOKEN') || '';
const SUMSUB_SECRET_KEY = Deno.env.get('SUMSUB_SECRET_KEY') || '';
const SUMSUB_LEVEL_NAME = Deno.env.get('SUMSUB_LEVEL_NAME') || 'basic-kyc-level';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
};

// ── HMAC Signature for Sumsub API ──────────────

async function signRequest(
    method: string,
    url: string,
    body: string = '',
): Promise<{ ts: number; sig: string }> {
    const ts = Math.floor(Date.now() / 1000);
    const path = url.replace(SUMSUB_BASE_URL, '');
    const data = `${ts}${method.toUpperCase()}${path}${body}`;

    const key = new TextEncoder().encode(SUMSUB_SECRET_KEY);
    const msg = new TextEncoder().encode(data);

    const cryptoKey = await crypto.subtle.importKey(
        'raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
    );
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, msg);
    const sig = new TextDecoder().decode(hexEncode(new Uint8Array(signature)));

    return { ts, sig };
}

// ── Create or get Sumsub applicant ──────────────

async function getOrCreateApplicant(externalUserId: string): Promise<string> {
    // Try to get existing applicant
    const getUrl = `${SUMSUB_BASE_URL}/resources/applicants/-;externalUserId=${externalUserId}/one`;
    const { ts: getTs, sig: getSig } = await signRequest('GET', getUrl);

    const getResp = await fetch(getUrl, {
        method: 'GET',
        headers: {
            'X-App-Token': SUMSUB_APP_TOKEN,
            'X-App-Access-Sig': getSig,
            'X-App-Access-Ts': String(getTs),
            'Accept': 'application/json',
        },
    });

    if (getResp.ok) {
        const data = await getResp.json();
        return data.id;
    }

    // Create new applicant
    const createUrl = `${SUMSUB_BASE_URL}/resources/applicants?levelName=${SUMSUB_LEVEL_NAME}`;
    const createBody = JSON.stringify({ externalUserId });
    const { ts: createTs, sig: createSig } = await signRequest('POST', createUrl, createBody);

    const createResp = await fetch(createUrl, {
        method: 'POST',
        headers: {
            'X-App-Token': SUMSUB_APP_TOKEN,
            'X-App-Access-Sig': createSig,
            'X-App-Access-Ts': String(createTs),
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: createBody,
    });

    if (!createResp.ok) {
        const err = await createResp.text();
        throw new Error(`Sumsub create applicant failed: ${createResp.status} ${err}`);
    }

    const data = await createResp.json();
    return data.id;
}

// ── Generate SDK access token ───────────────────

async function generateAccessToken(externalUserId: string): Promise<string> {
    const url = `${SUMSUB_BASE_URL}/resources/accessTokens?userId=${externalUserId}&levelName=${SUMSUB_LEVEL_NAME}`;
    const { ts, sig } = await signRequest('POST', url);

    const resp = await fetch(url, {
        method: 'POST',
        headers: {
            'X-App-Token': SUMSUB_APP_TOKEN,
            'X-App-Access-Sig': sig,
            'X-App-Access-Ts': String(ts),
            'Accept': 'application/json',
        },
    });

    if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`Sumsub access token failed: ${resp.status} ${err}`);
    }

    const data = await resp.json();
    return data.token;
}

// ── Main handler ────────────────────────────────

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
        // Verify the user is authenticated
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing auth' }), {
                status: 401,
                headers: { ...CORS, 'Content-Type': 'application/json' },
            });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Get user from JWT
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
        if (authErr || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { ...CORS, 'Content-Type': 'application/json' },
            });
        }

        const userId = user.id;

        // Check if already verified
        const { data: profile } = await supabase
            .from('users')
            .select('kyc_status, kyc_applicant_id')
            .eq('id', userId)
            .single();

        if (profile?.kyc_status === 'approved') {
            return new Response(JSON.stringify({
                status: 'already_verified',
                message: 'Identity already verified',
            }), {
                status: 200,
                headers: { ...CORS, 'Content-Type': 'application/json' },
            });
        }

        // Create/get applicant in Sumsub
        const applicantId = await getOrCreateApplicant(userId);

        // Store applicant ID if not already stored
        if (!profile?.kyc_applicant_id) {
            await supabase
                .from('users')
                .update({ kyc_applicant_id: applicantId, kyc_status: 'pending' })
                .eq('id', userId);
        }

        // Generate SDK access token
        const sdkToken = await generateAccessToken(userId);

        return new Response(JSON.stringify({
            token: sdkToken,
            applicantId,
        }), {
            status: 200,
            headers: { ...CORS, 'Content-Type': 'application/json' },
        });

    } catch (err) {
        console.error('KYC token error:', err);
        return new Response(JSON.stringify({
            error: 'Failed to generate verification token',
            details: err instanceof Error ? err.message : String(err),
        }), {
            status: 500,
            headers: { ...CORS, 'Content-Type': 'application/json' },
        });
    }
});
