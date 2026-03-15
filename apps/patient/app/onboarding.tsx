import { useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, FlatList, Animated } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius } from '@cliniqone/ui';
import { t } from '@cliniqone/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const SLIDES = [
    {
        id: '1',
        icon: '🤖',
        titleKey: 'onboarding.slide1Title',
        descKey: 'onboarding.slide1Desc',
        color: '#00D4AA',
    },
    {
        id: '2',
        icon: '👨‍⚕️',
        titleKey: 'onboarding.slide2Title',
        descKey: 'onboarding.slide2Desc',
        color: '#4A90D9',
    },
    {
        id: '3',
        icon: '📋',
        titleKey: 'onboarding.slide3Title',
        descKey: 'onboarding.slide3Desc',
        color: '#E8A838',
    },
];

export default function OnboardingScreen() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatlistRef = useRef<FlatList>(null);
    const scrollX = useRef(new Animated.Value(0)).current;

    async function completeOnboarding() {
        await AsyncStorage.setItem('onboarding_complete', 'true');
        router.replace('/(tabs)');
    }

    function handleNext() {
        if (currentIndex < SLIDES.length - 1) {
            flatlistRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
        } else {
            completeOnboarding();
        }
    }

    function handleSkip() {
        completeOnboarding();
    }

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index || 0);
        }
    }).current;

    return (
        <SafeAreaView style={styles.container}>
            {/* Skip button */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleSkip}>
                    <Text style={styles.skipText}>{t('common.skip')}</Text>
                </TouchableOpacity>
            </View>

            {/* Slides */}
            <Animated.FlatList
                ref={flatlistRef}
                data={SLIDES}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                bounces={false}
                keyExtractor={(item) => item.id}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                )}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
                renderItem={({ item }) => (
                    <View style={[styles.slide, { width }]}>
                        <View style={[styles.iconCircle, { backgroundColor: item.color + '20' }]}>
                            <Text style={styles.icon}>{item.icon}</Text>
                        </View>
                        <Text style={styles.title}>{t(item.titleKey)}</Text>
                        <Text style={styles.description}>{t(item.descKey)}</Text>
                    </View>
                )}
            />

            {/* Pagination + Button */}
            <View style={styles.footer}>
                {/* Dots */}
                <View style={styles.dots}>
                    {SLIDES.map((_, i) => {
                        const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
                        const dotWidth = scrollX.interpolate({
                            inputRange,
                            outputRange: [8, 24, 8],
                            extrapolate: 'clamp',
                        });
                        const opacity = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.3, 1, 0.3],
                            extrapolate: 'clamp',
                        });
                        return (
                            <Animated.View
                                key={i}
                                style={[styles.dot, { width: dotWidth, opacity, backgroundColor: colors.accentTeal }]}
                            />
                        );
                    })}
                </View>

                {/* Next / Get Started */}
                <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.8}>
                    <Text style={styles.nextButtonText}>
                        {currentIndex === SLIDES.length - 1
                            ? t('onboarding.getStarted')
                            : t('common.next')}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    header: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.md,
    },
    skipText: { ...typography.body, color: colors.textTertiary, fontWeight: '600' },

    // Slide
    slide: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing['3xl'],
    },
    iconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing['3xl'],
    },
    icon: { fontSize: 56 },
    title: {
        ...typography.h2,
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    description: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: spacing.lg,
    },

    // Footer
    footer: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing['3xl'],
    },
    dots: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing['2xl'],
        gap: spacing.sm,
    },
    dot: {
        height: 8,
        borderRadius: 4,
    },
    nextButton: {
        backgroundColor: colors.accentTeal,
        paddingVertical: spacing.lg,
        borderRadius: radius.full,
        alignItems: 'center',
    },
    nextButtonText: { ...typography.button, color: '#fff' },
});
