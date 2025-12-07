// API Configuration
const normalizeApiBaseUrl = (raw?: string): string => {
  // Prefer provided value; otherwise compute default
  const candidate = (raw && raw.trim()) || resolveDefaultBaseUrl();
  // Remove trailing slashes/colons
  let cleaned = candidate.replace(/[:/]+$/, '');
  // Ensure `/api` prefix exists (backend is mounted under /api)
  if (!/\/api(\/|$)/i.test(cleaned)) {
    cleaned = `${cleaned}/api`;
  }
  return cleaned;
};

const resolveDefaultBaseUrl = (): string => {
  // Default to same-origin backend path under /api for production hosting
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/api`;
  }
  return '/api';
};

export const API_CONFIG = {
  // Prefer explicit env; otherwise use same-origin + /api
  BASE_URL: normalizeApiBaseUrl(process.env.REACT_APP_API_URL),
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
