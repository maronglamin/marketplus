import getApi from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import * as Application from 'expo-application';

// Cache for API instance
let apiInstance: any = null;

// Cache for device info
let cachedDeviceInfo: any = null;

export interface LoginResponse {
  token: string;
  user: any;
  isFirstLogin?: boolean;
}

export interface AuthError {
  message: string;
  errors?: { [key: string]: string[] };
}

// Get or create device info
export const getDeviceInfo = async () => {
  if (cachedDeviceInfo) {
    return cachedDeviceInfo;
  }

  try {
    // Try to get from storage first
    const storedInfo = await AsyncStorage.getItem('deviceInfo');
    if (storedInfo) {
      cachedDeviceInfo = JSON.parse(storedInfo);
      return cachedDeviceInfo;
    }

    // Get device identifiers
    const deviceId = Platform.OS === 'ios' 
      ? await Application.getIosIdForVendorAsync()
      : Application.getAndroidId();

    // Create new device info with proper format
    const deviceInfo = {
      deviceId: deviceId || Device.deviceName?.replace(/[^a-zA-Z0-9]/g, '') || 'unknown',
      deviceName: Device.deviceName || 'Unknown Device',
      deviceType: Device.deviceType === 1 ? 'phone' : 
                 Device.deviceType === 2 ? 'tablet' : 
                 Device.deviceType === 3 ? 'desktop' : 
                 Device.deviceType === 4 ? 'tv' : 'unknown',
      osVersion: Device.osVersion || 'unknown',
      brand: Device.brand || 'unknown',
      modelName: Device.modelName || 'unknown'
    };

    console.log('Generated device info:', deviceInfo);

    // Cache and store
    cachedDeviceInfo = deviceInfo;
    await AsyncStorage.setItem('deviceInfo', JSON.stringify(deviceInfo));
    return deviceInfo;
  } catch (error) {
    console.error('Error getting device info:', error);
    // Return a fallback device info
    return {
      deviceId: 'unknown',
      deviceName: 'Unknown Device',
      deviceType: 'unknown',
      osVersion: 'unknown',
      brand: 'unknown',
      modelName: 'unknown'
    };
  }
};

// Initialize device info on app start
export const initializeDeviceInfo = async () => {
  try {
    await getDeviceInfo();
  } catch (error) {
    console.error('Error initializing device info:', error);
  }
};

export const initiateLogin = async (phoneNumber: string): Promise<{ isDeviceVerified: boolean; isRegistered: boolean }> => {
  try {
    console.log('Initiating login for:', phoneNumber);
    
    // Store phone number for later use
    await AsyncStorage.setItem('phoneNumber', phoneNumber);
    
    // Get device info (cached or new)
    const deviceInfo = await getDeviceInfo();

    // Get or create API instance
    if (!apiInstance) {
      apiInstance = await getApi();
    }

    // Make the request
    const response = await apiInstance.post('/auth/initiate-login', { 
      phoneNumber,
      deviceInfo
    });
    
    console.log('Login initiation response:', {
      status: response.status,
      data: response.data
    });

    // For new users, we expect a 200 response with OTP sent
    if (response.status === 200) {
      // If user exists in response, check registration status
      if (response.data.user) {
        const isDeviceVerified = response.data.requiresPin === true;
        const isRegistered = Boolean(
          response.data.user?.firstName && 
          response.data.user?.lastName &&
          response.data.user?.firstName.trim() !== '' &&
          response.data.user?.lastName.trim() !== ''
        );
        return { isDeviceVerified, isRegistered };
      }
      
      // New user - OTP sent, not registered yet
      return { isDeviceVerified: false, isRegistered: false };
    }

    throw new Error('Unexpected response from server');
  } catch (error: any) {
    console.error('Login initiation error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });

    // Handle device ID unique constraint error
    if (error.response?.status === 500 && 
        error.response?.data?.code === 'P2002' && 
        error.response?.data?.meta?.target?.includes('deviceId')) {
      console.log('Device ID conflict detected, clearing device info and retrying...');
      
      // Clear device info and cached data
      await AsyncStorage.removeItem('deviceInfo');
      cachedDeviceInfo = null;
      
      // Retry the login with fresh device info
      return initiateLogin(phoneNumber);
    }

    // If server returns 500 for new user, treat it as a new user flow
    if (error.response?.status === 500 && error.response?.data?.message?.includes('user not found')) {
      return { isDeviceVerified: false, isRegistered: false };
    }

    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    } else {
      throw new Error('Failed to initiate login. Please check your connection and try again.');
    }
  }
};

