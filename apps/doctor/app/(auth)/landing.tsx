import { useRef, useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    Animated,
    Dimensions,
    TouchableOpacity,
    Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius } from '@cliniqone/ui';
import { FadeIn } from '../../components/FadeIn';

const { width: screenWidth } = Dimensions.get('window');
const logoSource = require('../../assets/logo.png');

// ── Animated pulse dot for the "live" feel ──────────────────────
function PulsingDot({ color, delay = 0 }: { color: string; delay?: number }) {
    const scale = useRef(new Animated.Value(1)).current;
    const opacity = useRef(new Animated.Value(0.6)).current;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.parallel([
                    Animated.timing(scale, { toValue: 1.4, duration: 800, delay, useNativeDriver: true }),
                    Animated.timing(opacity, { toValue: 1, duration: 800, delay, useNativeDriver: true }),
                ]),
                Animated.parallel([
                    Animated.timing(scale, { toValue: 1, duration: 800, useNativeDriver: true }),
                    Animated.timing(opacity, { toValue: 0.6, duration: 800, useNativeDriver: true }),
                ]),
            ]),
        );
        pulse.start();
        return () => pulse.stop();
    }, []);

    return (
        <Animated.View
            style={[
                styles.pulsingDot,
                { backgroundColor: color, transform: [{ scale }], opacity },
            ]}
        />
    );
}

// ── Feature row item ────────────────────────────────────────────
function FeatureItem({
    icon,
    title,
    subtitle,
    accentColor,
    delay,
}: {
    icon: string;
    title: string;
    subtitle: string;
    accentColor: string;
    delay: number;
}) {
    return (
        <FadeIn delay={delay}>
            <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: accentColor + '22' }]}>
                    <Text style={styles.featureEmoji}>{icon}</Text>
                </View>
                <View style={styles.featureText}>
                    <Text style={styles.featureTitle}>{title}</Text>
                    <Text style={styles.featureSubtitle}>{subtitle}</Text>
                </View>
            </View>
        </FadeIn>
    );
}

export default function LandingScreen() {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {/* ── Logo + Branding ── */}
                <Animated.View
                    style={[
                        styles.heroSection,
                        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
                    ]}
                >
                    <Image source={logoSource} style={styles.logo} resizeMode="contain" />
                    <Text style={styles.brandName}>cliniq.one</Text>
                    <View style={styles.roleTagRow}>
                        <View style={[styles.roleTag, styles.doctorTag]}>
                            <PulsingDot color={colors.accentTeal} />
                            <Text style={styles.roleTagText}>Doctor</Text>
                        </View>
                        <Text style={styles.roleDivider}>•</Text>
                        <View style={[styles.roleTag, styles.locumTag]}>
                            <PulsingDot color={colors.purple} delay={400} />
                            <Text style={[styles.roleTagText, { color: colors.purple }]}>Locum</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* ── Tagline ── */}
                <FadeIn delay={200}>
                    <Text style={styles.tagline}>
                        Your digital practice,{'\n'}anytime, anywhere.
                    </Text>
                </FadeIn>

                {/* ── Feature highlights ── */}
                <View style={styles.features}>
                    <FeatureItem
                        icon="📋"
                        title="Manage Consultations"
                        subtitle="Accept, review, and respond to patient cases"
                        accentColor={colors.accentTeal}
                        delay={400}
                    />
                    <FeatureItem
                        icon="🩺"
                        title="Locum Shifts"
                        subtitle="Pick up shifts and earn on your schedule"
                        accentColor={colors.purple}
                        delay={550}
                    />
                    <FeatureItem
                        icon="💬"
                        title="AI-Assisted Intake"
                        subtitle="Pre-screened patients with smart summaries"
                        accentColor={colors.accentBlue}
                        delay={700}
                    />
                </View>

                {/* ── CTA Buttons ── */}
                <FadeIn delay={850}>
                    <View style={styles.ctaSection}>
                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={() => router.push('/(auth)/login')}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.primaryButtonText}>Sign In</Text>
                        </TouchableOpacity>

                        <View style={styles.registerRow}>
                            <Text style={styles.registerHint}>
                                New doctor or locum?
                            </Text>
                            <TouchableOpacity
                                onPress={() => router.push('/(auth)/login')}
                                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            >
                                <Text style={styles.registerLink}>
                                    Sign in with Google or Apple to register
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </FadeIn>

                {/* ── Footer ── */}
                <FadeIn delay={1000}>
                    <Text style={styles.footer}>
                        Admin approval required for new accounts
                    </Text>
                </FadeIn>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bgPrimary,
    },
    content: {
        flex: 1,
        paddingHorizontal: spacing.xl,
        justifyContent: 'center',
    },

    // ── Hero / Logo ──
    heroSection: {
        alignItems: 'center',
        marginBottom: spacing['2xl'],
    },
    logo: {
        width: 88,
        height: 88,
        marginBottom: spacing.md,
    },
    brandName: {
        fontSize: 34,
        fontWeight: '800',
        color: colors.accentTeal,
        letterSpacing: -1.5,
        marginBottom: spacing.md,
    },
    roleTagRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    roleTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        borderRadius: radius.full,
    },
    doctorTag: {
        backgroundColor: colors.accentTealFaded,
    },
    locumTag: {
        backgroundColor: colors.purpleFaded,
    },
    roleTagText: {
        ...typography.buttonSm,
        color: colors.accentTeal,
    },
    roleDivider: {
        color: colors.textTertiary,
        fontSize: 8,
    },
    pulsingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },

    // ── Tagline ──
    tagline: {
        ...typography.h3,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 26,
        marginBottom: spacing['3xl'],
    },

    // ── Features ──
    features: {
        gap: spacing.lg,
        marginBottom: spacing['3xl'],
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.lg,
        backgroundColor: colors.bgSecondary,
        borderRadius: radius.lg,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    featureIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    featureEmoji: {
        fontSize: 22,
    },
    featureText: {
        flex: 1,
    },
    featureTitle: {
        ...typography.h4,
        color: colors.textPrimary,
        marginBottom: 2,
    },
    featureSubtitle: {
        ...typography.bodySm,
        color: colors.textTertiary,
    },

    // ── CTA ──
    ctaSection: {
        marginBottom: spacing.xl,
    },
    primaryButton: {
        borderRadius: radius.lg,
        overflow: 'hidden',
        marginBottom: spacing.lg,
        backgroundColor: colors.accentTeal,
        paddingVertical: 16,
        alignItems: 'center',
    },
    primaryButtonText: {
        ...typography.button,
        color: colors.textInverse,
        fontWeight: '700',
    },
    registerRow: {
        alignItems: 'center',
        gap: 4,
    },
    registerHint: {
        ...typography.body,
        color: colors.textSecondary,
    },
    registerLink: {
        ...typography.bodySm,
        color: colors.accentTeal,
        fontWeight: '600',
    },

    // ── Footer ──
    footer: {
        ...typography.caption,
        color: colors.textTertiary,
        textAlign: 'center',
    },
});
