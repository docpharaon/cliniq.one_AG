import { BackButton } from '../../components/BackButton';
import { useTheme, type ThemeMode } from '@cliniqone/ui';
import { Moon, Sun, Monitor } from '@cliniqone/ui';
import { haptic } from '../../hooks/useHaptics';
import { t } from '@cliniqone/i18n';

export default function AppearancePage() {
    const { mode, setMode, isDark } = useTheme();

    const THEME_OPTIONS: { mode: ThemeMode; labelKey: string; Icon: React.FC<{ size?: number; color?: string }> }[] = [
        { mode: 'dark', labelKey: 'settings.themeDark', Icon: Moon },
        { mode: 'light', labelKey: 'settings.themeLight', Icon: Sun },
        { mode: 'system', labelKey: 'settings.themeSystem', Icon: Monitor },
    ];

    function handleSelect(newMode: ThemeMode) {
        haptic.select();
        setMode(newMode);
    }

    return (
        <div className="slide-in-page" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', transition: 'background-color 0.3s' }}>
            <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 20px 48px' }}>
                <BackButton />
                <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '20px 0 24px' }}>
                    {t('settings.appearanceTitle')}
                </h1>

                <div style={{
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: 14, padding: 18, border: '1px solid var(--border)',
                    marginBottom: 20,
                }}>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: '22px' }}>
                        {isDark ? '🌙' : '☀️'} {t('settings.themeSampleDesc')}
                    </p>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                    {THEME_OPTIONS.map(({ mode: m, labelKey, Icon }) => {
                        const isActive = mode === m;
                        return (
                            <button
                                key={m}
                                onClick={() => handleSelect(m)}
                                style={{
                                    flex: 1, padding: 16, borderRadius: 14, cursor: 'pointer',
                                    backgroundColor: isActive
                                        ? (isDark ? 'rgba(45, 212, 191, 0.1)' : 'rgba(26, 138, 158, 0.08)')
                                        : 'var(--bg-card)',
                                    border: `2px solid ${isActive ? 'var(--accent-teal)' : 'var(--border)'}`,
                                    textAlign: 'center',
                                    transition: 'all 0.2s',
                                }}
                            >
                                <Icon size={24} color={isActive ? 'var(--accent-teal)' : 'var(--text-tertiary)'} />
                                <p style={{
                                    fontSize: 13, margin: '8px 0 0', fontWeight: 600,
                                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                }}>{t(labelKey)}</p>
                                {isActive && (
                                    <p style={{ fontSize: 11, color: 'var(--accent-teal)', margin: '2px 0 0' }}>{t('settings.themeActive')}</p>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Preview Card */}
                <div style={{
                    marginTop: 24, borderRadius: 14, overflow: 'hidden',
                    border: '1px solid var(--border)',
                }}>
                    <div style={{
                        padding: 16, backgroundColor: 'var(--bg-card)',
                        borderBottom: '1px solid var(--border)',
                    }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>
                            {t('settings.themePreview')}
                        </p>
                    </div>
                    <div style={{ padding: 16, backgroundColor: 'var(--bg-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'var(--accent-teal-faded)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Sun size={20} color="var(--accent-teal)" />
                            </div>
                            <div>
                                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{t('settings.themeSampleCard')}</p>
                                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>{t('settings.themeSampleDesc')}</p>
                            </div>
                        </div>
                        <div style={{
                            backgroundColor: 'var(--bg-card)',
                            borderRadius: 10, padding: 12,
                            border: '1px solid var(--border)',
                        }}>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                                {isDark ? '🌙 ' + t('settings.themeDark') : '☀️ ' + t('settings.themeLight')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
