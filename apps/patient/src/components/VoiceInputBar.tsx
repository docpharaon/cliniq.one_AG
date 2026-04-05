// ─────────────────────────────────────────────────
// VoiceInputBar — Voice mode UI for AI chat
// Shows mic button, waveform, states, and controls
// ─────────────────────────────────────────────────
import { AlertTriangle, Keyboard, Square, X, RefreshCcw, PointerFinger, Mic } from '@cliniqone/ui';
import { AudioWaveform } from './AudioWaveform';
import type { VoiceState, VoiceMode } from '../hooks/useVoiceInput';

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
    onSwitchToText,
    onDismissError,
}: VoiceInputBarProps) {

    if (!isSupported || !enabled) return null;

    const formatDuration = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    };

    // ── Error Toast ─────────────────────────────
    if (voiceState === 'error' && error) {
        return (
            <div className="voice-error-bar" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: '14px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                animation: 'fadeIn 0.2s ease',
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
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid rgba(26, 138, 158, 0.3)',
                        background: 'rgba(26, 138, 158, 0.1)',
                        color: 'var(--color-accent, #1A8A9E)',
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
                        padding: '6px 12px',
                        borderRadius: '8px',
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
                gap: '10px',
                padding: '14px 16px',
                borderRadius: '16px',
                background: 'rgba(26, 138, 158, 0.06)',
                border: '1px solid rgba(26, 138, 158, 0.15)',
                animation: 'fadeIn 0.2s ease',
            }}>
                <div className="voice-spinner" style={{
                    width: '18px',
                    height: '18px',
                    border: '2px solid rgba(26, 138, 158, 0.2)',
                    borderTopColor: '#1A8A9E',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                }} />
                <span style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--color-accent, #1A8A9E)',
                }}>
                    {isRTL ? '...جارٍ النسخ' : 'Transcribing...'}
                </span>
            </div>
        );
    }

    // ── Listening State ─────────────────────────
    if (voiceState === 'listening') {
        const isAutoMic = voiceMode === 'auto_mic';
        return (
            <div className="voice-listening-bar" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                padding: '14px 16px',
                borderRadius: '16px',
                background: isAutoMic
                    ? 'linear-gradient(135deg, rgba(14, 207, 207, 0.06), rgba(26, 138, 158, 0.08))'
                    : 'rgba(26, 138, 158, 0.06)',
                border: isAutoMic
                    ? '1px solid rgba(14, 207, 207, 0.25)'
                    : '1px solid rgba(26, 138, 158, 0.2)',
                animation: 'fadeIn 0.2s ease',
                boxShadow: isAutoMic ? '0 0 16px rgba(14, 207, 207, 0.08)' : 'none',
            }}>
                {/* Top row: recording indicator + mode badge + duration */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: isAutoMic ? '#0ECFCF' : '#ef4444',
                            animation: 'pulse 1.5s ease infinite',
                            boxShadow: isAutoMic ? '0 0 6px rgba(14, 207, 207, 0.5)' : 'none',
                        }} />
                        <span style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: isAutoMic ? '#0ECFCF' : 'var(--color-accent, #1A8A9E)',
                        }}>
                            {isRTL ? '...جارٍ الاستماع' : 'Listening...'}
                        </span>
                        {isAutoMic && (
                            <span style={{
                                fontSize: '9px',
                                fontWeight: 700,
                                color: '#0ECFCF',
                                background: 'rgba(14, 207, 207, 0.12)',
                                border: '1px solid rgba(14, 207, 207, 0.25)',
                                borderRadius: '10px',
                                padding: '2px 8px',
                                letterSpacing: '0.05em',
                                textTransform: 'uppercase',
                            }}>
                                {isRTL ? 'مستمر' : 'CONTINUOUS'}
                            </span>
                        )}
                    </div>
                    <span style={{
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        color: 'var(--color-text-muted, #666)',
                    }}>
                        {formatDuration(recordingDuration)}
                    </span>
                </div>

                {/* Waveform */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <AudioWaveform
                        audioLevel={audioLevel}
                        isActive={true}
                        width={200}
                        height={36}
                        color={isAutoMic ? '#0ECFCF' : '#1A8A9E'}
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
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            background: 'rgba(239, 68, 68, 0.08)',
                            color: 'var(--color-error, #ef4444)',
                            fontSize: '12px',
                            fontWeight: 500,
                            cursor: 'pointer',
                        }}
                    >
                        <X size={12} color="currentColor" style={{ marginRight: 3 }} />{isRTL ? 'إلغاء' : 'Cancel'}
                    </button>

                    <button
                        onClick={onStopListening}
                        aria-label={isRTL ? 'إيقاف التسجيل' : 'Stop recording'}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '6px 14px',
                            borderRadius: '8px',
                            border: isAutoMic
                                ? '1px solid rgba(14, 207, 207, 0.35)'
                                : '1px solid rgba(26, 138, 158, 0.3)',
                            background: isAutoMic
                                ? 'rgba(14, 207, 207, 0.1)'
                                : 'rgba(26, 138, 158, 0.1)',
                            color: isAutoMic ? '#0ECFCF' : 'var(--color-accent, #1A8A9E)',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        <Square size={12} color="currentColor" style={{ marginRight: 3 }} />
                        {voiceMode === 'push_to_talk'
                            ? (isRTL ? 'إيقاف' : 'Done')
                            : (isRTL ? 'إيقاف' : 'Stop')
                        }
                    </button>
                </div>
            </div>
        );
    }

    // ── Idle State: Mic Button ──────────────────
    const isContinuous = voiceMode === 'auto_mic';

    return (
        <div className="voice-idle-controls" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
        }}>
            {/* ── Segmented Mode Selector ── */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    position: 'relative',
                    borderRadius: '20px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '3px',
                    overflow: 'hidden',
                }}
            >
                {/* Sliding highlight */}
                <div style={{
                    position: 'absolute',
                    top: '3px',
                    bottom: '3px',
                    width: 'calc(50% - 3px)',
                    borderRadius: '16px',
                    background: isContinuous
                        ? 'linear-gradient(135deg, #1A8A9E, #0ECFCF)'
                        : 'rgba(255, 255, 255, 0.1)',
                    transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: isContinuous
                        ? (isRTL ? 'translateX(0%)' : 'translateX(calc(100% + 3px))')
                        : (isRTL ? 'translateX(calc(100% + 3px))' : 'translateX(0%)'),
                    boxShadow: isContinuous
                        ? '0 2px 8px rgba(26, 138, 158, 0.4), 0 0 20px rgba(14, 207, 207, 0.15)'
                        : 'none',
                }} />

                {/* PTT Button */}
                <button
                    onClick={() => onSetVoiceMode('push_to_talk')}
                    aria-label={isRTL ? 'اضغط للتحدث' : 'Push to talk'}
                    style={{
                        position: 'relative',
                        zIndex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '6px 12px',
                        borderRadius: '16px',
                        border: 'none',
                        background: 'transparent',
                        color: !isContinuous ? '#fff' : 'var(--color-text-muted, #888)',
                        fontSize: '11px',
                        fontWeight: !isContinuous ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'color 0.3s ease',
                        whiteSpace: 'nowrap',
                    }}
                >
                    <PointerFinger size={12} color="currentColor" />
                    {isRTL ? 'اضغط' : 'PTT'}
                </button>

                {/* Continuous Button */}
                <button
                    onClick={() => onSetVoiceMode('auto_mic')}
                    aria-label={isRTL ? 'الاستماع التلقائي المستمر' : 'Continuous auto-listen'}
                    style={{
                        position: 'relative',
                        zIndex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '6px 12px',
                        borderRadius: '16px',
                        border: 'none',
                        background: 'transparent',
                        color: isContinuous ? '#fff' : 'var(--color-text-muted, #888)',
                        fontSize: '11px',
                        fontWeight: isContinuous ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'color 0.3s ease',
                        whiteSpace: 'nowrap',
                    }}
                >
                    <RefreshCcw size={12} color="currentColor" />
                    {isRTL ? 'مستمر' : 'Continuous'}
                </button>
            </div>

            {/* ── Mic Button with Glow Ring ── */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
                {/* Animated glow ring (only in continuous mode) */}
                {isContinuous && (
                    <div
                        className="voice-glow-ring"
                        style={{
                            position: 'absolute',
                            inset: '-4px',
                            borderRadius: '16px',
                            background: 'linear-gradient(135deg, #1A8A9E, #0ECFCF, #1A8A9E)',
                            backgroundSize: '200% 200%',
                            animation: 'voiceGlowSpin 2s linear infinite, voiceGlowPulse 2s ease-in-out infinite',
                            opacity: 0.6,
                            filter: 'blur(3px)',
                        }}
                    />
                )}
                <button
                    onClick={onStartListening}
                    aria-label={isContinuous
                        ? (isRTL ? 'ابدأ الاستماع المستمر' : 'Start continuous listening')
                        : (isRTL ? 'اضغط للتحدث' : 'Push to talk')
                    }
                    title={isContinuous
                        ? (isRTL ? 'ابدأ الاستماع المستمر' : 'Start continuous listening')
                        : (isRTL ? 'اضغط للتحدث' : 'Push to talk')
                    }
                    style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '44px',
                        height: '44px',
                        borderRadius: '14px',
                        border: isContinuous
                            ? '2px solid rgba(14, 207, 207, 0.5)'
                            : '1px solid var(--color-border, rgba(255,255,255,0.1))',
                        background: isContinuous
                            ? 'linear-gradient(135deg, rgba(26, 138, 158, 0.2), rgba(14, 207, 207, 0.12))'
                            : 'var(--bg-card, rgba(26, 138, 158, 0.08))',
                        color: isContinuous ? '#0ECFCF' : 'var(--color-text-muted, #666)',
                        fontSize: '18px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        padding: 0,
                        zIndex: 1,
                    }}
                    onMouseEnter={(e) => {
                        if (isContinuous) {
                            e.currentTarget.style.boxShadow = '0 0 20px rgba(14, 207, 207, 0.35), inset 0 0 12px rgba(14, 207, 207, 0.1)';
                            e.currentTarget.style.transform = 'scale(1.05)';
                        } else {
                            e.currentTarget.style.color = 'var(--color-accent, #1A8A9E)';
                            e.currentTarget.style.borderColor = 'rgba(26, 138, 158, 0.4)';
                            e.currentTarget.style.boxShadow = '0 0 12px rgba(26, 138, 158, 0.15)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (isContinuous) {
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.transform = 'scale(1)';
                        } else {
                            e.currentTarget.style.color = 'var(--color-text-muted, #666)';
                            e.currentTarget.style.borderColor = 'var(--color-border, rgba(255,255,255,0.1))';
                            e.currentTarget.style.boxShadow = 'none';
                        }
                    }}
                >
                    <Mic size={20} color="currentColor" />
                </button>
            </div>
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
