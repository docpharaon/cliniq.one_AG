import { useState, useRef, useCallback, useEffect } from 'react';
import { transcribeAudio, getVoiceConfig, VoiceConfig } from '@cliniqone/api';
import type { VoiceState, VoiceMode } from '@cliniqone/types';

export interface UseVoiceInputOptions {
    onTranscriptReady: (text: string) => void;
    language: 'en' | 'ar';
    enabled: boolean;
}

export interface UseVoiceInputReturn {
    voiceState: VoiceState;
    transcript: string;
    audioLevel: number;
    error: string | null;
    voiceMode: VoiceMode;
    isSupported: boolean;
    recordingDuration: number;
    startListening: () => Promise<void>;
    stopListening: () => void;
    cancelRecording: () => void;
    setVoiceMode: (mode: VoiceMode) => void;
    lockContinuous: () => void;
    analyserNode: AnalyserNode | null;
}

const MIN_SPEECH_DURATION_MS = 500;
const AUDIO_LEVEL_CHECK_INTERVAL = 50;

export function useVoiceInput({
    onTranscriptReady,
    language,
    enabled,
}: UseVoiceInputOptions): UseVoiceInputReturn {
    const [voiceState, setVoiceState] = useState<VoiceState>('idle');
    const [transcript, setTranscript] = useState('');
    const [audioLevel, setAudioLevel] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [voiceMode, setVoiceMode] = useState<VoiceMode>('push_to_talk');
    const [recordingDuration, setRecordingDuration] = useState(0);

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

    const cleanup = useCallback(() => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        if (levelCheckRef.current) clearInterval(levelCheckRef.current);
        if (durationTimerRef.current) clearInterval(durationTimerRef.current);
        if (maxDurationTimerRef.current) clearTimeout(maxDurationTimerRef.current);
        
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

    useEffect(() => {
        return () => cleanup();
    }, [cleanup]);

    const checkAudioLevel = useCallback(() => {
        const analyser = analyserRef.current;
        if (!analyser) return 0;
        const data = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(data);
        return Math.sqrt(data.reduce((sum, v) => sum + v * v, 0) / data.length);
    }, []);

    const processAudio = useCallback(async (blob: Blob) => {
        const duration = Date.now() - startTimeRef.current;
        if (duration < MIN_SPEECH_DURATION_MS) {
            setVoiceState('idle');
            cleanup();
            return;
        }

        setVoiceState('processing');
        try {
            const result = await transcribeAudio(blob, language);
            if (!result.text?.trim()) {
                setError(language === 'ar' ? 'لم أتمكن من فهم ذلك.' : "Couldn't understand that.");
                setVoiceState('error');
            } else {
                setTranscript(result.text);
                setVoiceState('idle');
                onTranscriptReady(result.text);
            }
            cleanup();
        } catch (err: any) {
            setError(err.message || 'Error occurred');
            setVoiceState('error');
            cleanup();
        }
    }, [language, onTranscriptReady, cleanup]);

    const startListening = useCallback(async () => {
        if (!isSupported || !enabled) return;
        cleanup();
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            const audioContext = new AudioContext();
            audioContextRef.current = audioContext;
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            source.connect(analyser);
            analyserRef.current = analyser;

            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
            recorder.onstop = () => processAudio(new Blob(chunksRef.current));
            recorder.start();

            startTimeRef.current = Date.now();
            setVoiceState('listening');
            const voiceConfig = getVoiceConfig();

            levelCheckRef.current = setInterval(() => {
                const level = checkAudioLevel();
                setAudioLevel(Math.min(1, level * 10));
                if (level > 0.015) hasSpokenRef.current = true;
            }, AUDIO_LEVEL_CHECK_INTERVAL);

            durationTimerRef.current = setInterval(() => {
                setRecordingDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
            }, 1000);

        } catch (err: any) {
            setError('Mic access denied');
            setVoiceState('error');
        }
    }, [isSupported, enabled, processAudio, checkAudioLevel, cleanup]);

    const stopListening = useCallback(() => {
        if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    }, []);

    const cancelRecording = useCallback(() => {
        cleanup();
        setVoiceState('idle');
    }, [cleanup]);

    return {
        voiceState, transcript, audioLevel, error, voiceMode, isSupported, recordingDuration,
        startListening, stopListening, cancelRecording, setVoiceMode, lockContinuous: () => setVoiceMode('auto_mic'),
        analyserNode: analyserRef.current,
    };
}
