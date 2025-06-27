import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ViewStyle, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mobileWalletService, MobileWalletProvider } from '../services/mobileWalletService';

interface MobileWalletPickerProps {
  value: string;
  onChange: (providerId: string) => void;
  style?: ViewStyle;
  label?: string;
}

export const MobileWalletPicker: React.FC<MobileWalletPickerProps> = ({ value, onChange, style, label }) => {
  const [search, setSearch] = useState('');
  const providers = useMemo(() => mobileWalletService.getActiveProviders(), []);
  
  const filteredProviders = useMemo(() => {
    if (!search) return providers;
    const q = search.toLowerCase();
    return providers.filter(provider =>
      provider.name.toLowerCase().includes(q) ||
      provider.code.toLowerCase().includes(q) ||
      provider.country.toLowerCase().includes(q)
    );
  }, [search, providers]);

  return (
    <View style={style}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      {/* Search Input */}
      <TextInput
        style={styles.searchInput}
        value={search}
        onChangeText={setSearch}
        placeholder="Search mobile wallet providers..."
        placeholderTextColor="#9CA3AF"
      />
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollView}>
        <View style={styles.providerContainer}>
          {filteredProviders.map(provider => (
            <TouchableOpacity
              key={provider.id}
              style={[styles.providerOption, value === provider.id && styles.providerOptionSelected]}
              onPress={() => onChange(provider.id)}
            >
              <View style={styles.providerContent}>
                <Ionicons 
                  name="phone-portrait-outline" 
                  size={16} 
                  color={value === provider.id ? '#FFFFFF' : '#6B7280'} 
                />
                <Text style={[styles.providerOptionText, value === provider.id && styles.providerOptionTextSelected]}>
                  {provider.name}
                </Text>
                {value === provider.id && (
                  <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      
      {/* No results message */}
      {filteredProviders.length === 0 && search && (
        <View style={styles.noResultsContainer}>
          <Text style={styles.noResultsText}>No providers found for "{search}"</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  label: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#374151', 
    marginBottom: 8 
  },
  scrollView: { 
    minHeight: 50 
  },
  providerContainer: { 
    flexDirection: 'row', 
    flexWrap: 'nowrap',
    paddingVertical: 4
  },
  providerOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginRight: 12,
    backgroundColor: '#FFFFFF',
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  providerOptionSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  providerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  providerOptionText: {
    color: '#374151',
    fontWeight: '500',
    fontSize: 14,
    flex: 1,
    marginLeft: 8,
  },
  providerOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
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
  noResultsContainer: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginTop: 8,
  },
  noResultsText: {
    color: '#6B7280',
    fontSize: 14,
    fontStyle: 'italic',
  },
}); 