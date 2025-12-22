import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Linking } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/api';
import { deliveryOptionsService, type DeliveryOption } from '../services/deliveryOptionsService';
import { WorldCurrencyPicker } from '../components/WorldCurrencyPicker';
import { StripePayment } from '../components/StripePayment';
import { stripeService } from '../services/stripeService';
import { API_URL } from '../config/env';
import type { AppStackParamList } from '../navigation/AppNavigator';
import YonnaPaymentModal from '../components/YonnaPaymentModal';
import { YonnaForexPaymentService } from '../services/YonnaForexPaymentService';
import WavePaymentService from '../services/WavePaymentService';
import waveImg from '../../assets/wave.jpg';
import YonnaWalletIcon from '../../assets/yonna_wallet.svg';

// Use centralized API_URL from env
const { height: screenHeight } = Dimensions.get('window');

type OrderDetailsNavigationProp = NativeStackNavigationProp<AppStackParamList, 'OrderDetails'>;

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product: {
    id: string;
    title: string;
    images: string[];
    seller: {
      id: string;
      name: string;
    };
  };
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  currencyCode: string;
  deliveryCurrency?: string;
  shippingAmount: number;
  discountAmount?: number;
  createdAt: string;
  updatedAt: string;
  sellerId: string;
  customer: {
    id: string;
    name: string;
    phone: string;
  };
  items: OrderItem[];
  shippingMethod?: string;
  shippingAddress?: {
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  seller: {
    id: string;
    name: string;
    phone: string;
  };
  // Payment information
  paymentStatus?: string;
  paymentMethod?: string;
  paymentReference?: string;
  paidAt?: string;
}

