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

const GOOGLE_PLACES_API_KEY = process.env.REACT_APP_GOOGLE_PLACES_API_KEY || '';

function extractCityFromComponents(components: Array<{ long_name: string; types: string[] }>): string {
  const priority = ['locality', 'administrative_area_level_2', 'administrative_area_level_1', 'sublocality'];
  for (const type of priority) {
    const match = components.find((c) => c.types?.includes(type));
    if (match?.long_name) return match.long_name;
  }
  return '';
}

async function reverseGeocodeDetails(latitude: number, longitude: number): Promise<GeocodeDetails> {
  if (!GOOGLE_PLACES_API_KEY) return { address: 'Selected Location', city: '' };
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_PLACES_API_KEY}`,
  );
  if (!response.ok) return { address: 'Selected Location', city: '' };
  const data = await response.json();
  if (data.status === 'OK' && data.results?.length) {
    const result = data.results[0];
    return {
      address: result.formatted_address || 'Selected Location',
      city: extractCityFromComponents(result.address_components || []),
    };
  }
  return { address: 'Selected Location', city: '' };
}

export const mapLocationService = {
  async searchPlaces(
    query: string,
    userLocation?: { latitude: number; longitude: number },
    countryCode?: string,
  ): Promise<SuggestionItem[]> {
    if (!query.trim() || query.length < 3 || !GOOGLE_PLACES_API_KEY) return [];
    let apiUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_PLACES_API_KEY}&types=establishment|geocode`;
    if (userLocation) {
      apiUrl += `&location=${userLocation.latitude},${userLocation.longitude}&radius=50000`;
    }
    if (countryCode) {
      apiUrl += `&components=country:${countryCode}`;
    }
    const response = await fetch(apiUrl);
    if (!response.ok) return [];
    const data = await response.json();
    return data.status === 'OK' ? data.predictions || [] : [];
  },

  async getPlaceDetails(placeId: string): Promise<MapLocation | null> {
    if (!GOOGLE_PLACES_API_KEY) return null;
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address&key=${GOOGLE_PLACES_API_KEY}`,
    );
    if (!response.ok) return null;
    const data = await response.json();
    if (data.status !== 'OK' || !data.result?.geometry?.location) return null;
    const { lat, lng } = data.result.geometry.location;
    return {
      latitude: lat,
      longitude: lng,
      address: data.result.formatted_address || 'Selected Location',
    };
  },

  async reverseGeocodeDetails(latitude: number, longitude: number): Promise<GeocodeDetails> {
    return reverseGeocodeDetails(latitude, longitude);
  },

  async getCurrentLocation(): Promise<MapLocationWithCity> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const details = await reverseGeocodeDetails(latitude, longitude);
          resolve({ latitude, longitude, address: details.address, city: details.city });
        },
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 15000 },
      );
    });
  },

  async resolveSuggestion(
    suggestion: SuggestionItem,
  ): Promise<MapLocationWithCity | null> {
    if (suggestion.geometry?.location) {
      const { lat, lng } = suggestion.geometry.location;
      const details = await reverseGeocodeDetails(lat, lng);
      return {
        latitude: lat,
        longitude: lng,
        address: details.address || suggestion.description,
        city: details.city,
      };
    }
    const place = await this.getPlaceDetails(suggestion.place_id);
    if (!place) return null;
    const details = await reverseGeocodeDetails(place.latitude, place.longitude);
    return {
      latitude: place.latitude,
      longitude: place.longitude,
      address: place.address || details.address,
      city: details.city,
    };
  },

  async getCountryCodeFromCoords(latitude: number, longitude: number): Promise<string | undefined> {
    if (!GOOGLE_PLACES_API_KEY) return undefined;
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_PLACES_API_KEY}`,
    );
    if (!response.ok) return undefined;
    const data = await response.json();
    if (data.status !== 'OK' || !data.results?.length) return undefined;
    for (const result of data.results) {
      const comp = result.address_components?.find((c: { types: string[] }) => c.types?.includes('country'));
      if (comp?.short_name) return comp.short_name;
    }
    return undefined;
  },

  getStaticMapUrl(latitude: number, longitude: number, width = 600, height = 200): string {
    if (!GOOGLE_PLACES_API_KEY) {
      return `https://maps.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`;
    }
    return `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=15&size=${width}x${height}&markers=color:red%7C${latitude},${longitude}&key=${GOOGLE_PLACES_API_KEY}`;
  },
};
