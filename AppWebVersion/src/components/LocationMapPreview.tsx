import React from 'react';
import { MapPin, Navigation } from 'lucide-react';
import type { MapLocation } from '../services/mapLocationService';

export interface LocationMapPreviewProps {
  location: MapLocation;
  city?: string;
  height?: number;
  accent?: string;
  showDirections?: boolean;
}

export function LocationMapPreview({
  location,
  city,
  height = 180,
  accent = 'text-violet-600',
  showDirections = true,
}: LocationMapPreviewProps) {
  const openInMaps = () => {
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
      <iframe
        title="Map"
        className="w-full border-0"
        style={{ height }}
        src={`https://maps.google.com/maps?q=${location.latitude},${location.longitude}&z=15&output=embed`}
        loading="lazy"
      />
      <div className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          <MapPin className={`w-4 h-4 mt-0.5 shrink-0 ${accent}`} />
          <p className="text-sm text-gray-700 line-clamp-2">
            {location.address}{city ? `, ${city}` : ''}
          </p>
        </div>
        {showDirections && (
          <button
            type="button"
            onClick={openInMaps}
            className={`inline-flex items-center gap-1.5 text-sm font-semibold ${accent} hover:underline`}
          >
            <Navigation className="w-4 h-4" />
            Get directions
          </button>
        )}
      </div>
    </div>
  );
}
