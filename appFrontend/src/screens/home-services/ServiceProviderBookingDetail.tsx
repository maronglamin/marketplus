import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { HomeServicesStackParamList } from '../../navigation/HomeServicesNavigator';
import { homeServicesApi, type ServiceBooking } from '../../services/homeServicesApi';
import { LocationMapPreview } from '../../components/LocationMapPreview';
import { isValidMapCoordinates } from '../../utils/mapCoordinates';

type Nav = NativeStackNavigationProp<HomeServicesStackParamList, 'ServiceProviderBookingDetail'>;
type Route = RouteProp<HomeServicesStackParamList, 'ServiceProviderBookingDetail'>;

const ACCENT = '#0EA5E9';

const STATUS_COLORS: Record<string, string> = {
  PENDING_QUOTE: '#F59E0B',
  QUOTED: '#0EA5E9',
  ACCEPTED: '#10B981',
  PAID: '#059669',
  COMPLETED: '#6366F1',
  REJECTED: '#EF4444',
  CANCELLED: '#6B7280',
};

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={18} color="#6B7280" />
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

export function ServiceProviderBookingDetail() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { bookingId } = route.params;

  const [booking, setBooking] = useState<ServiceBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [quoteModalVisible, setQuoteModalVisible] = useState(false);
  const [quotePrice, setQuotePrice] = useState('');

  const loadBooking = useCallback(async () => {
    try {
      setLoading(true);
      const data = await homeServicesApi.getBooking(bookingId);
      setBooking(data);
    } catch {
      Alert.alert('Error', 'Failed to load booking details.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [bookingId, navigation]);

  useFocusEffect(
    useCallback(() => {
      loadBooking();
    }, [loadBooking]),
  );

  const handleSubmitQuote = async () => {
    const price = parseFloat(quotePrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price.');
      return;
    }
    try {
      setSubmitting(true);
      await homeServicesApi.quoteBooking(bookingId, price);
      setQuoteModalVisible(false);
      setQuotePrice('');
      await loadBooking();
      Alert.alert('Success', 'Quote submitted successfully.');
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to submit quote.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = () => {
    Alert.alert('Mark Complete', 'Mark this service as completed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete',
        onPress: async () => {
          try {
            setSubmitting(true);
            await homeServicesApi.completeBooking(bookingId);
            await loadBooking();
            Alert.alert('Success', 'Booking marked as completed.');
          } catch (error: any) {
            Alert.alert('Error', error?.response?.data?.message || 'Failed to complete booking.');
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  };

  if (loading || !booking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={ACCENT} style={{ marginTop: 80 }} />
      </View>
    );
  }

  const statusColor = STATUS_COLORS[booking.status] || '#6B7280';
  const customerName = booking.customer
    ? `${booking.customer.firstName} ${booking.customer.lastName}`.trim()
    : 'Customer';
  const displayPrice = booking.agreedPrice ?? booking.proposedPrice;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{booking.bookingRef}</Text>
            <Text style={styles.headerSubtitle}>{booking.category?.name}</Text>
          </View>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => navigation.navigate('ServiceBookingChat', { bookingId })}
          >
            <Ionicons name="chatbubble-outline" size={22} color={ACCENT} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.statusBanner, { backgroundColor: `${statusColor}15` }]}>
            <Ionicons name="information-circle-outline" size={20} color={statusColor} />
            <Text style={[styles.statusBannerText, { color: statusColor }]}>
              {booking.status.replace(/_/g, ' ')}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer</Text>
            <DetailRow icon="person-outline" label="Name" value={customerName} />
            {booking.customer?.phoneNumber ? (
              <DetailRow icon="call-outline" label="Phone" value={booking.customer.phoneNumber} />
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service request</Text>
            <DetailRow icon="construct-outline" label="Service" value={booking.category?.name || '—'} />
            <DetailRow icon="location-outline" label="Service address" value={booking.serviceAddress} />
            {isValidMapCoordinates(booking.serviceLatitude, booking.serviceLongitude) && (
              <View style={{ marginTop: 12 }}>
                <LocationMapPreview
                  location={{
                    latitude: booking.serviceLatitude,
                    longitude: booking.serviceLongitude,
                    address: booking.serviceAddress,
                  }}
                  accent="#0EA5E9"
                />
              </View>
            )}
            {booking.scheduledAt ? (
              <DetailRow
                icon="calendar-outline"
                label="Preferred date & time"
                value={new Date(booking.scheduledAt).toLocaleString()}
              />
            ) : (
              <DetailRow icon="calendar-outline" label="Preferred date & time" value="Not specified" />
            )}
            <DetailRow
              icon="document-text-outline"
              label="Customer notes"
              value={booking.notes?.trim() || 'No notes provided'}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pricing & payment</Text>
            {displayPrice != null ? (
              <DetailRow
                icon="cash-outline"
                label={booking.agreedPrice ? 'Agreed price' : 'Quoted price'}
                value={`${booking.currency} ${Number(displayPrice).toLocaleString()}`}
              />
            ) : (
              <DetailRow icon="cash-outline" label="Price" value="Awaiting your quote" />
            )}
            <DetailRow
              icon="card-outline"
              label="Payment status"
              value={booking.paymentStatus?.replace(/_/g, ' ') || 'PENDING'}
            />
            <DetailRow
              icon="time-outline"
              label="Requested on"
              value={new Date(booking.createdAt).toLocaleString()}
            />
          </View>
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.footer}>
          {booking.status === 'PENDING_QUOTE' && (
            <TouchableOpacity
              style={[styles.primaryButton, submitting && styles.buttonDisabled]}
              onPress={() => setQuoteModalVisible(true)}
              disabled={submitting}
            >
              <Ionicons name="pricetag-outline" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Send Quote</Text>
            </TouchableOpacity>
          )}
          {booking.status === 'PAID' && (
            <TouchableOpacity
              style={[styles.primaryButton, styles.completeButton, submitting && styles.buttonDisabled]}
              onPress={handleComplete}
              disabled={submitting}
            >
              <Ionicons name="checkmark-done-outline" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Mark Complete</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('ServiceBookingChat', { bookingId })}
          >
            <Ionicons name="chatbubbles-outline" size={20} color={ACCENT} />
            <Text style={styles.secondaryButtonText}>Message Customer</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </SafeAreaView>

      <Modal visible={quoteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Submit Quote</Text>
            <Text style={styles.modalSubtitle}>{booking.category?.name} · {booking.bookingRef}</Text>
            <Text style={styles.inputLabel}>Proposed Price ({booking.currency})</Text>
            <TextInput
              style={styles.priceInput}
              value={quotePrice}
              onChangeText={setQuotePrice}
              placeholder="Enter amount"
              keyboardType="decimal-pad"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setQuoteModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmit, submitting && styles.buttonDisabled]}
                onPress={handleSubmitQuote}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: { padding: 4, marginRight: 8 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  headerSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  chatButton: { padding: 8 },
  content: { flex: 1, padding: 16, paddingBottom: 120 },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  statusBannerText: { fontSize: 14, fontWeight: '600' },
  section: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 10 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  detailContent: { flex: 1 },
  detailLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 2 },
  detailValue: { fontSize: 14, color: '#374151', lineHeight: 20 },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
    gap: 10,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 14,
  },
  completeButton: { backgroundColor: '#059669' },
  primaryButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    backgroundColor: '#F0F9FF',
  },
  secondaryButtonText: { fontSize: 15, fontWeight: '600', color: ACCENT },
  buttonDisabled: { opacity: 0.6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  modalSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 4, marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
  priceInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
    marginBottom: 20,
  },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalCancel: { flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  modalCancelText: { fontSize: 15, color: '#6B7280', fontWeight: '500' },
  modalSubmit: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: ACCENT, alignItems: 'center' },
  modalSubmitText: { fontSize: 15, color: '#FFFFFF', fontWeight: '600' },
});
