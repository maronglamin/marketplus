import React, { useCallback, useMemo, useState } from 'react';
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
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { RealEstateStackParamList } from '../../navigation/RealEstateNavigator';
import { goToSectionRoot } from '../../navigation/sectionNavigation';
import { realEstateApi, type PropertyListing, type PropertyBooking, type PropertyInquiry } from '../../services/realEstateApi';
import { getImageUrl } from '../../config/env';
import { useApprovalRedirect } from '../../hooks/useApprovalRedirect';

const ACCENT = '#7C3AED';
const { width: screenWidth } = Dimensions.get('window');

type Nav = NativeStackNavigationProp<RealEstateStackParamList, 'ManageListings'>;
type Tab = 'overview' | 'listings' | 'bookings';

const formatPrice = (price: number, currency: string) => {
  const symbol = currency === 'GMD' ? 'D' : currency === 'USD' ? '$' : currency;
  return `${symbol}${Number(price).toLocaleString()}`;
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#059669',
  PENDING_SETUP: '#D97706',
  PENDING_REVIEW: '#D97706',
  INACTIVE: '#6B7280',
  SOLD: '#3B82F6',
  RENTED: '#7C3AED',
};

export function ManageListings() {
  const navigation = useNavigation<Nav>();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [bookings, setBookings] = useState<PropertyBooking[]>([]);
  const [inquiries, setInquiries] = useState<PropertyInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isApprovedAgent, setIsApprovedAgent] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  const [agentName, setAgentName] = useState('');

  const checkAgentStatus = useCallback(async () => {
    try {
      const data = await realEstateApi.getMyApplication();
      const approved = !!data?.agent || data?.application?.status === 'APPROVED';
      setIsApprovedAgent(approved);
      setApplicationStatus(data?.application?.status ?? null);
      setAgentName(data?.agent?.displayName || data?.application?.firstName || '');
      return approved;
    } catch {
      setIsApprovedAgent(false);
      return false;
    }
  }, []);

  const loadListings = useCallback(async (isRefresh = false) => {
    const approved = await checkAgentStatus();
    if (!approved) {
      setListings([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const data = await realEstateApi.getMyListings();
      setListings(data);
      try {
        const inbox = await realEstateApi.getAgentInbox();
        setBookings(inbox.bookings ?? []);
        setInquiries(inbox.inquiries ?? []);
      } catch {
        setBookings([]);
        setInquiries([]);
      }
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [checkAgentStatus]);

  useFocusEffect(
    useCallback(() => {
      loadListings();
    }, [loadListings]),
  );

  useApprovalRedirect({
    enabled: applicationStatus === 'PENDING' && !isApprovedAgent,
    checkApproval: async () => {
      const data = await realEstateApi.getMyApplication();
      if (data?.agent || data?.application?.status === 'APPROVED') {
        setIsApprovedAgent(true);
        setApplicationStatus('APPROVED');
        setAgentName(data.agent.displayName || '');
        await loadListings(true);
        return { isApproved: true };
      }
      return { isApproved: false };
    },
    onApproved: () => loadListings(true),
    title: 'Application Approved',
    message: 'Your property agent application was approved. Your dashboard is ready.',
  });

  const stats = useMemo(() => ({
    total: listings.length,
    active: listings.filter((l) => l.status === 'ACTIVE').length,
    pending: listings.filter((l) => l.status === 'PENDING_REVIEW' || l.status === 'PENDING_SETUP').length,
    stay: listings.filter((l) => l.listingType === 'HOTEL' || l.listingType === 'APARTMENT_RENTAL').length,
    bookings: bookings.length,
  }), [listings, bookings]);

  const handlePublish = async (listingId: string, title: string) => {
    try {
      await realEstateApi.publishListing(listingId);
      Alert.alert('Published', `"${title}" is now live and visible to guests.`);
      await loadListings(true);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to publish listing.');
    }
  };

  const renderItem = ({ item }: { item: PropertyListing }) => {
    const imageUrl = item.images[0]?.url ? getImageUrl(item.images[0].url) : null;
    const statusColor = STATUS_COLORS[item.status] || '#6B7280';
    const needsSetup = item.status === 'PENDING_SETUP';
    const needsPublish = item.status === 'PENDING_REVIEW';
    const isStay = item.listingType === 'HOTEL' || item.listingType === 'APARTMENT_RENTAL';
    const statusLabel = needsSetup ? 'Needs setup' : needsPublish ? 'Ready to publish' : item.status;

    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardPressable}
          activeOpacity={0.85}
          onPress={() => {
            if (needsSetup || (needsPublish && isStay)) {
              navigation.navigate('ListingSetup', { listingId: item.id, listingTitle: item.title });
            } else {
              navigation.navigate('PropertyDetail', { listingId: item.id });
            }
          }}
        >
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.cardImage} resizeMode="cover" />
          ) : (
            <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
              <Ionicons name="image-outline" size={28} color="#9CA3AF" />
            </View>
          )}
          <View style={styles.cardBody}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
              <View style={[styles.statusBadge, { backgroundColor: `${needsSetup || needsPublish ? '#D97706' : statusColor}18` }]}>
                <Text style={[styles.statusText, { color: needsSetup || needsPublish ? '#D97706' : statusColor }]}>
                  {statusLabel}
                </Text>
              </View>
            </View>
            <Text style={styles.cardPrice}>{formatPrice(item.price, item.currency)}</Text>
            <Text style={styles.cardCity}>{item.city} · {item.listingType.replace('_', ' ')}</Text>
          </View>
        </TouchableOpacity>
        {needsPublish && (
          <TouchableOpacity
            style={styles.publishChip}
            onPress={() => handlePublish(item.id, item.title)}
          >
            <Text style={styles.publishChipText}>Publish now</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loadingText}>Loading your dashboard…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isApprovedAgent) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => goToSectionRoot(navigation, 'RealEstateHub')}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.title}>Property Agent</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.pendingContainer}>
          <View style={styles.pendingIconWrap}>
            <Ionicons name="time-outline" size={64} color="#D97706" />
          </View>
          <Text style={styles.pendingTitle}>
            {applicationStatus === 'PENDING' ? 'Application Pending Review' : 'Agent Approval Required'}
          </Text>
          <Text style={styles.pendingSubtitle}>
            {applicationStatus === 'PENDING'
              ? 'We are reviewing your application. You will be redirected automatically when approved.'
              : 'Complete your property agent application to start listing properties.'}
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('BecomePropertyAgent')}
          >
            <Text style={styles.primaryButtonText}>View Application</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => goToSectionRoot(navigation, 'RealEstateHub')}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Property Agent Dashboard</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => goToSectionRoot(navigation, 'RealEstateHub')}>
          <Ionicons name="home-outline" size={22} color="#111827" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        {(['overview', 'listings', 'bookings'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'overview' ? 'Overview' : tab === 'listings' ? 'Listings' : 'Bookings'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadListings(true)} tintColor={ACCENT} />
        }
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Welcome back{agentName ? `, ${agentName.split(' ')[0]}` : ''}</Text>
          <Text style={styles.heroSubtitle}>Manage listings, rooms, and reservations</Text>
          <View style={styles.heroMeta}>
            <Ionicons name="star" size={16} color="#FCD34D" />
            <Text style={styles.heroMetaText}>Property Agent</Text>
          </View>
        </View>

        {activeTab === 'overview' && (
          <>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Listings</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.active}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Needs Setup</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.bookings}</Text>
            <Text style={styles.statLabel}>Reservations</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('ListProperty')}>
            <Ionicons name="add-circle-outline" size={22} color={ACCENT} />
            <Text style={styles.actionButtonText}>List Property</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => setActiveTab('bookings')}>
            <Ionicons name="calendar-outline" size={22} color={ACCENT} />
            <Text style={styles.actionButtonText}>View Bookings</Text>
          </TouchableOpacity>
        </View>
          </>
        )}

        {activeTab === 'listings' && (
          <>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Listings</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ListProperty')}>
            <Ionicons name="add-circle" size={24} color={ACCENT} />
          </TouchableOpacity>
        </View>

        {listings.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="home-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No listings yet</Text>
            <Text style={styles.emptySubtitle}>List your first property. For hotels, add room types from your dashboard after creating the listing.</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('ListProperty')}>
              <Text style={styles.primaryButtonText}>List Property</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.listSection}>
            {listings.map((item) => (
              <View key={item.id}>{renderItem({ item })}</View>
            ))}
          </View>
        )}
          </>
        )}

        {activeTab === 'bookings' && (
          <>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Reservations</Text>
          <Text style={styles.sectionCount}>{bookings.length}</Text>
        </View>
        {bookings.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No reservations yet</Text>
          </View>
        ) : (
          bookings.map((b) => (
            <View key={b.id} style={styles.bookingCard}>
              <Text style={styles.bookingTitle}>{b.listing?.title ?? 'Stay'}</Text>
              <Text style={styles.bookingMeta}>{b.bookingRef} · {b.status}</Text>
              <Text style={styles.bookingMeta}>
                {new Date(b.checkIn).toLocaleDateString()} – {new Date(b.checkOut).toLocaleDateString()}
              </Text>
              <Text style={styles.bookingPrice}>{formatPrice(b.totalPrice, b.currency)}</Text>
            </View>
          ))
        )}

        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>Inquiries</Text>
          <Text style={styles.sectionCount}>{inquiries.length}</Text>
        </View>
        {inquiries.length === 0 ? (
          <Text style={styles.emptySubtitle}>No sales inquiries yet.</Text>
        ) : (
          inquiries.map((inq) => (
            <View key={inq.id} style={styles.bookingCard}>
              <Text style={styles.bookingTitle}>{inq.listing?.title ?? 'Property'}</Text>
              <Text style={styles.bookingMeta} numberOfLines={2}>{inq.message}</Text>
              <Text style={styles.bookingMeta}>{inq.status}</Text>
            </View>
          ))
        )}
          </>
        )}

        {activeTab === 'overview' && listings.length > 0 && (
          <>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Listings</Text>
          <TouchableOpacity onPress={() => setActiveTab('listings')}>
            <Text style={{ color: ACCENT, fontWeight: '600' }}>See all</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.listSection}>
          {listings.slice(0, 3).map((item) => (
            <View key={item.id}>{renderItem({ item })}</View>
          ))}
        </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 15, color: '#6B7280' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: { padding: 4, width: 36 },
  headerSpacer: { width: 36 },
  title: { fontSize: 18, fontWeight: '600', color: '#111827', flex: 1, textAlign: 'center' },
  content: { flex: 1 },
  heroCard: {
    margin: 16,
    padding: 20,
    backgroundColor: ACCENT,
    borderRadius: 12,
    maxWidth: Math.min(900, screenWidth - 32),
    alignSelf: 'center',
    width: '100%',
  },
  heroTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 6 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  heroMetaText: { fontSize: 14, color: '#FFFFFF', fontWeight: '600' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
    maxWidth: Math.min(900, screenWidth - 32),
    alignSelf: 'center',
    width: '100%',
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statValue: { fontSize: 24, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    maxWidth: Math.min(900, screenWidth - 32),
    alignSelf: 'center',
    width: '100%',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    backgroundColor: '#F5F3FF',
  },
  actionButtonText: { fontSize: 14, fontWeight: '600', color: ACCENT },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  sectionCount: { fontSize: 13, color: '#6B7280' },
  listSection: { paddingHorizontal: 16, paddingBottom: 24 },
  card: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  cardPressable: { flexDirection: 'row' },
  cardImage: { width: 100, height: 100 },
  cardImagePlaceholder: { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, padding: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1F2937' },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: '600' },
  cardPrice: { fontSize: 15, fontWeight: '700', color: ACCENT, marginTop: 6 },
  cardCity: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  publishChip: { marginHorizontal: 12, marginBottom: 12, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: ACCENT, borderRadius: 8, alignItems: 'center' },
  publishChipText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
  empty: { alignItems: 'center', marginTop: 24, marginBottom: 40, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 12 },
  emptySubtitle: { fontSize: 14, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },
  pendingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  pendingIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  pendingTitle: { fontSize: 20, fontWeight: '600', color: '#111827', textAlign: 'center' },
  pendingSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 8, textAlign: 'center', lineHeight: 20 },
  primaryButton: {
    marginTop: 24,
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  primaryButtonText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingHorizontal: 8 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: ACCENT },
  tabText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  tabTextActive: { color: ACCENT, fontWeight: '600' },
  bookingCard: { marginHorizontal: 16, marginBottom: 10, padding: 14, backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  bookingTitle: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  bookingMeta: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  bookingPrice: { fontSize: 15, fontWeight: '700', color: ACCENT, marginTop: 6 },
});
