import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { t } from '@cliniqone/i18n';
import { useIntakeStore } from '../../stores/intakeStore';
import { BackButton } from '../../components/BackButton';

// Additional structured questions beyond the AI interview
const QUESTION_SETS: Record<string, { question: string; type: 'yesno' | 'select' | 'text'; options?: string[] }[]> = {
    default: [
        { question: 'Have you experienced these symptoms before?', type: 'yesno' },
        { question: 'How would you rate your pain level?', type: 'select', options: ['No pain', 'Mild', 'Moderate', 'Severe', 'Very Severe'] },
        { question: 'Any recent travel outside the country?', type: 'yesno' },
        { question: 'Do you smoke or use tobacco?', type: 'yesno' },
    ],
};

export default function QuestionsPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { specialty, addQA } = useIntakeStore();
    const questions = QUESTION_SETS[specialty] || QUESTION_SETS.default;
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [currentIdx, setCurrentIdx] = useState(0);

    function handleAnswer(answer: string) {
        setAnswers(prev => ({ ...prev, [currentIdx]: answer }));
        addQA(questions[currentIdx].question, answer);
        if (currentIdx + 1 < questions.length) {
            setCurrentIdx(currentIdx + 1);
        } else {
            navigate('/intake/medications');
        }
    }

    const q = questions[currentIdx];

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
            <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 20px 48px' }}>
                <BackButton />
                <div style={{ height: 4, backgroundColor: 'var(--bg-card)', borderRadius: 2, margin: '16px 0 24px' }}>
                    <div style={{ height: 4, width: `${((currentIdx + 1) / questions.length) * 40 + 30}%`, backgroundColor: '#1A8A9E', borderRadius: 2 }} />
                </div>

                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>
                    Question {currentIdx + 1} of {questions.length}
                </p>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 24px' }}>
                    {q.question}
                </h2>

                {q.type === 'yesno' && (
                    <div style={{ display: 'flex', gap: 12 }}>
                        {['Yes', 'No'].map(opt => (
                            <button key={opt} onClick={() => handleAnswer(opt)} style={{
                                flex: 1, padding: '16px', borderRadius: 14, border: '1px solid var(--border)',
                                backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 16, fontWeight: 600, cursor: 'pointer',
                            }}>{opt}</button>
                        ))}
                    </div>
                )}

                {q.type === 'select' && q.options && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {q.options.map(opt => (
                            <button key={opt} onClick={() => handleAnswer(opt)} style={{
                                padding: '14px 16px', borderRadius: 12, border: '1px solid var(--border)',
                                backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 14, cursor: 'pointer', textAlign: 'left',
                            }}>{opt}</button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
