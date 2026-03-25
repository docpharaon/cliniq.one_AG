import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cliniqone.doctor',
  appName: 'cliniq.one Doctor',
  webDir: 'www',
  server: {
    url: 'https://cliniq-one-ag-doctor.vercel.app',
    androidScheme: 'https',
    cleartext: false,
  },
  android: {
    buildOptions: {
      signingType: 'apksigner',
    },
    allowMixedContent: true,
    backgroundColor: '#0A0E1A',
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
      resizeOnFullScreen: true,
    },
    LocalNotifications: {
      smallIcon: 'ic_notification',
      iconColor: '#2DD4BF',
      sound: 'default',
    },
  },
};

export default config;
