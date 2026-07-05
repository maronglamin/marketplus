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
  Alert,
  Linking,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import type { RealEstateStackParamList } from '../../navigation/RealEstateNavigator';
import {
  realEstateApi,
  type PropertyBooking,
  type PropertyInquiry,
} from '../../services/realEstateApi';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { useAuth } from '../../contexts/AuthContext';
import { StripePayment } from '../../components/StripePayment';
import YonnaPaymentModal from '../../components/YonnaPaymentModal';
import {
  ensureSavedPaymentMethods,
  getDefaultPaymentMethodId,
  resolveGatewayPaymentMethodId,
} from '../../utils/paymentFlowHelpers';
import { navigateToRootScreen } from '../../navigation/sectionNavigation';

const ACCENT = '#7C3AED';

type Nav = NativeStackNavigationProp<RealEstateStackParamList, 'MyPropertyBookings'>;
type Tab = 'bookings' | 'inquiries';

const formatPrice = (price: number, currency: string) => {
  const symbol = currency === 'GMD' ? 'D' : currency === 'USD' ? '$' : currency;
  return `${symbol}${Number(price).toLocaleString()}`;
};

export function MyPropertyBookings() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const { isLoading: authLoading, isAuthenticated, promptLogin } = useRequireAuth(
    'Login to view your reservations and inquiries.',
  );
  const [activeTab, setActiveTab] = useState<Tab>('bookings');
  const [bookings, setBookings] = useState<PropertyBooking[]>([]);
  const [inquiries, setInquiries] = useState<PropertyInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payingBooking, setPayingBooking] = useState<PropertyBooking | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const [showPaymentSelector, setShowPaymentSelector] = useState(false);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null);
  const [showStripePayment, setShowStripePayment] = useState(false);
  const [showYonnaPayment, setShowYonnaPayment] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isAuthenticated) {
      setBookings([]);
      setInquiries([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const [bookingsData, inquiriesData] = await Promise.all([
        realEstateApi.getMyBookings(),
        realEstateApi.getMyInquiries(),
      ]);
      setBookings(bookingsData);
      setInquiries(inquiriesData);
    } catch {
      setBookings([]);
      setInquiries([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      promptLogin('Login to view your reservations and inquiries.', {
        onCancel: () => navigation.goBack(),
      });
    }
  }, [authLoading, isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        loadData();
      }
    }, [loadData, isAuthenticated]),
  );

  const completePayment = async (gatewayId: string, paymentIntentId?: string) => {
    if (!payingBooking) return;
    const result = await realEstateApi.processPayment(payingBooking.id, gatewayId, paymentIntentId);
    const launchUrl = result?.data?.waveLaunchUrl || result?.waveLaunchUrl;
    if (launchUrl) {
      await Linking.openURL(launchUrl);
      return;
    }
    Alert.alert('Success', 'Payment processed successfully.');
    loadData(true);
  };

  const handlePaymentMethodSelect = async (paymentMethod: any) => {
    if (!payingBooking) return;

    const providerName = (paymentMethod.provider || paymentMethod.metadata?.providerName || '')
      .toString()
      .toLowerCase();
    const isYonna = providerName.includes('yonna');
    const isWave = providerName.includes('wave');

    if (paymentMethod.type === 'CASH') {
      Alert.alert('Not Available', 'Cash payment is not supported. Please add a card or mobile wallet.');
      return;
    }

    switch (paymentMethod.type) {
      case 'CREDIT_CARD':
      case 'DEBIT_CARD':
        setShowStripePayment(true);
        break;

      case 'MOBILE_MONEY':
        if (isYonna) {
          setShowYonnaPayment(true);
        } else if (isWave) {
          try {
            setProcessingPayment(true);
            await completePayment('wave-gambia');
          } catch (err: any) {
            Alert.alert('Payment Error', err?.response?.data?.message || 'Failed to process Wave payment.');
          } finally {
            setProcessingPayment(false);
          }
        } else {
          Alert.alert('Unsupported', 'This mobile wallet is not supported yet.');
        }
        break;

      default:
        try {
          setProcessingPayment(true);
          await completePayment(resolveGatewayPaymentMethodId(paymentMethod));
        } catch (err: any) {
          Alert.alert('Payment Error', err?.response?.data?.message || 'Failed to process payment.');
        } finally {
          setProcessingPayment(false);
        }
    }
  };

  const handlePay = async (booking: PropertyBooking) => {
    if (!user?.id) {
      Alert.alert('Login Required', 'Please log in to pay for this reservation.');
      return;
    }

    setPayingBooking(booking);

    try {
      setLoadingPaymentMethods(true);
      const methods = await ensureSavedPaymentMethods(navigation);
      if (!methods) {
        setPayingBooking(null);
        return;
      }

      setPaymentMethods(methods);
      setSelectedPaymentMethodId(getDefaultPaymentMethodId(methods));
      setShowPaymentSelector(true);
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  const handleStripeSuccess = async (paymentIntentId: string) => {
    try {
      setProcessingPayment(true);
      await completePayment('stripe', paymentIntentId);
      setShowStripePayment(false);
      setPayingBooking(null);
    } catch (err: any) {
      Alert.alert('Payment Error', err?.response?.data?.message || 'Payment could not be completed.');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleYonnaSuccess = async () => {
    try {
      setProcessingPayment(true);
      await completePayment('yonna-forex');
      setShowYonnaPayment(false);
      setPayingBooking(null);
    } catch (err: any) {
      Alert.alert('Payment Error', err?.response?.data?.message || 'Payment could not be completed.');
    } finally {
      setProcessingPayment(false);
    }
  };

  const renderBooking = ({ item }: { item: PropertyBooking }) => {
    const needsPayment = item.status === 'PENDING' && item.paymentStatus === 'PENDING';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.listing.title}</Text>
          <View style={[styles.badge, { backgroundColor: needsPayment ? '#FEF3C7' : '#D1FAE5' }]}>
            <Text style={[styles.badgeText, { color: needsPayment ? '#D97706' : '#059669' }]}>
              {item.status}
            </Text>
          </View>
        </View>
        <Text style={styles.refText}>Ref: {item.bookingRef}</Text>
        <Text style={styles.dateText}>
          {format(new Date(item.checkIn), 'MMM d')} – {format(new Date(item.checkOut), 'MMM d, yyyy')}
        </Text>
        <Text style={styles.detailText}>{item.guests} guest{item.guests !== 1 ? 's' : ''} · {item.nights} night{item.nights !== 1 ? 's' : ''}</Text>
        <Text style={styles.priceText}>{formatPrice(item.totalPrice, item.currency)}</Text>
        {needsPayment && (
          <TouchableOpacity
            style={styles.payButton}
            onPress={() => handlePay(item)}
            disabled={processingPayment || loadingPaymentMethods}
          >
            <Ionicons name="card-outline" size={18} color="#FFFFFF" />
            <Text style={styles.payButtonText}>Pay Now</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderInquiry = ({ item }: { item: PropertyInquiry }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.listing.title}</Text>
        <View style={[styles.badge, { backgroundColor: '#F5F3FF' }]}>
          <Text style={[styles.badgeText, { color: ACCENT }]}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.messageText} numberOfLines={3}>{item.message}</Text>
      {item.preferredDate && (
        <Text style={styles.dateText}>
          Preferred: {format(new Date(item.preferredDate), 'MMM d, yyyy')}
        </Text>
      )}
      <Text style={styles.detailText}>{format(new Date(item.createdAt), 'MMM d, yyyy')}</Text>
    </View>
  );

  if (authLoading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <ActivityIndicator size="large" color={ACCENT} style={styles.loader} />
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
            <Text style={styles.headerTitle}>My Reservations</Text>
          </View>
          <View style={styles.loginPrompt}>
            <Ionicons name="lock-closed-outline" size={48} color="#D1D5DB" />
            <Text style={styles.loginPromptTitle}>Login required</Text>
            <Text style={styles.loginPromptSubtitle}>Sign in to view your reservations and inquiries.</Text>
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
          <Text style={styles.headerTitle}>My Reservations</Text>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'bookings' && styles.tabActive]}
            onPress={() => setActiveTab('bookings')}
          >
            <Text style={[styles.tabText, activeTab === 'bookings' && styles.tabTextActive]}>
              Bookings ({bookings.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'inquiries' && styles.tabActive]}
            onPress={() => setActiveTab('inquiries')}
          >
            <Text style={[styles.tabText, activeTab === 'inquiries' && styles.tabTextActive]}>
              Inquiries ({inquiries.length})
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={ACCENT} style={styles.loader} />
        ) : (
          <FlatList
            data={activeTab === 'bookings' ? bookings : inquiries}
            keyExtractor={(item) => item.id}
            renderItem={activeTab === 'bookings' ? renderBooking : renderInquiry}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={ACCENT} />
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons
                  name={activeTab === 'bookings' ? 'calendar-outline' : 'mail-outline'}
                  size={48}
                  color="#D1D5DB"
                />
                <Text style={styles.emptyTitle}>
                  No {activeTab === 'bookings' ? 'bookings' : 'inquiries'} yet
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>

      <Modal visible={showPaymentSelector} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Payment Method</Text>
            <TouchableOpacity
              onPress={() => {
                setShowPaymentSelector(false);
                setPayingBooking(null);
                setSelectedPaymentMethodId(null);
              }}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {payingBooking ? (
            <View style={styles.paymentAmountContainer}>
              <Text style={styles.paymentAmountText}>
                Amount: {formatPrice(payingBooking.totalPrice, payingBooking.currency)}
              </Text>
            </View>
          ) : null}

          {loadingPaymentMethods ? (
            <ActivityIndicator size="large" color={ACCENT} style={{ marginTop: 40 }} />
          ) : (
            <ScrollView style={styles.paymentList}>
              {paymentMethods.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.paymentItem,
                    selectedPaymentMethodId === method.id && styles.paymentItemSelected,
                  ]}
                  onPress={() => setSelectedPaymentMethodId(method.id)}
                >
                  <Ionicons name="wallet-outline" size={22} color={ACCENT} />
                  <View style={styles.paymentItemInfo}>
                    <Text style={styles.paymentItemName}>{method.accountName || method.provider}</Text>
                    <Text style={styles.paymentItemType}>{method.type.replace(/_/g, ' ')}</Text>
                  </View>
                  <Ionicons
                    name={selectedPaymentMethodId === method.id ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={selectedPaymentMethodId === method.id ? ACCENT : '#9CA3AF'}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.processButton, !selectedPaymentMethodId && styles.buttonDisabled]}
              disabled={!selectedPaymentMethodId || processingPayment}
              onPress={async () => {
                const method = paymentMethods.find((item) => item.id === selectedPaymentMethodId);
                if (!method) return;
                setShowPaymentSelector(false);
                await handlePaymentMethodSelect(method);
              }}
            >
              <Text style={styles.processButtonText}>Process Payment</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.managePaymentButton}
              onPress={() => {
                setShowPaymentSelector(false);
                navigateToRootScreen(navigation, 'PaymentMethods');
              }}
            >
              <Ionicons name="add-circle-outline" size={20} color={ACCENT} />
              <Text style={styles.managePaymentText}>Manage Payment Methods</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {payingBooking && user?.id ? (
        <StripePayment
          visible={showStripePayment}
          onClose={() => setShowStripePayment(false)}
          amount={payingBooking.totalPrice}
          currency={payingBooking.currency}
          orderId={payingBooking.id}
          customerId={user.id}
          onPaymentSuccess={handleStripeSuccess}
          onPaymentError={(msg) => Alert.alert('Payment Failed', msg)}
          transactionType="rental"
        />
      ) : null}

      {payingBooking ? (
        <YonnaPaymentModal
          visible={showYonnaPayment}
          amount={payingBooking.totalPrice}
          currency={payingBooking.currency}
          orderId={payingBooking.id}
          onPaymentSuccess={handleYonnaSuccess}
          onPaymentError={(msg) => Alert.alert('Payment Failed', msg)}
          onClose={() => setShowYonnaPayment(false)}
          transactionType="rental"
        />
      ) : null}
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
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  tabActive: { backgroundColor: '#F5F3FF' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  tabTextActive: { color: ACCENT, fontWeight: '600' },
  loader: { marginTop: 60 },
  list: { padding: 16 },
  card: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1F2937' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  refText: { fontSize: 12, color: '#9CA3AF', marginTop: 6 },
  dateText: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  detailText: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  messageText: { fontSize: 14, color: '#4B5563', marginTop: 8, lineHeight: 20 },
  priceText: { fontSize: 16, fontWeight: '700', color: ACCENT, marginTop: 8 },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: ACCENT,
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 12,
  },
  payButtonText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyTitle: { fontSize: 16, color: '#9CA3AF', marginTop: 12 },
  loginPrompt: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loginPromptTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 16 },
  loginPromptSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 8, textAlign: 'center' },
  loginButton: {
    marginTop: 24,
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  loginButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  modalContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  paymentAmountContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F5F3FF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  paymentAmountText: { fontSize: 16, fontWeight: '600', color: ACCENT },
  paymentList: { flex: 1, padding: 16 },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    marginBottom: 10,
  },
  paymentItemSelected: { borderColor: ACCENT, backgroundColor: '#F5F3FF' },
  paymentItemInfo: { flex: 1 },
  paymentItemName: { fontSize: 15, fontWeight: '500', color: '#1F2937' },
  paymentItemType: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  modalFooter: { paddingBottom: 16 },
  processButton: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  processButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  buttonDisabled: { opacity: 0.6 },
  managePaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  managePaymentText: { fontSize: 15, color: ACCENT, fontWeight: '500' },
});
