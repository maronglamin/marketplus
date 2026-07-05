import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { GuestSelection } from '../services/realEstateApi';

interface GuestSelectorProps {
  value: GuestSelection;
  onChange: (value: GuestSelection) => void;
  accent?: string;
}

export function GuestSelector({ value, onChange, accent = '#7C3AED' }: GuestSelectorProps) {
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
    <View style={styles.container}>
      <CounterRow
        label="Adults"
        subtitle="Age 18+"
        value={value.adults}
        min={1}
        max={10}
        onChange={(adults) => onChange({ ...value, adults })}
        accent={accent}
      />
      <CounterRow
        label="Children"
        subtitle="Age 0-17"
        value={value.children}
        min={0}
        max={6}
        onChange={setChildren}
        accent={accent}
      />
      {value.children > 0 && (
        <View style={styles.agesSection}>
          <Text style={styles.agesTitle}>Children's ages</Text>
          {value.childAges.map((age, i) => (
            <View key={i} style={styles.ageRow}>
              <Text style={styles.ageLabel}>Child {i + 1}</Text>
              <View style={styles.ageControls}>
                <TouchableOpacity
                  style={styles.ageBtn}
                  onPress={() => updateChildAge(i, Math.max(0, age - 1))}
                >
                  <Ionicons name="remove" size={16} color="#374151" />
                </TouchableOpacity>
                <Text style={styles.ageValue}>{age} yrs</Text>
                <TouchableOpacity
                  style={styles.ageBtn}
                  onPress={() => updateChildAge(i, Math.min(17, age + 1))}
                >
                  <Ionicons name="add" size={16} color="#374151" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function CounterRow({
  label, subtitle, value, min, max, onChange, accent,
}: {
  label: string;
  subtitle: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  accent: string;
}) {
  return (
    <View style={styles.row}>
      <View>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.btn, value <= min && styles.btnDisabled]}
          onPress={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
        >
          <Ionicons name="remove" size={18} color={value <= min ? '#D1D5DB' : '#374151'} />
        </TouchableOpacity>
        <Text style={[styles.count, { color: accent }]}>{value}</Text>
        <TouchableOpacity
          style={[styles.btn, value >= max && styles.btnDisabled]}
          onPress={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
        >
          <Ionicons name="add" size={18} color={value >= max ? '#D1D5DB' : '#374151'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rowLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  rowSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  btnDisabled: { opacity: 0.5 },
  count: { fontSize: 16, fontWeight: '700', minWidth: 24, textAlign: 'center' },
  agesSection: { marginTop: 8, padding: 12, backgroundColor: '#F9FAFB', borderRadius: 10 },
  agesTitle: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  ageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  ageLabel: { fontSize: 14, color: '#6B7280' },
  ageControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ageBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  ageValue: { fontSize: 14, fontWeight: '600', color: '#111827', minWidth: 48, textAlign: 'center' },
});
