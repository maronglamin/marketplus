import getApi from './config';

export interface LoginResponse {
  token: string;
  user: any;
  isFirstLogin?: boolean;
  requiresPinReset?: boolean;
  requiresPinSetup?: boolean;
  requiresRegistration?: boolean;
  pinResetOTPId?: string;
}

export type AuthMethod = 'email' | 'phone';

export interface AuthError {
  message: string;
  errors?: { [key: string]: string[] };
}

const DEVICE_ID_KEY = 'snap_web_device_id';

const extractAuthPayload = (data: any): { token?: string; user?: any } => {
  if (!data) return {};
  const token =
    data.token ||
    data.accessToken ||
    data.jwt ||
    data.sessionToken ||
    data?.data?.token ||
    data?.data?.accessToken ||
    data?.data?.jwt ||
    data?.data?.sessionToken;
  const user = data.user || data?.data?.user || data?.userData;
  return { token, user };
};

export const getWebDeviceInfo = () => {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return {
    deviceId,
    deviceName: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 80) : 'Web Browser',
    deviceType: 'desktop',
    brand: 'web',
    modelName: 'browser',
    osVersion: typeof navigator !== 'undefined' ? navigator.platform || 'unknown' : 'unknown',
    fingerprint: deviceId,
    hardwareId: deviceId,
  };
};

const throwAuthError = (error: any, fallback: string): never => {
  if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
    throw new Error('Cannot connect to server. Please make sure the backend is running.');
  }
  if (error.response?.data?.message) {
    throw new Error(error.response.data.message);
  }
  if (Array.isArray(error.response?.data?.errors) && error.response.data.errors[0]?.msg) {
    throw new Error(error.response.data.errors[0].msg);
  }
  throw new Error(fallback);
};

export const checkUserExists = async (
  phoneNumber: string
): Promise<{ exists: boolean; isRegistered: boolean; user?: any }> => {
  try {
    const api = getApi();
    const response = await api.post('/auth/check-user', { phoneNumber });

    const statusText = String(response?.data?.user?.status || '').toLowerCase();
    if (
      statusText &&
      (statusText.includes('terminated') ||
        statusText.includes('deactivated') ||
        statusText === 'deleted')
    ) {
      try {
        localStorage.setItem('accountTerminated', '1');
      } catch {}
      return { exists: false, isRegistered: false };
    }

    return {
      exists: response.data.exists,
      isRegistered: response.data.isRegistered,
      user: response.data.user,
    };
  } catch (error: any) {
    const status = error.response?.status;
    const message: string = String(error.response?.data?.message || '').toLowerCase();
    const terminatedSignal =
      status === 410 ||
      status === 423 ||
      status === 403 ||
      message.includes('terminated') ||
      message.includes('deactivated');
    if (terminatedSignal) {
      try {
        localStorage.setItem('accountTerminated', '1');
      } catch {}
      return { exists: false, isRegistered: false };
    }

    if (error.response?.status === 404) {
      return { exists: false, isRegistered: false };
    }

    return throwAuthError(error, 'Failed to check user. Please try again.');
  }
};

export const initiateLogin = async (params: {
  method: AuthMethod;
  email?: string;
  phoneNumber?: string;
}): Promise<{
  requiresPin: boolean;
  requiresPinSetup?: boolean;
  isRegistered: boolean;
  isNewUser?: boolean;
  user?: any;
}> => {
  try {
    const api = getApi();
    const deviceInfo = getWebDeviceInfo();
    const lastUserId = localStorage.getItem('lastUserId') || undefined;
    const response = await api.post('/auth/initiate-login', {
      ...params,
      ...(lastUserId ? { lastUserId } : {}),
      deviceInfo,
    });

    if (params.email) localStorage.setItem('email', params.email);
    if (params.phoneNumber) localStorage.setItem('phoneNumber', params.phoneNumber);

    return {
      requiresPin: !!response.data.requiresPin,
      requiresPinSetup: !!response.data.requiresPinSetup,
      isRegistered: !!response.data.isRegistered,
      isNewUser: !!response.data.isNewUser,
      user: response.data.user,
    };
  } catch (error: any) {
    return throwAuthError(error, 'Failed to start sign-in. Please try again.');
  }
};

