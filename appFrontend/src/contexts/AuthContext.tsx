import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
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
  refreshUser: () => Promise<void>;
  reinitializeAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const initializeAuth = useCallback(async () => {
    try {
      console.log('AuthContext: Starting initialization...');
      const storedToken = await AsyncStorage.getItem('token');
      const storedUser = await AsyncStorage.getItem('user');
      
      console.log('AuthContext: Stored data found:', { 
        hasToken: !!storedToken, 
        hasUser: !!storedUser,
        tokenLength: storedToken?.length,
        tokenPreview: storedToken ? `${storedToken.substring(0, 20)}...` : 'None'
      });
      
      if (storedToken && storedUser) {
        const userData = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(userData);
        console.log('AuthContext: Auth initialized from storage:', { 
          token: !!storedToken, 
          user: userData,
          userId: userData?.id,
          tokenSet: !!storedToken
        });
      } else if (storedToken && !storedUser) {
        // We have a token but no user data - try to fetch user data
        console.log('AuthContext: Token found but no user data, fetching user...');
        try {
          const response = await api.get('/api/users/me');
          const userData = response.data;
          await AsyncStorage.setItem('user', JSON.stringify(userData));
          setToken(storedToken);
          setUser(userData);
          console.log('AuthContext: User data fetched and stored:', userData);
        } catch (error) {
          console.error('AuthContext: Failed to fetch user data:', error);
          // Clear invalid token
          await AsyncStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      } else {
        console.log('AuthContext: No stored auth data found');
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('AuthContext: Error initializing auth:', error);
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
      console.log('AuthContext: Initialization complete, isLoading set to false');
    }
  }, []);

  // Initialize auth on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Debug user state changes
  useEffect(() => {
    console.log('AuthContext: User state changed:', { 
      hasUser: !!user, 
      userId: user?.id,
      userFirstName: user?.firstName 
    });
  }, [user]);

  // Debug token state changes
  useEffect(() => {
    console.log('AuthContext: Token state changed:', { 
      hasToken: !!token, 
      tokenLength: token?.length,
      tokenPreview: token ? `${token.substring(0, 20)}...` : 'None'
    });
  }, [token]);

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

  const refreshUser = useCallback(async () => {
    try {
      console.log('AuthContext: Refreshing user data...');
      const response = await api.get('/api/users/me');
      const userData = response.data;
      
      console.log('AuthContext: Fresh user data received:', userData);
      
      // Update AsyncStorage with fresh user data
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      
      // Update context state
      setUser(userData);
      
      console.log('AuthContext: User data refreshed successfully');
    } catch (error) {
      console.error('AuthContext: Error refreshing user data:', error);
      throw error;
    }
  }, []);

  const reinitializeAuth = useCallback(async () => {
    console.log('AuthContext: Reinitializing auth...');
    setIsLoading(true);
    try {
      await initializeAuth();
    } finally {
      setIsLoading(false);
    }
  }, [initializeAuth]);

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
        refreshUser,
        reinitializeAuth,
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