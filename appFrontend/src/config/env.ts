import Constants from 'expo-constants';

// Centralized environment configuration
export const ENV_CONFIG = {
  // API Configuration
  API_BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'http://172.20.10.3:3000',
  API_TIMEOUT: 30000,
  
  // Local IP for development (used for diagnostics only)
  LOCAL_IP: Constants.expoConfig?.extra?.localIp || 'localhost',
  
  // App Configuration
  APP_NAME: 'SNAP',
  APP_VERSION: '1.0.1',
  
  // Feature Flags
  ENABLE_DEBUG_LOGGING: __DEV__,
  ENABLE_ANALYTICS: !__DEV__,
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