import { type LucideIcon } from 'lucide-react';

interface StatCardProps {
    icon: LucideIcon;
    value: string | number;
    label: string;
    trend?: { value: string; positive: boolean };
    iconColor?: string;
    iconBg?: string;
}

export default function StatCard({
    icon: Icon,
    value,
    label,
    trend,
    iconColor = 'text-accent',
    iconBg = 'bg-accent-faded',
}: StatCardProps) {
    return (
        <div className="glass rounded-2xl p-6 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(45,212,191,0.2)] hover:border-accent/40 transition-all duration-300 cursor-default group">
            <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center mb-4`}>
                <Icon className={`w-6 h-6 ${iconColor}`} />
            </div>
            <p className="text-3xl font-bold text-text-primary leading-tight">{value}</p>
            <p className="text-sm font-medium text-text-secondary mt-1">{label}</p>
            {trend && (
                <div className={`flex items-center gap-1 mt-3 text-sm font-semibold ${trend.positive ? 'text-success' : 'text-error'}`}>
                    <span>{trend.positive ? '↑' : '↓'}</span>
                    <span>{trend.value}</span>
                    <span className="text-text-muted font-normal text-xs ml-1">vs last month</span>
                </div>
            )}
        </div>
    );
}
