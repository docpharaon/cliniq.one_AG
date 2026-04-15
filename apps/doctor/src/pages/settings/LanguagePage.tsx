import { useState } from 'react';
import { colors, typography, Globe } from '@cliniqone/ui';
import { setLocale, getLocale, useI18n } from '@cliniqone/i18n';
import { haptic } from '../../hooks/useHaptics';
import { BackButton } from '../../components/BackButton';
import type { CSSProperties } from 'react';

const LANGUAGES = [
    { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
    { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', flag: '🇸🇦' },
];

export function LanguagePage() {
    const [selected, setSelected] = useState<'en' | 'ar'>(getLocale() as 'en' | 'ar');
    const { t, isRTL } = useI18n();

    const handleSelect = async (code: 'en' | 'ar') => {
        haptic.medium();
        setSelected(code);
        await setLocale(code);
        // Reload to apply RTL/LTR and re-render all i18n keys
        window.location.reload();
    };

    return (
        <div style={s.container} className="slide-in-page">
            <div style={{ ...s.header, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                <BackButton />
                <span style={s.title}>{t('common.language')}</span>
            </div>

            <div style={s.content}>
                <div style={s.icon}>
                    <Globe size={32} color={colors.accentTeal} />
                </div>
                <p style={s.desc}>{t('settings.languageDesc')}</p>

                <div style={s.list}>
                    {LANGUAGES.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => handleSelect(lang.code as 'en' | 'ar')}
                            style={{
                                ...s.langCard,
                                flexDirection: isRTL ? 'row-reverse' : 'row',
                                borderColor: selected === lang.code ? colors.accentTeal : colors.border,
                                backgroundColor: selected === lang.code ? colors.accentTealFaded : 'transparent',
                            }}
                            className="pressable"
                        >
                            <span style={{ fontSize: 28 }}>{lang.flag}</span>
                            <div style={{ flex: 1, textAlign: isRTL ? 'right' : 'left' }}>
                                <span style={{ fontSize: 15, fontWeight: 600, color: colors.textPrimary, display: 'block' }}>{lang.label}</span>
                                <span style={{ fontSize: 13, color: colors.textTertiary }}>{lang.nativeLabel}</span>
                            </div>
                            {selected === lang.code && (
                                <div style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: colors.accentTeal, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

const s: Record<string, CSSProperties> = {
    container: { display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: colors.bgPrimary },
    header: { display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: `1px solid ${colors.border}` },
    title: { fontSize: typography.h3.fontSize, fontWeight: 700, color: colors.textPrimary },
    content: { padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' },
    icon: { width: 64, height: 64, borderRadius: 16, backgroundColor: colors.accentTealFaded, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    desc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 28 },
    list: { width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 12 },
    langCard: {
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '16px 20px', borderRadius: 14,
        border: `2px solid ${colors.border}`,
        cursor: 'pointer', width: '100%', textAlign: 'left', background: 'none',
        transition: 'border-color 0.2s, background-color 0.2s',
    },
};
