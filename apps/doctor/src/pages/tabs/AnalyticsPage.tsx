import { useState, useCallback } from 'react';
import { colors, typography, BarChart, Gem, Calendar, ClipboardList, Star, Target, Zap, CreditCard } from '@cliniqone/ui';
import type { CliniqIconProps } from '@cliniqone/ui';
import { useAuthStore } from '../../stores/authStore';
import { useDoctorStats } from '../../hooks/useDoctorData';
import { BrandSpinner } from '../../components/BrandSpinner';
import { PullToRefresh } from '../../components/PullToRefresh';
import type { CSSProperties, ReactNode } from 'react';

function BonusRow({ Icon, label, reward, progress }: { Icon: (p: CliniqIconProps) => ReactNode; label: string; reward: string; progress: number }) {
    return (
        <div style={s.bonusRow}>
            <span style={{ marginRight: 10, display: 'flex' }}><Icon size={20} color={colors.accentTeal} /></span>
            <div style={{ flex: 1, marginRight: 10 }}>
                <span style={{ fontSize: 11, color: colors.textPrimary, display: 'block', marginBottom: 4 }}>{label}</span>
                <div style={s.progressBg}>
                    <div style={{ ...s.progressBar, width: `${progress}%` }} />
                </div>
            </div>
            <span style={{ fontSize: 11, color: colors.gold, fontWeight: 600 }}>{reward}</span>
        </div>
    );
}

