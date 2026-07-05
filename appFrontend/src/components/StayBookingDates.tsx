import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { ensureCheckOutAfterCheckIn } from '../utils/stayDates';

interface StayBookingDatesProps {
  checkIn: Date;
  checkOut: Date;
  onCheckInChange: (date: Date) => void;
  onCheckOutChange: (date: Date) => void;
  accent?: string;
}

type ActiveField = 'checkIn' | 'checkOut' | null;

export function StayBookingDates({
  checkIn,
  checkOut,
  onCheckInChange,
  onCheckOutChange,
  accent = '#7C3AED',
}: StayBookingDatesProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeField, setActiveField] = useState<ActiveField>(null);

  const formatDateTime = (d: Date) => format(d, 'MMM d, yyyy · h:mm a');

  const openField = (field: ActiveField) => {
    setExpanded(true);
    setActiveField(field);
  };

  const closePicker = () => setActiveField(null);

  const handleCheckInChange = (_: unknown, date?: Date) => {
    if (Platform.OS === 'android') setActiveField(null);
    if (!date) return;
    onCheckInChange(date);
    if (date >= checkOut) {
      onCheckOutChange(ensureCheckOutAfterCheckIn(date, checkOut));
    }
    if (Platform.OS === 'android') setExpanded(false);
  };

  const handleCheckOutChange = (_: unknown, date?: Date) => {
    if (Platform.OS === 'android') {
      setActiveField(null);
      setExpanded(false);
    }
    if (!date) return;
    onCheckOutChange(date);
  };

  const handleDone = () => {
    setActiveField(null);
    setExpanded(false);
  };

  if (!expanded) {
    return (
      <TouchableOpacity style={styles.compactRow} onPress={() => setExpanded(true)} activeOpacity={0.85}>
        <View style={styles.compactCol}>
          <Text style={styles.compactLabel}>Check-in</Text>
          <Text style={styles.compactValue}>{formatDateTime(checkIn)}</Text>
        </View>
        <Ionicons name="arrow-forward" size={16} color="#9CA3AF" />
        <View style={styles.compactCol}>
          <Text style={styles.compactLabel}>Check-out</Text>
          <Text style={styles.compactValue}>{formatDateTime(checkOut)}</Text>
        </View>
        <Ionicons name="chevron-down" size={18} color="#6B7280" />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.expandedPanel}>
      <View style={styles.expandedHeader}>
        <Text style={styles.expandedTitle}>Dates & times</Text>
        <TouchableOpacity onPress={() => { setExpanded(false); setActiveField(null); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-up" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>
      <View style={styles.dateRow}>
        <TouchableOpacity style={[styles.dateField, activeField === 'checkIn' && { borderColor: accent }]} onPress={() => openField('checkIn')}>
          <Text style={styles.dateLabel}>Check-in</Text>
          <Text style={styles.dateValue}>{formatDateTime(checkIn)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.dateField, activeField === 'checkOut' && { borderColor: accent }]} onPress={() => openField('checkOut')}>
          <Text style={styles.dateLabel}>Check-out</Text>
          <Text style={styles.dateValue}>{formatDateTime(checkOut)}</Text>
        </TouchableOpacity>
      </View>

      {Platform.OS === 'ios' ? (
        <Modal visible={activeField !== null} transparent animationType="slide" onRequestClose={closePicker}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={closePicker}>
                  <Text style={[styles.modalBtn, { color: accent }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>{activeField === 'checkIn' ? 'Check-in' : 'Check-out'}</Text>
                <TouchableOpacity onPress={handleDone}>
                  <Text style={[styles.modalBtn, { color: accent }]}>Done</Text>
                </TouchableOpacity>
              </View>
              {activeField === 'checkIn' && (
                <DateTimePicker
                  value={checkIn}
                  mode="datetime"
                  minimumDate={new Date()}
                  display="spinner"
                  onChange={handleCheckInChange}
                />
              )}
              {activeField === 'checkOut' && (
                <DateTimePicker
                  value={checkOut}
                  mode="datetime"
                  minimumDate={new Date(checkIn.getTime() + 60000)}
                  display="spinner"
                  onChange={handleCheckOutChange}
                />
              )}
            </View>
          </View>
        </Modal>
      ) : (
        <>
          {activeField === 'checkIn' && (
            <DateTimePicker
              value={checkIn}
              mode="datetime"
              minimumDate={new Date()}
              display="default"
              onChange={handleCheckInChange}
            />
          )}
          {activeField === 'checkOut' && (
            <DateTimePicker
              value={checkOut}
              mode="datetime"
              minimumDate={new Date(checkIn.getTime() + 60000)}
              display="default"
              onChange={handleCheckOutChange}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  compactCol: { flex: 1 },
  compactLabel: { fontSize: 10, color: '#6B7280', fontWeight: '500' },
  compactValue: { fontSize: 12, fontWeight: '600', color: '#1F2937', marginTop: 2 },
  expandedPanel: { gap: 8 },
  expandedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  expandedTitle: { fontSize: 13, fontWeight: '600', color: '#374151' },
  dateRow: { flexDirection: 'row', gap: 10 },
  dateField: { flex: 1, padding: 12, backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  dateLabel: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  dateValue: { fontSize: 13, fontWeight: '600', color: '#1F2937', marginTop: 4 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  modalBtn: { fontSize: 16, fontWeight: '600' },
});
