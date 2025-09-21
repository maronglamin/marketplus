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
} from 'react-native';
import YonnaForexPaymentService, { SupportedCurrency } from '../services/YonnaForexPaymentService';
import { useAuth } from '../contexts/AuthContext';

interface YonnaForexPaymentFormProps {
  amount: number;
  onPaymentSuccess: (transactionId: string) => void;
  onPaymentError: (error: string) => void;
  onCancel: () => void;
}

const YonnaForexPaymentForm: React.FC<YonnaForexPaymentFormProps> = ({
  amount,
  onPaymentSuccess,
  onPaymentError,
  onCancel,
}) => {
  const { user } = useAuth();
  const [currencies, setCurrencies] = useState<SupportedCurrency[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState('GMD');
  const [userPhoneNumber, setUserPhoneNumber] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCurrencies, setIsLoadingCurrencies] = useState(true);
  const [showPaymentSummary, setShowPaymentSummary] = useState(false);

  const paymentService = new YonnaForexPaymentService();
  const normalizedAmount = Number(amount) || 0;

  useEffect(() => {
    loadCurrencies();
    loadUserPhoneNumber();
  }, [user]);

  const loadUserPhoneNumber = () => {
    if (user?.phoneNumber) {
      setUserPhoneNumber(user.phoneNumber);
    }
  };

  const loadCurrencies = async () => {
    try {
      setIsLoadingCurrencies(true);
      const response = await paymentService.getSupportedCurrencies();
      
      if (response.success && response.data) {
        setCurrencies(response.data.currencies);
        setSelectedCurrency(response.data.default || 'GMD');
      } else {
        // Fallback defaults if response not successful
        const fallback: SupportedCurrency[] = [
          { code: 'GMD', name: 'Gambian Dalasi' } as any,
          { code: 'USD', name: 'US Dollar' } as any,
        ];
        setCurrencies(fallback);
        setSelectedCurrency('GMD');
      }
    } catch (error) {
      console.error('Yonna Forex currencies error:', error);
      // Network or API failed: provide sensible defaults so UI continues
      const fallback: SupportedCurrency[] = [
        { code: 'GMD', name: 'Gambian Dalasi' } as any,
        { code: 'USD', name: 'US Dollar' } as any,
      ];
      setCurrencies(fallback);
      setSelectedCurrency('GMD');
    } finally {
      setIsLoadingCurrencies(false);
    }
  };

  const handlePayment = async () => {
    if (!user) {
      Alert.alert('Error', 'Please log in to make a payment');
      return;
    }

    if (!user.phoneNumber) {
      Alert.alert('Error', 'Phone number not found in your profile. Please update your profile first.');
      return;
    }

    try {
      setIsLoading(true);
      console.log('Starting Yonna Forex payment process...');

      const paymentData = {
        amount: normalizedAmount,
        currency: selectedCurrency,
        description: description.trim() || `Payment for ${paymentService.formatAmount(normalizedAmount, selectedCurrency)}`,
        transactionId: paymentService.generateTransactionId(),
      };

      console.log('Payment data:', paymentData);
      console.log('User phone number:', user.phoneNumber);

      const result = await paymentService.processPayment(paymentData);
      console.log('Payment result:', result);

      if (result.success && result.data) {
        Alert.alert(
          'Payment Successful',
          `Your payment of ${paymentService.formatAmount(normalizedAmount, selectedCurrency)} has been processed successfully. Transaction ID: ${result.data.transactionId}`,
          [
            {
              text: 'OK',
              onPress: () => onPaymentSuccess(result.data!.transactionId),
            },
          ]
        );
      } else {
        console.error('Payment failed:', result);
        onPaymentError(result.message || 'Payment failed');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      onPaymentError(error.message || 'Payment processing failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProceedToPayment = () => {
    setShowPaymentSummary(true);
  };

  const handleConfirmPayment = () => {
    setShowPaymentSummary(false);
    handlePayment();
  };

  const formatAmount = (amount: number, currency: string) => {
    return paymentService.formatAmount(amount, currency);
  };

  if (isLoadingCurrencies) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading payment options...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Please log in to make a payment</Text>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!user.phoneNumber) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Phone number not found in your profile</Text>
        <Text style={styles.errorSubText}>Please update your profile with a phone number first</Text>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Yonna Forex Payment</Text>
        <Text style={styles.amountText}>
          Amount: {formatAmount(normalizedAmount, selectedCurrency)}
        </Text>
      </View>

      <View style={styles.form}>
        {/* Currency Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Currency</Text>
          <View style={styles.currencyContainer}>
            {currencies.map((currency) => (
              <TouchableOpacity
                key={currency.code}
                style={[
                  styles.currencyButton,
                  selectedCurrency === currency.code && styles.currencyButtonSelected,
                ]}
                onPress={() => setSelectedCurrency(currency.code)}
              >
                <Text
                  style={[
                    styles.currencyButtonText,
                    selectedCurrency === currency.code && styles.currencyButtonTextSelected,
                  ]}
                >
                  {currency.code}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Payment Summary */}
        <View style={styles.paymentSummary}>
          <Text style={styles.summaryTitle}>Payment Summary</Text>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Gateway:</Text>
            <Text style={styles.summaryValue}>Yonna Forex Wallet</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Amount:</Text>
            <Text style={styles.summaryValue}>{formatAmount(normalizedAmount, selectedCurrency)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Currency:</Text>
            <Text style={styles.summaryValue}>{selectedCurrency}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Phone Number:</Text>
            <Text style={styles.summaryValue}>{userPhoneNumber}</Text>
          </View>
          {description && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Description:</Text>
              <Text style={styles.summaryValue}>{description}</Text>
            </View>
          )}
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Enter payment description"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            disabled={isLoading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.payButton, isLoading && styles.payButtonDisabled]}
            onPress={handleProceedToPayment}
            disabled={isLoading}
          >
            <Text style={styles.payButtonText}>
              Proceed to Payment
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Secure payment powered by Yonna Forex
        </Text>
      </View>

      {/* Payment Confirmation Modal */}
      {showPaymentSummary && (
        <View style={styles.modalOverlay}>
          <View style={styles.confirmationModal}>
            <Text style={styles.modalTitle}>Confirm Payment</Text>
            <Text style={styles.modalSubtitle}>
              Please review your payment details before proceeding
            </Text>
            
            <View style={styles.confirmationSummary}>
              <View style={styles.confirmationItem}>
                <Text style={styles.confirmationLabel}>Gateway:</Text>
                <Text style={styles.confirmationValue}>Yonna Forex Wallet</Text>
              </View>
              <View style={styles.confirmationItem}>
                <Text style={styles.confirmationLabel}>Amount:</Text>
                <Text style={styles.confirmationValue}>{formatAmount(normalizedAmount, selectedCurrency)}</Text>
              </View>
              <View style={styles.confirmationItem}>
                <Text style={styles.confirmationLabel}>Currency:</Text>
                <Text style={styles.confirmationValue}>{selectedCurrency}</Text>
              </View>
              <View style={styles.confirmationItem}>
                <Text style={styles.confirmationLabel}>Phone Number:</Text>
                <Text style={styles.confirmationValue}>{userPhoneNumber}</Text>
              </View>
              {description && (
                <View style={styles.confirmationItem}>
                  <Text style={styles.confirmationLabel}>Description:</Text>
                  <Text style={styles.confirmationValue}>{description}</Text>
                </View>
              )}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowPaymentSummary(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalConfirmButton, isLoading && styles.modalConfirmButtonDisabled]}
                onPress={handleConfirmPayment}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>
                    Confirm Payment
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  errorText: {
    fontSize: 18,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  errorSubText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 20,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  header: {
    padding: 20,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  amountText: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: '600',
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  currencyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  currencyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    backgroundColor: '#FFFFFF',
  },
  currencyButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  currencyButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  currencyButtonTextSelected: {
    color: '#FFFFFF',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  payButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  payButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999999',
  },
  paymentSummary: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  confirmationModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    maxWidth: 400,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 20,
  },
  confirmationSummary: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  confirmationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmationLabel: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  confirmationValue: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  modalConfirmButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  modalConfirmButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  modalConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default YonnaForexPaymentForm;
