import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/env';

// Normalize base URL to avoid accidental double `/api` when endpoints already include it
const normalizeBaseUrl = (url: string): string => {
  // Trim trailing slashes
  let normalized = (url || '').replace(/\/+$/, '');
  // If URL ends with `/api`, strip it so all callers can safely use `/api/...` paths
  if (/\/api$/i.test(normalized)) {
    console.warn('[API] EXPO_PUBLIC_API_URL should not include /api. Stripping it to prevent duplicate segments.');
    normalized = normalized.replace(/\/api$/i, '');
  }
  return normalized;
};

const api = axios.create({
  baseURL: normalizeBaseUrl(API_URL),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Add a request interceptor to add the auth token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    console.log('API Request:', {
      url: config.url,
      method: config.method,
      hasToken: !!token,
      tokenLength: token?.length,
      baseURL: config.baseURL
    });
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn('No authentication token found for request:', config.url);
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      url: response.config.url,
      status: response.status,
      method: response.config.method
    });
    return response;
  },
  async (error) => {
    console.error('API Response Error:', {
      url: error.config?.url,
      status: error.response?.status,
      method: error.config?.method,
      message: error.message,
      data: error.response?.data
    });

    if (error.response?.status === 401) {
      const hadAuthHeader = !!error.config?.headers?.Authorization;
      const url = error.config?.url || '';
      // For anonymous/public browsing (no auth header) do NOT clear credentials
      // Only clear when a real token was sent (expired/invalid session)
      if (hadAuthHeader) {
        console.warn('Authentication failed with token - clearing stored credentials');
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
      } else {
        console.warn('401 received for anonymous request, leaving credentials untouched:', url);
      }
    }
    return Promise.reject(error);
  }
);

export { api }; 