export const verifyOTP = async (
  phoneNumber: string, 
  code: string
): Promise<{ response: LoginResponse; isRegistered: boolean; isDeviceVerified: boolean }> => {
  try {
    console.log('Starting OTP verification for:', phoneNumber);
    
    // Get device info (cached)
    const deviceInfo = await getDeviceInfo();
    console.log('Using device info:', deviceInfo);

    // Get or create API instance
    if (!apiInstance) {
      apiInstance = await getApi();
    }

    const response = await apiInstance.post('/auth/verify-otp', { 
      phoneNumber, 
      code,
      deviceInfo 
    });
    
    console.log('Full OTP verification response:', {
      status: response.status,
      data: response.data,
      headers: response.headers
    });

    // Check if user exists and has completed registration
    const isRegistered = Boolean(
      response.data.user?.firstName && 
      response.data.user?.lastName &&
      response.data.user?.firstName.trim() !== '' &&
      response.data.user?.lastName.trim() !== ''
    );

    // Check device verification status from response
    const isDeviceVerified = response.data.requiresPin === true;

    // Handle token validation
    let token = response.data.token;
    console.log('Initial token value:', token);

    if (!token) {
      console.error('No token in response');
      throw new Error('No authentication token received');
    }

    // If token is an object, try to get the token string
    if (typeof token === 'object') {
      console.log('Token is an object, checking for token property');
      // Try different possible token properties
      token = token.token || token.accessToken || token.jwt || null;
      if (!token) {
        console.error('Token object does not contain valid token property');
        throw new Error('Invalid token format received');
      }
    }

    if (typeof token !== 'string') {
      console.error('Token is not a string:', token);
      throw new Error('Invalid token format received');
    }

    console.log('Final token value:', token);
    await AsyncStorage.setItem('token', token);

    console.log('Verification status check:', {
      isRegistered,
      isDeviceVerified,
      user: response.data.user,
      requiresPin: response.data.requiresPin,
      hasToken: true
    });

    return {
      response: {
        ...response.data,
        token
      },
      isRegistered,
      isDeviceVerified
    };
  } catch (error: any) {
    console.error('OTP verification error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      stack: error.stack
    });

    if (error.response?.status === 500) {
      throw new Error('Server error. Please try again in a few moments.');
    } else if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    } else {
      throw new Error(error.message || 'Failed to verify OTP. Please check your connection and try again.');
    }
  }
};

export const register = async (
  phoneNumber: string,
  firstName: string,
  lastName: string,
  middleName?: string
): Promise<LoginResponse> => {
  try {
    console.log('Registering user:', { phoneNumber, firstName, lastName, middleName });
    
    // Validate names
    if (!firstName || firstName.trim().length < 2) {
      throw new Error('First name must be at least 2 characters long');
    }
    if (!lastName || lastName.trim().length < 2) {
      throw new Error('Last name must be at least 2 characters long');
    }
    if (middleName && middleName.trim().length < 2) {
      throw new Error('Middle name must be at least 2 characters long if provided');
    }

    // Get or create API instance
    if (!apiInstance) {
      apiInstance = await getApi();
    }

    console.log('Making registration request with data:', {
      phoneNumber,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      middleName: middleName?.trim() || undefined
    });

    const response = await apiInstance.post('/auth/register', {
      phoneNumber,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      middleName: middleName?.trim() || undefined
    });
    
    console.log('Registration response:', response.status);

    // Ensure token is a string before storing
    if (typeof response.data.token !== 'string') {
      console.error('Invalid token format:', response.data.token);
      throw new Error('Invalid authentication token received');
    }

    // Store the token
    await AsyncStorage.setItem('token', response.data.token);

    return response.data;
  } catch (error: any) {
    console.error('Registration error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      errors: error.response?.data?.errors
    });

    if (error.response?.status === 400) {
      const errors = error.response.data.errors;
      if (Array.isArray(errors)) {
        // Log each validation error
        errors.forEach(err => {
          console.error(`Validation error - ${err.path}: ${err.msg}`);
        });
        
        // Create a user-friendly error message
        const errorMessages = errors.map(err => {
          switch(err.path) {
            case 'firstName':
              return 'First name: ' + err.msg;
            case 'lastName':
              return 'Last name: ' + err.msg;
            case 'middleName':
              return 'Middle name: ' + err.msg;
            case 'phoneNumber':
              return 'Phone number: ' + err.msg;
            default:
              return err.msg;
          }
        });
        
        throw new Error(errorMessages.join('\n'));
      }
    }

    if (error.response?.status === 500) {
      throw new Error('Server error. Please try again in a few moments.');
    } else if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    } else {
      throw new Error(error.message || 'Failed to register. Please check your connection and try again.');
    }
  }
};

