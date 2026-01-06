import Constants from 'expo-constants';
import { API_URL } from '../config/env';

// Get the Google Places API key
const GOOGLE_PLACES_API_KEY = Constants.expoConfig?.extra?.googlePlacesApiKey;

export interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
}

export interface SuggestionItem {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

export interface RideOption {
  id: string;
  name: string;
  icon: string;
  price: string;
  time: string;
  description: string;
}

export interface RideRequest {
  pickup: LocationData;
  destination: LocationData;
  rideType: string;
  estimatedPrice: string;
  estimatedTime: string;
}

export interface DriverInfo {
  id: string;
  name: string;
  vehicle: string;
  plateNumber: string;
  rating: number;
  eta: string;
  phone: string;
}

class RideService {
  // Get ISO country code from coordinates via Geocoding API
  async getCountryCodeFromCoords(latitude: number, longitude: number): Promise<string | undefined> {
    try {
      if (!GOOGLE_PLACES_API_KEY) return undefined;
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_PLACES_API_KEY}`;
      const response = await fetch(url);
      if (!response.ok) return undefined;
      const data = await response.json();
      if (data.status !== 'OK' || !data.results?.length) return undefined;
      for (const result of data.results) {
        const comp = result.address_components?.find((c: any) => c.types?.includes('country'));
        if (comp?.short_name) return comp.short_name;
      }
      return undefined;
    } catch {
      return undefined;
    }
  }
  // Search for places using Google Places API (proximity + optional country constraint)
  async searchPlaces(
    query: string,
    userLocation?: { latitude: number; longitude: number },
    countryCode?: string
  ): Promise<SuggestionItem[]> {
    try {
      if (!query.trim() || query.length < 3) {
        return [];
      }

      // Check if the query is a Plus Code (full or short)
      if (this.isPlusCode(query)) {
        console.log('🔍 Plus Code detected:', query);
        // Try to derive country code from user location to help resolve short codes
        let derivedCountry: string | undefined = countryCode;
        if (!derivedCountry && userLocation) {
          try {
            derivedCountry = await this.getCountryCodeFromCoords(userLocation.latitude, userLocation.longitude);
          } catch {
            // ignore
          }
        }
        return this.handlePlusCodeSearch(query, userLocation, derivedCountry);
      }

      // Check if the query looks like coordinates (lat,lng)
      if (this.isLatLng(query)) {
        console.log('🔍 Coordinate (lat,lng) detected:', query);
        return this.handleLatLngSearch(query);
      }

      if (!GOOGLE_PLACES_API_KEY) {
        console.error('Google Places API key not configured');
        return this.getFallbackSuggestions(query);
      }

      console.log('🔍 Searching places with query:', query);
      console.log('📍 User location:', userLocation);
      console.log('🔑 API Key configured:', !!GOOGLE_PLACES_API_KEY);

      // Build the API URL with location bias if user location is available
      let apiUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_PLACES_API_KEY}&types=establishment|geocode`;
      
      if (userLocation) {
        // 50km proximity bias
        apiUrl += `&location=${userLocation.latitude},${userLocation.longitude}&radius=50000`;
      }
      // Restrict results to user's country when available
      if (countryCode) {
        apiUrl += `&components=country:${countryCode}`;
      }

      console.log('🌐 Making request to:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('❌ HTTP Error:', response.status, response.statusText);
        return this.getFallbackSuggestions(query);
      }

      const data = await response.json();
      console.log('📡 API Response status:', data.status);

      if (data.status === 'OK') {
        console.log('✅ Found', data.predictions?.length || 0, 'suggestions');
        return data.predictions || [];
      } else if (data.status === 'REQUEST_DENIED') {
        console.error('❌ API Key denied:', data.error_message || 'Unknown error');
        return this.getFallbackSuggestions(query);
      } else if (data.status === 'OVER_QUERY_LIMIT') {
        console.error('❌ API quota exceeded');
        return this.getFallbackSuggestions(query);
      } else if (data.status === 'INVALID_REQUEST') {
        console.error('❌ Invalid request format');
        return this.getFallbackSuggestions(query);
      } else if (data.status === 'ZERO_RESULTS') {
        console.log('⚠️ No results found for query:', query);
        return this.getFallbackSuggestions(query);
      } else {
        console.error('❌ Places API error:', data.status, data.error_message || 'Unknown error');
        return this.getFallbackSuggestions(query);
      }
    } catch (error) {
      console.error('❌ Network error searching places:', error);
      return this.getFallbackSuggestions(query);
    }
  }

