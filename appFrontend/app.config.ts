import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const { developmentClient, ...baseConfig } = config;
  const isProductionBuild =
    process.env.NODE_ENV === 'production' ||
    ['preview', 'production'].includes(process.env.EAS_BUILD_PROFILE ?? '');
  return ({
  ...baseConfig,
  name: 'SNAP',
  slug: 'snap',
  version: '1.0.3',
  jsEngine: 'jsc',
  orientation: 'portrait',
  icon: './assets/adaptive-icon-foreground.png',
  userInterfaceStyle: 'light',
  scheme: 'snap',
  splash: {
    backgroundColor: '#ffffff'
  },
  assetBundlePatterns: [
    '**/*'
  ],
  ios: {
    jsEngine: 'jsc',
    supportsTablet: true,
    bundleIdentifier: 'biz.cloudnexus.snap.app',
    buildNumber: '16',
    infoPlist: {
      UILaunchStoryboardName: 'SplashScreen',
      UIRequiresFullScreen: true,
      NSCameraUsageDescription: 'We use your camera so you can take a profile photo and capture ID/registration documents required for identity verification (KYC) and account approval. Access is requested only when you choose “Take Photo” in Account Settings or during verification, and is not used in the background.',
      NSPhotoLibraryUsageDescription: 'We use your photo library so you can choose an existing picture for your profile and upload ID/registration images needed to verify your identity and manage your account. Access is requested only when you select “Choose from Library” and is not used in the background.',
      NSPhotoLibraryAddUsageDescription: 'We save images to your library only when you explicitly choose to download or save an image (for example, an export or receipt).',
      NSMicrophoneUsageDescription: 'We use the microphone for features that require audio recording. We only listen while you see “Listening…”, and do not store audio.',
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
    jsEngine: 'jsc',
    icon: './assets/adaptive-icon-foreground.png',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon-foreground.png',
      backgroundColor: '#00bcd4'
    },
    package: 'biz.cloudnexus.snap.app',
    versionCode: 17,
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
  autolinking: isProductionBuild ? {
    android: {
      exclude: [
        'expo-dev-client',
        'expo-dev-launcher',
        'expo-dev-menu',
        'expo-dev-menu-interface',
      ],
    },
    ios: {
      exclude: [
        'expo-dev-client',
        'expo-dev-launcher',
        'expo-dev-menu',
        'expo-dev-menu-interface',
      ],
    },
  } : undefined,
  plugins: [
    "expo-router",
    "expo-localization",
    "expo-secure-store",
    [
      "@stripe/stripe-react-native",
      {
        enableGooglePay: true,
      },
    ]
  ]
});
};
