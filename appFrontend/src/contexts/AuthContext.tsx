import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/api';
import { driverService } from '../services/driverService';
import { notificationService } from '../services/notificationService';
import { realTimeRideService } from '../services/realTimeRideService';
import imageCache from '../utils/imageCache';

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
  refreshUserFromStorage: () => Promise<{ token: string | null; user: any | null } | null>;
  forceClearAuth: () => Promise<void>;
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
      const response = await api.post('/api/auth/initiate-login', {
        phoneNumber,
        deviceInfo,
      });
      return response.data;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyOTP = useCallback(async (phoneNumber: string, code: string, deviceInfo: any) => {
    console.log('🔐 Starting OTP verification for:', phoneNumber);
    setIsLoading(true);
    
    try {
      const response = await api.post('/api/auth/verify-otp', {
        phoneNumber,
        code,
        deviceInfo,
      });
      
      console.log('✅ OTP verification response received:', response.data);
      
      if (response.data.token && response.data.user) {
        console.log('💾 Storing auth data...');
        
        // Store in AsyncStorage first
        await AsyncStorage.setItem('token', response.data.token);
        await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
        
        console.log('👤 Setting user in context:', response.data.user);
        
        // Update context state
        setToken(response.data.token);
        setUser(response.data.user);
        
        console.log('✅ Auth data stored and context updated successfully');
      } else {
        console.warn('⚠️ No token or user data in OTP response');
        throw new Error('Invalid response: missing token or user data');
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ OTP verification failed:', error);
      // Ensure state is cleared on error
      setToken(null);
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
      console.log('🏁 OTP verification process finished');
    }
  }, []);

  const register = useCallback(async (userData: any) => {
    console.log('📝 Starting user registration...');
    setIsLoading(true);
    
    try {
      console.log('📝 Registering user:', userData);
      const response = await api.post('/api/auth/register', userData);
      
      console.log('✅ Registration response received:', response.data);
      
      if (response.data.token && response.data.user) {
        console.log('💾 Storing auth data...');
        
        // Store in AsyncStorage first
        await AsyncStorage.setItem('token', response.data.token);
        await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
        
        console.log('👤 Setting user in context:', response.data.user);
        
        // Update context state
        setToken(response.data.token);
        setUser(response.data.user);
        
        console.log('✅ Auth data stored and context updated successfully');
      } else {
        console.warn('⚠️ No token or user data in registration response');
        throw new Error('Invalid response: missing token or user data');
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ Registration failed:', error);
      // Ensure state is cleared on error
      setToken(null);
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
      console.log('🏁 Registration process finished');
    }
  }, []);

  const loginWithPin = useCallback(async (deviceId: string, pin: string, deviceInfo: any) => {
    console.log('🔐 Starting PIN login for device:', deviceId);
    setIsLoading(true);
    
    try {
      console.log('🔐 Logging in with PIN for device:', deviceId);
      const response = await api.post('/api/auth/login', {
        deviceId,
        pin,
        deviceInfo,
      });
      
      console.log('✅ PIN login response received:', response.data);
      
      if (response.data.token && response.data.user) {
        console.log('💾 Storing auth data...');
        
        // Store in AsyncStorage first
        await AsyncStorage.setItem('token', response.data.token);
        await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
        
        console.log('👤 Setting user in context:', response.data.user);
        
        // Update context state
        setToken(response.data.token);
        setUser(response.data.user);
        
        console.log('✅ Auth data stored and context updated successfully');
      } else {
        console.warn('⚠️ No token or user data in PIN login response');
        throw new Error('Invalid response: missing token or user data');
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ PIN login failed:', error);
      // Ensure state is cleared on error
      setToken(null);
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
      console.log('🏁 PIN login process finished');
    }
  }, []);

  const logout = useCallback(async () => {
    console.log('🚪 Starting logout process...');
    setIsLoading(true);
    
    try {
      // Immediately clear in-memory auth state to prevent race conditions
      console.log('🧹 Immediately clearing in-memory auth state...');
      setToken(null);
      setUser(null);

      // Best-effort: set driver offline before logging out (ignore errors)
      try {
        console.log('🔄 Setting driver status to offline before logout...');
        await driverService.updateDriverStatus(false);
        console.log('✅ Driver status set to offline successfully');
      } catch (error) {
        console.error('⚠️ Error setting driver status to offline:', error);
      }

      // Best-effort: remove push token from backend and local storage
      try {
        console.log('🔄 Removing push notification token...');
        await notificationService.removeTokenFromBackend();
        console.log('✅ Push notification token removed');
      } catch (error) {
        console.error('⚠️ Error removing push token:', error);
      }

      // Disconnect realtime services (websocket)
      try {
        console.log('🔌 Disconnecting real-time services...');
        realTimeRideService.disconnect();
      } catch (error) {
        console.error('⚠️ Error disconnecting real-time services:', error);
      }

      // Call backend logout while token is still present
      try {
        await api.post('/api/auth/logout');
      } catch (error) {
        console.warn('⚠️ Backend logout call failed (continuing):', error);
      }

      // Clear stored credentials and related keys
      const keysToRemove = [
        'token',
        'user',
        'deviceInfo',
        'phoneNumber',
        'apiUrl',
        'fcmToken'
      ];

      try {
        console.log('🧹 Clearing AsyncStorage keys:', keysToRemove);
        await AsyncStorage.multiRemove(keysToRemove);
        console.log('✅ AsyncStorage cleared successfully');
      } catch (error) {
        console.error('⚠️ Error clearing AsyncStorage keys:', error);
      }

      // Clear in-memory caches
      try {
        console.log('🧼 Clearing image cache...');
        imageCache.clearCache();
        console.log('✅ Image cache cleared');
      } catch (error) {
        console.error('⚠️ Error clearing image cache:', error);
      }

      console.log('✅ Logout complete: all state and storage cleared');
    } catch (error) {
      console.error('❌ Error during logout:', error);
      // Ensure state is cleared even if there's an error
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
      console.log('🏁 Logout process finished');
    }
  }, []);

  const changePin = useCallback(async (currentPin: string, newPin: string) => {
    setIsLoading(true);
    try {
      const response = await api.post('/api/auth/change-pin', {
        currentPin,
        newPin,
      });
      
      // If we get here, PIN change was successful
      console.log('✅ PIN changed successfully');
      return response.data;
    } catch (error: any) {
      console.log('🔍 PIN change response:', error.response?.status, error.response?.data);
      
      // Re-throw all errors, including 401
      // Let the calling component handle the 401 as success
      throw error;
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

  // Manual refresh user data from storage
  const refreshUserFromStorage = useCallback(async () => {
    try {
      console.log('🔄 Refreshing user data from storage...');
      const storedToken = await AsyncStorage.getItem('token');
      const storedUser = await AsyncStorage.getItem('user');
      
      console.log('📦 Stored data found:', { 
        hasToken: !!storedToken, 
        hasUser: !!storedUser,
        tokenPreview: storedToken ? `${storedToken.substring(0, 20)}...` : 'None'
      });
      
      if (storedToken && storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          console.log('👤 Parsed user data:', userData);
          
          // Validate that we have essential user data
          if (!userData.id) {
            console.warn('⚠️ Stored user data missing ID, clearing invalid data');
            await AsyncStorage.multiRemove(['token', 'user']);
            setToken(null);
            setUser(null);
            return null;
          }
          
          setToken(storedToken);
          setUser(userData);
          
          console.log('✅ User data refreshed from storage successfully');
          return { token: storedToken, user: userData };
        } catch (parseError) {
          console.error('❌ Error parsing stored user data:', parseError);
          // Clear corrupted data
          await AsyncStorage.multiRemove(['token', 'user']);
          setToken(null);
          setUser(null);
          return null;
        }
      } else {
        console.log('⚠️ No stored auth data found');
        setToken(null);
        setUser(null);
        return null;
      }
    } catch (error) {
      console.error('❌ Error refreshing user data from storage:', error);
      setToken(null);
      setUser(null);
      return null;
    }
  }, []);

  const forceClearAuth = useCallback(async () => {
    console.log('AuthContext: Forcing clear of all auth data...');
    setIsLoading(true);
    try {
      // Clear in-memory state
      setToken(null);
      setUser(null);

      // Clear AsyncStorage
      const keysToRemove = [
        'token',
        'user',
        'deviceInfo',
        'phoneNumber',
        'apiUrl',
        'fcmToken'
      ];
      await AsyncStorage.multiRemove(keysToRemove);
      console.log('✅ AsyncStorage cleared successfully');

      // Clear in-memory caches
      imageCache.clearCache();
      console.log('✅ Image cache cleared');

      console.log('✅ Auth data force cleared');
    } catch (error) {
      console.error('❌ Error during force clear:', error);
    } finally {
      setIsLoading(false);
      console.log('🏁 Force clear process finished');
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
        refreshUser,
        reinitializeAuth,
        refreshUserFromStorage,
        forceClearAuth,
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