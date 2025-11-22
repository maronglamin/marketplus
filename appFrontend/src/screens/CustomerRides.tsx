import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  StatusBar,
  Platform,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  Animated,
  RefreshControl,
  ActivityIndicator,
  KeyboardAvoidingView,
  Dimensions,
  TextInput,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { AppStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StripePayment } from '../components/StripePayment';
import { stripeService } from '../services/stripeService';
import YonnaPaymentModal from '../components/YonnaPaymentModal';
import { YonnaForexPaymentService } from '../services/YonnaForexPaymentService';
import { TokenNotificationCard } from '../components/TokenNotificationCard';
import { useTokenNotification } from '../contexts/TokenNotificationContext';

const { height: screenHeight } = Dimensions.get('window');

type CustomerRidesNavigationProp = NativeStackNavigationProp<AppStackParamList, 'CustomerRides'>;

interface RideRequest {
  id: string;
  requestId: string;
  pickupLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  destinationLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  estimatedDistance: number | string;
  estimatedDuration: number | string;
  estimatedPrice: number | string;
  currency?: string;
  currencySymbol?: string;
  status: 'REQUESTED' | 'ACCEPTED' | 'ARRIVING' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
  paymentMethod: string;
  customerNotes?: string;
  requestedAt: string;
  expiresAt: string;
  driver?: {
    id: string;
    driverId: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      phoneNumber: string;
    };
    rating?: number;
    vehicleInfo?: any;
  } | null;
  ride?: {
    id: string;
    rideId: string;
    paymentStatus: 'PENDING' | 'AUTHORIZED' | 'PAID' | 'SETTLED' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
    customerRating?: number;
    customerReview?: string;
    totalFare: number;
    status: string;
  } | null;
}

