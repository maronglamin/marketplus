import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as Device from 'expo-device';

function resolveApiBaseUrl(): string {
  const raw = (process.env.EXPO_PUBLIC_API_URL || 'https://api.cloudnexus.biz').replace(/\/$/, '');
  if (!__DEV__ || Device.isDevice) {
    return raw;
  }

  try {
    const url = new URL(raw);
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '10.0.2.2') {
      return raw;
    }
    // Simulators cannot reach a stale LAN IP. Talk to the host machine instead.
    url.hostname = Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';
    return url.origin;
  } catch {
    return raw;
  }
}

// Centralized environment configuration
export const ENV_CONFIG = {
  // API Configuration
  API_BASE_URL: resolveApiBaseUrl(),
  API_TIMEOUT: 30000,
  
  // Local IP for development (used for diagnostics only)
  LOCAL_IP: Constants.expoConfig?.extra?.localIp || 'api.cloudnexus.biz',
  
  // App Configuration
  APP_NAME: 'SNAP',
  APP_VERSION: '1.0.2',
  
  // Feature Flags
  ENABLE_DEBUG_LOGGING: __DEV__,
  ENABLE_ANALYTICS: !__DEV__,
  ALLOW_TEST_PAYMENTS:
    process.env.EXPO_PUBLIC_ALLOW_TEST_PAYMENTS === 'true' ||
    (process.env.EXPO_PUBLIC_ALLOW_TEST_PAYMENTS !== 'false' && __DEV__),
};

// Helper function to get API URL
export const getApiUrl = (): string => ENV_CONFIG.API_BASE_URL;

// Helper function to get image URL
export const getImageUrl = (imagePath: string): string => {
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  return `${ENV_CONFIG.API_BASE_URL}${imagePath}`;
};

// Export individual values for backward compatibility
export const API_URL = ENV_CONFIG.API_BASE_URL;
export const LOCAL_IP = ENV_CONFIG.LOCAL_IP; 