export function AnalyticsPage() {
    const { doctor } = useAuthStore();
    const { data: stats, isLoading, refetch } = useDoctorStats(doctor?.id || '');

    const onRefresh = useCallback(async () => { await refetch(); }, [refetch]);

    const tokensEarned = stats?.tokens_earned ?? 0;
    const sarAmount = tokensEarned * 5;
    const usdAmount = Math.round(sarAmount / 3.75);
    const completedToday = stats?.consultations_today ?? 0;
    const ratingAvg = stats?.rating_avg ?? 0;
    const ratingCount = stats?.rating_count ?? 0;

    return (
        <PullToRefresh onRefresh={onRefresh}>
        <div style={s.container} className="scrollable">
            <div style={s.scroll}>
                <span style={{ ...s.title, display: 'inline-flex', alignItems: 'center', gap: 8 }}><BarChart size={22} color={colors.textPrimary} /> Earnings & Performance</span>

                {isLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
                        <BrandSpinner fullScreen={false} />
                    </div>
                ) : (
                    <>
                        {/* Lifetime Earnings */}
                        <div style={s.summaryCard}>
                            <span style={{ fontSize: 11, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 8 }}>Lifetime Earnings</span>
                            <span style={{ fontSize: typography.h1.fontSize, fontWeight: 800, color: colors.gold, display: 'flex', alignItems: 'center', gap: 6 }}><Gem size={24} color={colors.gold} /> {tokensEarned.toLocaleString()}</span>
                            <span style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4, display: 'block' }}>{sarAmount.toLocaleString()} SAR · ${usdAmount.toLocaleString()} USD</span>
                        </div>

                        {/* Today */}
                        <div style={s.section}>
                            <span style={{ ...s.sectionTitle, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Calendar size={16} color={colors.textPrimary} /> Today</span>
                            <div style={s.chartCard}>
                                <div style={s.todayRow}>
                                    {[
                                        { val: completedToday, label: 'Cases Seen' },
                                        { val: stats?.daily_limit ?? 10, label: 'Daily Limit' },
                                        { val: Math.max(0, (stats?.daily_limit ?? 10) - completedToday), label: 'Remaining' },
                                    ].map((item) => (
                                        <div key={item.label} style={{ flex: 1, textAlign: 'center' }}>
                                            <span style={{ fontSize: typography.h2.fontSize, fontWeight: 800, color: colors.accentTeal, display: 'block' }}>{item.val}</span>
                                            <span style={{ fontSize: 11, color: colors.textTertiary, marginTop: 4, display: 'block' }}>{item.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Performance */}
                        <div style={s.section}>
                            <span style={{ ...s.sectionTitle, display: 'inline-flex', alignItems: 'center', gap: 6 }}><BarChart size={16} color={colors.textPrimary} /> Performance</span>
                            <div style={s.perfGrid}>
                                {([
                                    { Icon: ClipboardList, val: completedToday, label: "Today's Cases", sub: '' },
                                    { Icon: Star, val: ratingAvg.toFixed(1), label: 'Rating', sub: `${ratingCount} reviews` },
                                    { Icon: Gem, val: tokensEarned, label: 'Total Tokens', sub: '' },
                                    { Icon: Target, val: stats?.daily_limit ?? 10, label: 'Daily Limit', sub: '' },
                                ] as { Icon: (p: CliniqIconProps) => ReactNode; val: string | number; label: string; sub: string }[]).map((p) => (
                                    <div key={p.label} style={s.perfCard}>
                                        <p.Icon size={24} color={colors.accentTeal} />
                                        <span style={{ fontSize: typography.h2.fontSize, fontWeight: 800, color: colors.textPrimary, marginTop: 6 }}>{p.val}</span>
                                        <span style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>{p.label}</span>
                                        {p.sub && <span style={{ fontSize: 10, color: colors.textTertiary }}>{p.sub}</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* Payout Info */}
                <div style={s.section}>
                    <span style={{ ...s.sectionTitle, display: 'inline-flex', alignItems: 'center', gap: 6 }}><CreditCard size={16} color={colors.textPrimary} /> Payout Information</span>
                    <div style={s.card}>
                        {[
                            ['Schedule', 'Monthly (1st)'],
                            ['Minimum', '400 tokens (2,000 SAR)'],
                            ['Processing', '3-5 business days'],
                            ['Early payout', 'Available (2% fee)'],
                        ].map(([label, value]) => (
                            <div key={label} style={s.payoutRow}>
                                <span style={{ fontSize: 11, color: colors.textTertiary }}>{label}</span>
                                <span style={{ fontSize: 11, color: colors.textPrimary, fontWeight: 600 }}>{value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bonus Targets */}
                <div style={s.section}>
                    <span style={{ ...s.sectionTitle, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Target size={16} color={colors.textPrimary} /> Bonus Targets</span>
                    <div style={s.card}>
                        <BonusRow Icon={Target} label="Monthly target (est.)" reward="+300 tokens" progress={Math.min(100, Math.round(completedToday / Math.max(1, stats?.daily_limit ?? 10) * 100))} />
                        <BonusRow Icon={Star} label={`High rating (${ratingAvg.toFixed(1)}/5.0)`} reward="+5% monthly" progress={Math.min(100, Math.round((ratingAvg / 5) * 100))} />
                        <BonusRow Icon={Zap} label="Fast response (<20 min)" reward="+5% monthly" progress={0} />
                    </div>
                </div>
            </div>
        </div>
        </PullToRefresh>
    );
}

const s: Record<string, CSSProperties> = {
    container: { flex: 1, height: '100%', backgroundColor: colors.bgPrimary },
    scroll: { padding: 20, paddingBottom: 40 },
    title: { display: 'block', fontSize: typography.h2.fontSize, fontWeight: 700, color: colors.textPrimary, marginBottom: 20 },
    summaryCard: { backgroundColor: colors.bgSecondary, borderRadius: 20, padding: 20, border: `1px solid ${colors.border}`, marginBottom: 24 },
    section: { marginBottom: 24 },
    sectionTitle: { display: 'block', fontSize: typography.h3.fontSize, fontWeight: 600, color: colors.textPrimary, marginBottom: 12 },
    chartCard: { backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 20, border: `1px solid ${colors.border}` },
    todayRow: { display: 'flex', justifyContent: 'space-around' },
    perfGrid: { display: 'flex', flexWrap: 'wrap', gap: 10 },
    perfCard: { width: 'calc(50% - 5px)', backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', border: `1px solid ${colors.border}` },
    card: { backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 16, border: `1px solid ${colors.border}` },
    payoutRow: { display: 'flex', justifyContent: 'space-between', paddingBlock: 10, borderBottom: `1px solid ${colors.border}` },
    bonusRow: { display: 'flex', alignItems: 'center', paddingBlock: 10 },
    progressBg: { height: 6, backgroundColor: colors.bgTertiary, borderRadius: 3, overflow: 'hidden' },
    progressBar: { height: '100%', backgroundColor: colors.accentTeal, borderRadius: 3 } as any,
};
