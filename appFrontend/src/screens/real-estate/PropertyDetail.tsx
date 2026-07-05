import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { differenceInDays } from 'date-fns';
import type { RealEstateStackParamList } from '../../navigation/RealEstateNavigator';
import { LocationMapPreview } from '../../components/LocationMapPreview';
import { isValidMapCoordinates } from '../../utils/mapCoordinates';
import { realEstateApi, type PropertyListing, type PropertyRoomType, type GuestSelection, type StaySummary } from '../../services/realEstateApi';
import { getImageUrl } from '../../config/env';
import { GuestSelector } from '../../components/GuestSelector';
import { StayBookingDates } from '../../components/StayBookingDates';
import { StayAvailabilityBanner } from '../../components/StayAvailabilityBanner';
import { PaginatedRoomList } from '../../components/PaginatedRoomList';
import { DetailImageCarousel } from '../../components/DetailImageCarousel';
import { defaultCheckInDate, defaultCheckOutDate } from '../../utils/stayDates';
import { useRequireAuth } from '../../hooks/useRequireAuth';

const ACCENT = '#7C3AED';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Nav = NativeStackNavigationProp<RealEstateStackParamList, 'PropertyDetail'>;
type Route = RouteProp<RealEstateStackParamList, 'PropertyDetail'>;

const formatPrice = (price: number, currency: string) => {
  const symbol = currency === 'GMD' ? 'D' : currency === 'USD' ? '$' : currency;
  return `${symbol}${Number(price).toLocaleString()}`;
};

const isStayType = (type: string) => type === 'HOTEL' || type === 'APARTMENT_RENTAL';

