import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { t } from '@cliniqone/i18n';
import { useIntakeStore } from '../../stores/intakeStore';
import { useAuthStore } from '../../stores/authStore';
import { FadeIn } from '../../components/FadeIn';
import { resolveLocum } from '../../services/aiService';
import { Stethoscope, Hospital, CheckCircle, XCircle, Camera, Doctor, ClipboardList, Shield } from '@cliniqone/ui';

export default function IntakeIndexPage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const reset = useIntakeStore(s => s.reset);
    const setLocumDoctor = useIntakeStore(s => s.setLocumDoctor);

    const [locumCode, setLocumCode] = useState('');
    const [locumLoading, setLocumLoading] = useState(false);
    const [locumError, setLocumError] = useState('');
    const [locumResolved, setLocumResolved] = useState<{ name: string; specialty: string } | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    function handleLocumCode(code: string) {
        setLocumCode(code);
        setLocumError('');
        setLocumResolved(null);

        if (code.trim().length < 3) return;

        // Debounce: wait 500ms after last keystroke before calling API
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
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
        }, 500);
    }

    function handleStart() {
        reset();
        navigate('/intake/ai-chat');
    }

    function handleStartWithLocum() {
        // Save locum state, reset everything else, then restore locum
        const savedDoctor = useIntakeStore.getState().locumDoctor;
        const savedGreeting = useIntakeStore.getState().locumGreetingPrompt;
        reset();
        if (savedDoctor) {
            setLocumDoctor(savedDoctor, savedGreeting);
        }
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
                    <div style={{
                        display: 'flex', alignItems: 'flex-start', gap: 12,
                        padding: '14px 16px',
                        background: 'linear-gradient(135deg, rgba(26,138,158,0.08) 0%, rgba(45,212,191,0.06) 100%)',
                        borderRadius: 14,
                        border: '1px solid rgba(26,138,158,0.15)',
                        marginBottom: 12,
                    }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: 10,
                            background: 'rgba(26,138,158,0.12)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            <Shield size={18} color="#1A8A9E" />
                        </div>
                        <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#1A8A9E', margin: '0 0 3px' }}>
                                {t('intake.disclaimerTitle')}
                            </p>
                            <p style={{ fontSize: 12, lineHeight: '18px', color: 'var(--text-secondary)', margin: 0 }}>
                                {t('intake.disclaimer')}
                            </p>
                        </div>
                    </div>
                </FadeIn>

                {/* Doctor Code Input */}
                <FadeIn delay={150}>
                    <div style={{
                        margin: '20px 0 0', padding: '16px 16px 14px',
                        backgroundColor: locumResolved ? '#10B98110' : '#F59E0B08',
                        borderRadius: 14,
                        border: `1.5px dashed ${locumResolved ? '#10B981' : locumError ? '#EF4444' : '#F59E0B60'}`,
                        transition: 'border-color 0.3s, background-color 0.3s',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <div style={{
                                width: 28, height: 28, borderRadius: 8,
                                backgroundColor: '#F59E0B20',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Hospital size={16} color="#F59E0B" />
                            </div>
                            <div>
                                <p style={{ fontSize: 13, fontWeight: 700, color: '#F59E0B', margin: 0 }}>
                                    {t('intake.doctorCodeTitle')}
                                </p>
                                <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '1px 0 0' }}>
                                    {t('intake.doctorCodeHint')}
                                </p>
                            </div>
                        </div>
                        <input
                            value={locumCode}
                            onChange={e => handleLocumCode(e.target.value.toUpperCase())}
                            placeholder="CQ-XXXX"
                            style={{
                                width: '100%', padding: '12px 14px', borderRadius: 10,
                                border: `1.5px solid ${locumResolved ? '#10B98140' : locumError ? '#EF444440' : '#F59E0B30'}`,
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-primary)', fontSize: 16, fontFamily: 'monospace',
                                letterSpacing: 3, outline: 'none', boxSizing: 'border-box',
                                textAlign: 'center', fontWeight: 700,
                                transition: 'border-color 0.3s',
                            }}
                        />
                        {locumLoading && (
                            <p style={{ fontSize: 12, color: '#F59E0B', margin: '8px 0 0', textAlign: 'center' }}>Verifying code…</p>
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
                                        {locumResolved.specialty.replace(/_/g, ' ')} • {t('intake.doctorCodeRouted')}
                                    </p>
                                </div>
                            </div>
                        )}
                        {locumError && (
                            <p style={{ fontSize: 12, color: '#EF4444', margin: '8px 0 0', textAlign: 'center' }}><XCircle size={12} color="#EF4444" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />{locumError}</p>
                        )}
                    </div>
                </FadeIn>

                <FadeIn delay={200}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
                        {[
                            { IconComp: Stethoscope, title: t('intake.step1'), desc: t('intake.step1Desc') },
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
