// ─────────────────────────────────────────────────
// Supabase Edge Function: audio-transcribe
// Receives audio blob from patient app, transcribes via OpenAI
// Respects admin voice_input_enabled toggle & tracks usage
// ─────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── CORS ────────────────────────────────────────
const ALLOWED_ORIGINS = [
    'http://localhost:3001',
    'http://localhost:3003',
    'http://localhost:5173',
    'http://localhost:8081',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3003',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8081',
    'capacitor://localhost',
    'http://localhost',
];

function getCorsHeaders(req: Request) {
    const origin = req.headers.get('origin') || '';
    const isAllowed = !origin || ALLOWED_ORIGINS.includes(origin);
    return {
        'Access-Control-Allow-Origin': isAllowed ? (origin || '*') : ALLOWED_ORIGINS[0],
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Vary': 'Origin',
    };
}

// ── Singleton Supabase admin client ─────────────
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ── Auth: verify patient JWT ────────────────────
async function verifyAuth(req: Request): Promise<{ userId: string } | null> {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return null;

    const token = authHeader.replace('Bearer ', '');
    // Allow service-role key (for admin sandbox testing)
    if (token === supabaseServiceKey) {
        return { userId: 'admin' };
    }

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) return null;
        return { userId: user.id };
    } catch {
        return null;
    }
}

// ── Read voice config from platform_settings ────
interface VoiceConfig {
    enabled: boolean;
    model: string;
    apiKey: string;
}

async function getVoiceConfig(): Promise<VoiceConfig> {
    try {
        const { data: rows } = await supabase
            .from('platform_settings')
            .select('key, value')
            .in('key', ['voice_input_enabled', 'voice_transcription_model', 'openai_api_key']);

        const settings: Record<string, string> = {};
        for (const row of rows || []) {
            settings[row.key] = row.value;
        }

        return {
            enabled: settings['voice_input_enabled'] === 'true',
            model: settings['voice_transcription_model'] || 'gpt-4o-mini-transcribe',
            apiKey: settings['openai_api_key'] || Deno.env.get('OPENAI_API_KEY') || '',
        };
    } catch {
        return {
            enabled: false,
            model: 'gpt-4o-mini-transcribe',
            apiKey: Deno.env.get('OPENAI_API_KEY') || '',
        };
    }
}

// ── Update usage counters ───────────────────────
async function trackUsage(estimatedMinutes: number): Promise<void> {
    try {
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // Check if we need to reset (new month)
        const { data: lastReset } = await supabase
            .from('platform_settings')
            .select('value')
            .eq('key', 'voice_usage_last_reset')
            .single();

        if (lastReset?.value !== monthKey) {
            // New month — reset counters
            await Promise.all([
                supabase.from('platform_settings').upsert(
                    { key: 'voice_usage_minutes_month', value: '0', category: 'ai', description: 'Voice transcription minutes this month' },
                    { onConflict: 'key' }
                ),
                supabase.from('platform_settings').upsert(
                    { key: 'voice_usage_count_month', value: '0', category: 'ai', description: 'Voice transcription requests this month' },
                    { onConflict: 'key' }
                ),
                supabase.from('platform_settings').upsert(
                    { key: 'voice_usage_last_reset', value: monthKey, category: 'ai', description: 'Last month usage counters were reset' },
                    { onConflict: 'key' }
                ),
            ]);
        }

        // Increment counters
        const [minutesRes, countRes] = await Promise.all([
            supabase.from('platform_settings').select('value').eq('key', 'voice_usage_minutes_month').single(),
            supabase.from('platform_settings').select('value').eq('key', 'voice_usage_count_month').single(),
        ]);

        const currentMinutes = parseFloat(minutesRes.data?.value || '0');
        const currentCount = parseInt(countRes.data?.value || '0', 10);

        await Promise.all([
            supabase.from('platform_settings').upsert(
                { key: 'voice_usage_minutes_month', value: (currentMinutes + estimatedMinutes).toFixed(2), category: 'ai', description: 'Voice transcription minutes this month' },
                { onConflict: 'key' }
            ),
            supabase.from('platform_settings').upsert(
                { key: 'voice_usage_count_month', value: String(currentCount + 1), category: 'ai', description: 'Voice transcription requests this month' },
                { onConflict: 'key' }
            ),
        ]);
    } catch (err) {
        console.warn('[audio-transcribe] usage tracking failed:', err);
    }
}

// ── Main Handler ────────────────────────────────
serve(async (req: Request) => {
    const corsHeaders = getCorsHeaders(req);

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // ── Auth Check ──────────────────────────
        const auth = await verifyAuth(req);
        if (!auth) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        // ── Voice Config Check ──────────────────
        const config = await getVoiceConfig();
        if (!config.enabled) {
            return new Response(
                JSON.stringify({ error: 'Voice input is currently disabled' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        if (!config.apiKey) {
            return new Response(
                JSON.stringify({ error: 'OpenAI API key not configured' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        // ── Parse multipart form data ───────────
        const formData = await req.formData();
        const audioFile = formData.get('audio') as File | null;
        const language = (formData.get('language') as string) || 'en';

        if (!audioFile) {
            return new Response(
                JSON.stringify({ error: 'No audio file provided' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        // Estimate duration from file size (webm/opus ~1KB/sec)
        const estimatedMinutes = Math.max(0.1, audioFile.size / 1024 / 60);

        console.log(`[audio-transcribe] user=${auth.userId} size=${audioFile.size} lang=${language} model=${config.model}`);

        // ── Call OpenAI Transcription API ────────
        const transcribeForm = new FormData();
        transcribeForm.append('file', audioFile, 'recording.webm');
        transcribeForm.append('model', config.model);
        transcribeForm.append('language', language === 'ar' ? 'ar' : 'en');
        transcribeForm.append('response_format', 'json');

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
            },
            body: transcribeForm,
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`[audio-transcribe] OpenAI error: ${response.status} ${errText}`);
            return new Response(
                JSON.stringify({ error: 'Transcription failed', detail: response.status }),
                { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        const result = await response.json();
        const text = (result.text || '').trim();

        console.log(`[audio-transcribe] transcribed: "${text.slice(0, 80)}..." (${text.length} chars)`);

        // ── Track usage (async, don't block response) ──
        trackUsage(estimatedMinutes).catch(() => {});

        return new Response(
            JSON.stringify({ text, language }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );

    } catch (err) {
        console.error('[audio-transcribe] error:', err);
        return new Response(
            JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
    }
});