  // Check if a query is a Plus Code (full or short)
  private isPlusCode(query: string): boolean {
    // Plus Code format: typically 8 characters with a + in the middle
    // Examples: VNHD+UJDS, 87G8P27V+JG, etc.
    // Also handle global Plus Codes with country codes like 87G8P27V+JG
    // Additionally support short Plus Codes like 78FX+GVX (needs locality context)
    const fullPlusCodePattern = /^[23456789CFGHJMPQRVWX]{8}\+[23456789CFGHJMPQRVWX]{2,}$/i;
    const globalPlusCodePattern = /^[23456789CFGHJMPQRVWX]{8}\+[23456789CFGHJMPQRVWX]{2,}\s*[A-Z]{2,}$/i;
    const shortPlusCodePattern = /^[23456789CFGHJMPQRVWX]{2,7}\+[23456789CFGHJMPQRVWX]{2,}$/i;
    
    const trimmedQuery = query.trim();
    return (
      fullPlusCodePattern.test(trimmedQuery) ||
      globalPlusCodePattern.test(trimmedQuery) ||
      shortPlusCodePattern.test(trimmedQuery)
    );
  }

  // Check if a query is in latitude,longitude form
  private isLatLng(query: string): boolean {
    const trimmed = query.trim().toLowerCase();
    // Common patterns:
    // "13.4432,-16.5919" | "13.4432, -16.5919" | "13.4432 -16.5919" | "lat: 13.4432, lng: -16.5919"
    const simpleComma = /^\s*-?\d{1,3}(?:\.\d+)?\s*,\s*-?\d{1,3}(?:\.\d+)?\s*$/;
    const simpleSpace = /^\s*-?\d{1,3}(?:\.\d+)?\s+\s*-?\d{1,3}(?:\.\d+)?\s*$/;
    const labeled = /lat\s*[:=]\s*-?\d{1,3}(?:\.\d+)?\s*,?\s*lng\s*[:=]\s*-?\d{1,3}(?:\.\d+)?/;
    return simpleComma.test(trimmed) || simpleSpace.test(trimmed) || labeled.test(trimmed);
  }

