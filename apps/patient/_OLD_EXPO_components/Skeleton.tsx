import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors, spacing, radius } from '@cliniqone/ui';

/**
 * Skeleton shimmer placeholder for loading states.
 * Animates a subtle opacity pulse to indicate loading content.
 */

interface SkeletonProps {
    width?: number | string;
    height?: number;
    borderRadius?: number;
    style?: any;
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) {
    const shimmer = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(shimmer, {
                    toValue: 0.7,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(shimmer, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ]),
        );
        animation.start();
        return () => animation.stop();
    }, [shimmer]);

    return (
        <Animated.View
            style={[
                {
                    width: width as any,
                    height,
                    borderRadius,
                    backgroundColor: colors.bgTertiary,
                    opacity: shimmer,
                },
                style,
            ]}
        />
    );
}

/**
 * Dashboard skeleton — matches the layout of the real dashboard
 * to prevent layout shift when content loads.
 */
export function DashboardSkeleton() {
    return (
        <View style={skeletonStyles.container}>
            {/* Greeting */}
            <Skeleton width="60%" height={28} style={{ marginBottom: spacing.xl }} />

            {/* Token card */}
            <Skeleton
                width="100%"
                height={80}
                borderRadius={radius.xl}
                style={{ marginBottom: spacing.lg }}
            />

            {/* CTA card */}
            <Skeleton
                width="100%"
                height={64}
                borderRadius={radius.xl}
                style={{ marginBottom: spacing['2xl'] }}
            />

            {/* Section title */}
            <Skeleton width="40%" height={18} style={{ marginBottom: spacing.md }} />

            {/* Quick actions grid */}
            <View style={skeletonStyles.actionsGrid}>
                {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton
                        key={i}
                        width={60}
                        height={72}
                        borderRadius={radius.lg}
                    />
                ))}
            </View>

            {/* Section title */}
            <Skeleton width="50%" height={18} style={{ marginBottom: spacing.md, marginTop: spacing.xl }} />

            {/* Consultation cards */}
            {[1, 2, 3].map((i) => (
                <Skeleton
                    key={i}
                    width="100%"
                    height={72}
                    borderRadius={radius.lg}
                    style={{ marginBottom: spacing.sm }}
                />
            ))}
        </View>
    );
}

/**
 * Consultation list skeleton for the consultations tab
 */
export function ConsultationListSkeleton() {
    return (
        <View style={skeletonStyles.container}>
            {/* Title */}
            <Skeleton width="45%" height={28} style={{ marginBottom: spacing.lg }} />

            {/* Search bar */}
            <Skeleton
                width="100%"
                height={48}
                borderRadius={radius.lg}
                style={{ marginBottom: spacing.md }}
            />

            {/* Filter chips */}
            <View style={skeletonStyles.filterRow}>
                {[1, 2, 3].map((i) => (
                    <Skeleton
                        key={i}
                        width={80}
                        height={32}
                        borderRadius={20}
                    />
                ))}
            </View>

            {/* Consultation cards */}
            {[1, 2, 3, 4].map((i) => (
                <Skeleton
                    key={i}
                    width="100%"
                    height={120}
                    borderRadius={radius.xl}
                    style={{ marginBottom: spacing.md }}
                />
            ))}
        </View>
    );
}

const skeletonStyles = StyleSheet.create({
    container: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing['2xl'],
    },
    actionsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.lg,
    },
    filterRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.xl,
    },
});
