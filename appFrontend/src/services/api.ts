import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Use the local IP from app config or fallback to a default
const LOCAL_IP = Constants.expoConfig?.extra?.localIp || '192.168.110.48';
const API_URL = process.env.EXPO_PUBLIC_API_URL || `http://${LOCAL_IP}:3000`;

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to add the auth token to every request
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear the token and redirect to login
      await AsyncStorage.removeItem('token');
      // You might want to add navigation logic here to redirect to login
    }
    return Promise.reject(error);
  }
); 