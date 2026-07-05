import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { differenceInDays } from 'date-fns';
import { LocationMapPreview } from '../../components/LocationMapPreview';
import { isValidMapCoordinates } from '../../utils/mapCoordinates';
import type { RealEstateStackParamList } from '../../navigation/RealEstateNavigator';
import { realEstateApi, type PropertyListing, type PropertyRoomType, type GuestSelection, type StaySummary } from '../../services/realEstateApi';
import { GuestSelector } from '../../components/GuestSelector';
import { StayBookingDates } from '../../components/StayBookingDates';
import { StayAvailabilityBanner } from '../../components/StayAvailabilityBanner';
import { PaginatedRoomList } from '../../components/PaginatedRoomList';
import { defaultCheckInDate, defaultCheckOutDate } from '../../utils/stayDates';

const ACCENT = '#7C3AED';

type Nav = NativeStackNavigationProp<RealEstateStackParamList, 'PropertyBookingForm'>;
type Route = RouteProp<RealEstateStackParamList, 'PropertyBookingForm'>;

const formatPrice = (price: number, currency: string) => {
  const symbol = currency === 'GMD' ? 'D' : currency === 'USD' ? '$' : currency;
  return `${symbol}${Number(price).toLocaleString()}`;
};

export function PropertyBookingForm() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const {
    listingId,
    checkIn: paramCheckIn,
    checkOut: paramCheckOut,
    adults: paramAdults,
    children: paramChildren,
    childAges: paramChildAges,
    roomTypeId: paramRoomTypeId,
    roomsBooked: paramRoomsBooked,
  } = route.params;

  const [listing, setListing] = useState<PropertyListing | null>(null);
  const [roomTypes, setRoomTypes] = useState<PropertyRoomType[]>([]);
  const [staySummary, setStaySummary] = useState<StaySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [availLoading, setAvailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkIn, setCheckIn] = useState(() => (paramCheckIn ? new Date(paramCheckIn) : defaultCheckInDate()));
  const [checkOut, setCheckOut] = useState(() => (paramCheckOut ? new Date(paramCheckOut) : defaultCheckOutDate()));
  const [guests, setGuests] = useState<GuestSelection>({
    adults: paramAdults ?? 2,
    children: paramChildren ?? 0,
    childAges: paramChildAges ?? [],
  });
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(paramRoomTypeId ?? null);
  const [roomsBooked, setRoomsBooked] = useState(paramRoomsBooked ?? 1);

  useEffect(() => {
    realEstateApi.getListing(listingId)
      .then(setListing)
      .catch(() => setListing(null))
      .finally(() => setLoading(false));
  }, [listingId]);

  useEffect(() => {
    if (!listing || checkOut <= checkIn) return;
    setAvailLoading(true);
    realEstateApi.getAvailability(listingId, {
      checkIn: checkIn.toISOString(),
      checkOut: checkOut.toISOString(),
      adults: guests.adults,
      children: guests.children,
    })
      .then((data) => {
        setRoomTypes(data.roomTypes ?? []);
        setStaySummary(data.staySummary ?? null);
        if (paramRoomTypeId && data.roomTypes?.some((r) => r.id === paramRoomTypeId)) {
          setSelectedRoomId(paramRoomTypeId);
        } else if (!data.roomTypes?.some((r) => r.id === selectedRoomId)) {
          setSelectedRoomId(data.roomTypes?.[0]?.id ?? null);
        }
      })
      .catch(() => setRoomTypes([]))
      .finally(() => setAvailLoading(false));
  }, [listing, listingId, checkIn, checkOut, guests.adults, guests.children]);

  const nights = useMemo(() => Math.max(1, differenceInDays(checkOut, checkIn)), [checkIn, checkOut]);
  const selectedRoom = roomTypes.find((r) => r.id === selectedRoomId);
  const totalPrice = selectedRoom ? Number(selectedRoom.pricePerNight) * nights * roomsBooked : 0;

  const handleSubmit = async () => {
    if (!listing || !selectedRoom) {
      Alert.alert('Select a room', 'Please choose an available room type.');
      return;
    }
    if (checkOut <= checkIn) {
      Alert.alert('Invalid dates', 'Check-out must be after check-in.');
      return;
    }

    try {
      setSubmitting(true);
      const booking = await realEstateApi.createBooking({
        listingId,
        checkIn: checkIn.toISOString(),
        checkOut: checkOut.toISOString(),
        adults: guests.adults,
        children: guests.children,
        childAges: guests.childAges,
        roomTypeId: selectedRoom.id,
        roomsBooked,
      });

      Alert.alert(
        'Booking Created',
        `Your reservation ${booking.bookingRef} is pending payment.`,
        [
          { text: 'View My Bookings', onPress: () => navigation.navigate('MyPropertyBookings') },
          { text: 'OK', onPress: () => navigation.goBack() },
        ],
      );
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to create booking.');
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
          <Text style={styles.headerTitle}>Confirm Booking</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {listing && (
            <>
              <Text style={styles.listingTitle}>{listing.title}</Text>
              {isValidMapCoordinates(listing.latitude, listing.longitude) && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={styles.label}>Property location</Text>
                  <LocationMapPreview
                    location={{ latitude: listing.latitude!, longitude: listing.longitude!, address: listing.address }}
                    city={listing.city}
                    accent={ACCENT}
                  />
                </View>
              )}
            </>
          )}

          <Text style={styles.label}>Dates</Text>
          <StayBookingDates
            checkIn={checkIn}
            checkOut={checkOut}
            onCheckInChange={setCheckIn}
            onCheckOutChange={setCheckOut}
            accent={ACCENT}
          />

          <Text style={styles.label}>Guests</Text>
          <GuestSelector value={guests} onChange={setGuests} accent={ACCENT} />

          <StayAvailabilityBanner loading={availLoading} summary={staySummary} accent={ACCENT} />

          <Text style={styles.label}>Room type</Text>
          {availLoading ? (
            <ActivityIndicator color={ACCENT} style={{ marginVertical: 12 }} />
          ) : (
            <PaginatedRoomList
              items={roomTypes}
              keyExtractor={(room) => room.id}
              emptyMessage="No rooms available for these dates."
              accent={ACCENT}
              renderItem={(room) => {
                const selected = selectedRoomId === room.id;
                const soldOut = room.available === false;
                return (
                  <TouchableOpacity
                    style={[styles.roomOption, selected && styles.roomOptionSelected, soldOut && { opacity: 0.5 }]}
                    onPress={() => !soldOut && setSelectedRoomId(room.id)}
                    disabled={soldOut}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.roomName}>{room.name}</Text>
                      <Text style={styles.roomMeta}>{formatPrice(room.pricePerNight, listing?.currency ?? 'GMD')}/night</Text>
                    </View>
                    {selected && <Ionicons name="checkmark-circle" size={22} color={ACCENT} />}
                  </TouchableOpacity>
                );
              }}
            />
          )}

          {selectedRoom && (
            <>
              <Text style={styles.label}>Number of rooms</Text>
              <View style={styles.guestRow}>
                <TouchableOpacity style={styles.guestButton} onPress={() => setRoomsBooked((n) => Math.max(1, n - 1))}>
                  <Ionicons name="remove" size={20} color={ACCENT} />
                </TouchableOpacity>
                <Text style={styles.guestCount}>{roomsBooked}</Text>
                <TouchableOpacity
                  style={styles.guestButton}
                  onPress={() => setRoomsBooked((n) => Math.min(selectedRoom.unitsLeft ?? 1, n + 1))}
                >
                  <Ionicons name="add" size={20} color={ACCENT} />
                </TouchableOpacity>
              </View>
            </>
          )}

          {listing && selectedRoom && (
            <View style={styles.priceSummary}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>
                  {formatPrice(selectedRoom.pricePerNight, listing.currency)} × {nights} night{nights !== 1 ? 's' : ''} × {roomsBooked} room{roomsBooked !== 1 ? 's' : ''}
                </Text>
                <Text style={styles.priceValue}>{formatPrice(totalPrice, listing.currency)}</Text>
              </View>
              <View style={[styles.priceRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatPrice(totalPrice, listing.currency)}</Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, (submitting || !selectedRoom) && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={submitting || !selectedRoom}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.submitText}>Confirm Booking</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backButton: { padding: 4, marginRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  content: { flex: 1, padding: 16 },
  listingTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8, marginTop: 12 },
  dateField: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: '#F9FAFB', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  dateText: { fontSize: 15, color: '#1F2937' },
  noRooms: { fontSize: 14, color: '#6B7280', marginBottom: 12 },
  roomOption: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#F9FAFB', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 8 },
  roomOptionSelected: { borderColor: ACCENT, backgroundColor: '#F5F3FF' },
  roomName: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  roomMeta: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  guestRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  guestButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center' },
  guestCount: { fontSize: 18, fontWeight: '700', color: '#1F2937', minWidth: 40, textAlign: 'center' },
  priceSummary: { marginTop: 24, padding: 16, backgroundColor: '#F5F3FF', borderRadius: 12, borderWidth: 1, borderColor: '#DDD6FE' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  priceLabel: { fontSize: 14, color: '#6B7280', flex: 1, marginRight: 8 },
  priceValue: { fontSize: 14, color: '#374151' },
  totalRow: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#DDD6FE', marginBottom: 0 },
  totalLabel: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  totalValue: { fontSize: 18, fontWeight: '700', color: ACCENT },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 14 },
  submitDisabled: { opacity: 0.7 },
  submitText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});