export const loginWithPin = async (deviceId: string, pin: string): Promise<LoginResponse> => {
  try {
    console.log('Logging in with PIN for device:', deviceId);
    
    // Get or create API instance
    if (!apiInstance) {
      apiInstance = await getApi();
    }

    // Get device info
    const deviceInfo = await getDeviceInfo();
    console.log('Using device info for PIN login:', deviceInfo);

    // Get stored phone number
    const phoneNumber = await AsyncStorage.getItem('phoneNumber');
    if (!phoneNumber) {
      throw new Error('Phone number not found. Please login again.');
    }

    // Validate PIN format
    if (!pin || !/^\d{4}$/.test(pin)) {
      throw new Error('PIN must be 4 digits');
    }

    console.log('Making PIN login request with:', {
      deviceId,
      phoneNumber,
      deviceInfo
    });

    const response = await apiInstance.post('/auth/login', { 
      deviceId,
      pin,
      phoneNumber,
      deviceInfo 
    });
    
    console.log('PIN login response:', response.status);
    
    // Validate response
    if (!response.data.token) {
      throw new Error('Invalid PIN');
    }

    const { token } = response.data;
    await AsyncStorage.setItem('token', token);
    return response.data;
  } catch (error: any) {
    console.error('PIN login error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });

    if (error.response?.status === 401) {
      // Check if we need to confirm sending a new PIN
      if (error.response?.data?.confirmNewPin) {
        throw new Error('INVALID_PIN_CONFIRM');
      }
      throw new Error('Invalid PIN. Please try again.');
    } else if (error.response?.status === 500) {
      throw new Error('Server error. Please try again in a few moments.');
    } else if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    } else {
      throw new Error('Failed to login. Please check your connection and try again.');
    }
  }
};

// Add new function to request a new PIN
export const requestNewPin = async (deviceId: string): Promise<void> => {
  try {
    console.log('Requesting new PIN for device:', deviceId);
    
    // Get or create API instance
    if (!apiInstance) {
      apiInstance = await getApi();
    }

    // Get device info
    const deviceInfo = await getDeviceInfo();
    console.log('Using device info for PIN request:', deviceInfo);

    // Get stored phone number
    const phoneNumber = await AsyncStorage.getItem('phoneNumber');
    if (!phoneNumber) {
      throw new Error('Phone number not found. Please login again.');
    }

    const response = await apiInstance.post('/auth/request-new-pin', { 
      deviceId,
      phoneNumber,
      deviceInfo 
    });
    
    console.log('New PIN request response:', response.status);
    
    if (response.status !== 200) {
      throw new Error('Failed to request new PIN');
    }
  } catch (error: any) {
    console.error('New PIN request error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });

    if (error.response?.status === 500) {
      throw new Error('Server error. Please try again in a few moments.');
    } else if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    } else {
      throw new Error('Failed to request new PIN. Please check your connection and try again.');
    }
  }
};

export const logout = async (): Promise<void> => {
  try {
    console.log('Logging out user');
    
    // Get or create API instance
    if (!apiInstance) {
      apiInstance = await getApi();
    }

    const response = await apiInstance.post('/auth/logout');
    console.log('Logout response:', response.status);
    
    // Clear all cached data
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('deviceInfo');
    cachedDeviceInfo = null;
    apiInstance = null;
  } catch (error: any) {
    console.error('Logout error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });

    if (error.response?.status === 500) {
      throw new Error('Server error. Please try again in a few moments.');
    } else if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    } else {
      throw new Error('Failed to logout. Please check your connection and try again.');
    }
  }
};

export const clearAllData = async (): Promise<void> => {
  try {
    console.log('Clearing all local data');
    
    // Clear all cached data
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('deviceInfo');
    await AsyncStorage.removeItem('apiUrl');
    cachedDeviceInfo = null;
    apiInstance = null;
    
    console.log('All local data cleared successfully');
  } catch (error) {
    console.error('Error clearing local data:', error);
    throw new Error('Failed to clear local data');
  }
}; 