export function CustomerRides() {
  const navigation = useNavigation<CustomerRidesNavigationProp>();
  const { user } = useAuth();
  const { checkActiveTokens } = useTokenNotification();
  
  // Ride requests state
  const [rideRequests, setRideRequests] = useState<RideRequest[]>([]);
  const [isLoadingRideRequests, setIsLoadingRideRequests] = useState(false);
  const [cardAnimations, setCardAnimations] = useState<Animated.Value[]>([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [allRideRequests, setAllRideRequests] = useState<RideRequest[]>([]);
  const ITEMS_PER_PAGE = 4;

  // Payment-related state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [showStripePayment, setShowStripePayment] = useState(false);
  const [processingStripePayment, setProcessingStripePayment] = useState(false);
  const [showYonnaPayment, setShowYonnaPayment] = useState(false);
  const [selectedRideForPayment, setSelectedRideForPayment] = useState<RideRequest | null>(null);
  const [modalKey, setModalKey] = useState(0); // Force modal re-render
  
  // Initialize Yonna Forex service
  const yonnaForexService = new YonnaForexPaymentService();

  // Normalize currency codes for payment providers (map symbols to ISO codes)
  const normalizeCurrencyCode = (currency?: string): string => {
    const code = (currency || '').trim().toUpperCase();
    if (!code) return 'GMD';
    if (code === 'D' || code === 'DALASI' || code === 'GAMBIAN DALASI') return 'GMD';
    return code;
  };

  // Rating-related state
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedRideForRating, setSelectedRideForRating] = useState<RideRequest | null>(null);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState<{rating: number, review?: string} | null>(null);

  // Load ride requests on component mount
  useEffect(() => {
    loadRideRequests(1, false);
    // Check for active tokens when component mounts
    checkActiveTokens();
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadRideRequests(1, false);
    }, [])
  );

  // Debug payment modal state
  useEffect(() => {
    console.log('🔍 Payment modal state changed:', {
      showPaymentModal,
      selectedRideForPayment: selectedRideForPayment?.requestId,
      modalKey
    });
  }, [showPaymentModal, selectedRideForPayment, modalKey]);

  const loadRideRequests = async (page: number = 1, append: boolean = false) => {
    try {
      if (page === 1) {
        setIsLoadingRideRequests(true);
      } else {
        setIsLoadingMore(true);
      }

      console.log('📋 Loading ride requests, page:', page);
      
      const response = await api.get('/api/ride-requests/customer/history');
      console.log('✅ Ride requests loaded:', response.data.data?.length || 0);
      
      if (response.data.success && response.data.data) {
        const newRequests = response.data.data.map((request: any) => ({
          id: request.id,
          requestId: request.requestId,
          pickupLocation: request.pickupLocation,
          destinationLocation: request.destinationLocation,
          estimatedDistance: request.estimatedDistance || 0,
          estimatedDuration: request.estimatedDuration || 0,
          estimatedPrice: request.estimatedPrice || 0,
          currency: request.currency || 'GMD',
          currencySymbol: request.currencySymbol || 'D',
          status: request.status,
          paymentMethod: request.paymentMethod,
          customerNotes: request.customerNotes,
          requestedAt: request.requestedAt || request.createdAt,
          expiresAt: request.expiresAt,
          driver: request.driver,
          ride: request.ride
        }));

        if (append && page > 1) {
          setAllRideRequests(prev => [...prev, ...newRequests]);
        } else {
          setAllRideRequests(newRequests);
          setCurrentPage(1);
        }
      } else {
        console.warn('⚠️ Failed to load ride requests:', response.data.message);
        if (page === 1) {
          setAllRideRequests([]);
        }
      }
    } catch (error: any) {
      console.error('❌ Error loading ride requests:', error);
      Alert.alert(
        'Error Loading Ride Requests',
        error.response?.data?.message || 'Failed to load your ride requests. Please try again.'
      );
      if (page === 1) {
        setAllRideRequests([]);
      }
    } finally {
      setIsLoadingRideRequests(false);
      setIsLoadingMore(false);
    }
  };

  // Handle pagination when allRideRequests changes
  useEffect(() => {
    if (allRideRequests.length > 0) {
      const endIndex = currentPage * ITEMS_PER_PAGE;
      const paginatedRequests = allRideRequests.slice(0, endIndex);
      
      setRideRequests(paginatedRequests);
      setHasMoreData(endIndex < allRideRequests.length);
      
      // Create animations for new cards only
      const newAnimations = paginatedRequests.map(() => new Animated.Value(0));
      setCardAnimations(newAnimations);
      
      // Animate cards from top to bottom
      newAnimations.forEach((animation: Animated.Value, index: number) => {
        Animated.timing(animation, {
          toValue: 1,
          duration: 300,
          delay: index * 100, // Stagger animation
          useNativeDriver: true,
        }).start();
      });
    }
  }, [allRideRequests, currentPage]);

  const loadMoreRideRequests = async () => {
    if (!isLoadingMore && hasMoreData) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      // No need to call loadRideRequests again, just update the page
      // The useEffect will handle the pagination
    }
  };

  // Utility functions
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      
      // Less than 1 hour
      if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return minutes <= 1 ? 'Just now' : `${minutes} minutes ago`;
      }
      
      // Less than 24 hours
      if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
      }
      
      // Less than 7 days
      if (diff < 604800000) {
        const days = Math.floor(diff / 86400000);
        return `${days} day${days > 1 ? 's' : ''} ago`;
      }
      
      // Format as date
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    } catch (error) {
      return 'Unknown date';
    }
  };

  const formatDistance = (distance: number | string) => {
    if (distance === undefined || distance === null) {
      return '0.0km';
    }
    // Convert string to number if needed
    const numericDistance = typeof distance === 'string' ? parseFloat(distance) : distance;
    if (isNaN(numericDistance)) {
      return '0.0km';
    }
    if (numericDistance < 1) {
      return `${Math.round(numericDistance * 1000)}m`;
    }
    return `${numericDistance.toFixed(1)}km`;
  };

  const formatDuration = (duration: number | string) => {
    if (duration === undefined || duration === null) {
      return '0 min';
    }
    // Convert string to number if needed
    const numericDuration = typeof duration === 'string' ? parseFloat(duration) : duration;
    if (isNaN(numericDuration)) {
      return '0 min';
    }
    if (numericDuration < 60) {
      return `${numericDuration} min`;
    }
    const hours = Math.floor(numericDuration / 60);
    const minutes = numericDuration % 60;
    return `${hours}h ${minutes}m`;
  };

  const formatPrice = (price: number | string, currencySymbol: string = 'D') => {
    if (price === undefined || price === null) {
      return `${currencySymbol}0.00`;
    }
    // Convert string to number if needed
    const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numericPrice)) {
      return `${currencySymbol}0.00`;
    }
    // Format with thousand separators and 2 decimal places
    return `${currencySymbol}${numericPrice.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'REQUESTED': return '#F59E0B';
      case 'ACCEPTED': return '#10B981';
      case 'ARRIVING': return '#3B82F6';
      case 'ARRIVED': return '#8B5CF6';
      case 'IN_PROGRESS': return '#06B6D4';
      case 'COMPLETED': return '#10B981';
      case 'CANCELLED': return '#EF4444';
      case 'EXPIRED': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'REQUESTED': return 'time-outline';
      case 'ACCEPTED': return 'checkmark-circle-outline';
      case 'ARRIVING': return 'car-outline';
      case 'ARRIVED': return 'location-outline';
      case 'IN_PROGRESS': return 'speedometer-outline';
      case 'COMPLETED': return 'checkmark-done-outline';
      case 'CANCELLED': return 'close-circle-outline';
      case 'EXPIRED': return 'time-outline';
      default: return 'help-circle-outline';
    }
  };

  // Payment methods functions
  const checkPaymentMethods = async (): Promise<boolean> => {
    try {
      setLoadingPaymentMethods(true);
      console.log('🔍 Checking payment methods...');
      
      const response = await api.get('/api/payment-methods');
      console.log('💳 Payment methods response:', response.data);
      
      if (response.data.success && response.data.data) {
        const methods = response.data.data;
        setPaymentMethods(methods);
        console.log('✅ Found payment methods:', methods.length);
        return methods.length > 0;
      } else {
        console.log('❌ No payment methods found or request failed');
        setPaymentMethods([]);
        return false;
      }
    } catch (error: any) {
      console.error('❌ Error fetching payment methods:', error);
      setPaymentMethods([]);
      return false;
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  const handlePaymentMethodSelect = (methodId: string) => {
    setSelectedPaymentMethod(methodId);
    console.log('💳 Selected payment method:', methodId);

    try {
      const method = paymentMethods.find(m => m.id === methodId);
      if (!method) {
        Alert.alert('Error', 'Selected payment method not found');
        return;
      }

      switch (method.type) {
        case 'CREDIT_CARD':
        case 'DEBIT_CARD': {
          console.log('💳 Proceeding with Stripe from method tap...');
          // Guard required data before opening Stripe modal
          if (!user?.id) {
            Alert.alert('Sign In Required', 'Please sign in to proceed with card payment.', [{ text: 'OK' }]);
            return;
          }
          if (!selectedRideForPayment?.requestId) {
            Alert.alert('Error', 'Missing ride reference. Please try again.');
            return;
          }
          setShowPaymentModal(false);
          setShowStripePayment(true);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        }
        case 'MOBILE_MONEY': {
          const providerName = (method.provider || method.metadata?.providerName || '').toString().toLowerCase();
          const isYonna = providerName.includes('yonna');
          if (isYonna) {
            console.log('💰 Proceeding with Yonna from method tap...');
            setShowPaymentModal(false);
            setShowYonnaPayment(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          } else {
            Alert.alert('Mobile Wallet Payment', `Redirecting to ${method.provider} payment gateway...`, [{ text: 'OK' }]);
          }
          break;
        }
        default: {
          Alert.alert('Payment Method Not Supported', 'This payment method is not currently supported for ride payments.', [{ text: 'OK' }]);
          break;
        }
      }
    } catch (error) {
      console.error('❌ Error in handlePaymentMethodSelect:', error);
    }
  };

  const getPaymentMethodDisplayName = (method: any): string => {
    switch (method.type) {
      case 'CREDIT_CARD': return method.provider || 'Credit Card';
      case 'MOBILE_MONEY': return method.provider || 'Mobile Money';
      case 'BANK_TRANSFER': return 'Bank Transfer';
      case 'CRYPTO': return 'Cryptocurrency';
      default: return method.provider || 'Payment Method';
    }
  };

  const handleProceedToPayment = async () => {
    try {
      console.log('🎯 handleProceedToPayment called');
      
      if (!selectedPaymentMethod) {
        Alert.alert('Error', 'Please select a payment method');
        return;
      }

      if (!selectedRideForPayment) {
        Alert.alert('Error', 'No ride selected for payment');
        return;
      }

      const selectedMethod = paymentMethods.find(method => method.id === selectedPaymentMethod);
      if (!selectedMethod) {
        Alert.alert('Error', 'Selected payment method not found');
        return;
      }

      console.log('💳 Processing payment with method:', selectedMethod.type);

      // Handle different payment method types
      switch (selectedMethod.type) {
        case 'CREDIT_CARD':
        case 'DEBIT_CARD':
          console.log('💳 Opening Stripe payment modal...');
          if (!user?.id) {
            Alert.alert(
              'Sign In Required',
              'Please sign in to proceed with card payment.',
              [{ text: 'OK' }]
            );
            return;
          }
          if (!selectedRideForPayment?.requestId) {
            Alert.alert('Error', 'Missing ride reference. Please try again.');
            return;
          }
          // Close the bottom sheet to avoid clipping
          setShowPaymentModal(false);
          setShowStripePayment(true);
          break;

        case 'MOBILE_MONEY':
          // Check if it's Yonna wallet
          const providerName = (selectedMethod.provider || selectedMethod.metadata?.providerName || '').toString().toLowerCase();
          const isYonna = providerName.includes('yonna');
          if (isYonna) {
            console.log('💰 Opening Yonna payment modal...');
            console.log('💰 Current showYonnaPayment state:', showYonnaPayment);
            console.log('💰 Current selectedRideForPayment:', selectedRideForPayment?.requestId);
            // Close the bottom sheet to avoid clipping
            setShowPaymentModal(false);
            setShowYonnaPayment(true);
            console.log('💰 Set showYonnaPayment to true');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            break;
          }
          // Fallback for other mobile wallets
          Alert.alert(
            'Mobile Wallet Payment',
            `Redirecting to ${selectedMethod.provider} payment gateway...`,
            [{ text: 'OK' }]
          );
          break;

        case 'BANK_TRANSFER':
          Alert.alert(
            'Bank Transfer Payment',
            'Bank transfer payments are not yet supported for ride payments.',
            [{ text: 'OK' }]
          );
          break;

        case 'CRYPTO':
          Alert.alert(
            'Cryptocurrency Payment',
            'Cryptocurrency payments are not yet supported for ride payments.',
            [{ text: 'OK' }]
          );
          break;

        default:
          Alert.alert(
            'Payment Method Not Supported',
            'This payment method is not currently supported for ride payments.',
            [{ text: 'OK' }]
          );
          break;
      }
    } catch (error: any) {
      console.error('❌ Error in handleProceedToPayment:', error);
      Alert.alert('Error', 'Failed to process payment. Please try again.');
    }
  };

  const handleStripePaymentSuccess = async (paymentIntentId: string) => {
    try {
      console.log('✅ Stripe payment successful:', paymentIntentId);
      
      if (!selectedRideForPayment) {
        throw new Error('No ride selected for payment');
      }

      // Process the ride payment
      const response = await api.post(`/api/ride-requests/${selectedRideForPayment.requestId}/process-payment`, {
        paymentIntentId,
        paymentMethod: 'CREDIT_CARD',
        amount: selectedRideForPayment.estimatedPrice
      });

      if (response.data.success) {
        console.log('✅ Ride payment processed successfully');
        
        // Close modals
        setShowStripePayment(false);
        setShowPaymentModal(false);
        
        // Reset states
        setSelectedRideForPayment(null);
        setSelectedPaymentMethod(null);
        
        // Show success message
        Alert.alert(
          'Payment Successful! 🎉',
          'Your ride payment has been processed successfully.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Reload ride requests to reflect payment status
                loadRideRequests(1, false);
              }
            }
          ]
        );
      } else {
        throw new Error(response.data.message || 'Payment processing failed');
      }
    } catch (error: any) {
      console.error('❌ Error processing ride payment:', error);
      setShowStripePayment(false);
      Alert.alert(
        'Payment Processing Failed',
        error.message || 'There was an error processing your payment. Please contact support.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleStripePaymentError = (error: string) => {
    console.error('❌ Stripe payment error:', error);
    setShowStripePayment(false);
    Alert.alert(
      'Payment Failed',
      error || 'There was an error processing your payment. Please try again.',
      [{ text: 'OK' }]
    );
  };

  const handleYonnaPaymentSuccess = async (transactionId: string) => {
    try {
      console.log('✅ Yonna payment successful:', transactionId);
      
      if (!selectedRideForPayment) {
        throw new Error('No ride selected for payment');
      }

      // Process the ride payment
      const response = await api.post(`/api/ride-requests/${selectedRideForPayment.requestId}/process-payment`, {
        paymentIntentId: transactionId,
        paymentMethod: 'YONNA_FOREX',
        amount: selectedRideForPayment.estimatedPrice
      });

      if (response.data.success) {
        console.log('✅ Ride payment processed successfully');
        
        // Close modals
        setShowYonnaPayment(false);
        setShowPaymentModal(false);
        
        // Reset states
        setSelectedRideForPayment(null);
        setSelectedPaymentMethod(null);
        
        // Show success message
        Alert.alert(
          'Payment Successful! 🎉',
          'Your ride payment has been processed successfully.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Reload ride requests to reflect payment status
                loadRideRequests(1, false);
              }
            }
          ]
        );
      } else {
        throw new Error(response.data.message || 'Payment processing failed');
      }
    } catch (error: any) {
      console.error('❌ Error processing ride payment:', error);
      setShowYonnaPayment(false);
      Alert.alert(
        'Payment Processing Failed',
        error.message || 'There was an error processing your payment. Please contact support.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleYonnaPaymentError = (error: string) => {
    console.error('❌ Yonna payment error:', error);
    setShowYonnaPayment(false);
    Alert.alert(
      'Payment Failed',
      error || 'There was an error processing your payment. Please try again.',
      [{ text: 'OK' }]
    );
  };

  const handlePayTrip = (ride: RideRequest) => {
    console.log('🎯 handlePayTrip called for ride:', ride.requestId);
    
    try {
      // Reset states
      setSelectedPaymentMethod(null);
      setModalKey(prev => prev + 1);
      
      // Set the selected ride
      setSelectedRideForPayment(ride);
      
      // Show modal immediately
      setShowPaymentModal(true);
      console.log('🚀 Modal should be visible now');
      
      // Load payment methods after modal is shown
      setTimeout(() => {
        console.log('📱 Starting payment methods check...');
        checkPaymentMethods().then((hasPaymentMethods) => {
          console.log('📱 Payment methods check result:', hasPaymentMethods);
          
          if (!hasPaymentMethods) {
            setShowPaymentModal(false);
            Alert.alert(
              'No Payment Methods',
              'You need to add a payment method before you can pay for this ride.',
              [
                {
                  text: 'Add Payment Method',
                  onPress: () => navigation.navigate('AccountSettings')
                },
                {
                  text: 'Cancel',
                  style: 'cancel'
                }
              ]
            );
            return;
          }

          // Set default payment method after a short delay
          setTimeout(() => {
            if (paymentMethods.length > 0 && !selectedPaymentMethod) {
              const defaultMethod = paymentMethods.find(method => method.isDefault);
              if (defaultMethod) {
                setSelectedPaymentMethod(defaultMethod.id);
                console.log('🔧 Set default payment method:', defaultMethod.id);
              } else {
                setSelectedPaymentMethod(paymentMethods[0].id);
                console.log('🔧 Set first payment method as default:', paymentMethods[0].id);
              }
            }
          }, 100);
        }).catch((error) => {
          console.error('❌ Error checking payment methods:', error);
          setShowPaymentModal(false);
          Alert.alert('Error', 'Failed to load payment methods. Please try again.');
        });
      }, 300);
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('❌ Error in handlePayTrip:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };



  // Rating functions
  const handleRateTrip = (ride: RideRequest) => {
    console.log('⭐ Opening rating modal for ride:', ride.requestId);
    setSelectedRideForRating(ride);
    setRating(0);
    setReview('');
    setShowRatingModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleSubmitRating = async () => {
    if (!selectedRideForRating || rating === 0) {
      Alert.alert('Error', 'Please select a rating before submitting.');
      return;
    }

    try {
      setSubmittingRating(true);
      console.log('⭐ Submitting rating:', { 
        rating, 
        review, 
        requestId: selectedRideForRating.requestId,
        hasRide: !!selectedRideForRating.ride,
        rideId: selectedRideForRating.ride?.id
      });

      const response = await api.post(`/api/ride-requests/${selectedRideForRating.requestId}/rate`, {
        rating,
        review
      });

      if (response.data.success) {
        console.log('✅ Rating submitted successfully');
        
        // Close modal
        setShowRatingModal(false);
        setSelectedRideForRating(null);
        setRating(0);
        setReview('');
        
        // Show success message and reload data immediately
        Alert.alert(
          'Rating Submitted! ⭐',
          'Thank you for your feedback. Your rating has been recorded.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Reload ride requests to reflect the rating
                loadRideRequests(1, false);
              }
            }
          ]
        );
        
        // Also reload data immediately without waiting for user to press OK
        setTimeout(() => {
          loadRideRequests(1, false);
        }, 500);
      } else {
        throw new Error(response.data.message || 'Failed to submit rating');
      }
    } catch (error: any) {
      console.error('❌ Error submitting rating:', error);
      Alert.alert(
        'Rating Submission Failed',
        error.response?.data?.message || error.message || 'There was an error submitting your rating. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleCancelRating = () => {
    setShowRatingModal(false);
    setSelectedRideForRating(null);
    setRating(0);
    setReview('');
  };

  const handleShowReview = (ride: RideRequest) => {
    if (ride.ride?.customerRating) {
      setSelectedReview({
        rating: ride.ride.customerRating,
        review: ride.ride.customerReview
      });
      setShowReviewModal(true);
    }
  };

  const handleCallDriver = (phoneNumber: string, driverName: string) => {
    Alert.alert(
      `Call ${driverName}`,
      `Would you like to call ${driverName}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Call',
          onPress: () => {
            Linking.openURL(`tel:${phoneNumber}`);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
            <Ionicons name="arrow-back" size={24} color="#6B7280" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Ride Requests</Text>
            <Text style={styles.subtitle}>Your ride history and active requests</Text>
          </View>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={() => loadRideRequests(1, false)}
            disabled={isLoadingRideRequests}
          >
            <Ionicons 
              name="refresh" 
              size={20} 
              color={isLoadingRideRequests ? "#9CA3AF" : "#14B8A6"} 
            />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoadingRideRequests}
              onRefresh={() => loadRideRequests(1, false)}
              colors={['#14B8A6']}
              tintColor="#14B8A6"
            />
          }
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            const paddingToBottom = 20;
            const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= 
              contentSize.height - paddingToBottom;
            
            if (isCloseToBottom && !isLoadingMore && hasMoreData) {
              loadMoreRideRequests();
            }
          }}
          scrollEventThrottle={400}
        >
          {rideRequests.length === 0 && !isLoadingRideRequests ? (
            <View style={styles.emptyState}>
              <Ionicons name="car-outline" size={64} color="#9CA3AF" />
              <Text style={styles.emptyStateTitle}>No Ride Requests</Text>
              <Text style={styles.emptyStateSubtitle}>
                You haven't made any ride requests yet. Start by booking your first ride!
              </Text>
              <TouchableOpacity 
                style={styles.bookRideButton}
                onPress={() => {
                  navigation.navigate('RideRequest');
                }}
              >
                <Text style={styles.bookRideButtonText}>Book Your First Ride</Text>
              </TouchableOpacity>
            </View>
          ) : (
            rideRequests.map((request, index) => (
                <Animated.View 
                  key={request.id} 
                  style={[
                    styles.rideRequestCard,
                    {
                      opacity: cardAnimations[index] || 0,
                      transform: [{
                        translateY: cardAnimations[index]?.interpolate({
                          inputRange: [0, 1],
                          outputRange: [50, 0]
                        }) || 50
                      }]
                    }
                  ]}
                >
                {/* Header */}
                <View style={styles.rideRequestHeader}>
                  <View style={styles.rideRequestInfo}>
                    <Text style={styles.rideRequestId}>#{request.requestId}</Text>
                    <Text style={styles.rideRequestDate}>
                      {formatDate(request.requestedAt)}
                    </Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: `${getStatusColor(request.status)}20` }
                  ]}>
                    <Ionicons 
                      name={getStatusIcon(request.status) as any} 
                      size={16} 
                      color={getStatusColor(request.status)} 
                    />
                    <Text style={[
                      styles.statusText,
                      { color: getStatusColor(request.status) }
                    ]}>
                      {request.status.replace('_', ' ')}
                    </Text>
                  </View>
                </View>

                {/* Route Information */}
                <View style={styles.routeContainer}>
                  <View style={styles.routePoint}>
                    <View style={styles.pickupIcon}>
                      <Ionicons name="location" size={16} color="#10B981" />
                    </View>
                    <View style={styles.routeInfo}>
                      <Text style={styles.routeLabel}>Pickup</Text>
                      <Text style={styles.routeAddress} numberOfLines={2}>
                        {request.pickupLocation.address}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.routeLine} />
                  
                  <View style={styles.routePoint}>
                    <View style={styles.destinationIcon}>
                      <Ionicons name="flag" size={16} color="#EF4444" />
                    </View>
                    <View style={styles.routeInfo}>
                      <Text style={styles.routeLabel}>Destination</Text>
                      <Text style={styles.routeAddress} numberOfLines={2}>
                        {request.destinationLocation.address}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Trip Details */}
                <View style={styles.tripDetails}>
                  <View style={styles.tripDetail}>
                    <Ionicons name="speedometer-outline" size={16} color="#6B7280" />
                    <Text style={styles.tripDetailText}>
                      {formatDistance(request.estimatedDistance)}
                    </Text>
                  </View>
                  <View style={styles.tripDetail}>
                    <Ionicons name="time-outline" size={16} color="#6B7280" />
                    <Text style={styles.tripDetailText}>
                      {formatDuration(request.estimatedDuration)}
                    </Text>
                  </View>
                  <View style={styles.tripDetail}>
                    <Ionicons name="card-outline" size={16} color="#6B7280" />
                    <Text style={styles.tripDetailText}>
                      {formatPrice(request.estimatedPrice, request.currencySymbol)}
                    </Text>
                  </View>

                </View>

                {/* Driver Information */}
                {request.driver && (
                  <View style={styles.driverContainer}>
                    <View style={styles.driverInfo}>
                      <View style={styles.driverAvatar}>
                        <Ionicons name="person" size={20} color="#FFFFFF" />
                      </View>
                      <View style={styles.driverDetails}>
                        <Text style={styles.driverName}>
                          {request.driver.user.firstName} {request.driver.user.lastName}
                        </Text>
                        <View style={styles.driverRating}>
                          <Ionicons name="star" size={14} color="#F59E0B" />
                          <Text style={styles.driverRatingText}>
                            {request.driver.rating?.toFixed(1) || '4.5'}
                          </Text>
                        </View>
                        {request.driver.vehicleInfo && (
                          <Text style={styles.vehicleInfo}>
                            {request.driver.vehicleInfo.model} • {request.driver.vehicleInfo.color} • {request.driver.vehicleInfo.plateNumber}
                          </Text>
                        )}
                      </View>
                    </View>
                    <TouchableOpacity 
                      style={styles.contactDriverButton}
                      onPress={() => handleCallDriver(
                        request.driver!.user.phoneNumber,
                        `${request.driver!.user.firstName} ${request.driver!.user.lastName}`
                      )}
                    >
                      <Ionicons name="call-outline" size={16} color="#14B8A6" />
                      <Text style={styles.contactDriverText}>Call</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  {/* Pay Trip Button - Only show when ride is COMPLETED and payment is PENDING */}
                  {request.ride && request.ride.status === 'COMPLETED' && request.ride.paymentStatus === 'PENDING' && (
                    <TouchableOpacity 
                      style={styles.rateButton}
                      onPress={() => handlePayTrip(request)}
                    >
                      <Ionicons name="wallet-outline" size={16} color="#F59E0B" />
                      <Text style={styles.rateButtonText}>Pay Trip</Text>
                    </TouchableOpacity>
                  )}

                  {/* Rate Trip Button - Show when ride is COMPLETED and no rating yet */}
                  {request.ride && request.ride.status === 'COMPLETED' && !request.ride.customerRating && request.ride.paymentStatus !== 'PENDING' && (
                    <TouchableOpacity 
                      style={styles.rateButton}
                      onPress={() => handleRateTrip(request)}
                    >
                      <Ionicons name="star-outline" size={16} color="#2563EB" />
                      <Text style={styles.rateButtonText}>Rate Trip</Text>
                    </TouchableOpacity>
                  )}

                  {/* Customer Rating Display - Show when rating exists */}
                  {request.ride && request.ride.customerRating && (
                    <TouchableOpacity 
                      style={styles.customerRatingContainer}
                      onPress={() => handleShowReview(request)}
                    >
                      <View style={styles.starRow}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Ionicons
                            key={star}
                            name={star <= (request.ride?.customerRating || 0) ? 'star' : 'star-outline'}
                            size={14}
                            color={star <= (request.ride?.customerRating || 0) ? '#F59E0B' : '#D1D5DB'}
                            style={styles.ratingStar}
                          />
                        ))}
                      </View>
                      <Text style={styles.customerRatingText}>
                        Your Rating
                      </Text>
                      {request.ride?.customerReview && (
                        <Text style={styles.customerReviewPreview} numberOfLines={1}>
                          "{request.ride.customerReview}"
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}

                  {/* Cancel Button - Only for REQUESTED status */}
                  {request.status === 'REQUESTED' && (
                    <TouchableOpacity style={styles.cancelButton}>
                      <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  )}

                  {/* View on Map Button - Show for ACCEPTED, CANCELLED, and other non-expired statuses */}
                  {request.status !== 'EXPIRED' && (
                    <TouchableOpacity 
                      style={styles.mapButton}
                      onPress={() => {
                        navigation.navigate('RideRequest', {
                          showRoute: true,
                          pickupLocation: request.pickupLocation,
                          destinationLocation: request.destinationLocation,
                          routeData: {
                            distance: typeof request.estimatedDistance === 'string' ? parseFloat(request.estimatedDistance) : request.estimatedDistance,
                            duration: typeof request.estimatedDuration === 'string' ? parseFloat(request.estimatedDuration) : request.estimatedDuration,
                            price: typeof request.estimatedPrice === 'string' ? parseFloat(request.estimatedPrice) : request.estimatedPrice
                          }
                        });
                      }}
                    >
                      <Ionicons name="map-outline" size={16} color="#2563EB" />
                      <Text style={styles.mapButtonText}>View on Map</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Animated.View>
            ))
          )}
          
          {/* Loading indicator for infinite scroll */}
          {isLoadingMore && (
            <View style={styles.loadingMoreContainer}>
              <ActivityIndicator size="small" color="#14B8A6" />
              <Text style={styles.loadingMoreText}>Loading more rides...</Text>
            </View>
          )}
          
          {/* End of data indicator */}
          {!hasMoreData && rideRequests.length > 0 && (
            <View style={styles.endOfDataContainer}>
              <Text style={styles.endOfDataText}>You've seen all your rides</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Payment Bottom Sheet Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContent,
            { height: Math.round(screenHeight * 0.9), width: '100%' }
          ]}>
            {/* Handle Bar */}
            <View style={styles.handleBar} />
            
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payment for Ride #{selectedRideForPayment?.requestId}</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowPaymentModal(false);
                  setSelectedRideForPayment(null);
                  setSelectedPaymentMethod(null);
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Trip Summary */}
            {selectedRideForPayment && (
              <View style={styles.tripSummaryCard}>
                <Text style={styles.tripSummaryTitle}>Trip Summary</Text>
                <View style={styles.tripSummaryRow}>
                  <Text style={styles.tripSummaryLabel}>Distance:</Text>
                  <Text style={styles.tripSummaryValue}>
                    {formatDistance(selectedRideForPayment.estimatedDistance)}
                  </Text>
                </View>
                <View style={styles.tripSummaryRow}>
                  <Text style={styles.tripSummaryLabel}>Duration:</Text>
                  <Text style={styles.tripSummaryValue}>
                    {formatDuration(selectedRideForPayment.estimatedDuration)}
                  </Text>
                </View>
                <View style={styles.tripSummaryRow}>
                  <Text style={styles.tripSummaryLabel}>Total Amount:</Text>
                  <Text style={styles.tripSummaryTotal}>
                    {formatPrice(selectedRideForPayment.estimatedPrice, selectedRideForPayment.currencySymbol)}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.modalInner}>
              <ScrollView 
                style={styles.modalBody} 
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
              >
                {/* Available Payment Methods */}
                <View style={styles.availablePaymentMethodsCard}>
                  <Text style={styles.availablePaymentMethodsTitle}>Available Payment Methods</Text>
                  
                  {loadingPaymentMethods ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color="#14B8A6" />
                      <Text style={styles.loadingText}>Loading payment methods...</Text>
                    </View>
                  ) : paymentMethods.length === 0 ? (
                    <View style={styles.noPaymentMethodsContainer}>
                      <Ionicons name="card-outline" size={48} color="#9CA3AF" />
                      <Text style={styles.noPaymentMethodsTitle}>No Payment Methods</Text>
                      <Text style={styles.noPaymentMethodsSubtitle}>
                        You need to add a payment method to pay for this ride.
                      </Text>
                      <TouchableOpacity 
                        style={styles.addPaymentMethodButton}
                        onPress={() => {
                          setShowPaymentModal(false);
                          setSelectedRideForPayment(null);
                          navigation.navigate('AccountSettings');
                        }}
                      >
                        <Text style={styles.addPaymentMethodButtonText}>Add Payment Method</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    paymentMethods.map((method) => (
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
                          <Ionicons 
                            name={method.type === 'CREDIT_CARD' ? 'card-outline' : 
                                 method.type === 'MOBILE_MONEY' ? 'phone-portrait-outline' :
                                 method.type === 'BANK_TRANSFER' ? 'business-outline' :
                                 method.type === 'CRYPTO' ? 'logo-bitcoin' : 'wallet-outline'} 
                            size={24} 
                            color="#2563EB" 
                          />
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
                    ))
                  )}
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
              </View>
            </View>
          </View>
        </View>

        {/* Stripe Payment Modal moved outside of this bottom sheet modal */}
      </Modal>

      {/* Yonna Payment Modal */}
      {(() => { 
        console.log('🎯 Yonna modal render check:', { 
          selectedRideForPayment: !!selectedRideForPayment, 
          showYonnaPayment, 
          shouldRender: selectedRideForPayment && showYonnaPayment 
        }); 
        return null; 
      })()}
      <YonnaPaymentModal
        visible={showYonnaPayment && !!selectedRideForPayment}
        onClose={() => {
          setShowYonnaPayment(false);
          setSelectedRideForPayment(null);
        }}
        amount={selectedRideForPayment ? (typeof selectedRideForPayment.estimatedPrice === 'string' ? parseFloat(selectedRideForPayment.estimatedPrice) : selectedRideForPayment.estimatedPrice) : 0}
        currency={normalizeCurrencyCode(selectedRideForPayment?.currency)}
        orderId={selectedRideForPayment?.requestId || ''}
        onPaymentSuccess={handleYonnaPaymentSuccess}
        onPaymentError={handleYonnaPaymentError}
        transactionType="ride"
      />

    {/* Stripe Payment Modal - placed at root level to avoid nesting under bottom sheet */}
    {(() => {
      const stripeOrderId = selectedRideForPayment?.requestId || selectedRideForPayment?.id || '';
      const stripeCustomerId = user?.id ? String(user.id) : '';
      const canRenderStripe = showStripePayment && !!selectedRideForPayment && !!stripeOrderId && !!stripeCustomerId;
      return canRenderStripe ? (
        <StripePayment
          visible={showStripePayment}
          onClose={() => setShowStripePayment(false)}
          amount={typeof selectedRideForPayment!.estimatedPrice === 'string' ? parseFloat(selectedRideForPayment!.estimatedPrice) : selectedRideForPayment!.estimatedPrice}
          currency={normalizeCurrencyCode(selectedRideForPayment!.currency)}
          orderId={stripeOrderId}
          customerId={stripeCustomerId}
          onPaymentSuccess={handleStripePaymentSuccess}
          onPaymentError={handleStripePaymentError}
          userInfo={{ firstName: user?.firstName || '', lastName: user?.lastName || '' }}
          transactionType="ride"
        />
      ) : null;
    })()}

      {/* Rating Modal */}
      <Modal
        visible={showRatingModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCancelRating}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { maxHeight: screenHeight * 0.9, minHeight: screenHeight * 0.85 }]}>
            {/* Handle Bar */}
            <View style={styles.handleBar} />
            
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rate Your Trip</Text>
              <TouchableOpacity
                onPress={handleCancelRating}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Rating Content */}
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Trip Summary */}
              {selectedRideForRating && (
                <View style={styles.tripSummaryCard}>
                  <Text style={styles.tripSummaryTitle}>Trip Summary</Text>
                  <View style={styles.tripSummaryRow}>
                    <Text style={styles.tripSummaryLabel}>From:</Text>
                    <Text style={styles.tripSummaryValue} numberOfLines={2} ellipsizeMode="tail">
                      {selectedRideForRating.pickupLocation.address}
                    </Text>
                  </View>
                  <View style={styles.tripSummaryRow}>
                    <Text style={styles.tripSummaryLabel}>To:</Text>
                    <Text style={styles.tripSummaryValue} numberOfLines={2} ellipsizeMode="tail">
                      {selectedRideForRating.destinationLocation.address}
                    </Text>
                  </View>
                  <View style={styles.tripSummaryRow}>
                    <Text style={styles.tripSummaryLabel}>Driver:</Text>
                    <Text style={styles.tripSummaryValue}>
                      {selectedRideForRating.driver ? 
                        `${selectedRideForRating.driver.user.firstName} ${selectedRideForRating.driver.user.lastName}` : 
                        'Unknown'
                      }
                    </Text>
                  </View>
                </View>
              )}

              {/* Rating Section */}
              <View style={styles.ratingSection}>
                <Text style={styles.ratingTitle}>How was your trip?</Text>
                <Text style={styles.ratingSubtitle}>Tap the stars to rate your experience</Text>
                
                {/* Star Rating */}
                <View style={styles.starContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      style={styles.starButton}
                      onPress={() => setRating(star)}
                    >
                      <Ionicons
                        name={star <= rating ? 'star' : 'star-outline'}
                        size={32}
                        color={star <= rating ? '#F59E0B' : '#D1D5DB'}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                
                <Text style={styles.ratingText}>
                  {rating === 0 && 'Tap to rate'}
                  {rating === 1 && 'Poor'}
                  {rating === 2 && 'Fair'}
                  {rating === 3 && 'Good'}
                  {rating === 4 && 'Very Good'}
                  {rating === 5 && 'Excellent'}
                </Text>
              </View>

              {/* Review Section */}
              <View style={styles.reviewSection}>
                <Text style={styles.reviewTitle}>Share your experience (optional)</Text>
                <TextInput
                  style={styles.reviewInput}
                  placeholder="Tell us about your trip experience..."
                  placeholderTextColor="#9CA3AF"
                  value={review}
                  onChangeText={setReview}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.paymentActionButtons}>
              <TouchableOpacity
                style={[
                  styles.proceedToCheckoutButton,
                  rating === 0 && styles.disabledButton
                ]}
                onPress={handleSubmitRating}
                disabled={rating === 0 || submittingRating}
              >
                {submittingRating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                )}
                <Text style={styles.proceedToCheckoutButtonText}>
                  {submittingRating ? 'Submitting...' : 'Submit Rating'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Review Display Modal */}
      <Modal
        visible={showReviewModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReviewModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { maxHeight: screenHeight * 0.6, minHeight: screenHeight * 0.5 }]}>
            {/* Handle Bar */}
            <View style={styles.handleBar} />
            
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Your Trip Review</Text>
              <TouchableOpacity
                onPress={() => setShowReviewModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Review Content */}
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {selectedReview && (
                <View style={styles.reviewDisplayCard}>
                  <Text style={styles.reviewDisplayTitle}>Your Rating</Text>
                  
                  {/* Star Rating Display */}
                  <View style={styles.reviewStarContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons
                        key={star}
                        name={star <= selectedReview.rating ? 'star' : 'star-outline'}
                        size={32}
                        color={star <= selectedReview.rating ? '#F59E0B' : '#D1D5DB'}
                        style={styles.reviewDisplayStar}
                      />
                    ))}
                  </View>
                  
                  <Text style={styles.reviewDisplayRatingText}>
                    {selectedReview.rating === 1 && 'Poor'}
                    {selectedReview.rating === 2 && 'Fair'}
                    {selectedReview.rating === 3 && 'Good'}
                    {selectedReview.rating === 4 && 'Very Good'}
                    {selectedReview.rating === 5 && 'Excellent'}
                  </Text>

                  {/* Review Text */}
                  {selectedReview.review && (
                    <View style={styles.reviewDisplaySection}>
                      <Text style={styles.reviewDisplaySectionTitle}>Your Review</Text>
                      <Text style={styles.reviewDisplayText}>
                        "{selectedReview.review}"
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Token Notification Card */}
      <TokenNotificationCard />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  titleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  refreshButton: {
    padding: 8,
  },

  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  bookRideButton: {
    backgroundColor: '#14B8A6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  bookRideButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  rideRequestCard: {
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
  rideRequestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rideRequestInfo: {
    flex: 1,
  },
  rideRequestId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  rideRequestDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
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
    backgroundColor: '#FEE6E6',
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
    fontWeight: '500',
  },
  routeAddress: {
    fontSize: 14,
    color: '#1F2937',
    marginTop: 2,
  },
  routeLine: {
    width: 1,
    height: 20,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 12,
  },
  tripDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  tripDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tripDetailText: {
    fontSize: 12,
    color: '#374151',
    marginLeft: 4,
    fontWeight: '500',
  },
  driverContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  driverAvatar: {
    width: 40,
    height: 40,
    backgroundColor: '#14B8A6',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  driverRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  driverRatingText: {
    fontSize: 12,
    color: '#F59E0B',
    marginLeft: 4,
    fontWeight: '500',
  },
  vehicleInfo: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  contactDriverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#14B8A6',
  },
  contactDriverText: {
    fontSize: 12,
    color: '#14B8A6',
    marginLeft: 4,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  rateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6F3FF',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  rateButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
    marginLeft: 4,
  },
  customerRatingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingStar: {
    marginHorizontal: 1,
  },
  customerRatingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
  },
  customerReviewPreview: {
    fontSize: 10,
    color: '#92400E',
    fontStyle: 'italic',
    marginTop: 2,
    textAlign: 'center',
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
    marginLeft: 4,
  },
  mapButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6F3FF',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  mapButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
    marginLeft: 4,
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingMoreText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  endOfDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  endOfDataText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  // Payment Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'stretch',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    overflow: 'hidden',
  },
  modalInner: {
    flex: 1,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  tripSummaryCard: {
    backgroundColor: '#F8FAFC',
    marginHorizontal: 20,
    marginVertical: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  tripSummaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 16,
  },
  tripSummaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  tripSummaryLabel: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
    width: 60,
    flexShrink: 0,
  },
  tripSummaryValue: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  tripSummaryTotal: {
    fontSize: 18,
    color: '#059669',
    fontWeight: '700',
  },
  modalBody: {
    flex: 1,
  },
  availablePaymentMethodsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  availablePaymentMethodsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  noPaymentMethodsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noPaymentMethodsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  noPaymentMethodsSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  addPaymentMethodButton: {
    backgroundColor: '#14B8A6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  addPaymentMethodButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  paymentMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPaymentMethodItem: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  defaultPaymentMethodItem: {
    borderColor: '#059669',
  },
  paymentMethodItemIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  paymentMethodItemDetails: {
    flex: 1,
  },
  paymentMethodItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentMethodItemProvider: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  paymentMethodItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  defaultBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 8,
  },
  defaultBadgeText: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '600',
  },
  paymentMethodItemArrow: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentMethodItemAccount: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  paymentActionButtons: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  proceedToCheckoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  proceedToCheckoutButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  // Rating Modal Styles
  ratingSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  ratingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    textAlign: 'center',
  },
  ratingSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  starContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  starButton: {
    padding: 8,
    marginHorizontal: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F59E0B',
    textAlign: 'center',
  },
  reviewSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 12,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#1F2937',
    backgroundColor: '#F8FAFC',
    minHeight: 100,
  },
  // Review Display Modal Styles
  reviewDisplayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  reviewDisplayTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 16,
    textAlign: 'center',
  },
  reviewStarContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  reviewDisplayStar: {
    marginHorizontal: 4,
  },
  reviewDisplayRatingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F59E0B',
    textAlign: 'center',
    marginBottom: 20,
  },
  reviewDisplaySection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  reviewDisplaySectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 12,
  },
  reviewDisplayText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    fontStyle: 'italic',
  },
});