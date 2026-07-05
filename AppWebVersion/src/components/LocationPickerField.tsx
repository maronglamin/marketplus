import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Search } from 'lucide-react';
import {
  mapLocationService,
  type MapLocationWithCity,
  type SuggestionItem,
} from '../services/mapLocationService';

export interface LocationPickerFieldProps {
  value: MapLocationWithCity | null;
  onChange: (location: MapLocationWithCity | null) => void;
  label?: string;
  placeholder?: string;
  accent?: string;
  required?: boolean;
  error?: string;
}

export function LocationPickerField({
  value,
  onChange,
  label = 'Location',
  placeholder = 'Search for an address or place',
  accent = 'bg-violet-600',
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
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mapLocationService.getCurrentLocation()
      .then((loc) => setUserLocation({ latitude: loc.latitude, longitude: loc.longitude }))
      .catch(() => setUserLocation({ latitude: 13.4432, longitude: -16.5919 }));
  }, []);

  useEffect(() => {
    if (value) {
      setQuery(value.address);
      setCity(value.city);
    }
  }, [value?.latitude, value?.longitude]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const emitChange = (loc: MapLocationWithCity) => onChange(loc);

  const handleCityChange = (text: string) => {
    setCity(text);
    if (value) emitChange({ ...value, city: text });
  };

  const selectSuggestion = async (suggestion: SuggestionItem) => {
    setShowSuggestions(false);
    setSearching(true);
    try {
      const resolved = await mapLocationService.resolveSuggestion(suggestion);
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
      // ignore
    } finally {
      setLoadingGps(false);
    }
  };

  const accentText = accent.replace('bg-', 'text-');
  const accentBorder = accent.replace('bg-', 'border-');

  return (
    <div className="mb-4" ref={wrapperRef}>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label}{required ? ' *' : ''}
      </label>

      <div className="relative flex items-center border border-gray-200 rounded-lg bg-white px-3">
        <Search className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
        <input
          type="text"
          className="flex-1 py-3 text-sm outline-none"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={placeholder}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        />
        {(searching || loadingGps) && (
          <div className="w-4 h-4 border-2 border-gray-300 border-t-violet-600 rounded-full animate-spin" />
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="mt-1 border border-gray-200 rounded-lg bg-white shadow-sm max-h-44 overflow-y-auto z-10 relative">
          {suggestions.map((item) => (
            <button
              key={item.place_id}
              type="button"
              className="w-full flex items-start gap-2 px-3 py-2.5 text-left hover:bg-gray-50 border-b border-gray-50 last:border-0"
              onClick={() => selectSuggestion(item)}
            >
              <MapPin className={`w-4 h-4 mt-0.5 shrink-0 ${accentText}`} />
              <div>
                <div className="text-sm font-medium text-gray-900">{item.structured_formatting.main_text}</div>
                {item.structured_formatting.secondary_text && (
                  <div className="text-xs text-gray-500">{item.structured_formatting.secondary_text}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={useCurrentLocation}
        disabled={loadingGps}
        className={`mt-2 inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border rounded-lg ${accentBorder} ${accentText} hover:bg-gray-50 disabled:opacity-50`}
      >
        <Navigation className="w-4 h-4" />
        {loadingGps ? 'Getting location…' : 'Use current location'}
      </button>

      <label className="block text-sm font-semibold text-gray-700 mt-3 mb-1.5">City *</label>
      <input
        type="text"
        className="w-full border border-gray-200 rounded-lg px-3 py-3 text-sm outline-none focus:border-violet-400"
        value={city}
        onChange={(e) => handleCityChange(e.target.value)}
        placeholder="City"
      />

      {value && (
        <div className="mt-3 rounded-xl overflow-hidden border border-gray-200">
          <iframe
            title="Location preview"
            className="w-full h-40 border-0"
            src={`https://maps.google.com/maps?q=${value.latitude},${value.longitude}&z=15&output=embed`}
            loading="lazy"
          />
        </div>
      )}

      {error && <p className="text-red-600 text-xs mt-1.5">{error}</p>}
      {required && !value && !error && (
        <p className="text-gray-500 text-xs mt-1.5">Search or use current location to pin your address on the map.</p>
      )}
    </div>
  );
}
