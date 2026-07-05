import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { HomeServicesStackParamList } from '../../navigation/HomeServicesNavigator';
import { homeServicesApi, type AvailableSlot } from '../../services/homeServicesApi';
import { FormScreenLayout } from '../../components/FormScreenLayout';
import { LocationPickerField } from '../../components/LocationPickerField';
import { DateSlotPicker } from '../../components/SlotPicker';
import type { MapLocationWithCity } from '../../services/mapLocationService';

type Nav = NativeStackNavigationProp<HomeServicesStackParamList, 'ServiceBookingRequest'>;
type Route = RouteProp<HomeServicesStackParamList, 'ServiceBookingRequest'>;

export function ServiceBookingRequest() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { providerId, providerName, offeringId, offeringName, categoryId } = route.params;

  const [location, setLocation] = useState<MapLocationWithCity | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchSlots = useCallback(
    (from: string, to: string) => {
      if (!providerId || !offeringId) return Promise.resolve([]);
      return homeServicesApi.getAvailableSlots(providerId, offeringId, from, to);
    },
    [providerId, offeringId],
  );

  const handleSubmit = async () => {
    if (!location?.latitude || !location?.longitude || !location.address?.trim()) {
      Alert.alert('Required', 'Please pin the service location on the map.');
      return;
    }
    if (!selectedSlot) {
      Alert.alert('Required', 'Please select an available time slot.');
      return;
    }
    if (!providerId || !offeringId) {
      Alert.alert('Error', 'Missing provider or service information.');
      return;
    }

    try {
      setSubmitting(true);
      const booking = await homeServicesApi.createBooking({
        providerId,
        offeringId,
        slotStart: selectedSlot.start,
        serviceAddress: location.address.trim(),
        serviceLatitude: location.latitude,
        serviceLongitude: location.longitude,
        notes: notes.trim() || undefined,
        categoryId,
      });
      navigation.replace('ServiceBookingDetail', { bookingId: booking.id });
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to create booking.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <FormScreenLayout
        header={
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Book Service</Text>
              <Text style={styles.headerSubtitle}>{providerName} · {offeringName}</Text>
            </View>
          </View>
        }
      >
        <View style={styles.serviceCard}>
          <Ionicons name="construct-outline" size={20} color="#0EA5E9" />
          <Text style={styles.serviceCardText}>{offeringName}</Text>
        </View>

        <Text style={styles.sectionTitle}>Choose a time slot</Text>
        <DateSlotPicker
          fetchSlots={fetchSlots}
          selectedStart={selectedSlot?.start ?? null}
          onSelect={setSelectedSlot}
        />

        <LocationPickerField
          value={location}
          onChange={setLocation}
          label="Service location"
          placeholder="Where should the service happen?"
          accent="#0EA5E9"
        />

        <View style={styles.field}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Describe the job, access instructions, etc."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="send-outline" size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Request Quote for This Slot</Text>
            </>
          )}
        </TouchableOpacity>
      </FormScreenLayout>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backButton: { padding: 4, marginRight: 8 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  headerSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  serviceCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: '#F0F9FF', borderRadius: 12, borderWidth: 1, borderColor: '#BAE6FD', marginBottom: 16 },
  serviceCardText: { fontSize: 15, fontWeight: '600', color: '#0369A1', flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 },
  field: { marginBottom: 20, marginTop: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, fontSize: 15, color: '#1F2937', backgroundColor: '#F9FAFB' },
  textArea: { minHeight: 90 },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#0EA5E9', borderRadius: 12, padding: 16, marginTop: 8, marginBottom: 32 },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});
