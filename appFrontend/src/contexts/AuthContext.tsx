import React, { createContext, useContext, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/api';

interface AuthContextType {
  user: any | null;
  token: string | null;
  isLoading: boolean;
  login: (phoneNumber: string, deviceInfo: any) => Promise<void>;
  verifyOTP: (phoneNumber: string, code: string, deviceInfo: any) => Promise<void>;
  register: (userData: any) => Promise<void>;
  loginWithPin: (deviceId: string, pin: string, deviceInfo: any) => Promise<void>;
  logout: () => Promise<void>;
  changePin: (currentPin: string, newPin: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (phoneNumber: string, deviceInfo: any) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/initiate-login', {
        phoneNumber,
        deviceInfo,
      });
      return response.data;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyOTP = useCallback(async (phoneNumber: string, code: string, deviceInfo: any) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/verify-otp', {
        phoneNumber,
        code,
        deviceInfo,
      });
      if (response.data.token) {
        await AsyncStorage.setItem('token', response.data.token);
        await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
        setToken(response.data.token);
        setUser(response.data.user);
      }
      return response.data;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (userData: any) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/register', userData);
      if (response.data.token) {
        await AsyncStorage.setItem('token', response.data.token);
        await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
        setToken(response.data.token);
        setUser(response.data.user);
      }
      return response.data;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithPin = useCallback(async (deviceId: string, pin: string, deviceInfo: any) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', {
        deviceId,
        pin,
        deviceInfo,
      });
      if (response.data.token) {
        await AsyncStorage.setItem('token', response.data.token);
        await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
        setToken(response.data.token);
        setUser(response.data.user);
      }
      return response.data;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await api.post('/auth/logout');
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const changePin = useCallback(async (currentPin: string, newPin: string) => {
    setIsLoading(true);
    try {
      await api.post('/auth/change-pin', {
        currentPin,
        newPin,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        verifyOTP,
        register,
        loginWithPin,
        logout,
        changePin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 