import React, { useEffect, useState } from 'react';
import { format, addDays, startOfDay } from 'date-fns';
import type { AvailableSlot } from '../api/homeServicesApi';

interface SlotPickerProps {
  slots: AvailableSlot[];
  loading?: boolean;
  selectedStart?: string | null;
  onSelect: (slot: AvailableSlot) => void;
  accent?: string;
}

export function SlotPicker({ slots, loading, selectedStart, onSelect, accent = 'bg-sky-500' }: SlotPickerProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center py-8 gap-2">
        <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Loading available times…</p>
      </div>
    );
  }

  const available = slots.filter((s) => s.available);
  if (available.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm font-semibold text-gray-700">No slots available</p>
        <p className="text-sm text-gray-400 mt-1">Try another date or contact the provider.</p>
      </div>
    );
  }

  const byDay: Record<string, AvailableSlot[]> = {};
  for (const slot of available) {
    const day = format(new Date(slot.start), 'yyyy-MM-dd');
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(slot);
  }

  return (
    <div className="max-h-72 overflow-y-auto">
      {Object.entries(byDay).map(([day, daySlots]) => (
        <div key={day} className="mb-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">{format(new Date(day), 'EEE, MMM d')}</p>
          <div className="flex flex-wrap gap-2">
            {daySlots.map((slot) => {
              const selected = selectedStart === slot.start;
              return (
                <button
                  key={slot.start}
                  type="button"
                  onClick={() => onSelect(slot)}
                  className={`px-3.5 py-2 rounded-lg border text-sm font-medium ${
                    selected
                      ? `${accent} text-white border-transparent`
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-sky-300'
                  }`}
                >
                  {format(new Date(slot.start), 'h:mm a')}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

interface DateSlotPickerProps {
  fetchSlots: (from: string, to: string) => Promise<AvailableSlot[]>;
  selectedStart?: string | null;
  onSelect: (slot: AvailableSlot) => void;
  accent?: string;
  daysAhead?: number;
}

export function DateSlotPicker({
  fetchSlots,
  selectedStart,
  onSelect,
  accent = 'bg-sky-500',
  daysAhead = 14,
}: DateSlotPickerProps) {
  const [selectedDay, setSelectedDay] = useState(startOfDay(new Date()));
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(false);

  const days = Array.from({ length: daysAhead }, (_, i) => addDays(startOfDay(new Date()), i));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const from = selectedDay.toISOString();
    const to = addDays(selectedDay, 1).toISOString();
    fetchSlots(from, to)
      .then((data) => { if (!cancelled) setSlots(data); })
      .catch(() => { if (!cancelled) setSlots([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedDay, fetchSlots]);

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-3 mb-2">
        {days.map((day) => {
          const isSelected = format(day, 'yyyy-MM-dd') === format(selectedDay, 'yyyy-MM-dd');
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => setSelectedDay(day)}
              className={`shrink-0 flex flex-col items-center px-3 py-2 rounded-lg border min-w-[52px] ${
                isSelected
                  ? `${accent} text-white border-transparent`
                  : 'bg-white text-gray-900 border-gray-200 hover:border-sky-300'
              }`}
            >
              <span className={`text-[11px] font-medium ${isSelected ? 'text-white' : 'text-gray-500'}`}>
                {format(day, 'EEE')}
              </span>
              <span className={`text-base font-bold mt-0.5 ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                {format(day, 'd')}
              </span>
            </button>
          );
        })}
      </div>
      <SlotPicker
        slots={slots}
        loading={loading}
        selectedStart={selectedStart}
        onSelect={onSelect}
        accent={accent}
      />
    </div>
  );
}
