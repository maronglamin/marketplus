import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import type { RealEstateStackParamList } from '../../navigation/RealEstateNavigator';
import { realEstateApi, type PropertyListing } from '../../services/realEstateApi';

const ACCENT = '#7C3AED';

type Nav = NativeStackNavigationProp<RealEstateStackParamList, 'PropertyInquiryForm'>;
type Route = RouteProp<RealEstateStackParamList, 'PropertyInquiryForm'>;

export function PropertyInquiryForm() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { listingId } = route.params;

  const [listing, setListing] = useState<PropertyListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [preferredDate, setPreferredDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    realEstateApi.getListing(listingId)
      .then(setListing)
      .catch(() => setListing(null))
      .finally(() => setLoading(false));
  }, [listingId]);

  const handleSubmit = async () => {
    if (!message.trim()) {
      Alert.alert('Message required', 'Please enter your inquiry message.');
      return;
    }

    try {
      setSubmitting(true);
      await realEstateApi.createInquiry({
        listingId,
        message: message.trim(),
        preferredDate: preferredDate?.toISOString(),
      });

      Alert.alert('Inquiry Sent', 'The agent will contact you soon.', [
        { text: 'View My Inquiries', onPress: () => navigation.navigate('MyPropertyBookings') },
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to send inquiry.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Send Inquiry</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {listing && <Text style={styles.listingTitle}>{listing.title}</Text>}

          <Text style={styles.label}>Message *</Text>
          <TextInput
            style={styles.textArea}
            value={message}
            onChangeText={setMessage}
            placeholder="I'm interested in this property..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />

          <Text style={styles.label}>Preferred Visit Date (optional)</Text>
          <TouchableOpacity style={styles.dateField} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={20} color={ACCENT} />
            <Text style={styles.dateText}>
              {preferredDate ? format(preferredDate, 'MMM d, yyyy') : 'Select a date'}
            </Text>
            {preferredDate && (
              <TouchableOpacity onPress={() => setPreferredDate(null)}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={preferredDate || new Date()}
              mode="date"
              minimumDate={new Date()}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, date) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (date) setPreferredDate(date);
              }}
            />
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="send-outline" size={20} color="#FFFFFF" />
                <Text style={styles.submitText}>Submit Inquiry</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  safeArea: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: { padding: 4, marginRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  content: { flex: 1, padding: 16 },
  listingTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8, marginTop: 12 },
  textArea: {
    minHeight: 120,
    padding: 14,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    fontSize: 15,
    color: '#1F2937',
  },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateText: { flex: 1, fontSize: 15, color: '#1F2937' },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 14,
  },
  submitDisabled: { opacity: 0.7 },
  submitText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});
