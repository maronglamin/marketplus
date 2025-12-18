import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'SNAP',
  slug: 'marketplace',
  version: '1.0.1',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    backgroundColor: '#ffffff'
  },
  assetBundlePatterns: [
    '**/*'
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'biz.cloudnexus.snap.app',
    buildNumber: '4',
    infoPlist: {
      UILaunchStoryboardName: 'SplashScreen',
      UIRequiresFullScreen: true,
      NSCameraUsageDescription: 'Camera access is required to allow you to capture and upload identification and registration documents for identity verification (KYC) and account approval. The camera is used only when you choose to upload documents.',
      NSPhotoLibraryUsageDescription: 'This app needs access to your photo library so you can select photos to upload for identity verification (KYC) and account approval.',
      NSPhotoLibraryAddUsageDescription: 'This app may save images or exports to your photo library when you choose to do so.',
      NSMicrophoneUsageDescription: 'This app may use the microphone for features that require audio recording.',
      NSLocationWhenInUseUsageDescription: 'Your location is used to find nearby drivers and rental services, calculate trip distances and fares, provide accurate pickup and drop‑off points, and enable real‑time ride tracking during an active trip. Location data is only accessed while you are using the app.',
      NSLocationAlwaysAndWhenInUseUsageDescription: 'Your location is used to find nearby drivers and rental services, calculate trip distances and fares, provide accurate pickup and drop‑off points, and enable real‑time ride tracking during an active trip. Location data is only accessed while you are using the app.',
      NSAppTransportSecurity: {
        NSExceptionDomains: {
          'api.cloudnexus.biz': {
            NSTemporaryExceptionAllowsInsecureHTTPLoads: true,
            NSIncludesSubdomains: true,
          },
        },
      },
    },
    config: {
      googleMapsApiKey: 'AIzaSyB9jq9xYp3R1NXHZEdQdaPI3TF3H0xRfxo'
    }
  },
  android: ({
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon-foreground.png',
      backgroundColor: '#ffffff'
    },
    package: 'biz.cloudnexus.snap.app',
    versionCode: 3,
    usesCleartextTraffic: true,
    config: {
      googleMaps: {
        apiKey: 'AIzaSyB9jq9xYp3R1NXHZEdQdaPI3TF3H0xRfxo'
      }
    }
  } as any),
  web: {
    favicon: './assets/favicon.png'
  },
  extra: {
    localIp: process.env.LOCAL_IP || 'api.cloudnexus.biz',
    stripePublishableKey: 'pk_live_51S2wTxPRKWuZ5Vsn9EGuL9TN564Nt9zvhtVFfXdM6GIuPyd0wu48o2pWlmTZngXlspi1GlT4MyEH1NzYudpH1T6F00lFehMnpd',
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