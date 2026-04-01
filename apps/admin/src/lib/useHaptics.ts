/**
 * Admin App — Haptic Feedback Utility
 * Uses Capacitor Haptics when running as a native app,
 * falls back to navigator.vibrate() for web/PWA.
 */

import { Capacitor } from '@capacitor/core';

let HapticsPlugin: any = null;

if (Capacitor.isNativePlatform()) {
    import('@capacitor/haptics').then((m) => {
        HapticsPlugin = m.Haptics;
    });
}

type ImpactStyle = 'LIGHT' | 'MEDIUM' | 'HEAVY';
type NotificationType = 'SUCCESS' | 'WARNING' | 'ERROR';

async function impact(style: ImpactStyle) {
    try {
        if (HapticsPlugin) {
            await HapticsPlugin.impact({ style });
        } else if (navigator.vibrate) {
            const ms = style === 'LIGHT' ? 10 : style === 'MEDIUM' ? 20 : 30;
            navigator.vibrate(ms);
        }
    } catch {}
}

async function notification(type: NotificationType) {
    try {
        if (HapticsPlugin) {
            await HapticsPlugin.notification({ type });
        } else if (navigator.vibrate) {
            navigator.vibrate(type === 'ERROR' ? [30, 50, 30] : type === 'WARNING' ? [20, 40, 20] : [15]);
        }
    } catch {}
}

async function selectionChanged() {
    try {
        if (HapticsPlugin) {
            await HapticsPlugin.selectionChanged();
        } else if (navigator.vibrate) {
            navigator.vibrate(5);
        }
    } catch {}
}

/** Stateless singleton — import and call directly */
export const haptic = {
    light:   () => impact('LIGHT'),
    medium:  () => impact('MEDIUM'),
    heavy:   () => impact('HEAVY'),
    success: () => notification('SUCCESS'),
    warning: () => notification('WARNING'),
    error:   () => notification('ERROR'),
    select:  () => selectionChanged(),
};
