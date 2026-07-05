import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { rideService, type LocationData, type SuggestionItem } from './rideService';

export interface MapLocation {
  latitude: number;
  longitude: number;
  address: string;
}

export interface MapLocationWithCity extends MapLocation {
  city: string;
}

export interface GeocodeDetails {
  address: string;
  city: string;
}

const GOOGLE_PLACES_API_KEY = Constants.expoConfig?.extra?.googlePlacesApiKey;

function extractCityFromComponents(components: Array<{ long_name: string; types: string[] }>): string {
  const priority = ['locality', 'administrative_area_level_2', 'administrative_area_level_1', 'sublocality'];
  for (const type of priority) {
    const match = components.find((c) => c.types?.includes(type));
    if (match?.long_name) return match.long_name;
  }
  return '';
}

export const mapLocationService = {
  async searchPlaces(
    query: string,
    userLocation?: { latitude: number; longitude: number },
    countryCode?: string,
  ): Promise<SuggestionItem[]> {
    return rideService.searchPlaces(query, userLocation, countryCode);
  },

  async getPlaceDetails(placeId: string): Promise<LocationData | null> {
    return rideService.getPlaceDetails(placeId);
  },

  async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    return rideService.reverseGeocode(latitude, longitude);
  },

  async reverseGeocodeDetails(latitude: number, longitude: number): Promise<GeocodeDetails> {
    try {
      if (!GOOGLE_PLACES_API_KEY) {
        return { address: 'Current Location', city: '' };
      }
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_PLACES_API_KEY}`,
      );
      if (!response.ok) return { address: 'Current Location', city: '' };
      const data = await response.json();
      if (data.status === 'OK' && data.results?.length) {
        const result = data.results[0];
        return {
          address: result.formatted_address || 'Current Location',
          city: extractCityFromComponents(result.address_components || []),
        };
      }
    } catch {
      // fall through
    }
    const address = await rideService.reverseGeocode(latitude, longitude);
    return { address, city: '' };
  },

  async getCurrentLocation(): Promise<MapLocationWithCity> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission denied');
    }
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const { latitude, longitude } = position.coords;
    const details = await this.reverseGeocodeDetails(latitude, longitude);
    return { latitude, longitude, address: details.address, city: details.city };
  },

  async resolveSuggestion(
    suggestion: SuggestionItem,
    userLocation?: { latitude: number; longitude: number },
  ): Promise<MapLocationWithCity | null> {
    if (suggestion.geometry?.location) {
      const { lat, lng } = suggestion.geometry.location;
      const details = await this.reverseGeocodeDetails(lat, lng);
      return {
        latitude: lat,
        longitude: lng,
        address: details.address || suggestion.description,
        city: details.city,
      };
    }
    const place = await rideService.getPlaceDetails(suggestion.place_id);
    if (!place) return null;
    const details = await this.reverseGeocodeDetails(place.latitude, place.longitude);
    return {
      latitude: place.latitude,
      longitude: place.longitude,
      address: place.address || details.address,
      city: details.city,
    };
  },

  getCountryCodeFromCoords(latitude: number, longitude: number): Promise<string | undefined> {
    return rideService.getCountryCodeFromCoords(latitude, longitude);
  },
};
