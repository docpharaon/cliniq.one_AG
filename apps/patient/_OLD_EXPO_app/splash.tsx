import { useEffect, useRef, useState } from 'react';
import {
    View,
    StyleSheet,
    Animated,
    TouchableWithoutFeedback,
    Dimensions,
    Text,
    Platform,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '@cliniqone/ui';
import { markSplashShown } from './index';

const { width, height } = Dimensions.get('window');
const SPLASH_DURATION = 10000; // 10 seconds — matches video duration

// ─── Assets ──────────────────────────────────────────────────────
const bgVideoSource = require('../assets/splash-bg.mp4');
const logoSource = require('../assets/logo.png');

export default function SplashScreen() {
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const logoScale = useRef(new Animated.Value(0.8)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const bgOpacity = useRef(new Animated.Value(0)).current;
    const [isDismissing, setIsDismissing] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const onBgReady = () => {
        Animated.timing(bgOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();
    };

    useEffect(() => {
        // Animate logo entrance
        Animated.parallel([
            Animated.spring(logoScale, {
                toValue: 1,
                friction: 6,
                tension: 40,
                useNativeDriver: true,
            }),
            Animated.timing(logoOpacity, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
        ]).start();

        // Auto-dismiss after splash duration
        timerRef.current = setTimeout(() => {
            dismiss();
        }, SPLASH_DURATION);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    const dismiss = () => {
        if (isDismissing) return;
        setIsDismissing(true);

        if (timerRef.current) clearTimeout(timerRef.current);

        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
        }).start(() => {
            markSplashShown();
            router.replace('/');
        });
    };

    return (
        <TouchableWithoutFeedback onPress={dismiss}>
            <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
                <StatusBar style="light" />

                {/* Background video — fades in when loaded */}
                <Animated.View style={[styles.video, { opacity: bgOpacity }]}>
                    {Platform.OS === 'web' ? (
                        <video
                            src={bgVideoSource as any}
                            autoPlay
                            loop
                            muted
                            playsInline
                            onCanPlay={onBgReady}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover' as any,
                            }}
                        />
                    ) : (
                        <Video
                            source={bgVideoSource}
                            style={styles.video}
                            resizeMode={ResizeMode.COVER}
                            shouldPlay
                            isLooping
                            isMuted
                            onLoad={onBgReady}
                        />
                    )}
                </Animated.View>

                {/* Dark overlay for better logo visibility */}
                <View style={styles.overlay} />

                {/* Centered Logo */}
                <Animated.View
                    style={[
                        styles.logoContainer,
                        {
                            transform: [{ scale: logoScale }],
                            opacity: logoOpacity,
                        },
                    ]}
                >
                    {logoSource ? (
                        <Image
                            source={logoSource}
                            style={styles.logo}
                            contentFit="contain"
                        />
                    ) : (
                        <View style={styles.textLogoContainer}>
                            <Text style={styles.textLogo}>cliniq.one</Text>
                            <View style={styles.taglineLine} />
                            <Text style={styles.textTagline}>Smart Healthcare</Text>
                        </View>
                    )}
                </Animated.View>

                {/* Crafted by */}
                <Animated.View style={[styles.craftedContainer, { opacity: logoOpacity }]}>
                    <View style={styles.craftedLine} />
                    <Text style={styles.craftedLabel}>Crafted by</Text>
                    <Text style={styles.craftedName}>momen pharaon</Text>
                </Animated.View>

                {/* Skip hint */}
                <Animated.View style={[styles.skipHint, { opacity: logoOpacity }]}>
                    <Text style={styles.skipText}>Tap to skip</Text>
                </Animated.View>
            </Animated.View>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0E1A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    video: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(10, 14, 26, 0.45)',
    },
    logoContainer: {
        zIndex: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logo: {
        width: 200,
        height: 200,
    },
    textLogoContainer: {
        alignItems: 'center',
    },
    textLogo: {
        fontSize: 48,
        fontWeight: '800',
        color: '#1A8A9E',
        letterSpacing: -1.5,
        textShadowColor: 'rgba(0, 212, 170, 0.4)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 20,
    },
    taglineLine: {
        width: 60,
        height: 2,
        backgroundColor: '#1A8A9E',
        marginVertical: 14,
        borderRadius: 1,
        opacity: 0.6,
    },
    textTagline: {
        fontSize: 16,
        fontWeight: '500',
        color: 'rgba(255, 255, 255, 0.7)',
        letterSpacing: 4,
        textTransform: 'uppercase',
    },
    skipHint: {
        position: 'absolute',
        bottom: 60,
        zIndex: 2,
    },
    skipText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.5)',
        letterSpacing: 1,
    },
    craftedContainer: {
        position: 'absolute',
        bottom: 100,
        alignItems: 'center',
        zIndex: 2,
    },
    craftedLine: {
        width: 30,
        height: 1,
        backgroundColor: 'rgba(0, 212, 170, 0.25)',
        marginBottom: 10,
    },
    craftedLabel: {
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.3)',
        letterSpacing: 2,
        textTransform: 'uppercase',
        fontWeight: '300',
        marginBottom: 2,
    },
    craftedName: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.45)',
        letterSpacing: 3,
        textTransform: 'uppercase',
        fontWeight: '500',
    },
});
