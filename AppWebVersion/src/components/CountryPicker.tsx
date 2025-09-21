import React, { useState } from 'react';
import { Search, X, Globe } from 'lucide-react';

interface Country {
  name: string;
  code: string;
  dial_code: string;
  flag: string;
}

interface CountryPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (country: Country) => void;
  selectedCountry?: Country | null;
}

// Sample country data - in a real app, this would come from an API
const countryData: Country[] = [
  { name: 'United States', code: 'US', dial_code: '+1', flag: '🇺🇸' },
  { name: 'United Kingdom', code: 'GB', dial_code: '+44', flag: '🇬🇧' },
  { name: 'Canada', code: 'CA', dial_code: '+1', flag: '🇨🇦' },
  { name: 'Australia', code: 'AU', dial_code: '+61', flag: '🇦🇺' },
  { name: 'Germany', code: 'DE', dial_code: '+49', flag: '🇩🇪' },
  { name: 'France', code: 'FR', dial_code: '+33', flag: '🇫🇷' },
  { name: 'Italy', code: 'IT', dial_code: '+39', flag: '🇮🇹' },
  { name: 'Spain', code: 'ES', dial_code: '+34', flag: '🇪🇸' },
  { name: 'Japan', code: 'JP', dial_code: '+81', flag: '🇯🇵' },
  { name: 'China', code: 'CN', dial_code: '+86', flag: '🇨🇳' },
  { name: 'India', code: 'IN', dial_code: '+91', flag: '🇮🇳' },
  { name: 'Brazil', code: 'BR', dial_code: '+55', flag: '🇧🇷' },
  { name: 'Nigeria', code: 'NG', dial_code: '+234', flag: '🇳🇬' },
  { name: 'South Africa', code: 'ZA', dial_code: '+27', flag: '🇿🇦' },
  { name: 'Ghana', code: 'GH', dial_code: '+233', flag: '🇬🇭' },
  { name: 'Kenya', code: 'KE', dial_code: '+254', flag: '🇰🇪' },
  { name: 'Egypt', code: 'EG', dial_code: '+20', flag: '🇪🇬' },
  { name: 'Morocco', code: 'MA', dial_code: '+212', flag: '🇲🇦' },
  { name: 'Senegal', code: 'SN', dial_code: '+221', flag: '🇸🇳' },
  { name: 'Gambia', code: 'GM', dial_code: '+220', flag: '🇬🇲' },
];

export function CountryPicker({ isOpen, onClose, onSelect, selectedCountry }: CountryPickerProps) {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filteredCountries = countryData.filter(country =>
    country.name.toLowerCase().includes(search.toLowerCase()) ||
    country.dial_code.includes(search)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[70vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Select Country</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search country"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Country List */}
        <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
          {filteredCountries.length > 0 ? (
            filteredCountries.map((country) => (
              <button
                key={country.code}
                onClick={() => {
                  onSelect(country);
                  onClose();
                }}
                className={`w-full flex items-center p-4 hover:bg-gray-50 transition-colors ${
                  selectedCountry?.code === country.code ? 'bg-blue-50' : ''
                }`}
              >
                <span className="text-2xl mr-3">{country.flag}</span>
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-900">{country.name}</p>
                </div>
                <span className="text-blue-600 font-semibold">{country.dial_code}</span>
              </button>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p>No countries found</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
