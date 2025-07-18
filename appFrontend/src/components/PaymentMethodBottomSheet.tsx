import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { paymentGatewayServiceProviderService, type PaymentGatewayServiceProvider } from '../services/paymentGatewayServiceProviderService';

interface PaymentMethodBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onPaymentMethodCreated: (paymentMethod: any) => void;
  countryCode?: string;
}

export function PaymentMethodBottomSheet({
  isVisible,
  onClose,
  onPaymentMethodCreated,
  countryCode = 'US',
}: PaymentMethodBottomSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['90%'], []);
  
  // Payment method state
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [providers, setProviders] = useState<PaymentGatewayServiceProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [cardholderName, setCardholderName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<{
    cardholderName?: string;
    phoneNumber?: string;
  }>({});

  // Show/hide bottom sheet
  useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.snapToIndex(0);
      loadProviders();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isVisible]);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      onClose();
    }
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    []
  );

  const loadProviders = async () => {
    try {
      setLoadingProviders(true);
      const mobileMoneyProviders = await paymentGatewayServiceProviderService.getMobileMoneyProviders(countryCode);
      const digitalWalletProviders = await paymentGatewayServiceProviderService.getDigitalWalletProviders(countryCode);
      setProviders([...mobileMoneyProviders, ...digitalWalletProviders]);
    } catch (error) {
      console.error('Error loading providers:', error);
    } finally {
      setLoadingProviders(false);
    }
  };

  const validateForm = () => {
    const newErrors: {
      cardholderName?: string;
      phoneNumber?: string;
    } = {};

    if (selectedMethod === 'card' && !cardholderName.trim()) {
      newErrors.cardholderName = 'Cardholder name is required';
    }

    if (selectedMethod === 'mobileWallets' && !phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clearFieldError = (field: string) => {
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleCreatePaymentMethod = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      
      let paymentMethodData: any = {
        isDefault,
      };

      if (selectedMethod === 'card') {
        paymentMethodData = {
          type: 'CREDIT_CARD',
          provider: 'Card',
          accountName: cardholderName.trim(),
          accountId: '****', // No sensitive data stored
          metadata: {
            cardholderName: cardholderName.trim(),
            // No card number, expiry, or CVV stored
          }
        };
      } else if (selectedMethod === 'mobileWallets') {
        const provider = providers.find(p => p.id === selectedProvider);
        paymentMethodData = {
          type: 'MOBILE_MONEY',
          provider: provider?.name || 'Mobile Wallet',
          accountId: phoneNumber.trim(),
          accountName: `${provider?.name || 'Mobile Wallet'} - ${phoneNumber.trim()}`,
          metadata: {
            phoneNumber: phoneNumber.trim(),
            providerId: selectedProvider,
            providerName: provider?.name
          }
        };
      }

      // Call the callback with the new payment method
      onPaymentMethodCreated(paymentMethodData);
      
      // Clear form and close
      handleClose();
      
      Alert.alert('Success', 'Payment method created successfully');
    } catch (error: any) {
      console.error('Error creating payment method:', error);
      Alert.alert('Error', error.message || 'Failed to create payment method');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    // Clear form fields
    setSelectedMethod(null);
    setSelectedProvider(null);
    setCardholderName('');
    setPhoneNumber('');
    setIsDefault(false);
    setErrors({});
    setSubmitting(false);
    onClose();
  };

  const paymentMethodOptions = [
    {
      id: 'card',
      name: 'Card',
      description: 'Credit and debit cards',
      icon: 'card-outline',
    },
    {
      id: 'mobileWallets',
      name: 'Mobile Wallets',
      description: 'Mobile money and digital wallets',
      icon: 'phone-portrait-outline',
    },
    {
      id: 'cash',
      name: 'Cash',
      description: 'Cash on delivery',
      icon: 'cash-outline',
    },
  ];

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={isVisible ? 0 : -1}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.bottomSheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetView style={styles.content}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Add Payment Method</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Payment Method Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Payment Method</Text>
            <View style={styles.methodOptions}>
              {paymentMethodOptions.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.methodOption,
                    selectedMethod === method.id && styles.selectedMethodOption
                  ]}
                  onPress={() => setSelectedMethod(method.id)}
                >
                  <Ionicons 
                    name={method.icon as any} 
                    size={24} 
                    color={selectedMethod === method.id ? '#2563EB' : '#6B7280'} 
                  />
                  <View style={styles.methodInfo}>
                    <Text style={[
                      styles.methodName,
                      selectedMethod === method.id && styles.selectedMethodName
                    ]}>
                      {method.name}
                    </Text>
                    <Text style={styles.methodDescription}>
                      {method.description}
                    </Text>
                  </View>
                  {selectedMethod === method.id && (
                    <Ionicons name="checkmark-circle" size={20} color="#2563EB" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Card Form */}
          {selectedMethod === 'card' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Card Information</Text>
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Cardholder Name *</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      errors.cardholderName && styles.textInputError
                    ]}
                    value={cardholderName}
                    onChangeText={(text) => {
                      setCardholderName(text);
                      clearFieldError('cardholderName');
                    }}
                    placeholder="Enter cardholder name"
                    returnKeyType="done"
                  />
                  {errors.cardholderName && (
                    <Text style={styles.fieldErrorText}>{errors.cardholderName}</Text>
                  )}
                </View>

                <View style={styles.cardInfo}>
                  <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
                  <Text style={styles.cardInfoText}>
                    Card details will be securely processed by our payment partner. We don't store sensitive card information.
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Mobile Wallet Form */}
          {selectedMethod === 'mobileWallets' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Mobile Wallet</Text>
              <View style={styles.form}>
                {loadingProviders ? (
                  <View style={styles.loadingProviders}>
                    <ActivityIndicator size="small" color="#2563EB" />
                    <Text style={styles.loadingText}>Loading providers...</Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Select Provider *</Text>
                      <View style={styles.providerOptions}>
                        {providers.map((provider) => (
                          <TouchableOpacity
                            key={provider.id}
                            style={[
                              styles.providerOption,
                              selectedProvider === provider.id && styles.selectedProviderOption
                            ]}
                            onPress={() => setSelectedProvider(provider.id)}
                          >
                            <Text style={[
                              styles.providerName,
                              selectedProvider === provider.id && styles.selectedProviderName
                            ]}>
                              {provider.name}
                            </Text>
                            {selectedProvider === provider.id && (
                              <Ionicons name="checkmark-circle" size={16} color="#2563EB" />
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Phone Number *</Text>
                      <TextInput
                        style={[
                          styles.textInput,
                          errors.phoneNumber && styles.textInputError
                        ]}
                        value={phoneNumber}
                        onChangeText={(text) => {
                          setPhoneNumber(text);
                          clearFieldError('phoneNumber');
                        }}
                        placeholder="Enter phone number"
                        keyboardType="phone-pad"
                        returnKeyType="done"
                      />
                      {errors.phoneNumber && (
                        <Text style={styles.fieldErrorText}>{errors.phoneNumber}</Text>
                      )}
                    </View>
                  </>
                )}
              </View>
            </View>
          )}

          {/* Cash on Delivery */}
          {selectedMethod === 'cash' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Cash on Delivery</Text>
              <View style={styles.cashInfo}>
                <Ionicons name="information-circle-outline" size={48} color="#10B981" />
                <Text style={styles.cashInfoTitle}>Pay When You Receive</Text>
                <Text style={styles.cashInfoText}>
                  You'll pay with cash when your order is delivered. No payment information needed.
                </Text>
              </View>
            </View>
          )}

          {/* Default Payment Method Toggle */}
          {selectedMethod && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.defaultToggle}
                onPress={() => setIsDefault(!isDefault)}
              >
                <Ionicons 
                  name={isDefault ? "checkmark-circle" : "ellipse-outline"} 
                  size={24} 
                  color={isDefault ? "#2563EB" : "#9CA3AF"} 
                />
                <Text style={styles.defaultToggleText}>Set as default payment method</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Action Buttons */}
          {selectedMethod && (
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleClose}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  submitting && styles.saveButtonDisabled
                ]}
                onPress={handleCreatePaymentMethod}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Payment Method</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: '#FFFFFF',
  },
  handleIndicator: {
    backgroundColor: '#D1D5DB',
    width: 40,
    height: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  methodOptions: {
    gap: 12,
  },
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  selectedMethodOption: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  methodInfo: {
    flex: 1,
    marginLeft: 12,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  selectedMethodName: {
    color: '#2563EB',
  },
  methodDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 6,
  },
  textInput: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    fontSize: 16,
    color: '#374151',
    backgroundColor: '#FFFFFF',
  },
  textInputError: {
    borderColor: '#DC2626',
    borderWidth: 2,
  },
  fieldErrorText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 4,
    marginLeft: 4,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    gap: 8,
  },
  cardInfoText: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
    lineHeight: 20,
  },
  loadingProviders: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  providerOptions: {
    gap: 8,
  },
  providerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  selectedProviderOption: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  providerName: {
    fontSize: 16,
    color: '#111827',
  },
  selectedProviderName: {
    color: '#2563EB',
    fontWeight: '500',
  },
  cashInfo: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  cashInfoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#166534',
    marginTop: 12,
    marginBottom: 8,
  },
  cashInfoText: {
    fontSize: 14,
    color: '#166534',
    textAlign: 'center',
    lineHeight: 20,
  },
  defaultToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  defaultToggleText: {
    fontSize: 16,
    color: '#374151',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    padding: 16,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
}); 