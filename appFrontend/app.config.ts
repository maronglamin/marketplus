import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'SNAP App',
  slug: 'marketplace',
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
    bundleIdentifier: 'biz.cloudnexus.snap.app',
    infoPlist: {
      UILaunchStoryboardName: 'SplashScreen',
      UIRequiresFullScreen: true,
      NSCameraUsageDescription: 'This app uses the camera to take photos and videos for profile, receipts, and uploads.',
      NSPhotoLibraryUsageDescription: 'This app needs access to your photo library so you can select photos to upload.',
      NSPhotoLibraryAddUsageDescription: 'This app may save images or exports to your photo library when you choose to do so.',
      NSMicrophoneUsageDescription: 'This app may use the microphone for features that require audio recording.',
      NSLocationWhenInUseUsageDescription: 'This app needs access to your location to show your current position on the map and provide ride services.',
      NSLocationAlwaysAndWhenInUseUsageDescription: 'This app needs access to your location to show your current position on the map and provide ride services.',
      NSAppTransportSecurity: {
        NSExceptionDomains: {
          'snap.cloudnexus.biz': {
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
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff'
    },
    package: 'com.snap.app',
    usesCleartextTraffic: true,
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
    localIp: process.env.LOCAL_IP || 'snap.cloudnexus.biz',
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