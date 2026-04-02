import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cliniqone.admin',
  appName: 'cliniq.one Admin',
  webDir: '../admin/dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  android: {
    buildOptions: {
      signingType: 'apksigner',
    },
    allowMixedContent: true,
    backgroundColor: '#0A0E1A',
  },
  ios: {
    scheme: 'App',
    backgroundColor: '#0A0E1A',
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 0,
      backgroundColor: '#0A0E1A',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0A0E1A',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: false,
    },
    LocalNotifications: {
      smallIcon: 'ic_notification',
      iconColor: '#2DD4BF',
      sound: 'default',
    },
  },
};

export default config;
