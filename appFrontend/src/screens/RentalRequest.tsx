import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, StatusBar, RefreshControl, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { rentalApi } from '../services/rentalApi';
import { getAuthToken } from '../api/auth';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/AppNavigator';
import { api } from '../api/api';
import { StripePayment } from '../components/StripePayment';
import { PaymentMethodSelector } from '../components/PaymentMethodSelector';
import * as Haptics from 'expo-haptics';

const STATUS_TABS = ['ALL','PENDING_QUOTE','QUOTED','ACCEPTED','PAID','REJECTED','CANCELLED'] as const;

// Currency symbol mapping
const getCurrencySymbol = (currencyCode?: string): string => {
  const currencySymbolMap: Record<string, string> = {
    USD: '$', EUR: '€', GBP: '£', JPY: '¥', CAD: 'C$', AUD: 'A$', CHF: 'CHF',
    CNY: '¥', INR: '₹', BRL: 'R$', MXN: '$', KRW: '₩', SGD: 'S$', HKD: 'HK$', NZD: 'NZ$',
    GMD: 'D'
  };
  return currencySymbolMap[currencyCode || ''] || (currencyCode || '$');
};

export default function RentalRequestScreen() {
  const { user, isLoading: authLoading, refreshUser, validateAndRefreshUser } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [isLoading, setIsLoading] = useState(false);
  const [rentals, setRentals] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 10;
  const [status, setStatus] = useState<typeof STATUS_TABS[number]>('ALL');
  const [userLoading, setUserLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showStripePayment, setShowStripePayment] = useState(false);
  
  // Debug effect to log Stripe modal state changes
  useEffect(() => {
    console.log('Stripe modal state changed:', showStripePayment);
  }, [showStripePayment]);
  const [showPaymentMethodSelector, setShowPaymentMethodSelector] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [selectedRentalForPayment, setSelectedRentalForPayment] = useState<any>(null);

  // Validate and refresh user data when component mounts
  useEffect(() => {
    const validateUser = async () => {
      if (!authLoading) {
        console.log('RentalRequest: Component mounted, validating user data...');
        await validateAndRefreshUser();
      }
    };
    validateUser();
  }, [authLoading, validateAndRefreshUser]);

  // Refresh user data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const refreshOnFocus = async () => {
        if (!authLoading && user?.id) {
          console.log('RentalRequest: Screen focused, refreshing user data...');
          await validateAndRefreshUser();
        }
      };
      refreshOnFocus();
    }, [authLoading, user?.id, validateAndRefreshUser])
  );

  const getStatusIcon = (s: string) => {
    switch (s) {
      case 'PENDING_QUOTE':
        return 'time' as const;
      case 'QUOTED':
        return 'pricetag' as const;
      case 'ACCEPTED':
        return 'checkmark-circle' as const;
      case 'PAID':
        return 'card' as const;
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
    console.log('RentalRequest: Auth state changed:', { 
      hasUser: !!user, 
      userId: user?.id,
      authLoading,
      userLoading 
    });
    
    // Wait for auth to finish loading
    if (!authLoading) {
      setUserLoading(false);
      
      if (user?.id) {
        console.log('RentalRequest: User authenticated, loading customer rentals...');
        // reset for new status filter
        setPage(1);
        setRentals([]);
        setHasMore(true);
        setAuthError(null);
        load(1, true);
      } else {
        console.log('RentalRequest: No user authenticated');
        // User is not authenticated
        setAuthError('Please login to view your rental requests');
        setRentals([]);
      }
    }
  }, [user, status, authLoading]); // Changed from user?.id to user to detect all user changes

  const load = async (nextPage: number = 1, replace: boolean = false) => {
    try {
      setIsLoading(true);
      setAuthError(null);
      
      if (!user?.id) {
        console.error('User not authenticated or ID not available');
        // Check if there's a token but no user (invalid token scenario)
        const token = await getAuthToken();
        if (token) {
          console.log('RentalRequest: Token exists but no user - attempting to refresh user data...');
          try {
            await refreshUser();
            // If refreshUser succeeds, the user state will be updated and useEffect will trigger load again
            return;
          } catch (error) {
            console.log('RentalRequest: Failed to refresh user data, token may be invalid');
            setAuthError('Authentication expired. Please login again.');
          }
        } else {
          setAuthError('Please login to view your rental requests');
        }
        setRentals([]);
        return;
      }
      
      console.log('RentalRequest: Loading rentals for user:', user.id, 'page:', nextPage, 'status:', status);
      const data = await rentalApi.getMyRentals(user.id, status, nextPage, PAGE_SIZE);
      console.log('RentalRequest: Loaded rentals page:', data?.page, 'items:', data?.items?.length || 0, 'hasMore:', data?.hasMore);
      
      // Debug: Log the first rental to see the data structure
      if (data?.items?.length > 0) {
        console.log('RentalRequest: Sample rental data:', {
          id: data.items[0].id,
          proposedPrice: data.items[0].proposedPrice,
          agreedPrice: data.items[0].agreedPrice,
          currency: data.items[0].currency,
          rideServiceCurrency: data.items[0].rideService?.currency,
          rideServiceCurrencySymbol: data.items[0].rideService?.currencySymbol,
          proposedPriceType: typeof data.items[0].proposedPrice,
          agreedPriceType: typeof data.items[0].agreedPrice
        });
      }
      setHasMore(Boolean(data?.hasMore));
      setPage(nextPage);
      setRentals(prev => replace ? (data?.items || []) : [...prev, ...(data?.items || [])]);
    } catch (e: any) {
      console.error('Failed to load rentals', e);
      if (e.message?.includes('401') || e.message?.includes('Unauthorized')) {
        console.log('RentalRequest: Unauthorized error - attempting to refresh user data...');
        try {
          await refreshUser();
          // If refreshUser succeeds, retry the load
          load(1, true);
          return;
        } catch (refreshError) {
          console.log('RentalRequest: Failed to refresh user data after unauthorized error');
          setAuthError('Authentication expired. Please login again.');
        }
      } else {
        setAuthError('Failed to load rentals. Please try again.');
      }
      setRentals([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    console.log('RentalRequest: Manual refresh triggered');
    if (user?.id) {
      setPage(1);
      setRentals([]);
      setHasMore(true);
      setAuthError(null);
      load(1, true);
    } else {
      console.log('RentalRequest: Cannot refresh - no user ID');
    }
  };

  // Payment functions
  const handlePaymentMethodSelect = async (paymentMethod: any) => {
    try {
      setProcessingPayment(true);
      
      if (!selectedRentalForPayment) {
        throw new Error('No rental selected for payment');
      }

      // Handle different payment method types
      switch (paymentMethod.type) {
        case 'CREDIT_CARD':
        case 'DEBIT_CARD':
          // Stripe payments are handled separately via onStripePayment
          break;

        case 'MOBILE_MONEY':
        case 'BANK_TRANSFER':
        case 'CRYPTO':
        case 'DIGITAL_WALLET':
          // Call the rental payment endpoint with the selected payment method
          const response = await api.post(`/api/rentals/${selectedRentalForPayment.id}/payment`, {
            paymentMethodId: paymentMethod.id,
            paymentIntentId: null // We'll handle this differently for stored payment methods
          });
          
          if (response.data.success) {
            Alert.alert(
              'Payment Successful!',
              `Your payment of ${getCurrencySymbol(selectedRentalForPayment.currency)} ${selectedRentalForPayment.agreedPrice?.toLocaleString()} has been processed successfully using ${paymentMethod.accountName}.`,
              [
                {
                  text: 'OK',
                  onPress: () => {
                    setShowPaymentMethodSelector(false);
                    setSelectedRentalForPayment(null);
                    // Refresh the rentals list
                    handleRefresh();
                  },
                },
              ]
            );
            
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } else {
            throw new Error('Failed to process payment');
          }
          break;

        default:
          throw new Error(`Unsupported payment method type: ${paymentMethod.type}`);
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      Alert.alert('Payment Failed', 'There was an issue processing your payment. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleStripePaymentSuccess = async (paymentIntentId: string) => {
    try {
      setProcessingPayment(true);
      
      if (!selectedRentalForPayment) {
        throw new Error('No rental selected for payment');
      }

      // Call the rental payment endpoint
      const response = await api.post(`/api/rentals/${selectedRentalForPayment.id}/payment`, {
        paymentMethodId: 'stripe', // For Stripe payments
        paymentIntentId: paymentIntentId
      });
      
      if (response.data.success) {
        Alert.alert(
          'Payment Successful!',
          `Your payment of ${getCurrencySymbol(selectedRentalForPayment.currency)} ${selectedRentalForPayment.agreedPrice?.toLocaleString()} has been processed successfully.`,
          [
            {
              text: 'OK',
              onPress: () => {
                setShowStripePayment(false);
                setSelectedRentalForPayment(null);
                // Refresh the rentals list
                handleRefresh();
              },
            },
          ]
        );
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        throw new Error('Failed to update rental status');
      }
    } catch (error) {
      console.error('Error updating rental after payment:', error);
      Alert.alert('Payment Successful', 'Your payment was processed, but there was an issue updating the rental status.');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handlePaymentError = (error: string) => {
    Alert.alert('Payment Failed', error);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setShowStripePayment(false);
    setSelectedRentalForPayment(null);
  };

  const handlePayRental = (rental: any) => {
    if (!rental.agreedPrice) {
      Alert.alert('Error', 'No agreed price found for this rental request.');
      return;
    }

    setSelectedRentalForPayment(rental);
    setShowPaymentMethodSelector(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconBtn}>
          <Ionicons name="arrow-back" size={22} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.title}>My Rental Requests</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.headerIconBtn}>
          <Ionicons name="refresh" size={20} color="#6B7280" />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => {
            console.log('Test Stripe button pressed from header');
            setShowStripePayment(true);
            setSelectedRentalForPayment({ id: 'test', agreedPrice: 100, currency: 'USD' });
          }} 
          style={styles.headerIconBtn}
        >
          <Ionicons name="card-outline" size={20} color="#EF4444" />
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
      {authLoading || userLoading ? (
        <View style={styles.loading}> 
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading user information...</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.loading}> 
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading rentals...</Text>
        </View>
      ) : authError || !user?.id ? (
        <View style={styles.empty}> 
          <Ionicons name="person-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>Authentication Required</Text>
          <Text style={styles.emptyText}>{authError || 'Please login to view your rental requests'}</Text>


        </View>
      ) : rentals.length === 0 ? (
        <View style={styles.empty}> 
          <Ionicons name="car-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>
            {status === 'ALL' ? 'No rental requests yet' : `No ${status.replace('_', ' ').toLowerCase()} requests`}
          </Text>
          <Text style={styles.emptyText}>
            {status === 'ALL' 
              ? 'Your rental requests will appear here when you make them'
              : `You don't have any ${status.replace('_', ' ').toLowerCase()} rental requests`
            }
          </Text>
          {status !== 'ALL' && (
            <TouchableOpacity onPress={() => setStatus('ALL')} style={styles.clearFilterButton}>
              <Text style={styles.clearFilterButtonText}>View All Requests</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView 
          style={styles.list} 
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading && page === 1}
              onRefresh={handleRefresh}
              colors={['#3B82F6']}
              tintColor="#3B82F6"
            />
          }
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
              {/* Price Information */}
              {rental.proposedPrice && (
                <View style={styles.cardRow}>
                  <Ionicons name="pricetag" size={16} color="#F59E0B" />
                  <Text style={[styles.cardValue, styles.proposedPrice]}>
                    Proposed: {getCurrencySymbol(rental.currency)} {rental.proposedPrice.toLocaleString()}
                  </Text>
                </View>
              )}
              {rental.agreedPrice && (
                <View style={styles.cardRow}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={[styles.cardValue, styles.agreedPrice]}>
                    Agreed: {getCurrencySymbol(rental.currency)} {rental.agreedPrice.toLocaleString()}
                  </Text>
                </View>
              )}
              <View style={styles.cardFooterRow}>
                <View style={styles.currencyPill}>
                  <Ionicons name="cash" size={14} color="#0369A1" />
                  <Text style={styles.currencyText}>
                    {getCurrencySymbol(rental.currency)} · {rental.currency}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </View>
              
              {/* Payment Button for ACCEPTED status */}
              {rental.status === 'ACCEPTED' && rental.agreedPrice && (
                <View style={styles.paymentSection}>
                  <TouchableOpacity
                    style={styles.payButton}
                    onPress={() => handlePayRental(rental)}
                  >
                    <Ionicons name="card-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.payButtonText}>
                      Pay {getCurrencySymbol(rental.currency)} {rental.agreedPrice.toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
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

      {/* Payment Method Selector Modal */}
      {selectedRentalForPayment && (
        <PaymentMethodSelector
          visible={showPaymentMethodSelector}
          onClose={() => {
            setShowPaymentMethodSelector(false);
            setSelectedRentalForPayment(null);
          }}
          onSelectPaymentMethod={handlePaymentMethodSelect}
          onStripePayment={() => {
            console.log('onStripePayment callback triggered');
            setShowPaymentMethodSelector(false);
            setShowStripePayment(true);
            console.log('Stripe modal state set to true');
          }}
          amount={selectedRentalForPayment.agreedPrice || 0}
          currency={selectedRentalForPayment.currency || 'USD'}
          title="Select Payment Method"
        />
      )}

      {/* Stripe Payment Modal */}
      {console.log('Rendering Stripe modal section:', { showStripePayment, selectedRentalForPayment: !!selectedRentalForPayment })}
      {selectedRentalForPayment && (
        <StripePayment
          visible={showStripePayment}
          onClose={() => {
            setShowStripePayment(false);
            setSelectedRentalForPayment(null);
          }}
          amount={selectedRentalForPayment.agreedPrice || 0}
          currency={selectedRentalForPayment.currency || 'USD'}
          orderId={selectedRentalForPayment.id}
          customerId={selectedRentalForPayment.customerId || user?.id || ''}
          onPaymentSuccess={handleStripePaymentSuccess}
          onPaymentError={handlePaymentError}
          userInfo={{
            firstName: user?.firstName || '',
            lastName: user?.lastName || ''
          }}
          transactionType="rental"
        />
      )}
    </SafeAreaView>
  );
}

const statusColors: any = {
  PENDING_QUOTE: { backgroundColor: '#FEF3C7' },
  QUOTED: { backgroundColor: '#DBEAFE' },
  ACCEPTED: { backgroundColor: '#DCFCE7' },
  PAID: { backgroundColor: '#DCFCE7' },
  REJECTED: { backgroundColor: '#FEE2E2' },
  CANCELLED: { backgroundColor: '#F3F4F6' },
};

const statusTextColors: any = {
  PENDING_QUOTE: { color: '#92400E' },
  QUOTED: { color: '#1E40AF' },
  ACCEPTED: { color: '#166534' },
  PAID: { color: '#166534' },
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
  proposedPrice: { color: '#F59E0B', fontWeight: '600' },
  agreedPrice: { color: '#10B981', fontWeight: '600' },
  cardFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  currencyPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0F2FE', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  currencyText: { marginLeft: 6, fontSize: 12, color: '#0369A1', fontWeight: '600' },

  clearFilterButton: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#3B82F6', borderRadius: 8 },
  clearFilterButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  paymentSection: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  payButton: { 
    backgroundColor: '#10B981', 
    paddingVertical: 12, 
    paddingHorizontal: 16, 
    borderRadius: 8, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    gap: 8
  },
  payButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});


