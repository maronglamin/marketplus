import getApi from './config';

export interface LoginResponse {
  token: string;
  user: any;
  isFirstLogin?: boolean;
  requiresPinReset?: boolean;
  pinResetOTPId?: string;
}

export interface AuthError {
  message: string;
  errors?: { [key: string]: string[] };
}

// Check if user exists by phone number
export const checkUserExists = async (phoneNumber: string): Promise<{ exists: boolean; isRegistered: boolean; user?: any }> => {
  try {
    console.log('Checking if user exists for:', phoneNumber);
    console.log('API Base URL:', process.env.REACT_APP_API_URL || 'https://api.cloudnexus.biz:3000/api');
    
    const api = getApi();
    console.log('Making request to:', `${api.defaults.baseURL}/auth/check-user`);
    
    const response = await api.post('/auth/check-user', { phoneNumber });
    
    console.log('User check response:', response.data);
    
    return {
      exists: response.data.exists,
      isRegistered: response.data.isRegistered,
      user: response.data.user
    };
  } catch (error: any) {
    console.error('User check error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      code: error.code,
      config: {
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        method: error.config?.method
      }
    });
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
      throw new Error('Cannot connect to server. Please make sure the backend is running on port 3000.');
    }
    
    if (error.response?.status === 404) {
      // User not found
      return { exists: false, isRegistered: false };
    }
    
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    } else {
      throw new Error('Failed to check user. Please try again.');
    }
  }
};

// Login with PIN
export const loginWithPin = async (phoneNumber: string, pin: string): Promise<LoginResponse> => {
  try {
    console.log('Logging in with PIN for:', phoneNumber);
    
    const api = getApi();
    const response = await api.post('/auth/login-web', { 
      phoneNumber,
      pin
    });
    
    console.log('PIN login response:', response.data);
    
    // Validate response
    if (!response.data.token) {
      throw new Error('Invalid PIN');
    }

    const { token } = response.data;
    localStorage.setItem('token', token);
    localStorage.setItem('phoneNumber', phoneNumber);
    
    return response.data;
  } catch (error: any) {
    console.error('PIN login error:', error);
    
    if (error.response?.status === 401) {
      throw new Error('Invalid PIN. Please try again.');
    } else if (error.response?.status === 404) {
      throw new Error('User not found. Please register using the mobile app first.');
    } else if (error.response?.status === 500) {
      throw new Error('Server error. Please try again in a few moments.');
    } else if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    } else {
      throw new Error('Failed to login. Please check your connection and try again.');
    }
  }
};

// Logout
export const logout = async (): Promise<void> => {
  try {
    console.log('Logging out user');
    
    const api = getApi();
    await api.post('/auth/logout');
    
    // Clear local storage
    localStorage.removeItem('token');
    localStorage.removeItem('phoneNumber');
    
    console.log('Logout successful');
  } catch (error: any) {
    console.error('Logout error:', error);
    
    // Clear local storage even if logout fails
    localStorage.removeItem('token');
    localStorage.removeItem('phoneNumber');
    
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    } else {
      throw new Error('Failed to logout. Please try again.');
    }
  }
};

// Get auth token
export const getAuthToken = (): string | null => {
  try {
    return localStorage.getItem('token');
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  const token = getAuthToken();
  return !!token;
};