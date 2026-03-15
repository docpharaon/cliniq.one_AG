import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Image, Dimensions, TouchableOpacity, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';
import { Button } from '@cliniqone/ui';
import { colors, spacing, typography, radius } from '@cliniqone/ui';
import { t, getLocale, setLocale } from '@cliniqone/i18n';

const { width: screenWidth } = Dimensions.get('window');
// Cap to phone-frame width (393px) so web preview looks correct
const MAX_WIDTH = 393;
const effectiveWidth = Math.min(screenWidth, MAX_WIDTH);
const VIDEO_WIDTH = effectiveWidth - spacing.xl * 2;
const VIDEO_HEIGHT = VIDEO_WIDTH * 1.4; // Portrait-friendly aspect ratio

const titleLogoSource = require('../../assets/title-logo.png');
const videoSource = require('../../assets/splash-video.mp4');

export default function LandingScreen() {
    const [lang, setLang] = useState<'en' | 'ar'>(getLocale());

    function toggleLanguage() {
        const next = lang === 'en' ? 'ar' : 'en';
        Alert.alert(
            next === 'ar' ? 'تغيير اللغة' : 'Change Language',
            next === 'ar'
                ? 'سيتم إعادة تشغيل التطبيق لتطبيق اللغة العربية.'
                : 'The app will restart to apply English.',
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: next === 'ar' ? 'تغيير' : 'Change',
                    onPress: async () => {
                        setLang(next);
                        await setLocale(next);
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
                    },
                },
            ]
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Language Toggle */}
            <TouchableOpacity style={styles.langToggle} onPress={toggleLanguage}>
                <Text style={styles.langToggleText}>
                    {lang === 'ar' ? '🇬🇧 English' : '🇸🇦 العربية'}
                </Text>
            </TouchableOpacity>

            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
            >
                {/* Logo & Tagline */}
                <View style={styles.hero}>
                    <Image
                        source={titleLogoSource}
                        style={styles.titleLogo}
                        resizeMode="contain"
                    />
                    <Text style={styles.tagline}>{t('landing.tagline')}</Text>
                </View>

                {/* Video Section */}
                <View style={styles.videoSection}>
                    <View style={styles.videoContainer}>
                        {Platform.OS === 'web' ? (
                            <video
                                src={videoSource as any}
                                autoPlay
                                loop
                                muted
                                playsInline
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover' as any,
                                    borderRadius: 16,
                                }}
                            />
                        ) : (
                            <Video
                                source={videoSource}
                                style={styles.video}
                                resizeMode={ResizeMode.COVER}
                                shouldPlay
                                isLooping
                                isMuted
                            />
                        )}
                    </View>
                </View>



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
    langToggle: {
        position: 'absolute',
        top: spacing['3xl'],
        right: spacing.xl,
        zIndex: 10,
        backgroundColor: colors.bgCard,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: colors.border,
    },
    langToggleText: {
        ...typography.buttonSm,
        color: colors.textPrimary,
    },
    scroll: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing['4xl'],
    },
    hero: {
        alignItems: 'center',
        paddingTop: spacing['4xl'],
        paddingBottom: spacing['3xl'],
    },
    titleLogo: {
        width: 220,
        height: 60,
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
        width: VIDEO_WIDTH,
        height: VIDEO_HEIGHT,
        borderRadius: radius.xl,
        overflow: 'hidden',
        backgroundColor: colors.bgCard,
    },
    video: {
        width: '100%',
        height: '100%',
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
