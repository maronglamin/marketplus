import Constants from 'expo-constants';

// Get the API base URL
const API_URL = Constants.expoConfig?.extra?.localIp || '192.168.110.48';
const BASE_URL = `http://${API_URL}:3000`;

// Cache for processed URLs to avoid repeated processing
const urlCache = new Map<string, string>();

export const getImageUrl = (relativePath: string | null): string | null => {
  if (!relativePath) return null;
  
  // Check cache first
  if (urlCache.has(relativePath)) {
    return urlCache.get(relativePath) || null;
  }
  
  let fullUrl: string;
  
  // If the path is already a full URL, use it as is
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    fullUrl = relativePath;
  }
  // If it's a local file URI, use it as is
  else if (relativePath.startsWith('file://')) {
    fullUrl = relativePath;
  }
  // Otherwise, construct the full URL
  else {
    // Ensure the relative path starts with a forward slash
    const normalizedPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
    fullUrl = `${BASE_URL}${normalizedPath}`;
  }
  
  // Cache the result
  urlCache.set(relativePath, fullUrl);
  
  return fullUrl;
}; 