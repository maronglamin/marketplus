import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { ENV_CONFIG } from '../config/env';

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
  // Always derive from centralized config; append /api once
  const base = (ENV_CONFIG.API_BASE_URL || '').replace(/\/$/, '');
  const defaultUrl = `${base}/api`;

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
      timeout: ENV_CONFIG.API_TIMEOUT,
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