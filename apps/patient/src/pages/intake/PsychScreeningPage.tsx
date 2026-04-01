import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { t } from '@cliniqone/i18n';
import { useIntakeStore } from '../../stores/intakeStore';
import { BackButton } from '../../components/BackButton';

const PHQ2_QUESTIONS = [
    'Over the past 2 weeks, how often have you been bothered by little interest or pleasure in doing things?',
    'Over the past 2 weeks, how often have you been bothered by feeling down, depressed, or hopeless?',
];
const ANSWERS = ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'];

export default function PsychScreeningPage() {
    const navigate = useNavigate();
    const { addQA } = useIntakeStore();
    const [currentQ, setCurrentQ] = useState(0);
    const [scores, setScores] = useState<number[]>([]);

    function handleAnswer(answerIdx: number) {
        const s = [...scores, answerIdx];
        setScores(s);
        addQA(PHQ2_QUESTIONS[currentQ], `${ANSWERS[answerIdx]} (score: ${answerIdx})`);

        if (currentQ + 1 < PHQ2_QUESTIONS.length) {
            setCurrentQ(currentQ + 1);
        } else {
            const totalScore = s.reduce((a, b) => a + b, 0);
            // PHQ-2: score ≥ 3 suggests further screening
            navigate('/intake/review');
        }
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
            <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 20px 48px' }}>
                <BackButton />
                <div style={{ height: 4, backgroundColor: 'var(--bg-card)', borderRadius: 2, margin: '16px 0 24px' }}>
                    <div style={{ height: 4, width: `${((currentQ + 1) / PHQ2_QUESTIONS.length) * 100}%`, backgroundColor: '#8B5CF6', borderRadius: 2 }} />
                </div>

                <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>🧠 Mental Health Screening</h1>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 24px' }}>PHQ-2 Screening (Question {currentQ + 1} of {PHQ2_QUESTIONS.length})</p>

                <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 14, padding: 18, marginBottom: 20, border: '1px solid var(--border)' }}>
                    <p style={{ fontSize: 16, color: 'var(--text-primary)', margin: 0, lineHeight: '24px' }}>{PHQ2_QUESTIONS[currentQ]}</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {ANSWERS.map((ans, i) => (
                        <button key={i} onClick={() => handleAnswer(i)} style={{
                            padding: '14px 16px', borderRadius: 12, border: '1px solid var(--border)',
                            backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 14,
                            cursor: 'pointer', textAlign: 'left',
                        }}>{ans}</button>
                    ))}
                </div>

                <div style={{ backgroundColor: '#8B5CF620', borderRadius: 10, padding: '10px 14px', marginTop: 20 }}>
                    <p style={{ fontSize: 12, color: '#8B5CF6', margin: 0 }}>🔒 Your responses are confidential and only shared with your assigned doctor.</p>
                </div>
            </div>
        </div>
    );
}
