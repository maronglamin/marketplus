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
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import type { RealEstateStackParamList } from '../../navigation/RealEstateNavigator';
import { realEstateApi, type PropertyBooking } from '../../services/realEstateApi';

type Nav = NativeStackNavigationProp<RealEstateStackParamList, 'AgentReservationDetail'>;
type Route = RouteProp<RealEstateStackParamList, 'AgentReservationDetail'>;

const ACCENT = '#7C3AED';

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#D97706',
  CONFIRMED: '#059669',
  CANCELLED: '#EF4444',
  COMPLETED: '#6366F1',
};

function DetailRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  const content = (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={18} color="#6B7280" />
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={[styles.detailValue, onPress ? styles.linkValue : null]}>{value}</Text>
      </View>
      {onPress ? <Ionicons name="open-outline" size={16} color={ACCENT} /> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      {content}
    </TouchableOpacity>
  );
}

export function AgentReservationDetail() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { bookingId } = route.params;

  const [booking, setBooking] = useState<PropertyBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadBooking = useCallback(async () => {
    try {
      setLoading(true);
      const data = await realEstateApi.getBooking(bookingId);
      setBooking(data);
    } catch {
      Alert.alert('Error', 'Failed to load reservation details.');
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

  const updateStatus = (status: 'CONFIRMED' | 'CANCELLED') => {
    const label = status === 'CONFIRMED' ? 'Confirm' : 'Cancel';
    Alert.alert(`${label} reservation`, `${label} this reservation?`, [
      { text: 'Back', style: 'cancel' },
      {
        text: label,
        style: status === 'CANCELLED' ? 'destructive' : 'default',
        onPress: async () => {
          try {
            setSubmitting(true);
            const updated = await realEstateApi.updateBookingStatus(bookingId, status);
            setBooking(updated);
            Alert.alert('Updated', `Reservation ${status.toLowerCase()}.`);
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to update reservation.');
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
    ? `${booking.customer.firstName || ''} ${booking.customer.lastName || ''}`.trim() || 'Customer'
    : 'Customer';
  const formatPrice = (price: number, currency: string) => {
    const symbol = currency === 'GMD' ? 'D' : currency === 'USD' ? '$' : currency;
    return `${symbol}${Number(price).toLocaleString()}`;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Reservation</Text>
            <Text style={styles.headerSubtitle}>{booking.bookingRef}</Text>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.statusBanner, { backgroundColor: `${statusColor}15` }]}>
            <Ionicons name="information-circle-outline" size={20} color={statusColor} />
            <Text style={[styles.statusBannerText, { color: statusColor }]}>
              {booking.status} · Payment {booking.paymentStatus}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Property</Text>
          <View style={styles.card}>
            <DetailRow icon="home-outline" label="Listing" value={booking.listing?.title || 'Stay'} />
            {booking.roomType?.name ? (
              <DetailRow icon="bed-outline" label="Room type" value={booking.roomType.name} />
            ) : null}
            <DetailRow
              icon="cash-outline"
              label="Total"
              value={formatPrice(booking.totalPrice, booking.currency)}
            />
          </View>

          <Text style={styles.sectionTitle}>Stay details</Text>
          <View style={styles.card}>
            <DetailRow
              icon="calendar-outline"
              label="Check-in"
              value={format(new Date(booking.checkIn), 'EEE, MMM d, yyyy')}
            />
            <DetailRow
              icon="calendar-outline"
              label="Check-out"
              value={format(new Date(booking.checkOut), 'EEE, MMM d, yyyy')}
            />
            <DetailRow
              icon="moon-outline"
              label="Nights"
              value={`${booking.nights} night${booking.nights !== 1 ? 's' : ''}`}
            />
            <DetailRow
              icon="people-outline"
              label="Guests"
              value={`${booking.adults} adult${booking.adults !== 1 ? 's' : ''}${
                booking.children
                  ? `, ${booking.children} child${booking.children !== 1 ? 'ren' : ''}`
                  : ''
              } · ${booking.roomsBooked} room${booking.roomsBooked !== 1 ? 's' : ''}`}
            />
            {booking.notes ? (
              <DetailRow icon="document-text-outline" label="Notes" value={booking.notes} />
            ) : null}
          </View>

          <Text style={styles.sectionTitle}>Guest</Text>
          <View style={styles.card}>
            <DetailRow icon="person-outline" label="Name" value={customerName} />
            {booking.customer?.phoneNumber ? (
              <DetailRow
                icon="call-outline"
                label="Phone"
                value={booking.customer.phoneNumber}
                onPress={() => Linking.openURL(`tel:${booking.customer!.phoneNumber}`)}
              />
            ) : null}
            <DetailRow
              icon="time-outline"
              label="Booked on"
              value={format(new Date(booking.createdAt), 'MMM d, yyyy · h:mm a')}
            />
          </View>

          {booking.status === 'PENDING' && (
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.confirmButton, submitting && styles.disabled]}
                onPress={() => updateStatus('CONFIRMED')}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Confirm</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton, submitting && styles.disabled]}
                onPress={() => updateStatus('CANCELLED')}
                disabled={submitting}
              >
                <Ionicons name="close-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
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
  content: { flex: 1, padding: 16 },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  statusBannerText: { fontSize: 14, fontWeight: '600' },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 8 },
  card: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailContent: { flex: 1 },
  detailLabel: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  detailValue: { fontSize: 15, color: '#1F2937', fontWeight: '500' },
  linkValue: { color: ACCENT },
  actions: { gap: 10, marginBottom: 32 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
  },
  confirmButton: { backgroundColor: '#059669' },
  cancelButton: { backgroundColor: '#EF4444' },
  actionButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  disabled: { opacity: 0.7 },
});
