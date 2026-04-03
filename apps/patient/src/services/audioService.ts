// ─────────────────────────────────────────────────
// Audio Service — Calls audio-transcribe Edge Function
// Handles network retry logic for voice input
// ─────────────────────────────────────────────────
import { supabase } from '@cliniqone/api';

const TRANSCRIBE_TIMEOUT_MS = 15_000;  // 15 seconds per attempt
const MAX_RETRIES = 1;                 // 1 retry (2 attempts total)

export class TranscriptionError extends Error {
    constructor(message: string, public statusCode?: number) {
        super(message);
        this.name = 'TranscriptionError';
    }
}

export class VoiceDisabledError extends Error {
    constructor() {
        super('Voice input is currently disabled');
        this.name = 'VoiceDisabledError';
    }
}

export interface TranscriptionResult {
    text: string;
    language: string;
}

/**
 * Send an audio blob to the audio-transcribe edge function.
 * Includes 1 automatic retry on network/timeout failure.
 */
export async function transcribeAudio(
    audioBlob: Blob,
    language: 'en' | 'ar' = 'en',
): Promise<TranscriptionResult> {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TRANSCRIBE_TIMEOUT_MS);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            // Build multipart form data
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');
            formData.append('language', language);

            // Get the Supabase URL for edge function call
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            const response = await fetch(
                `${supabaseUrl}/functions/v1/audio-transcribe`,
                {
                    method: 'POST',
                    headers: {
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        apikey: anonKey,
                    },
                    body: formData,
                    signal: controller.signal,
                },
            );

            clearTimeout(timer);

            if (response.status === 403) {
                throw new VoiceDisabledError();
            }

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new TranscriptionError(
                    errData.error || `Transcription failed (${response.status})`,
                    response.status,
                );
            }

            const result = await response.json();
            return {
                text: result.text || '',
                language: result.language || language,
            };
        } catch (err: any) {
            clearTimeout(timer);

            // Don't retry on VoiceDisabledError
            if (err instanceof VoiceDisabledError) throw err;

            const isTimeout = err?.name === 'AbortError';
            const isNetwork = err?.message?.includes('Failed to fetch') ||
                err?.message?.includes('NetworkError');

            if ((isTimeout || isNetwork) && attempt < MAX_RETRIES) {
                console.warn(`[audioService] attempt ${attempt + 1} failed (${isTimeout ? 'timeout' : 'network'}), retrying in 2s...`);
                await new Promise(r => setTimeout(r, 2000));
                continue;
            }

            if (isTimeout) {
                throw new TranscriptionError('Connection timed out. Try again or type instead.');
            }
            if (isNetwork) {
                throw new TranscriptionError('Connection issue — try again or type instead.');
            }

            throw err;
        }
    }

    throw new TranscriptionError('Transcription failed after retries');
}

/**
 * Check if voice input is enabled by reading platform_settings.
 * Returns the full voice config for the client.
 */
export interface VoiceConfig {
    enabled: boolean;
    defaultMode: 'push_to_talk' | 'auto_mic';
    maxDuration: number;
    silenceThreshold: number;
}

export async function getVoiceConfig(): Promise<VoiceConfig> {
    try {
        const { data } = await supabase
            .from('platform_settings')
            .select('key, value')
            .in('key', [
                'voice_input_enabled',
                'voice_input_default_mode',
                'voice_input_max_duration_sec',
                'voice_input_silence_threshold_ms',
            ]);

        const map: Record<string, string> = {};
        for (const row of data || []) {
            map[row.key] = row.value;
        }

        return {
            enabled: map['voice_input_enabled'] === 'true',
            defaultMode: (map['voice_input_default_mode'] as 'push_to_talk' | 'auto_mic') || 'push_to_talk',
            maxDuration: parseInt(map['voice_input_max_duration_sec'] || '60', 10),
            silenceThreshold: parseInt(map['voice_input_silence_threshold_ms'] || '1500', 10),
        };
    } catch {
        return {
            enabled: false,
            defaultMode: 'push_to_talk',
            maxDuration: 60,
            silenceThreshold: 1500,
        };
    }
}
