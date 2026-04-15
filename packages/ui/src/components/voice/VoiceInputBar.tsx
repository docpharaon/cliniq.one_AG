import React, { useState, useRef, useCallback, useEffect } from 'react';
import { AlertTriangle, Keyboard, Square, X, Mic, Lock, ChevronUp } from '../../icons';
import { AudioWaveform } from './AudioWaveform';
import type { VoiceState, VoiceMode } from '@cliniqone/types';
import { colors } from '../../tokens';

interface VoiceInputBarProps {
    voiceState: VoiceState;
    audioLevel: number;
    error: string | null;
    voiceMode: VoiceMode;
    recordingDuration: number;
    isSupported: boolean;
    enabled: boolean;
    isRTL: boolean;

    onStartListening: () => void;
    onStopListening: () => void;
    onCancel: () => void;
    onSetVoiceMode: (mode: VoiceMode) => void;
    onLockContinuous?: () => void;
    onSwitchToText: () => void;
    onDismissError: () => void;
}

const LOCK_THRESHOLD = 80;

export function VoiceInputBar({
    voiceState,
    audioLevel,
    error,
    voiceMode,
    recordingDuration,
    isSupported,
    enabled,
    isRTL,
    onStartListening,
    onStopListening,
    onCancel,
    onSetVoiceMode,
    onLockContinuous,
    onSwitchToText,
    onDismissError,
}: VoiceInputBarProps) {

    const [swipeProgress, setSwipeProgress] = useState(0); 
    const [isHolding, setIsHolding] = useState(false);
    const [locked, setLocked] = useState(false);
    const touchStartYRef = useRef(0);
    const isHoldingRef = useRef(false);

    const formatDuration = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    };

    const handlePointerDown = useCallback((e: React.PointerEvent | React.TouchEvent) => {
        if (voiceState !== 'idle') return;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.PointerEvent).clientY;
        touchStartYRef.current = clientY;
        isHoldingRef.current = true;
        setIsHolding(true);
        setSwipeProgress(0);
        setLocked(false);

        onSetVoiceMode('push_to_talk');
        onStartListening();
    }, [voiceState, onStartListening, onSetVoiceMode]);

    const handlePointerMove = useCallback((e: React.PointerEvent | React.TouchEvent) => {
        if (!isHoldingRef.current || locked) return;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.PointerEvent).clientY;
        const dy = touchStartYRef.current - clientY; 
        const progress = Math.min(1, Math.max(0, dy / LOCK_THRESHOLD));
        setSwipeProgress(progress);

        if (progress >= 1 && !locked) {
            setLocked(true);
            setIsHolding(false);
            isHoldingRef.current = false;
            onSetVoiceMode('auto_mic');
            if (onLockContinuous) onLockContinuous();
        }
    }, [locked, onSetVoiceMode, onLockContinuous]);

    const handlePointerUp = useCallback(() => {
        if (!isHoldingRef.current) return;
        isHoldingRef.current = false;
        setIsHolding(false);
        setSwipeProgress(0);

        if (!locked) {
            onStopListening();
        }
    }, [locked, onStopListening]);

    useEffect(() => {
        if (voiceState === 'idle') {
            setLocked(false);
            setIsHolding(false);
            setSwipeProgress(0);
            isHoldingRef.current = false;
        }
    }, [voiceState]);

    const isAutoMode = voiceMode === 'auto_mic';
    const handleIdleTap = useCallback(() => {
        if (voiceState !== 'idle') return;
        if (isAutoMode) {
            onStartListening();
        }
    }, [voiceState, isAutoMode, onStartListening]);

    if (!isSupported || !enabled) return null;

    if (voiceState === 'error' && error) {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px',
                borderRadius: '16px', background: colors.errorFaded, border: `1px solid ${colors.error}25`,
            }}>
                <AlertTriangle size={16} color={colors.error} />
                <p style={{ flex: 1, fontSize: '13px', color: colors.error, margin: 0 }}>{error}</p>
                <button onClick={() => { onDismissError(); onStartListening(); }} style={s.retryBtn}>
                    {isRTL ? 'أعد المحاولة' : 'Retry'}
                </button>
                <button onClick={() => { onDismissError(); onSwitchToText(); }} style={s.textBtn}>
                    <Keyboard size={12} style={{ marginRight: 4 }} />{isRTL ? 'اكتب' : 'Type'}
                </button>
            </div>
        );
    }

    if (voiceState === 'processing') {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '16px 20px',
                borderRadius: '20px', background: colors.accentTealFaded, border: `1px solid ${colors.accentTeal}20`,
            }}>
                <div className="spinner" style={{ width: 20, height: 20, border: `2.5px solid ${colors.accentTeal}20`, borderTopColor: colors.accentTeal, borderRadius: '50%' }} />
                <span style={{ fontSize: '14px', fontWeight: 600, color: colors.accentTeal }}>
                    {isRTL ? '...جارٍ النسخ' : 'Transcribing...'}
                </span>
            </div>
        );
    }

    if (voiceState === 'listening') {
        const isCont = isAutoMode || locked;
        const activeColor = isCont ? '#0ECFCF' : colors.accentTeal;

        return (
            <div
                onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}
                style={{
                    display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px 20px', borderRadius: '20px',
                    background: isCont ? 'rgba(14, 207, 207, 0.06)' : colors.accentTealFaded,
                    border: `1px solid ${isCont ? '#0ECFCF40' : colors.accentTeal + '30'}`,
                    userSelect: 'none', touchAction: 'none', transition: 'all 0.3s ease',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: isCont ? '#0ECFCF' : colors.error }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: isCont ? '#0ECFCF' : colors.accentTeal }}>
                            {isRTL ? '...جارٍ الاستماع' : 'Listening...'}
                        </span>
                        {isCont && (
                            <span style={s.lockedBadge}>
                                <Lock size={8} color="#0ECFCF" /> {isRTL ? 'مثبت' : 'LOCKED'}
                            </span>
                        )}
                    </div>
                    <span style={s.duration}>{formatDuration(recordingDuration)}</span>
                </div>

                {!isCont && isHolding && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: 10, background: swipeProgress > 0.7 ? colors.accentTeal : colors.accentTealFaded,
                            border: `1.5px solid ${colors.accentTeal}40`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transform: `translateY(${-swipeProgress * 6}px) scale(${1 + swipeProgress * 0.15})`,
                        }}>
                            {swipeProgress > 0.7 ? <Lock size={14} color="#fff" /> : <ChevronUp size={14} color={colors.accentTeal} />}
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 600, color: swipeProgress > 0.7 ? '#0ECFCF' : colors.accentTeal }}>
                            {swipeProgress > 0.7 ? (isRTL ? 'حرر للتثبيت' : 'Release to lock') : (isRTL ? 'اسحب للأعلى للتثبيت' : 'Slide up to lock')}
                        </span>
                    </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AudioWaveform audioLevel={audioLevel} isActive={true} width={220} height={38} color={activeColor} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <button onClick={onCancel} style={s.cancelBtn}>
                        <X size={12} /> {isRTL ? 'إلغاء' : 'Cancel'}
                    </button>
                    {isCont ? (
                        <button onClick={onStopListening} style={s.stopBtn}>
                            <Square size={12} /> {isRTL ? 'إيقاف' : 'Stop'}
                        </button>
                    ) : (
                        <span style={s.hintText}>{isRTL ? 'ارفع إصبعك للإرسال' : 'Release to send'}</span>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'absolute', width: 78, height: 78, borderRadius: '50%', background: colors.accentTealFaded, opacity: 0.5 }} />
                <button
                    onClick={isAutoMode ? handleIdleTap : undefined}
                    onPointerDown={isAutoMode ? undefined : handlePointerDown as any}
                    onPointerMove={isAutoMode ? undefined : handlePointerMove as any}
                    onPointerUp={isAutoMode ? undefined : handlePointerUp as any}
                    onPointerCancel={isAutoMode ? undefined : handlePointerUp as any}
                    style={{
                        position: 'relative', zIndex: 2, width: 64, height: 64, borderRadius: '50%',
                        border: `2px solid ${colors.accentTeal}20`, background: colors.accentTealFaded,
                        color: colors.accentTeal, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                >
                    <Mic size={26} strokeWidth={2} />
                </button>
            </div>
            <span style={{ fontSize: 10, color: colors.textTertiary }}>
                {isAutoMode ? (isRTL ? 'اضغط للتحدث' : 'Tap to talk') : (isRTL ? 'اضغط مع الاستمرار للتحدث' : 'Hold to talk')}
            </span>
            <button onClick={onSwitchToText} style={s.switchToText}>
                <Keyboard size={11} /> {isRTL ? 'اكتب بدلاً من ذلك' : 'Type instead'}
            </button>
        </div>
    );
}

