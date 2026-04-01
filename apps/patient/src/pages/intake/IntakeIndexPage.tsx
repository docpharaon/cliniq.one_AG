import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { t } from '@cliniqone/i18n';
import { useIntakeStore } from '../../stores/intakeStore';
import { useAuthStore } from '../../stores/authStore';
import { DisclaimerBanner } from '../../components/DisclaimerBanner';
import { FadeIn } from '../../components/FadeIn';
import { resolveLocum } from '../../services/aiService';
import { Stethoscope, Hospital, CheckCircle, XCircle, Bot, Camera, Doctor, ClipboardList } from '@cliniqone/ui';

export default function IntakeIndexPage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const reset = useIntakeStore(s => s.reset);
    const setLocumDoctor = useIntakeStore(s => s.setLocumDoctor);

    const [locumCode, setLocumCode] = useState('');
    const [locumLoading, setLocumLoading] = useState(false);
    const [locumError, setLocumError] = useState('');
    const [locumResolved, setLocumResolved] = useState<{ name: string; specialty: string } | null>(null);

    async function handleLocumCode(code: string) {
        setLocumCode(code);
        setLocumError('');
        setLocumResolved(null);

        if (code.trim().length < 3) return;

        setLocumLoading(true);
        try {
            const result = await resolveLocum(code.trim());
            if (result.found && result.doctor) {
                setLocumResolved({ name: result.doctor.display_name, specialty: result.doctor.specialty });
                setLocumDoctor(result.doctor, result.greetingPrompt || null);
            } else {
                setLocumError('Code not found. Please check and try again.');
                setLocumDoctor(null);
            }
        } catch {
            setLocumError('Failed to verify code.');
            setLocumDoctor(null);
        }
        setLocumLoading(false);
    }

    function handleStart() {
        reset();
        // Re-set locum if it was resolved (reset clears it)
        if (locumResolved && locumCode.trim()) {
            // Re-resolve will happen on AiChatPage init since we pass via URL or re-fetch
            // For now, just navigate — the locum state was already set before reset
            // We need to NOT reset if locum is set... let's handle differently:
        }
        navigate('/intake/ai-chat');
    }

    function handleStartWithLocum() {
        // Don't reset locum state — just navigate
        navigate('/intake/ai-chat');
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
            <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 20px 48px' }}>
                <FadeIn>
                    <div style={{ textAlign: 'center', paddingTop: 40, marginBottom: 32 }}>
                        <div style={{ marginBottom: 16 }}><Stethoscope size={56} color="#2DD4BF" /></div>
                        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
                            {t('intake.title')}
                        </h1>
                        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: '22px' }}>
                            {t('intake.description')}
                        </p>
                    </div>
                </FadeIn>

                <FadeIn delay={100}>
                    <DisclaimerBanner
                        message={t('intake.disclaimer')}
                        type="warning"
                    />
                </FadeIn>

                {/* Locum Code Input */}
                <FadeIn delay={150}>
                    <div style={{
                        margin: '20px 0 0', padding: '16px',
                        backgroundColor: 'var(--bg-card)', borderRadius: 14,
                        border: `1px solid ${locumResolved ? '#10B981' : locumError ? '#EF4444' : '#334155'}`,
                        transition: 'border-color 0.3s',
                    }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 8 }}>
                            <Hospital size={14} color="#94A3B8" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Doctor Code (optional)
                        </label>
                        <input
                            value={locumCode}
                            onChange={e => handleLocumCode(e.target.value.toUpperCase())}
                            placeholder="e.g. CQ-7284"
                            style={{
                                width: '100%', padding: '12px 14px', borderRadius: 10,
                                border: '1px solid #475569', backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-primary)', fontSize: 15, fontFamily: 'monospace',
                                letterSpacing: 2, outline: 'none', boxSizing: 'border-box',
                            }}
                        />
                        {locumLoading && (
                            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '8px 0 0' }}>Verifying code…</p>
                        )}
                        {locumResolved && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 8, marginTop: 10,
                                padding: '10px 12px', borderRadius: 10,
                                backgroundColor: '#10B98115', border: '1px solid #10B98130',
                            }}>
                                <CheckCircle size={18} color="#10B981" />
                                <div>
                                    <p style={{ fontSize: 14, fontWeight: 600, color: '#10B981', margin: 0 }}>
                                        Dr. {locumResolved.name}
                                    </p>
                                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                                        {locumResolved.specialty.replace(/_/g, ' ')} • Your intake will be routed to this doctor
                                    </p>
                                </div>
                            </div>
                        )}
                        {locumError && (
                            <p style={{ fontSize: 12, color: '#EF4444', margin: '8px 0 0' }}><XCircle size={12} color="#EF4444" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />{locumError}</p>
                        )}
                    </div>
                </FadeIn>

                <FadeIn delay={200}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
                        {[
                            { IconComp: Bot, title: t('intake.step1'), desc: t('intake.step1Desc') },
                            { IconComp: Camera, title: t('intake.step2'), desc: t('intake.step2Desc') },
                            { IconComp: Doctor, title: t('intake.step3'), desc: t('intake.step3Desc') },
                            { IconComp: ClipboardList, title: t('intake.step4'), desc: t('intake.step4Desc') },
                        ].map((step, i) => (
                            <div key={i} style={{
                                display: 'flex', alignItems: 'flex-start', gap: 14,
                                backgroundColor: 'var(--bg-card)', borderRadius: 12, padding: '14px 16px',
                                border: '1px solid var(--border)',
                            }}>
                                <step.IconComp size={24} color="#2DD4BF" />
                                <div>
                                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 2px' }}>{step.title}</p>
                                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>{step.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </FadeIn>

                <FadeIn delay={300}>
                    <button onClick={locumResolved ? handleStartWithLocum : handleStart} style={{
                        width: '100%', padding: '16px', borderRadius: 14, border: 'none',
                        backgroundColor: '#1A8A9E', color: '#fff', fontSize: 17, fontWeight: 700,
                        cursor: 'pointer', marginTop: 28,
                    }}>
                        {locumResolved
                            ? `Start Chat with Dr. ${locumResolved.name}`
                            : t('intake.startButton')
                        }
                    </button>
                </FadeIn>

                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 16, lineHeight: '16px' }}>
                    {t('intake.tokenCost')}
                </p>
            </div>
        </div>
    );
}
