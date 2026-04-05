// ─────────────────────────────────────────────────
// useVoiceInput — Admin voice input hook
// Same logic as patient app, using shared @cliniqone/api voice service
// ─────────────────────────────────────────────────
import { useState, useRef, useCallback, useEffect } from 'react';
import { transcribeAudio, TranscriptionError, VoiceDisabledError } from '@cliniqone/api';
import type { VoiceConfig } from '@cliniqone/api';

// ── State Machine ───────────────────────────────
export type VoiceState = 'idle' | 'listening' | 'processing' | 'error';

export interface UseVoiceInputOptions {
    onTranscriptReady: (text: string) => void;
    language: 'en' | 'ar';
    voiceConfig: VoiceConfig;
    enabled: boolean;
    /** Auth override for admin (service key auth) */
    authOverride?: { supabaseUrl: string; authToken: string; anonKey: string };
}

export interface UseVoiceInputReturn {
    voiceState: VoiceState;
    error: string | null;
    audioLevel: number;
    recordingDuration: number;
    isSupported: boolean;
    startListening: () => Promise<void>;
    stopListening: () => void;
    cancelRecording: () => void;
}

// ── Constants ───────────────────────────────────
const MIN_SPEECH_DURATION_MS = 500;
const AUDIO_LEVEL_CHECK_INTERVAL = 50;

