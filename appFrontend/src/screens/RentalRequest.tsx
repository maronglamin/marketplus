import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { rentalApi } from '../services/rentalApi';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/AppNavigator';

const STATUS_TABS = ['ALL','PENDING_QUOTE','QUOTED','ACCEPTED','REJECTED','CANCELLED'] as const;

export default function RentalRequestScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [isLoading, setIsLoading] = useState(false);
  const [rentals, setRentals] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 10;
  const [status, setStatus] = useState<typeof STATUS_TABS[number]>('ALL');
  const [userLoading, setUserLoading] = useState(true);
  const getStatusIcon = (s: string) => {
    switch (s) {
      case 'PENDING_QUOTE':
        return 'time' as const;
      case 'QUOTED':
        return 'pricetag' as const;
      case 'ACCEPTED':
        return 'checkmark-circle' as const;
      case 'REJECTED':
        return 'close-circle' as const;
      case 'CANCELLED':
        return 'close' as const;
      case 'ALL':
      default:
        return 'albums' as const;
    }
  };

  useEffect(() => {
    console.log('RentalRequest: User state changed:', { hasUser: !!user, userId: user?.id });
    
    if (user?.id) {
      setUserLoading(false);
      // reset for new status filter
      setPage(1);
      setRentals([]);
      setHasMore(true);
      load(1, true);
    } else if (user === null) {
      // User is explicitly null (not loading)
      setUserLoading(false);
    }
    // If user is undefined, keep userLoading as true (still loading)
  }, [user?.id, status]);

  const load = async (nextPage: number = 1, replace: boolean = false) => {
    try {
      setIsLoading(true);
      
      if (!user?.id) {
        console.error('User not authenticated or ID not available');
        setRentals([]);
        return;
      }
      
      console.log('RentalRequest: Loading rentals for user:', user.id, 'page:', nextPage, 'status:', status);
      const data = await rentalApi.getMyRentals(user.id, status, nextPage, PAGE_SIZE);
      console.log('RentalRequest: Loaded rentals page:', data?.page, 'items:', data?.items?.length || 0, 'hasMore:', data?.hasMore);
      setHasMore(Boolean(data?.hasMore));
      setPage(nextPage);
      setRentals(prev => replace ? (data?.items || []) : [...prev, ...(data?.items || [])]);
    } catch (e) {
      console.error('Failed to load rentals', e);
      setRentals([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconBtn}>
          <Ionicons name="arrow-back" size={22} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.title}>My Rentals</Text>
        <TouchableOpacity onPress={() => load(1, true)} style={styles.headerIconBtn}>
          <Ionicons name="refresh" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow} style={styles.filtersContainer}>
        {STATUS_TABS.map((tab) => (
          <TouchableOpacity key={tab} style={[styles.filterChip, status===tab && styles.filterChipActive]} onPress={() => setStatus(tab)} activeOpacity={0.85}>
            <View style={styles.filterChipContent}>
              <Ionicons name={getStatusIcon(tab) as any} size={13} color={status===tab ? '#0369A1' : '#64748B'} />
              <Text style={[styles.filterText, status===tab && styles.filterTextActive]}>{tab.replace('_',' ')}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {userLoading ? (
        <View style={styles.loading}> 
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading user information...</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.loading}> 
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading rentals...</Text>
        </View>
      ) : !user?.id ? (
        <View style={styles.empty}> 
          <Ionicons name="person-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>Authentication Required</Text>
          <Text style={styles.emptyText}>Please login to view your rental requests</Text>
        </View>
      ) : rentals.length === 0 ? (
        <View style={styles.empty}> 
          <Ionicons name="car-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No rental requests yet</Text>
          <Text style={styles.emptyText}>Your rental requests will appear here</Text>
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}
          onScroll={({ nativeEvent }) => {
            const paddingToBottom = 200;
            const reachedEnd = nativeEvent.layoutMeasurement.height + nativeEvent.contentOffset.y >= nativeEvent.contentSize.height - paddingToBottom;
            if (reachedEnd && !isLoading && hasMore) {
              load(page + 1);
            }
          }}
          scrollEventThrottle={200}
        >
          {rentals.map((rental) => (
            <TouchableOpacity key={rental.id} style={styles.card} onPress={() => navigation.navigate('RentalDetail', { rentalId: rental.id })}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={1}>{rental.rideService?.name || 'Rental Service'}</Text>
                <View style={[styles.statusBadge, statusColors[rental.status] || styles.statusDefault]}> 
                  <Text style={[styles.statusText, statusTextColors[rental.status] || styles.statusTextDefault]}>
                    {rental.status.replace('_', ' ')}
                  </Text>
                </View>
              </View>
              {rental.requestId ? (
                <View style={styles.metaRow}>
                  <Ionicons name="pricetag" size={14} color="#6B7280" />
                  <Text style={styles.metaText} numberOfLines={1}>ID: {rental.requestId}</Text>
                </View>
              ) : null}
              <View style={styles.divider} />
              <View style={styles.cardRow}>
                <Ionicons name="location" size={16} color="#6B7280" />
                <Text style={styles.cardValue} numberOfLines={2}>{rental.pickupAddress}</Text>
              </View>
              {rental.driver?.user ? (
                <>
                  <View style={styles.cardRow}>
                    <Ionicons name="person" size={16} color="#6B7280" />
                    <Text style={styles.cardValue} numberOfLines={1}>
                      Asset owner: {rental.driver.user.firstName} {rental.driver.user.lastName}
                    </Text>
                  </View>
                  {rental.driver.user.phoneNumber ? (
                    <View style={styles.cardRow}>
                      <Ionicons name="call" size={16} color="#6B7280" />
                      <Text style={styles.cardValue} numberOfLines={1}>
                        {rental.driver.user.phoneNumber}
                      </Text>
                    </View>
                  ) : null}
                </>
              ) : null}
              <View style={styles.cardRow}>
                <Ionicons name="calendar" size={16} color="#6B7280" />
                <Text style={styles.cardValue}>
                  {new Date(rental.startDate).toDateString()} → {new Date(rental.endDate).toDateString()} ({rental.days} days)
                </Text>
              </View>
              <View style={styles.cardFooterRow}>
                <View style={styles.currencyPill}>
                  <Ionicons name="cash" size={14} color="#0369A1" />
                  <Text style={styles.currencyText}>{rental.rideService?.currencySymbol} · {rental.rideService?.currency}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          ))}
          {isLoading && hasMore && (
            <View style={[styles.loading, { paddingVertical: 20 }]}>
              <ActivityIndicator size="small" color="#3B82F6" />
              <Text style={styles.loadingText}>Loading more...</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const statusColors: any = {
  PENDING_QUOTE: { backgroundColor: '#FEF3C7' },
  QUOTED: { backgroundColor: '#DBEAFE' },
  ACCEPTED: { backgroundColor: '#DCFCE7' },
  REJECTED: { backgroundColor: '#FEE2E2' },
  CANCELLED: { backgroundColor: '#F3F4F6' },
};

const statusTextColors: any = {
  PENDING_QUOTE: { color: '#92400E' },
  QUOTED: { color: '#1E40AF' },
  ACCEPTED: { color: '#166534' },
  REJECTED: { color: '#991B1B' },
  CANCELLED: { color: '#374151' },
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerIconBtn: { padding: 8 },
  title: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  loading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16 },
  loadingText: { marginLeft: 8, color: '#6B7280' },
  filtersContainer: { backgroundColor: '#FFFFFF', flexGrow: 0, paddingVertical: 10, marginVertical: 10 },
  filtersRow: { paddingHorizontal: 8, paddingVertical: 2, alignItems: 'center' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 18, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', marginRight: 6, alignItems: 'center', justifyContent: 'center' },
  filterChipActive: { backgroundColor: '#E0F2FE', borderColor: '#BAE6FD' },
  filterChipContent: { flexDirection: 'row', alignItems: 'center' },
  filterText: { marginLeft: 6, fontSize: 12, lineHeight: 14, color: '#475569', fontWeight: '500', letterSpacing: 0.2 },
  filterTextActive: { color: '#0369A1', fontWeight: '600' },
  empty: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 12 },
  emptyText: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 12 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  metaText: { marginLeft: 6, fontSize: 11, color: '#6B7280' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  statusBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontSize: 12, fontWeight: '600' },
  statusDefault: { backgroundColor: '#F3F4F6' },
  statusTextDefault: { color: '#6B7280' },
  cardRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  cardValue: { marginLeft: 6, color: '#374151', flexShrink: 1 },
  cardFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  currencyPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0F2FE', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  currencyText: { marginLeft: 6, fontSize: 12, color: '#0369A1', fontWeight: '600' },
});