export function OrderDetails() {
  const navigation = useNavigation<OrderDetailsNavigationProp>();
  const route = useRoute();
  const { orderId } = route.params as { orderId: string };
  const insets = useSafeAreaInsets();
  
  console.log('OrderDetails route params:', route.params);
  console.log('OrderDetails orderId:', orderId);
  
  const { user, token, refreshUser } = useAuth();
  const [freshUser, setFreshUser] = useState<any>(null);
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [selectedDeliveryOption, setSelectedDeliveryOption] = useState<string>('');
  const [customDeliveryPrice, setCustomDeliveryPrice] = useState('');
  const [customDeliveryCurrency, setCustomDeliveryCurrency] = useState('');
  const [selectedDeliveryType, setSelectedDeliveryType] = useState<string>('');
  const [updatingDelivery, setUpdatingDelivery] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showUpdatePriceModal, setShowUpdatePriceModal] = useState(false);
  const [updatingPrice, setUpdatingPrice] = useState(false);
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newPriceCurrency, setNewPriceCurrency] = useState('');
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<{[key: string]: boolean}>({
    card: false,
    mobileWallets: false,
    cash: false,
  });

  // Selected payment method for checkout
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);

  // Existing transactions state
  const [existingTransactions, setExistingTransactions] = useState<any[]>([]);
  const [hasActiveTransaction, setHasActiveTransaction] = useState(false);
  const [canMakePayment, setCanMakePayment] = useState(true);
  const [checkingTransactions, setCheckingTransactions] = useState(false);

  // Initialize Yonna Forex service
  const yonnaForexService = new YonnaForexPaymentService();
  const wavePaymentService = new WavePaymentService();

  // Payment method form data
  const [paymentMethodForms, setPaymentMethodForms] = useState<{[key: string]: any}>({
    card: {
      provider: '',
      cardholderName: '',
      isDefault: false,
    },
    mobileWallets: {
      provider: '',
      phoneNumber: user?.phoneNumber || '',
      walletType: '',
      isDefault: false,
    },
    cash: {
      provider: 'Cash on Delivery',
      accountId: 'CASH',
      accountName: 'Cash Payment',
      isDefault: false,
    },
  });

  // Expanded payment method states
  const [expandedPaymentMethods, setExpandedPaymentMethods] = useState<{[key: string]: boolean}>({
    card: false,
    mobileWallets: false,
    cash: false,
  });

  // Mobile wallet provider selection
  const [selectedMobileWalletProvider, setSelectedMobileWalletProvider] = useState<string>('');
  const [mobileWalletProviders, setMobileWalletProviders] = useState<any[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [providerSearch, setProviderSearch] = useState('');

  // Stripe payment state
  const [showStripePayment, setShowStripePayment] = useState(false);
  const [processingStripePayment, setProcessingStripePayment] = useState(false);
  const [showYonnaPayment, setShowYonnaPayment] = useState(false);

  // Helper function to get payment method display name
  const getPaymentMethodDisplayName = (method: any) => {
    if (method.provider) {
      return method.provider;
    }
    
    switch (method.type) {
      case 'CREDIT_CARD':
        return 'Credit Card';
      case 'MOBILE_MONEY':
        return 'Mobile Money';
      case 'BANK_TRANSFER':
        return 'Bank Transfer';
      case 'CRYPTO':
        return 'Cryptocurrency';
      case 'DIGITAL_WALLET':
        return 'Digital Wallet';
      default:
        return method.type || 'Unknown Payment Method';
    }
  };

  // Get delivery type labels
  const deliveryTypeLabels = deliveryOptionsService.getDeliveryTypeLabels();
  
  // Payment method options
  const paymentMethodOptions = [
    {
      id: 'card',
      name: 'Card',
      description: 'Credit and debit cards',
      icon: 'card-outline',
      enabled: selectedPaymentMethods.card,
    },
    {
      id: 'mobileWallets',
      name: 'Mobile Wallets',
      description: 'Apple Pay, Google Pay, etc.',
      icon: 'phone-portrait-outline',
      enabled: selectedPaymentMethods.mobileWallets,
    },
    {
      id: 'cash',
      name: 'Cash',
      description: 'Cash on delivery',
      icon: 'cash-outline',
      enabled: selectedPaymentMethods.cash,
    },
  ];

  const handlePaymentMethodToggle = (methodId: string) => {
    setSelectedPaymentMethods(prev => ({
      ...prev,
      [methodId]: !prev[methodId]
    }));
    
    // If turning on, expand the form
    if (!selectedPaymentMethods[methodId]) {
      setExpandedPaymentMethods(prev => ({
        ...prev,
        [methodId]: true
      }));
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePaymentMethodSelect = (methodId: string) => {
    setSelectedPaymentMethod(methodId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePaymentFormUpdate = (methodId: string, field: string, value: any) => {
    setPaymentMethodForms(prev => ({
      ...prev,
      [methodId]: {
        ...prev[methodId],
        [field]: value
      }
    }));
  };

  const handleMobileWalletProviderSelect = (providerId: string) => {
    setSelectedMobileWalletProvider(providerId);
    const provider = mobileWalletProviders.find(p => p.id === providerId);
    if (provider) {
      handlePaymentFormUpdate('mobileWallets', 'provider', provider.name);
    }
  };

  const togglePaymentMethodExpansion = (methodId: string) => {
    setExpandedPaymentMethods(prev => ({
      ...prev,
      [methodId]: !prev[methodId]
    }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const createPaymentMethod = async (methodId: string, formData: any) => {
    try {
      // Ensure user is authenticated before creating payment method
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      let paymentData: any = {
        userId: user.id, // Add current user ID to payment method
        isDefault: formData.isDefault || false,
        metadata: {}
      };

      // Map form data to database fields based on payment type
      switch (methodId) {
        case 'card':
          paymentData = {
            userId: user.id, // Add current user ID
            type: 'CREDIT_CARD',
            provider: formData.provider,
            accountId: 'CARD', // Generic identifier instead of card number
            accountName: formData.cardholderName,
            isDefault: formData.isDefault,
            metadata: {
              cardholderName: formData.cardholderName
            }
          };
          break;
        case 'mobileWallets':
          const selectedProvider = mobileWalletProviders.find(p => p.id === selectedMobileWalletProvider);
          paymentData = {
            userId: user.id, // Add current user ID
            type: 'MOBILE_MONEY',
            provider: selectedProvider?.name || formData.provider,
            accountId: formData.phoneNumber,
            accountName: `${formData.walletType} - ${formData.phoneNumber}`,
            isDefault: formData.isDefault,
            metadata: {
              phoneNumber: formData.phoneNumber,
              walletType: formData.walletType,
              providerId: selectedMobileWalletProvider
            }
          };
          break;
        case 'cash':
          paymentData = {
            userId: user.id, // Add current user ID
            type: 'DIGITAL_WALLET',
            provider: formData.provider,
            accountId: formData.accountId,
            accountName: formData.accountName,
            isDefault: formData.isDefault,
            metadata: {
              paymentType: 'cash_on_delivery'
            }
          };
          break;
      }

      console.log('Creating payment method for current user:', user.id, paymentData);

      const response = await api.post('/api/payment-methods', paymentData);
      
      console.log('Payment method created successfully:', {
        methodId,
        userId: user.id,
        paymentMethodId: response.data.paymentMethod.id
      });

      return response.data.paymentMethod;
    } catch (error) {
      console.error('Error creating payment method:', error);
      throw error;
    }
  };

  const handleSavePaymentMethods = async () => {
    try {
      const enabledMethods = Object.entries(selectedPaymentMethods)
        .filter(([_, enabled]) => enabled)
        .map(([methodId, _]) => methodId);

      if (enabledMethods.length === 0) {
        Alert.alert('Error', 'Please select at least one payment method');
        return;
      }

      // Validate forms for enabled methods
      const validationErrors: string[] = [];
      
      for (const methodId of enabledMethods) {
        const formData = paymentMethodForms[methodId];
        
        switch (methodId) {
          case 'card':
            if (!formData.provider || !formData.cardholderName) {
              validationErrors.push('Please complete all card details');
            }
            break;
          case 'mobileWallets':
            if (!selectedMobileWalletProvider || !formData.phoneNumber || !formData.walletType) {
              validationErrors.push('Please complete all mobile wallet details');
            }
            break;
          case 'bankTransfer':
            if (!formData.provider || !formData.accountName || !formData.accountNumber || !formData.bankName) {
              validationErrors.push('Please complete all bank transfer details');
            }
            break;
          case 'crypto':
            if (!formData.provider || !formData.walletAddress || !formData.walletType) {
              validationErrors.push('Please complete all cryptocurrency details');
            }
            break;
        }
      }

      if (validationErrors.length > 0) {
        Alert.alert('Validation Error', validationErrors.join('\n'));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      // Create payment methods
      const createdMethods = [];
      for (const methodId of enabledMethods) {
        const formData = paymentMethodForms[methodId];
        const paymentMethod = await createPaymentMethod(methodId, formData);
        createdMethods.push(paymentMethod);
      }

      setShowAddPaymentModal(false);
      
      // Refresh payment methods list and proceed to checkout
      setTimeout(async () => {
        try {
          // Re-check payment methods to get the updated list
          const hasPaymentMethods = await checkPaymentMethodsWithUserFeedback();
          
          if (hasPaymentMethods) {
            // Directly open payment selection modal without alerts
            setShowPaymentModal(true);
          }
        } catch (error) {
          console.error('Error checking payment methods after save:', error);
          // Still open payment modal even if there's an error checking
          setShowPaymentModal(true);
        }
      }, 1000); // Small delay to ensure backend has processed the new payment methods
    } catch (error) {
      console.error('Error saving payment methods:', error);
      Alert.alert('Error', 'Failed to save payment methods. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  // Stripe payment handlers
  const handleStripePaymentSuccess = async (paymentIntentId: string) => {
    try {
      setProcessingStripePayment(true);
      
      // Call the payment success endpoint to update order status
      const response = await api.post('/api/payments/payment-success', {
        paymentIntentId,
        orderId: order?.id
      });
      
      if (response.data.success) {
        // Update local order state with new payment status
        if (order) {
          setOrder({
            ...order,
            paymentStatus: response.data.order.paymentStatus,
            status: response.data.order.status,
            paidAt: response.data.order.paidAt
          });
        }
        
        Alert.alert(
          'Payment Successful!',
          `Your payment of ${formatPrice(order?.totalAmount || 0, order?.currencyCode || 'USD')} has been processed successfully.`,
          [
            {
              text: 'OK',
              onPress: () => {
                setShowStripePayment(false);
                setShowPaymentModal(false);
                // Optionally navigate back or refresh
                navigation.goBack();
              },
            },
          ]
        );
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        throw new Error('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order after payment:', error);
      Alert.alert('Payment Successful', 'Your payment was processed, but there was an issue updating the order status.');
    } finally {
      setProcessingStripePayment(false);
    }
  };

  const handleStripePaymentError = (error: string) => {
    Alert.alert('Payment Failed', error);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setShowStripePayment(false);
  };

  const handleProceedToPayment = () => {
    const currentUserId = freshUser?.id || user?.id;
    if (!order || !currentUserId || !selectedPaymentMethod) {
      Alert.alert('Error', 'Order, user, or payment method information is missing.');
      return;
    }

    // Find the selected payment method
    const method = paymentMethods.find(m => m.id === selectedPaymentMethod);
    if (!method) {
      Alert.alert('Error', 'Selected payment method not found.');
      return;
    }
    
    setShowPaymentModal(false);

    // Handle different payment method types
    switch (method.type) {
      case 'CREDIT_CARD':
      case 'DEBIT_CARD':
        // Use Stripe for card payments
    setShowStripePayment(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;

      case 'MOBILE_MONEY':
        // If Yonna wallet is selected, use integrated Yonna Forex flow
        {
          const providerName = (method.provider || method.metadata?.providerName || '').toString().toLowerCase();
          const isYonna = providerName.includes('yonna');
          const isWave = providerName.includes('wave');
          if (isYonna) {
            setShowYonnaPayment(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            break;
          }
          if (isWave) {
            // Create Wave checkout session and open the Wave app/url
            (async () => {
              try {
                const result = await wavePaymentService.processPayment({
                  amount: order.totalAmount,
                  currency: order.currencyCode || 'GMD',
                  orderId: order.id,
                  description: `Payment for Order #${order.orderNumber} via Wave`,
                });
                if (result.success && result.data?.waveLaunchUrl) {
                  await Linking.openURL(result.data.waveLaunchUrl);
                } else {
                  Alert.alert(
                    'Wave Payment Error',
                    result.message || 'Unable to start Wave payment. Please try again.'
                  );
                }
              } catch (err: any) {
                Alert.alert('Wave Payment Error', err?.message || 'Failed to initiate Wave payment.');
              }
            })();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            break;
          }
        }
        // Fallback for other mobile wallets
        Alert.alert(
          'Mobile Wallet Payment',
          `Redirecting to ${method.provider} payment gateway...`,
          [{ text: 'OK' }]
        );
        break;

      case 'DIGITAL_WALLET':
        // Handle cash on delivery or other digital wallet types
        if (method.provider === 'Cash on Delivery') {
          Alert.alert(
            'Cash on Delivery',
            'Your order will be processed for cash on delivery. The seller will contact you to arrange payment upon delivery.',
            [
              {
                text: 'OK',
                onPress: () => {
                  // TODO: Update order status to indicate COD payment method
                  console.log('Processing cash on delivery order');
                }
              }
            ]
          );
        } else {
          Alert.alert(
            'Digital Wallet Payment',
            `Processing payment through ${method.provider}...`,
            [{ text: 'OK' }]
          );
        }
        break;

      default:
        Alert.alert(
          'Payment Method Not Supported',
          `${method.type} payment method is not currently supported. Please try another payment method.`,
          [{ text: 'OK' }]
        );
        break;
    }
  };

  // Pre-check payment methods for authorized orders
  useEffect(() => {
    const preCheckPaymentMethods = async () => {
      // Only check if we have all required data, user is authenticated, and order is fully loaded
      const currentUserId = freshUser?.id || user?.id;
      if (currentUserId && order && !loading && order.status.toLowerCase() === 'authorized' && order.sellerId !== currentUserId) {
        // Add a shorter delay to ensure API is ready and authentication is properly set
        setTimeout(async () => {
          try {
            await checkPaymentMethods();
          } catch (error) {
            console.log('Pre-check payment methods failed, will retry when user clicks checkout:', error);
            // Don't show error alert for pre-check, just log it
          }
        }, 1000); // Reduced from 5 seconds to 1 second for better performance
      }
    };

    preCheckPaymentMethods();
  }, [user, freshUser, order, loading]);

  // Set default payment method when payment methods are loaded
  useEffect(() => {
    if (paymentMethods.length > 0 && !selectedPaymentMethod) {
      const defaultMethod = paymentMethods.find(method => method.isDefault);
      if (defaultMethod) {
        setSelectedPaymentMethod(defaultMethod.id);
      } else {
        // If no default, select the first one
        setSelectedPaymentMethod(paymentMethods[0].id);
      }
    }
  }, [paymentMethods, selectedPaymentMethod]);

  useEffect(() => {
    console.log('OrderDetails useEffect triggered with orderId:', orderId);
    loadOrderDetails();
  }, [orderId]);

  // Reload order details when user becomes available (in case order was loaded before user)
  useEffect(() => {
    if (user && !order && !loading) {
      loadOrderDetails();
    }
  }, [user, order, loading]);

  useEffect(() => {
    if (user && order) {
      if (order.sellerId === user.id && order.items.length > 0) {
        loadDeliveryOptions(order.items[0].product.id);
      }
    }
  }, [user, order]);

  // Refresh user data to ensure we have the latest information
  useEffect(() => {
    const checkAndRefreshUserData = async () => {
      try {
        const response = await api.get('/api/users/me');
        setFreshUser(response.data);
        
        // Check if there's a mismatch between AuthContext and API
        if (response.data && response.data.id !== user?.id) {
          // Use the AuthContext's refreshUser method
          await refreshUser();
        }
      } catch (error) {
        console.error('Error checking user data:', error);
      }
    };
    
    if (user) {
      checkAndRefreshUserData();
    }
  }, [user, refreshUser]);

  // Also refresh on focus to avoid stale user after switching accounts
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      try {
        const response = await api.get('/api/users/me');
        setFreshUser(response.data);
        await refreshUser();
        await loadOrderDetails();
      } catch (e) {
        console.log('Focus refresh failed:', e);
      }
    });
    return unsubscribe;
  }, [navigation]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      setUnauthorized(false);
      
      console.log('Loading order details for orderId:', orderId);
      const response = await api.get(`/api/orders/${orderId}`);
      const orderData = response.data;
      
      console.log('Order details loaded:', {
        orderId,
        status: orderData.status,
        paymentStatus: orderData.paymentStatus,
        paidAt: orderData.paidAt,
        paymentMethod: orderData.paymentMethod
      });
      
      setOrder(orderData);
      
      if (orderData.sellerId === user?.id && orderData.items.length > 0) {
        await loadDeliveryOptions(orderData.items[0].product.id);
      }

      // Check for existing external transactions
      await checkExistingTransactions();
    } catch (error: any) {
      console.error('Error loading order details:', error);
      console.error('API Error details:', {
        orderId,
        status: error.response?.status,
        message: error.response?.data?.message,
        url: error.config?.url
      });
      if (error.response?.status === 401) {
        // Allow read-only access to screen without forcing login; show friendly prompt instead of error
        setUnauthorized(true);
        setOrder(null);
      } else {
        setError('Failed to load order details');
      }
    } finally {
      setLoading(false);
    }
  };

  const checkExistingTransactions = async () => {
    try {
      setCheckingTransactions(true);
      const result = await yonnaForexService.checkExistingTransactions(orderId);
      
      if (result.success && result.data) {
        setExistingTransactions(result.data.transactions);
        setHasActiveTransaction(result.data.hasActiveTransaction);
        setCanMakePayment(result.data.canMakePayment);
        
        console.log('Existing transactions check:', {
          hasActiveTransaction: result.data.hasActiveTransaction,
          canMakePayment: result.data.canMakePayment,
          transactions: result.data.transactions
        });
      }
    } catch (error) {
      console.error('Error checking existing transactions:', error);
      // Don't show error to user, just log it
    } finally {
      setCheckingTransactions(false);
    }
  };

  const loadDeliveryOptions = async (productId: string) => {
    try {
      const response = await deliveryOptionsService.getDeliveryOptions(productId);
      setDeliveryOptions(response);
    } catch (error) {
      console.error('Error loading delivery options:', error);
    }
  };

  const checkPaymentMethods = async () => {
    try {
      setLoadingPaymentMethods(true);
      
      // Ensure user is authenticated
      if (!user?.id) {
        console.log('User not authenticated, skipping payment method check');
        return false;
      }

      // Do not block if in-memory token is missing; interceptor reads from storage
      if (!token) {
        console.log('No in-memory token available; continuing since interceptor attaches stored token');
      }

      // Add a small check to ensure API is ready
      if (!API_URL) {
        console.log('API URL not configured, skipping payment method check');
        return false;
      }
      
      console.log('Checking payment methods for current user:', user.id);
      
      // Try to get payment methods with better error handling
      let response;
      try {
        // Get all payment methods and filter by current user ID
        response = await api.get('/api/payment-methods');
      } catch (apiError: any) {
        console.log('Payment methods API call failed:', apiError.response?.status, apiError.message);
        
        // If it's a 500 error, the endpoint might not be implemented yet
        if (apiError.response?.status === 500) {
          console.log('Payment methods endpoint returned 500 - endpoint may not be implemented');
          
          // For now, use mock data to test the UI flow
          // TODO: Remove this when the backend endpoint is properly implemented
          const mockPaymentMethods = [
            {
              id: 'mock-1',
              type: 'CREDIT_CARD',
              provider: 'Visa',
              accountName: 'John Doe',
              accountId: '1234',
              isDefault: true,
              status: 'ACTIVE',
              userId: user.id, // Add user ID to mock data
              metadata: {
                cardNumber: '4242 4242 4242 4242',
                expiryDate: '12/25',
                cvv: '123'
              }
            },
            {
              id: 'mock-2',
              type: 'MOBILE_MONEY',
              provider: 'M-Pesa',
              accountName: 'Mobile Money',
              accountId: user?.phoneNumber || '',
              isDefault: false,
              status: 'ACTIVE',
              userId: user.id, // Add user ID to mock data
              metadata: {
                phoneNumber: user?.phoneNumber || '',
                walletType: 'Mobile Money',
                providerId: 'mpesa'
              }
            }
          ];
          
          console.log('Using mock payment methods for current user:', user.id, mockPaymentMethods);
          setPaymentMethods(mockPaymentMethods);
          return true; // Return true to show that payment methods exist
        }
        
        // Re-throw other errors
        throw apiError;
      }
      
      const allPaymentMethods = response?.data?.data || [];
      console.log('Raw API response for payment methods:', {
        responseData: response?.data,
        allPaymentMethods: allPaymentMethods,
        firstPaymentMethod: allPaymentMethods[0] ? {
          id: allPaymentMethods[0].id,
          type: allPaymentMethods[0].type,
          metadata: allPaymentMethods[0].metadata,
          metadataType: typeof allPaymentMethods[0].metadata,
          metadataStringified: JSON.stringify(allPaymentMethods[0].metadata)
        } : null
      });
      
      // Filter payment methods by owner when possible; if backend already scopes, fallback to all
      let userPaymentMethods = allPaymentMethods.filter((pm: any) => {
        const ownerId = pm.userId || pm.customerId || pm.ownerId || pm.user?.id;
        return !ownerId || ownerId === user.id;
      });
      if (userPaymentMethods.length === 0 && allPaymentMethods.length > 0) {
        console.log('No explicit owner match; assuming backend already scoped to current user.');
        userPaymentMethods = allPaymentMethods;
      }
      
      // Parse metadata for each payment method if it's a string
      const parsedUserPaymentMethods = userPaymentMethods.map((pm: any) => {
        console.log('Processing payment method:', {
          id: pm.id,
          type: pm.type,
          rawMetadata: pm.metadata,
          metadataType: typeof pm.metadata,
          metadataStringified: JSON.stringify(pm.metadata)
        });
        
        let parsedMetadata = pm.metadata;
        if (typeof pm.metadata === 'string') {
          try {
            parsedMetadata = JSON.parse(pm.metadata);
            console.log('Successfully parsed metadata from string for payment method', pm.id, ':', parsedMetadata);
          } catch (error) {
            console.error('Failed to parse metadata for payment method', pm.id, ':', error);
            parsedMetadata = {};
          }
        } else if (pm.metadata && typeof pm.metadata === 'object') {
          console.log('Metadata is already an object for payment method', pm.id, ':', pm.metadata);
          parsedMetadata = pm.metadata;
        } else {
          console.log('Metadata is neither string nor object for payment method', pm.id, ':', pm.metadata);
          parsedMetadata = {};
        }
        
        return {
          ...pm,
          metadata: parsedMetadata
        };
      });
      
      console.log('Payment methods filtering results:', {
        currentUserId: user.id,
        totalPaymentMethods: allPaymentMethods.length,
        userPaymentMethodsCount: userPaymentMethods.length,
        userPaymentMethods: parsedUserPaymentMethods.map((pm: any) => ({
          id: pm.id,
          type: pm.type,
          provider: pm.provider,
          isDefault: pm.isDefault,
          userId: pm.userId,
          metadata: pm.metadata,
          metadataType: typeof pm.metadata
        }))
      });
      
      setPaymentMethods(parsedUserPaymentMethods);
      // Consider any existing method sufficient to proceed
      const hasAnyMethods = parsedUserPaymentMethods.length > 0;
      if (!hasAnyMethods) {
        console.log('No payment methods found for current user:', user.id);
      }
      return hasAnyMethods;
      
    } catch (error: any) {
      console.error('Error checking payment methods:', error);
      
      // Handle specific error cases
      if (error.response?.status === 401) {
        console.log('Authentication error when checking payment methods');
        // Don't show alert for pre-check, only for user-initiated actions
      } else if (error.response?.status === 403) {
        console.log('Access denied when checking payment methods');
        // Don't show alert for pre-check, only for user-initiated actions
      } else if (error.response?.status >= 500) {
        console.log('Server error when checking payment methods:', error.response?.status);
        // Don't show alert for pre-check, only for user-initiated actions
      } else {
        console.log('Other error when checking payment methods:', error.message);
        // Don't show alert for pre-check, only for user-initiated actions
      }
      
      setPaymentMethods([]);
      return false;
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  const checkPaymentMethodsWithUserFeedback = async () => {
    try {
      setLoadingPaymentMethods(true);
      
      // Ensure user is authenticated
      if (!user?.id) {
        console.error('User not authenticated');
        Alert.alert('Authentication Error', 'Please log in to continue.');
        return false;
      }

      // Do not block if in-memory token is missing; interceptor reads from storage
      if (!token) {
        console.log('No in-memory token available; continuing since interceptor attaches stored token');
      }

      // Add a small check to ensure API is ready
      if (!API_URL) {
        console.error('API URL not configured');
        Alert.alert('Configuration Error', 'API is not properly configured. Please try again later.');
        return false;
      }
      
      console.log('Checking payment methods for current user:', user.id);
      
      // Try to get payment methods with better error handling
      let response;
      try {
        // Get all payment methods and filter by current user ID
        response = await api.get('/api/payment-methods');
      } catch (apiError: any) {
        console.log('Payment methods API call failed:', apiError.response?.status, apiError.message);
        
        // If it's a 500 error, the endpoint might not be implemented yet
        if (apiError.response?.status === 500) {
          console.log('Payment methods endpoint returned 500 - endpoint may not be implemented');
          
          // For now, use mock data to test the UI flow
          // TODO: Remove this when the backend endpoint is properly implemented
          const mockPaymentMethods = [
            {
              id: 'mock-1',
              type: 'CREDIT_CARD',
              provider: 'Visa',
              accountName: 'John Doe',
              accountId: '1234',
              isDefault: true,
              status: 'ACTIVE',
              userId: user.id, // Add user ID to mock data
              metadata: {
                cardNumber: '4242 4242 4242 4242',
                expiryDate: '12/25',
                cvv: '123'
              }
            },
            {
              id: 'mock-2',
              type: 'MOBILE_MONEY',
              provider: 'M-Pesa',
              accountName: 'Mobile Money',
              accountId: user?.phoneNumber || '',
              isDefault: false,
              status: 'ACTIVE',
              userId: user.id, // Add user ID to mock data
              metadata: {
                phoneNumber: user?.phoneNumber || '',
                walletType: 'Mobile Money',
                providerId: 'mpesa'
              }
            }
          ];
          
          console.log('Using mock payment methods for current user:', user.id, mockPaymentMethods);
          setPaymentMethods(mockPaymentMethods);
          return true; // Return true to show that payment methods exist
        }
        
        // Re-throw other errors
        throw apiError;
      }
      
      const allPaymentMethods = response?.data?.data || [];
      
      console.log('Raw API response for payment methods:', {
        responseData: response?.data,
        allPaymentMethods: allPaymentMethods,
        firstPaymentMethod: allPaymentMethods[0] ? {
          id: allPaymentMethods[0].id,
          type: allPaymentMethods[0].type,
          metadata: allPaymentMethods[0].metadata,
          metadataType: typeof allPaymentMethods[0].metadata,
          metadataStringified: JSON.stringify(allPaymentMethods[0].metadata)
        } : null
      });
      
      // Filter payment methods by owner when possible; if backend already scopes, fallback to all
      let userPaymentMethods = allPaymentMethods.filter((pm: any) => {
        const ownerId = pm.userId || pm.customerId || pm.ownerId || pm.user?.id;
        return !ownerId || ownerId === user.id;
      });
      if (userPaymentMethods.length === 0 && allPaymentMethods.length > 0) {
        console.log('No explicit owner match; assuming backend already scoped to current user.');
        userPaymentMethods = allPaymentMethods;
      }
      
      // Parse metadata for each payment method if it's a string
      const parsedUserPaymentMethods = userPaymentMethods.map((pm: any) => {
        console.log('Processing payment method:', {
          id: pm.id,
          type: pm.type,
          rawMetadata: pm.metadata,
          metadataType: typeof pm.metadata,
          metadataStringified: JSON.stringify(pm.metadata)
        });
        
        let parsedMetadata = pm.metadata;
        if (typeof pm.metadata === 'string') {
          try {
            parsedMetadata = JSON.parse(pm.metadata);
            console.log('Successfully parsed metadata from string for payment method', pm.id, ':', parsedMetadata);
          } catch (error) {
            console.error('Failed to parse metadata for payment method', pm.id, ':', error);
            parsedMetadata = {};
          }
        } else if (pm.metadata && typeof pm.metadata === 'object') {
          console.log('Metadata is already an object for payment method', pm.id, ':', pm.metadata);
          parsedMetadata = pm.metadata;
        } else {
          console.log('Metadata is neither string nor object for payment method', pm.id, ':', pm.metadata);
          parsedMetadata = {};
        }
        
        return {
          ...pm,
          metadata: parsedMetadata
        };
      });
      
      console.log('Payment methods filtering results:', {
        currentUserId: user.id,
        totalPaymentMethods: allPaymentMethods.length,
        userPaymentMethodsCount: userPaymentMethods.length,
        userPaymentMethods: parsedUserPaymentMethods.map((pm: any) => ({
          id: pm.id,
          type: pm.type,
          provider: pm.provider,
          isDefault: pm.isDefault,
          userId: pm.userId,
          metadata: pm.metadata,
          metadataType: typeof pm.metadata
        }))
      });
      
      setPaymentMethods(parsedUserPaymentMethods);
      // Consider any existing method sufficient to proceed
      if (parsedUserPaymentMethods.length === 0) {
        console.log('No payment methods found for current user:', user.id);
        Alert.alert('No Payment Methods', 'You do not have any payment methods saved. Please add one to proceed.');
        return false;
      }
      return true;
      
    } catch (error: any) {
      console.error('Error checking payment methods:', error);
      
      // Handle specific error cases with user feedback
      if (error.response?.status === 401) {
        Alert.alert('Authentication Error', 'Please log in again to continue.');
      } else if (error.response?.status === 403) {
        Alert.alert('Access Denied', 'You do not have permission to access payment methods.');
      } else if (error.response?.status >= 500) {
        Alert.alert('Server Error', 'Unable to check payment methods. Please try again later.');
      } else {
        Alert.alert('Error', 'Unable to check payment methods. Please try again.');
      }
      
      setPaymentMethods([]);
      return false;
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  const handleUpdateDeliveryPricing = async () => {
    // Security check - only seller can update delivery pricing
    if (order?.sellerId !== user?.id) {
      Alert.alert('Access Denied', 'Only the product owner can update delivery pricing.');
      return;
    }

    // Clear previous validation errors
    setValidationErrors([]);
    
    // Validate inputs
    const errors: string[] = [];
    
    if (!selectedDeliveryOption && !customDeliveryPrice) {
      errors.push('Please select a delivery option or enter a custom price');
    }
    
    if (customDeliveryPrice && !customDeliveryCurrency) {
      errors.push('Please select a currency for the custom price');
    }
    
    if (customDeliveryPrice) {
      const price = parseFloat(customDeliveryPrice);
      if (isNaN(price) || price < 0) {
        errors.push('Please enter a valid price (must be a positive number)');
      }
    }
    
    if (!selectedDeliveryType) {
      errors.push('Please select a delivery type');
    }
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      Alert.alert('Validation Error', errors.join('\n'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    
    try {
      setUpdatingDelivery(true);
      
      const payload: any = {
        deliveryType: selectedDeliveryType,
        shippingMethod: deliveryTypeLabels[selectedDeliveryType as keyof typeof deliveryTypeLabels] || selectedDeliveryType
      };
      
      if (selectedDeliveryOption) {
        payload.deliveryOptionId = selectedDeliveryOption;
      } else if (customDeliveryPrice) {
        payload.customPrice = parseFloat(customDeliveryPrice);
        payload.customCurrency = customDeliveryCurrency;
      }
      
      const response = await api.patch(`/api/orders/${orderId}/delivery-pricing`, payload);
      
      if (order) {
        setOrder({
          ...order,
        shippingAmount: response.data.order.shippingAmount,
        deliveryCurrency: response.data.order.deliveryCurrency,
        totalAmount: response.data.order.totalAmount,
          shippingMethod: response.data.order.shippingMethod
        });
      }
      
      setShowDeliveryModal(false);
      Alert.alert('Success', 'Delivery pricing updated successfully');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error updating delivery pricing:', error);
      Alert.alert('Error', 'Failed to update delivery pricing');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setUpdatingDelivery(false);
    }
  };

  const handleUpdateProductPrice = async () => {
    // Security check - only seller can apply discount
    if (order?.sellerId !== user?.id) {
      Alert.alert('Access Denied', 'Only the product owner can apply discount.');
      return;
    }

    // Check if payment is completed
    if (order?.paymentStatus?.toLowerCase() === 'paid') {
      Alert.alert('Cannot Apply Discount', 'Discount cannot be applied after payment is completed.');
      return;
    }

    // Validate inputs
    if (!newProductPrice) {
      Alert.alert('Validation Error', 'Please enter a discount amount.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    const discountAmount = parseFloat(newProductPrice);
    if (isNaN(discountAmount) || discountAmount < 0) {
      Alert.alert('Validation Error', 'Please enter a valid discount amount (must be a positive number).');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    // Check if discount exceeds total amount
    if (order && discountAmount >= order.totalAmount) {
      Alert.alert('Validation Error', 'Discount amount cannot exceed or equal the total order amount.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    try {
      setUpdatingPrice(true);
      
      const payload = {
        newPrice: discountAmount,
        currency: newPriceCurrency
      };
      
      const response = await api.patch(`/api/orders/${orderId}/product-price`, payload);
      
      if (order) {
        setOrder({
          ...order,
          totalAmount: response.data.order.totalAmount,
          discountAmount: response.data.order.discountAmount,
          currencyCode: response.data.order.currencyCode,
          items: response.data.order.items
        });
      }
      
      setShowUpdatePriceModal(false);
      Alert.alert('Success', 'Discount applied successfully');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error applying discount:', error);
      Alert.alert('Error', 'Failed to apply discount');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setUpdatingPrice(false);
    }
  };

  const handleUpdateDiscount = async () => {
    // Security check - only seller can update discount
    if (order?.sellerId !== user?.id) {
      Alert.alert('Access Denied', 'Only the product owner can update discount.');
      return;
    }

    // Check if payment is completed or order is confirmed
    if (order?.paymentStatus?.toLowerCase() === 'paid' || order?.status === 'confirmed') {
      Alert.alert('Cannot Update Discount', 'Discount cannot be updated after payment is completed.');
      return;
    }

    // Validate discount amount
    const discountAmount = order?.discountAmount || 0;
    if (isNaN(discountAmount) || discountAmount < 0) {
      Alert.alert('Validation Error', 'Please enter a valid discount amount (must be a positive number).');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    try {
      setUpdatingPrice(true);
      
      const payload = {
        discountAmount: discountAmount,
        currency: order?.currencyCode
      };
      
      const response = await api.patch(`/api/orders/${orderId}/discount`, payload);
      
      if (order) {
        setOrder({
          ...order,
          totalAmount: response.data.order.totalAmount,
          discountAmount: response.data.order.discountAmount,
          currencyCode: response.data.order.currencyCode
        });
      }
      
      Alert.alert('Success', 'Discount updated successfully');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error updating discount:', error);
      Alert.alert('Error', 'Failed to update discount');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setUpdatingPrice(false);
    }
  };

  const updateOrderStatus = async (newStatus: string) => {
    try {
      setUpdatingStatus(true);
      
      // Check if this is a buyer action (authorize or cancel)
      const isBuyerAction = newStatus === 'authorized' || newStatus === 'cancelled';
      
      if (isBuyerAction) {
        // Use the buyer authorization endpoint
        const action = newStatus === 'authorized' ? 'authorize' : 'cancel';
        
        await api.patch(`/api/orders/${orderId}/authorize`, {
          action: action,
        }, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } else {
        // Use the original seller status update endpoint
        await api.patch(`/api/orders/${orderId}/status`, {
          status: newStatus,
        }, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
      
      setOrder(prev => prev ? { ...prev, status: newStatus } : null);
      Alert.alert('Success', `Order status updated to ${newStatus}`);
    } catch (error: any) {
      console.error('Error updating order status:', error);
      Alert.alert('Error', 'Failed to update order status. Please try again.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return '#F59E0B';
      case 'confirmed': return '#3B82F6';
      case 'processing': return '#8B5CF6';
      case 'shipped': return '#10B981';
      case 'delivered': return '#059669';
      case 'cancelled': return '#EF4444';
      case 'refunded': return '#6B7280';
      case 'authorized': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return '#F59E0B';
      case 'authorized': return '#3B82F6';
      case 'paid': return '#10B981';
      case 'failed': return '#EF4444';
      case 'refunded': return '#6B7280';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const renderPaymentMethodIcon = (method: any) => {
    const type = (method?.type || '').toString();
    if (type === 'MOBILE_MONEY') {
      const providerName = (method?.provider || method?.metadata?.providerName || '').toString().toLowerCase();
      if (providerName.includes('wave')) {
        return <Image source={waveImg} style={{ width: 32, height: 32, borderRadius: 6 }} />;
      }
      if (providerName.includes('yonna') || providerName.includes('aps')) {
        return <YonnaWalletIcon width={32} height={32} fill="#10B981" color="#10B981" stroke="#10B981" />;
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

  const formatPrice = (price: number, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAvailableStatuses = (currentStatus: string) => {
    const statusFlow = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['processing', 'cancelled'],
      'processing': ['shipped', 'cancelled'],
      'shipped': ['delivered'],
      'delivered': [],
      'cancelled': [],
      'refunded': [],
    };
    
    return statusFlow[currentStatus.toLowerCase() as keyof typeof statusFlow] || [];
  };

  const getBuyerAvailableStatuses = (currentStatus: string) => {
    // Updated buyer status flow based on new requirements
    const buyerStatusFlow = {
      'pending': ['authorized', 'cancelled'],      // Show both Authorize and Cancel
      'authorized': ['cancelled'],                 // Show only Cancel
      'confirmed': [],                             // Hide all buttons, show payment status
      'processing': [],                            // No buyer actions
      'shipped': [],                               // No buyer actions
      'delivered': [],                             // No buyer actions
      'cancelled': [],                             // No buyer actions
      'refunded': [],                              // No buyer actions
    };
    
    return buyerStatusFlow[currentStatus.toLowerCase() as keyof typeof buyerStatusFlow] || [];
  };

  // Fetch mobile wallet providers from database
  const fetchMobileWalletProviders = async () => {
    try {
      setLoadingProviders(true);
      const response = await api.get('/api/payment-gateway-service-providers');
      console.log('Mobile wallet providers response:', response.data);
      setMobileWalletProviders(response.data.providers || []);
      
      // Debug: Log the providers that were fetched
      console.log('Fetched providers:', response.data.providers);
      console.log('Provider count:', response.data.providers?.length || 0);
      
    } catch (error) {
      console.error('Error fetching mobile wallet providers:', error);
      // Fallback to empty array if API fails
      setMobileWalletProviders([]);
    } finally {
      setLoadingProviders(false);
    }
  };

  // Load mobile wallet providers only when user is authenticated (not needed for read-only view)
  useEffect(() => {
    if (user) {
      fetchMobileWalletProviders();
    }
  }, [user]);

  // Filter providers based on search
  const filteredProviders = useMemo(() => {
    console.log('Filtering providers. Total providers:', mobileWalletProviders.length);
    console.log('Search term:', providerSearch);
    
    if (!providerSearch) {
      console.log('No search term, returning all providers:', mobileWalletProviders);
      return mobileWalletProviders;
    }
    
    const search = providerSearch.toLowerCase();
    const filtered = mobileWalletProviders.filter(provider =>
      provider.name.toLowerCase().includes(search) ||
      provider.code?.toLowerCase().includes(search) ||
      provider.country?.toLowerCase().includes(search)
    );
    
    console.log('Filtered providers:', filtered);
    return filtered;
  }, [mobileWalletProviders, providerSearch]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar 
          barStyle="dark-content" 
          backgroundColor="#FFFFFF" 
          translucent={Platform.OS === 'android'}
        />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    // If unauthorized, show a friendly login prompt while keeping screen accessible
    if (unauthorized) {
      return (
        <SafeAreaView style={styles.container}>
          <StatusBar 
            barStyle="dark-content" 
            backgroundColor="#FFFFFF" 
            translucent={Platform.OS === 'android'}
          />
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Order Details</Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.errorContainer}>
            <Ionicons name="lock-closed-outline" size={48} color="#2563EB" />
            <Text style={styles.errorText}>
              Please login to view this order’s details.
            </Text>
            <TouchableOpacity
              onPress={() => navigation.getParent()?.navigate('Auth' as never)}
              style={styles.retryButton}
            >
              <Text style={styles.retryButtonText}>Login</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar 
          barStyle="dark-content" 
          backgroundColor="#FFFFFF" 
          translucent={Platform.OS === 'android'}
        />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error || 'Order not found'}</Text>
          <TouchableOpacity onPress={loadOrderDetails} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const availableStatuses = getAvailableStatuses(order.status);
  const buyerAvailableStatuses = getBuyerAvailableStatuses(order.status);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="#FFFFFF" 
        translucent={Platform.OS === 'android'}
      />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={styles.headerSpacer} /> 
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 140 }}
      >
        <View style={styles.statusSection}>
          <View style={styles.statusHeader}>
            <Text style={styles.sectionTitle}>Order Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(order.status)}20` }]}>
              <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </Text>
            </View>
          </View>

          {/* Professional Payment Status Display */}
          {order.paymentStatus && (
            <View style={styles.paymentStatusSection}>
              <View style={styles.paymentStatusHeader}>
                <View style={styles.paymentStatusIconContainer}>
                  <Ionicons 
                    name={order.paymentStatus.toLowerCase() === 'paid' ? 'checkmark-circle' : 
                          order.paymentStatus.toLowerCase() === 'pending' ? 'time' : 
                          order.paymentStatus.toLowerCase() === 'failed' ? 'close-circle' : 'card'} 
                    size={20} 
                    color={getPaymentStatusColor(order.paymentStatus)} 
                  />
                </View>
                <Text style={styles.paymentStatusTitle}>Payment Status</Text>
                <View style={[styles.paymentStatusBadge, { backgroundColor: `${getPaymentStatusColor(order.paymentStatus)}15` }]}>
                  <Text style={[styles.paymentStatusText, { color: getPaymentStatusColor(order.paymentStatus) }]}>
                    {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                  </Text>
                </View>
              </View>

              {/* Payment Method Information */}
              {order.paymentMethod && (
                <View style={styles.paymentMethodInfoRow}>
                  <View style={styles.paymentMethodIconContainer}>
                    <Ionicons name="card-outline" size={16} color="#6B7280" />
                  </View>
                  <Text style={styles.paymentMethodText}>
                    Method: {order.paymentMethod}
                  </Text>
                </View>
              )}

              {/* Payment Date Information */}
              {order.paidAt && (
                <View style={styles.paymentDateInfo}>
                  <View style={styles.paymentDateIconContainer}>
                    <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                  </View>
                  <Text style={styles.paymentDateText}>
                    Paid on {formatDate(order.paidAt)}
                  </Text>
                </View>
              )}

              {/* Payment Reference */}
              {order.paymentReference && (
                <View style={styles.paymentReferenceInfo}>
                  <View style={styles.paymentReferenceIconContainer}>
                    <Ionicons name="receipt-outline" size={16} color="#6B7280" />
                  </View>
                  <Text style={styles.paymentReferenceText}>
                    Reference: {order.paymentReference}
                  </Text>
                </View>
              )}
            </View>
          )}

          <Text style={styles.customerName}>Order #{order.orderNumber}</Text>

          {/* Buyer Status Actions - Only show to buyers */}
          {(() => {
            const currentUserId = user?.id;
            const orderSellerId = order?.sellerId;
            const isBuyer = currentUserId !== orderSellerId;
            
            if (!isBuyer) return null;
            
            // Show different actions based on order status
            if (order.status.toLowerCase() === 'pending') {
              // Pending: Show both Authorize and Cancel buttons (hide cancel if active transaction)
              return (
            <View style={styles.statusActions}>
                  <Text style={styles.statusActionsTitle}>Buyer Actions:</Text>
              <View style={styles.statusButtons}>
                  <TouchableOpacity
                      style={[styles.statusButton, styles.authorizeButton]}
                      onPress={() => updateOrderStatus('authorized')}
                    disabled={updatingStatus}
                  >
                      <Text style={[styles.statusButtonText, styles.authorizeButtonText]}>
                        Authorize Order
                    </Text>
                  </TouchableOpacity>
                    {/* Hide cancel button if there are active transactions */}
                    {!hasActiveTransaction && (
                      <TouchableOpacity
                        style={[styles.statusButton, styles.buyerCancelButton]}
                        onPress={() => updateOrderStatus('cancelled')}
                        disabled={updatingStatus}
                      >
                        <Text style={[styles.statusButtonText, styles.buyerCancelButtonText]}>
                          Cancel Order
                        </Text>
                      </TouchableOpacity>
                    )}
              </View>
            </View>
              );
            } else if (order.status.toLowerCase() === 'authorized') {
              // Authorized: Show only Cancel button (hide if active transaction)
              return (
                <View style={styles.statusActions}>
                  <Text style={styles.statusActionsTitle}>Buyer Actions:</Text>
                  <View style={styles.statusButtons}>
                    {/* Hide cancel button if there are active transactions */}
                    {!hasActiveTransaction ? (
                      <TouchableOpacity
                        style={[styles.statusButton, styles.buyerCancelButton]}
                        onPress={() => updateOrderStatus('cancelled')}
                        disabled={updatingStatus}
                      >
                        <Text style={[styles.statusButtonText, styles.buyerCancelButtonText]}>
                          Cancel Order
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={{
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        backgroundColor: '#FEF3C7',
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: '#F59E0B',
                      }}>
                        <Text style={{
                          color: '#92400E',
                          fontSize: 14,
                          fontWeight: '500',
                          textAlign: 'center',
                        }}>
                          Order cannot be cancelled while payment is in progress
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            } else if (order.status.toLowerCase() === 'confirmed') {
              // Confirmed: Hide buttons and show payment status prominently
              return (
                <View style={styles.statusActions}>
                  <Text style={styles.statusActionsTitle}>Payment Information:</Text>
                  {order.paymentStatus ? (
                    <View style={styles.paymentStatusDisplay}>
                      <View style={[styles.paymentStatusBadge, { backgroundColor: `${getPaymentStatusColor(order.paymentStatus)}15` }]}>
                        <Text style={[styles.paymentStatusText, { color: getPaymentStatusColor(order.paymentStatus) }]}>
                          {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                        </Text>
                      </View>
                      {order.paidAt && (
                        <Text style={styles.paymentDateText}>
                          Paid on {formatDate(order.paidAt)}
                        </Text>
                      )}
                    </View>
                  ) : (
                    <Text style={styles.noPaymentStatusText}>Payment status not available</Text>
                  )}
                </View>
              );
            }
            
            return null;
          })()}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{order.customer.name}</Text>
            <Text style={styles.customerEmail}>{order.customer.phone}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Order Items</Text>
            {/* Only show update price button if user is the seller AND payment is not completed */}
            {(() => {
              const currentUserId = user?.id;
              const orderSellerId = order?.sellerId;
              const isSeller = currentUserId === orderSellerId;
              const isPaymentCompleted = order.paymentStatus?.toLowerCase() === 'paid';
              
              return isSeller && !isPaymentCompleted ? (
                <TouchableOpacity
                  style={styles.updateButton}
                  onPress={() => {
                    setShowUpdatePriceModal(true);
                    // Initialize with empty discount
                    setNewProductPrice('');
                    setNewPriceCurrency(order.currencyCode);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }}
                >
                  <Ionicons name="pricetag-outline" size={16} color="#2563EB" />
                  <Text style={styles.updateButtonText}>Add Discount</Text>
                </TouchableOpacity>
              ) : null;
            })()}
          </View>
          <View style={styles.itemsContainer}>
            {order.items.map((item, index) => (
              <View key={item.id} style={[
                styles.orderItem,
                index === order.items.length - 1 && styles.lastOrderItem
              ]}>
              <Image
                source={{ 
                  uri: item.product.images && item.product.images.length > 0 
                    ? (item.product.images[0].startsWith('http') 
                        ? item.product.images[0] 
                        : `${API_URL}${item.product.images[0]}`)
                    : 'https://via.placeholder.com/80x80?text=No+Image'
                }}
                style={styles.productImage}
                resizeMode="cover"
              />
              <View style={styles.itemDetails}>
                <Text style={styles.productName}>{item.product.title}</Text>
                <Text style={styles.itemPrice}>
                  {formatPrice(item.unitPrice, order.currencyCode)} × {item.quantity}
                </Text>
                <Text style={styles.itemTotal}>
                  {formatPrice(item.totalPrice, order.currencyCode)}
                </Text>
              </View>
            </View>
          ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Delivery Information</Text>
            {/* Only show update button if user is the seller AND payment is not completed */}
            {(() => {
              const currentUserId = user?.id;
              const orderSellerId = order?.sellerId;
              const isSeller = currentUserId === orderSellerId;
              const isPaymentCompleted = order.paymentStatus?.toLowerCase() === 'paid';
              
              return isSeller && !isPaymentCompleted ? (
            <TouchableOpacity 
              style={styles.updateButton}
                  onPress={() => {
                    setShowDeliveryModal(true);
                    // Initialize with current shipping method if available
                    if (order.shippingMethod) {
                      const currentType = Object.keys(deliveryTypeLabels).find(
                        key => deliveryTypeLabels[key as keyof typeof deliveryTypeLabels] === order.shippingMethod
                      );
                      setSelectedDeliveryType(currentType || '');
                    } else {
                      setSelectedDeliveryType('');
                    }
                    setSelectedDeliveryOption('');
                    setCustomDeliveryPrice('');
                    setCustomDeliveryCurrency(order.currencyCode);
                    setValidationErrors([]);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }}
                >
                  <Ionicons name="create-outline" size={16} color="#2563EB" />
                  <Text style={styles.updateButtonText}>Add Delivery Price</Text>
            </TouchableOpacity>
              ) : null;
            })()}
          </View>
          
          {order.shippingAddress ? (
            <View style={styles.shippingAddress}>
              <View style={styles.addressRow}>
                <Text style={styles.addressLabel}>Address:</Text>
                <Text style={styles.addressValue}>{order.shippingAddress.address}</Text>
              </View>
              <View style={styles.addressRow}>
                <Text style={styles.addressLabel}>City:</Text>
                <Text style={styles.addressValue}>{order.shippingAddress.city}</Text>
              </View>
              <View style={styles.addressRow}>
                <Text style={styles.addressLabel}>State/Province:</Text>
                <Text style={styles.addressValue}>{order.shippingAddress.state}</Text>
              </View>
              {order.shippingAddress.postalCode && (
                <View style={styles.addressRow}>
                  <Text style={styles.addressLabel}>Postal Code:</Text>
                  <Text style={styles.addressValue}>{order.shippingAddress.postalCode}</Text>
                </View>
              )}
              <View style={styles.addressRow}>
                <Text style={styles.addressLabel}>Country:</Text>
                <Text style={styles.addressValue}>{order.shippingAddress.country}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.noAddressContainer}>
              <Text style={styles.noAddressText}>No delivery address provided</Text>
            </View>
          )}
          
          {order.shippingMethod && (
            <View style={styles.shippingInfo}>
              <Text style={styles.shippingMethod}>Method: {order.shippingMethod}</Text>
              {order.shippingAmount > 0 && (
                <Text style={styles.shippingAmount}>
                  Cost: {formatPrice(order.shippingAmount, order.deliveryCurrency || order.currencyCode)}
                </Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Order Date:</Text>
            <Text style={styles.summaryValue}>{formatDate(order.createdAt)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Last Updated:</Text>
            <Text style={styles.summaryValue}>{formatDate(order.updatedAt)}</Text>
          </View>
          {/* 1. Total Price (before discount) */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Price:</Text>
            <Text style={styles.summaryValue}>
              {(() => {
                const totalPrice = order.items.reduce((total, item) => total + (parseFloat(item.totalPrice?.toString() || '0') || 0), 0);
                console.log('Total Price Calculation:', { totalPrice, items: order.items });
                return formatPrice(totalPrice, order.currencyCode);
              })()}
            </Text>
          </View>
          
          {/* 2. Discount */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Discount:</Text>
            <View style={styles.discountRowContainer}>
              <Text style={[styles.summaryValue, styles.discountValue]}>
                -{formatPrice(order.discountAmount || 0, order.currencyCode)}
              </Text>
              {/* Always show discount amount, but only show edit button for the seller */}
              <View style={styles.discountEditContainer}>
                <Text style={styles.discountAmountText}>
                  {formatPrice(order.discountAmount || 0, order.currencyCode)}
                </Text>
                {order.sellerId === user?.id && order.status !== 'confirmed' && (
                  <TouchableOpacity
                    style={styles.editDiscountButton}
                    onPress={() => {
                      setNewProductPrice((order.discountAmount || 0).toString());
                      setNewPriceCurrency(order.currencyCode);
                      setShowUpdatePriceModal(true);
                    }}
                  >
                    <Ionicons name="pencil" size={16} color="#2563EB" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
          
          {/* 3. Subtotal (Total Price - Discount) */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal:</Text>
            <Text style={styles.summaryValue}>
              {(() => {
                const totalPrice = order.items.reduce((total, item) => total + (parseFloat(item.totalPrice?.toString() || '0') || 0), 0);
                const discount = parseFloat(order.discountAmount?.toString() || '0') || 0;
                const subtotal = totalPrice - discount;
                console.log('Subtotal Calculation:', { totalPrice, discount, subtotal });
                return formatPrice(subtotal, order.currencyCode);
              })()}
            </Text>
          </View>
          
          {/* 4. Delivery */}
          {order.shippingAmount > 0 ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery:</Text>
              <Text style={styles.summaryValue}>
                {formatPrice(order.shippingAmount, order.deliveryCurrency || order.currencyCode)}
              </Text>
            </View>
          ) : (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery:</Text>
              <Text style={styles.summaryValue}>To be determined</Text>
            </View>
          )}
          {/* 5. Grand Total (Subtotal + Delivery) */}
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Grand Total:</Text>
            <Text style={styles.totalValue}>
              {order.shippingAmount > 0 
                ? (() => {
                    const totalPrice = order.items.reduce((total, item) => total + (parseFloat(item.totalPrice?.toString() || '0') || 0), 0);
                    const discount = parseFloat(order.discountAmount?.toString() || '0') || 0;
                    const shipping = parseFloat(order.shippingAmount?.toString() || '0') || 0;
                    const subtotal = totalPrice - discount;
                    const grandTotal = subtotal + shipping;
                    console.log('Grand Total Calculation:', { totalPrice, discount, shipping, subtotal, grandTotal });
                    return formatPrice(grandTotal, order.currencyCode);
                  })()
                : 'Pending delivery cost'
              }
            </Text>
          </View>
          
          {order.shippingAmount === 0 && order.sellerId !== user?.id && (
            <View style={styles.deliveryNote}>
              <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
              <Text style={styles.deliveryNoteText}>
                Delivery cost will be added by the seller after reviewing your address
              </Text>
        </View>
          )}
        </View>

        {/* Checkout button moved to fixed footer */}

        {/* Payment Completed Section - Show when payment is completed */}
        {(() => {
          const currentUserId = user?.id;
          const orderSellerId = order?.sellerId;
          const isBuyer = currentUserId !== orderSellerId;
          const isPaid = order.paymentStatus?.toLowerCase() === 'paid';
          
          return isPaid && isBuyer ? (
            <View style={styles.paymentCompletedSection}>
              <View style={styles.paymentCompletedHeader}>
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                <Text style={styles.paymentCompletedTitle}>Payment Completed</Text>
              </View>
              <Text style={styles.paymentCompletedText}>
                Your payment of {formatPrice(order.totalAmount, order.currencyCode)} has been processed successfully.
              </Text>
              {order.paidAt && (
                <Text style={styles.paymentCompletedDate}>
                  Paid on {formatDate(order.paidAt)}
                </Text>
              )}
            </View>
          ) : null;
        })()}
      </ScrollView>

      {(() => {
        const currentUserId = user?.id;
        const orderSellerId = order?.sellerId;
        const isBuyer = currentUserId !== orderSellerId;
        const isAuthorized = order.status.toLowerCase() === 'authorized';
        const isNotPaid = !order.paymentStatus || order.paymentStatus.toLowerCase() !== 'paid';
        
        return isAuthorized && isNotPaid && isBuyer ? (
          <View style={[
            styles.footerContainer,
            { 
              paddingBottom: Math.max(insets.bottom, 12),
              paddingLeft: Math.max(insets.left, 16),
              paddingRight: Math.max(insets.right, 16),
            }
          ]}>
            <TouchableOpacity
              style={[
                styles.checkoutButton,
                (loadingPaymentMethods || checkingTransactions || !canMakePayment) && styles.disabledButton
              ]}
              onPress={async () => {
                if (!canMakePayment) {
                  Alert.alert(
                    'Payment Already in Progress',
                    'This order already has a payment transaction in progress. Please wait for it to complete.',
                    [{ text: 'OK' }]
                  );
                  return;
                }
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  const hasPaymentMethods = await checkPaymentMethodsWithUserFeedback();
                  if (hasPaymentMethods) {
                    setShowPaymentModal(true);
                  } else {
                    navigation.navigate('PaymentMethods');
                    setShowAddPaymentModal(false);
                    setShowPaymentModal(false);
                  }
                } catch (error) {
                  console.error('Error during checkout process:', error);
                  Alert.alert(
                    'Error',
                    'Unable to process checkout. Please try again.',
                    [{ text: 'OK' }]
                  );
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                }
              }}
              disabled={loadingPaymentMethods || checkingTransactions || !canMakePayment}
            >
              {(loadingPaymentMethods || checkingTransactions) ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="wallet-outline" size={20} color="#FFFFFF" />
              )}
              <Text style={styles.checkoutButtonText}>
                {checkingTransactions 
                  ? 'Checking Transactions...'
                  : loadingPaymentMethods 
                    ? 'Checking Payment Methods...' 
                    : !canMakePayment
                      ? 'Payment in Progress'
                      : paymentMethods.length > 0 
                        ? `Pay Now (${paymentMethods.length} payment method${paymentMethods.length > 1 ? 's' : ''})`
                        : 'Pay Now'
                }
              </Text>
            </TouchableOpacity>
            <Text style={styles.checkoutNote}>
              {!canMakePayment
                ? 'This order has a payment transaction in progress. Please wait for it to complete.'
                : paymentMethods.length > 0 
                  ? `You have ${paymentMethods.length} payment method${paymentMethods.length > 1 ? 's' : ''} available. Click to complete payment.`
                  : 'Your order has been authorized. Click to complete payment and finalize your purchase.'
              }
            </Text>
          </View>
        ) : null;
      })()}

      {/* Professional Bottom Sheet Modal - Only show if user is the seller */}
      {order?.sellerId === user?.id && (
      <Modal
        visible={showDeliveryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDeliveryModal(false)}
      >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <View style={[styles.modalContent, { maxHeight: screenHeight * 0.95, minHeight: screenHeight * 0.7 }]}>
              {/* Handle Bar */}
              <View style={styles.handleBar} />
              
              {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Delivery Pricing</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowDeliveryModal(false);
                    // Reset form
                    setSelectedDeliveryType('');
                    setSelectedDeliveryOption('');
                    setCustomDeliveryPrice('');
                    setCustomDeliveryCurrency('');
                    setValidationErrors([]);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={styles.closeButton}
                >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

              {/* Info Banner */}
              <View style={styles.infoBanner}>
                <View style={styles.infoHeader}>
                  <View style={styles.infoIconContainer}>
                    <Ionicons name="information-circle" size={20} color="#2563EB" />
                  </View>
                  <Text style={styles.infoTitle}>Complete the form below</Text>
                </View>
                <Text style={styles.infoDescription}>
                  Select a delivery type, then choose from available options or set a custom price. Scroll down to see all options.
                </Text>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Delivery Type Selection */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Delivery Type</Text>
                  <Text style={styles.modalSectionSubtitle}>
                    Select the type of delivery service for this order
                  </Text>
                  
                  <View style={styles.deliveryTypeGrid}>
                    {Object.entries(deliveryTypeLabels).map(([type, label]) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.deliveryTypeItem,
                          selectedDeliveryType === type && styles.selectedDeliveryTypeItem
                        ]}
                        onPress={() => {
                          setSelectedDeliveryType(type);
                          setValidationErrors([]);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                      >
                        <Text style={[
                          styles.deliveryTypeText,
                          selectedDeliveryType === type && styles.selectedDeliveryTypeText
                        ]}>
                          {label}
                        </Text>
                        {selectedDeliveryType === type && (
                          <View style={styles.selectedTypeIndicator}>
                            <Ionicons name="checkmark-circle" size={20} color="#2563EB" />
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                  {validationErrors.some(err => err.includes('delivery type')) && (
                    <Text style={styles.validationErrorText}>Please select a delivery type</Text>
                  )}
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Delivery Options */}
                {deliveryOptions.length > 0 && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Choose Delivery Option</Text>
                    <Text style={styles.modalSectionSubtitle}>
                      Select from available delivery options or set a custom price below
                    </Text>
                    
                    {deliveryOptions.map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                          styles.deliveryOptionItem,
                          selectedDeliveryOption === option.id && styles.selectedDeliveryOption
                        ]}
                        onPress={() => {
                          setSelectedDeliveryOption(option.id || '');
                          setCustomDeliveryPrice('');
                          setValidationErrors([]);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                      >
                        <View style={styles.deliveryOptionContent}>
                          <View style={styles.deliveryOptionHeader}>
                            <Text style={[
                              styles.deliveryOptionName,
                              selectedDeliveryOption === option.id && styles.selectedDeliveryOptionName
                            ]}>
                              {option.name}
                            </Text>
                            <Text style={[
                              styles.deliveryOptionPrice,
                              selectedDeliveryOption === option.id && styles.selectedDeliveryOptionPrice
                            ]}>
                          {formatPrice(option.price, option.currencyCode)}
                        </Text>
                      </View>
                          <Text style={[
                            styles.deliveryOptionDescription,
                            selectedDeliveryOption === option.id && styles.selectedDeliveryOptionDescription
                          ]}>
                        {option.description} • {option.estimatedDays} days
                      </Text>
                        </View>
                        {selectedDeliveryOption === option.id && (
                          <View style={styles.selectedIndicator}>
                            <Ionicons name="checkmark-circle" size={24} color="#2563EB" />
                          </View>
                        )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

                {/* Divider */}
                <View style={styles.divider} />

                {/* Custom Price */}
              <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Custom Delivery Price</Text>
                <Text style={styles.modalSectionSubtitle}>
                    Set your own delivery price and select from world currencies
                </Text>
                
                  <View style={styles.customPriceContainer}>
                <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Price</Text>
                      <View style={[
                        styles.priceInputContainer,
                        validationErrors.some(err => err.includes('price')) && styles.errorInputContainer
                      ]}>
                  <TextInput
                          style={styles.priceInput}
                          value={customDeliveryPrice}
                          onChangeText={(text) => {
                            setCustomDeliveryPrice(text);
                            setSelectedDeliveryOption('');
                            setValidationErrors([]);
                          }}
                    placeholder="0.00"
                    keyboardType="numeric"
                          placeholderTextColor="#9CA3AF"
                  />
                      </View>
                      {validationErrors.some(err => err.includes('price')) && (
                        <Text style={styles.validationErrorText}>Please enter a valid price</Text>
                      )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Currency</Text>
                      <View style={[
                        styles.currencyDisplayContainer,
                        validationErrors.some(err => err.includes('currency')) && styles.errorInputContainer
                      ]}>
                        <Text style={styles.currencyDisplayText}>
                          {order?.currencyCode || 'USD'}
                        </Text>
                        <Text style={styles.currencyNote}>
                          Order currency (fixed)
                        </Text>
                      </View>
                    </View>
                </View>
              </View>
            </ScrollView>

              {/* Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowDeliveryModal(false);
                    // Reset form
                    setSelectedDeliveryType('');
                    setSelectedDeliveryOption('');
                    setCustomDeliveryPrice('');
                    setCustomDeliveryCurrency('');
                    setValidationErrors([]);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                  style={[
                    styles.saveButton,
                    ((!selectedDeliveryOption && !customDeliveryPrice) || !selectedDeliveryType) && styles.disabledButton
                  ]}
                  onPress={handleUpdateDeliveryPricing}
                  disabled={updatingDelivery || (!selectedDeliveryOption && !customDeliveryPrice) || !selectedDeliveryType}
              >
                {updatingDelivery ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                    <Text style={styles.saveButtonText}>Add Price</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* Add Payment Method Modal - Bottom Sheet */}
      <Modal
        visible={showAddPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddPaymentModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { maxHeight: screenHeight * 0.75, minHeight: screenHeight * 0.75 }]}>
            {/* Handle Bar */}
            <View style={styles.handleBar} />
            
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Payment Methods</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddPaymentModal(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
        </View>

            {/* Payment Methods List */}
            <ScrollView style={styles.paymentMethodsList} showsVerticalScrollIndicator={false}>
              <Text style={styles.paymentMethodsSubtitle}>
                Select the payment methods you'd like to accept for this order
              </Text>
              
              {paymentMethodOptions.map((method) => (
                <View key={method.id} style={styles.paymentMethodCard}>
                  <View style={styles.paymentMethodCardContent}>
                    <View style={styles.paymentMethodInfo}>
                      <View style={styles.paymentMethodIcon}>
                        <Ionicons name={method.icon as any} size={24} color="#2563EB" />
                      </View>
                      <View style={styles.paymentMethodDetails}>
                        <Text style={styles.paymentMethodName}>{method.name}</Text>
                        <Text style={styles.paymentMethodDescription}>{method.description}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.toggleSwitch,
                        selectedPaymentMethods[method.id] && styles.toggleSwitchActive
                      ]}
                      onPress={() => handlePaymentMethodToggle(method.id)}
                    >
                      <View style={[
                        styles.toggleKnob,
                        selectedPaymentMethods[method.id] && styles.toggleKnobActive
                      ]} />
                    </TouchableOpacity>
                  </View>
                  
                  {/* Expandable Form */}
                  {selectedPaymentMethods[method.id] && expandedPaymentMethods[method.id] && (
                    <View style={styles.paymentMethodForm}>
                      <View style={styles.formHeader}>
                        <Text style={styles.formTitle}>Enter {method.name} Details</Text>
                        <TouchableOpacity
                          onPress={() => togglePaymentMethodExpansion(method.id)}
                          style={styles.collapseButton}
                        >
                          <Ionicons name="chevron-up" size={20} color="#6B7280" />
                        </TouchableOpacity>
                      </View>
                      
                      {/* Card Form */}
                      {method.id === 'card' && (
                        <View style={styles.formFields}>
                          <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Card Provider</Text>
                            <TextInput
                              style={styles.textInput}
                              value={paymentMethodForms.card.provider}
                              onChangeText={(text) => handlePaymentFormUpdate('card', 'provider', text)}
                              placeholder="e.g., Visa, Mastercard, American Express"
                              placeholderTextColor="#9CA3AF"
                            />
                          </View>
                          <View style={styles.inputGroup}>
                              <Text style={styles.inputLabel}>Cardholder Name</Text>
                              <TextInput
                                style={styles.textInput}
                                value={paymentMethodForms.card.cardholderName}
                                onChangeText={(text) => handlePaymentFormUpdate('card', 'cardholderName', text)}
                                placeholder="John Doe"
                                placeholderTextColor="#9CA3AF"
                            />
                          </View>
                        </View>
                      )}
                      
                      {/* Mobile Wallets Form */}
                      {method.id === 'mobileWallets' && (
                        <View style={styles.formFields}>
                          <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Wallet Provider</Text>
                            {loadingProviders ? (
                              <View style={styles.loadingContainer}>
                                <ActivityIndicator size="small" color="#2563EB" />
                                <Text style={styles.loadingText}>Loading providers...</Text>
                              </View>
                            ) : mobileWalletProviders.length > 0 ? (
                              <>
                                {/* Search Input */}
                                <TextInput
                                  style={styles.providerSearchInput}
                                  value={providerSearch}
                                  onChangeText={setProviderSearch}
                                  placeholder="Search mobile wallet providers..."
                                  placeholderTextColor="#9CA3AF"
                                />
                                
                                {/* Grid Layout Providers */}
                                <View style={styles.providerDropdown}>
                                  {filteredProviders.map((provider) => (
                                    <TouchableOpacity
                                      key={provider.id}
                                      style={[
                                        styles.providerOption,
                                        selectedMobileWalletProvider === provider.id && styles.providerOptionSelected
                                      ]}
                                      onPress={() => handleMobileWalletProviderSelect(provider.id)}
                                    >
                                      <View style={styles.providerContent}>
                                        <Ionicons 
                                          name="phone-portrait-outline" 
                                          size={16} 
                                          color={selectedMobileWalletProvider === provider.id ? '#FFFFFF' : '#6B7280'} 
                                        />
                                        <Text style={[
                                          styles.providerOptionText, 
                                          selectedMobileWalletProvider === provider.id && styles.providerOptionTextSelected
                                        ]}>
                                          {provider.name}
                                        </Text>
                                        {selectedMobileWalletProvider === provider.id && (
                                          <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                                        )}
                                      </View>
                                    </TouchableOpacity>
                                  ))}
                                </View>
                                
                                {/* No results message */}
                                {filteredProviders.length === 0 && providerSearch && (
                                  <View style={styles.noResultsContainer}>
                                    <Text style={styles.noResultsText}>No providers found for "{providerSearch}"</Text>
                                  </View>
                                )}
                              </>
                            ) : (
                              <View style={styles.noProvidersContainer}>
                                <Text style={styles.noProvidersText}>No mobile wallet providers available</Text>
                              </View>
                            )}
                          </View>
                          <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Phone Number</Text>
                            <TextInput
                              style={[styles.textInput, styles.disabledInput]}
                              value={paymentMethodForms.mobileWallets.phoneNumber}
                              onChangeText={(text) => handlePaymentFormUpdate('mobileWallets', 'phoneNumber', text)}
                              placeholder="Phone number from registration"
                              placeholderTextColor="#9CA3AF"
                              keyboardType="phone-pad"
                              editable={false}
                            />
                            <Text style={styles.inputHelperText}>
                              Using your registered phone number: {user?.phoneNumber}
                            </Text>
                          </View>
                          <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Wallet Type</Text>
                            <TextInput
                              style={styles.textInput}
                              value={paymentMethodForms.mobileWallets.walletType}
                              onChangeText={(text) => handlePaymentFormUpdate('mobileWallets', 'walletType', text)}
                              placeholder="e.g., Mobile Money, Digital Wallet"
                              placeholderTextColor="#9CA3AF"
                            />
                          </View>
                        </View>
                      )}
                      
                      {/* Default Payment Method Toggle */}
                      <View style={styles.defaultToggleContainer}>
                        <TouchableOpacity
                          style={styles.defaultToggle}
                          onPress={() => handlePaymentFormUpdate(method.id, 'isDefault', !paymentMethodForms[method.id].isDefault)}
                        >
                          <View style={[
                            styles.defaultToggleSwitch,
                            paymentMethodForms[method.id].isDefault && styles.defaultToggleSwitchActive
                          ]}>
                            <View style={[
                              styles.defaultToggleKnob,
                              paymentMethodForms[method.id].isDefault && styles.defaultToggleKnobActive
                            ]} />
                          </View>
                          <Text style={styles.defaultToggleText}>Set as default payment method</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                  
                  {/* Collapsed Form Indicator */}
                  {selectedPaymentMethods[method.id] && !expandedPaymentMethods[method.id] && (
                    <View style={styles.collapsedFormIndicator}>
                      <Text style={styles.collapsedFormText}>Form details hidden</Text>
                      <TouchableOpacity
                        onPress={() => togglePaymentMethodExpansion(method.id)}
                        style={styles.expandButton}
                      >
                        <Ionicons name="chevron-down" size={16} color="#2563EB" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>

            {/* Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowAddPaymentModal(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSavePaymentMethods}
              >
                <Text style={styles.saveButtonText}>Save & Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Payment Selection Modal - Show when user has payment methods */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { maxHeight: screenHeight * 0.95, minHeight: screenHeight * 0.95 }]}>
            {/* Handle Bar */}
            <View style={styles.handleBar} />
            
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Payment Method</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowPaymentModal(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Scrollable Content */}
            <ScrollView 
              style={styles.modalBody} 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {/* Info Banner */}
              <View style={styles.paymentInfoBanner}>
                <View style={styles.paymentInfoHeader}>
                  <View style={styles.paymentInfoIconContainer}>
                    <Ionicons name="information-circle" size={20} color="#2563EB" />
                  </View>
                  <Text style={styles.paymentInfoTitle}>Select Your Payment Method</Text>
                </View>
                <Text style={styles.paymentInfoDescription}>
                  Please select a payment method below. If you have a default method, it will be pre-selected. You can also add more payment methods if needed.
                </Text>
              </View>

              {/* Order Summary */}
              <View style={styles.orderSummaryCard}>
                <View style={styles.orderSummaryHeader}>
                  <View style={styles.orderSummaryIconContainer}>
                    <Ionicons name="receipt-outline" size={24} color="#2563EB" />
                  </View>
                  <View style={styles.orderSummaryHeaderText}>
                    <Text style={styles.orderSummaryTitle}>Order Summary</Text>
                    <Text style={styles.orderSummarySubtitle}>Review your order details</Text>
                  </View>
                </View>
                
                <View style={styles.orderSummaryDivider} />
                
                <View style={styles.orderSummaryContent}>
                  <View style={styles.orderSummaryRow}>
                    <View style={styles.orderSummaryLabelContainer}>
                      <Ionicons name="document-text-outline" size={16} color="#6B7280" />
                      <Text style={styles.orderSummaryLabel}>Order Number</Text>
                    </View>
                    <Text style={styles.orderSummaryValue} numberOfLines={1} ellipsizeMode="tail">
                      #{order?.orderNumber}
                    </Text>
                  </View>
                  
                  <View style={styles.orderSummaryRow}>
                    <View style={styles.orderSummaryLabelContainer}>
                      <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                      <Text style={styles.orderSummaryLabel}>Order Date</Text>
                    </View>
                    <Text style={styles.orderSummaryValue}>
                      {order?.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      }) : 'N/A'}
                    </Text>
                  </View>
                  
                  <View style={styles.orderSummaryRow}>
                    <View style={styles.orderSummaryLabelContainer}>
                      <Ionicons name="cube-outline" size={16} color="#6B7280" />
                      <Text style={styles.orderSummaryLabel}>Items</Text>
                    </View>
                    <Text style={styles.orderSummaryValue}>
                      {order?.items?.reduce((total, item) => total + item.quantity, 0) || 0} item{(order?.items?.reduce((total, item) => total + item.quantity, 0) || 0) !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  
                  {order?.shippingAmount > 0 && (
                    <View style={styles.orderSummaryRow}>
                      <View style={styles.orderSummaryLabelContainer}>
                        <Ionicons name="car-outline" size={16} color="#6B7280" />
                        <Text style={styles.orderSummaryLabel}>Delivery</Text>
                      </View>
                      <Text style={styles.orderSummaryValue}>
                        {formatPrice(order.shippingAmount, order.deliveryCurrency || order.currencyCode)}
                      </Text>
                    </View>
                  )}
                  
                  <View style={styles.orderSummaryTotalRow}>
                    <View style={styles.orderSummaryLabelContainer}>
                      <Ionicons name="card-outline" size={18} color="#059669" />
                      <Text style={styles.orderSummaryTotalLabel}>Total Amount</Text>
                    </View>
                    <Text style={styles.orderSummaryTotalValue}>
                      {formatPrice(order?.totalAmount || 0, order?.currencyCode || 'USD')}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Available Payment Methods */}
              <View style={styles.availablePaymentMethodsCard}>
                <Text style={styles.availablePaymentMethodsTitle}>Available Payment Methods</Text>
                
                {paymentMethods.map((method) => (
                  <TouchableOpacity
                    key={method.id}
                    style={[
                      styles.paymentMethodItem,
                      selectedPaymentMethod === method.id && styles.selectedPaymentMethodItem,
                      method.isDefault && styles.defaultPaymentMethodItem
                    ]}
                    onPress={() => handlePaymentMethodSelect(method.id)}
                  >
                    <View style={styles.paymentMethodItemIcon}>
                      {renderPaymentMethodIcon(method)}
                    </View>
                    <View style={styles.paymentMethodItemDetails}>
                      <View style={styles.paymentMethodItemHeader}>
                        <Text style={styles.paymentMethodItemProvider}>
                          {getPaymentMethodDisplayName(method)}
                        </Text>
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
                      <Text style={styles.paymentMethodItemAccount}>
                        {method.accountName}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Action Buttons - Fixed at bottom */}
            <View style={styles.paymentActionButtons}>
              <TouchableOpacity
                style={[
                  styles.proceedToCheckoutButton,
                  !selectedPaymentMethod && styles.disabledButton
                ]}
                onPress={handleProceedToPayment}
                disabled={!selectedPaymentMethod}
              >
                <Ionicons name="wallet-outline" size={20} color="#FFFFFF" />
                <Text style={styles.proceedToCheckoutButtonText}>
                  Process Payment
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.addMorePaymentButton}
                onPress={() => {
                  setShowPaymentModal(false);
                  navigation.navigate('PaymentMethods');
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
              >
                <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.addMorePaymentButtonText}>
                  Add More Payment Methods
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Update Price Modal - Bottom Sheet */}
      <Modal
        visible={showUpdatePriceModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowUpdatePriceModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { maxHeight: screenHeight * 0.85, minHeight: screenHeight * 0.8 }]}>
            {/* Handle Bar */}
            <View style={styles.handleBar} />
            
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Discount</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowUpdatePriceModal(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Info Banner */}
            <View style={styles.infoBanner}>
              <View style={styles.infoHeader}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="information-circle" size={20} color="#2563EB" />
                </View>
                <Text style={styles.infoTitle}>Edit Discount</Text>
              </View>
              <Text style={styles.infoDescription}>
                Update the discount amount for this order. The discount will be applied to the total price before delivery charges.
              </Text>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Current Order Summary */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Current Order Summary</Text>
                <View style={styles.currentPriceContainer}>
                  <View style={styles.currentPriceRow}>
                    <Text style={styles.currentPriceLabel}>Subtotal:</Text>
                    <Text style={styles.currentPriceValue}>
                      {order?.items && order.items.length > 0 
                        ? formatPrice(order.items.reduce((total, item) => total + item.totalPrice, 0), order.currencyCode)
                        : 'N/A'
                      }
                    </Text>
                  </View>
                  {order?.shippingAmount > 0 && (
                    <View style={styles.currentPriceRow}>
                      <Text style={styles.currentPriceLabel}>Delivery:</Text>
                      <Text style={styles.currentPriceValue}>
                        {formatPrice(order.shippingAmount, order.deliveryCurrency || order.currencyCode)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.currentPriceRow}>
                    <Text style={styles.currentPriceLabel}>Current Total:</Text>
                    <Text style={styles.currentPriceValue}>
                      {formatPrice(order?.totalAmount || 0, order?.currencyCode || 'USD')}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Discount Input */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Discount Amount</Text>
                <Text style={styles.modalSectionSubtitle}>
                  Enter the discount amount to apply to this order
                </Text>
                
                <View style={styles.priceUpdateContainer}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Discount Amount</Text>
                    <View style={styles.priceInputContainer}>
                      <TextInput
                        style={styles.priceInput}
                        value={newProductPrice}
                        onChangeText={setNewProductPrice}
                        placeholder="0.00"
                        keyboardType="numeric"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                  </View>
                </View>

                {/* Discount Preview */}
                {newProductPrice && (
                  <View style={styles.newTotalPreview}>
                    <Text style={styles.newTotalLabel}>Order Summary Preview:</Text>
                    <View style={styles.discountPreviewContainer}>
                      {/* 1. Total Price */}
                      <View style={styles.discountPreviewRow}>
                        <Text style={styles.discountPreviewLabel}>Total Price:</Text>
                        <Text style={styles.discountPreviewValue}>
                          {(() => {
                            const totalPrice = order?.items?.reduce((total, item) => total + (parseFloat(item.totalPrice?.toString() || '0') || 0), 0) || 0;
                            return formatPrice(totalPrice, order?.currencyCode || 'USD');
                          })()}
                        </Text>
                      </View>
                      {/* 2. Discount */}
                      <View style={styles.discountPreviewRow}>
                        <Text style={styles.discountPreviewLabel}>Discount:</Text>
                        <Text style={[styles.discountPreviewValue, styles.discountValue]}>
                          -{formatPrice(parseFloat(newProductPrice) || 0, order?.currencyCode || 'USD')}
                        </Text>
                      </View>
                      {/* 3. Subtotal */}
                      <View style={styles.discountPreviewRow}>
                        <Text style={styles.discountPreviewLabel}>Subtotal:</Text>
                        <Text style={styles.discountPreviewValue}>
                          {(() => {
                            const totalPrice = order?.items?.reduce((total, item) => total + (parseFloat(item.totalPrice?.toString() || '0') || 0), 0) || 0;
                            const discount = parseFloat(newProductPrice) || 0;
                            const subtotal = totalPrice - discount;
                            return formatPrice(subtotal, order?.currencyCode || 'USD');
                          })()}
                        </Text>
                      </View>
                      {/* 4. Delivery */}
                      {(order?.shippingAmount || 0) > 0 && (
                        <View style={styles.discountPreviewRow}>
                          <Text style={styles.discountPreviewLabel}>Delivery:</Text>
                          <Text style={styles.discountPreviewValue}>
                            {formatPrice(order?.shippingAmount || 0, order?.currencyCode || 'USD')}
                          </Text>
                        </View>
                      )}
                      {/* 5. Grand Total */}
                      <View style={[styles.discountPreviewRow, styles.discountPreviewTotal]}>
                        <Text style={styles.discountPreviewLabel}>Grand Total:</Text>
                        <Text style={styles.discountPreviewValue}>
                          {(() => {
                            const totalPrice = order?.items?.reduce((total, item) => total + (parseFloat(item.totalPrice?.toString() || '0') || 0), 0) || 0;
                            const discount = parseFloat(newProductPrice) || 0;
                            const shipping = parseFloat(order?.shippingAmount?.toString() || '0') || 0;
                            const subtotal = totalPrice - discount;
                            const grandTotal = subtotal + shipping;
                            return formatPrice(grandTotal, order?.currencyCode || 'USD');
                          })()}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowUpdatePriceModal(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  !newProductPrice && styles.disabledButton
                ]}
                onPress={handleUpdateProductPrice}
                disabled={updatingPrice || !newProductPrice}
              >
                {updatingPrice ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Update Discount</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Stripe Payment Modal */}
      <StripePayment
        visible={showStripePayment}
        onClose={() => setShowStripePayment(false)}
        amount={order?.totalAmount || 0}
        currency={order?.currencyCode || 'USD'}
        orderId={order?.id || ''}
        customerId={order?.customer?.id || user?.id || ''}
        onPaymentSuccess={handleStripePaymentSuccess}
        onPaymentError={handleStripePaymentError}
        userInfo={{
          firstName: user?.firstName || '',
          lastName: user?.lastName || ''
        }}
        transactionType="order"
      />

      {/* Yonna Forex Payment Modal */}
      <YonnaPaymentModal
        visible={showYonnaPayment}
        amount={order?.totalAmount || 0}
        currency={order?.currencyCode}
        orderId={order?.id}
        orderNumber={order?.orderNumber}
        onPaymentSuccess={async (transactionId: string) => {
          setShowYonnaPayment(false);
          await loadOrderDetails();
          Alert.alert(
            'Payment Successful', 
            `Your payment was processed successfully. Transaction ID: ${transactionId}`,
            [{ text: 'OK' }]
          );
        }}
        onPaymentError={(errorMsg: string) => {
          Alert.alert('Payment Error', errorMsg || 'Payment failed. Please try again.');
        }}
        onClose={() => setShowYonnaPayment(false)}
        onRefreshOrder={loadOrderDetails}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  statusSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 8,
  },
  statusActions: {
    marginTop: 16,
  },
  statusActionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  statusButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statusInfo: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  statusInfoText: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
  },
  customerInfo: {
    marginBottom: 8,
  },
  customerEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  itemsContainer: {
    marginTop: 16,
  },
  orderItem: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  lastOrderItem: {
    borderBottomWidth: 0,
    marginBottom: 0,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
    backgroundColor: '#F9FAFB',
  },
  itemDetails: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    lineHeight: 22,
  },
  itemPrice: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
  },
  shippingAddress: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  addressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    flex: 0,
    minWidth: 100,
  },
  addressValue: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    textAlign: 'right',
  },
  noAddressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
  },
  noAddressText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  shippingInfo: {
    marginBottom: 16,
  },
  shippingMethod: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  shippingAmount: {
    fontSize: 14,
    color: '#374151',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'right',
    flex: 1,
    flexWrap: 'wrap',
    maxWidth: '50%',
  },
  totalRow: {
    borderBottomWidth: 0,
  },
  totalLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  updateButton: {
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  updateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
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
    paddingBottom: 34,
    maxHeight: screenHeight * 0.9,
    minHeight: screenHeight * 0.9,
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
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  modalBody: {
    flex: 1,
    paddingBottom: 40,
  },
  modalSection: {
    marginBottom: 32,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  modalSectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  deliveryTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  deliveryTypeItem: {
    flex: 1,
    minWidth: '48%',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minHeight: 60,
  },
  selectedDeliveryTypeItem: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  deliveryTypeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 4,
  },
  selectedDeliveryTypeText: {
    color: '#1E40AF',
    fontWeight: '700',
  },
  selectedTypeIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  deliveryOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  selectedDeliveryOption: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  deliveryOptionContent: {
    flex: 1,
  },
  deliveryOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  deliveryOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  deliveryOptionPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
  },
  deliveryOptionDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
  },
  selectedIndicator: {
    marginLeft: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 32,
  },
  customPriceContainer: {
    gap: 24,
    marginTop: 12,
  },
  inputGroup: {
    marginBottom: 0,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  priceInputContainer: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  priceInput: {
    padding: 16,
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#E5E7EB',
  },
  deliveryNote: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
  },
  deliveryNoteText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  selectedDeliveryOptionName: {
    color: '#1E40AF',
    fontWeight: '700',
  },
  selectedDeliveryOptionPrice: {
    color: '#059669',
    fontWeight: '700',
  },
  selectedDeliveryOptionDescription: {
    color: '#374151',
    fontWeight: '500',
  },
  errorInputContainer: {
    borderColor: '#EF4444',
    borderWidth: 2,
  },
  validationErrorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  infoBanner: {
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoIconContainer: {
    padding: 6,
    backgroundColor: '#DBEAFE',
    borderRadius: 6,
    marginRight: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  infoDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  checkoutNote: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  checkoutSection: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginBottom: 16,
  },
  footerContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  checkoutButton: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  checkoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  authorizeButton: {
    backgroundColor: '#10B981',
  },
  authorizeButtonText: {
    color: '#FFFFFF',
  },
  buyerCancelButton: {
    backgroundColor: '#EF4444',
  },
  buyerCancelButtonText: {
    color: '#FFFFFF',
  },
  paymentMethodContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
  },
  paymentMethodContentContainer: {
    flexGrow: 1,
  },
  paymentContentWrapper: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  loadingPaymentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  loadingPaymentText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  paymentIconContainer: {
    marginBottom: 24,
    marginTop: 8,
  },
  paymentIconBackground: {
    padding: 20,
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
  },
  paymentTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  paymentDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  orderSummaryCard: {
    width: '100%',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  orderSummaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  orderSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  orderSummaryLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  orderSummaryLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  orderSummaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'right',
    flex: 1,
    flexWrap: 'wrap',
    maxWidth: '50%',
  },
  orderSummaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  orderSummaryTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  orderSummaryTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
  },
  orderSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
  orderSummarySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  orderSummaryDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  orderSummaryContent: {
    gap: 16,
  },
  orderNumberContainer: {
    marginBottom: 12,
  },
  orderNumberLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  orderNumberValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    lineHeight: 20,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  paymentActionButtons: {
    width: '100%',
    flexDirection: 'column',
    gap: 12,
  },
  addPaymentButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addPaymentButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelPaymentButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelPaymentButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  paymentMethodsList: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
  },
  paymentMethodsSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 20,
  },
  paymentMethodCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  paymentMethodCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentMethodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentMethodIcon: {
    width: 56,
    height: 56,
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  paymentMethodDetails: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  paymentMethodDescription: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 20,
  },
  toggleSwitch: {
    width: 48,
    height: 24,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleSwitchActive: {
    borderColor: '#2563EB',
    backgroundColor: '#2563EB',
  },
  toggleKnob: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  toggleKnobActive: {
    backgroundColor: '#FFFFFF',
    transform: [{ translateX: 24 }],
  },
  paymentMethodForm: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  collapseButton: {
    padding: 4,
  },
  formFields: {
    gap: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 16,
  },
  defaultToggleContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  defaultToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  defaultToggleSwitch: {
    width: 40,
    height: 24,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  defaultToggleSwitchActive: {
    borderColor: '#2563EB',
    backgroundColor: '#2563EB',
  },
  defaultToggleKnob: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  defaultToggleKnobActive: {
    backgroundColor: '#FFFFFF',
    transform: [{ translateX: 16 }],
  },
  defaultToggleText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  collapsedFormIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  collapsedFormText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  expandButton: {
    padding: 4,
  },
  disabledInput: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
  inputHelperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  availablePaymentMethodsCard: {
    marginBottom: 24,
    width: '100%',
  },
  availablePaymentMethodsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  paymentMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    width: '100%',
    minHeight: 90,
  },
  paymentMethodItemIcon: {
    width: 56,
    height: 56,
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  paymentMethodItemDetails: {
    flex: 1,
  },
  paymentMethodItemName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  paymentMethodItemType: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 20,
  },
  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#10B981',
    marginLeft: 8,
  },
  defaultBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  proceedToCheckoutButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#10B981',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  proceedToCheckoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  addMorePaymentButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addMorePaymentButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
  paymentMethodSelectionHint: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  paymentStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentStatusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginRight: 8,
  },
  paymentDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentDateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginRight: 8,
  },
  paymentDateValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  paymentCompletedSection: {
    padding: 16,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 12,
    marginBottom: 16,
    marginHorizontal: 16,
  },
  paymentCompletedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentCompletedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
    marginLeft: 8,
  },
  paymentCompletedText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  paymentCompletedDate: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  paymentInfoBanner: {
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  paymentInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentInfoIconContainer: {
    padding: 6,
    backgroundColor: '#DBEAFE',
    borderRadius: 6,
    marginRight: 12,
  },
  paymentInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  paymentInfoDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  paymentStatusDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  noPaymentStatusText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  paymentStatusSection: {
    marginBottom: 24,
  },
  paymentStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentStatusIconContainer: {
    padding: 6,
    backgroundColor: '#DBEAFE',
    borderRadius: 6,
    marginRight: 12,
  },
  paymentStatusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  paymentStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  paymentStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  paymentMethodInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentMethodIconContainer: {
    padding: 6,
    backgroundColor: '#DBEAFE',
    borderRadius: 6,
    marginRight: 12,
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  paymentDateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentDateIconContainer: {
    padding: 6,
    backgroundColor: '#DBEAFE',
    borderRadius: 6,
    marginRight: 12,
  },
  paymentDateText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  paymentReferenceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentReferenceIconContainer: {
    padding: 6,
    backgroundColor: '#DBEAFE',
    borderRadius: 6,
    marginRight: 12,
  },
  paymentReferenceText: {
    fontSize: 14,
    color: '#6B7280',
  },
  providerDropdown: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  providerOption: {
    flex: 1,
    minWidth: '48%',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minHeight: 60,
  },
  providerOptionSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  providerOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 4,
  },
  providerOptionTextSelected: {
    color: '#1E40AF',
    fontWeight: '700',
  },
  noProvidersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
  },
  noProvidersText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  providerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  providerSearchInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#374151',
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },

  noResultsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginTop: 8,
  },
  noResultsText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  currentPriceContainer: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  currentPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  currentPriceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  currentPriceValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  priceUpdateContainer: {
    gap: 24,
    marginTop: 12,
  },
  newTotalPreview: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 12,
  },
  newTotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  newTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  discountValue: {
    color: '#EF4444',
    fontWeight: '600',
  },
  editableDiscountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editableDiscountInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 80,
    textAlign: 'center',
  },
  saveDiscountButton: {
    backgroundColor: '#10B981',
    borderRadius: 6,
    padding: 6,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editDiscountButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
  },
  discountEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  discountAmountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  discountPreviewContainer: {
    marginTop: 12,
  },
  discountPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  discountPreviewTotal: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
    marginTop: 8,
  },
  discountPreviewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  discountPreviewValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  currencyDisplayContainer: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  currencyDisplayText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
    marginBottom: 4,
  },
  currencyNote: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },

});