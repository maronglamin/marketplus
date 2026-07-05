import React from 'react';
import { Minus, Plus } from 'lucide-react';
import type { GuestSelection } from '../api/realEstateApi';

interface GuestSelectorProps {
  value: GuestSelection;
  onChange: (value: GuestSelection) => void;
  accent?: string;
}

function CounterRow({
  label,
  subtitle,
  value,
  min,
  max,
  onChange,
  accentClass,
}: {
  label: string;
  subtitle: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  accentClass: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div>
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center bg-white disabled:opacity-50"
        >
          <Minus className="w-4 h-4 text-gray-700" />
        </button>
        <span className={`text-base font-bold min-w-[24px] text-center ${accentClass}`}>{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center bg-white disabled:opacity-50"
        >
          <Plus className="w-4 h-4 text-gray-700" />
        </button>
      </div>
    </div>
  );
}

export function GuestSelector({ value, onChange, accent = 'text-violet-600' }: GuestSelectorProps) {
  const updateChildAge = (index: number, age: number) => {
    const ages = [...value.childAges];
    ages[index] = age;
    onChange({ ...value, childAges: ages });
  };

  const setChildren = (count: number) => {
    const childAges = Array.from({ length: count }, (_, i) => value.childAges[i] ?? 5);
    onChange({ ...value, children: count, childAges });
  };

  return (
    <div className="space-y-1">
      <CounterRow
        label="Adults"
        subtitle="Age 18+"
        value={value.adults}
        min={1}
        max={10}
        onChange={(adults) => onChange({ ...value, adults })}
        accentClass={accent}
      />
      <CounterRow
        label="Children"
        subtitle="Age 0-17"
        value={value.children}
        min={0}
        max={6}
        onChange={setChildren}
        accentClass={accent}
      />
      {value.children > 0 && (
        <div className="mt-2 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs font-semibold text-gray-700 mb-2">Children&apos;s ages</p>
          {value.childAges.map((age, i) => (
            <div key={i} className="flex items-center justify-between mb-2 last:mb-0">
              <span className="text-sm text-gray-500">Child {i + 1}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateChildAge(i, Math.max(0, age - 1))}
                  className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center bg-white"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-sm font-semibold text-gray-900 min-w-[48px] text-center">{age} yrs</span>
                <button
                  type="button"
                  onClick={() => updateChildAge(i, Math.min(17, age + 1))}
                  className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center bg-white"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
