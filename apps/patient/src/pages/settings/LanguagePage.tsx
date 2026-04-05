import { setLocale, useLocale } from '@cliniqone/i18n';
import { BackButton } from '../../components/BackButton';
import { CheckCircle } from '@cliniqone/ui';

export default function LanguagePage() {
    const lang = useLocale();

    async function handleChange(newLang: 'en' | 'ar') {
        await setLocale(newLang);
    }

    return (
        <div className="slide-in-page" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
            <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 20px 48px' }}>
                <BackButton />
                <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '20px 0 24px' }}>Language / اللغة</h1>
                {[
                    { code: 'en' as const, label: 'English', flag: '🇬🇧' },
                    { code: 'ar' as const, label: 'العربية', flag: '🇸🇦' },
                ].map(l => (
                    <button key={l.code} onClick={() => handleChange(l.code)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 14, width: '100%',
                            padding: '16px', borderRadius: 14, marginBottom: 8, cursor: 'pointer',
                            backgroundColor: 'var(--bg-card)', border: `2px solid ${lang === l.code ? '#1A8A9E' : '#334155'}`,
                        }}>
                        <span style={{ fontSize: 24 }}>{l.flag}</span>
                        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', flex: 1, textAlign: 'left' }}>{l.label}</span>
                        {lang === l.code && <CheckCircle size={16} color="#1A8A9E" />}
                    </button>
                ))}
            </div>
        </div>
    );
}
