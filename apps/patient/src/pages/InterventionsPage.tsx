import { useNavigate } from 'react-router-dom';
import { colors, spacing, typography } from '@cliniqone/ui';
import type { CSSProperties } from 'react';

export function InterventionsPage() {
    const navigate = useNavigate();
    return (
        <div style={s.container}>
            <div style={s.header}>
                <button onClick={() => navigate(-1)} style={s.backBtn}>← Back</button>
                <span style={s.title}>My Interventions</span>
                <div style={{ width: 60 }} />
            </div>
            <div className="scrollable" style={s.content}>
                <span style={s.placeholder}>Page migrating...</span>
            </div>
        </div>
    );
}

const s: Record<string, CSSProperties> = {
    container: { display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: colors.bgPrimary },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)' },
    backBtn: { fontSize: 14, color: colors.accentTeal, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' },
    title: { fontSize: 17, fontWeight: 700, color: colors.textPrimary },
    content: { flex: 1, padding: 24, overflowY: 'auto' },
    placeholder: { fontSize: 14, color: colors.textTertiary, textAlign: 'center', marginTop: 60, display: 'block' },
};
