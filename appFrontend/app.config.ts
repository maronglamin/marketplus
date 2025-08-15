import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'SNAP',
  slug: 'snap',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff'
  },
  assetBundlePatterns: [
    '**/*'
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.snap.app',
    config: {
      googleMapsApiKey: 'AIzaSyB9jq9xYp3R1NXHZEdQdaPI3TF3H0xRfxo'
    }
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff'
    },
    package: 'com.snap.app',
    config: {
      googleMaps: {
        apiKey: 'AIzaSyB9jq9xYp3R1NXHZEdQdaPI3TF3H0xRfxo'
      }
    }
  },
  web: {
    favicon: './assets/favicon.png'
  },
  extra: {
    localIp: '192.168.0.199',
    stripePublishableKey: 'pk_test_51G7XqgIFQtDBTvihaeU6FZCsQuHg1NQIkdd8CTGL0ZulPMIjQZUmFSW80gOzDpGe5UezYoqkc55WmQhpyYtZdLmk00QmAVRon0',
    googlePlacesApiKey: 'AIzaSyB9jq9xYp3R1NXHZEdQdaPI3TF3H0xRfxo',
    eas: {
      projectId: '04ad20e1-cff1-4422-a7b3-bdb123420968'
    }
  },
  plugins: [
    "expo-router",
    "expo-localization",
    [
      "@stripe/stripe-react-native",
      {
        enableGooglePay: true,
      },
    ]
  ]
}); 