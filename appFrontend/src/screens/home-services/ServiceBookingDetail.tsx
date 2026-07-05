import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { HomeServicesStackParamList } from '../../navigation/HomeServicesNavigator';
import { homeServicesApi, type ServiceBooking } from '../../services/homeServicesApi';
import { LocationMapPreview } from '../../components/LocationMapPreview';
import { isValidMapCoordinates } from '../../utils/mapCoordinates';
import { StripePayment } from '../../components/StripePayment';
import YonnaPaymentModal from '../../components/YonnaPaymentModal';
import { useAuth } from '../../contexts/AuthContext';
import { navigateToRootScreen } from '../../navigation/sectionNavigation';
import {
  ensureSavedPaymentMethods,
  getDefaultPaymentMethodId,
  resolveGatewayPaymentMethodId,
} from '../../utils/paymentFlowHelpers';

type Nav = NativeStackNavigationProp<HomeServicesStackParamList, 'ServiceBookingDetail'>;
type Route = RouteProp<HomeServicesStackParamList, 'ServiceBookingDetail'>;

const STATUS_COLORS: Record<string, string> = {
  PENDING_QUOTE: '#F59E0B',
  QUOTED: '#0EA5E9',
  ACCEPTED: '#10B981',
  PAID: '#059669',
  COMPLETED: '#6366F1',
  REJECTED: '#EF4444',
  CANCELLED: '#6B7280',
};

