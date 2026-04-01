/**
 * Native haptic feedback using Capacitor Haptics plugin.
 * Falls back to navigator.vibrate() on web.
 *
 * Usage:
 *   import { haptic } from '../hooks/useHaptics';
 *   haptic.light();   // tab switch, selection
 *   haptic.medium();  // button press, card tap
 *   haptic.heavy();   // destructive action confirm
 *   haptic.success(); // form submitted, action complete
 *   haptic.error();   // validation error, failure
 *   haptic.select();  // picker change, toggle
 */

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

const isNative = typeof (window as any).Capacitor !== 'undefined';

/** Light tap — tab switches, minor selections */
export function lightTap() {
    if (isNative) {
        Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    } else {
        navigator.vibrate?.(10);
    }
}

/** Medium tap — button presses, card taps, navigation */
export function mediumTap() {
    if (isNative) {
        Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
    } else {
        navigator.vibrate?.(25);
    }
}

/** Heavy tap — destructive actions, important confirmations */
export function heavyTap() {
    if (isNative) {
        Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
    } else {
        navigator.vibrate?.(40);
    }
}

/** Success notification — form submissions, completed actions */
export function successBuzz() {
    if (isNative) {
        Haptics.notification({ type: NotificationType.Success }).catch(() => {});
    } else {
        navigator.vibrate?.([10, 50, 10]);
    }
}

/** Error notification — validation errors, failures */
export function errorBuzz() {
    if (isNative) {
        Haptics.notification({ type: NotificationType.Error }).catch(() => {});
    } else {
        navigator.vibrate?.([50, 100, 50]);
    }
}

/** Warning notification — warnings, caution states */
export function warningBuzz() {
    if (isNative) {
        Haptics.notification({ type: NotificationType.Warning }).catch(() => {});
    } else {
        navigator.vibrate?.([30, 60, 30]);
    }
}

/** Selection change — picker change, toggle switch, checkbox */
export function selectionChanged() {
    if (isNative) {
        Haptics.selectionChanged().catch(() => {});
    } else {
        navigator.vibrate?.(5);
    }
}

/** Grouped export for convenient destructured import */
export const haptic = {
    light: lightTap,
    medium: mediumTap,
    heavy: heavyTap,
    success: successBuzz,
    error: errorBuzz,
    warning: warningBuzz,
    select: selectionChanged,
};
