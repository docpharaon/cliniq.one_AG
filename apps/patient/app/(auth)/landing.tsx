import { useState, useRef, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Image, Dimensions, TouchableOpacity, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';
import { Button } from '@cliniqone/ui';
import { colors, spacing, typography, radius } from '@cliniqone/ui';
import { t, getLocale, setLocale } from '@cliniqone/i18n';
import { DisclaimerBanner } from '../../components/DisclaimerBanner';

const { width: screenWidth } = Dimensions.get('window');
// Cap to phone-frame width (393px) on web preview, but use full width in Capacitor
const isCapacitor = Platform.OS === 'web' && typeof globalThis !== 'undefined' && !!(globalThis as any).Capacitor;
const MAX_WIDTH = isCapacitor ? screenWidth : 393;
const effectiveWidth = Math.min(screenWidth, MAX_WIDTH);
const VIDEO_WIDTH = effectiveWidth - spacing.xl * 2;
const VIDEO_HEIGHT = VIDEO_WIDTH * 1.4; // Portrait-friendly aspect ratio

const titleLogoSource = require('../../assets/title-logo.png');
const videoSource = require('../../assets/splash-video.mp4');
const logoSource = require('../../assets/logo.png');

export default function LandingScreen() {
    const [lang, setLang] = useState<'en' | 'ar'>(getLocale());
    const [videoReady, setVideoReady] = useState(false);
    const videoRef = useRef<any>(null);

    async function switchLanguage(target: 'en' | 'ar') {
        if (target === lang) return;

        async function doSwitch() {
            setLang(target);
            await setLocale(target);
            try {
                const Updates = require('expo-updates');
                await Updates.reloadAsync();
            } catch {
                if (Platform.OS === 'web') {
                    (globalThis as any).location?.reload();
                } else {
                    router.replace('/(auth)/landing');
                }
            }
        }

        // On web, switch immediately (Alert doesn't work well on web)
        if (Platform.OS === 'web') {
            await doSwitch();
            return;
        }

        Alert.alert(
            target === 'ar' ? 'تغيير اللغة' : 'Change Language',
            target === 'ar'
                ? 'سيتم إعادة تشغيل التطبيق لتطبيق اللغة العربية.'
                : 'The app will restart to apply English.',
            [
                { text: t('common.cancel'), style: 'cancel' },
                { text: target === 'ar' ? 'تغيير' : 'Change', onPress: doSwitch },
            ]
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header — logo centered, flag toggle top-right */}
            <View style={styles.header}>
                <Image
                    source={titleLogoSource}
                    style={styles.headerLogo}
                    resizeMode="contain"
                />
                <TouchableOpacity
                    style={styles.flagButton}
                    onPress={() => switchLanguage(lang === 'en' ? 'ar' : 'en')}
                    activeOpacity={0.7}
                >
                    <Text style={styles.flagEmoji}>{lang === 'en' ? '🇸🇦' : '🇬🇧'}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
            >
                {/* Tagline */}
                <View style={styles.hero}>
                    <Text style={styles.tagline}>{t('landing.tagline')}</Text>
                </View>

                {/* Video Section */}
                <View style={styles.videoSection}>
                    <View style={styles.videoContainer}>
                        {/* Loading placeholder — prevents gray play icon */}
                        {!videoReady && (
                            <View style={styles.videoPlaceholder}>
                                <Image
                                    source={logoSource}
                                    style={styles.placeholderLogo}
                                    resizeMode="contain"
                                />
                                <View style={styles.videoLoadingDot} />
                            </View>
                        )}
                        {Platform.OS === 'web' ? (
                            <video
                                ref={videoRef}
                                src={videoSource as any}
                                autoPlay
                                loop
                                muted
                                playsInline
                                onCanPlay={() => setVideoReady(true)}
                                onLoadedData={() => setVideoReady(true)}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover' as any,
                                    borderRadius: 16,
                                    opacity: videoReady ? 1 : 0,
                                    transition: 'opacity 0.5s ease-in-out',
                                    position: 'absolute' as any,
                                    top: 0,
                                    left: 0,
                                }}
                            />
                        ) : (
                            <Video
                                source={videoSource}
                                style={[
                                    styles.video,
                                    { opacity: videoReady ? 1 : 0 },
                                ]}
                                resizeMode={ResizeMode.COVER}
                                shouldPlay
                                isLooping
                                isMuted
                                onLoad={() => setVideoReady(true)}
                            />
                        )}
                    </View>
                </View>

                {/* Medical Disclaimer — required by app stores */}
                <DisclaimerBanner />

                {/* CTA */}
                <View style={styles.cta}>
                    <Button
                        title={t('landing.getStarted')}
                        onPress={() => router.push('/(auth)/signup')}
                        size="lg"
                    />
                    <View style={styles.loginRow}>
                        <Text style={styles.loginText}>{t('landing.alreadyHaveAccount')} </Text>
                        <Text
                            style={styles.loginLink}
                            onPress={() => router.push('/(auth)/login')}
                        >
                            {t('landing.login')}
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bgPrimary,
    },
    header: {
        alignItems: 'center',
        paddingTop: spacing.xl,
        paddingBottom: spacing.md,
        position: 'relative',
    },
    headerLogo: {
        width: 200,
        height: 55,
    },
    flagButton: {
        position: 'absolute',
        top: spacing.lg,
        right: spacing.lg,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.bgCard,
        borderWidth: 1,
        borderColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    flagEmoji: {
        fontSize: 20,
    },
    scroll: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing['4xl'],
    },
    hero: {
        alignItems: 'center',
        paddingTop: spacing.xl,
        paddingBottom: spacing['3xl'],
    },
    tagline: {
        ...typography.bodyLg,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: spacing.lg,
        lineHeight: 26,
    },
    videoSection: {
        marginBottom: spacing['3xl'],
    },
    videoContainer: {
        width: '100%',
        height: VIDEO_HEIGHT,
        borderRadius: radius.xl,
        overflow: 'hidden',
        backgroundColor: colors.bgCard,
        position: 'relative',
    },
    video: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
    },
    videoPlaceholder: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.bgCard,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
        borderRadius: radius.xl,
    },
    placeholderLogo: {
        width: 80,
        height: 80,
        opacity: 0.4,
        marginBottom: spacing.md,
    },
    videoLoadingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.accentTeal,
        opacity: 0.6,
    },
    section: {
        marginBottom: spacing['3xl'],
    },
    sectionTitle: {
        ...typography.h3,
        color: colors.textPrimary,
        marginBottom: spacing.lg,
    },
    steps: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    step: {
        alignItems: 'center',
        flex: 1,
    },
    stepNumber: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.accentTealFaded,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    stepNumberText: {
        ...typography.h4,
        color: colors.accentTeal,
    },
    stepLabel: {
        ...typography.bodySm,
        color: colors.textPrimary,
        textAlign: 'center',
    },
    stepTime: {
        ...typography.caption,
        color: colors.textTertiary,
        marginTop: spacing.xxs,
    },
    stepArrow: {
        paddingHorizontal: spacing.xs,
        paddingBottom: spacing.xl,
    },
    stepArrowText: {
        color: colors.textTertiary,
        fontSize: 18,
    },
    specialtyRow: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    specialtyChip: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgCard,
        padding: spacing.lg,
        borderRadius: radius.lg,
        gap: spacing.sm,
    },
    specialtyIcon: {
        fontSize: 20,
    },
    specialtyLabel: {
        ...typography.body,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    comingSoon: {
        ...typography.caption,
        color: colors.textTertiary,
        textAlign: 'center',
        marginTop: spacing.md,
    },
    cta: {
        marginTop: spacing.lg,
    },
    loginRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: spacing.lg,
    },
    loginText: {
        ...typography.body,
        color: colors.textSecondary,
    },
    loginLink: {
        ...typography.body,
        color: colors.accentTeal,
        fontWeight: '600',
    },
});
