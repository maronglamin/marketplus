import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { format, addDays, startOfDay } from 'date-fns';
import type { AvailableSlot } from '../services/homeServicesApi';

interface SlotPickerProps {
  slots: AvailableSlot[];
  loading?: boolean;
  selectedStart?: string | null;
  onSelect: (slot: AvailableSlot) => void;
  accent?: string;
}

export function SlotPicker({ slots, loading, selectedStart, onSelect, accent = '#0EA5E9' }: SlotPickerProps) {
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={accent} />
        <Text style={styles.loadingText}>Loading available times…</Text>
      </View>
    );
  }

  const available = slots.filter((s) => s.available);
  if (available.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No slots available</Text>
        <Text style={styles.emptySub}>Try another date or contact the provider.</Text>
      </View>
    );
  }

  const byDay: Record<string, AvailableSlot[]> = {};
  for (const slot of available) {
    const day = format(new Date(slot.start), 'yyyy-MM-dd');
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(slot);
  }

  return (
    <ScrollView style={styles.container} nestedScrollEnabled>
      {Object.entries(byDay).map(([day, daySlots]) => (
        <View key={day} style={styles.dayGroup}>
          <Text style={styles.dayLabel}>{format(new Date(day), 'EEE, MMM d')}</Text>
          <View style={styles.grid}>
            {daySlots.map((slot) => {
              const selected = selectedStart === slot.start;
              return (
                <TouchableOpacity
                  key={slot.start}
                  style={[styles.slotChip, selected && { backgroundColor: accent, borderColor: accent }]}
                  onPress={() => onSelect(slot)}
                >
                  <Text style={[styles.slotText, selected && styles.slotTextSelected]}>
                    {format(new Date(slot.start), 'h:mm a')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </ScrollView>
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
  fetchSlots, selectedStart, onSelect, accent = '#0EA5E9', daysAhead = 14,
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
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll}>
        {days.map((day) => {
          const isSelected = format(day, 'yyyy-MM-dd') === format(selectedDay, 'yyyy-MM-dd');
          return (
            <TouchableOpacity
              key={day.toISOString()}
              style={[styles.dayChip, isSelected && { backgroundColor: accent, borderColor: accent }]}
              onPress={() => setSelectedDay(day)}
            >
              <Text style={[styles.dayChipDow, isSelected && styles.dayChipTextSelected]}>
                {format(day, 'EEE')}
              </Text>
              <Text style={[styles.dayChipDate, isSelected && styles.dayChipTextSelected]}>
                {format(day, 'd')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <SlotPicker
        slots={slots}
        loading={loading}
        selectedStart={selectedStart}
        onSelect={onSelect}
        accent={accent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { maxHeight: 280 },
  centered: { alignItems: 'center', padding: 24, gap: 8 },
  loadingText: { fontSize: 13, color: '#6B7280' },
  empty: { padding: 24, alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#374151' },
  emptySub: { fontSize: 13, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },
  dayGroup: { marginBottom: 16 },
  dayLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  slotText: { fontSize: 13, fontWeight: '500', color: '#374151' },
  slotTextSelected: { color: '#FFFFFF' },
  dayScroll: { marginBottom: 12 },
  dayChip: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    minWidth: 52,
  },
  dayChipDow: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  dayChipDate: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 2 },
  dayChipTextSelected: { color: '#FFFFFF' },
});
