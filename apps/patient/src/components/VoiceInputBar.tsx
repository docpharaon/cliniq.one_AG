// ─────────────────────────────────────────────────
// VoiceInputBar — Premium PTT + Swipe-to-Lock UX
// Hold mic to talk, swipe up to lock continuous mode
// ─────────────────────────────────────────────────
import { useState, useRef, useCallback, useEffect } from 'react';
import { AlertTriangle, Keyboard, Square, X, Mic, Lock, ChevronUp } from '@cliniqone/ui';
import { AudioWaveform } from './AudioWaveform';
import type { VoiceState, VoiceMode } from '../hooks/useVoiceInput';

// ── Brand Colors ────────────────────────────────
const TEAL = '#1A8A9E';
const CYAN = '#0ECFCF';
const TEAL_GLOW = 'rgba(26, 138, 158, 0.35)';
const CYAN_GLOW = 'rgba(14, 207, 207, 0.35)';

// ── Swipe Lock Threshold (px the finger must travel upward) ──
const LOCK_THRESHOLD = 80;

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

    // ── Swipe tracking state ──
    const [swipeProgress, setSwipeProgress] = useState(0); // 0–1
    const [isHolding, setIsHolding] = useState(false);
    const [locked, setLocked] = useState(false);
    const touchStartYRef = useRef(0);
    const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isHoldingRef = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const formatDuration = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    };

    // ── Haptic pulse ──
    const haptic = (ms: number = 30) => {
        if (navigator.vibrate) navigator.vibrate(ms);
    };

    // ── Touch / Mouse handlers for PTT + swipe-to-lock ──
    const handlePointerDown = useCallback((e: React.PointerEvent | React.TouchEvent) => {
        if (voiceState !== 'idle') return;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.PointerEvent).clientY;
        touchStartYRef.current = clientY;
        isHoldingRef.current = true;
        setIsHolding(true);
        setSwipeProgress(0);
        setLocked(false);
        haptic(15);

        // Start recording immediately on press
        onSetVoiceMode('push_to_talk');
        onStartListening();
    }, [voiceState, onStartListening, onSetVoiceMode]);

    const handlePointerMove = useCallback((e: React.PointerEvent | React.TouchEvent) => {
        if (!isHoldingRef.current || locked) return;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.PointerEvent).clientY;
        const dy = touchStartYRef.current - clientY; // positive = upward
        const progress = Math.min(1, Math.max(0, dy / LOCK_THRESHOLD));
        setSwipeProgress(progress);

        // Lock threshold reached
        if (progress >= 1 && !locked) {
            setLocked(true);
            setIsHolding(false);
            isHoldingRef.current = false;
            haptic(50);
            // Switch to continuous mode
            onSetVoiceMode('auto_mic');
            if (onLockContinuous) onLockContinuous();
        }
    }, [locked, onSetVoiceMode, onLockContinuous]);

    const handlePointerUp = useCallback(() => {
        if (!isHoldingRef.current) return;
        isHoldingRef.current = false;
        setIsHolding(false);
        setSwipeProgress(0);

        // If not locked into continuous, stop recording (PTT release)
        if (!locked) {
            onStopListening();
        }
    }, [locked, onStopListening]);

    // ── Reset locked state when we go back to idle ──
    useEffect(() => {
        if (voiceState === 'idle') {
            setLocked(false);
            setIsHolding(false);
            setSwipeProgress(0);
            isHoldingRef.current = false;
        }
    }, [voiceState]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
        };
    }, []);

    // ── Idle tap handler (must be before early return — React rules of hooks) ──
    const isAutoMode = voiceMode === 'auto_mic';
    const handleIdleTap = useCallback(() => {
        if (voiceState !== 'idle') return;
        if (isAutoMode) {
            // Auto mode: single tap starts, VAD handles stopping
            onStartListening();
        }
    }, [voiceState, isAutoMode, onStartListening]);

    // ── Early return AFTER all hooks (React rules of hooks) ──
    if (!isSupported || !enabled) return null;

    // ── Error Toast ─────────────────────────────
    if (voiceState === 'error' && error) {
        return (
            <div className="voice-error-bar" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                borderRadius: '16px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                animation: 'fadeIn 0.25s ease',
            }}>
                <AlertTriangle size={16} color="#ef4444" />
                <p style={{
                    flex: 1,
                    fontSize: '13px',
                    color: 'var(--color-error, #ef4444)',
                    margin: 0,
                    lineHeight: 1.4,
                }}>{error}</p>
                <button
                    onClick={() => {
                        onDismissError();
                        onStartListening();
                    }}
                    style={{
                        padding: '6px 14px',
                        borderRadius: '10px',
                        border: `1px solid rgba(26, 138, 158, 0.3)`,
                        background: `rgba(26, 138, 158, 0.08)`,
                        color: TEAL,
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {isRTL ? 'أعد المحاولة' : 'Retry'}
                </button>
                <button
                    onClick={() => {
                        onDismissError();
                        onSwitchToText();
                    }}
                    style={{
                        padding: '6px 14px',
                        borderRadius: '10px',
                        border: '1px solid var(--color-border, rgba(255,255,255,0.1))',
                        background: 'transparent',
                        color: 'var(--color-text-secondary, #888)',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                    }}
                >
                    <Keyboard size={12} color="currentColor" style={{ marginRight: 4 }} />{isRTL ? 'اكتب' : 'Type'}
                </button>
            </div>
        );
    }

    // ── Processing State ────────────────────────
    if (voiceState === 'processing') {
        return (
            <div className="voice-processing-bar" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '16px 20px',
                borderRadius: '20px',
                background: `linear-gradient(135deg, rgba(26, 138, 158, 0.06), rgba(14, 207, 207, 0.04))`,
                border: `1px solid rgba(26, 138, 158, 0.12)`,
                animation: 'fadeIn 0.25s ease',
            }}>
                <div style={{
                    width: '20px',
                    height: '20px',
                    border: `2.5px solid rgba(26, 138, 158, 0.15)`,
                    borderTopColor: TEAL,
                    borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                }} />
                <span style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    background: `linear-gradient(135deg, ${TEAL}, ${CYAN})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '0.02em',
                }}>
                    {isRTL ? '...جارٍ النسخ' : 'Transcribing...'}
                </span>
            </div>
        );
    }

    // ── Listening State (Active Recording) ──────
    if (voiceState === 'listening') {
        const isCont = voiceMode === 'auto_mic' || locked;

        return (
            <div
                ref={containerRef}
                className="voice-active-bar"
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onTouchMove={handlePointerMove as any}
                onTouchEnd={handlePointerUp as any}
                onTouchCancel={handlePointerUp as any}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    padding: '16px 20px',
                    borderRadius: '20px',
                    background: isCont
                        ? `linear-gradient(135deg, rgba(14, 207, 207, 0.06), rgba(26, 138, 158, 0.08))`
                        : `linear-gradient(135deg, rgba(26, 138, 158, 0.04), rgba(26, 138, 158, 0.06))`,
                    border: isCont
                        ? `1px solid rgba(14, 207, 207, 0.2)`
                        : `1px solid rgba(26, 138, 158, 0.15)`,
                    animation: 'fadeIn 0.2s ease',
                    boxShadow: isCont
                        ? `0 4px 24px rgba(14, 207, 207, 0.08), inset 0 1px 0 rgba(14, 207, 207, 0.05)`
                        : `0 2px 12px rgba(26, 138, 158, 0.04)`,
                    userSelect: 'none',
                    touchAction: 'none',
                    transition: 'all 0.3s ease',
                }}
            >
                {/* Top row: status + lock indicator + duration */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* Pulsing record dot */}
                        <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: isCont ? CYAN : '#ef4444',
                            animation: 'pulse 1.4s ease infinite',
                            boxShadow: isCont ? `0 0 8px ${CYAN_GLOW}` : '0 0 6px rgba(239, 68, 68, 0.4)',
                        }} />
                        <span style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: isCont ? CYAN : TEAL,
                            letterSpacing: '0.01em',
                        }}>
                            {isRTL ? '...جارٍ الاستماع' : 'Listening...'}
                        </span>

                        {/* Continuous badge */}
                        {isCont && (
                            <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '9px',
                                fontWeight: 700,
                                color: CYAN,
                                background: `rgba(14, 207, 207, 0.1)`,
                                border: `1px solid rgba(14, 207, 207, 0.2)`,
                                borderRadius: '10px',
                                padding: '2px 8px',
                                letterSpacing: '0.06em',
                                textTransform: 'uppercase',
                            }}>
                                <Lock size={8} color={CYAN} />
                                {isRTL ? 'مثبت' : 'LOCKED'}
                            </span>
                        )}
                    </div>

                    <span style={{
                        fontSize: '13px',
                        fontFamily: "'SF Mono', 'Fira Code', monospace",
                        fontWeight: 500,
                        color: isCont ? CYAN : 'var(--color-text-muted, #777)',
                        opacity: 0.8,
                    }}>
                        {formatDuration(recordingDuration)}
                    </span>
                </div>

                {/* Swipe-to-lock indicator (only in PTT mode, not yet locked) */}
                {!isCont && isHolding && (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        animation: 'fadeIn 0.3s ease',
                    }}>
                        {/* Lock icon that fills as you swipe */}
                        <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '10px',
                            background: swipeProgress > 0.7
                                ? `linear-gradient(135deg, ${TEAL}, ${CYAN})`
                                : `rgba(26, 138, 158, ${0.08 + swipeProgress * 0.2})`,
                            border: `1.5px solid rgba(26, 138, 158, ${0.15 + swipeProgress * 0.45})`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                            transform: `translateY(${-swipeProgress * 6}px) scale(${1 + swipeProgress * 0.15})`,
                            boxShadow: swipeProgress > 0.7
                                ? `0 4px 16px ${TEAL_GLOW}`
                                : 'none',
                        }}>
                            {swipeProgress > 0.7
                                ? <Lock size={14} color="#fff" />
                                : <ChevronUp size={14} color={TEAL} style={{ opacity: 0.5 + swipeProgress * 0.5 }} />
                            }
                        </div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            opacity: swipeProgress > 0.7 ? 1 : 0.5 + swipeProgress * 0.3,
                            transition: 'opacity 0.2s ease',
                        }}>
                            <ChevronUp size={10} color={TEAL} style={{
                                animation: 'slideUpHint 1.2s ease infinite',
                                opacity: swipeProgress > 0.5 ? 0 : 1,
                            }} />
                            <span style={{
                                fontSize: '10px',
                                fontWeight: 600,
                                color: swipeProgress > 0.7 ? CYAN : TEAL,
                                letterSpacing: '0.04em',
                                transition: 'color 0.2s ease',
                            }}>
                                {swipeProgress > 0.7
                                    ? (isRTL ? 'حرر للتثبيت' : 'Release to lock')
                                    : (isRTL ? 'اسحب للأعلى للتثبيت' : 'Slide up to lock')
                                }
                            </span>
                        </div>
                    </div>
                )}

                {/* Waveform */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2px 0',
                }}>
                    <AudioWaveform
                        audioLevel={audioLevel}
                        isActive={true}
                        width={220}
                        height={38}
                        color={isCont ? CYAN : TEAL}
                    />
                </div>

                {/* Bottom controls */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <button
                        onClick={onCancel}
                        aria-label={isRTL ? 'إلغاء التسجيل' : 'Cancel recording'}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '7px 14px',
                            borderRadius: '10px',
                            border: '1px solid rgba(239, 68, 68, 0.15)',
                            background: 'rgba(239, 68, 68, 0.06)',
                            color: '#ef4444',
                            fontSize: '12px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        <X size={12} color="currentColor" />{isRTL ? 'إلغاء' : 'Cancel'}
                    </button>

                    {/* Only show stop in continuous/locked mode */}
                    {isCont && (
                        <button
                            onClick={onStopListening}
                            aria-label={isRTL ? 'إيقاف الاستماع' : 'Stop listening'}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '7px 16px',
                                borderRadius: '10px',
                                border: `1px solid rgba(14, 207, 207, 0.3)`,
                                background: `rgba(14, 207, 207, 0.08)`,
                                color: CYAN,
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <Square size={12} color="currentColor" />
                            {isRTL ? 'إيقاف' : 'Stop'}
                        </button>
                    )}

                    {/* PTT mode: show hint that releasing will send */}
                    {!isCont && (
                        <span style={{
                            fontSize: '11px',
                            fontWeight: 500,
                            color: 'var(--color-text-muted, #777)',
                            opacity: 0.7,
                        }}>
                            {isRTL ? 'ارفع إصبعك للإرسال' : 'Release to send'}
                        </span>
                    )}
                </div>
            </div>
        );
    }

    // ── Idle State: Mic Button ──
    // Auto-mic mode: tap to start (VAD auto-stops on silence)
    // PTT mode: hold to talk, swipe up to lock
    // Note: isAutoMode and handleIdleTap are declared before the early return above

    return (
        <div
            className="voice-idle-ptt"
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                position: 'relative',
            }}
        >
            {/* Mic Button Container with animated rings */}
            <div
                style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {/* Outer glow ring */}
                <div
                    className="voice-idle-ring-outer"
                    style={{
                        position: 'absolute',
                        width: '78px',
                        height: '78px',
                        borderRadius: '50%',
                        background: isAutoMode
                            ? `conic-gradient(from 0deg, ${CYAN}33, ${TEAL}33, ${CYAN}33)`
                            : `conic-gradient(from 0deg, ${TEAL}33, ${CYAN}33, ${TEAL}33)`,
                        animation: 'voiceRingSpin 4s linear infinite',
                        opacity: 0.5,
                        filter: 'blur(1px)',
                    }}
                />
                {/* Inner glow ring */}
                <div
                    className="voice-idle-ring-inner"
                    style={{
                        position: 'absolute',
                        width: '72px',
                        height: '72px',
                        borderRadius: '50%',
                        background: isAutoMode
                            ? `conic-gradient(from 180deg, ${TEAL}22, ${CYAN}22, ${TEAL}22)`
                            : `conic-gradient(from 180deg, ${CYAN}22, ${TEAL}22, ${CYAN}22)`,
                        animation: 'voiceRingSpin 3s linear infinite reverse',
                        opacity: 0.4,
                    }}
                />

                {/* Main mic button */}
                <button
                    className="voice-ptt-button"
                    onClick={isAutoMode ? handleIdleTap : undefined}
                    onPointerDown={isAutoMode ? undefined : handlePointerDown as any}
                    onPointerMove={isAutoMode ? undefined : handlePointerMove as any}
                    onPointerUp={isAutoMode ? undefined : handlePointerUp as any}
                    onPointerCancel={isAutoMode ? undefined : handlePointerUp as any}
                    onTouchStart={isAutoMode ? undefined : handlePointerDown as any}
                    onTouchMove={isAutoMode ? undefined : handlePointerMove as any}
                    onTouchEnd={isAutoMode ? undefined : handlePointerUp as any}
                    onTouchCancel={isAutoMode ? undefined : handlePointerUp as any}
                    onContextMenu={e => e.preventDefault()}
                    aria-label={isAutoMode
                        ? (isRTL ? 'اضغط للتحدث' : 'Tap to talk')
                        : (isRTL ? 'اضغط مع الاستمرار للتحدث' : 'Hold to talk')
                    }
                    title={isAutoMode
                        ? (isRTL ? 'اضغط للتحدث' : 'Tap to talk')
                        : (isRTL ? 'اضغط مع الاستمرار للتحدث' : 'Hold to talk')
                    }
                    style={{
                        position: 'relative',
                        zIndex: 2,
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        border: isAutoMode
                            ? `2px solid rgba(14, 207, 207, 0.3)`
                            : `2px solid rgba(26, 138, 158, 0.25)`,
                        background: isAutoMode
                            ? `linear-gradient(145deg, rgba(14, 207, 207, 0.15), rgba(26, 138, 158, 0.08))`
                            : `linear-gradient(145deg, rgba(26, 138, 158, 0.12), rgba(14, 207, 207, 0.06))`,
                        color: isAutoMode ? CYAN : TEAL,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        touchAction: 'none',
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        padding: 0,
                        outline: 'none',
                        boxShadow: isAutoMode
                            ? `0 2px 20px rgba(14, 207, 207, 0.12), inset 0 1px 0 rgba(255,255,255,0.06)`
                            : `0 2px 16px rgba(26, 138, 158, 0.08), inset 0 1px 0 rgba(255,255,255,0.04)`,
                    }}
                >
                    <Mic size={26} color="currentColor" strokeWidth={2} />
                </button>
            </div>

            {/* Hint text */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: 0.5,
            }}>
                <span style={{
                    fontSize: '10px',
                    fontWeight: 500,
                    color: 'var(--color-text-muted, #888)',
                    letterSpacing: '0.03em',
                }}>
                    {isAutoMode
                        ? (isRTL ? 'اضغط للتحدث · سيتم الإرسال تلقائياً' : 'Tap to talk · Auto-sends on silence')
                        : (isRTL ? 'اضغط للتحدث · اسحب لأعلى للتثبيت' : 'Hold to talk · Swipe up to lock')
                    }
                </span>
            </div>

            {/* Keyboard switch */}
            <button
                onClick={onSwitchToText}
                aria-label={isRTL ? 'التبديل إلى الكتابة' : 'Switch to typing'}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--color-text-muted, #777)',
                    fontSize: '10px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    opacity: 0.5,
                    transition: 'opacity 0.2s ease',
                }}
            >
                <Keyboard size={11} color="currentColor" />
                {isRTL ? 'اكتب بدلاً من ذلك' : 'Type instead'}
            </button>
        </div>
    );
}

// ── Recording Indicator (shown in chat header) ──
export function RecordingIndicator({ isRTL }: { isRTL: boolean }) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 10px',
            borderRadius: '20px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            animation: 'fadeIn 0.3s ease',
        }}>
            <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#ef4444',
                animation: 'pulse 1.5s ease infinite',
            }} />
            <span style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#ef4444',
                letterSpacing: '0.03em',
            }}>
                {isRTL ? 'تسجيل' : 'REC'}
            </span>
        </div>
    );
}
