import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Billkit',
  slug: 'billkit-mobile',
  scheme: 'billkit',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'com.quvantic.billkit',
    supportsTablet: true,
    associatedDomains: ['applinks:billkit-app.quvantic.com'],
    infoPlist: {
      NSUserNotificationsUsageDescription: 'Billkit sends an alert when a customer pays an invoice.',
    },
  },
  android: {
    package: 'com.quvantic.billkit',
    adaptiveIcon: {
      backgroundColor: '#0E6B66',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          { scheme: 'https', host: 'billkit-app.quvantic.com', pathPrefix: '/pay' },
          { scheme: 'https', host: 'billkit-app.quvantic.com', pathPrefix: '/auth' },
          { scheme: 'billkit' },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-font',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#0E6B66',
        image: './assets/splash-icon.png',
        imageWidth: 180,
      },
    ],
    'expo-web-browser',
    'expo-sharing',
    [
      'expo-notifications',
      {
        color: '#0E6B66',
      },
    ],
  ],
  experiments: {
    typedRoutes: false,
  },
  extra: {
    router: {},
  },
};

export default config;
