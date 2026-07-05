import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { ensureCheckOutAfterCheckIn, formatStayDateTime, fromDateTimeLocalValue, toDateTimeLocalValue } from '../utils/stayDates';

interface StayBookingDatesProps {
  checkIn: Date;
  checkOut: Date;
  onCheckInChange: (date: Date) => void;
  onCheckOutChange: (date: Date) => void;
}

export function StayBookingDates({ checkIn, checkOut, onCheckInChange, onCheckOutChange }: StayBookingDatesProps) {
  const [expanded, setExpanded] = useState(false);
  const minCheckIn = toDateTimeLocalValue(new Date());

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="w-full flex items-center gap-2 p-3 rounded-lg border border-gray-200 bg-white text-left hover:border-violet-300"
      >
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-gray-500 font-medium">Check-in</p>
          <p className="text-xs font-semibold text-gray-900 truncate">{formatStayDateTime(checkIn)}</p>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-gray-500 font-medium">Check-out</p>
          <p className="text-xs font-semibold text-gray-900 truncate">{formatStayDateTime(checkOut)}</p>
        </div>
        <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">Dates & times</p>
        <button type="button" onClick={() => setExpanded(false)} className="p-1 text-gray-500 hover:text-gray-700">
          <ChevronUp className="w-5 h-5" />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Check-in</label>
          <input
            type="datetime-local"
            value={toDateTimeLocalValue(checkIn)}
            min={minCheckIn}
            onChange={(e) => {
              const next = fromDateTimeLocalValue(e.target.value);
              onCheckInChange(next);
              if (next >= checkOut) {
                onCheckOutChange(ensureCheckOutAfterCheckIn(next, checkOut));
              }
            }}
            onBlur={() => setExpanded(false)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Check-out</label>
          <input
            type="datetime-local"
            value={toDateTimeLocalValue(checkOut)}
            min={toDateTimeLocalValue(new Date(checkIn.getTime() + 60000))}
            onChange={(e) => onCheckOutChange(fromDateTimeLocalValue(e.target.value))}
            onBlur={() => setExpanded(false)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm"
          />
        </div>
      </div>
    </div>
  );
}