export function PropertyDetail() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { listingId } = route.params;
  const { requireAuth } = useRequireAuth();

  const [listing, setListing] = useState<PropertyListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [roomTypes, setRoomTypes] = useState<PropertyRoomType[]>([]);
  const [staySummary, setStaySummary] = useState<StaySummary | null>(null);
  const [availLoading, setAvailLoading] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [roomsBooked, setRoomsBooked] = useState(1);
  const [checkIn, setCheckIn] = useState(defaultCheckInDate);
  const [checkOut, setCheckOut] = useState(defaultCheckOutDate);
  const [guests, setGuests] = useState<GuestSelection>({ adults: 2, children: 0, childAges: [] });

  useEffect(() => {
    realEstateApi.getListing(listingId)
      .then(setListing)
      .catch(() => setListing(null))
      .finally(() => setLoading(false));
  }, [listingId]);

  const isStay = listing ? isStayType(listing.listingType) : false;

  useEffect(() => {
    if (!listing || !isStay || checkOut <= checkIn) {
      setRoomTypes([]);
      setStaySummary(null);
      return;
    }
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
      })
      .catch(() => {
        setRoomTypes([]);
        setStaySummary(null);
      })
      .finally(() => setAvailLoading(false));
  }, [listing, listingId, isStay, checkIn, checkOut, guests.adults, guests.children]);

  const nights = useMemo(() => Math.max(1, differenceInDays(checkOut, checkIn)), [checkIn, checkOut]);
  const selectedRoom = roomTypes.find((r) => r.id === selectedRoomId);
  const totalPrice = selectedRoom ? Number(selectedRoom.pricePerNight) * nights * roomsBooked : 0;

  const handleBook = () => {
    if (!requireAuth('Login to book this property.')) return;
    if (!selectedRoom) {
      return;
    }
    navigation.navigate('PropertyBookingForm', {
      listingId,
      checkIn: checkIn.toISOString(),
      checkOut: checkOut.toISOString(),
      adults: guests.adults,
      children: guests.children,
      childAges: guests.childAges,
      roomTypeId: selectedRoom.id,
      roomsBooked,
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#9CA3AF" />
        <Text style={styles.errorText}>Property not found</Text>
        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text style={styles.backLinkText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const amenities = listing.amenities ?? [];
  const displayPrice = listing.fromPrice ?? listing.price;
  const galleryUrls = listing.images.map((img) => getImageUrl(img.url));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.topBarButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {galleryUrls.length > 0 ? (
          <DetailImageCarousel images={galleryUrls} height={260} accentColor="#FFFFFF" />
        ) : (
          <View style={[styles.galleryImage, styles.galleryPlaceholder]}>
            <Ionicons name="image-outline" size={48} color="#9CA3AF" />
          </View>
        )}

        <View style={styles.body}>
          <Text style={styles.title}>{listing.title}</Text>
          <Text style={styles.price}>
            {isStay ? `From ${formatPrice(displayPrice, listing.currency)}/night` : formatPrice(listing.price, listing.currency)}
          </Text>

          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={16} color="#6B7280" />
            <Text style={styles.locationText}>{listing.address}, {listing.city}</Text>
          </View>

          {isStay && (
            <View style={styles.searchPanel}>
              <Text style={styles.sectionTitle}>Your stay</Text>
              <StayBookingDates
                checkIn={checkIn}
                checkOut={checkOut}
                onCheckInChange={setCheckIn}
                onCheckOutChange={setCheckOut}
                accent={ACCENT}
              />
              <GuestSelector value={guests} onChange={setGuests} accent={ACCENT} />

              <StayAvailabilityBanner loading={availLoading} summary={staySummary} accent={ACCENT} />

              <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Available rooms</Text>
              {availLoading ? (
                <ActivityIndicator color={ACCENT} style={{ marginVertical: 16 }} />
              ) : (
                <PaginatedRoomList
                  items={roomTypes}
                  keyExtractor={(room) => room.id}
                  emptyMessage="No rooms available for these dates and guests."
                  accent={ACCENT}
                  renderItem={(room) => {
                    const soldOut = room.available === false || (room.unitsLeft ?? 0) <= 0;
                    const selected = selectedRoomId === room.id;
                    const photo = room.photos?.[0];
                    return (
                      <TouchableOpacity
                        style={[styles.roomCard, selected && styles.roomCardSelected, soldOut && styles.roomCardDisabled]}
                        onPress={() => !soldOut && setSelectedRoomId(room.id)}
                        disabled={soldOut}
                        activeOpacity={0.85}
                      >
                        {photo ? (
                          <Image source={{ uri: getImageUrl(photo) }} style={styles.roomImage} />
                        ) : (
                          <View style={[styles.roomImage, styles.roomImagePlaceholder]}>
                            <Ionicons name="bed-outline" size={24} color="#9CA3AF" />
                          </View>
                        )}
                        <View style={styles.roomBody}>
                          <Text style={styles.roomName}>{room.name}</Text>
                          {room.bedType && <Text style={styles.roomMeta}>{room.bedType} · up to {room.maxOccupancy} guests</Text>}
                          <Text style={styles.roomPrice}>{formatPrice(room.pricePerNight, listing.currency)}/night</Text>
                          {!soldOut && room.unitsLeft != null && (
                            <Text style={styles.unitsLeft}>{room.unitsLeft} left</Text>
                          )}
                          {soldOut && <Text style={styles.soldOut}>Sold out</Text>}
                        </View>
                        {selected && <Ionicons name="checkmark-circle" size={22} color={ACCENT} />}
                      </TouchableOpacity>
                    );
                  }}
                />
              )}

              {selectedRoom && (
                <View style={styles.quantityRow}>
                  <Text style={styles.quantityLabel}>Rooms</Text>
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => setRoomsBooked((n) => Math.max(1, n - 1))}
                    >
                      <Ionicons name="remove" size={18} color={ACCENT} />
                    </TouchableOpacity>
                    <Text style={styles.qtyValue}>{roomsBooked}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => setRoomsBooked((n) => Math.min(selectedRoom.unitsLeft ?? 1, n + 1))}
                    >
                      <Ionicons name="add" size={18} color={ACCENT} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.totalPreview}>
                    Total: {formatPrice(totalPrice, listing.currency)} · {nights} night{nights !== 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </View>
          )}

          {isValidMapCoordinates(listing.latitude, listing.longitude) && (
            <View style={{ marginTop: 16 }}>
              <Text style={styles.sectionTitle}>Location</Text>
              <LocationMapPreview
                location={{ latitude: listing.latitude!, longitude: listing.longitude!, address: listing.address }}
                city={listing.city}
                accent={ACCENT}
              />
            </View>
          )}

          {(listing.bedrooms || listing.bathrooms || listing.areaSqm) && (
            <View style={styles.statsRow}>
              {listing.bedrooms != null && (
                <View style={styles.stat}>
                  <Ionicons name="bed-outline" size={18} color={ACCENT} />
                  <Text style={styles.statText}>{listing.bedrooms} beds</Text>
                </View>
              )}
              {listing.bathrooms != null && (
                <View style={styles.stat}>
                  <Ionicons name="water-outline" size={18} color={ACCENT} />
                  <Text style={styles.statText}>{listing.bathrooms} baths</Text>
                </View>
              )}
              {listing.areaSqm != null && (
                <View style={styles.stat}>
                  <Ionicons name="resize-outline" size={18} color={ACCENT} />
                  <Text style={styles.statText}>{listing.areaSqm} m²</Text>
                </View>
              )}
            </View>
          )}

          {listing.description && (
            <>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{listing.description}</Text>
            </>
          )}

          {amenities.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Amenities</Text>
              <View style={styles.amenities}>
                {amenities.map((item, i) => (
                  <View key={i} style={styles.amenityChip}>
                    <Ionicons name="checkmark-circle" size={14} color={ACCENT} />
                    <Text style={styles.amenityText}>{item}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {listing.virtualTours.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Virtual Tours</Text>
              {listing.virtualTours.map((tour) => (
                <TouchableOpacity
                  key={tour.id}
                  style={styles.tourButton}
                  onPress={() =>
                    navigation.navigate('PropertyVirtualTour', {
                      listingId,
                      tourUrl: tour.tourUrl,
                      tourType: tour.tourType,
                      title: tour.title || listing.title,
                    })
                  }
                >
                  <Ionicons name="videocam-outline" size={20} color={ACCENT} />
                  <Text style={styles.tourButtonText}>{tour.title || 'View Virtual Tour'}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              ))}
            </>
          )}

          {listing.agent && (
            <>
              <Text style={styles.sectionTitle}>Agent</Text>
              <View style={styles.agentCard}>
                <Ionicons name="person-circle-outline" size={36} color={ACCENT} />
                <View style={styles.agentInfo}>
                  <Text style={styles.agentName}>{listing.agent.displayName}</Text>
                  {listing.agent.companyName && (
                    <Text style={styles.agentCompany}>{listing.agent.companyName}</Text>
                  )}
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        {isStay ? (
          <TouchableOpacity
            style={[styles.primaryButton, !selectedRoom && styles.primaryButtonDisabled]}
            onPress={handleBook}
            disabled={!selectedRoom}
          >
            <Ionicons name="calendar-outline" size={20} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>
              {selectedRoom ? `Book · ${formatPrice(totalPrice, listing.currency)}` : 'Select a room'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              if (!requireAuth('Login to inquire about this property.')) return;
              navigation.navigate('PropertyInquiryForm', { listingId });
            }}
          >
            <Ionicons name="mail-outline" size={20} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Inquire</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  safeArea: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  errorText: { fontSize: 16, color: '#6B7280', marginTop: 12 },
  backLink: { marginTop: 16 },
  backLinkText: { fontSize: 14, color: ACCENT, fontWeight: '600' },
  topBar: { paddingHorizontal: 16, paddingVertical: 8 },
  topBarButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  galleryImage: { width: SCREEN_WIDTH, height: 260 },
  galleryPlaceholder: { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  body: { padding: 16, paddingBottom: 100 },
  title: { fontSize: 22, fontWeight: '700', color: '#1F2937' },
  price: { fontSize: 20, fontWeight: '700', color: ACCENT, marginTop: 8 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  locationText: { fontSize: 14, color: '#6B7280', flex: 1 },
  searchPanel: { marginTop: 16, padding: 16, backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  dateRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  dateField: { flex: 1, padding: 12, backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  dateLabel: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  dateValue: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginTop: 4 },
  noRooms: { fontSize: 14, color: '#6B7280', marginVertical: 12 },
  roomCard: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 10, gap: 12 },
  roomCardSelected: { borderColor: ACCENT, backgroundColor: '#F5F3FF' },
  roomCardDisabled: { opacity: 0.5 },
  roomImage: { width: 72, height: 72, borderRadius: 8 },
  roomImagePlaceholder: { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  roomBody: { flex: 1 },
  roomName: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  roomMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  roomPrice: { fontSize: 14, fontWeight: '700', color: ACCENT, marginTop: 4 },
  unitsLeft: { fontSize: 11, color: '#059669', marginTop: 2 },
  soldOut: { fontSize: 11, color: '#EF4444', marginTop: 2, fontWeight: '600' },
  quantityRow: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  quantityLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  qtyBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center' },
  qtyValue: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  totalPreview: { fontSize: 14, fontWeight: '600', color: ACCENT, marginTop: 10 },
  statsRow: { flexDirection: 'row', gap: 16, marginTop: 16 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { fontSize: 14, color: '#374151' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginTop: 20, marginBottom: 10 },
  description: { fontSize: 14, color: '#4B5563', lineHeight: 22 },
  amenities: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenityChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F5F3FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  amenityText: { fontSize: 13, color: '#374151' },
  tourButton: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: '#F9FAFB', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 8 },
  tourButtonText: { flex: 1, fontSize: 14, fontWeight: '500', color: '#1F2937' },
  agentCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: '#F9FAFB', borderRadius: 10 },
  agentInfo: { flex: 1 },
  agentName: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  agentCompany: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 14 },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});
