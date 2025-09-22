// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || '/api',
  TIMEOUT: 60000, // Increased to 60 seconds for payment processing
};

// Log the API URL being used
console.log('API Base URL:', API_CONFIG.BASE_URL);

export const getApiUrl = (): string => API_CONFIG.BASE_URL;
