import React from 'react';

interface SkeletonProps {
    width?: number | string;
    height?: number;
    borderRadius?: number;
    style?: React.CSSProperties;
}

/**
 * Skeleton shimmer placeholder for loading states.
 * Uses CSS @keyframes pulse animation.
 */
export function Skeleton({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) {
    return (
        <div
            className="skeleton-shimmer"
            style={{
                width,
                height,
                borderRadius,
                backgroundColor: 'var(--bg-card)',
                ...style,
            }}
        />
    );
}

/** Dashboard skeleton — matches the layout of the real dashboard */
export function DashboardSkeleton() {
    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', padding: '24px 20px' }}>
            <Skeleton width="60%" height={28} style={{ marginBottom: 20 }} />
            <Skeleton width="100%" height={80} borderRadius={16} style={{ marginBottom: 16 }} />
            <Skeleton width="100%" height={64} borderRadius={16} style={{ marginBottom: 24 }} />
            <Skeleton width="40%" height={18} style={{ marginBottom: 12 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} width={60} height={72} borderRadius={12} />
                ))}
            </div>
            <Skeleton width="50%" height={18} style={{ marginBottom: 12, marginTop: 20 }} />
            {[1, 2, 3].map((i) => (
                <Skeleton key={i} width="100%" height={72} borderRadius={12} style={{ marginBottom: 8 }} />
            ))}
        </div>
    );
}

/** Consultation list skeleton */
export function ConsultationListSkeleton() {
    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', padding: '24px 20px' }}>
            <Skeleton width="45%" height={28} style={{ marginBottom: 16 }} />
            <Skeleton width="100%" height={48} borderRadius={12} style={{ marginBottom: 12 }} />
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} width={80} height={32} borderRadius={20} />
                ))}
            </div>
            {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} width="100%" height={120} borderRadius={16} style={{ marginBottom: 12 }} />
            ))}
        </div>
    );
}

/** Notifications skeleton */
export function NotificationsSkeleton() {
    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', padding: '24px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Skeleton width="35%" height={28} />
                <Skeleton width={80} height={20} borderRadius={6} />
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                    <Skeleton width={36} height={36} borderRadius={18} />
                    <div style={{ flex: 1 }}>
                        <Skeleton width="70%" height={16} style={{ marginBottom: 6 }} />
                        <Skeleton width="90%" height={14} style={{ marginBottom: 4 }} />
                        <Skeleton width="30%" height={12} />
                    </div>
                </div>
            ))}
        </div>
    );
}

/** Wallet skeleton */
export function WalletSkeleton() {
    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', padding: '24px 20px' }}>
            <Skeleton width="40%" height={28} style={{ marginBottom: 20 }} />
            <Skeleton width="100%" height={140} borderRadius={16} style={{ marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} width="33%" height={80} borderRadius={14} />
                ))}
            </div>
            <Skeleton width="50%" height={20} style={{ marginBottom: 12 }} />
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} width={100} height={120} borderRadius={14} />
                ))}
            </div>
            <Skeleton width="45%" height={20} style={{ marginBottom: 12 }} />
            {[1, 2, 3].map((i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <Skeleton width={40} height={40} borderRadius={20} />
                    <div style={{ flex: 1 }}>
                        <Skeleton width="60%" height={14} style={{ marginBottom: 4 }} />
                        <Skeleton width="30%" height={12} />
                    </div>
                    <Skeleton width={50} height={16} />
                </div>
            ))}
        </div>
    );
}

/** Profile skeleton */
export function ProfileSkeleton() {
    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', padding: '24px 20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
                <Skeleton width={80} height={80} borderRadius={40} style={{ marginBottom: 12 }} />
                <Skeleton width="40%" height={22} style={{ marginBottom: 6 }} />
                <Skeleton width="55%" height={14} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                <Skeleton width="50%" height={80} borderRadius={14} />
                <Skeleton width="50%" height={80} borderRadius={14} />
            </div>
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <Skeleton key={i} width="100%" height={56} borderRadius={12} style={{ marginBottom: 8 }} />
            ))}
        </div>
    );
}
