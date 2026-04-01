import { useState, useRef, useCallback, type ReactNode, type CSSProperties, type TouchEvent } from 'react';

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: ReactNode;
    /** Optional custom threshold in px (default 60) */
    threshold?: number;
}

/**
 * Native-feel pull-to-refresh wrapper.
 * Wrap any scrollable content to add swipe-down refresh gesture.
 */
export function PullToRefresh({ onRefresh, children, threshold = 60 }: PullToRefreshProps) {
    const [pulling, setPulling] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const startY = useRef(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleTouchStart = useCallback((e: TouchEvent) => {
        // Only activate if scrolled to top
        const el = containerRef.current;
        if (!el || el.scrollTop > 0 || refreshing) return;
        startY.current = e.touches[0].clientY;
        setPulling(true);
    }, [refreshing]);

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (!pulling || refreshing) return;
        const delta = Math.max(0, e.touches[0].clientY - startY.current);
        // Apply resistance: the further you pull, the harder it gets
        const dampened = Math.min(delta * 0.5, 120);
        setPullDistance(dampened);
    }, [pulling, refreshing]);

    const handleTouchEnd = useCallback(async () => {
        if (!pulling) return;
        setPulling(false);

        if (pullDistance >= threshold) {
            setRefreshing(true);
            setPullDistance(threshold * 0.6); // Snap to indicator position
            try {
                await onRefresh();
            } catch { /* swallow */ }
            setRefreshing(false);
        }
        setPullDistance(0);
    }, [pulling, pullDistance, threshold, onRefresh]);

    const progress = Math.min(pullDistance / threshold, 1);
    const showIndicator = pullDistance > 5;

    return (
        <div
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch', position: 'relative' }}
        >
            {/* Pull indicator */}
            {showIndicator && (
                <div style={indicatorContainerStyle(pullDistance)}>
                    <div style={spinnerStyle(refreshing, progress)}>
                        <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="var(--accent-teal, #2DD4BF)" strokeWidth={2.5} strokeLinecap="round">
                            <path d="M23 4v6h-6" />
                            <path d="M1 20v-6h6" />
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                        </svg>
                    </div>
                </div>
            )}

            {/* Content shifted down during pull */}
            <div style={{ transform: `translateY(${pullDistance}px)`, transition: pulling ? 'none' : 'transform 0.3s ease' }}>
                {children}
            </div>
        </div>
    );
}

function indicatorContainerStyle(distance: number): CSSProperties {
    return {
        position: 'absolute',
        top: 0,
        left: 0, right: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: distance,
        overflow: 'hidden',
        zIndex: 10,
    };
}

function spinnerStyle(refreshing: boolean, progress: number): CSSProperties {
    return {
        width: 36, height: 36,
        borderRadius: 18,
        backgroundColor: 'var(--bg-card, #1E293B)',
        border: '1px solid var(--border, #334155)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: progress,
        transform: `rotate(${refreshing ? 0 : progress * 180}deg)`,
        animation: refreshing ? 'ptr-spin 0.8s linear infinite' : 'none',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    };
}
