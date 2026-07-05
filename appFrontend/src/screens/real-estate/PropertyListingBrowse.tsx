import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { RealEstateStackParamList } from '../../navigation/RealEstateNavigator';
import { realEstateApi, type PropertyListing } from '../../services/realEstateApi';
import { getImageUrl } from '../../config/env';

const ACCENT = '#7C3AED';

type Nav = NativeStackNavigationProp<RealEstateStackParamList, 'PropertyListingBrowse'>;
type Route = RouteProp<RealEstateStackParamList, 'PropertyListingBrowse'>;

const formatPrice = (price: number, currency: string) => {
  const symbol = currency === 'GMD' ? 'D' : currency === 'USD' ? '$' : currency;
  return `${symbol}${Number(price).toLocaleString()}`;
};

export function PropertyListingBrowse() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { listingType, title, checkIn, checkOut, adults, children } = route.params;

  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isStaySearch = (listingType === 'HOTEL' || listingType === 'APARTMENT_RENTAL') && checkIn && checkOut;

  const loadListings = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const data = isStaySearch
        ? await realEstateApi.searchListings({
            listingType,
            checkIn,
            checkOut,
            adults: adults ?? 2,
            children: children ?? 0,
          })
        : await realEstateApi.getListings({ listingType });
      setListings(data);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [listingType, isStaySearch, checkIn, checkOut, adults, children]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const renderItem = ({ item }: { item: PropertyListing }) => {
    const imageUrl = item.images[0]?.url ? getImageUrl(item.images[0].url) : null;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('PropertyDetail', { listingId: item.id })}
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
            <Ionicons name="image-outline" size={32} color="#9CA3AF" />
          </View>
        )}
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.cardPrice}>
            {item.fromPrice != null
              ? `From ${formatPrice(item.fromPrice, item.currency)}/night`
              : formatPrice(item.price, item.currency)}
          </Text>
          <View style={styles.cardLocation}>
            <Ionicons name="location-outline" size={14} color="#6B7280" />
            <Text style={styles.cardCity}>{item.city}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{title}</Text>
            <Text style={styles.headerSubtitle}>{listings.length} listings</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={ACCENT} style={styles.loader} />
        ) : (
          <FlatList
            data={listings}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => loadListings(true)} tintColor={ACCENT} />
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="home-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No listings found</Text>
                <Text style={styles.emptySubtitle}>Check back later for new properties</Text>
              </View>
            }
          />
        )}
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
  loader: { marginTop: 60 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  cardImage: { width: '100%', height: 160 },
  cardImagePlaceholder: { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: 14 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  cardPrice: { fontSize: 16, fontWeight: '700', color: ACCENT, marginTop: 6 },
  cardLocation: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  cardCity: { fontSize: 13, color: '#6B7280' },
  empty: { alignItems: 'center', marginTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 12 },
  emptySubtitle: { fontSize: 14, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },
});
