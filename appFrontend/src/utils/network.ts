import { Platform } from 'react-native';

// Constants
const API_PORT = 3000;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

// Cache the discovered IP address
let cachedIpAddress: string | null = null;
let lastDiscoveryTime = 0;

// Fallback IPs for when discovery fails
const FALLBACK_IPS = {
  android: '10.0.2.2', // Android emulator
  ios: 'api.cloudnexus.biz',    // iOS simulator
};

// Common local network IP ranges to try
const IP_RANGES = [
  '192.168.85', // Your current network
  '192.168.14', // Your previous network
  '192.168.1',  // Common home network
  '192.168.0',  // Common home network
];

export const getLocalIpAddress = async (): Promise<string> => {
  if (Platform.OS === 'web') {
    throw new Error('getLocalIpAddress is not supported on web');
  }

  // Return cached IP if it's still valid
  const now = Date.now();
  if (cachedIpAddress && (now - lastDiscoveryTime) < CACHE_DURATION) {
    return cachedIpAddress;
  }

  // For emulators/simulators, use the fallback IPs
  if (Platform.OS === 'android') {
    return FALLBACK_IPS.android;
  }

  if (Platform.OS === 'ios' && (Platform.isPad || Platform.isTV)) {
    return FALLBACK_IPS.ios;
  }

  // Try to find the server by scanning common IP ranges
  for (const range of IP_RANGES) {
    // Try common last octets
    for (let i = 1; i <= 254; i++) {
      const ip = `${range}.${i}`;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 500); // 500ms timeout per IP

        const response = await fetch(`http://${ip}:${API_PORT}/api/health`, {
          method: 'GET',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          cachedIpAddress = ip;
          lastDiscoveryTime = now;
          console.log('Found server at:', ip);
          return ip;
        }
      } catch (error) {
        // Continue to next IP
        continue;
      }
    }
  }

  throw new Error(
    'Could not find server. Please ensure the server is running and you are on the same network.'
  );
}; 