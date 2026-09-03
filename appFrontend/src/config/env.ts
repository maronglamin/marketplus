import Constants from 'expo-constants';

// Centralized environment configuration
export const ENV_CONFIG = {
  // API Configuration
  API_BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'https://api.cloudnexus.biz',
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