export const verifyOtp = async (params: {
  method: AuthMethod;
  email?: string;
  phoneNumber?: string;
  code: string;
}): Promise<LoginResponse> => {
  try {
    const api = getApi();
    const deviceInfo = getWebDeviceInfo();
    const lastUserId = localStorage.getItem('lastUserId') || undefined;
    const response = await api.post('/auth/verify-otp', {
      ...params,
      ...(lastUserId ? { lastUserId } : {}),
      code: params.code,
      deviceInfo,
    });

    const { token, user } = extractAuthPayload(response.data);
    if (token) {
      localStorage.setItem('token', token);
    }
    if (user?.id) {
      localStorage.setItem('lastUserId', user.id);
      localStorage.setItem('lastAuthMethod', params.method);
    }
    if (params.email) localStorage.setItem('email', params.email);
    if (params.phoneNumber) localStorage.setItem('phoneNumber', params.phoneNumber);

    return {
      ...response.data,
      token,
      user,
    };
  } catch (error: any) {
    return throwAuthError(error, 'Invalid or expired verification code.');
  }
};

export const setPin = async (newPin: string): Promise<void> => {
  try {
    const api = getApi();
    await api.post('/auth/set-pin', { newPin });
  } catch (error: any) {
    return throwAuthError(error, 'Failed to set PIN. Please try again.');
  }
};

export const loginWithPin = async (
  identifier: { phoneNumber?: string; email?: string } | string,
  pin: string
): Promise<LoginResponse> => {
  const phoneNumber =
    typeof identifier === 'string' ? identifier : identifier.phoneNumber;
  const email = typeof identifier === 'string' ? undefined : identifier.email;

  try {
    const api = getApi();
    const response = await api.post('/auth/login-web', {
      phoneNumber,
      email,
      pin,
      platform: 'web',
    });

    const { token, user } = extractAuthPayload(response.data);
    if (!token) {
      throw new Error('Invalid PIN');
    }

    const statusText = String(user?.status || '').toLowerCase();
    if (
      statusText &&
      (statusText.includes('terminated') ||
        statusText.includes('deactivated') ||
        statusText === 'deleted')
    ) {
      try {
        localStorage.setItem('accountTerminated', '1');
      } catch {}
      throw new Error(
        'Your account has been terminated. Please contact support if you believe this is a mistake.'
      );
    }

    localStorage.setItem('token', token);
    if (phoneNumber) localStorage.setItem('phoneNumber', phoneNumber);
    if (email) localStorage.setItem('email', email);

    return response.data;
  } catch (error: any) {
    const status = error.response?.status;
    const messageRaw: string = String(error.response?.data?.message || '');
    const message: string = messageRaw.toLowerCase();
    const terminatedSignal =
      status === 410 ||
      status === 423 ||
      status === 403 ||
      message.includes('terminated') ||
      message.includes('deactivated');
    if (terminatedSignal) {
      try {
        localStorage.setItem('accountTerminated', '1');
      } catch {}
      throw new Error(
        'Your account has been terminated. Please contact support if you believe this is a mistake.'
      );
    }

    if (/(blocked|unauthorized|forbidden)/i.test(messageRaw)) {
      throw new Error('Unauthorized access. Please try again or contact support.');
    }

    if (status === 500 && phoneNumber) {
      try {
        const recheck = await checkUserExists(phoneNumber);
        if (!recheck.exists) {
          try {
            localStorage.setItem('accountTerminated', '1');
          } catch {}
          throw new Error('Please register using the mobile app to continue.');
        }
      } catch {
        // fall through
      }
    }

    if (status === 401) {
      throw new Error('Invalid PIN. Please try again.');
    } else if (status === 404) {
      throw new Error('User not found. Please register using the mobile app first.');
    } else if (status === 500) {
      throw new Error(
        'Something went wrong. Please try again. If the issue persists, use the mobile app to continue.'
      );
    }

    return throwAuthError(error, 'Failed to login. Please check your connection and try again.');
  }
};

export const logout = async (): Promise<void> => {
  try {
    const api = getApi();
    await api.post('/auth/logout');
  } catch (error: any) {
    console.error('Logout error:', error);
  } finally {
    localStorage.removeItem('token');
    localStorage.removeItem('phoneNumber');
    localStorage.removeItem('email');
  }
};

export const getAuthToken = (): string | null => {
  try {
    return localStorage.getItem('token');
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};
