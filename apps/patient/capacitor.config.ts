import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.cliniqone.patient',
    appName: 'cliniq.one',
    webDir: 'dist',
    server: {
        androidScheme: 'https',
    },
    android: {
        backgroundColor: '#0B1120',
        allowMixedContent: false,
    },
    plugins: {
        SplashScreen: {
            launchAutoHide: true,
            backgroundColor: '#0B1120',
            androidScaleType: 'CENTER_CROP',
            showSpinner: false,
            splashFullScreen: true,
            splashImmersive: true,
        },
        StatusBar: {
            style: 'DARK',
            backgroundColor: '#0B1120',
        },
    },
};

export default config;