  // Parse latitude and longitude from a string. Returns null if invalid.
  private parseLatLng(query: string): { lat: number; lng: number } | null {
    const trimmed = query.trim().toLowerCase();
    let latStr: string | undefined;
    let lngStr: string | undefined;

    // labeled form: lat: x, lng: y
    const labeledMatch = trimmed.match(/lat\s*[:=]\s*(-?\d{1,3}(?:\.\d+)?)\s*,?\s*lng\s*[:=]\s*(-?\d{1,3}(?:\.\d+)?)/);
    if (labeledMatch) {
      latStr = labeledMatch[1];
      lngStr = labeledMatch[2];
    }

    // simple comma: x,y
    if (!latStr || !lngStr) {
      const commaMatch = trimmed.match(/^\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
      if (commaMatch) {
        latStr = commaMatch[1];
        lngStr = commaMatch[2];
      }
    }

    // simple space: x y
    if (!latStr || !lngStr) {
      const spaceMatch = trimmed.match(/^\s*(-?\d{1,3}(?:\.\d+)?)\s+(-?\d{1,3}(?:\.\d+)?)\s*$/);
      if (spaceMatch) {
        latStr = spaceMatch[1];
        lngStr = spaceMatch[2];
      }
    }

    if (latStr === undefined || lngStr === undefined) return null;
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    if (lat < -90 || lat > 90) return null;
    if (lng < -180 || lng > 180) return null;
    return { lat, lng };
  }

  // Handle coordinate search by reverse-geocoding to an address and returning a suggestion
  private async handleLatLngSearch(query: string): Promise<SuggestionItem[]> {
    const parsed = this.parseLatLng(query);
    if (!parsed) {
      return [];
    }
    const { lat, lng } = parsed;

    let address = 'Selected Coordinates';
    try {
      address = await this.reverseGeocode(lat, lng);
    } catch {
      // ignore, keep default address
    }

    return [{
      place_id: `geo_${lat}_${lng}`,
      description: `${address} (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
      structured_formatting: {
        main_text: address,
        secondary_text: `${lat.toFixed(5)}, ${lng.toFixed(5)}`
      },
      geometry: {
        location: { lat, lng }
      }
    }];
  }

  // Handle Plus Code search
  private async handlePlusCodeSearch(
    plusCode: string,
    userLocation?: { latitude: number; longitude: number },
    countryCode?: string
  ): Promise<SuggestionItem[]> {
    try {
      if (!GOOGLE_PLACES_API_KEY) {
        console.error('Google Places API key not configured for Plus Code lookup');
        return this.getFallbackPlusCodeSuggestion(plusCode);
      }

      console.log('🔍 Looking up Plus Code:', plusCode);
      console.log('🔑 API Key configured:', !!GOOGLE_PLACES_API_KEY);

      // Use Google's Geocoding API to convert Plus Code to coordinates (with optional bias for short codes)
      let apiUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(plusCode)}&key=${GOOGLE_PLACES_API_KEY}`;
      // Bias with region when available
      if (countryCode) {
        apiUrl += `&region=${countryCode}`;
      }
      // Bias with bounds when user location is available (helps resolve short plus codes)
      if (userLocation) {
        const delta = 0.5; // ~50km bias box
        const swLat = userLocation.latitude - delta;
        const swLng = userLocation.longitude - delta;
        const neLat = userLocation.latitude + delta;
        const neLng = userLocation.longitude + delta;
        apiUrl += `&bounds=${swLat},${swLng}|${neLat},${neLng}`;
      }
      console.log('🌐 Making Plus Code request to:', apiUrl.replace(GOOGLE_PLACES_API_KEY, 'API_KEY_HIDDEN'));

      const response = await fetch(apiUrl);

      if (!response.ok) {
        console.error('❌ HTTP Error looking up Plus Code:', response.status, response.statusText);
        return this.getFallbackPlusCodeSuggestion(plusCode);
      }

      const data = await response.json();
      console.log('📡 Plus Code lookup response status:', data.status);
      console.log('📡 Plus Code lookup response data:', JSON.stringify(data, null, 2));

      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        const { lat, lng } = result.geometry.location;
        const address = result.formatted_address;

        console.log('✅ Plus Code resolved:', address, 'at', lat, lng);

        // Return a single suggestion for the Plus Code
        return [{
          place_id: `pluscode_${plusCode}`,
          description: `${plusCode} - ${address}`,
          structured_formatting: {
            main_text: plusCode,
            secondary_text: address
          },
          // Add coordinates for direct use
          geometry: {
            location: {
              lat,
              lng
            }
          }
        }];
      } else if (data.status === 'REQUEST_DENIED') {
        console.error('❌ API Key denied for Plus Code lookup:', data.error_message || 'Unknown error');
        return this.getFallbackPlusCodeSuggestion(plusCode);
      } else if (data.status === 'ZERO_RESULTS') {
        console.log('⚠️ Plus Code not found:', plusCode);
        return this.getFallbackPlusCodeSuggestion(plusCode);
      } else if (data.status === 'OVER_QUERY_LIMIT') {
        console.error('❌ API quota exceeded for Plus Code lookup');
        return this.getFallbackPlusCodeSuggestion(plusCode);
      } else if (data.status === 'INVALID_REQUEST') {
        console.error('❌ Invalid Plus Code format:', plusCode);
        return this.getFallbackPlusCodeSuggestion(plusCode);
      } else {
        console.error('❌ Plus Code lookup API error:', data.status, data.error_message || 'Unknown error');
        return this.getFallbackPlusCodeSuggestion(plusCode);
      }
    } catch (error) {
      console.error('❌ Network error looking up Plus Code:', error);
      return this.getFallbackPlusCodeSuggestion(plusCode);
    }
  }

  // Fallback suggestion for Plus Code when API is not available
  private getFallbackPlusCodeSuggestion(plusCode: string): SuggestionItem[] {
    console.log('🔄 Using fallback Plus Code suggestion for:', plusCode);
    
    return [{
      place_id: `fallback_pluscode_${plusCode}`,
      description: `${plusCode} - Plus Code Location`,
      structured_formatting: {
        main_text: plusCode,
        secondary_text: 'Plus Code Location (offline)'
      }
    }];
  }

  // Fallback suggestions when API is not available
  private getFallbackSuggestions(query: string): SuggestionItem[] {
    console.log('🔄 Using fallback suggestions for:', query);
    
    const commonPlaces = [
      'Restaurant',
      'Coffee Shop',
      'Gas Station',
      'Shopping Mall',
      'Hospital',
      'School',
      'Bank',
      'Post Office',
      'Library',
      'Park',
      'Airport',
      'Train Station',
      'Bus Station',
      'Hotel',
      'Gym',
      'Pharmacy',
      'Supermarket',
      'Cinema',
      'Church',
      'Mosque'
    ];

    const filteredPlaces = commonPlaces.filter(place => 
      place.toLowerCase().includes(query.toLowerCase())
    );

    return filteredPlaces.map((place, index) => ({
      place_id: `fallback_${index}`,
      description: place,
      structured_formatting: {
        main_text: place,
        secondary_text: 'Tap to select'
      }
    }));
  }

  // Get place details using Google Places API
  async getPlaceDetails(placeId: string): Promise<LocationData | null> {
    try {
      // Handle Plus Code place IDs
      if (placeId.startsWith('pluscode_')) {
        console.log('🔍 Getting Plus Code details for:', placeId);
        const plusCode = placeId.replace('pluscode_', '');
        return this.getPlusCodeDetails(plusCode);
      }

      // Handle fallback Plus Code place IDs
      if (placeId.startsWith('fallback_pluscode_')) {
        console.log('🔄 Using fallback Plus Code details for:', placeId);
        const plusCode = placeId.replace('fallback_pluscode_', '');
        return this.getFallbackPlusCodeDetails(plusCode);
      }

      // Handle coordinate place IDs
      if (placeId.startsWith('geo_')) {
        console.log('🔍 Getting coordinate details for:', placeId);
        const coords = placeId.replace('geo_', '').split('_');
        if (coords.length === 2) {
          const lat = parseFloat(coords[0]);
          const lng = parseFloat(coords[1]);
          if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
            const address = await this.reverseGeocode(lat, lng);
            return {
              latitude: lat,
              longitude: lng,
              address
            };
          }
        }
        return null;
      }

      // Handle fallback coordinate place IDs (include encoded coords)
      if (placeId.startsWith('fallback_geo_')) {
        console.log('🔄 Using fallback coordinate details for:', placeId);
        const coords = placeId.replace('fallback_geo_', '').split('_');
        if (coords.length === 2) {
          const lat = parseFloat(coords[0]);
          const lng = parseFloat(coords[1]);
          if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
            const address = await this.reverseGeocode(lat, lng);
            return {
              latitude: lat,
              longitude: lng,
              address
            };
          }
        }
        return null;
      }

      if (!GOOGLE_PLACES_API_KEY) {
        console.error('Google Places API key not configured');
        return this.getFallbackPlaceDetails(placeId);
      }

      console.log('🔍 Getting place details for:', placeId);

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address&key=${GOOGLE_PLACES_API_KEY}`
      );

      if (!response.ok) {
        console.error('❌ HTTP Error getting place details:', response.status);
        return this.getFallbackPlaceDetails(placeId);
      }

      const data = await response.json();
      console.log('📡 Place details response status:', data.status);

      if (data.status === 'OK' && data.result) {
        const { geometry, formatted_address } = data.result;
        console.log('✅ Place details obtained:', formatted_address);
        return {
          latitude: geometry.location.lat,
          longitude: geometry.location.lng,
          address: formatted_address,
        };
      } else if (data.status === 'REQUEST_DENIED') {
        console.error('❌ API Key denied for place details:', data.error_message || 'Unknown error');
        return this.getFallbackPlaceDetails(placeId);
      } else if (data.status === 'OVER_QUERY_LIMIT') {
        console.error('❌ API quota exceeded for place details');
        return this.getFallbackPlaceDetails(placeId);
      } else if (data.status === 'INVALID_REQUEST') {
        console.error('❌ Invalid place ID format:', placeId);
        return this.getFallbackPlaceDetails(placeId);
      } else if (data.status === 'NOT_FOUND') {
        console.error('❌ Place not found:', placeId);
        return this.getFallbackPlaceDetails(placeId);
      } else {
        console.error('❌ Place details API error:', data.status, data.error_message || 'Unknown error');
        return this.getFallbackPlaceDetails(placeId);
      }
    } catch (error) {
      console.error('❌ Network error getting place details:', error);
      return this.getFallbackPlaceDetails(placeId);
    }
  }

  // Get Plus Code details using Google Geocoding API
  private async getPlusCodeDetails(plusCode: string): Promise<LocationData | null> {
    try {
      if (!GOOGLE_PLACES_API_KEY) {
        console.error('Google Places API key not configured for Plus Code details');
        return this.getFallbackPlusCodeDetails(plusCode);
      }

      console.log('🔍 Getting Plus Code details for:', plusCode);

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(plusCode)}&key=${GOOGLE_PLACES_API_KEY}`
      );

