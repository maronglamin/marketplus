import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import YonnaForexPaymentService, { SupportedCurrency } from '../services/YonnaForexPaymentService';
import { useAuth } from '../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

interface YonnaPaymentModalProps {
  visible: boolean;
  amount: number;
  currency?: string;
  orderId?: string;
  onPaymentSuccess: (transactionId: string) => void;
  onPaymentError: (error: string) => void;
  onClose: () => void;
}

const YonnaPaymentModal: React.FC<YonnaPaymentModalProps> = ({
  visible,
  amount,
  currency,
  orderId,
  onPaymentSuccess,
  onPaymentError,
  onClose,
}) => {
  const { user } = useAuth();
  const [currencies, setCurrencies] = useState<SupportedCurrency[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState('GMD'); // Fixed to GMD only
  const [userPhoneNumber, setUserPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCurrencies, setIsLoadingCurrencies] = useState(true);
  const [currentStep, setCurrentStep] = useState<'form' | 'summary' | 'processing'>('form');

  const paymentService = new YonnaForexPaymentService();
  const normalizedAmount = Number(amount) || 0;

  useEffect(() => {
    if (visible) {
      // Use the real currency from the order
      const orderCurrency = currency || 'GMD';
      setSelectedCurrency(orderCurrency);
      loadCurrencies();
      loadUserPhoneNumber();
      setCurrentStep('form');
      
      console.log('Yonna Payment Modal opened with currency:', orderCurrency);
    }
  }, [visible, user, currency]);

  const loadUserPhoneNumber = () => {
    if (user?.phoneNumber) {
      setUserPhoneNumber(user.phoneNumber);
    }
  };

  const loadCurrencies = async () => {
    try {
      setIsLoadingCurrencies(true);
      console.log('Loading currencies for Yonna Forex - GMD only');
      
      // Since Yonna Forex only supports GMD, we don't need to load from API
      const gmdCurrency = { code: 'GMD', name: 'Gambian Dalasi', symbol: 'D' };
      setCurrencies([gmdCurrency]);
      // Don't override the currency - keep the order's currency
      
      console.log('Currency options loaded:', gmdCurrency);
    } catch (error) {
      console.error('Error loading currencies:', error);
      // Fallback to GMD only
      const gmdCurrency = { code: 'GMD', name: 'Gambian Dalasi', symbol: 'D' };
      setCurrencies([gmdCurrency]);
      // Don't override the currency - keep the order's currency
      console.log('Fallback currency options loaded:', gmdCurrency);
    } finally {
      setIsLoadingCurrencies(false);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    console.log('formatAmount called with:', { amount, currency });
    
    // For GMD, use custom formatting since it might not be supported by Intl
    if (currency === 'GMD') {
      const formatted = `D ${amount.toFixed(2)}`;
      console.log('GMD formatted amount:', formatted);
      return formatted;
    }
    
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
    console.log('Intl formatted amount:', formatted);
    return formatted;
  };

  const handleProceedToSummary = () => {
    if (!userPhoneNumber) {
      Alert.alert('Error', 'Phone number is required for payment');
      return;
    }
    
    // Validate currency - only GMD is allowed for Yonna Forex
    if (selectedCurrency !== 'GMD') {
      Alert.alert(
        'Currency Not Supported',
        `Yonna Forex Wallet only supports GMD (Gambian Dalasi) currency. Your order is in ${selectedCurrency}. Please contact support for assistance with currency conversion or alternative payment methods.`,
        [{ text: 'OK' }]
      );
      return;
    }
    
    setCurrentStep('summary');
  };

  const handleConfirmPayment = async () => {
    if (!user?.id) {
      onPaymentError('User not authenticated');
      return;
    }

    setIsLoading(true);
    setCurrentStep('processing');

    try {
      const paymentRequest = {
        amount: normalizedAmount,
        currency: selectedCurrency,
        transactionId: `YF_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        countryCode: '+220',
        phoneNumber: userPhoneNumber,
        orderId: orderId,
      };

      const result = await paymentService.processPayment(paymentRequest);

      if (result.success) {
        onPaymentSuccess(result.data?.transactionId || '');
      } else {
        onPaymentError(result.message || 'Payment failed');
      }
    } catch (error: any) {
      console.error('Yonna payment error:', error);
      onPaymentError(error.message || 'Payment processing failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToForm = () => {
    setCurrentStep('form');
  };

  const renderFormStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Payment Details</Text>
      </View>

      {/* Amount Display */}
      <View style={styles.amountContainer}>
        <Text style={styles.amountLabel}>Amount to Pay</Text>
        <Text style={styles.amountValue}>{formatAmount(normalizedAmount, selectedCurrency)}</Text>
      </View>


      {/* Phone Number */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Phone Number</Text>
        <Text style={styles.phoneDisplay}>{userPhoneNumber}</Text>
        <Text style={styles.phoneNote}>Using phone number from your profile</Text>
      </View>

      {/* Description */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description</Text>
        <Text style={styles.descriptionDisplay}>
          Payment for Order #{orderId} via Yonna Forex Wallet
        </Text>
      </View>

      {/* Currency Notice */}
      {selectedCurrency !== 'GMD' ? (
        <View style={styles.currencyWarning}>
          <Ionicons name="warning" size={20} color="#F59E0B" />
          <Text style={styles.currencyWarningText}>
            Note: Yonna Forex Wallet typically supports GMD currency. 
            Your order is in {selectedCurrency}. Payment will be processed, but please verify with support if needed.
          </Text>
        </View>
      ) : (
        <View style={styles.currencyNotice}>
          <Ionicons name="information-circle" size={20} color="#3B82F6" />
          <Text style={styles.currencyNoticeText}>
            Yonna Forex Wallet supports GMD (Gambian Dalasi) currency
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.primaryButton, 
          (!userPhoneNumber || selectedCurrency !== 'GMD') && styles.primaryButtonDisabled
        ]}
        onPress={handleProceedToSummary}
        disabled={!userPhoneNumber || selectedCurrency !== 'GMD'}
      >
        <Text style={styles.primaryButtonText}>
          {selectedCurrency !== 'GMD' ? 'Currency Not Supported' : 'Review Payment'}
        </Text>
        <Ionicons name="arrow-forward" size={20} color="white" style={styles.buttonIcon} />
      </TouchableOpacity>
    </View>
  );

  const renderSummaryStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <TouchableOpacity onPress={handleBackToForm} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#3B82F6" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.stepTitle}>Payment Summary</Text>
          <Text style={styles.stepSubtitle}>Review before confirming</Text>
        </View>
      </View>

      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Payment Details</Text>
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Gateway</Text>
            <Text style={styles.summaryValue}>Yonna Forex Wallet</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Amount</Text>
            <Text style={[styles.summaryValue, styles.amountHighlight]}>
              {formatAmount(normalizedAmount, selectedCurrency)}
            </Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Currency</Text>
            <Text style={styles.summaryValue}>{selectedCurrency}</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Phone Number</Text>
            <Text style={styles.summaryValue}>{userPhoneNumber}</Text>
          </View>
          
          <View style={[styles.summaryItem, styles.descriptionItem]}>
            <Text style={styles.summaryLabel}>Description</Text>
            <Text style={[styles.summaryValue, styles.descriptionText]}>Payment for Order #{orderId} via Yonna Forex Wallet</Text>
          </View>

        </View>

        <View style={styles.securityNote}>
          <Ionicons name="shield-checkmark" size={20} color="#10B981" />
          <Text style={styles.securityText}>
            Your payment is secured by Yonna Forex's advanced encryption
          </Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleBackToForm}
          disabled={isLoading}
        >
          <Text style={styles.secondaryButtonText}>Back to Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.primaryButton, 
            isLoading && styles.primaryButtonDisabled
          ]}
          onPress={handleConfirmPayment}
          disabled={isLoading}
        >
          <Text style={styles.primaryButtonText}>Confirm Payment</Text>
          <Ionicons name="card" size={20} color="white" style={styles.buttonIcon} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderProcessingStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.processingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.processingTitle}>Processing Payment</Text>
        <Text style={styles.processingSubtitle}>
          Please wait while we process your payment through Yonna Forex
        </Text>
        <View style={styles.processingDetails}>
          <Text style={styles.processingDetailText}>
            Amount: {formatAmount(normalizedAmount, selectedCurrency)}
          </Text>
          <Text style={styles.processingDetailText}>
            Phone: {userPhoneNumber}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.title}>Yonna Wallet Payment</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {currentStep === 'form' && renderFormStep()}
          {currentStep === 'summary' && renderSummaryStep()}
          {currentStep === 'processing' && renderProcessingStep()}
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Secure payment powered by Yonna Forex
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    padding: 20,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  amountContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  amountLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  currencyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  currencyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: 'white',
  },
  currencyButtonSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  currencyButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  currencyButtonTextSelected: {
    color: 'white',
  },
  currencyErrorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    padding: 16,
  },
  currencyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF8FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  currencyNoticeText: {
    fontSize: 14,
    color: '#1E40AF',
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  currencyError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  currencyWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  currencyWarningText: {
    fontSize: 14,
    color: '#92400E',
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  phoneNote: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  phoneDisplay: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  descriptionDisplay: {
    fontSize: 14,
    color: '#6B7280',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  summaryContainer: {
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  descriptionText: {
    textAlign: 'left',
    flexWrap: 'wrap',
    maxWidth: '100%',
  },
  descriptionItem: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  amountHighlight: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  securityText: {
    fontSize: 12,
    color: '#059669',
    marginLeft: 8,
    flex: 1,
  },
  processingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  processingTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  processingSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  processingDetails: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    width: '100%',
  },
  processingDetailText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  buttonIcon: {
    marginLeft: 8,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});

export default YonnaPaymentModal;
