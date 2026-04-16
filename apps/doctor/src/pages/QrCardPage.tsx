import { useRef, useCallback } from 'react';
import { haptic } from '../hooks/useHaptics';
import { colors, typography, Stethoscope, Share, Download } from '@cliniqone/ui';
import { useAuthStore } from '../stores/authStore';
import { BackButton } from '../components/BackButton';
import { useToast } from '../components/ToastProvider';
import { useI18n } from '@cliniqone/i18n';
import type { CSSProperties } from 'react';

function QrCodeSvg({ value, size = 200 }: { value: string; size?: number }) {
    // Simple QR-like visual placeholder using the identifier code
    // In production, replace with a real QR library like qrcode-generator
    const cells = 21;
    const cellSize = size / cells;
    const hash = Array.from(value).reduce((acc, c) => acc * 31 + c.charCodeAt(0), 0);

    const matrix: boolean[][] = Array.from({ length: cells }, (_, r) =>
        Array.from({ length: cells }, (_, c) => {
            // Finder patterns (top-left, top-right, bottom-left)
            const inFinder = (cr: number, cc: number) =>
                (cr < 7 && cc < 7) || (cr < 7 && cc >= cells - 7) || (cr >= cells - 7 && cc < 7);
            const inFinderCore = (cr: number, cc: number) => {
                const zones = [[0, 0], [0, cells - 7], [cells - 7, 0]];
                return zones.some(([tr, tc]) =>
                    cr >= tr && cr < tr + 7 && cc >= tc && cc < tc + 7 &&
                    ((cr === tr || cr === tr + 6 || cc === tc || cc === tc + 6) ||
                     (cr >= tr + 2 && cr <= tr + 4 && cc >= tc + 2 && cc <= tc + 4))
                );
            };
            if (inFinder(r, c)) return inFinderCore(r, c);
            // Data area - pseudo-random based on hash
            return ((hash * (r * cells + c + 1)) % 7) < 3;
        })
    );

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ borderRadius: 8 }}>
            <rect width={size} height={size} fill="#fff" rx={8} />
            {matrix.map((row, r) =>
                row.map((cell, c) =>
                    cell ? <rect key={`${r}-${c}`} x={c * cellSize} y={r * cellSize} width={cellSize} height={cellSize} fill="#1e293b" rx={1} /> : null
                )
            )}
        </svg>
    );
}

