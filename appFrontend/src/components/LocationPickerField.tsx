import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  mapLocationService,
  type MapLocationWithCity,
} from '../services/mapLocationService';
import type { SuggestionItem } from '../services/rideService';
import { GoogleMapView, type MapLocation } from './GoogleMapView';

export interface LocationPickerFieldProps {
  value: MapLocationWithCity | null;
  onChange: (location: MapLocationWithCity | null) => void;
  label?: string;
  placeholder?: string;
  accent?: string;
  required?: boolean;
  error?: string;
}

const DEFAULT_LOCATION = { latitude: 13.4432, longitude: -16.5919 };

export function LocationPickerField({
  value,
  onChange,
  label = 'Location',
  placeholder = 'Search for an address or place',
  accent = '#7C3AED',
  required = true,
  error,
}: LocationPickerFieldProps) {
  const [query, setQuery] = useState(value?.address || '');
  const [city, setCity] = useState(value?.city || '');
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loadingGps, setLoadingGps] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mapLocationService.getCurrentLocation()
      .then((loc) => setUserLocation({ latitude: loc.latitude, longitude: loc.longitude }))
      .catch(() => setUserLocation(DEFAULT_LOCATION));
  }, []);

  useEffect(() => {
    if (value) {
      setQuery(value.address);
      setCity(value.city);
    }
  }, [value?.latitude, value?.longitude]);

  const emitChange = useCallback(
    (loc: MapLocationWithCity) => {
      onChange(loc);
    },
    [onChange],
  );

  const handleCityChange = (text: string) => {
    setCity(text);
    if (value) {
      emitChange({ ...value, city: text });
    }
  };

  const selectSuggestion = async (suggestion: SuggestionItem) => {
    setShowSuggestions(false);
    setSearching(true);
    Keyboard.dismiss();
    try {
      const resolved = await mapLocationService.resolveSuggestion(suggestion, userLocation || undefined);
      if (resolved) {
        setQuery(resolved.address);
        setCity(resolved.city);
        emitChange(resolved);
      }
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = (text: string) => {
    setQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (text.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const countryCode = userLocation
          ? await mapLocationService.getCountryCodeFromCoords(userLocation.latitude, userLocation.longitude)
          : undefined;
        const results = await mapLocationService.searchPlaces(text, userLocation || undefined, countryCode);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  const useCurrentLocation = async () => {
    setLoadingGps(true);
    try {
      const loc = await mapLocationService.getCurrentLocation();
      setUserLocation({ latitude: loc.latitude, longitude: loc.longitude });
      setQuery(loc.address);
      setCity(loc.city);
      emitChange(loc);
      setShowSuggestions(false);
    } catch {
      // caller can show alert via error prop if needed
    } finally {
      setLoadingGps(false);
    }
  };

  const mapLocation: MapLocation | null = value
    ? { latitude: value.latitude, longitude: value.longitude, address: value.address }
    : null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}{required ? ' *' : ''}
      </Text>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color="#94a3b8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={handleSearch}
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        />
        {(searching || loadingGps) && <ActivityIndicator size="small" color={accent} />}
      </View>

      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestions}>
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.place_id}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.suggestionItem} onPress={() => selectSuggestion(item)}>
                <Ionicons name="location-outline" size={16} color={accent} />
                <View style={styles.suggestionText}>
                  <Text style={styles.suggestionMain}>{item.structured_formatting.main_text}</Text>
                  {item.structured_formatting.secondary_text ? (
                    <Text style={styles.suggestionSub}>{item.structured_formatting.secondary_text}</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <TouchableOpacity
        style={[styles.gpsBtn, { borderColor: accent }]}
        onPress={useCurrentLocation}
        disabled={loadingGps}
      >
        <Ionicons name="locate" size={18} color={accent} />
        <Text style={[styles.gpsBtnText, { color: accent }]}>
          {loadingGps ? 'Getting location…' : 'Use current location'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.cityLabel}>City *</Text>
      <TextInput
        style={styles.cityInput}
        value={city}
        onChangeText={handleCityChange}
        placeholder="City"
        placeholderTextColor="#94a3b8"
      />

      {mapLocation && (
        <View style={styles.mapPreview}>
          <GoogleMapView currentLocation={mapLocation} style={styles.map} />
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {required && !value && !error ? (
        <Text style={styles.hint}>Search or use current location to pin your address on the map.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
  },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: '#0f172a' },
  suggestions: {
    maxHeight: 180,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    marginTop: 4,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  suggestionText: { flex: 1 },
  suggestionMain: { fontSize: 14, fontWeight: '500', color: '#0f172a' },
  suggestionSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  gpsBtnText: { fontSize: 14, fontWeight: '600' },
  cityLabel: { fontSize: 14, fontWeight: '600', color: '#334155', marginTop: 14, marginBottom: 6 },
  cityInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  mapPreview: {
    marginTop: 12,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  map: { flex: 1 },
  error: { color: '#dc2626', fontSize: 13, marginTop: 6 },
  hint: { color: '#64748b', fontSize: 12, marginTop: 6 },
});
