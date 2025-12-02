// API Configuration
const resolveDefaultBaseUrl = (): string => {
  // Default to same-origin backend path under /api for production hosting
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/api`;
  }
  return '/api';
};

export const API_CONFIG = {
  // Prefer explicit env; otherwise use same-origin + /api
  BASE_URL: process.env.REACT_APP_API_URL || resolveDefaultBaseUrl(),
  TIMEOUT: 60000, // Increased to 60 seconds for payment processing
};

// Log the API URL being used
console.log('API Base URL:', API_CONFIG.BASE_URL);

export const getApiUrl = (): string => API_CONFIG.BASE_URL;

// Images are served directly by the backend host (not under /api)
const IMAGE_HOST = process.env.REACT_APP_IMAGE_HOST
  || (typeof window !== 'undefined' && window.location?.origin) || '';

export const getImageUrl = (imagePath: string | null | undefined): string => {
  if (!imagePath) return 'https://via.placeholder.com/300x300?text=No+Image';
  if (imagePath.startsWith('http')) return imagePath;
  const base = IMAGE_HOST.replace(/\/$/, '');
  const path = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${base}${path}`;
};
