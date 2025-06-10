import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Cache for API instance
let apiInstance: any = null;

// Cache for API URL
let cachedApiUrl: string | null = null;

// Get API URL with caching
const getApiUrl = async (): Promise<string> => {
  // Clear any cached URL
  cachedApiUrl = null;
  await AsyncStorage.removeItem('apiUrl');

  // Handle different environments and platforms
  let defaultUrl: string;
  
  if (__DEV__) {
    // Development environment
    if (Platform.OS === 'android') {
      // Android emulator uses 10.0.2.2 to access host machine
      defaultUrl = 'http://192.168.137.222:3000/api';
    } else if (Platform.OS === 'ios') {
      // For Expo on iOS device, use the local IP address
      defaultUrl = 'http://192.168.137.222:3000/api';
    } else {
      // Fallback for other platforms
      defaultUrl = 'http://192.168.137.222:3000/api';
    }
  } else {
    // Production environment
    defaultUrl = 'https://api.marketplace.com/api';
  }

  console.log('Using API URL:', defaultUrl);
  cachedApiUrl = defaultUrl;
  await AsyncStorage.setItem('apiUrl', defaultUrl);
  return defaultUrl;
};

// Create and configure API instance
const getApi = async () => {
  // Clear any existing instance
  apiInstance = null;

  try {
    const apiUrl = await getApiUrl();
    console.log('Creating API instance with URL:', apiUrl);
    
    apiInstance = axios.create({
      baseURL: apiUrl,
      timeout: 30000, // 30 second timeout
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Add request interceptor
    apiInstance.interceptors.request.use(
      async (config: any) => {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        console.log('Making request to:', config.url);
        return config;
      },
      (error: any) => {
        console.error('Request error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for better error handling
    apiInstance.interceptors.response.use(
      (response: any) => {
        console.log('Response received:', response.status);
        return response;
      },
      (error: any) => {
        if (error.code === 'ECONNABORTED') {
          console.error('Request timeout:', error);
          throw new Error('Request timeout. Please check your connection and try again.');
        }
        
        if (!error.response) {
          console.error('Network error:', error);
          throw new Error('Network error. Please check your connection and try again.');
        }
        
        console.error('Response error:', error.response?.status, error.response?.data);
        return Promise.reject(error);
      }
    );

    return apiInstance;
  } catch (error) {
    console.error('Error creating API instance:', error);
    throw new Error('Failed to create API instance');
  }
};

export default getApi; 