export function useVoiceInput({
    onTranscriptReady,
    language,
    voiceConfig,
    enabled,
    authOverride,
}: UseVoiceInputOptions): UseVoiceInputReturn {
    const [voiceState, setVoiceState] = useState<VoiceState>('idle');
    const [audioLevel, setAudioLevel] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [recordingDuration, setRecordingDuration] = useState(0);

    // Refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const levelCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const startTimeRef = useRef<number>(0);
    const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const maxDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hasSpokenRef = useRef(false);

    const isSupported = typeof navigator !== 'undefined' &&
        !!navigator.mediaDevices?.getUserMedia &&
        typeof MediaRecorder !== 'undefined';

    // ── Cleanup ─────────────────────────────────
    const cleanup = useCallback(() => {
        if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
        if (levelCheckRef.current) { clearInterval(levelCheckRef.current); levelCheckRef.current = null; }
        if (durationTimerRef.current) { clearInterval(durationTimerRef.current); durationTimerRef.current = null; }
        if (maxDurationTimerRef.current) { clearTimeout(maxDurationTimerRef.current); maxDurationTimerRef.current = null; }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            try { audioContextRef.current.close(); } catch { /* ignore */ }
            audioContextRef.current = null;
        }
        analyserRef.current = null;
        mediaRecorderRef.current = null;
        chunksRef.current = [];
        hasSpokenRef.current = false;
        setAudioLevel(0);
        setRecordingDuration(0);
    }, []);

    useEffect(() => () => cleanup(), [cleanup]);

    // ── Audio Level (VAD) ───────────────────────
    const checkAudioLevel = useCallback(() => {
        const analyser = analyserRef.current;
        if (!analyser) return 0;
        const data = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(data);
        return Math.sqrt(data.reduce((sum, v) => sum + v * v, 0) / data.length);
    }, []);

    // ── Process Audio ───────────────────────────
    const processAudio = useCallback(async (blob: Blob) => {
        const duration = Date.now() - startTimeRef.current;
        if (duration < MIN_SPEECH_DURATION_MS || blob.size < 500) {
            setVoiceState('idle');
            cleanup();
            return;
        }

        setVoiceState('processing');

        try {
            const result = await transcribeAudio(blob, language, authOverride);

            if (!result.text || result.text.trim().length === 0) {
                setError(language === 'ar'
                    ? 'لم أتمكن من فهم ذلك. حاول مرة أخرى أو اكتب بدلاً من ذلك.'
                    : "Couldn't understand that. Try again or type instead.");
                setVoiceState('error');
                return;
            }

            setVoiceState('idle');
            onTranscriptReady(result.text);
        } catch (err) {
            if (err instanceof VoiceDisabledError) {
                setError(language === 'ar' ? 'الإدخال الصوتي معطل حالياً' : 'Voice input is currently disabled');
            } else if (err instanceof TranscriptionError) {
                setError(err.message);
            } else {
                setError(language === 'ar'
                    ? 'حدث خطأ. حاول مرة أخرى أو اكتب بدلاً من ذلك.'
                    : 'Something went wrong. Try again or type instead.');
            }
            setVoiceState('error');
        }
    }, [language, onTranscriptReady, cleanup, authOverride]);

    // ── Start Listening ─────────────────────────
    const startListening = useCallback(async () => {
        if (!isSupported || !enabled) return;

        setError(null);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            });
            streamRef.current = stream;

            // Audio analysis
            const audioContext = new AudioContext();
            audioContextRef.current = audioContext;
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;
            analyser.smoothingTimeConstant = 0.8;
            source.connect(analyser);
            analyserRef.current = analyser;

            // MediaRecorder
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : MediaRecorder.isTypeSupported('audio/webm')
                    ? 'audio/webm'
                    : 'audio/mp4';

            const recorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = recorder;
            chunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };
            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mimeType });
                processAudio(blob);
            };

            recorder.start(250);
            startTimeRef.current = Date.now();
            setVoiceState('listening');
            hasSpokenRef.current = false;

            // Audio level monitoring + VAD
            const silenceThreshold = 0.015;
            let silenceStart: number | null = null;

            levelCheckRef.current = setInterval(() => {
                const level = checkAudioLevel();
                setAudioLevel(Math.min(1, level * 10));

                if (level > silenceThreshold) {
                    hasSpokenRef.current = true;
                    silenceStart = null;
                    if (silenceTimerRef.current) {
                        clearTimeout(silenceTimerRef.current);
                        silenceTimerRef.current = null;
                    }
                } else if (hasSpokenRef.current && !silenceStart) {
                    silenceStart = Date.now();
                    silenceTimerRef.current = setTimeout(() => {
                        if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
                        if (levelCheckRef.current) { clearInterval(levelCheckRef.current); levelCheckRef.current = null; }
                        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
                    }, voiceConfig.silenceThreshold);
                }
            }, AUDIO_LEVEL_CHECK_INTERVAL);

            // Duration tracking
            durationTimerRef.current = setInterval(() => {
                setRecordingDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
            }, 1000);

            // Max duration cap
            maxDurationTimerRef.current = setTimeout(() => {
                if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
                if (levelCheckRef.current) clearInterval(levelCheckRef.current);
                if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
            }, voiceConfig.maxDuration * 1000);

        } catch (err: any) {
            cleanup();
            if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
                setError('Microphone access required. Please allow in browser settings.');
            } else {
                setError('Unable to access microphone. Please try again.');
            }
            setVoiceState('error');
        }
    }, [isSupported, enabled, voiceConfig, language, processAudio, checkAudioLevel, cleanup]);

    // ── Stop Listening ──────────────────────────
    const stopListening = useCallback(() => {
        if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
        if (levelCheckRef.current) { clearInterval(levelCheckRef.current); levelCheckRef.current = null; }
        if (durationTimerRef.current) { clearInterval(durationTimerRef.current); durationTimerRef.current = null; }
        if (maxDurationTimerRef.current) { clearTimeout(maxDurationTimerRef.current); maxDurationTimerRef.current = null; }
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    }, []);

    // ── Cancel Recording ────────────────────────
    const cancelRecording = useCallback(() => {
        cleanup();
        setVoiceState('idle');
        setError(null);
    }, [cleanup]);

    return {
        voiceState,
        error,
        audioLevel,
        recordingDuration,
        isSupported,
        startListening,
        stopListening,
        cancelRecording,
    };
}
