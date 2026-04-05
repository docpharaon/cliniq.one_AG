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
        return (
            <div className="voice-listening-bar" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                padding: '14px 16px',
                borderRadius: '16px',
                background: 'rgba(26, 138, 158, 0.06)',
                border: '1px solid rgba(26, 138, 158, 0.2)',
                animation: 'fadeIn 0.2s ease',
            }}>
                {/* Top row: recording indicator + duration */}
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
                            background: '#ef4444',
                            animation: 'pulse 1.5s ease infinite',
                        }} />
                        <span style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'var(--color-accent, #1A8A9E)',
                        }}>
                            {isRTL ? '...جارٍ الاستماع' : 'Listening...'}
                        </span>
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
                        color="#1A8A9E"
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
                            border: '1px solid rgba(26, 138, 158, 0.3)',
                            background: 'rgba(26, 138, 158, 0.1)',
                            color: 'var(--color-accent, #1A8A9E)',
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
    return (
        <div className="voice-idle-controls" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
        }}>
            {/* Mode toggle (small pill) */}
            <button
                onClick={() => onSetVoiceMode(voiceMode === 'push_to_talk' ? 'auto_mic' : 'push_to_talk')}
                title={voiceMode === 'push_to_talk'
                    ? (isRTL ? 'تبديل إلى الاستماع التلقائي' : 'Switch to auto-listen')
                    : (isRTL ? 'تبديل إلى اضغط للتحدث' : 'Switch to push-to-talk')
                }
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border, rgba(255,255,255,0.1))',
                    background: voiceMode === 'auto_mic'
                        ? 'rgba(26, 138, 158, 0.15)'
                        : 'transparent',
                    color: voiceMode === 'auto_mic'
                        ? 'var(--color-accent, #1A8A9E)'
                        : 'var(--color-text-muted, #666)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    padding: 0,
                }}
                aria-label={voiceMode === 'push_to_talk'
                    ? (isRTL ? 'تبديل إلى الاستماع التلقائي' : 'Switch to auto-listen')
                    : (isRTL ? 'تبديل إلى اضغط للتحدث' : 'Switch to push-to-talk')
                }
            >
                {voiceMode === 'auto_mic' ? <RefreshCcw size={14} color="currentColor" /> : <PointerFinger size={14} color="currentColor" />}
            </button>

            {/* Mic Button — rounded square like admin */}
            <button
                onClick={onStartListening}
                aria-label={isRTL ? 'اضغط للتحدث' : 'Push to talk'}
                title={isRTL ? 'اضغط للتحدث' : 'Push to talk'}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    border: '1px solid var(--color-border, rgba(255,255,255,0.1))',
                    background: 'var(--bg-card, rgba(26, 138, 158, 0.08))',
                    color: 'var(--color-text-muted, #666)',
                    fontSize: '18px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    padding: 0,
                    flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--color-accent, #1A8A9E)';
                    e.currentTarget.style.borderColor = 'rgba(26, 138, 158, 0.4)';
                    e.currentTarget.style.boxShadow = '0 0 12px rgba(26, 138, 158, 0.15)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--color-text-muted, #666)';
                    e.currentTarget.style.borderColor = 'var(--color-border, rgba(255,255,255,0.1))';
                    e.currentTarget.style.boxShadow = 'none';
                }}
            >
                <Mic size={18} color="currentColor" />
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
