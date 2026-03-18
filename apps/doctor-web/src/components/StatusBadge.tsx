type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface StatusBadgeProps {
    label: string;
    variant: StatusVariant;
    pulse?: boolean;
}

const variantStyles: Record<StatusVariant, { bg: string; text: string; dot: string; border: string }> = {
    success: {
        bg: 'bg-success-faded',
        text: 'text-success',
        dot: 'bg-success',
        border: 'border-[rgba(74,222,128,0.3)]',
    },
    warning: {
        bg: 'bg-warning-faded',
        text: 'text-warning',
        dot: 'bg-warning',
        border: 'border-[rgba(255,165,0,0.3)]',
    },
    error: {
        bg: 'bg-error-faded',
        text: 'text-error',
        dot: 'bg-error',
        border: 'border-[rgba(239,68,68,0.3)]',
    },
    info: {
        bg: 'bg-info-faded',
        text: 'text-info',
        dot: 'bg-info',
        border: 'border-[rgba(96,165,250,0.3)]',
    },
    neutral: {
        bg: 'bg-[rgba(127,216,216,0.15)]',
        text: 'text-text-secondary',
        dot: 'bg-text-secondary',
        border: 'border-[rgba(127,216,216,0.3)]',
    },
};

export default function StatusBadge({ label, variant, pulse }: StatusBadgeProps) {
    const styles = variantStyles[variant];

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border whitespace-nowrap ${styles.bg} ${styles.text} ${styles.border}`}
        >
            <span
                className={`w-2 h-2 rounded-full ${styles.dot} ${pulse ? 'animate-pulse-dot' : ''}`}
            />
            {label}
        </span>
    );
}

export function PriorityBadge({ priority }: { priority: 'routine' | 'high' | 'urgent' }) {
    const map = {
        routine: { label: 'LOW', variant: 'success' as StatusVariant },
        high: { label: 'HIGH', variant: 'warning' as StatusVariant },
        urgent: { label: 'URGENT', variant: 'error' as StatusVariant },
    };
    const { label, variant } = map[priority];
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold uppercase tracking-wider border whitespace-nowrap ${variantStyles[variant].bg} ${variantStyles[variant].text} ${variantStyles[variant].border}`}
        >
            {label}
        </span>
    );
}
