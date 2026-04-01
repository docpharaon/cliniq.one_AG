import { useRef, useEffect } from 'react';
import { Animated, ViewStyle } from 'react-native';

interface FadeInProps {
    children: React.ReactNode;
    delay?: number;
    duration?: number;
    style?: ViewStyle;
}

/**
 * Fade-in entrance animation wrapper.
 * Slides up slightly while fading in for a premium feel.
 */
export function FadeIn({ children, delay = 0, duration = 400, style }: FadeInProps) {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(12)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration,
                delay,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration,
                delay,
                useNativeDriver: true,
            }),
        ]).start();
    }, [opacity, translateY, delay, duration]);

    return (
        <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
            {children}
        </Animated.View>
    );
}

interface StaggerProps {
    children: React.ReactNode[];
    staggerMs?: number;
    duration?: number;
}

/**
 * Stagger entrance animation — wraps each child in a FadeIn with increasing delay.
 * Use for lists of cards, quick actions, etc.
 */
export function Stagger({ children, staggerMs = 60, duration = 350 }: StaggerProps) {
    return (
        <>
            {children.map((child, i) => (
                <FadeIn key={i} delay={i * staggerMs} duration={duration}>
                    {child}
                </FadeIn>
            ))}
        </>
    );
}
