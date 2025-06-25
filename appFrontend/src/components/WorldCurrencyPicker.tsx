import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { deliveryOptionsService, Currency } from '../services/deliveryOptionsService';

interface WorldCurrencyPickerProps {
  value: string;
  onChange: (code: string) => void;
  style?: ViewStyle;
  label?: string;
}

export const WorldCurrencyPicker: React.FC<WorldCurrencyPickerProps> = ({ value, onChange, style, label }) => {
  const [search, setSearch] = useState('');
  const currencies = useMemo(() => deliveryOptionsService.getPopularCurrencies(), []);
  const filtered = useMemo(() => {
    if (!search) return currencies;
    const q = search.toLowerCase();
    return currencies.filter(c =>
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.symbol.toLowerCase().includes(q)
    );
  }, [search, currencies]);

  return (
    <View style={style}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={styles.searchInput}
        value={search}
        onChangeText={setSearch}
        placeholder="Search currencies..."
        placeholderTextColor="#9CA3AF"
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollView}>
        <View style={styles.currencyContainer}>
          {filtered.map(currency => (
            <TouchableOpacity
              key={currency.code}
              style={[styles.currencyOption, value === currency.code && styles.currencyOptionSelected]}
              onPress={() => onChange(currency.code)}
            >
              <Text style={[styles.currencyOptionText, value === currency.code && styles.currencyOptionTextSelected]}>
                {currency.code} {currency.symbol}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
  searchInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  scrollView: { minHeight: 44 },
  currencyContainer: { flexDirection: 'row', flexWrap: 'nowrap' },
  currencyOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginRight: 8,
    backgroundColor: '#F3F4F6',
  },
  currencyOptionSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  currencyOptionText: {
    color: '#374151',
    fontWeight: '500',
    fontSize: 15,
  },
  currencyOptionTextSelected: {
    color: '#FFFFFF',
  },
}); 