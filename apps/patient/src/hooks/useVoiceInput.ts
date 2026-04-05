// ─────────────────────────────────────────────────
// useVoiceInput — Core voice input hook
// Manages microphone, recording, VAD, and state machine
// ─────────────────────────────────────────────────
import { useState, useRef, useCallback, useEffect } from 'react';
import { transcribeAudio, TranscriptionError, VoiceDisabledError } from '../services/audioService';
import type { VoiceConfig } from '../services/audioService';

// ── State Machine ───────────────────────────────
export type VoiceState = 'idle' | 'listening' | 'processing' | 'error';
export type VoiceMode = 'push_to_talk' | 'auto_mic';

export interface UseVoiceInputOptions {
    onTranscriptReady: (text: string) => void;
    language: 'en' | 'ar';
    voiceConfig: VoiceConfig;
    enabled: boolean;
}

export interface UseVoiceInputReturn {
    // State
    voiceState: VoiceState;
    transcript: string;
    audioLevel: number;
    error: string | null;
    voiceMode: VoiceMode;
    isSupported: boolean;
    recordingDuration: number;

    // Actions
    startListening: () => Promise<void>;
    stopListening: () => void;
    cancelRecording: () => void;
    setVoiceMode: (mode: VoiceMode) => void;
    lockContinuous: () => void;

    // Ref for waveform
    analyserNode: AnalyserNode | null;
}

// ── VAD Constants ───────────────────────────────
const MIN_SPEECH_DURATION_MS = 500;   // Minimum 0.5s of speech before processing
const AUDIO_LEVEL_CHECK_INTERVAL = 50; // Check audio level every 50ms

