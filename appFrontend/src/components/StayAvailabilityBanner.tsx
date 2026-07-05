import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { format } from 'date-fns';
import type { StaySummary } from '../services/realEstateApi';

interface StayAvailabilityBannerProps {
  loading: boolean;
  summary: StaySummary | null;
  accent?: string;
}

export function StayAvailabilityBanner({ loading, summary, accent = '#7C3AED' }: StayAvailabilityBannerProps) {
  if (loading) {
    return (
      <View style={styles.banner}>
        <ActivityIndicator size="small" color={accent} />
        <Text style={styles.loadingText}>Checking availability…</Text>
      </View>
    );
  }

  if (!summary) return null;

  const allNightsAvailable = summary.nightSlots.every((s) => s.available);

  return (
    <View style={[styles.banner, allNightsAvailable ? styles.bannerOk : styles.bannerWarn]}>
      <Text style={styles.summaryText}>
        {summary.availableRoomTypes > 0
          ? `${summary.availableRoomTypes} room type${summary.availableRoomTypes !== 1 ? 's' : ''} available · ${summary.nights} night${summary.nights !== 1 ? 's' : ''}`
          : 'No rooms available for this stay'}
      </Text>
      {summary.nightSlots.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.slotsScroll} contentContainerStyle={styles.slotsRow}>
          {summary.nightSlots.map((slot) => (
            <View key={slot.date} style={[styles.slotChip, slot.available ? styles.slotOk : styles.slotBad]}>
              <Text style={[styles.slotDate, slot.available ? styles.slotDateOk : styles.slotDateBad]}>
                {format(new Date(slot.date), 'MMM d')}
              </Text>
              <Text style={[styles.slotStatus, slot.available ? styles.slotDateOk : styles.slotDateBad]}>
                {slot.available ? 'Open' : 'Full'}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { padding: 12, borderRadius: 10, marginBottom: 8, gap: 8 },
  bannerOk: { backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0' },
  bannerWarn: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A' },
  loadingText: { fontSize: 13, color: '#6B7280' },
  summaryText: { fontSize: 13, fontWeight: '600', color: '#1F2937' },
  slotsScroll: { marginTop: 4 },
  slotsRow: { gap: 8, paddingRight: 4 },
  slotChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignItems: 'center', minWidth: 64 },
  slotOk: { backgroundColor: '#D1FAE5' },
  slotBad: { backgroundColor: '#FEE2E2' },
  slotDate: { fontSize: 12, fontWeight: '600' },
  slotStatus: { fontSize: 10, marginTop: 2 },
  slotDateOk: { color: '#047857' },
  slotDateBad: { color: '#B91C1C' },
});
