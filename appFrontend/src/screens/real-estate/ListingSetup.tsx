import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { RealEstateStackParamList } from '../../navigation/RealEstateNavigator';
import { realEstateApi, type PropertyRoomType, type PropertyListing } from '../../services/realEstateApi';
import { BED_TYPES, ROOM_AMENITIES } from '../../utils/propertyFormHelpers';

const ACCENT = '#7C3AED';
type Nav = NativeStackNavigationProp<RealEstateStackParamList, 'ListingSetup'>;
type Route = RouteProp<RealEstateStackParamList, 'ListingSetup'>;

export function ListingSetup() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { listingId, listingTitle } = route.params;

  const [tab, setTab] = useState<'rooms' | 'calendar'>('rooms');
  const [listing, setListing] = useState<PropertyListing | null>(null);
  const [rooms, setRooms] = useState<PropertyRoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [bedType, setBedType] = useState(BED_TYPES[0]);
  const [pricePerNight, setPricePerNight] = useState('');
  const [maxAdults, setMaxAdults] = useState('2');
  const [maxChildren, setMaxChildren] = useState('1');
  const [unitsAvailable, setUnitsAvailable] = useState('1');
  const [amenities, setAmenities] = useState<string[]>([]);
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [blocked, setBlocked] = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [listingData, r, b] = await Promise.all([
        realEstateApi.getListing(listingId),
        realEstateApi.getRoomTypes(listingId),
        realEstateApi.getBlockedDates(listingId),
      ]);
      setListing(listingData);
      setRooms(r);
      setBlocked(b);
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => { load(); }, [load]);

  const handleCreateRoom = async () => {
    if (!name.trim() || !pricePerNight) {
      Alert.alert('Required', 'Room name and price per night are required.');
      return;
    }
    try {
      await realEstateApi.createRoomType(listingId, {
        name: name.trim(),
        bedType,
        pricePerNight: parseFloat(pricePerNight),
        maxAdults: parseInt(maxAdults, 10) || 2,
        maxChildren: parseInt(maxChildren, 10) || 0,
        maxOccupancy: (parseInt(maxAdults, 10) || 2) + (parseInt(maxChildren, 10) || 0),
        unitsAvailable: parseInt(unitsAvailable, 10) || 1,
        amenities,
      });
      setShowForm(false);
      setName('');
      setPricePerNight('');
      setAmenities([]);
      await load();
      Alert.alert('Success', 'Room type saved.');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to add room.');
    }
  };

  const handleAddBlock = async () => {
    if (!blockStart || !blockEnd) {
      Alert.alert('Required', 'Enter start and end dates (YYYY-MM-DD).');
      return;
    }
    try {
      await realEstateApi.addBlockedDate(listingId, {
        startDate: blockStart,
        endDate: blockEnd,
      });
      setBlockStart('');
      setBlockEnd('');
      await load();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to block dates.');
    }
  };

  const handlePublish = async () => {
    if (rooms.length === 0) {
      Alert.alert('Add a room first', 'Create at least one room type before publishing.');
      return;
    }
    try {
      setPublishing(true);
      const updated = await realEstateApi.publishListing(listingId);
      setListing(updated);
      Alert.alert('Published', 'Your listing is now live and visible to guests.');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to publish listing.');
    } finally {
      setPublishing(false);
    }
  };

  const canPublish = listing && listing.status !== 'ACTIVE' && rooms.length > 0;
  const isLive = listing?.status === 'ACTIVE';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>Setup Listing</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{listingTitle}</Text>
        </View>
      </View>

      {isLive ? (
        <View style={styles.statusBannerLive}>
          <Ionicons name="checkmark-circle" size={18} color="#059669" />
          <Text style={styles.statusBannerLiveText}>Live — visible to guests</Text>
        </View>
      ) : canPublish ? (
        <View style={styles.statusBannerPending}>
          <Text style={styles.statusBannerPendingText}>Ready to publish — guests cannot book until you publish.</Text>
          <TouchableOpacity style={styles.publishBtn} onPress={handlePublish} disabled={publishing}>
            {publishing ? <ActivityIndicator color="#FFFFFF" size="small" /> : (
              <Text style={styles.publishBtnText}>Publish Listing</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'rooms' && styles.tabActive]} onPress={() => setTab('rooms')}>
          <Text style={[styles.tabText, tab === 'rooms' && styles.tabTextActive]}>Rooms & Rates</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'calendar' && styles.tabActive]} onPress={() => setTab('calendar')}>
          <Text style={[styles.tabText, tab === 'calendar' && styles.tabTextActive]}>Calendar</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={ACCENT} style={{ marginTop: 40 }} />
      ) : tab === 'rooms' ? (
        <ScrollView style={styles.content}>
          {!showForm ? (
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
              <Ionicons name="add-circle-outline" size={22} color={ACCENT} />
              <Text style={styles.addBtnText}>Add Room Type</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.form}>
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Room name *" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {BED_TYPES.map((b) => (
                  <TouchableOpacity key={b} style={[styles.chip, bedType === b && styles.chipSelected]} onPress={() => setBedType(b)}>
                    <Text style={[styles.chipText, bedType === b && styles.chipTextSelected]}>{b}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TextInput style={styles.input} value={pricePerNight} onChangeText={setPricePerNight} placeholder="Price per night *" keyboardType="decimal-pad" />
              <View style={styles.row}>
                <TextInput style={[styles.input, styles.half]} value={maxAdults} onChangeText={setMaxAdults} placeholder="Max adults" keyboardType="number-pad" />
                <TextInput style={[styles.input, styles.half]} value={maxChildren} onChangeText={setMaxChildren} placeholder="Max children" keyboardType="number-pad" />
              </View>
              <TextInput style={styles.input} value={unitsAvailable} onChangeText={setUnitsAvailable} placeholder="Units available" keyboardType="number-pad" />
              <Text style={styles.label}>Amenities</Text>
              <View style={styles.chipRow}>
                {ROOM_AMENITIES.map((a) => (
                  <TouchableOpacity
                    key={a}
                    style={[styles.chip, amenities.includes(a) && styles.chipSelected]}
                    onPress={() => setAmenities((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a])}
                  >
                    <Text style={[styles.chipText, amenities.includes(a) && styles.chipTextSelected]}>{a}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.saveBtn} onPress={handleCreateRoom}>
                <Text style={styles.saveText}>Save Room</Text>
              </TouchableOpacity>
            </View>
          )}
          {rooms.map((r) => (
            <View key={r.id} style={styles.roomCard}>
              <Text style={styles.roomName}>{r.name}</Text>
              <Text style={styles.roomMeta}>{r.bedType} · {r.maxAdults} adults · {r.unitsAvailable} units</Text>
              <Text style={styles.roomPrice}>D{Number(r.pricePerNight).toLocaleString()}/night</Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <ScrollView style={styles.content}>
          <Text style={styles.hint}>Block dates when the property is unavailable.</Text>
          <TextInput style={styles.input} value={blockStart} onChangeText={setBlockStart} placeholder="Start date YYYY-MM-DD" />
          <TextInput style={styles.input} value={blockEnd} onChangeText={setBlockEnd} placeholder="End date YYYY-MM-DD" />
          <TouchableOpacity style={styles.saveBtn} onPress={handleAddBlock}>
            <Text style={styles.saveText}>Block Dates</Text>
          </TouchableOpacity>
          {blocked.map((b) => (
            <View key={b.id} style={styles.blockRow}>
              <Text style={styles.blockText}>{b.startDate?.slice(0, 10)} → {b.endDate?.slice(0, 10)}</Text>
              <TouchableOpacity onPress={() => realEstateApi.deleteBlockedDate(listingId, b.id).then(load)}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { padding: 4, marginRight: 8 },
  title: { fontSize: 18, fontWeight: '600', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6B7280' },
  statusBannerLive: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 8, padding: 12, backgroundColor: '#ECFDF5', borderRadius: 10, borderWidth: 1, borderColor: '#A7F3D0' },
  statusBannerLiveText: { fontSize: 14, fontWeight: '600', color: '#059669' },
  statusBannerPending: { marginHorizontal: 16, marginBottom: 8, padding: 14, backgroundColor: '#FFFBEB', borderRadius: 10, borderWidth: 1, borderColor: '#FDE68A' },
  statusBannerPendingText: { fontSize: 13, color: '#92400E', marginBottom: 10 },
  publishBtn: { backgroundColor: ACCENT, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  publishBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
  tabs: { flexDirection: 'row', padding: 12, gap: 8 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, backgroundColor: '#F3F4F6' },
  tabActive: { backgroundColor: '#EDE9FE' },
  tabText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  tabTextActive: { color: ACCENT, fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#DDD6FE', backgroundColor: '#F5F3FF', marginBottom: 16 },
  addBtnText: { fontSize: 15, fontWeight: '600', color: ACCENT },
  form: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, fontSize: 15, backgroundColor: '#FFFFFF', marginBottom: 10 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  label: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF' },
  chipSelected: { backgroundColor: ACCENT, borderColor: ACCENT },
  chipText: { fontSize: 12, color: '#374151' },
  chipTextSelected: { color: '#FFFFFF' },
  saveBtn: { backgroundColor: ACCENT, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  saveText: { color: '#FFFFFF', fontWeight: '600' },
  roomCard: { padding: 14, backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 10 },
  roomName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  roomMeta: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  roomPrice: { fontSize: 14, fontWeight: '700', color: ACCENT, marginTop: 6 },
  hint: { fontSize: 13, color: '#6B7280', marginBottom: 12 },
  blockRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  blockText: { fontSize: 14, color: '#374151' },
});
