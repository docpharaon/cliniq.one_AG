import { BackButton } from '../../components/BackButton';
import { useTheme, type ThemeMode } from '@cliniqone/ui';
import { Moon, Sun, Monitor } from '@cliniqone/ui';
import { haptic } from '../../hooks/useHaptics';
import { t } from '@cliniqone/i18n';

const THEME_OPTIONS: { mode: ThemeMode; label: string; Icon: React.FC<{ size?: number; color?: string }> }[] = [
    { mode: 'dark', label: 'Dark', Icon: Moon },
    { mode: 'light', label: 'Light', Icon: Sun },
    { mode: 'system', label: 'System', Icon: Monitor },
];

export default function AppearancePage() {
    const { mode, setMode, isDark, colors } = useTheme();

    function handleSelect(newMode: ThemeMode) {
        haptic.select();
        setMode(newMode);
    }

    return (
        <div className="slide-in-page" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary, #0B1120)', transition: 'background-color 0.3s' }}>
            <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 20px 48px' }}>
                <BackButton />
                <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary, #F1F5F9)', margin: '20px 0 24px' }}>
                    Appearance
                </h1>

                <div style={{
                    backgroundColor: 'var(--bg-card, #1E293B)',
                    borderRadius: 14, padding: 18, border: '1px solid var(--border, #334155)',
                    marginBottom: 20,
                }}>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary, #94A3B8)', margin: 0, lineHeight: '22px' }}>
                        Choose your preferred appearance. "System" will automatically match your device settings.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                    {THEME_OPTIONS.map(({ mode: m, label, Icon }) => {
                        const isActive = mode === m;
                        return (
                            <button
                                key={m}
                                onClick={() => handleSelect(m)}
                                style={{
                                    flex: 1, padding: 16, borderRadius: 14, cursor: 'pointer',
                                    backgroundColor: isActive
                                        ? (isDark ? 'rgba(45, 212, 191, 0.1)' : 'rgba(26, 138, 158, 0.08)')
                                        : 'var(--bg-card, #1E293B)',
                                    border: `2px solid ${isActive ? 'var(--accent-teal, #1A8A9E)' : 'var(--border, #334155)'}`,
                                    textAlign: 'center',
                                    transition: 'all 0.2s',
                                }}
                            >
                                <Icon size={24} color={isActive ? 'var(--accent-teal, #2DD4BF)' : 'var(--text-tertiary, #64748B)'} />
                                <p style={{
                                    fontSize: 13, margin: '8px 0 0', fontWeight: 600,
                                    color: isActive ? 'var(--text-primary, #F1F5F9)' : 'var(--text-secondary, #94A3B8)',
                                }}>{label}</p>
                                {isActive && (
                                    <p style={{ fontSize: 11, color: 'var(--accent-teal, #1A8A9E)', margin: '2px 0 0' }}>Active</p>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Preview Card */}
                <div style={{
                    marginTop: 24, borderRadius: 14, overflow: 'hidden',
                    border: '1px solid var(--border, #334155)',
                }}>
                    <div style={{
                        padding: 16, backgroundColor: 'var(--bg-card, #1E293B)',
                        borderBottom: '1px solid var(--border, #334155)',
                    }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary, #64748B)', margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>
                            Preview
                        </p>
                    </div>
                    <div style={{ padding: 16, backgroundColor: 'var(--bg-secondary, #111827)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'var(--accent-teal-faded, rgba(45,212,191,0.15))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Sun size={20} color="var(--accent-teal, #2DD4BF)" />
                            </div>
                            <div>
                                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #F1F5F9)', margin: 0 }}>Sample Card</p>
                                <p style={{ fontSize: 12, color: 'var(--text-secondary, #94A3B8)', margin: '2px 0 0' }}>This shows the current appearance</p>
                            </div>
                        </div>
                        <div style={{
                            backgroundColor: 'var(--bg-card, #1E293B)',
                            borderRadius: 10, padding: 12,
                            border: '1px solid var(--border, #334155)',
                        }}>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary, #94A3B8)', margin: 0 }}>
                                {isDark ? '🌙 Dark mode is active' : '☀️ Light mode is active'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
