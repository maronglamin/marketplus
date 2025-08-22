import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';

interface PaymentMethod {
  id: string;
  type: string;
  provider: string;
  accountName: string;
  accountId: string;
  isDefault: boolean;
  status: string;
  metadata?: any;
}

interface PaymentMethodSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelectPaymentMethod: (paymentMethod: PaymentMethod) => void;
  onStripePayment: () => void;
  amount: number;
  currency: string;
  title?: string;
}

export function PaymentMethodSelector({
  visible,
  onClose,
  onSelectPaymentMethod,
  onStripePayment,
  amount,
  currency,
  title = 'Select Payment Method'
}: PaymentMethodSelectorProps) {
  const screenHeight = Dimensions.get('window').height;
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadPaymentMethods();
    }
  }, [visible]);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Force using mock data for testing
      console.log('Loading payment methods...');
      
      // Use mock data to test the UI flow
      const mockPaymentMethods = [
        {
          id: 'mock-1',
          type: 'CREDIT_CARD',
          provider: 'Visa',
          accountName: 'John Doe',
          accountId: '1234',
          isDefault: true,
          status: 'ACTIVE',
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
          accountId: '+1234567890',
          isDefault: false,
          status: 'ACTIVE',
          metadata: {
            phoneNumber: '+1234567890',
            walletType: 'Mobile Money',
            providerId: 'mpesa'
          }
        }
      ];
      
      console.log('Using mock payment methods:', mockPaymentMethods);
      setPaymentMethods(mockPaymentMethods);
      
      // Comment out the API call for now to test with mock data
      /*
      const response = await api.get('/api/payment-methods');
      
      if (response.data.success) {
        console.log('Payment methods loaded:', response.data.data);
        setPaymentMethods(response.data.data);
      } else {
        setError('Failed to load payment methods');
      }
      */
    } catch (error: any) {
      console.error('Error loading payment methods:', error);
      
      // If it's a 500 error, the endpoint might not be implemented yet
      if (error.response?.status === 500) {
        console.log('Payment methods endpoint returned 500 - using mock data');
        
        // Use mock data to test the UI flow
        const mockPaymentMethods = [
          {
            id: 'mock-1',
            type: 'CREDIT_CARD',
            provider: 'Visa',
            accountName: 'John Doe',
            accountId: '1234',
            isDefault: true,
            status: 'ACTIVE',
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
            accountId: '+1234567890',
            isDefault: false,
            status: 'ACTIVE',
            metadata: {
              phoneNumber: '+1234567890',
              walletType: 'Mobile Money',
              providerId: 'mpesa'
            }
          }
        ];
        
        console.log('Using mock payment methods:', mockPaymentMethods);
        setPaymentMethods(mockPaymentMethods);
      } else {
        setError(error.response?.data?.message || 'Failed to load payment methods');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPaymentMethod = (paymentMethod: PaymentMethod) => {
    console.log('Payment method selected:', {
      id: paymentMethod.id,
      type: paymentMethod.type,
      provider: paymentMethod.provider,
      accountName: paymentMethod.accountName
    });
    
    // Handle different payment method types
    switch (paymentMethod.type) {
      case 'CREDIT_CARD':
      case 'DEBIT_CARD':
        // Use Stripe for card payments
        console.log('Card payment selected, opening Stripe modal');
        onClose();
        onStripePayment();
        break;

      case 'MOBILE_MONEY':
        // Check if the mobile wallet provider has integration
        const providerId = paymentMethod.metadata?.providerId;
        if (providerId) {
          // For now, show an alert about mobile wallet integration
          Alert.alert(
            'Mobile Wallet Payment',
            `Processing payment through ${paymentMethod.provider}...`,
            [
              {
                text: 'OK',
                onPress: () => {
                  onSelectPaymentMethod(paymentMethod);
                  onClose();
                }
              }
            ]
          );
        } else {
          Alert.alert(
            'Payment Method Error',
            'Mobile wallet provider information is missing. Please try another payment method.',
            [{ text: 'OK' }]
          );
        }
        break;

      case 'BANK_TRANSFER':
        Alert.alert(
          'Bank Transfer Payment',
          `Processing bank transfer payment through ${paymentMethod.provider}...`,
          [
            {
              text: 'OK',
              onPress: () => {
                onSelectPaymentMethod(paymentMethod);
                onClose();
              }
            }
          ]
        );
        break;

      case 'CRYPTO':
        Alert.alert(
          'Cryptocurrency Payment',
          `Processing cryptocurrency payment through ${paymentMethod.provider}...`,
          [
            {
              text: 'OK',
              onPress: () => {
                onSelectPaymentMethod(paymentMethod);
                onClose();
              }
            }
          ]
        );
        break;

      case 'DIGITAL_WALLET':
        // Handle cash on delivery or other digital wallet types
        if (paymentMethod.provider === 'Cash on Delivery') {
          Alert.alert(
            'Cash on Delivery',
            'Your payment will be processed for cash on delivery. The seller will contact you to arrange payment upon delivery.',
            [
              {
                text: 'OK',
                onPress: () => {
                  onSelectPaymentMethod(paymentMethod);
                  onClose();
                }
              }
            ]
          );
        } else {
          Alert.alert(
            'Digital Wallet Payment',
            `Processing payment through ${paymentMethod.provider}...`,
            [
              {
                text: 'OK',
                onPress: () => {
                  onSelectPaymentMethod(paymentMethod);
                  onClose();
                }
              }
            ]
          );
        }
        break;

      default:
        console.log('Unknown payment method type:', paymentMethod.type);
        // For unknown types, try to determine if it's a card payment based on provider
        if (paymentMethod.provider && (
          paymentMethod.provider.toLowerCase().includes('visa') ||
          paymentMethod.provider.toLowerCase().includes('mastercard') ||
          paymentMethod.provider.toLowerCase().includes('amex') ||
          paymentMethod.provider.toLowerCase().includes('card')
        )) {
          console.log('Detected card payment by provider, opening Stripe modal');
          onClose();
          onStripePayment();
        } else {
          Alert.alert(
            'Payment Method Not Supported',
            `${paymentMethod.type} payment method is not currently supported. Please try another payment method.`,
            [{ text: 'OK' }]
          );
        }
        break;
    }
  };

  const getPaymentMethodIcon = (type: string, provider: string) => {
    switch (type) {
      case 'CREDIT_CARD':
      case 'DEBIT_CARD':
        return 'card';
      case 'BANK_TRANSFER':
        return 'business';
      case 'MOBILE_MONEY':
        return 'phone-portrait';
      case 'CRYPTO':
        return 'logo-bitcoin';
      case 'DIGITAL_WALLET':
        return 'wallet';
      default:
        return 'card';
    }
  };

  const getPaymentMethodColor = (type: string) => {
    switch (type) {
      case 'CREDIT_CARD':
      case 'DEBIT_CARD':
        return '#3B82F6';
      case 'BANK_TRANSFER':
        return '#10B981';
      case 'MOBILE_MONEY':
        return '#F59E0B';
      case 'CRYPTO':
        return '#8B5CF6';
      case 'DIGITAL_WALLET':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return `${currency} ${amount.toLocaleString()}`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Amount Display */}
          <View style={styles.amountSection}>
            <Text style={styles.amountLabel}>Total Amount</Text>
            <Text style={styles.amount}>{formatAmount(amount, currency)}</Text>
          </View>

          {/* Payment Methods */}
          <ScrollView style={styles.paymentMethodsContainer} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={styles.loadingText}>Loading payment methods...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={48} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={loadPaymentMethods} style={styles.retryButton}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : paymentMethods.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="card-outline" size={48} color="#9CA3AF" />
                <Text style={styles.emptyTitle}>No Payment Methods</Text>
                <Text style={styles.emptyText}>You haven't added any payment methods yet.</Text>
              </View>
            ) : (
              paymentMethods.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={styles.paymentMethodCard}
                  onPress={() => handleSelectPaymentMethod(method)}
                  activeOpacity={0.7}
                >
                  <View style={styles.paymentMethodContent}>
                    <View style={styles.paymentMethodIcon}>
                      <Ionicons
                        name={getPaymentMethodIcon(method.type, method.provider) as any}
                        size={24}
                        color={getPaymentMethodColor(method.type)}
                      />
                    </View>
                    <View style={styles.paymentMethodInfo}>
                      <Text style={styles.paymentMethodName}>{method.accountName}</Text>
                      <Text style={styles.paymentMethodType}>
                        {method.type.replace('_', ' ')} • {method.provider}
                      </Text>
                      {method.isDefault && (
                        <View style={styles.defaultBadge}>
                          <Text style={styles.defaultBadgeText}>Default</Text>
                        </View>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          {/* Add New Payment Method Button */}
          <TouchableOpacity style={styles.addPaymentMethodButton} onPress={onClose}>
            <Ionicons name="add-circle-outline" size={20} color="#3B82F6" />
            <Text style={styles.addPaymentMethodText}>Add New Payment Method</Text>
          </TouchableOpacity>
          
          {/* Test Stripe Button */}
          <TouchableOpacity 
            style={[styles.addPaymentMethodButton, { marginTop: 8, backgroundColor: '#10B981' }]} 
            onPress={() => {
              console.log('Test Stripe button pressed');
              onClose();
              onStripePayment();
            }}
          >
            <Ionicons name="card-outline" size={20} color="#FFFFFF" />
            <Text style={[styles.addPaymentMethodText, { color: '#FFFFFF' }]}>Test Stripe Payment</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  amountSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  amount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  paymentMethodsContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  paymentMethodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  paymentMethodContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  paymentMethodType: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  defaultBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  defaultBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  addPaymentMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  addPaymentMethodText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
    marginLeft: 8,
  },
});
