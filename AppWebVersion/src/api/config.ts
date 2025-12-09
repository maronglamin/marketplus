import axios, { AxiosInstance } from 'axios';
import { API_CONFIG } from '../config/api';

// API Configuration
const API_BASE_URL = API_CONFIG.BASE_URL;
const API_TIMEOUT = API_CONFIG.TIMEOUT;

// Cache for API instance
let apiInstance: AxiosInstance | null = null;

// Create and configure API instance
export const getApi = (): AxiosInstance => {
  if (apiInstance) {
    return apiInstance;
  }

  console.log('Creating API instance with URL:', API_BASE_URL);
  
  apiInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: API_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  // Add request interceptor
  apiInstance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      console.log('Making request to:', (config.baseURL || '') + (config.url || ''));
      return config;
    },
    (error) => {
      console.error('Request error:', error);
      return Promise.reject(error);
    }
  );

  // Add response interceptor for better error handling
  apiInstance.interceptors.response.use(
    (response) => {
      console.log('Response received:', response.status);
      return response;
    },
    (error) => {
      // Normalize helper to detect terminated/disabled accounts
      const isTerminatedSignal = (): boolean => {
        try {
          const status: number | undefined = error?.response?.status;
          const code: string | undefined = error?.response?.data?.code;
          const message: string = String(error?.response?.data?.message || '').toLowerCase();
          const text: string = String(error?.response?.data || '').toLowerCase();
          const hasTerminatedWord =
            message.includes('terminated') ||
            message.includes('deactivated') ||
            message.includes('disabled') ||
            text.includes('terminated') ||
            text.includes('deactivated') ||
            text.includes('disabled');
          const statusIndicatesTermination = status === 410 || status === 423 || status === 403;
          const codeIndicatesTermination = code === 'USER_TERMINATED' || code === 'ACCOUNT_TERMINATED';
          return Boolean((statusIndicatesTermination && hasTerminatedWord) || codeIndicatesTermination);
        } catch {
          return false;
        }
      };

      if (error.code === 'ECONNABORTED') {
        console.error('Request timeout:', error);
        throw new Error('Request timeout. Please check your connection and try again.');
      }
      
      if (!error.response) {
        console.error('Network error:', error);
        throw new Error('Network error. Please check your connection and try again.');
      }
      
      console.error('Response error:', error.response?.status, error.response?.data);

      // Global handling for terminated accounts: clear auth and broadcast event so UI can react
      if (isTerminatedSignal()) {
        try {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.setItem('accountTerminated', '1');
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth:terminated'));
          }
        } catch {}
      }
      return Promise.reject(error);
    }
  );

  return apiInstance;
};

export default getApi;
