import { Platform } from 'react-native';

/**
 * Lightweight haptic feedback utilities that no-op gracefully on web.
 * Uses expo-haptics on native (iOS/Android).
 */

let Haptics: typeof import('expo-haptics') | null = null;

// Only load on native platforms
if (Platform.OS !== 'web') {
    try {
        Haptics = require('expo-haptics');
    } catch {
        // expo-haptics not available — no-op
    }
}

/** Light tap — use for button presses and selections */
export function lightTap() {
    Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/** Medium tap — use for confirming actions */
export function mediumTap() {
    Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

/** Success buzz — use after form submissions or completed actions */
export function successBuzz() {
    Haptics?.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/** Error buzz — use for validation errors */
export function errorBuzz() {
    Haptics?.notificationAsync(Haptics.NotificationFeedbackType.Error);
}

/** Selection change — use for picker changes and toggle switches */
export function selectionChanged() {
    Haptics?.selectionAsync();
}
