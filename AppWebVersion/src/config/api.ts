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
  // If running in browser, decide sensible defaults for dev vs prod
  if (typeof window !== 'undefined' && window.location) {
    const { origin } = window.location;
    // In development, use relative '/api' to leverage CRA proxy
    if (process.env.NODE_ENV !== 'production') {
      return '/api';
    }
    // In production, default to same-origin `/api`
    return `${origin}/api`;
  }
  return '/api';
};

export const API_CONFIG = {
  // Prefer explicit env; otherwise resolve per environment
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
