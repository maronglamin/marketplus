import * as Location from 'expo-location';
import Constants from 'expo-constants';

const GOOGLE_PLACES_API_KEY = Constants.expoConfig?.extra?.googlePlacesApiKey;

export interface LocationInfo {
  countryCode: string;
  countryName: string;
  cityName: string;
  dialCode?: string;
  fullAddress?: string;
  streetAddress?: string;
  locationCode?: string;
}

/**
 * Get the user's current location and determine their city/town
 * Uses Google Geocoding API to reverse geocode coordinates to city and country
 */
export const getUserLocationFromGPS = async (): Promise<LocationInfo | null> => {
  try {
    console.log('📍 Getting user location for country detection...');
    
    // Request location permissions
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('❌ Location permission denied');
      return null;
    }

    // Get current position
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced, // Use balanced accuracy for faster response
      timeInterval: 10000, // 10 seconds timeout
    });

    console.log('📍 Location obtained:', {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    });

    // Use Google Geocoding API to get city and country information
    const locationInfo = await reverseGeocodeToLocation(
      location.coords.latitude,
      location.coords.longitude
    );

    if (locationInfo) {
      console.log('✅ Location detected from GPS:', locationInfo);
      return locationInfo;
    }

    console.log('⚠️ Could not determine country from location');
    return null;

  } catch (error) {
    console.error('❌ Error getting user location:', error);
    return null;
  }
};

/**
 * Reverse geocode coordinates to get city and country information using Google Geocoding API
 */
const reverseGeocodeToLocation = async (
  latitude: number,
  longitude: number
): Promise<LocationInfo | null> => {
  try {
    if (!GOOGLE_PLACES_API_KEY) {
      console.error('❌ Google Places API key not configured');
      return null;
    }

    console.log('🔄 Reverse geocoding coordinates for location detection...');

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_PLACES_API_KEY}`
    );

    if (!response.ok) {
      console.error('❌ HTTP Error in reverse geocoding:', response.status);
      return null;
    }

    const data = await response.json();
    console.log('📡 Geocoding response status:', data.status);

    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0];
      
      // Extract location information from address components
      const countryComponent = result.address_components.find(
        (component: any) => component.types.includes('country')
      );
      
      const cityComponent = result.address_components.find(
        (component: any) => 
          component.types.includes('locality') || 
          component.types.includes('administrative_area_level_1') ||
          component.types.includes('sublocality')
      );
      
      const townComponent = result.address_components.find(
        (component: any) => 
          component.types.includes('administrative_area_level_2') ||
          component.types.includes('neighborhood')
      );

      const streetComponent = result.address_components.find(
        (component: any) => 
          component.types.includes('route') ||
          component.types.includes('street_number')
      );

      const postalCodeComponent = result.address_components.find(
        (component: any) => component.types.includes('postal_code')
      );

      if (countryComponent) {
        const countryCode = countryComponent.short_name;
        const countryName = countryComponent.long_name;
        
        // Try to get city name, fallback to town, then to country
        let cityName = countryName; // fallback
        
        if (cityComponent) {
          cityName = cityComponent.long_name;
        } else if (townComponent) {
          cityName = townComponent.long_name;
        }

        // Build full address
        const addressParts = [];
        if (streetComponent) {
          addressParts.push(streetComponent.long_name);
        }
        if (cityName) {
          addressParts.push(cityName);
        }
        if (postalCodeComponent) {
          addressParts.push(postalCodeComponent.long_name);
        }
        if (countryName) {
          addressParts.push(countryName);
        }

        const fullAddress = addressParts.join(', ');
        const streetAddress = streetComponent ? streetComponent.long_name : cityName;
        
        // Generate a location code based on coordinates (simplified version)
        const locationCode = generateLocationCode(latitude, longitude);
        
        console.log('✅ Location detected:', { 
          countryCode, 
          countryName, 
          cityName, 
          fullAddress,
          streetAddress,
          locationCode 
        });
        
        return {
          countryCode,
          countryName,
          cityName,
          fullAddress,
          streetAddress,
          locationCode,
        };
      }
    } else if (data.status === 'REQUEST_DENIED') {
      console.error('❌ API Key denied for geocoding:', data.error_message);
    } else if (data.status === 'ZERO_RESULTS') {
      console.log('⚠️ No country found for coordinates');
    } else {
      console.error('❌ Geocoding API error:', data.status, data.error_message);
    }

    return null;

  } catch (error) {
    console.error('❌ Network error in reverse geocoding:', error);
    return null;
  }
};

/**
 * Generate a location code based on coordinates
 * This creates a unique identifier for the location
 */
const generateLocationCode = (latitude: number, longitude: number): string => {
  try {
    // Convert coordinates to a base-36 string for a shorter code
    const latStr = Math.abs(latitude).toString(36).substring(0, 4).toUpperCase();
    const lngStr = Math.abs(longitude).toString(36).substring(0, 4).toUpperCase();
    
    // Create a location code like "HYT+U7YT"
    const locationCode = `${latStr}+${lngStr}`;
    
    return locationCode;
  } catch (error) {
    console.error('Error generating location code:', error);
    return 'LOC' + Math.random().toString(36).substring(2, 6).toUpperCase();
  }
};

/**
 * Get country information from device locale as fallback
 */
export const getCountryFromDeviceLocale = (): LocationInfo | null => {
  try {
    // This would use expo-localization to get device locale
    // For now, return null as this is handled in the Login screen
    return null;
  } catch (error) {
    console.error('❌ Error getting device locale:', error);
    return null;
  }
};
