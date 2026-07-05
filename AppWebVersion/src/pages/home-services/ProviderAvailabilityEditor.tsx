import React, { useEffect, useState } from 'react';
import { homeServicesApi } from '../../api/homeServicesApi';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type ScheduleEntry = { dayOfWeek: number; startTime: string; endTime: string; isEnabled: boolean };

export function ProviderAvailabilityEditor() {
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    homeServicesApi.getMySchedule()
      .then((s) => {
        if (s.length === 0) {
          setSchedule([1, 2, 3, 4, 5].map((d) => ({ dayOfWeek: d, startTime: '09:00', endTime: '17:00', isEnabled: true })));
        } else {
          setSchedule(s.map((e) => ({ dayOfWeek: e.dayOfWeek, startTime: e.startTime, endTime: e.endTime, isEnabled: e.isEnabled })));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const updateDay = (dayOfWeek: number, patch: Partial<ScheduleEntry>) => {
    setSchedule((prev) => {
      const existing = prev.find((d) => d.dayOfWeek === dayOfWeek);
      if (existing) {
        return prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d));
      }
      return [...prev, { dayOfWeek, startTime: '09:00', endTime: '17:00', isEnabled: true, ...patch }];
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await homeServicesApi.updateSchedule(schedule);
      alert('Your weekly schedule has been updated.');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save schedule.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <p className="text-sm text-gray-500">Set your working hours. Customers can only book available slots within these times.</p>
      {[0, 1, 2, 3, 4, 5, 6].map((day) => {
        const entry = schedule.find((s) => s.dayOfWeek === day) || { dayOfWeek: day, startTime: '09:00', endTime: '17:00', isEnabled: false };
        return (
          <div key={day} className="flex items-center gap-3 py-2 border-b border-gray-100">
            <input
              type="checkbox"
              checked={entry.isEnabled}
              onChange={(e) => updateDay(day, { isEnabled: e.target.checked })}
              className="rounded"
            />
            <span className="w-9 text-sm font-semibold text-gray-700">{DAY_NAMES[day]}</span>
            {entry.isEnabled ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="time"
                  value={entry.startTime}
                  onChange={(e) => updateDay(day, { startTime: e.target.value })}
                  className="flex-1 px-2 py-1 border border-gray-200 rounded-lg text-sm text-center"
                />
                <span className="text-gray-400">–</span>
                <input
                  type="time"
                  value={entry.endTime}
                  onChange={(e) => updateDay(day, { endTime: e.target.value })}
                  className="flex-1 px-2 py-1 border border-gray-200 rounded-lg text-sm text-center"
                />
              </div>
            ) : (
              <span className="flex-1 text-sm text-gray-400 italic">Closed</span>
            )}
          </div>
        );
      })}
      <button type="button" onClick={handleSave} disabled={saving} className="w-full py-3 bg-sky-500 text-white font-semibold rounded-xl disabled:opacity-60">
        {saving ? 'Saving...' : 'Save Schedule'}
      </button>
    </div>
  );
}
