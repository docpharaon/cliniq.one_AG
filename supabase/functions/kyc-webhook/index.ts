// ─────────────────────────────────────────────────
// Supabase Edge Function: kyc-webhook
// Receives webhooks from Sumsub when a verification
// status changes. Updates the user's kyc_status.
// ─────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encode as hexEncode } from 'https://deno.land/std@0.177.0/encoding/hex.ts';

const SUMSUB_SECRET_KEY = Deno.env.get('SUMSUB_SECRET_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-payload-digest, x-payload-digest-alg',
};

// ── HMAC Webhook Verification ───────────────────

async function verifyWebhookSignature(
    payload: Uint8Array,
    digest: string,
    algorithm: string,
): Promise<boolean> {
    const hashAlg = algorithm === 'HMAC_SHA512_HEX' ? 'SHA-512' : 'SHA-256';

    const key = new TextEncoder().encode(SUMSUB_SECRET_KEY);
    const cryptoKey = await crypto.subtle.importKey(
        'raw', key, { name: 'HMAC', hash: hashAlg }, false, ['sign'],
    );
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, payload);
    const computed = new TextDecoder().decode(hexEncode(new Uint8Array(signature)));

    return computed === digest;
}

// ── Map Sumsub review result to KYC status ──────

interface SumsubWebhookPayload {
    type: string;
    applicantId: string;
    externalUserId: string;
    reviewStatus?: string;
    reviewResult?: {
        reviewAnswer: 'GREEN' | 'RED';
        rejectLabels?: string[];
        moderationComment?: string;
    };
    createdAtMs?: number;
}

function mapToKycStatus(payload: SumsubWebhookPayload): {
    kyc_status: string;
    kyc_rejection_reason: string | null;
    kyc_verified_at: string | null;
} {
    const answer = payload.reviewResult?.reviewAnswer;

    if (answer === 'GREEN') {
        return {
            kyc_status: 'approved',
            kyc_rejection_reason: null,
            kyc_verified_at: new Date().toISOString(),
        };
    }

    if (answer === 'RED') {
        const labels = payload.reviewResult?.rejectLabels || [];
        const comment = payload.reviewResult?.moderationComment || '';
        const reason = [
            ...labels,
            ...(comment ? [comment] : []),
        ].join('; ') || 'Verification failed';

        // Check if resubmission is possible (Sumsub sends different event types)
        if (payload.type === 'applicantPending') {
            return {
                kyc_status: 'pending',
                kyc_rejection_reason: null,
                kyc_verified_at: null,
            };
        }

        return {
            kyc_status: 'rejected',
            kyc_rejection_reason: reason,
            kyc_verified_at: null,
        };
    }

    // Default: pending
    return {
        kyc_status: 'pending',
        kyc_rejection_reason: null,
        kyc_verified_at: null,
    };
}

// ── Main handler ────────────────────────────────

serve(async (req: Request) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS });
    }

    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405, headers: CORS });
    }

    try {
        // Read raw body for signature verification
        const rawBody = new Uint8Array(await req.arrayBuffer());
        const bodyText = new TextDecoder().decode(rawBody);

        // Verify webhook signature
        const digest = req.headers.get('x-payload-digest') || '';
        const algorithm = req.headers.get('x-payload-digest-alg') || 'HMAC_SHA256_HEX';

        if (!digest) {
            console.warn('KYC webhook: missing digest header');
            return new Response('Missing signature', { status: 400, headers: CORS });
        }

        const valid = await verifyWebhookSignature(rawBody, digest, algorithm);
        if (!valid) {
            console.warn('KYC webhook: invalid signature');
            return new Response('Invalid signature', { status: 401, headers: CORS });
        }

        // Parse the payload
        const payload: SumsubWebhookPayload = JSON.parse(bodyText);
        console.log(`KYC webhook: type=${payload.type} user=${payload.externalUserId} applicant=${payload.applicantId}`);

        // Only process relevant event types
        const relevantTypes = [
            'applicantReviewed',
            'applicantPending',
            'applicantCreated',
            'applicantOnHold',
        ];
        if (!relevantTypes.includes(payload.type)) {
            console.log(`KYC webhook: ignoring event type ${payload.type}`);
            return new Response('OK', { status: 200, headers: CORS });
        }

        // Map to our KYC status
        const updates = mapToKycStatus(payload);

        // Update user in database
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { error } = await supabase
            .from('users')
            .update({
                ...updates,
                kyc_applicant_id: payload.applicantId,
            })
            .eq('id', payload.externalUserId);

        if (error) {
            console.error(`KYC webhook: DB update failed for ${payload.externalUserId}:`, error);
            return new Response('DB error', { status: 500, headers: CORS });
        }

        console.log(`KYC webhook: updated ${payload.externalUserId} → ${updates.kyc_status}`);
        return new Response('OK', { status: 200, headers: CORS });

    } catch (err) {
        console.error('KYC webhook error:', err);
        return new Response('Internal error', { status: 500, headers: CORS });
    }
});