export function QrCardPage() {
    const { doctor } = useAuthStore();
    const { t, isRTL } = useI18n();
    const toast = useToast((s) => s.show);
    const cardRef = useRef<HTMLDivElement>(null);

    const code = doctor?.identifier_code || 'DEMO';
    const qrValue = `https://cliniq.one/doctor/${code}`;

    const handleShare = useCallback(async () => {
        haptic.medium();
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Dr. ${doctor?.display_name} — cliniq.one`,
                    text: `${t('doctor.scanToConsult')}\n${qrValue}`,
                    url: qrValue,
                });
            } catch { /* cancelled */ }
        } else {
            await navigator.clipboard?.writeText(qrValue);
            toast(t('doctor.linkCopied'), 'success');
        }
    }, [doctor, qrValue, t, toast]);

    const handleDownload = useCallback(async () => {
        haptic.medium();
        // Use html2canvas-like approach or canvas export
        try {
            const card = cardRef.current;
            if (!card) return;
            // Fallback: copy link to clipboard
            await navigator.clipboard?.writeText(qrValue);
            toast(t('doctor.linkCopied'), 'success');
        } catch {
            toast(t('common.error'), 'error');
        }
    }, [qrValue, t, toast]);

    return (
        <div style={s.container}>
            <div style={{ ...s.header, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                <BackButton />
                <span style={{ fontSize: typography.h3.fontSize, fontWeight: 600, color: colors.textPrimary }}>{t('doctor.myQrCard')}</span>
                <div style={{ width: 50 }} />
            </div>

            <div style={s.scroll} className="scrollable">
                <div style={s.scrollInner}>
                    {/* Branded Card */}
                    <div ref={cardRef} style={s.card}>
                        {/* Top gradient bar */}
                        <div style={s.gradientBar} />

                        {/* Brand logo area */}
                        <div style={s.brandRow}>
                            <span style={s.brandLogo}>cliniq<span style={{ color: colors.accentTeal }}>.one</span></span>
                        </div>

                        {/* Doctor info */}
                        <div style={s.doctorSection}>
                            <div style={s.avatarCircle}>
                                <Stethoscope size={32} color={colors.accentTeal} />
                            </div>
                            <span style={s.doctorName}>{doctor?.display_name || 'Doctor'}</span>
                            <span style={s.specialty}>{doctor?.specialty || 'Specialist'}</span>
                            {doctor?.sub_specialty && <span style={s.subSpecialty}>{doctor.sub_specialty}</span>}
                        </div>

                        {/* QR Code */}
                        <div style={s.qrContainer}>
                            <QrCodeSvg value={qrValue} size={180} />
                        </div>

                        {/* Code display */}
                        <div style={s.codeRow}>
                            <span style={s.codeLabel}>{t('common.code')}</span>
                            <span style={s.codeValue}>{code}</span>
                        </div>

                        {/* Scan instruction */}
                        <span style={s.scanText}>{t('doctor.scanToConsult')}</span>

                        {/* Bottom brand bar */}
                        <div style={s.bottomBar}>
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>cliniq.one — Virtual Care Platform</span>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                        <button className="pressable" style={s.shareBtn} onClick={handleShare}>
                            <Share size={18} color="#fff" />
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{t('doctor.shareCard')}</span>
                        </button>
                        <button className="pressable" style={s.downloadBtn} onClick={handleDownload}>
                            <Download size={18} color={colors.accentTeal} />
                            <span style={{ fontSize: 14, fontWeight: 700, color: colors.accentTeal }}>{t('doctor.saveToGallery')}</span>
                        </button>
                    </div>

                    {/* Link preview */}
                    <div style={s.linkPreview}>
                        <span style={{ fontSize: 11, color: colors.textTertiary, display: 'block', marginBottom: 4 }}>Patient link:</span>
                        <span style={{ fontSize: 13, color: colors.accentTeal, fontWeight: 500, wordBreak: 'break-all' as any }}>{qrValue}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

const s: Record<string, CSSProperties> = {
    container: { display: 'flex', flexDirection: 'column', flex: 1, height: '100%', backgroundColor: colors.bgPrimary },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingInline: 20, paddingBlock: 12, borderBottom: `1px solid ${colors.border}` },
    scroll: { flex: 1 },
    scrollInner: { padding: 20, paddingBottom: 40, display: 'flex', flexDirection: 'column', alignItems: 'center' },
    card: {
        width: '100%', maxWidth: 360, backgroundColor: '#fff',
        borderRadius: 24, overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
    },
    gradientBar: {
        width: '100%', height: 6,
        background: `linear-gradient(90deg, ${colors.accentTeal}, #8B5CF6, ${colors.accentTeal})`,
    },
    brandRow: {
        paddingTop: 20, paddingBottom: 4,
    },
    brandLogo: {
        fontSize: 22, fontWeight: 800, color: '#1e293b', letterSpacing: -0.5,
    },
    doctorSection: {
        display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBlock: 16, gap: 4,
    },
    avatarCircle: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: `${colors.accentTeal}15`,
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        marginBottom: 8,
        border: `2px solid ${colors.accentTeal}30`,
    },
    doctorName: { fontSize: 20, fontWeight: 800, color: '#1e293b' },
    specialty: { fontSize: 14, fontWeight: 600, color: colors.accentTeal },
    subSpecialty: { fontSize: 12, color: '#64748b' },
    qrContainer: {
        padding: 16, backgroundColor: '#fff',
        borderRadius: 16, margin: '8px 0 12px',
        border: `2px solid ${colors.accentTeal}20`,
    },
    codeRow: {
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
    },
    codeLabel: { fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' as any, letterSpacing: 1 },
    codeValue: {
        fontSize: 18, fontWeight: 800, color: colors.accentTeal,
        backgroundColor: `${colors.accentTeal}10`,
        paddingInline: 12, paddingBlock: 4, borderRadius: 8,
        letterSpacing: 2,
    },
    scanText: { fontSize: 13, color: '#64748b', marginBottom: 16, textAlign: 'center' as any },
    bottomBar: {
        width: '100%', backgroundColor: '#1e293b',
        padding: '10px 0', display: 'flex', justifyContent: 'center',
    },
    shareBtn: {
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 8, backgroundColor: colors.accentTeal, borderRadius: 14, paddingBlock: 16,
    },
    downloadBtn: {
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 8, backgroundColor: colors.accentTealFaded, borderRadius: 14, paddingBlock: 16,
        border: `1px solid ${colors.accentTeal}40`,
    },
    linkPreview: {
        width: '100%', marginTop: 20,
        backgroundColor: colors.bgSecondary, borderRadius: 14,
        padding: 16, border: `1px solid ${colors.border}`,
    },
};
