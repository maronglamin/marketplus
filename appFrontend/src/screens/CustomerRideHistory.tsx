import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { AppStackParamList } from '../navigation/AppNavigator';
import { RideRequestService, CustomerRideHistory as RideHistoryItem } from '../services/rideRequestService';

type CustomerRideHistoryNavigationProp = NativeStackNavigationProp<AppStackParamList, 'CustomerRideHistory'>;

export function CustomerRideHistory() {
  const navigation = useNavigation<CustomerRideHistoryNavigationProp>();
  const [rides, setRides] = useState<RideHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [totalSpent, setTotalSpent] = useState(0);

  const statusOptions = [
    { value: 'ALL', label: 'All Rides' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
  ];

  useEffect(() => {
    loadRideHistory();
  }, [selectedStatus]);

  const loadRideHistory = async (refresh: boolean = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
        setPage(1);
      } else if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const currentPage = refresh ? 1 : page;
      const result = await RideRequestService.getCustomerRideHistory(currentPage, 20, selectedStatus === 'ALL' ? undefined : selectedStatus);
      
      if (refresh || currentPage === 1) {
        setRides(result.rides);
        setPage(1);
      } else {
        setRides(prev => [...prev, ...result.rides]);
      }
      
      setHasMore(currentPage < result.pagination.totalPages);
      
      // Calculate total spent
      const total = result.rides.reduce((sum, ride) => {
        if (ride.status === 'COMPLETED') {
          return sum + ride.totalFare;
        }
        return sum;
      }, 0);
      setTotalSpent(total);
      
    } catch (error) {
      console.error('Error loading ride history:', error);
      Alert.alert('Error', 'Failed to load ride history. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      setPage(prev => prev + 1);
      loadRideHistory();
    }
  };

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const formatCurrency = (amount: number, currency: string, symbol: string) => {
    return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const formatDistance = (distance: number) => {
    return distance.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return '#10B981';
      case 'CANCELLED':
        return '#EF4444';
      case 'IN_PROGRESS':
        return '#3B82F6';
      case 'REQUESTED':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'checkmark-circle';
      case 'CANCELLED':
        return 'close-circle';
      case 'IN_PROGRESS':
        return 'car';
      case 'REQUESTED':
        return 'time';
      default:
        return 'help-circle';
    }
  };

  const renderRideCard = (ride: RideHistoryItem) => (
    <View key={ride.id} style={styles.rideCard}>
      <View style={styles.rideHeader}>
        <View style={styles.rideInfo}>
          <View style={styles.rideIdContainer}>
            <Ionicons name="car-outline" size={16} color="#0EA5E9" />
            <Text style={styles.rideId} numberOfLines={1}>Ride #{ride.requestId}</Text>
          </View>
          <Text style={styles.rideDate}>{formatDate(ride.createdAt)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(ride.status)}15` }]}>
          <Ionicons name={getStatusIcon(ride.status) as any} size={14} color={getStatusColor(ride.status)} />
          <Text style={[styles.statusText, { color: getStatusColor(ride.status) }]}>
            {ride.status.replace('_', ' ')}
          </Text>
        </View>
      </View>

      <View style={styles.routeContainer}>
        <View style={styles.routePoint}>
          <View style={styles.pickupIcon}>
            <Ionicons name="location" size={14} color="#FFFFFF" />
          </View>
          <View style={styles.routeInfo}>
            <Text style={styles.routeLabel}>Pickup</Text>
            <Text style={styles.routeAddress} numberOfLines={1}>
              {ride.pickupLocation.address || `${ride.pickupLocation.latitude.toFixed(4)}, ${ride.pickupLocation.longitude.toFixed(4)}`}
            </Text>
          </View>
        </View>

        <View style={styles.routeLine} />

        <View style={styles.routePoint}>
          <View style={styles.destinationIcon}>
            <Ionicons name="location" size={14} color="#FFFFFF" />
          </View>
          <View style={styles.routeInfo}>
            <Text style={styles.routeLabel}>Destination</Text>
            <Text style={styles.routeAddress} numberOfLines={1}>
              {ride.destinationLocation.address || `${ride.destinationLocation.latitude.toFixed(4)}, ${ride.destinationLocation.longitude.toFixed(4)}`}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.rideDetails}>
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Ionicons name="person-outline" size={16} color="#6B7280" />
            <Text style={styles.detailText} numberOfLines={1}>{ride.driverName}</Text>
          </View>
          {ride.distance && (
            <View style={styles.detailItem}>
              <Ionicons name="map-outline" size={16} color="#6B7280" />
              <Text style={styles.detailText}>{formatDistance(ride.distance)} km</Text>
            </View>
          )}
          {ride.duration && (
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={16} color="#6B7280" />
              <Text style={styles.detailText}>{ride.duration} mins</Text>
            </View>
          )}
        </View>

        <View style={styles.priceContainer}>
          <Text style={styles.priceAmount}>
            {formatCurrency(ride.totalFare, ride.currency, ride.currencySymbol)}
          </Text>
        </View>

        {ride.customerRating && (
          <View style={styles.ratingContainer}>
            <View style={styles.ratingContent}>
              {ride.customerReview ? (
                <Text style={styles.reviewText}>{ride.customerReview}</Text>
              ) : (
                <Text style={styles.ratingLabel}>Your Rating</Text>
              )}
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= (ride.customerRating || 0) ? 'star' : 'star-outline'}
                    size={18}
                    color={star <= (ride.customerRating || 0) ? '#F59E0B' : '#D1D5DB'}
                  />
                ))}
              </View>
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingText}>{ride.customerRating}/5</Text>
              </View>
            </View>
          </View>
        )}

        {ride.customerNotes && (
          <View style={styles.notesContainer}>
            <Ionicons name="chatbubble-outline" size={14} color="#6B7280" />
            <Text style={styles.notesText} numberOfLines={2}>{ride.customerNotes}</Text>
          </View>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0EA5E9" />
        <Text style={styles.loadingText}>Loading your ride history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Ride History</Text>
            <View style={styles.headerStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatNumber(rides.length)}</Text>
                <Text style={styles.statLabel}>Total Rides</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatCurrency(totalSpent, 'GMD', 'D')}</Text>
                <Text style={styles.statLabel}>Total Spent</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Status Filter */}
        <View style={styles.filterContainer}>
          <Text style={styles.filterTitle}>Filter by Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
            {statusOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.filterButton,
                  selectedStatus === option.value && styles.filterButtonActive
                ]}
                onPress={() => handleStatusChange(option.value)}
              >
                <Ionicons 
                  name={getStatusIcon(option.value)} 
                  size={16} 
                  color={selectedStatus === option.value ? '#FFFFFF' : '#6B7280'} 
                />
                <Text style={[
                  styles.filterButtonText,
                  selectedStatus === option.value && styles.filterButtonTextActive
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Ride List */}
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadRideHistory(true)}
              colors={['#0EA5E9']}
              tintColor="#0EA5E9"
            />
          }
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
            if (isCloseToBottom && hasMore && !loadingMore) {
              loadMore();
            }
          }}
          scrollEventThrottle={400}
        >
          {rides.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="car-outline" size={64} color="#9CA3AF" />
              <Text style={styles.emptyStateTitle}>No rides found</Text>
              <Text style={styles.emptyStateSubtitle}>
                {selectedStatus === 'ALL' 
                  ? "You haven't taken any rides yet. Book your first ride to get started!"
                  : `No ${selectedStatus.toLowerCase().replace('_', ' ')} rides found.`
                }
              </Text>
              <TouchableOpacity
                style={styles.bookRideButton}
                onPress={() => navigation.navigate('RideRequest')}
              >
                <Text style={styles.bookRideButtonText}>Book a Ride</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {rides.map(renderRideCard)}
              {loadingMore && (
                <View style={styles.loadingMoreContainer}>
                  <ActivityIndicator size="small" color="#0EA5E9" />
                  <Text style={styles.loadingMoreText}>Loading more rides...</Text>
                </View>
              )}
              {!hasMore && rides.length > 0 && (
                <View style={styles.endOfDataContainer}>
                  <Text style={styles.endOfDataText}>You've reached the end of your ride history</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0EA5E9',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  filterScrollView: {
    flexGrow: 0,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: '#0EA5E9',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  bookRideButton: {
    backgroundColor: '#0EA5E9',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginTop: 20,
  },
  bookRideButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  rideCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  rideInfo: {
    flex: 1,
    marginRight: 12,
  },
  rideId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  rideIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rideDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexShrink: 0,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  routeContainer: {
    marginBottom: 12,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  pickupIcon: {
    width: 24,
    height: 24,
    backgroundColor: '#E6F3FF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  destinationIcon: {
    width: 24,
    height: 24,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  routeInfo: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  routeAddress: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  routeLine: {
    width: 1,
    height: 20,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 12,
    marginVertical: 4,
  },
  rideDetails: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  priceInfo: {
    flex: 1,
  },
  rideDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F0F9FF',
    gap: 4,
  },
  rideDetailsButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0EA5E9',
  },

  priceAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0EA5E9',
  },
  ratingContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  ratingContent: {
    alignItems: 'center',
    gap: 8,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  reviewText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
  },
  notesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  loadingMoreText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
  },
  endOfDataContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  endOfDataText: {
    fontSize: 12,
    color: '#6B7280',
  },
});
