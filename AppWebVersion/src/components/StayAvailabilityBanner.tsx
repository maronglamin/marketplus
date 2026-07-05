import React from 'react';
import { format } from 'date-fns';
import type { StaySummary } from '../api/realEstateApi';

interface StayAvailabilityBannerProps {
  loading: boolean;
  summary: StaySummary | null;
}

export function StayAvailabilityBanner({ loading, summary }: StayAvailabilityBannerProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
        <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-600">Checking availability…</p>
      </div>
    );
  }

  if (!summary) return null;

  const allNightsAvailable = summary.nightSlots.every((s) => s.available);

  return (
    <div className={`p-3 rounded-lg border space-y-2 ${allNightsAvailable ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
      <p className="text-sm font-semibold text-gray-900">
        {summary.availableRoomTypes > 0
          ? `${summary.availableRoomTypes} room type${summary.availableRoomTypes !== 1 ? 's' : ''} available · ${summary.nights} night${summary.nights !== 1 ? 's' : ''}`
          : 'No rooms available for this stay'}
      </p>
      {summary.nightSlots.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {summary.nightSlots.map((slot) => (
            <div
              key={slot.date}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-center min-w-[4.5rem] ${
                slot.available ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
              }`}
            >
              <p className="text-xs font-semibold">{format(new Date(slot.date), 'MMM d')}</p>
              <p className="text-[10px]">{slot.available ? 'Open' : 'Full'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
