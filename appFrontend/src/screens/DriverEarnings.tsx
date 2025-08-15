import React, { useState, useEffect } from 'react';
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
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { AppStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../contexts/AuthContext';
import { driverService, type DriverStats } from '../services/driverService';
import { settlementService } from '../services/settlementService';

type DriverEarningsNavigationProp = NativeStackNavigationProp<AppStackParamList, 'DriverEarnings'>;

interface EarningsItem {
  id: string;
  date: string;
  amount: number;
  currency: string;
  currencySymbol: string;
  rides: number;
  status: string;
  createdAt: string;
}

interface SettlementItem {
  id: string;
  amount: number;
  currency: string;
  currencySymbol: string;
  status: string;
  type: string;
  reference: string;
  createdAt: string;
  processedAt?: string;
}

export function DriverEarnings() {
  const navigation = useNavigation<DriverEarningsNavigationProp>();
  const { user } = useAuth();
  
  // Add error boundary state
  const [hasError, setHasError] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('TODAY');
  const [earnings, setEarnings] = useState<EarningsItem[]>([]);
  const [settlements, setSettlements] = useState<SettlementItem[]>([]);
  const [stats, setStats] = useState<DriverStats>({
    totalRides: 0,
    totalEarnings: 0,
    rating: 0,
    onlineHours: 0,
    todayEarnings: 0,
    weeklyEarnings: 0,
    monthlyEarnings: 0,
  });
  const [availableSettlement, setAvailableSettlement] = useState(0);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [settlementAmount, setSettlementAmount] = useState('');
  const [submittingSettlement, setSubmittingSettlement] = useState(false);

  const periodOptions = [
    { value: 'TODAY', label: 'Today', color: '#3B82F6' },
    { value: 'WEEK', label: 'This Week', color: '#10B981' },
    { value: 'MONTH', label: 'This Month', color: '#F59E0B' },
    { value: 'ALL', label: 'All Time', color: '#8B5CF6' },
  ];

  useEffect(() => {
    console.log('DriverEarnings: useEffect triggered, selectedPeriod:', selectedPeriod);
    loadEarningsData();
  }, [selectedPeriod]);

  const loadEarningsData = async () => {
    console.log('DriverEarnings: loadEarningsData started');
    try {
      setLoading(true);
      setHasError(false);
      
      // Set fallback data immediately to prevent blank screen
      setStats({
        totalRides: 0,
        totalEarnings: 0,
        rating: 0,
        onlineHours: 0,
        todayEarnings: 0,
        weeklyEarnings: 0,
        monthlyEarnings: 0,
      });
      setEarnings([]);
      setSettlements([]);
      setAvailableSettlement(0);
      
      // Load driver stats for the selected period
      console.log('DriverEarnings: Loading driver stats...');
      const driverStats = await Promise.race([
        driverService.getDriverStats(selectedPeriod),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
      ]);
      console.log('DriverEarnings: Driver stats loaded:', driverStats);
      setStats((driverStats as DriverStats) || {
        totalRides: 0,
        totalEarnings: 0,
        rating: 0,
        onlineHours: 0,
        todayEarnings: 0,
        weeklyEarnings: 0,
        monthlyEarnings: 0,
      });
      
      // Load earnings data from API
      console.log('DriverEarnings: Loading earnings data...');
      const earningsData = await Promise.race([
        driverService.getDriverEarnings(selectedPeriod),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
      ]);
      console.log('DriverEarnings: Earnings data loaded:', earningsData);
      const apiEarnings: EarningsItem[] = ((earningsData as any)?.earnings || []).map((item: any) => {
        const mappedItem = {
          id: item.date,
          date: item.date,
          amount: item.amount || 0,
          currency: earningsData.currency || 'GMD',
          currencySymbol: earningsData.currencySymbol || 'D',
          rides: item.rides || 0,
          status: item.status || 'PENDING',
          createdAt: item.createdAt || new Date().toISOString(),
        };
        console.log('Mapped earnings item:', mappedItem);
        return mappedItem;
      });
      setEarnings(apiEarnings);
      
      // Load settlement history (RIDES channel only)
      console.log('DriverEarnings: Loading settlement data...');
      const settlementData = await Promise.race([
        settlementService.getSettlementHistory(1, 10, 'RIDES'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
      ]);
      console.log('DriverEarnings: Settlement data loaded:', settlementData);
      const apiSettlements: SettlementItem[] = ((settlementData as any)?.settlements || []).map((item: any) => {
        const mappedItem = {
          id: item.id,
          amount: item.amount || 0,
          currency: item.currency || 'GMD',
          currencySymbol: getCurrencySymbol(item.currency || 'GMD'),
          status: item.status || 'PENDING',
          type: item.type || 'BANK_TRANSFER',
          reference: item.reference || '',
          createdAt: item.createdAt || new Date().toISOString(),
          processedAt: item.processedAt,
        };
        console.log('Mapped settlement item:', mappedItem);
        return mappedItem;
      });
      setSettlements(apiSettlements);
      
      // Load available settlement amount
      console.log('DriverEarnings: Loading available settlement amount...');
      const availableData = await Promise.race([
        driverService.getAvailableSettlementAmount(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
      ]);
      console.log('DriverEarnings: Available settlement amount loaded:', availableData);
      setAvailableSettlement((availableData as any)?.availableAmount || 0);
      
    } catch (error) {
      console.error('Error loading earnings data:', error);
      setHasError(true);
      console.log('DriverEarnings: Error state set to true');
      // Use fallback data if API fails
      setStats({
        totalRides: 0,
        totalEarnings: 0,
        rating: 0,
        onlineHours: 0,
        todayEarnings: 0,
        weeklyEarnings: 0,
        monthlyEarnings: 0,
      });
      setEarnings([]);
      setSettlements([]);
      setAvailableSettlement(0);
    } finally {
      console.log('DriverEarnings: loadEarningsData completed, setting loading to false');
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

  const handleSettlementRequest = () => {
    if (availableSettlement <= 0) {
      Alert.alert('No Available Earnings', 'You have no earnings available for settlement.');
      return;
    }
    // Navigate to the new ride settlement request screen
    navigation.navigate('RideSettlementRequest');
  };

  const handleSubmitSettlement = async () => {
    const amount = parseFloat(settlementAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid settlement amount.');
      return;
    }

    if (amount > (availableSettlement || 0)) {
      Alert.alert('Insufficient Funds', `You can only settle up to D ${(availableSettlement || 0).toFixed(2)}.`);
      return;
    }

    try {
      setSubmittingSettlement(true);
      
      // Request settlement (for now, just use bank transfer as default)
      await driverService.requestSettlement({
        amount: amount,
        paymentMethod: 'BANK_TRANSFER'
      });
      
      setShowSettlementModal(false);
      setSettlementAmount('');
      
      Alert.alert(
        'Settlement Requested',
        `Your settlement request for D ${(amount || 0).toFixed(2)} has been submitted successfully.`,
        [{ text: 'OK' }]
      );
      
      // Refresh data
      loadEarningsData();
      
    } catch (error: any) {
      console.error('Error submitting settlement:', error);
      Alert.alert('Error', error.message || 'Failed to submit settlement request. Please try again.');
    } finally {
      setSubmittingSettlement(false);
    }
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: any, currencySymbol: string) => {
    console.log('formatCurrency called with:', { amount, type: typeof amount, currencySymbol });
    // Convert to number and handle all edge cases
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
    
    // Apply thousand separator
    const formattedAmount = safeAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    
    return `${currencySymbol}${formattedAmount}`;
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

  const getCurrencySymbol = (currency: string): string => {
    const currencySymbols: { [key: string]: string } = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'GMD': 'D',
      'SLL': 'Le',
      'UGX': 'USh',
      'TZS': 'TSh',
      'NGN': '₦',
      'KES': 'KSh',
      'GHS': 'GH₵',
      'ZAR': 'R',
      'EGP': 'E£',
      'INR': '₹',
      'CNY': '¥',
      'JPY': '¥',
    };
    return currencySymbols[currency] || currency;
  };

  const renderEarningsCard = (earning: EarningsItem) => (
    <TouchableOpacity
      key={earning.id}
      style={styles.earningsCard}
      activeOpacity={0.7}
    >
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
            <Ionicons 
              name={getStatusIcon(earning.status) as any} 
              size={12} 
              color={getStatusColor(earning.status)} 
            />
            <Text style={[styles.statusText, { color: getStatusColor(earning.status) }]}>
              {earning.status}
            </Text>
          </View>
          <Text style={styles.earningsAmount}>
            {formatCurrency(earning.amount, earning.currencySymbol)}
          </Text>
        </View>
      </View>

      <View style={styles.earningsCardBody}>
                  <View style={styles.earningsMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="car-outline" size={14} color="#64748B" />
              <Text style={styles.metaText}>{formatNumber(earning.rides)} rides</Text>
            </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color="#64748B" />
            <Text style={styles.metaText}>{formatDate(earning.createdAt)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSettlementCard = (settlement: SettlementItem) => (
    <TouchableOpacity
      key={settlement.id}
      style={styles.settlementCard}
      activeOpacity={0.7}
      onPress={() => {
        // Navigate to settlement detail
        Alert.alert('Settlement Details', `Reference: ${settlement.reference}\nAmount: ${formatCurrency(settlement.amount, settlement.currencySymbol)}\nStatus: ${settlement.status}`);
      }}
    >
      <View style={styles.settlementCardHeader}>
        <View style={styles.settlementCardLeft}>
          <View style={styles.settlementInfo}>
            <Text style={styles.settlementId}>#{settlement.reference}</Text>
            <Text style={styles.settlementDate}>{formatDate(settlement.createdAt)}</Text>
          </View>
          <View style={styles.paymentMethodContainer}>
            <Ionicons 
              name={settlement.type === 'BANK_TRANSFER' ? 'card-outline' : 'wallet-outline'} 
              size={14} 
              color="#64748B" 
            />
            <Text style={styles.paymentMethodText}>
              {settlement.type.replace('_', ' ')}
            </Text>
          </View>
        </View>
        <View style={styles.settlementCardRight}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(settlement.status) + '20' }]}>
            <Ionicons 
              name={getStatusIcon(settlement.status) as any} 
              size={12} 
              color={getStatusColor(settlement.status)} 
            />
            <Text style={[styles.statusText, { color: getStatusColor(settlement.status) }]}>
              {settlement.status}
            </Text>
          </View>
          <Text style={styles.settlementAmount}>
            {formatCurrency(settlement.amount, settlement.currencySymbol)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const totalEarnings = (earnings || []).reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalRides = (earnings || []).reduce((sum, e) => sum + (e.rides || 0), 0);

  console.log('DriverEarnings: Render state - loading:', loading, 'hasError:', hasError, 'earnings.length:', (earnings || []).length);

  // Show error state if there's an error
  if (hasError) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" translucent />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Earnings & Settlements</Text>
            <Text style={styles.headerSubtitle}>Error loading data</Text>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Ionicons name="refresh" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>
            We couldn't load your earnings data. Please try again.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Show loading state
  if (loading) {
    console.log('DriverEarnings: Showing loading state');
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" translucent />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Earnings & Settlements</Text>
            <Text style={styles.headerSubtitle}>Loading...</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading earnings data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  console.log('DriverEarnings: Showing main content');
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" translucent />
      
      {/* SafeAreaView with blue background for header area */}
      <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
      
      {/* Header with StatusBar background */}
      <View style={styles.headerWrapper}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Earnings & Settlements</Text>
            <Text style={styles.headerSubtitle}>
              {formatNumber(totalRides)} rides • {formatCurrency(totalEarnings, 'D')} total
            </Text>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Ionicons name="refresh" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
      </SafeAreaView>

      {/* Period Filter */}
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {periodOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.filterButton,
                selectedPeriod === option.value && styles.filterButtonActive
              ]}
              onPress={() => handlePeriodFilter(option.value)}
            >
              <Text style={[
                styles.filterButtonText,
                selectedPeriod === option.value && styles.filterButtonTextActive
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Earnings Summary */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Ionicons name="cash-outline" size={20} color="#10B981" />
            <Text style={styles.summaryLabel}>Total Earnings</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalEarnings, 'D')}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Ionicons name="time-outline" size={20} color="#F59E0B" />
            <Text style={styles.summaryLabel}>Available</Text>
            <Text style={styles.summaryValue}>{formatCurrency(availableSettlement, 'D')}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Ionicons name="car-outline" size={20} color="#3B82F6" />
            <Text style={styles.summaryLabel}>Total Rides</Text>
            <Text style={styles.summaryValue}>{totalRides}</Text>
          </View>
        </View>
      </View>

      {/* Settlement Request Button */}
      {(availableSettlement || 0) > 0 && (
        <View style={styles.settlementButtonContainer}>
          <TouchableOpacity
            style={styles.settlementButton}
            onPress={handleSettlementRequest}
          >
            <Ionicons name="wallet-outline" size={20} color="#FFFFFF" />
            <Text style={styles.settlementButtonText}>
              Request Settlement ({formatCurrency(availableSettlement || 0, 'D')})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Earnings Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Daily Earnings</Text>
            <Text style={styles.sectionSubtitle}>
              {formatNumber((earnings || []).length)} day{(earnings || []).length !== 1 ? 's' : ''} • {formatCurrency(totalEarnings, 'D')}
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
              <Text style={styles.emptySubtitle}>
                Complete rides to start earning money
              </Text>
            </View>
          ) : (
            (earnings || []).map(renderEarningsCard)
          )}
        </View>

        {/* Settlements Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Settlement History</Text>
            <View style={styles.sectionHeaderRight}>
              <Text style={styles.sectionSubtitle}>
                {formatNumber((settlements || []).length)} settlement{(settlements || []).length !== 1 ? 's' : ''}
              </Text>
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => navigation.navigate('SettlementHistory')}
              >
                <Text style={styles.viewAllButtonText}>View All</Text>
                <Ionicons name="chevron-forward" size={16} color="#0EA5E9" />
              </TouchableOpacity>
            </View>
          </View>
          
          {(settlements || []).length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="wallet-outline" size={64} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No settlements</Text>
              <Text style={styles.emptySubtitle}>
                Request settlements to withdraw your earnings
              </Text>
            </View>
          ) : (
            (settlements || []).map(renderSettlementCard)
          )}
        </View>
      </ScrollView>

      {/* Settlement Request Modal */}
      <Modal
        visible={showSettlementModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSettlementModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                onPress={() => setShowSettlementModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Request Settlement</Text>
              <View style={styles.placeholder} />
            </View>

            <View style={styles.modalContent}>
              <View style={styles.settlementForm}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Settlement Amount</Text>
                  <TextInput
                    style={styles.textInput}
                    value={settlementAmount}
                    onChangeText={setSettlementAmount}
                    placeholder="Enter amount"
                    keyboardType="numeric"
                    placeholderTextColor="#9CA3AF"
                  />
                  <Text style={styles.inputNote}>
                    Available: {formatCurrency(availableSettlement || 0, 'D')}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.submitButton, submittingSettlement && styles.submitButtonDisabled]}
                  onPress={handleSubmitSettlement}
                  disabled={submittingSettlement}
                >
                  {submittingSettlement ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>Request Settlement</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
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
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllButtonText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '500',
    marginRight: 4,
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
  settlementCard: {
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
  settlementCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  settlementCardLeft: {
    flex: 1,
  },
  settlementInfo: {
    marginBottom: 8,
  },
  settlementId: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E3A8A',
    marginBottom: 2,
  },
  settlementDate: {
    fontSize: 12,
    color: '#64748B',
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethodText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 4,
  },
  settlementCardRight: {
    alignItems: 'flex-end',
  },
  settlementAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
    marginTop: 8,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  placeholder: {
    width: 40,
  },
  modalContent: {
    padding: 20,
  },
  settlementForm: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  inputNote: {
    fontSize: 12,
    color: '#6B7280',
  },
  submitButton: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
});
