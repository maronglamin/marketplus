import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Platform,
  Modal,
  KeyboardAvoidingView,
  Alert,
  Linking,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../contexts/AuthContext';
import type { AppStackParamList } from '../navigation/AppNavigator';
import { api } from '../api/api';
import { API_URL } from '../config/env';
import { StripePayment } from '../components/StripePayment';
import YonnaPaymentModal from '../components/YonnaPaymentModal';
import { YonnaForexPaymentService } from '../services/YonnaForexPaymentService';
import WavePaymentService from '../services/WavePaymentService';
import { Image } from 'react-native';
import waveImg from '../../assets/wave.jpg';
import YonnaWalletIcon from '../../assets/yonna_wallet.svg';


type ShoppingCartNavigation = NativeStackNavigationProp<AppStackParamList, 'ShoppingCart'>;

interface OrderSummaryItem {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus?: string;
  totalAmount: number;
  currencyCode: string;
  createdAt: string;
  sellerId: string;
  productLabel?: string;
  itemCount?: number;
}

const { height: screenHeight } = Dimensions.get('window');

export function ShoppingCart() {
  const navigation = useNavigation<ShoppingCartNavigation>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<'pay' | 'orders'>('pay');
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderSummaryItem[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const [creatingBulk, setCreatingBulk] = useState(false);
  // Payment state (reused pattern from OrderDetails)
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [showStripePayment, setShowStripePayment] = useState(false);
  const [processingStripePayment, setProcessingStripePayment] = useState(false);
  const [showYonnaPayment, setShowYonnaPayment] = useState(false);
  const [waveSessionId, setWaveSessionId] = useState<string | null>(null);
  const [waveOrderId, setWaveOrderId] = useState<string | null>(null);
  const [waveCurrencyCode, setWaveCurrencyCode] = useState<string | null>(null);
  const [waveBulkOrderIds, setWaveBulkOrderIds] = useState<string[]>([]);
  const [actioningOrderId, setActioningOrderId] = useState<string | null>(null);
  const yonnaForexService = new YonnaForexPaymentService();
  const wavePaymentService = new WavePaymentService();
  const [refreshing, setRefreshing] = useState(false);

  const pendingOrders = useMemo(() => {
    return orders.filter(o => o.status?.toLowerCase() === 'authorized' && (o.paymentStatus || '').toLowerCase() !== 'paid');
  }, [orders]);

  // Orders awaiting buyer action (status PENDING)
  const pendingBuyerOrders = useMemo(() => {
    return orders.filter(o => (o.status || '').toLowerCase() === 'pending');
  }, [orders]);

  // Selected currency constraint: only one currency at a time for bulk payment
  const selectedCurrencyCode = useMemo(() => {
    for (const id of selectedOrderIds) {
      const order = pendingOrders.find(o => o.id === id);
      if (order) return order.currencyCode;
    }
    return null;
  }, [selectedOrderIds, pendingOrders]);

  // Totals by currency for all pending (state per currency)
  const totalsByCurrencyAll = useMemo(() => {
    const map = new Map<string, number>();
    pendingOrders.forEach(o => {
      const cur = o.currencyCode || 'USD';
      const prev = map.get(cur) || 0;
      map.set(cur, prev + (parseFloat(o.totalAmount?.toString() || '0') || 0));
    });
    return map;
  }, [pendingOrders]);

  // Totals by currency for selection
  const totalsByCurrencySelected = useMemo(() => {
    const map = new Map<string, number>();
    pendingOrders.forEach(o => {
      if (!selectedOrderIds.has(o.id)) return;
      const cur = o.currencyCode || 'USD';
      const prev = map.get(cur) || 0;
      map.set(cur, prev + (parseFloat(o.totalAmount?.toString() || '0') || 0));
    });
    return map;
  }, [pendingOrders, selectedOrderIds]);

  const selectedCount = useMemo(() => selectedOrderIds.size, [selectedOrderIds]);
  const selectedTotalForCurrency = useMemo(() => {
    if (!selectedCurrencyCode) return 0;
    return totalsByCurrencySelected.get(selectedCurrencyCode) || 0;
  }, [totalsByCurrencySelected, selectedCurrencyCode]);

  // Single selected order reference (first of selected) for processing
  const selectedOrder = useMemo(() => {
    if (selectedOrderIds.size === 0) return null;
    const firstId = Array.from(selectedOrderIds)[0];
    return pendingOrders.find(o => o.id === firstId) || null;
  }, [selectedOrderIds, pendingOrders]);

  useEffect(() => {
    loadOrders();
  }, []);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await loadOrders();
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      (async () => {
        await loadOrders();
        if (waveSessionId && selectedCurrencyCode && selectedOrderIds.size > 0) {
          try {
            const sessionRes: any = await wavePaymentService.getSession(waveSessionId);
            const data = sessionRes?.data || sessionRes;
            const paymentStatus = data?.payment_status || data?.data?.payment_status || data?.paymentStatus;
            const checkoutStatus = data?.checkout_status || data?.data?.checkout_status || data?.checkoutStatus;
            const transactionId = data?.transaction_id || data?.data?.transaction_id || data?.transactionId || waveSessionId;
            const paidByStatus = ['SUCCEEDED', 'SUCCESS', 'PAID'].includes(String(paymentStatus || '').toUpperCase());
            const paidByCheckout = ['COMPLETE', 'COMPLETED', 'SUCCESS'].includes(String(checkoutStatus || '').toUpperCase());
            if (paidByStatus || paidByCheckout) {
              try {
                await api.post('/api/payments/bulk-external-success', {
                  provider: 'wave_gambia',
                  transactionReference: transactionId,
                  orderIds: Array.from(selectedOrderIds),
                  currencyCode: selectedCurrencyCode,
                  amount: selectedTotalForCurrency,
                });
              } catch (e) {
                // ignore one-off errors; UI will refresh anyway
              } finally {
                setWaveSessionId(null);
                await loadOrders();
              }
            }
          } catch (e) {
            // ignore
          }
        }
      })();
      return () => {};
    }, [waveSessionId])
  );

  // Continuous polling for Wave session until paid (supports single and bulk flows)
  useEffect(() => {
    if (!waveSessionId) return;
    let isCancelled = false;
    const timer = setInterval(async () => {
      try {
        const sessionRes: any = await wavePaymentService.getSession(waveSessionId);
        const data = sessionRes?.data || sessionRes;
        const paymentStatus = data?.payment_status || data?.data?.payment_status || data?.paymentStatus;
        const checkoutStatus = data?.checkout_status || data?.data?.checkout_status || data?.checkoutStatus;
        const transactionId = data?.transaction_id || data?.data?.transaction_id || data?.transactionId || waveSessionId;
        const paidByStatus = ['SUCCEEDED', 'SUCCESS', 'PAID'].includes(String(paymentStatus || '').toUpperCase());
        const paidByCheckout = ['COMPLETE', 'COMPLETED', 'SUCCESS'].includes(String(checkoutStatus || '').toUpperCase());
        if ((paidByStatus || paidByCheckout) && !isCancelled) {
          try {
            if (waveBulkOrderIds.length > 0 && waveCurrencyCode) {
              await api.post('/api/payments/bulk-external-success', {
                provider: 'wave_gambia',
                transactionReference: transactionId,
                orderIds: waveBulkOrderIds,
                currencyCode: waveCurrencyCode,
              });
            } else if (waveOrderId && waveCurrencyCode) {
              await api.post('/api/payments/external-success', {
                provider: 'wave_gambia',
                transactionReference: transactionId,
                orderId: waveOrderId,
                currencyCode: waveCurrencyCode,
              });
            }
          } catch {
            // ignore reconciliation errors; UI will refresh anyway
          } finally {
            clearInterval(timer);
            setWaveSessionId(null);
            setWaveOrderId(null);
            setWaveBulkOrderIds([]);
            await loadOrders();
          }
        }
      } catch {
        // ignore individual poll errors
      }
    }, 3000);
    return () => {
      isCancelled = true;
      clearInterval(timer);
    };
  }, [waveSessionId, waveOrderId, waveCurrencyCode, waveBulkOrderIds.length]);

  // Continuous polling for Yonna payment: close modal when order reflects paid
  useEffect(() => {
    if (!showYonnaPayment || !selectedOrder?.id) return;
    let isCancelled = false;
    const timer = setInterval(async () => {
      try {
        const res = await api.get(`/api/orders/${selectedOrder.id}`);
        const o = res?.data;
        const dbStatus = String(o?.paymentStatus || o?.status || '').toUpperCase();
        const isPaid = dbStatus === 'PAID' || !!o?.paidAt;
        if (isPaid && !isCancelled) {
          clearInterval(timer);
          setShowYonnaPayment(false);
          await loadOrders();
        }
      } catch {
        // ignore; keep polling
      }
    }, 3000);
    return () => {
      isCancelled = true;
      clearInterval(timer);
    };
  }, [showYonnaPayment, selectedOrder?.id]);

  useEffect(() => {
    if (showPaymentModal && !loadingPaymentMethods && paymentMethods.length === 0) {
      checkPaymentMethodsWithUserFeedback();
    }
  }, [showPaymentModal, loadingPaymentMethods, paymentMethods.length]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/orders/my-orders');
      const list: any[] = response.data?.orders || [];
      const simplified: OrderSummaryItem[] = list.map((o: any) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        paymentStatus: o.paymentStatus,
        totalAmount: o.totalAmount,
        currencyCode: o.currencyCode,
        createdAt: o.createdAt,
        sellerId: o.sellerId,
        productLabel: (() => {
          try {
            const items = Array.isArray(o.items) ? o.items : [];
            const names = items
              .map((it: any) => it?.product?.name || it?.product?.title || it?.productName || it?.name)
              .filter(Boolean);
            const primary = names[0] || 'Item';
            return names.length > 1 ? `${primary} +${names.length - 1} more` : primary;
          } catch {
            return 'Item';
          }
        })(),
        itemCount: Array.isArray(o.items) ? o.items.length : (typeof o.itemCount === 'number' ? o.itemCount : undefined),
      }));
      setOrders(simplified);
      // Preserve only still valid selected ids
      setSelectedOrderIds(prev => {
        const next = new Set<string>();
        simplified.forEach(o => {
          if (prev.has(o.id) && o.status?.toLowerCase() === 'authorized' && (o.paymentStatus || '').toLowerCase() !== 'paid') {
            next.add(o.id);
          }
        });
        return next;
      });
    } catch (e: any) {
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(price);
  };

  const handleAuthorizeOrder = async (order: OrderSummaryItem) => {
    try {
      setActioningOrderId(order.id);
      await api.patch(`/api/orders/${order.id}/authorize`, { action: 'authorize' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Order Authorized', `Order #${order.orderNumber} has been authorized.`);
      await loadOrders();
    } catch (e: any) {
      Alert.alert('Authorize Failed', e?.response?.data?.message || 'Failed to authorize order.');
    } finally {
      setActioningOrderId(null);
    }
  };

  const handleCancelOrder = async (order: OrderSummaryItem) => {
    try {
      setActioningOrderId(order.id);
      await api.patch(`/api/orders/${order.id}/authorize`, { action: 'cancel' });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Alert.alert('Order Cancelled', `Order #${order.orderNumber} has been cancelled.`);
      await loadOrders();
    } catch (e: any) {
      Alert.alert('Cancel Failed', e?.response?.data?.message || 'Failed to cancel order.');
    } finally {
      setActioningOrderId(null);
    }
  };

  const getPaymentMethodDisplayName = (method: any) => {
    if (method.provider) return method.provider;
    switch (method.type) {
      case 'CREDIT_CARD': return 'Credit Card';
      case 'MOBILE_MONEY': return 'Mobile Money';
      case 'BANK_TRANSFER': return 'Bank Transfer';
      case 'CRYPTO': return 'Cryptocurrency';
      case 'DIGITAL_WALLET': return 'Digital Wallet';
      default: return method.type || 'Unknown Payment Method';
    }
  };

  const renderPaymentMethodIcon = (method: any) => {
    const type = (method?.type || '').toString();
    if (type === 'MOBILE_MONEY') {
      const providerName = (method?.provider || method?.metadata?.providerName || '').toString().toLowerCase();
      if (providerName.includes('wave')) {
        return <Image source={waveImg} style={{ width: 28, height: 28, borderRadius: 4 }} />;
      }
      if (providerName.includes('yonna') || providerName.includes('aps')) {
        return <YonnaWalletIcon width={28} height={28} fill="#10B981" color="#10B981" stroke="#10B981" />;
      }
      return <Ionicons name="phone-portrait-outline" size={24} color="#2563EB" />;
    }
    if (type === 'CREDIT_CARD' || type === 'DEBIT_CARD') {
      return <Ionicons name="card-outline" size={24} color="#2563EB" />;
    }
    if (type === 'BANK_TRANSFER') {
      return <Ionicons name="business-outline" size={24} color="#2563EB" />;
    }
    if (type === 'CRYPTO') {
      return <Ionicons name="logo-bitcoin" size={24} color="#2563EB" />;
    }
    return <Ionicons name="wallet-outline" size={24} color="#2563EB" />;
  };

  const checkPaymentMethodsWithUserFeedback = async () => {
    try {
      setLoadingPaymentMethods(true);
      if (!user?.id) {
        return false;
      }
      if (!API_URL) {
        return false;
      }
      let response;
      try {
        response = await api.get('/api/payment-methods');
      } catch (apiError: any) {
        if (apiError.response?.status === 500) {
          const mockPaymentMethods = [
            {
              id: 'mock-1',
              type: 'CREDIT_CARD',
              provider: 'Visa',
              accountName: 'Default Card',
              accountId: '1234',
              isDefault: true,
              status: 'ACTIVE',
              userId: user.id,
              metadata: {},
            },
          ];
          setPaymentMethods(mockPaymentMethods);
          return true;
        }
        throw apiError;
      }
      const allPaymentMethods = response?.data?.data || [];
      let userPaymentMethods = allPaymentMethods.filter((pm: any) => {
        const ownerId = pm.userId || pm.customerId || pm.ownerId || pm.user?.id;
        return !ownerId || ownerId === user.id;
      });
      if (userPaymentMethods.length === 0 && allPaymentMethods.length > 0) {
        userPaymentMethods = allPaymentMethods;
      }
      const parsed = userPaymentMethods.map((pm: any) => {
        let parsedMetadata = pm.metadata;
        if (typeof pm.metadata === 'string') {
          try { parsedMetadata = JSON.parse(pm.metadata); } catch { parsedMetadata = {}; }
        } else if (!pm.metadata || typeof pm.metadata !== 'object') {
          parsedMetadata = {};
        }
        return { ...pm, metadata: parsedMetadata };
      });
      setPaymentMethods(parsed);
      return parsed.length > 0;
    } catch (e) {
      setPaymentMethods([]);
      return false;
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  const handlePaymentMethodSelect = (methodId: string) => {
    setSelectedPaymentMethod(methodId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleProceedToPayment = () => {
    const order = selectedOrder;
    if (!order || !selectedPaymentMethod) {
      return;
    }
    const method = paymentMethods.find(m => m.id === selectedPaymentMethod);
    if (!method) return;
    setShowPaymentModal(false);
    switch (method.type) {
      case 'CREDIT_CARD':
      case 'DEBIT_CARD':
        setShowStripePayment(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'MOBILE_MONEY': {
        const providerName = (method.provider || method.metadata?.providerName || '').toString().toLowerCase();
        const isYonna = providerName.includes('yonna');
        const isWave = providerName.includes('wave');
        if (isYonna) {
          // If bulk selection, process combined Yonna payment then reconcile via bulk-external-success
          setShowYonnaPayment(true);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        }
        if (isWave) {
          (async () => {
            try {
              Alert.alert('Wave Payment', 'Preparing payment data for Wave Gambia...');
              const amountToPay = selectedCount > 1 && selectedCurrencyCode ? selectedTotalForCurrency : order.totalAmount;
              const currencyToUse = (selectedCount > 1 && selectedCurrencyCode) ? selectedCurrencyCode : (order.currencyCode || 'GMD');
              const result = await wavePaymentService.processPayment({
                amount: amountToPay,
                currency: currencyToUse,
                // For bulk, omit orderId to avoid backend lookup errors; we'll reconcile via bulk-external-success
                orderId: selectedCount > 1 ? undefined : order.id,
                description: selectedCount > 1
                  ? `Bulk payment for ${selectedCount} orders via Wave`
                  : `Payment for Order #${order.orderNumber} via Wave`,
              });
              if (result.success && result.data?.waveLaunchUrl) {
                await Linking.openURL(result.data.waveLaunchUrl);
                // Track session for both bulk and single so we can poll status
                if (result.data?.sessionId) {
                  setWaveSessionId(result.data.sessionId);
                  setWaveCurrencyCode(currencyToUse || null);
                  if (selectedCount > 1 && selectedCurrencyCode) {
                    setWaveBulkOrderIds(Array.from(selectedOrderIds));
                    setWaveOrderId(null);
                  } else {
                    setWaveBulkOrderIds([]);
                    setWaveOrderId(order.id);
                  }
                }
              } else {
                Alert.alert('Wave Payment Error', result.message || result.error || 'Unable to start Wave payment. Please try again.');
              }
            } catch (err: any) {
              Alert.alert('Wave Payment Error', err?.message || 'Failed to initiate Wave payment.');
            }
          })();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        }
        break;
      }
      case 'DIGITAL_WALLET':
        // Cash on delivery or others
        Alert.alert('Digital Wallet', `Processing payment through ${method.provider}...`);
        break;
      default:
        Alert.alert('Payment Method Not Supported', `${method.type} is not supported.`);
        break;
    }
  };

  const handleStripePaymentSuccess = async (paymentIntentId: string) => {
    try {
      setProcessingStripePayment(true);
      // Capture display values before state changes
      const paidAmount = selectedCount > 1 ? selectedTotalForCurrency : (selectedOrder?.totalAmount || 0);
      const paidCurrency = (selectedCurrencyCode || selectedOrder?.currencyCode || 'USD') as string;
      if (selectedCount > 1) {
        // Bulk success path
        await api.post('/api/payments/bulk-payment-success', {
          paymentIntentId,
          orderIds: Array.from(selectedOrderIds),
        });
      } else {
        // Single order path
        const order = selectedOrder;
        if (!order) return;
        await api.post('/api/payments/payment-success', {
          paymentIntentId,
          orderId: order.id,
        });
      }
      setShowStripePayment(false);
      await loadOrders();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Show success message on ShoppingCart screen
      Alert.alert(
        'Payment Successful',
        `Your payment of ${formatPrice(paidAmount, paidCurrency)} was processed successfully.`,
        [{ text: 'OK' }]
      );
    } catch (e) {
      // Silent
    } finally {
      setProcessingStripePayment(false);
    }
  };

  const toggleSelectOrder = (order: OrderSummaryItem) => {
    if (selectedOrderIds.size > 0 && selectedCurrencyCode && order.currencyCode !== selectedCurrencyCode) {
      Alert.alert('Different Currency', 'Please select orders with the same currency to pay together.');
      return;
    }
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(order.id)) {
        next.delete(order.id);
      } else {
        next.add(order.id);
      }
      return next;
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const clearSelection = () => {
    setSelectedOrderIds(new Set());
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const createBulkPaymentAndRedirect = async () => {
    if (selectedOrderIds.size === 0 || !selectedCurrencyCode) return;
    try {
      setCreatingBulk(true);
      const payload = { orderIds: Array.from(selectedOrderIds), currencyCode: selectedCurrencyCode };
      try {
        await api.post('/api/orders/bulk-payment-session', payload);
      } catch {
        try {
          await api.post('/api/orders/bulk', payload);
        } catch {
          // proceed anyway
        }
      }
      navigation.navigate('PaymentMethods');
    } finally {
      setCreatingBulk(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={Platform.OS === 'android'} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Shopping Cart</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.centerText}>Loading your cart...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={Platform.OS === 'android'} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shopping Cart</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          onPress={() => setActiveTab('pay')}
          style={[styles.tabItem, activeTab === 'pay' && styles.activeTabItem]}
        >
          <Text style={[styles.tabText, activeTab === 'pay' && styles.activeTabText]}>Pay</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('orders')}
          style={[styles.tabItem, activeTab === 'orders' && styles.activeTabItem]}
        >
          <Text style={[styles.tabText, activeTab === 'orders' && styles.activeTabText]}>Pending Orders</Text>
        </TouchableOpacity>
      </View>

      {/* Pay Tab Content */}
      {activeTab === 'pay' && (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 120 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {pendingOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cart-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No pending payments</Text>
              <Text style={styles.emptySubtitle}>Orders awaiting payment will appear here.</Text>
            </View>
          ) : (
            <View style={{ padding: 16 }}>
              <Text style={styles.sectionTitle}>Pending Payment Orders</Text>
              <View style={styles.summaryCard}>
                <Text style={[styles.summaryLabel, { marginBottom: 8 }]}>Totals by currency (all pending)</Text>
                {Array.from(totalsByCurrencyAll.entries()).map(([cur, total]) => (
                  <View key={cur} style={styles.summaryRow}>
                    <Text style={styles.summaryValue}>{cur}</Text>
                    <Text style={styles.summaryTotalValue}>{formatPrice(total, cur)}</Text>
                  </View>
                ))}
              </View>
              <View style={{ marginTop: 12, gap: 10 }}>
                {pendingOrders.map((o) => (
                  <TouchableOpacity
                    key={o.id}
                    style={[styles.orderCard, selectedOrderIds.has(o.id) && styles.selectedOrderCard]}
                    onPress={() => toggleSelectOrder(o)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.orderHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons
                          name={selectedOrderIds.has(o.id) ? 'checkbox' : 'square-outline'}
                          size={20}
                          color={selectedOrderIds.has(o.id) ? '#10B981' : '#9CA3AF'}
                        />
                        <Text style={styles.orderNumber}>#{o.orderNumber}</Text>
                      </View>
                    </View>
                    <View style={styles.orderRow}>
                      <View style={styles.rowLeft}>
                        <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                        <Text style={styles.rowLabel}>Date</Text>
                      </View>
                      <Text style={styles.rowValue}>
                        {new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Text>
                    </View>
                  <View style={styles.orderRow}>
                    <View style={styles.rowLeft}>
                      <Ionicons name="pricetag-outline" size={16} color="#6B7280" />
                      <Text style={styles.rowLabel}>Product</Text>
                    </View>
                    <Text style={styles.rowValue} numberOfLines={1} ellipsizeMode="tail">
                      {o.productLabel || 'Item'}
                    </Text>
                  </View>
                    <View style={styles.orderRow}>
                      <View style={styles.rowLeft}>
                        <Ionicons name="card-outline" size={16} color="#059669" />
                        <Text style={styles.rowLabel}>Payable</Text>
                      </View>
                      <Text style={[styles.rowValue, { color: '#059669', fontWeight: '700' }]}>
                        {formatPrice(o.totalAmount, o.currencyCode)}
                      </Text>
                    </View>
                    <View style={{ marginTop: 8, alignSelf: 'flex-start' }}>
                      <View style={[styles.badge, { backgroundColor: '#DBEAFE' }]}>
                        <Text style={[styles.badgeText, { color: '#1E40AF' }]}>Authorized</Text>
                      </View>
                    </View>
                    {selectedOrderIds.has(o.id) && (
                      <View style={styles.selectedHint}>
                        <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                        <Text style={styles.selectedHintText}>Selected for payment</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Selected Orders</Text>
                  <Text style={styles.summaryValue}>{selectedCount}</Text>
                </View>
                <View style={[styles.summaryRow, { marginTop: 4 }]}>
                  <Text style={styles.summaryTotalLabel}>
                    Grand Total {selectedCurrencyCode ? `(${selectedCurrencyCode})` : ''}
                  </Text>
                  <Text style={styles.summaryTotalValue}>
                    {selectedCurrencyCode ? formatPrice(selectedTotalForCurrency, selectedCurrencyCode) : '--'}
                  </Text>
                </View>
                {totalsByCurrencySelected.size > 1 && (
                  <View style={{ marginTop: 8 }}>
                    {Array.from(totalsByCurrencySelected.entries()).map(([cur, total]) => (
                      <View key={cur} style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Total in {cur}</Text>
                        <Text style={styles.summaryValue}>{formatPrice(total, cur)}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {selectedCount > 0 && (
                  <TouchableOpacity style={{ marginTop: 10 }} onPress={clearSelection}>
                    <Text style={{ color: '#2563EB', fontWeight: '600' }}>Clear Selection</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* Pending Orders Tab Content */}
      {activeTab === 'orders' && (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {pendingBuyerOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="time-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No pending orders</Text>
              <Text style={styles.emptySubtitle}>Orders awaiting your authorization will appear here.</Text>
            </View>
          ) : (
            <View style={{ padding: 16 }}>
              <Text style={styles.sectionTitle}>Pending Orders</Text>
              <View style={{ marginTop: 12, gap: 10 }}>
                {pendingBuyerOrders.map((o) => (
                  <View key={o.id} style={styles.orderCard}>
                    <View style={styles.orderHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="document-text-outline" size={20} color="#6B7280" />
                        <Text style={styles.orderNumber}>#{o.orderNumber}</Text>
                      </View>
                    </View>
                    <View style={styles.orderRow}>
                      <View style={styles.rowLeft}>
                        <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                        <Text style={styles.rowLabel}>Date</Text>
                      </View>
                      <Text style={styles.rowValue}>
                        {new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Text>
                    </View>
                    <View style={styles.orderRow}>
                      <View style={styles.rowLeft}>
                        <Ionicons name="pricetag-outline" size={16} color="#6B7280" />
                        <Text style={styles.rowLabel}>Product</Text>
                      </View>
                      <Text style={styles.rowValue} numberOfLines={1} ellipsizeMode="tail">
                        {o.productLabel || 'Item'}
                      </Text>
                    </View>
                    <View style={styles.orderRow}>
                      <View style={styles.rowLeft}>
                        <Ionicons name="cash-outline" size={16} color="#059669" />
                        <Text style={styles.rowLabel}>Total</Text>
                      </View>
                      <Text style={[styles.rowValue, { color: '#059669', fontWeight: '700' }]}>
                        {formatPrice(o.totalAmount, o.currencyCode)}
                      </Text>
                    </View>
                    <View style={{ marginTop: 12, flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity
                        style={[styles.authorizeButton, (actioningOrderId === o.id) && styles.disabledButton]}
                        onPress={() => handleAuthorizeOrder(o)}
                        disabled={actioningOrderId === o.id}
                      >
                        {actioningOrderId === o.id ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                        )}
                        <Text style={styles.actionButtonText}>Authorize</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.cancelButton, (actioningOrderId === o.id) && styles.disabledButton]}
                        onPress={() => handleCancelOrder(o)}
                        disabled={actioningOrderId === o.id}
                      >
                        {actioningOrderId === o.id ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Ionicons name="close-circle-outline" size={18} color="#FFFFFF" />
                        )}
                        <Text style={styles.actionButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {activeTab === 'pay' && pendingOrders.length > 0 && (
        <View style={[styles.footerContainer, { paddingBottom: Math.max(insets.bottom, 12), paddingHorizontal: 16 }]}>
          <TouchableOpacity
            style={[styles.payNowButton, (selectedCount === 0 || !selectedCurrencyCode || loadingPaymentMethods) && styles.disabledButton]}
            onPress={async () => {
              if (selectedCount === 0 || !selectedCurrencyCode) return;
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              // Open modal immediately and load methods in the background
              setShowPaymentModal(true);
              if (!loadingPaymentMethods) {
                checkPaymentMethodsWithUserFeedback();
              }
            }}
            disabled={selectedCount === 0 || !selectedCurrencyCode || loadingPaymentMethods}
          >
            {loadingPaymentMethods ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="wallet-outline" size={20} color="#FFFFFF" />
            )}
            <Text style={styles.payNowButtonText}>
              {selectedCount > 1 && selectedCurrencyCode
                ? `Pay Now (${formatPrice(selectedTotalForCurrency, selectedCurrencyCode)})`
                : selectedOrder
                  ? `Pay Now (${formatPrice(selectedOrder.totalAmount, selectedOrder.currencyCode)})`
                  : 'Pay Now'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.footerHint}>
            {selectedCount === 0 ? 'Select orders (same currency) to proceed with payment' : `Selected currency: ${selectedCurrencyCode}`}
          </Text>
        </View>
      )}

      {/* Payment Selection Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: screenHeight * 0.95, minHeight: screenHeight * 0.95 }]}>
            <View style={styles.handleBar} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Payment Method</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 16 }}>
              <View style={styles.orderSummaryCard}>
                <View style={styles.orderSummaryHeader}>
                  <View style={styles.orderSummaryIconContainer}>
                    <Ionicons name="receipt-outline" size={24} color="#2563EB" />
                  </View>
                  <View style={styles.orderSummaryHeaderText}>
                    <Text style={styles.orderSummaryTitle}>
                      {selectedCount > 1 ? `Bulk Payment (${selectedCount} orders)` : selectedOrder ? `Order #${selectedOrder.orderNumber}` : 'Order'}
                    </Text>
                    <Text style={styles.orderSummarySubtitle}>Review and choose a payment method</Text>
                  </View>
                </View>
                <View style={styles.orderSummaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Currency</Text>
                  <Text style={styles.summaryValue}>{selectedCurrencyCode || (selectedOrder?.currencyCode || 'USD')}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Payable</Text>
                  <Text style={styles.summaryTotalValue}>
                    {selectedCount > 1
                      ? formatPrice(selectedTotalForCurrency, selectedCurrencyCode || 'USD')
                      : selectedOrder
                        ? formatPrice(selectedOrder.totalAmount, selectedOrder.currencyCode)
                        : '--'}
                  </Text>
                </View>
              </View>

              <View style={{ paddingHorizontal: 24 }}>
                <Text style={styles.availablePaymentMethodsTitle}>Available Payment Methods</Text>
            {loadingPaymentMethods ? (
              <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={{ marginTop: 8, color: '#6B7280' }}>Loading payment methods...</Text>
              </View>
            ) : paymentMethods.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                <Text style={{ color: '#6B7280', textAlign: 'center' }}>
                  No payment methods available. Add one to continue.
                </Text>
              </View>
            ) : (
              paymentMethods.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.paymentMethodItem,
                    selectedPaymentMethod === method.id && styles.selectedPaymentMethodItem,
                    method.isDefault && styles.defaultPaymentMethodItem,
                  ]}
                  onPress={() => handlePaymentMethodSelect(method.id)}
                >
                  <View style={styles.paymentMethodItemIcon}>
                    {renderPaymentMethodIcon(method)}
                  </View>
                  <View style={styles.paymentMethodItemDetails}>
                    <View style={styles.paymentMethodItemHeader}>
                      <Text style={styles.paymentMethodItemProvider}>{getPaymentMethodDisplayName(method)}</Text>
                      <View style={styles.paymentMethodItemMeta}>
                        {method.isDefault && (
                          <View style={styles.defaultBadge}>
                            <Text style={styles.defaultBadgeText}>Default</Text>
                          </View>
                        )}
                        <View style={styles.paymentMethodItemArrow}>
                          <Ionicons name="chevron-forward" size={16} color="#2563EB" />
                        </View>
                      </View>
                    </View>
                    <Text style={styles.paymentMethodItemAccount}>{method.accountName}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { paddingBottom: Math.max(insets.bottom, 24) }]}>
              <TouchableOpacity
                style={[styles.saveButton, !selectedPaymentMethod && styles.disabledButton]}
                onPress={handleProceedToPayment}
                disabled={!selectedPaymentMethod}
              >
                <Ionicons name="wallet-outline" size={20} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Process Payment</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addPaymentButton}
                onPress={() => {
                  setShowPaymentModal(false);
                  navigation.navigate('PaymentMethods');
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
              >
                <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.addPaymentButtonText}>Add More Payment Methods</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Stripe Payment Modal */}
      <StripePayment
        visible={showStripePayment}
        onClose={() => setShowStripePayment(false)}
        amount={selectedCount > 1 ? selectedTotalForCurrency : (selectedOrder?.totalAmount || 0)}
        currency={selectedCurrencyCode || selectedOrder?.currencyCode || 'USD'}
        orderId={selectedCount > 1 ? `BULK-${Array.from(selectedOrderIds)[0]}` : (selectedOrder?.id || '')}
        customerId={user?.id || ''}
        onPaymentSuccess={handleStripePaymentSuccess}
        onPaymentError={() => setShowStripePayment(false)}
        userInfo={{
          firstName: user?.firstName || '',
          lastName: user?.lastName || '',
        }}
        transactionType="order"
      />

      {/* Yonna Forex Payment Modal */}
      <YonnaPaymentModal
        visible={showYonnaPayment}
        amount={selectedCount > 1 ? selectedTotalForCurrency : (selectedOrder?.totalAmount || 0)}
        currency={selectedCurrencyCode || selectedOrder?.currencyCode}
        orderId={selectedCount > 1 ? `BULK-${Array.from(selectedOrderIds)[0]}` : (selectedOrder?.id)}
        orderNumber={selectedCount > 1 ? `BULK x${selectedCount}` : (selectedOrder?.orderNumber)}
        onPaymentSuccess={async (transactionId: string) => {
          try {
            if (selectedCount > 1 && selectedCurrencyCode) {
              await api.post('/api/payments/bulk-external-success', {
                provider: 'yonna-forex',
                transactionReference: transactionId,
                orderIds: Array.from(selectedOrderIds),
                currencyCode: selectedCurrencyCode,
                amount: selectedTotalForCurrency,
              });
            }
          } catch (e) {
            // ignore
          } finally {
            setShowYonnaPayment(false);
            await loadOrders();
          }
        }}
        onPaymentError={() => {}}
        onClose={() => setShowYonnaPayment(false)}
        onRefreshOrder={loadOrders}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 16,
    paddingBottom: 16,
    minHeight: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 64 : 64,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  centerText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
    paddingBottom: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedOrderCard: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  rowValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
  },
  selectedHint: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectedHintText: {
    color: '#065F46',
    fontSize: 12,
    fontWeight: '600',
  },
  summaryCard: {
    marginTop: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  summaryTotalLabel: {
    fontSize: 16,
    color: '#059669',
    fontWeight: '700',
  },
  summaryTotalValue: {
    fontSize: 18,
    color: '#059669',
    fontWeight: '800',
  },
  footerContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  payNowButton: {
    width: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  payNowButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButton: {
    backgroundColor: '#94A3B8',
  },
  footerHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  saveButton: {
    width: '100%',
    paddingVertical: 16,
    backgroundColor: '#10B981',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  orderSummaryCard: {
    width: '100%',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  orderSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderSummaryIconContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  orderSummaryHeaderText: {
    flex: 1,
  },
  orderSummaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  orderSummarySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  orderSummaryDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 12,
  },
  paymentMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  paymentMethodItemIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  paymentMethodItemDetails: {
    flex: 1,
  },
  paymentMethodItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  paymentMethodItemProvider: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  paymentMethodItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paymentMethodItemAccount: {
    fontSize: 14,
    color: '#6B7280',
  },
  paymentMethodItemArrow: {
    width: 24,
    height: 24,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultPaymentMethodItem: {
    borderWidth: 2,
    borderColor: '#2563EB',
    backgroundColor: '#F0F9FF',
  },
  selectedPaymentMethodItem: {
    borderWidth: 2,
    borderColor: '#10B981',
    backgroundColor: '#EFF6FF',
  },
  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#10B981',
  },
  defaultBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalFooter: {
    paddingTop: 8,
  },
  availablePaymentMethodsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  addPaymentButton: {
    width: '100%',
    paddingVertical: 16,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  addPaymentButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  activeTabItem: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  activeTabText: {
    color: '#3730A3',
  },
  authorizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#10B981',
    flex: 1,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    flex: 1,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default ShoppingCart;


