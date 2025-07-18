import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Get API keys from app.json extra section
const extra = Constants.expoConfig?.extra;

export const API_KEYS = {
  // Google Maps API keys (for maps display)
  GOOGLE_MAPS_ANDROID: extra?.googleMapsApiKey || 'YOUR_ANDROID_GOOGLE_MAPS_API_KEY',
  GOOGLE_MAPS_IOS: extra?.googleMapsApiKey || 'YOUR_IOS_GOOGLE_MAPS_API_KEY',
  
  // Google Places API key (for location search and suggestions)
  GOOGLE_PLACES: extra?.googlePlacesApiKey || 'YOUR_GOOGLE_PLACES_API_KEY',
};

// Google Places API endpoints
export const PLACES_API = {
  AUTOCOMPLETE: 'https://maps.googleapis.com/maps/api/place/autocomplete/json',
  DETAILS: 'https://maps.googleapis.com/maps/api/place/details/json',
  GEOCODING: 'https://maps.googleapis.com/maps/api/geocode/json',
};

// Helper function to get the appropriate API key based on platform
export const getGoogleMapsApiKey = () => {
  if (Platform.OS === 'ios') {
    return API_KEYS.GOOGLE_MAPS_IOS;
  }
  return API_KEYS.GOOGLE_MAPS_ANDROID;
};

// Helper function to make Google Places API requests
export const makePlacesApiRequest = async (endpoint: string, params: Record<string, string>) => {
  const url = new URL(endpoint);
  url.searchParams.append('key', API_KEYS.GOOGLE_PLACES);
  
  // Add all other parameters
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  try {
    const response = await fetch(url.toString());
    const data = await response.json();
    
    if (data.status === 'OK') {
      return data;
    } else {
      console.error('Google Places API error:', data.status, data.error_message);
      throw new Error(`API Error: ${data.status}`);
    }
  } catch (error) {
    console.error('Error making Places API request:', error);
    throw error;
  }
}; 