export function useVoiceInput({
    onTranscriptReady,
    language,
    voiceConfig,
    enabled,
}: UseVoiceInputOptions): UseVoiceInputReturn {
    const [voiceState, setVoiceState] = useState<VoiceState>('idle');
    const [transcript, setTranscript] = useState('');
    const [audioLevel, setAudioLevel] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [voiceMode, setVoiceMode] = useState<VoiceMode>(voiceConfig.defaultMode);
    const [recordingDuration, setRecordingDuration] = useState(0);

    // Refs for cleanup
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

    // ── Cleanup helper ──────────────────────────
    const cleanup = useCallback(() => {
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }
        if (levelCheckRef.current) {
            clearInterval(levelCheckRef.current);
            levelCheckRef.current = null;
        }
        if (durationTimerRef.current) {
            clearInterval(durationTimerRef.current);
            durationTimerRef.current = null;
        }
        if (maxDurationTimerRef.current) {
            clearTimeout(maxDurationTimerRef.current);
            maxDurationTimerRef.current = null;
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            try { mediaRecorderRef.current.stop(); } catch {}
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            try { audioContextRef.current.close(); } catch {}
            audioContextRef.current = null;
        }
        analyserRef.current = null;
        mediaRecorderRef.current = null;
        chunksRef.current = [];
        hasSpokenRef.current = false;
        setAudioLevel(0);
        setRecordingDuration(0);
    }, []);

    // ── Cleanup on unmount ──────────────────────
    useEffect(() => {
        return () => cleanup();
    }, [cleanup]);

    // ── Check audio level (VAD) ─────────────────
    const checkAudioLevel = useCallback(() => {
        const analyser = analyserRef.current;
        if (!analyser) return 0;

        const data = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(data);
        const rms = Math.sqrt(data.reduce((sum, v) => sum + v * v, 0) / data.length);
        return rms;
    }, []);

    // ── Process recorded audio ──────────────────
    const processAudio = useCallback(async (blob: Blob) => {
        // Check minimum speech duration
        const duration = Date.now() - startTimeRef.current;
        if (duration < MIN_SPEECH_DURATION_MS) {
            setError(null);
            setVoiceState('idle');
            cleanup();
            return;
        }

        // Check minimum blob size (very small = probably just noise)
        if (blob.size < 500) {
            setError(language === 'ar'
                ? 'لم أتمكن من سماعك بوضوح. حاول مرة أخرى أو اكتب بدلاً من ذلك.'
                : "Couldn't hear that clearly. Try again or type instead.");
            setVoiceState('error');
            cleanup();
            return;
        }

        setVoiceState('processing');
        setTranscript('');

        try {
            const result = await transcribeAudio(blob, language);

            if (!result.text || result.text.trim().length === 0) {
                setError(language === 'ar'
                    ? 'لم أتمكن من فهم ذلك. حاول مرة أخرى أو اكتب بدلاً من ذلك.'
                    : "Couldn't understand that. Try again or type instead.");
                setVoiceState('error');
                return;
            }

            setTranscript(result.text);
            setVoiceState('idle');
            onTranscriptReady(result.text);
        } catch (err) {
            if (err instanceof VoiceDisabledError) {
                setError(language === 'ar'
                    ? 'الإدخال الصوتي معطل حالياً'
                    : 'Voice input is currently disabled');
            } else if (err instanceof TranscriptionError) {
                setError(err.message);
            } else {
                setError(language === 'ar'
                    ? 'حدث خطأ. حاول مرة أخرى أو اكتب بدلاً من ذلك.'
                    : 'Something went wrong. Try again or type instead.');
            }
            setVoiceState('error');
        }
    }, [language, onTranscriptReady, cleanup]);

    // ── Start Listening ─────────────────────────
    const startListening = useCallback(async () => {
        if (!isSupported || !enabled) return;

        setError(null);
        setTranscript('');

        try {
            // Request mic permission (on-first-tap)
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });

            streamRef.current = stream;

            // Set up audio analysis for waveform + VAD
            const audioContext = new AudioContext();
            audioContextRef.current = audioContext;

            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;
            analyser.smoothingTimeConstant = 0.8;
            source.connect(analyser);
            analyserRef.current = analyser;

            // Set up MediaRecorder
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : MediaRecorder.isTypeSupported('audio/webm')
                    ? 'audio/webm'
                    : 'audio/mp4';

            const recorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = recorder;
            chunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mimeType });
                processAudio(blob);
            };

            recorder.start(250); // Collect data every 250ms
            startTimeRef.current = Date.now();
            setVoiceState('listening');
            hasSpokenRef.current = false;

            // ── Audio level monitoring + VAD ────────
            const silenceThreshold = 0.015;
            let silenceStart: number | null = null;

            levelCheckRef.current = setInterval(() => {
                const level = checkAudioLevel();
                setAudioLevel(Math.min(1, level * 10)); // Normalize for UI

                if (level > silenceThreshold) {
                    hasSpokenRef.current = true;
                    silenceStart = null;
                    if (silenceTimerRef.current) {
                        clearTimeout(silenceTimerRef.current);
                        silenceTimerRef.current = null;
                    }
                } else if (hasSpokenRef.current && !silenceStart) {
                    // Start silence timer
                    silenceStart = Date.now();
                    silenceTimerRef.current = setTimeout(() => {
                        // Auto-stop after silence threshold
                        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                            mediaRecorderRef.current.stop();
                        }
                        if (levelCheckRef.current) {
                            clearInterval(levelCheckRef.current);
                            levelCheckRef.current = null;
                        }
                        if (streamRef.current) {
                            streamRef.current.getTracks().forEach(t => t.stop());
                        }
                    }, voiceConfig.silenceThreshold);
                }
            }, AUDIO_LEVEL_CHECK_INTERVAL);

            // ── Duration tracking ──────────────────
            durationTimerRef.current = setInterval(() => {
                setRecordingDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
            }, 1000);

            // ── Max duration safety cap ────────────
            maxDurationTimerRef.current = setTimeout(() => {
                if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                    mediaRecorderRef.current.stop();
                }
                if (levelCheckRef.current) {
                    clearInterval(levelCheckRef.current);
                }
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(t => t.stop());
                }
            }, voiceConfig.maxDuration * 1000);

        } catch (err: any) {
            cleanup();
            if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
                setError(language === 'ar'
                    ? 'يلزم الوصول إلى الميكروفون للإدخال الصوتي. يرجى السماح بالوصول في إعدادات المتصفح.'
                    : 'Microphone access is required for voice input. Please allow access in your browser settings.');
            } else {
                setError(language === 'ar'
                    ? 'لا يمكن الوصول إلى الميكروفون. حاول مرة أخرى.'
                    : 'Unable to access microphone. Please try again.');
            }
            setVoiceState('error');
        }
    }, [isSupported, enabled, voiceConfig, language, processAudio, checkAudioLevel, cleanup]);

    // ── Stop Listening (manual PTT stop) ────────
    const stopListening = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        if (levelCheckRef.current) {
            clearInterval(levelCheckRef.current);
            levelCheckRef.current = null;
        }
        if (durationTimerRef.current) {
            clearInterval(durationTimerRef.current);
            durationTimerRef.current = null;
        }
        if (maxDurationTimerRef.current) {
            clearTimeout(maxDurationTimerRef.current);
            maxDurationTimerRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
        }
    }, []);

    // ── Cancel Recording ────────────────────────
    const cancelRecording = useCallback(() => {
        cleanup();
        setVoiceState('idle');
        setTranscript('');
        setError(null);
    }, [cleanup]);

    // ── Lock Continuous (mid-recording switch from PTT to auto_mic) ──
    const lockContinuous = useCallback(() => {
        setVoiceMode('auto_mic');
    }, []);

    return {
        voiceState,
        transcript,
        audioLevel,
        error,
        voiceMode,
        isSupported,
        recordingDuration,
        startListening,
        stopListening,
        cancelRecording,
        setVoiceMode,
        lockContinuous,
        analyserNode: analyserRef.current,
    };
}