      if (!response.ok) {
        console.error('❌ HTTP Error getting Plus Code details:', response.status);
        return this.getFallbackPlusCodeDetails(plusCode);
      }

      const data = await response.json();
      console.log('📡 Plus Code details response status:', data.status);

      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        const { lat, lng } = result.geometry.location;
        const address = result.formatted_address;

        console.log('✅ Plus Code details obtained:', address, 'at', lat, lng);
        return {
          latitude: lat,
          longitude: lng,
          address: `${plusCode} - ${address}`,
        };
      } else if (data.status === 'REQUEST_DENIED') {
        console.error('❌ API Key denied for Plus Code details:', data.error_message || 'Unknown error');
        return this.getFallbackPlusCodeDetails(plusCode);
      } else if (data.status === 'ZERO_RESULTS') {
        console.log('⚠️ Plus Code not found:', plusCode);
        return this.getFallbackPlusCodeDetails(plusCode);
      } else if (data.status === 'OVER_QUERY_LIMIT') {
        console.error('❌ API quota exceeded for Plus Code details');
        return this.getFallbackPlusCodeDetails(plusCode);
      } else if (data.status === 'INVALID_REQUEST') {
        console.error('❌ Invalid Plus Code format:', plusCode);
        return this.getFallbackPlusCodeDetails(plusCode);
      } else {
        console.error('❌ Plus Code details API error:', data.status, data.error_message || 'Unknown error');
        return this.getFallbackPlusCodeDetails(plusCode);
      }
    } catch (error) {
      console.error('❌ Network error getting Plus Code details:', error);
      return this.getFallbackPlusCodeDetails(plusCode);
    }
  }

  // Fallback Plus Code details when API is not available
  private getFallbackPlusCodeDetails(plusCode: string): LocationData | null {
    console.log('🔄 Using fallback Plus Code details for:', plusCode);
    
    // Return a mock location for fallback Plus Codes
    return {
      latitude: 0, // Will be replaced with user's location
      longitude: 0,
      address: `${plusCode} - Plus Code Location`,
    };
  }

  // Fallback place details when API is not available
  private getFallbackPlaceDetails(placeId: string): LocationData | null {
    console.log('🔄 Using fallback place details for:', placeId);
    
    // For fallback suggestions, return a mock location
    if (placeId.startsWith('fallback_')) {
      return {
        latitude: 0, // Will be replaced with user's location
        longitude: 0,
        address: 'Selected Location',
      };
    }
    
    return null;
  }

  // Reverse geocoding: Convert coordinates to address
  async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    try {
      if (!GOOGLE_PLACES_API_KEY) {
        console.error('Google Places API key not configured for reverse geocoding');
        console.log('🔑 API Key value:', GOOGLE_PLACES_API_KEY);
        return 'Current Location';
      }

      console.log('🔄 Reverse geocoding coordinates:', latitude, longitude);
      console.log('🔑 Using API Key:', GOOGLE_PLACES_API_KEY.substring(0, 10) + '...');

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_PLACES_API_KEY}`
      );

      if (!response.ok) {
        console.error('❌ HTTP Error in reverse geocoding:', response.status);
        return 'Current Location';
      }

      const data = await response.json();
      console.log('📡 Reverse geocoding response status:', data.status);
      console.log('📡 Full response data:', JSON.stringify(data, null, 2));

      if (data.status === 'OK' && data.results.length > 0) {
        // Get the most relevant result (usually the first one)
        const address = data.results[0].formatted_address;
        console.log('✅ Reverse geocoding successful:', address);
        return address;
      } else if (data.status === 'REQUEST_DENIED') {
        console.error('❌ API Key denied for reverse geocoding:', data.error_message || 'Unknown error');
        return 'Current Location';
      } else if (data.status === 'ZERO_RESULTS') {
        console.log('⚠️ No address found for coordinates');
        return 'Current Location';
      } else if (data.status === 'OVER_QUERY_LIMIT') {
        console.error('❌ API quota exceeded for reverse geocoding');
        return 'Current Location';
      } else if (data.status === 'INVALID_REQUEST') {
        console.error('❌ Invalid coordinates for reverse geocoding');
        return 'Current Location';
      } else {
        console.error('❌ Reverse geocoding API error:', data.status, data.error_message || 'Unknown error');
        return 'Current Location';
      }
    } catch (error) {
      console.error('❌ Network error in reverse geocoding:', error);
      return 'Current Location';
    }
  }

  // Calculate optimal route with road conditions and safety features
  async calculateRoute(origin: LocationData, destination: LocationData): Promise<any> {
    try {
      if (!GOOGLE_PLACES_API_KEY) {
        console.error('Google Places API key not configured');
        return null;
      }

      console.log('🛣️ Calculating route alternatives with safety features...');

      // Request multiple route alternatives for comparison
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${GOOGLE_PLACES_API_KEY}&mode=driving&alternatives=true&traffic_model=best_guess&departure_time=now`
      );

      const data = await response.json();

      if (data.status === 'OK' && data.routes.length > 0) {
        // Enhance all routes with safety and road condition information
        const enhancedRoutes = data.routes.map((route: any, index: number) => {
          const enhancedRoute = this.enhanceRouteWithSafetyData(route);
          const score = this.calculateRouteScore(route, index);
          return {
            ...enhancedRoute,
            routeIndex: index,
            score: score,
            isRecommended: index === 0 // First route is Google's recommended
          };
        });
        
        console.log('✅ Route alternatives calculated with safety features');
        return {
          routes: enhancedRoutes,
          bestRoute: enhancedRoutes[0], // Keep best route for backward compatibility
          totalAlternatives: enhancedRoutes.length
        };
      } else {
        console.error('❌ Directions API error:', data.status);
        return null;
      }
    } catch (error) {
      console.error('❌ Error calculating route:', error);
      return null;
    }
  }

  // Select the best route based on safety and road conditions
  private selectBestRoute(routes: any[], origin: LocationData, destination: LocationData): any {
    console.log('🔍 Analyzing', routes.length, 'route alternatives...');
    
    // Score each route based on multiple factors
    const scoredRoutes = routes.map((route, index) => {
      const score = this.calculateRouteScore(route, index);
      console.log(`Route ${index + 1}: Score ${score.toFixed(2)} - ${route.legs[0].duration.text}, ${route.legs[0].distance.text}`);
      return { route, score };
    });

    // Sort by score (higher is better) and return the best route
    scoredRoutes.sort((a, b) => b.score - a.score);
    return scoredRoutes[0].route;
  }

  // Calculate route score based on safety and road conditions
  private calculateRouteScore(route: any, routeIndex: number): number {
    const leg = route.legs[0];
    const distance = this.parseDistance(leg.distance.text);
    const duration = this.parseDuration(leg.duration.text);
    
    let score = 100; // Base score

    // Prefer shorter routes (safety factor: less time on road)
    score += (100 - duration) * 0.3;

    // Prefer routes with fewer steps (simpler navigation)
    const stepCount = leg.steps.length;
    score += (50 - stepCount) * 0.5;

    // Prefer routes with more highway usage (better road conditions)
    const highwaySteps = leg.steps.filter((step: any) => 
      step.maneuver?.instruction?.includes('highway') || 
      step.maneuver?.instruction?.includes('freeway') ||
      step.maneuver?.instruction?.includes('expressway') ||
      step.maneuver?.instruction?.includes('motorway') ||
      step.maneuver?.instruction?.includes('interstate')
    ).length;
    score += highwaySteps * 3; // Increased weight for highways

    // Prefer routes with fewer turns (safety factor)
    const turnSteps = leg.steps.filter((step: any) => 
      step.maneuver?.instruction?.includes('turn') ||
      step.maneuver?.instruction?.includes('exit')
    ).length;
    score += (20 - turnSteps) * 1.5;

    // Bonus for first route (usually Google's recommended)
    if (routeIndex === 0) {
      score += 10;
    }

    return Math.max(0, score);
  }

  // Parse distance string to number
  private parseDistance(distanceText: string): number {
    const match = distanceText.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  }

  // Parse duration string to minutes
  private parseDuration(durationText: string): number {
    const match = durationText.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  // Enhance route with safety and road condition data
  private enhanceRouteWithSafetyData(route: any): any {
    const leg = route.legs[0];
    
    // Analyze road types and conditions
    const roadAnalysis = this.analyzeRoadConditions(leg.steps);
    
    // Add safety features to route while preserving original properties
    const enhancedRoute = {
      ...route, // Preserve all original properties including overview_polyline
      safetyFeatures: {
        roadConditions: roadAnalysis.roadConditions,
        safetyScore: roadAnalysis.safetyScore,
        recommendedSpeed: roadAnalysis.recommendedSpeed,
        roadTypes: roadAnalysis.roadTypes,
        trafficConditions: roadAnalysis.trafficConditions,
        safetyTips: roadAnalysis.safetyTips
      }
    };

    console.log('🛡️ Route enhanced with safety features:', enhancedRoute.safetyFeatures);
    console.log('🗺️ Route polyline preserved:', !!enhancedRoute.overview_polyline);
    return enhancedRoute;
  }

  // Analyze road conditions and safety features
  private analyzeRoadConditions(steps: any[]): any {
    const roadTypes = new Set<string>();
    const roadConditions = {
      highways: 0,
      localRoads: 0,
      residential: 0,
      intersections: 0
    };

    let safetyScore = 100;
    let totalDistance = 0;

    steps.forEach((step: any) => {
      const instruction = step.maneuver?.instruction?.toLowerCase() || '';
      const distance = this.parseDistance(step.distance?.text || '0 km');
      totalDistance += distance;

      // Analyze road types
      if (instruction.includes('highway') || instruction.includes('freeway') || instruction.includes('expressway')) {
        roadTypes.add('highway');
        roadConditions.highways += distance;
        safetyScore += 5; // Highways are generally safer
      } else if (instruction.includes('local') || instruction.includes('street')) {
        roadTypes.add('local');
        roadConditions.localRoads += distance;
        safetyScore -= 2; // Local roads may have more intersections
      } else if (instruction.includes('residential')) {
        roadTypes.add('residential');
        roadConditions.residential += distance;
        safetyScore -= 3; // Residential areas may have more pedestrians
      }

      // Count intersections
      if (instruction.includes('turn') || instruction.includes('exit')) {
        roadConditions.intersections += 1;
        safetyScore -= 1; // Each intersection slightly reduces safety
      }
    });

    // Calculate recommended speed based on road types
    const highwayPercentage = roadConditions.highways / totalDistance;
    let recommendedSpeed = 60; // Default 60 km/h
    
    if (highwayPercentage > 0.7) {
      recommendedSpeed = 80; // Mostly highway
    } else if (highwayPercentage > 0.3) {
      recommendedSpeed = 70; // Mixed roads
    } else {
      recommendedSpeed = 50; // Mostly local roads
    }

    // Determine traffic conditions
    const trafficConditions = this.estimateTrafficConditions(steps);

    // Generate safety tips
    const safetyTips = this.generateSafetyTips(roadConditions, trafficConditions);

    return {
      roadConditions,
      safetyScore: Math.max(0, Math.min(100, safetyScore)),
      recommendedSpeed,
      roadTypes: Array.from(roadTypes),
      trafficConditions,
      safetyTips
    };
  }

  // Estimate traffic conditions based on route characteristics
  private estimateTrafficConditions(steps: any[]): string {
    const totalSteps = steps.length;
    const highwaySteps = steps.filter((step: any) => 
      step.maneuver?.instruction?.toLowerCase().includes('highway')
    ).length;

    if (highwaySteps / totalSteps > 0.6) {
      return 'Light Traffic - Highway Route';
    } else if (highwaySteps / totalSteps > 0.3) {
      return 'Moderate Traffic - Mixed Roads';
    } else {
      return 'Variable Traffic - Local Roads';
    }
  }

  // Generate safety tips based on route analysis
  private generateSafetyTips(roadConditions: any, trafficConditions: string): string[] {
    const tips = [];

    if (roadConditions.highways > 0) {
      tips.push('Maintain safe following distance on highways');
      tips.push('Use cruise control for consistent speed');
    }

    if (roadConditions.intersections > 5) {
      tips.push('Be extra cautious at intersections');
      tips.push('Check for pedestrians and cyclists');
    }

    if (roadConditions.residential > 0) {
      tips.push('Reduce speed in residential areas');
      tips.push('Watch for children and pets');
    }

    if (trafficConditions.includes('Variable')) {
      tips.push('Stay alert for changing traffic patterns');
      tips.push('Use turn signals well in advance');
    }

    tips.push('Keep emergency contacts readily available');
    tips.push('Ensure vehicle is in good condition');

    return tips;
  }

  // Request a ride (simulated for now)
  async requestRide(rideRequest: RideRequest): Promise<DriverInfo | null> {
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulate driver assignment
      const driver: DriverInfo = {
        id: 'driver_001',
        name: 'John Doe',
        vehicle: 'Toyota Camry',
        plateNumber: 'ABC-123',
        rating: 4.8,
        eta: rideRequest.estimatedTime,
        phone: '+1234567890',
      };

      return driver;
    } catch (error) {
      console.error('Error requesting ride:', error);
      return null;
    }
  }

  // Get ride options based on distance
  getRideOptions(distance: number): RideOption[] {
    const basePrice = Math.max(5, distance * 2.5); // Minimum $5, $2.50 per km
    
    return [
      {
        id: 'standard',
        name: 'Standard',
        icon: 'car',
        price: `$${basePrice.toFixed(2)}`,
        time: '3 min',
        description: 'Reliable transportation for everyday trips',
      },
      {
        id: 'premium',
        name: 'Premium',
        icon: 'car-sport',
        price: `$${(basePrice * 1.3).toFixed(2)}`,
        time: '5 min',
        description: 'Luxury vehicles with enhanced comfort',
      },
      {
        id: 'eco',
        name: 'Eco',
        icon: 'leaf',
        price: `$${(basePrice * 1.1).toFixed(2)}`,
        time: '4 min',
        description: 'Environmentally friendly electric vehicles',
      },
    ];
  }

  // Calculate distance between two points
  calculateDistance(point1: LocationData, point2: LocationData): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(point2.latitude - point1.latitude);
    const dLon = this.deg2rad(point2.longitude - point1.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(point1.latitude)) * Math.cos(this.deg2rad(point2.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    return distance;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // Test Plus Code functionality
  async testPlusCode(plusCode: string): Promise<void> {
    console.log('🧪 Testing Plus Code:', plusCode);
    console.log('🔍 Is Plus Code format:', this.isPlusCode(plusCode));
    
    if (this.isPlusCode(plusCode)) {
      console.log('✅ Valid Plus Code format detected');
      const suggestions = await this.handlePlusCodeSearch(plusCode);
      console.log('📋 Plus Code suggestions:', suggestions);
    } else {
      console.log('❌ Invalid Plus Code format');
    }
  }
}

export const rideService = new RideService(); 