export function ServiceBookingDetail() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { bookingId } = route.params;
  const { user } = useAuth();

  const [booking, setBooking] = useState<ServiceBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const [showPaymentSelector, setShowPaymentSelector] = useState(false);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null);
  const [showStripePayment, setShowStripePayment] = useState(false);
  const [showYonnaPayment, setShowYonnaPayment] = useState(false);

  const loadBooking = useCallback(async () => {
    try {
      setLoading(true);
      const data = await homeServicesApi.getBooking(bookingId);
      setBooking(data);
    } catch {
      Alert.alert('Error', 'Failed to load booking details.');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useFocusEffect(
    useCallback(() => {
      loadBooking();
    }, [loadBooking]),
  );

  const handleAcceptQuote = async () => {
    Alert.alert('Accept Quote', 'Accept this quote and proceed to payment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept',
        onPress: async () => {
          try {
            setActionLoading(true);
            const updated = await homeServicesApi.acceptBooking(bookingId);
            setBooking(updated);
            Alert.alert('Success', 'Quote accepted. You can now pay for the service.');
          } catch (error: any) {
            Alert.alert('Error', error?.response?.data?.message || 'Failed to accept quote.');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handlePayPress = async () => {
    if (!user?.id) {
      Alert.alert('Login Required', 'Please log in to pay for this service.');
      return;
    }

    try {
      setLoadingPaymentMethods(true);
      const methods = await ensureSavedPaymentMethods(navigation);
      if (!methods) return;

      setPaymentMethods(methods);
      setSelectedPaymentMethodId(getDefaultPaymentMethodId(methods));
      setShowPaymentSelector(true);
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  const completePayment = async (gatewayId: string, paymentIntentId?: string) => {
    const result = await homeServicesApi.processPayment(bookingId, gatewayId, paymentIntentId);
    const launchUrl = result?.data?.waveLaunchUrl || result?.waveLaunchUrl;
    if (launchUrl) {
      await Linking.openURL(launchUrl);
      return;
    }
    Alert.alert('Success', 'Payment processed successfully.');
    loadBooking();
  };

  const handlePaymentMethodSelect = async (paymentMethod: any) => {
    if (!booking) return;

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
            setActionLoading(true);
            await completePayment('wave-gambia');
          } catch (error: any) {
            Alert.alert('Payment Failed', error?.response?.data?.message || 'Could not process Wave payment.');
          } finally {
            setActionLoading(false);
          }
        } else {
          Alert.alert('Unsupported', 'This mobile wallet is not supported yet.');
        }
        break;

      case 'BANK_TRANSFER':
      case 'CRYPTO':
      case 'DIGITAL_WALLET':
        try {
          setActionLoading(true);
          await completePayment(resolveGatewayPaymentMethodId(paymentMethod));
        } catch (error: any) {
          Alert.alert('Payment Failed', error?.response?.data?.message || 'Payment could not be processed.');
        } finally {
          setActionLoading(false);
        }
        break;

      default:
        Alert.alert('Not Supported', 'This payment method is not supported.');
    }
  };

  const handleStripeSuccess = async (paymentIntentId: string) => {
    try {
      setActionLoading(true);
      await completePayment('stripe', paymentIntentId);
      setShowStripePayment(false);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Payment recorded but status update failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleYonnaSuccess = async () => {
    try {
      setActionLoading(true);
      await completePayment('yonna-forex');
      setShowYonnaPayment(false);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Payment could not be completed.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !booking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0EA5E9" style={{ marginTop: 80 }} />
      </View>
    );
  }

  const statusColor = STATUS_COLORS[booking.status] || '#6B7280';
  const displayPrice = booking.agreedPrice ?? booking.proposedPrice;
  const payingBooking = booking;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{booking.bookingRef}</Text>
            <Text style={styles.headerSubtitle}>{booking.category?.name}</Text>
          </View>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => navigation.navigate('ServiceBookingChat', { bookingId })}
          >
            <Ionicons name="chatbubble-outline" size={22} color="#0EA5E9" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.statusBanner, { backgroundColor: `${statusColor}15` }]}>
            <Ionicons name="information-circle-outline" size={20} color={statusColor} />
            <Text style={[styles.statusBannerText, { color: statusColor }]}>
              {booking.status.replace(/_/g, ' ')}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            {booking.provider?.displayName && (
              <DetailRow icon="person-outline" label="Provider" value={booking.provider.displayName} />
            )}
            <DetailRow icon="location-outline" label="Address" value={booking.serviceAddress} />
            {isValidMapCoordinates(booking.serviceLatitude, booking.serviceLongitude) && (
              <View style={{ marginTop: 12 }}>
                <LocationMapPreview
                  location={{
                    latitude: booking.serviceLatitude,
                    longitude: booking.serviceLongitude,
                    address: booking.serviceAddress,
                  }}
                  accent="#0EA5E9"
                />
              </View>
            )}
            {booking.scheduledAt && (
              <DetailRow
                icon="calendar-outline"
                label="Scheduled"
                value={new Date(booking.scheduledAt).toLocaleString()}
              />
            )}
            {booking.notes && (
              <DetailRow icon="document-text-outline" label="Notes" value={booking.notes} />
            )}
            {displayPrice != null && (
              <DetailRow
                icon="cash-outline"
                label={booking.agreedPrice ? 'Agreed Price' : 'Quoted Price'}
                value={`${booking.currency} ${displayPrice.toLocaleString()}`}
              />
            )}
            <DetailRow
              icon="time-outline"
              label="Created"
              value={new Date(booking.createdAt).toLocaleString()}
            />
          </View>

          {booking.status === 'QUOTED' && (
            <TouchableOpacity
              style={[styles.primaryButton, actionLoading && styles.buttonDisabled]}
              onPress={handleAcceptQuote}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Accept Quote</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {booking.status === 'ACCEPTED' && (
            <TouchableOpacity
              style={[styles.primaryButton, actionLoading && styles.buttonDisabled]}
              onPress={handlePayPress}
              disabled={actionLoading || loadingPaymentMethods}
            >
              {actionLoading || loadingPaymentMethods ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="card-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>
                    Pay {booking.currency} {booking.agreedPrice?.toLocaleString()}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('ServiceBookingChat', { bookingId })}
          >
            <Ionicons name="chatbubbles-outline" size={20} color="#0EA5E9" />
            <Text style={styles.secondaryButtonText}>Open Chat</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      <Modal visible={showPaymentSelector} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Payment Method</Text>
            <TouchableOpacity
              onPress={() => {
                setShowPaymentSelector(false);
                setSelectedPaymentMethodId(null);
              }}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.paymentAmountContainer}>
            <Text style={styles.paymentAmountText}>
              Amount: {booking.currency} {booking.agreedPrice?.toLocaleString()}
            </Text>
          </View>

          {loadingPaymentMethods ? (
            <ActivityIndicator size="large" color="#0EA5E9" style={{ marginTop: 40 }} />
          ) : (
            <ScrollView style={styles.paymentList}>
              {paymentMethods.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.paymentItem,
                    selectedPaymentMethodId === method.id && styles.paymentItemSelected,
                    method.isDefault && styles.paymentItemDefault,
                  ]}
                  onPress={() => setSelectedPaymentMethodId(method.id)}
                >
                  <Ionicons name="wallet-outline" size={22} color="#0EA5E9" />
                  <View style={styles.paymentItemInfo}>
                    <Text style={styles.paymentItemName}>{method.accountName || method.provider}</Text>
                    <Text style={styles.paymentItemType}>
                      {method.type === 'CREDIT_CARD'
                        ? 'Card'
                        : method.type === 'MOBILE_MONEY'
                          ? 'Mobile Money'
                          : method.type.replace(/_/g, ' ')}
                    </Text>
                    {method.isDefault ? <Text style={styles.defaultBadge}>Default</Text> : null}
                  </View>
                  <Ionicons
                    name={selectedPaymentMethodId === method.id ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={selectedPaymentMethodId === method.id ? '#0EA5E9' : '#9CA3AF'}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                { marginHorizontal: 16, marginBottom: 10 },
                !selectedPaymentMethodId && styles.buttonDisabled,
              ]}
              disabled={!selectedPaymentMethodId || actionLoading}
              onPress={async () => {
                const method = paymentMethods.find((item) => item.id === selectedPaymentMethodId);
                if (!method) return;
                setShowPaymentSelector(false);
                await handlePaymentMethodSelect(method);
              }}
            >
              <Text style={styles.primaryButtonText}>Process Payment</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addMorePaymentButton}
              onPress={() => {
                setShowPaymentSelector(false);
                navigateToRootScreen(navigation, 'PaymentMethods');
              }}
            >
              <Ionicons name="add-circle-outline" size={20} color="#0EA5E9" />
              <Text style={styles.addMorePaymentText}>Manage Payment Methods</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {payingBooking.agreedPrice != null && user?.id && (
        <StripePayment
          visible={showStripePayment}
          onClose={() => setShowStripePayment(false)}
          amount={payingBooking.agreedPrice}
          currency={payingBooking.currency}
          orderId={payingBooking.id}
          customerId={user.id}
          onPaymentSuccess={handleStripeSuccess}
          onPaymentError={(msg) => Alert.alert('Payment Failed', msg)}
          transactionType="rental"
        />
      )}

      {payingBooking.agreedPrice != null && (
        <YonnaPaymentModal
          visible={showYonnaPayment}
          amount={payingBooking.agreedPrice}
          currency={payingBooking.currency}
          orderId={payingBooking.id}
          onPaymentSuccess={handleYonnaSuccess}
          onPaymentError={(msg) => Alert.alert('Payment Failed', msg)}
          onClose={() => setShowYonnaPayment(false)}
          transactionType="rental"
        />
      )}
    </View>
  );
}

function DetailRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={18} color="#6B7280" />
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
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
  chatButton: { padding: 4 },
  content: { flex: 1, padding: 16 },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  statusBannerText: { fontSize: 14, fontWeight: '600' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 12 },
  detailRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  detailContent: { flex: 1 },
  detailLabel: { fontSize: 12, color: '#6B7280' },
  detailValue: { fontSize: 14, color: '#1F2937', marginTop: 2 },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0EA5E9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  primaryButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 32,
  },
  secondaryButtonText: { fontSize: 15, fontWeight: '500', color: '#0EA5E9' },
  buttonDisabled: { opacity: 0.6 },
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
    backgroundColor: '#F0F9FF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  paymentAmountText: { fontSize: 16, fontWeight: '600', color: '#0369A1' },
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
  paymentItemSelected: { borderColor: '#0EA5E9', backgroundColor: '#F0F9FF' },
  paymentItemDefault: { borderColor: '#BAE6FD' },
  paymentItemInfo: { flex: 1 },
  paymentItemName: { fontSize: 15, fontWeight: '500', color: '#1F2937' },
  paymentItemType: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  defaultBadge: { fontSize: 11, color: '#0EA5E9', fontWeight: '600', marginTop: 4 },
  modalFooter: { paddingBottom: 16 },
  addMorePaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  addMorePaymentText: { fontSize: 15, color: '#0EA5E9', fontWeight: '500' },
});
