import { useState, useEffect, useCallback } from 'react';
import { isRTL, getLocale } from '@cliniqone/i18n';
import logoImg from '../../assets/logo.png';
import type { CSSProperties } from 'react';

/**
 * PermissionGate — Friendly, step-by-step permission request overlay.
 *
 * Appears before the AI Chat to proactively request microphone and camera
 * permissions with clear explanations. Supports skip (text-only fallback).
 * Caches grant state in localStorage to avoid re-prompting.
 */

type PermissionStep = 'mic' | 'camera';
type PermissionStatus = 'prompt' | 'granted' | 'denied' | 'unsupported';

const CACHE_KEY = 'cliniq_permissions_checked';

interface PermissionGateProps {
    children: React.ReactNode;
    /** If true, camera step is included. Default: true */
    requireCamera?: boolean;
}

export function PermissionGate({ children, requireCamera = true }: PermissionGateProps) {
    const [gateActive, setGateActive] = useState(false);
    const [currentStep, setCurrentStep] = useState<PermissionStep>('mic');
    const [micStatus, setMicStatus] = useState<PermissionStatus>('prompt');
    const [cameraStatus, setCameraStatus] = useState<PermissionStatus>('prompt');
    const [requesting, setRequesting] = useState(false);
    const [initialized, setInitialized] = useState(false);

    const rtl = isRTL();
    const lang = getLocale();
    const isArabic = lang === 'ar';

    const steps: PermissionStep[] = requireCamera ? ['mic', 'camera'] : ['mic'];
    const currentStepIndex = steps.indexOf(currentStep);
    const totalSteps = steps.length;

    // ── Check if we've already done the permission flow ──
    useEffect(() => {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            // Already done — skip gate
            setGateActive(false);
            setInitialized(true);
            return;
        }

        // Check current permission states
        (async () => {
            try {
                const mic = await queryPermission('microphone');
                setMicStatus(mic);

                let cam: PermissionStatus = 'prompt';
                if (requireCamera) {
                    cam = await queryPermission('camera');
                    setCameraStatus(cam);
                }

                // If all already granted, skip the gate
                const allGranted = mic === 'granted' && (!requireCamera || cam === 'granted');
                if (allGranted) {
                    localStorage.setItem(CACHE_KEY, Date.now().toString());
                    setGateActive(false);
                } else {
                    // Determine which step to start on
                    if (mic === 'granted' && requireCamera && cam !== 'granted') {
                        setCurrentStep('camera');
                    }
                    setGateActive(true);
                }
            } catch {
                // Permission API not supported — show gate anyway
                setGateActive(true);
            }

            setInitialized(true);
        })();
    }, [requireCamera]);

    async function queryPermission(name: string): Promise<PermissionStatus> {
        try {
            if (!navigator.permissions?.query) return 'prompt';
            const result = await navigator.permissions.query({ name: name as PermissionName });
            if (result.state === 'granted') return 'granted';
            if (result.state === 'denied') return 'denied';
            return 'prompt';
        } catch {
            return 'prompt';
        }
    }

    // ── Request permission ──
    const handleAllow = useCallback(async () => {
        setRequesting(true);

        try {
            if (currentStep === 'mic') {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach(t => t.stop());
                setMicStatus('granted');
                advanceStep();
            } else if (currentStep === 'camera') {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                stream.getTracks().forEach(t => t.stop());
                setCameraStatus('granted');
                advanceStep();
            }
        } catch (err: any) {
            if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
                if (currentStep === 'mic') setMicStatus('denied');
                else setCameraStatus('denied');
            } else {
                if (currentStep === 'mic') setMicStatus('unsupported');
                else setCameraStatus('unsupported');
            }
        } finally {
            setRequesting(false);
        }
    }, [currentStep]);

    function advanceStep() {
        const nextIdx = currentStepIndex + 1;
        if (nextIdx >= totalSteps) {
            finishGate();
        } else {
            setCurrentStep(steps[nextIdx]);
        }
    }

    function handleSkip() {
        advanceStep();
    }

    // ── Open native app settings or show instructions ──
    const handleOpenSettings = useCallback(async () => {
        try {
            const { Browser } = await import('@capacitor/browser');
            // Android intent URL to open this app's permission settings
            await Browser.open({
                url: 'package:com.cliniqone.patient.cap',
                toolbarColor: '#0B1120',
            });
        } catch {
            // Web/fallback — clear instructions
            alert(
                isArabic
                    ? 'افتح إعدادات المتصفح أو التطبيق → الأذونات → فعّل الميكروفون والكاميرا'
                    : 'Open your browser or app Settings → Permissions → Enable Microphone & Camera'
            );
        }
    }, [isArabic]);

    // ── Reset denied status so the native dialog can re-appear ──
    const handleRetry = useCallback(async () => {
        if (currentStep === 'mic') setMicStatus('prompt');
        else setCameraStatus('prompt');
        // Slight delay then re-trigger
        setTimeout(() => handleAllow(), 200);
    }, [currentStep, handleAllow]);

    function finishGate() {
        localStorage.setItem(CACHE_KEY, Date.now().toString());
        setGateActive(false);
    }

    // Wait for initialization
    if (!initialized) return null;

    // Gate not active — render children
    if (!gateActive) return <>{children}</>;

    const stepStatus = currentStep === 'mic' ? micStatus : cameraStatus;
    const isDenied = stepStatus === 'denied';

    const stepConfig = {
        mic: {
            icon: (
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#1A8A9E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
            ),
            title: isArabic ? 'تفعيل الميكروفون' : 'Enable Microphone',
            description: isArabic
                ? 'نحتاج إلى الوصول إلى الميكروفون حتى يتمكن طبيب الذكاء الاصطناعي من الاستماع إلى وصف أعراضك صوتياً'
                : 'We need microphone access so our AI doctor can listen to you describe your symptoms by voice',
            deniedMessage: isArabic
                ? 'تم رفض الوصول. يرجى تفعيل الميكروفون من إعدادات التطبيق أو المتصفح.'
                : 'Access was denied. Please enable microphone in your app or browser settings.',
            skipLabel: isArabic ? 'تخطي — سأكتب فقط' : 'Skip — I\'ll type instead',
        },
        camera: {
            icon: (
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#1A8A9E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                </svg>
            ),
            title: isArabic ? 'تفعيل الكاميرا' : 'Enable Camera',
            description: isArabic
                ? 'نحتاج إلى الوصول إلى الكاميرا لتتمكن من التقاط صور للحالات الجلدية أو ملصقات الأدوية'
                : 'We need camera access so you can share photos of skin conditions or medication labels',
            deniedMessage: isArabic
                ? 'تم رفض الوصول. يرجى تفعيل الكاميرا من إعدادات التطبيق أو المتصفح.'
                : 'Access was denied. Please enable camera in your app or browser settings.',
            skipLabel: isArabic ? 'تخطي — لن أحتاج الكاميرا' : 'Skip — I won\'t need the camera',
        },
    };

    const step = stepConfig[currentStep];

    return (
        <div className="permission-gate-overlay" style={{ ...st.container, direction: rtl ? 'rtl' : 'ltr' }}>
            {/* Ambient glow */}
            <div style={st.ambientGlow} />

            <div className="fade-in" style={st.content}>
                {/* Logo */}
                <img src={logoImg} alt="cliniq.one" style={st.logo} />

                {/* Permission Card */}
                <div className="permission-gate-card" style={st.card}>
                    {/* Icon circle */}
                    <div className={`permission-gate-icon ${isDenied ? '' : 'pulse-glow'}`} style={{
                        ...st.iconCircle,
                        borderColor: isDenied ? 'rgba(220, 38, 38, 0.2)' : 'rgba(26, 138, 158, 0.2)',
                        backgroundColor: isDenied ? 'rgba(220, 38, 38, 0.06)' : 'rgba(26, 138, 158, 0.06)',
                    }}>
                        {isDenied ? (
                            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="15" y1="9" x2="9" y2="15" />
                                <line x1="9" y1="9" x2="15" y2="15" />
                            </svg>
                        ) : step.icon}
                    </div>

                    {/* Title */}
                    <h2 style={st.title}>{isDenied ? (isArabic ? 'تم رفض الوصول' : 'Access Denied') : step.title}</h2>

                    {/* Description */}
                    <p style={st.description}>
                        {isDenied ? step.deniedMessage : step.description}
                    </p>

                    {/* Action buttons */}
                    {!isDenied ? (
                        <>
                            <button
                                id={`permission-allow-${currentStep}`}
                                onClick={handleAllow}
                                disabled={requesting}
                                style={{
                                    ...st.allowButton,
                                    opacity: requesting ? 0.6 : 1,
                                    cursor: requesting ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {requesting ? (
                                    <span className="spinner" style={{ width: 20, height: 20, borderTopColor: '#fff' }} />
                                ) : (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                        <polyline points="22 4 12 14.01 9 11.01" />
                                    </svg>
                                )}
                                <span>{isArabic ? 'تفعيل الوصول' : 'Enable Access'}</span>
                            </button>

                            <button
                                id={`permission-skip-${currentStep}`}
                                onClick={handleSkip}
                                style={st.skipButton}
                            >
                                {step.skipLabel}
                            </button>
                        </>
                    ) : (
                        <>
                            {/* Open Settings — deep link */}
                            <button
                                id={`permission-settings-${currentStep}`}
                                onClick={handleOpenSettings}
                                style={st.allowButton}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                    <circle cx="12" cy="12" r="3" />
                                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                                </svg>
                                <span>{isArabic ? 'فتح الإعدادات' : 'Open Settings'}</span>
                            </button>

                            {/* Try Again */}
                            <button
                                id={`permission-retry-${currentStep}`}
                                onClick={handleRetry}
                                style={st.retryButton}
                            >
                                {isArabic ? '🔄 حاول مرة أخرى' : '🔄 Try Again'}
                            </button>

                            {/* Continue without */}
                            <button
                                id={`permission-continue-${currentStep}`}
                                onClick={handleSkip}
                                style={st.skipButton}
                            >
                                {isArabic ? 'متابعة بدون' : 'Continue without'}
                            </button>
                        </>
                    )}
                </div>

                {/* Progress dots */}
                <div style={st.dotsRow}>
                    {steps.map((s, i) => (
                        <span
                            key={s}
                            style={{
                                ...st.dot,
                                backgroundColor: i === currentStepIndex ? '#1A8A9E' : 'rgba(148, 163, 184, 0.3)',
                                width: i === currentStepIndex ? 24 : 8,
                            }}
                        />
                    ))}
                </div>

                {/* Step counter */}
                <p style={st.stepLabel}>
                    {isArabic
                        ? `الخطوة ${currentStepIndex + 1} من ${totalSteps}`
                        : `Step ${currentStepIndex + 1} of ${totalSteps}`}
                </p>
            </div>
        </div>
    );
}

const st: Record<string, CSSProperties> = {
    container: {
        position: 'fixed',
        inset: 0,
        zIndex: 99997,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0B1120',
        overflow: 'hidden',
    },
    ambientGlow: {
        position: 'absolute',
        bottom: '-20%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '140%',
        height: '50%',
        background: 'radial-gradient(ellipse at center, rgba(26, 138, 158, 0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
    },
    content: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '0 24px',
        textAlign: 'center',
        zIndex: 2,
        maxWidth: 400,
        width: '100%',
    },
    logo: {
        width: 56,
        height: 56,
        objectFit: 'contain',
        marginBottom: 28,
        opacity: 0.7,
    },
    card: {
        width: '100%',
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        border: '1px solid rgba(148, 163, 184, 0.1)',
        borderRadius: 20,
        padding: '32px 24px 28px',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
    },
    iconCircle: {
        width: 96,
        height: 96,
        borderRadius: '50%',
        border: '2px solid',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 20px',
    },
    title: {
        fontSize: 20,
        fontWeight: 700,
        color: '#F1F5F9',
        marginBottom: 10,
        letterSpacing: -0.3,
    },
    description: {
        fontSize: 14,
        color: '#94A3B8',
        lineHeight: '22px',
        marginBottom: 24,
    },
    allowButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        width: '100%',
        padding: '14px 24px',
        borderRadius: 14,
        border: 'none',
        background: 'linear-gradient(135deg, #0F766E 0%, #1A8A9E 100%)',
        color: '#fff',
        fontSize: 16,
        fontWeight: 700,
        letterSpacing: 0.2,
        transition: 'opacity 0.2s, transform 0.1s',
        boxShadow: '0 4px 16px rgba(26, 138, 158, 0.25)',
        marginBottom: 12,
    },
    skipButton: {
        background: 'none',
        border: 'none',
        color: '#64748B',
        fontSize: 14,
        fontWeight: 500,
        cursor: 'pointer',
        padding: '8px 16px',
        transition: 'color 0.2s',
    },
    retryButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        padding: '12px 24px',
        borderRadius: 14,
        border: '1px solid rgba(26, 138, 158, 0.3)',
        background: 'rgba(26, 138, 158, 0.08)',
        color: '#2DD4BF',
        fontSize: 15,
        fontWeight: 600,
        cursor: 'pointer',
        marginBottom: 8,
    },
    dotsRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 28,
    },
    dot: {
        height: 8,
        borderRadius: 4,
        transition: 'all 0.3s ease',
    },
    stepLabel: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 10,
        letterSpacing: 0.5,
        fontWeight: 500,
    },
};
