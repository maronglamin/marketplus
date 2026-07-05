import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { HomeServicesStackParamList } from '../../navigation/HomeServicesNavigator';
import { homeServicesApi, type ServiceBooking } from '../../services/homeServicesApi';
import { useRequireAuth } from '../../hooks/useRequireAuth';

type Nav = NativeStackNavigationProp<HomeServicesStackParamList, 'MyServiceBookings'>;

const STATUS_COLORS: Record<string, string> = {
  PENDING_QUOTE: '#F59E0B',
  QUOTED: '#0EA5E9',
  ACCEPTED: '#10B981',
  PAID: '#059669',
  COMPLETED: '#6366F1',
  REJECTED: '#EF4444',
  CANCELLED: '#6B7280',
};

function formatStatus(status: string) {
  return status.replace(/_/g, ' ');
}

export function MyServiceBookings() {
  const navigation = useNavigation<Nav>();
  const { isLoading: authLoading, isAuthenticated, promptLogin } = useRequireAuth(
    'Login to view your service bookings.',
  );
  const [bookings, setBookings] = useState<ServiceBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBookings = useCallback(async (isRefresh = false) => {
    if (!isAuthenticated) {
      setBookings([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const data = await homeServicesApi.getMyBookings();
      setBookings(data);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      promptLogin('Login to view your service bookings.', {
        onCancel: () => navigation.goBack(),
      });
    }
  }, [authLoading, isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        loadBookings();
      }
    }, [loadBookings, isAuthenticated]),
  );

  const renderBooking = ({ item }: { item: ServiceBooking }) => (
    <TouchableOpacity
      style={styles.bookingCard}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('ServiceBookingDetail', { bookingId: item.id })}
    >
      <View style={styles.bookingHeader}>
        <Text style={styles.bookingRef}>{item.bookingRef}</Text>
        <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLORS[item.status] || '#6B7280'}20` }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] || '#6B7280' }]}>
            {formatStatus(item.status)}
          </Text>
        </View>
      </View>
      <Text style={styles.categoryName}>{item.category?.name}</Text>
      {item.provider?.displayName ? (
        <Text style={styles.providerName}>{item.provider.displayName}</Text>
      ) : null}
      <View style={styles.addressRow}>
        <Ionicons name="location-outline" size={14} color="#6B7280" />
        <Text style={styles.addressText} numberOfLines={1}>{item.serviceAddress}</Text>
      </View>
      {(item.agreedPrice ?? item.proposedPrice) != null && (
        <Text style={styles.priceText}>
          {item.currency} {(item.agreedPrice ?? item.proposedPrice)?.toLocaleString()}
        </Text>
      )}
    </TouchableOpacity>
  );

  if (authLoading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <ActivityIndicator size="large" color="#0EA5E9" style={styles.loader} />
        </SafeAreaView>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>My Service Bookings</Text>
            </View>
          </View>
          <View style={styles.loginPrompt}>
            <Ionicons name="lock-closed-outline" size={48} color="#D1D5DB" />
            <Text style={styles.loginPromptTitle}>Login required</Text>
            <Text style={styles.loginPromptSubtitle}>Sign in to view your service bookings.</Text>
            <TouchableOpacity style={styles.loginButton} onPress={() => promptLogin()}>
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>My Service Bookings</Text>
            <Text style={styles.headerSubtitle}>Track your service requests</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#0EA5E9" style={styles.loader} />
        ) : bookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No bookings yet</Text>
            <Text style={styles.emptySubtitle}>Book a service from the Home Services hub</Text>
          </View>
        ) : (
          <FlatList
            data={bookings}
            keyExtractor={(item) => item.id}
            renderItem={renderBooking}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => loadBookings(true)} tintColor="#0EA5E9" />
            }
            showsVerticalScrollIndicator={false}
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
  list: { padding: 16 },
  bookingCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bookingRef: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '600' },
  categoryName: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginTop: 8 },
  providerName: { fontSize: 13, color: '#0EA5E9', marginTop: 4 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  addressText: { fontSize: 13, color: '#6B7280', flex: 1 },
  priceText: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginTop: 8 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 12 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', marginTop: 4, textAlign: 'center' },
  loginPrompt: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loginPromptTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 16 },
  loginPromptSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 8, textAlign: 'center' },
  loginButton: {
    marginTop: 24,
    backgroundColor: '#0EA5E9',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  loginButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});
