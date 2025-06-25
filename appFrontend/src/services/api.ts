import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV_CONFIG } from '../config/env';

console.log('Initializing API with URL:', ENV_CONFIG.API_BASE_URL);

export const api = axios.create({
  baseURL: ENV_CONFIG.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: ENV_CONFIG.API_TIMEOUT,
});

// Add a request interceptor to add the auth token to every request
api.interceptors.request.use(
  async (config) => {
    console.log('Making request to:', `${config.baseURL}${config.url}`);
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    console.log('Response received:', response.status, response.config.url);
    return response;
  },
  async (error) => {
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout:', error.config.url);
      throw new Error('Request timeout. Please check your connection and try again.');
    }
    
    if (!error.response) {
      console.error('Network error:', error.config.url);
      throw new Error('Network error. Please check your connection and try again.');
    }
    
    console.error('Response error:', {
      url: error.config.url,
      status: error.response.status,
      data: error.response.data
    });
    
    return Promise.reject(error);
  }
); 