import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { AppStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../contexts/AuthContext';
import { getAuthToken } from '../api/auth';
import { rideServicesApi, type RideServiceConfig } from '../services/rideServicesApi';
import { settlementService, type AvailableRentalEarnings } from '../services/settlementService';

type RentalEarningsNavigationProp = NativeStackNavigationProp<AppStackParamList, 'RentalEarnings'>;

interface EarningsItem {
  id: string;
  date: string;
  amount: number;
  currency: string;
  currencySymbol: string;
  rentals: number;
  status: string;
  createdAt: string;
}

export function RentalEarnings() {
  const navigation = useNavigation<RentalEarningsNavigationProp>();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('TODAY');
  const [earnings, setEarnings] = useState<EarningsItem[]>([]);
  const [availableSettlement, setAvailableSettlement] = useState(0);
  const [availableByCurrency, setAvailableByCurrency] = useState<AvailableRentalEarnings[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('GMD');
  const [selectedCurrencySymbol, setSelectedCurrencySymbol] = useState<string>('D');
  const [otherCurrenciesCount, setOtherCurrenciesCount] = useState<number>(0);

  const periodOptions = [
    { value: 'TODAY', label: 'Today', color: '#3B82F6' },
    { value: 'WEEK', label: 'This Week', color: '#10B981' },
    { value: 'MONTH', label: 'This Month', color: '#F59E0B' },
    { value: 'ALL', label: 'All Time', color: '#8B5CF6' },
  ];

  useEffect(() => {
    loadEarningsData();
  }, [selectedPeriod]);

  const getPeriodStartDate = (period: string): Date => {
    const now = new Date();
    switch (period) {
      case 'TODAY':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case 'WEEK':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'MONTH':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'ALL':
      default:
        return new Date(0);
    }
  };

  const loadEarningsData = async () => {
    try {
      setLoading(true);
      setHasError(false);
      setEarnings([]);
      setAvailableSettlement(0);

      const token = await getAuthToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/rentals/driver/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load rentals (${response.status})`);
      }

      const data = await response.json();
      const rentals: any[] = data?.data || [];

      // Filter by period and only include rentals considered paid
      const startDate = getPeriodStartDate(selectedPeriod);
      const paidRentals = rentals.filter((r) => {
        const createdAt = new Date(r.createdAt);
        const status = (r.status || '').toUpperCase();
        return createdAt >= startDate && (status === 'PAID' || status === 'ACCEPTED'); // include ACCEPTED as near-real earnings
      });

      // Fetch service configs to compute owner payable (exclude service fees). Cache per serviceId.
      const uniqueServiceIds = Array.from(
        new Set(
          paidRentals
            .map((r) => r.rideService?.id)
            .filter((id: any) => typeof id === 'string' && id.length > 0)
        )
      );
      const serviceConfigMap = new Map<string, RideServiceConfig | null>();
      await Promise.all(
        uniqueServiceIds.map(async (sid) => {
          try {
            const cfg = await rideServicesApi.getServiceById(sid);
            serviceConfigMap.set(sid, cfg);
          } catch {
            serviceConfigMap.set(sid, null);
          }
        })
      );

      // Helper to compute net payable to owner using driverEarningsPercentage when available
      const computeOwnerPayable = (r: any): number => {
        const gross = Number(r.agreedPrice || r.proposedPrice || 0) || 0;
        const serviceId = r.rideService?.id;
        const cfg = serviceId ? serviceConfigMap.get(serviceId) : null;
        if (cfg && cfg.driverEarningsPercentage) {
          const pct = parseFloat(cfg.driverEarningsPercentage);
          if (!Number.isNaN(pct) && pct >= 0 && pct <= 100) {
            return Math.max(0, (gross * pct) / 100);
          }
        }
        if (cfg && cfg.platformFeePercentage) {
          const platformPct = parseFloat(cfg.platformFeePercentage);
          if (!Number.isNaN(platformPct) && platformPct >= 0 && platformPct <= 100) {
            return Math.max(0, gross * (1 - platformPct / 100));
          }
        }
        // Fallback to gross if no config; UI will still show earnings
        return gross;
      };

      // Group by date (YYYY-MM-DD) and aggregate settlement status
      const map = new Map<string, { 
        date: string; 
        amount: number; 
        rentals: number; 
        currency: string; 
        currencySymbol: string; 
        createdAt: string;
        settledCount: number;
        pendingCount: number;
      }>();
      for (const r of paidRentals) {
        const dateKey = new Date(r.createdAt).toISOString().split('T')[0];
        const amount = computeOwnerPayable(r);
        const currency = (r.currency || r.rideService?.currency || 'GMD') as string;
        const currencySymbol = (r.currencySymbol || r.rideService?.currencySymbol || 'D') as string;
        const isSettled = (r.rentalSettlementStatus || '').toUpperCase() === 'SETTLED';
        if (map.has(dateKey)) {
          const entry = map.get(dateKey)!;
          entry.amount += amount;
          entry.rentals += 1;
          if (isSettled) entry.settledCount += 1; else entry.pendingCount += 1;
        } else {
          map.set(dateKey, {
            date: dateKey,
            amount,
            rentals: 1,
            currency,
            currencySymbol,
            createdAt: r.createdAt,
            settledCount: isSettled ? 1 : 0,
            pendingCount: isSettled ? 0 : 1,
          });
        }
      }

      const items: EarningsItem[] = Array.from(map.values())
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .map((e) => ({
          id: e.date,
          date: e.date,
          amount: e.amount,
          currency: e.currency,
          currencySymbol: e.currencySymbol,
          rentals: e.rentals,
          status: e.pendingCount === 0 ? 'SETTLED' : 'PENDING',
          createdAt: e.createdAt,
        }));

      setEarnings(items);

      // Available settlement should always load regardless of date filter
      try {
        const availableRentalEarnings = await settlementService.getAvailableRentalEarnings();
        setAvailableByCurrency(availableRentalEarnings || []);
        if ((availableRentalEarnings || []).length > 0) {
          const primary = availableRentalEarnings[0];
          setSelectedCurrency(primary.currency);
          setSelectedCurrencySymbol(primary.currencySymbol || '¤');
          setAvailableSettlement(primary.amount || 0);
          setOtherCurrenciesCount(Math.max(0, (availableRentalEarnings || []).length - 1));
        } else {
          // No available earnings from API
          setAvailableSettlement(0);
          setOtherCurrenciesCount(0);
        }
      } catch (e) {
        // If the authoritative endpoint fails, do not guess; show zero and hide the settlement button
        setAvailableSettlement(0);
        setOtherCurrenciesCount(0);
        setAvailableByCurrency([]);
      }
    } catch (error) {
      console.error('Error loading rental earnings:', error);
      setHasError(true);
      setEarnings([]);
      setAvailableSettlement(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadEarningsData();
  };

  const handlePeriodFilter = (period: string) => {
    setSelectedPeriod(period);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatNumber = (number: any) => {
    try {
      const num = typeof number === 'string' ? parseFloat(number) : number;
      if (isNaN(num)) return '0';
      return num.toLocaleString('en-US');
    } catch (error) {
      return '0';
    }
  };

  const formatCurrency = (amount: any, currencySymbol: string) => {
    let safeAmount = 0;
    if (typeof amount === 'number' && !isNaN(amount)) {
      safeAmount = amount;
    } else if (typeof amount === 'string') {
      const parsed = parseFloat(amount);
      safeAmount = isNaN(parsed) ? 0 : parsed;
    } else if (amount && typeof amount === 'object' && amount.toString) {
      const parsed = parseFloat(amount.toString());
      safeAmount = isNaN(parsed) ? 0 : parsed;
    }
    const formattedAmount = safeAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${currencySymbol}${formattedAmount}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return '#F59E0B';
      case 'SETTLED':
        return '#10B981';
      case 'PROCESSING':
        return '#3B82F6';
      case 'COMPLETED':
        return '#10B981';
      case 'FAILED':
        return '#EF4444';
      case 'CANCELLED':
        return '#6B7280';
      default:
        return '#3B82F6';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'time-outline';
      case 'SETTLED':
        return 'checkmark-circle';
      case 'PROCESSING':
        return 'sync';
      case 'COMPLETED':
        return 'checkmark-done-circle';
      case 'FAILED':
        return 'close-circle';
      case 'CANCELLED':
        return 'close-circle-outline';
      default:
        return 'time-outline';
    }
  };

  const getCurrencySymbolFor = (currency: string): string => {
    const fromAvail = (availableByCurrency || []).find(a => a.currency === currency);
    if (fromAvail?.currencySymbol) return fromAvail.currencySymbol;
    if (currency === 'USD') return '$';
    if (currency === 'EUR') return '€';
    if (currency === 'GBP') return '£';
    if (currency === 'GMD') return 'D';
    if (currency === 'NGN') return '₦';
    if (currency === 'KES') return 'KSh';
    if (currency === 'GHS') return 'GH₵';
    if (currency === 'ZAR') return 'R';
    if (currency === 'SLL') return 'Le';
    if (currency === 'UGX') return 'USh';
    if (currency === 'TZS') return 'TSh';
    if (currency === 'JPY') return '¥';
    if (currency === 'CNY') return '¥';
    return '¤';
  };

  const totalEarnings = (earnings || [])
    .filter(e => e.currency === selectedCurrency)
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalRentals = (earnings || [])
    .filter(e => e.currency === selectedCurrency)
    .reduce((sum, e) => sum + (e.rentals || 0), 0);

  if (hasError) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" translucent />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Rental Earnings</Text>
            <Text style={styles.headerSubtitle}>Error loading data</Text>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Ionicons name="refresh" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>We couldn't load your rental earnings. Please try again.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" translucent />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Rental Earnings</Text>
            <Text style={styles.headerSubtitle}>Loading...</Text>
          </View>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading rental earnings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" translucent />
      <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
        <View style={styles.headerWrapper}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Rental Earnings</Text>
              <Text style={styles.headerSubtitle}>
                {formatNumber(totalRentals)} rentals • {formatCurrency(totalEarnings, selectedCurrencySymbol)} total
              </Text>
            </View>
            <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
              <Ionicons name="refresh" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {periodOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.filterButton, selectedPeriod === option.value && styles.filterButtonActive]}
              onPress={() => handlePeriodFilter(option.value)}
            >
              <Text style={[styles.filterButtonText, selectedPeriod === option.value && styles.filterButtonTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Currency chips (if multiple currencies are available) */}
      {availableByCurrency.length > 1 && (
        <View style={styles.currencyChipsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.currencyChipsScroll}>
            {availableByCurrency.map((c) => {
              const active = c.currency === selectedCurrency;
              return (
                <TouchableOpacity
                  key={c.currency}
                  style={[styles.currencyChip, active && styles.currencyChipActive]}
                  onPress={() => {
                    setSelectedCurrency(c.currency);
                    setSelectedCurrencySymbol(c.currencySymbol || '¤');
                    setAvailableSettlement(c.amount || 0);
                    setOtherCurrenciesCount(Math.max(0, availableByCurrency.length - 1));
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.currencyChipText, active && styles.currencyChipTextActive]}>
                    {c.currency} · {formatCurrency(c.amount || 0, c.currencySymbol || '¤')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Ionicons name="cash-outline" size={20} color="#10B981" />
            <Text style={styles.summaryLabel}>Total Earnings</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalEarnings, selectedCurrencySymbol)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Ionicons name="time-outline" size={20} color="#F59E0B" />
            <Text style={styles.summaryLabel}>Available</Text>
            <Text style={styles.summaryValue}>{formatCurrency(availableSettlement, selectedCurrencySymbol)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Ionicons name="car-outline" size={20} color="#3B82F6" />
            <Text style={styles.summaryLabel}>Total Rentals</Text>
            <Text style={styles.summaryValue}>{totalRentals}</Text>
          </View>
        </View>
      </View>

      {/* Currency Notice */}
      {otherCurrenciesCount > 0 && (
        <View style={styles.currencyNoticeContainer}>
          <Ionicons name="information-circle-outline" size={16} color="#64748B" />
          <Text style={styles.currencyNoticeText}>
            Totals shown in {selectedCurrency}. {otherCurrenciesCount} other {otherCurrenciesCount === 1 ? 'currency' : 'currencies'} available.
          </Text>
        </View>
      )}

      {/* Manage Rentals Button */}
      <View style={styles.manageButtonContainer}>
        <TouchableOpacity
          style={styles.manageButton}
          onPress={() => navigation.navigate('AssetRental')}
          activeOpacity={0.9}
        >
          <Ionicons name="car-sport" size={20} color="#FFFFFF" />
          <Text style={styles.manageButtonText}>Manage Rental Requests</Text>
        </TouchableOpacity>
      </View>

      {/* Settlement Request Button */}
      {(availableSettlement || 0) > 0 && (
        <View style={styles.settlementButtonContainer}>
          <TouchableOpacity
            style={styles.settlementButton}
            onPress={() => navigation.navigate('RentalSettlementRequest', { defaultCurrency: selectedCurrency })}
            activeOpacity={0.9}
          >
            <Ionicons name="wallet-outline" size={20} color="#FFFFFF" />
            <Text style={styles.settlementButtonText}>
              Request Settlement ({formatCurrency(availableSettlement || 0, selectedCurrencySymbol)})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Daily Earnings</Text>
            <Text style={styles.sectionSubtitle}>
              {formatNumber((earnings || []).filter(e => e.currency === selectedCurrency).length)} day{(earnings || []).filter(e => e.currency === selectedCurrency).length !== 1 ? 's' : ''} •{' '}
              {formatCurrency(totalEarnings, selectedCurrencySymbol)}
            </Text>
          </View>

          {loading && (earnings || []).length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0EA5E9" />
              <Text style={styles.loadingText}>Loading earnings...</Text>
            </View>
          ) : (earnings || []).length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cash-outline" size={64} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No earnings found</Text>
              <Text style={styles.emptySubtitle}>Complete paid rentals to start earning money</Text>
            </View>
          ) : (
            (() => {
              // Build currency order: selected first, then the rest sorted alphabetically
              const currencies = Array.from(new Set((earnings || []).map(e => e.currency)));
              const ordered = [
                ...currencies.filter(c => c === selectedCurrency),
                ...currencies.filter(c => c !== selectedCurrency).sort(),
              ];
              return ordered.map((cur) => {
                const items = (earnings || []).filter(e => e.currency === cur);
                if (items.length === 0) return null;
                const avail = (availableByCurrency || []).find(x => x.currency === cur);
                return (
                  <View key={`currency-section-${cur}`}>
                    <View style={styles.currencySectionHeader}>
                      <Text style={styles.currencySectionTitle}>{cur} mini statement</Text>
                      {avail && (
                        <Text style={styles.currencySectionSubtle}>
                          Available: {formatCurrency(avail.amount || 0, avail.currencySymbol || '¤')}
                        </Text>
                      )}
                    </View>
                    {items.map((earning) => (
                      <TouchableOpacity key={`${cur}-${earning.id}`} style={styles.earningsCard} activeOpacity={0.7}>
                        <View style={styles.earningsCardHeader}>
                          <View style={styles.earningsCardLeft}>
                            <View style={styles.dateContainer}>
                              <Ionicons name="calendar-outline" size={16} color="#3B82F6" />
                              <Text style={styles.dateText}>{formatDate(earning.date)}</Text>
                            </View>
                            <Text style={styles.earningsId}>#{earning.id}</Text>
                          </View>
                          <View style={styles.earningsCardRight}>
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(earning.status) + '20' }]}>
                              <Ionicons name={getStatusIcon(earning.status) as any} size={12} color={getStatusColor(earning.status)} />
                              <Text style={[styles.statusText, { color: getStatusColor(earning.status) }]}>{earning.status}</Text>
                            </View>
                            <Text style={styles.earningsAmount}>{formatCurrency(earning.amount, getCurrencySymbolFor(cur))}</Text>
                          </View>
                        </View>
                        <View style={styles.earningsCardBody}>
                          <View style={styles.earningsMeta}>
                            <View style={styles.metaItem}>
                              <Ionicons name="car-outline" size={14} color="#64748B" />
                              <Text style={styles.metaText}>{formatNumber(earning.rentals)} rentals</Text>
                            </View>
                            <View style={styles.metaItem}>
                              <Ionicons name="time-outline" size={14} color="#64748B" />
                              <Text style={styles.metaText}>{formatDate(earning.createdAt)}</Text>
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                );
              });
            })()
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerWrapper: {
    backgroundColor: '#1E3A8A',
  },
  headerSafeArea: {
    backgroundColor: '#1E3A8A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 12,
    paddingBottom: 12,
    marginTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#CBD5E1',
    marginTop: 2,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterScroll: {
    paddingHorizontal: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  summaryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E3A8A',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  currencyNoticeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  currencyNoticeText: {
    fontSize: 12,
    color: '#64748B',
  },
  manageButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  manageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  settlementButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  settlementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  settlementButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  currencyChipsContainer: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  currencyChipsScroll: {
    paddingVertical: 4,
  },
  currencyChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    marginRight: 8,
  },
  currencyChipActive: {
    backgroundColor: '#DBEAFE',
  },
  currencyChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  currencyChipTextActive: {
    color: '#1E3A8A',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  section: {
    marginTop: 16,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  earningsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currencySectionHeader: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currencySectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  currencySectionSubtle: {
    fontSize: 12,
    color: '#64748B',
  },
  earningsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  earningsCardLeft: {
    flex: 1,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E3A8A',
    marginLeft: 6,
  },
  earningsId: {
    fontSize: 12,
    color: '#64748B',
  },
  earningsCardRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  earningsAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#10B981',
  },
  earningsCardBody: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  earningsMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E3A8A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  retryButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
});