const s: Record<string, React.CSSProperties> = {
    retryBtn: { padding: '6px 14px', borderRadius: '10px', border: `1px solid ${colors.accentTeal}40`, background: colors.accentTealFaded, color: colors.accentTeal, fontSize: '12px', fontWeight: 600 },
    textBtn: { padding: '6px 14px', borderRadius: '10px', border: `1px solid ${colors.border}`, background: 'transparent', color: colors.textSecondary, fontSize: '12px' },
    lockedBadge: { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 700, color: '#0ECFCF', background: 'rgba(14, 207, 207, 0.1)', border: '1px solid rgba(14, 207, 207, 0.2)', borderRadius: 10, padding: '2px 8px' },
    duration: { fontSize: 13, color: colors.textSecondary, opacity: 0.8 },
    cancelBtn: { display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 10, border: `1px solid ${colors.error}20`, background: colors.errorFaded, color: colors.error, fontSize: 12 },
    stopBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 10, border: '1px solid #0ECFCF40', background: 'rgba(14, 207, 207, 0.1)', color: '#0ECFCF', fontSize: 12, fontWeight: 600 },
    hintText: { fontSize: 11, color: colors.textTertiary, opacity: 0.7 },
    switchToText: { display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', border: 'none', background: 'transparent', color: colors.textTertiary, fontSize: 10, cursor: 'pointer' }
};
