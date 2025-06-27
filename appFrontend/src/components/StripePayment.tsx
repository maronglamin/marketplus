import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  StripeProvider,
  CardField,
  useStripe,
} from '@stripe/stripe-react-native';
import { stripeService } from '../services/stripeService';
import Constants from 'expo-constants';

const STRIPE_PUBLISHABLE_KEY = Constants.expoConfig?.extra?.stripePublishableKey;

interface StripePaymentProps {
  visible: boolean;
  onClose: () => void;
  amount: number;
  currency: string;
  orderId: string;
  customerId: string;
  selectedPaymentMethod?: any;
  onPaymentSuccess: (paymentIntentId: string) => void;
  onPaymentError: (error: string) => void;
  userInfo?: {
    firstName: string;
    lastName: string;
  };
}

function StripePaymentContent(props: StripePaymentProps) {
  const { confirmPayment } = useStripe();
  const [cardDetails, setCardDetails] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [paymentIntent, setPaymentIntent] = useState<any>(null);
  const [showSummary, setShowSummary] = useState(false);

  // Debounced card change handler to reduce excessive logging
  const handleCardChange = useCallback((details: any) => {
    // Only log significant changes, not every keystroke
    if (details.complete !== cardDetails?.complete || 
        details.validNumber !== cardDetails?.validNumber ||
        details.validExpiryDate !== cardDetails?.validExpiryDate ||
        details.validCVC !== cardDetails?.validCVC) {
      console.log('StripePayment - card validation changed:', {
        complete: details.complete,
        validNumber: details.validNumber,
        validExpiryDate: details.validExpiryDate,
        validCVC: details.validCVC
      });
    }
    setCardDetails(details);
  }, [cardDetails]);

  // Debug: Log the selected payment method when component mounts or props change
  React.useEffect(() => {
    console.log('StripePayment - selectedPaymentMethod:', props.selectedPaymentMethod);
  }, [props.selectedPaymentMethod]);

  // Extract card details from selected payment method
  const getSavedCardDetails = () => {
    if (!props.selectedPaymentMethod || props.selectedPaymentMethod.type !== 'CREDIT_CARD') {
      // Only log once when there's no valid payment method, not on every render
      if (props.selectedPaymentMethod !== undefined) {
        console.log('No selected payment method or not a credit card:', props.selectedPaymentMethod);
      }
      return null;
    }

    console.log('Selected payment method:', {
      id: props.selectedPaymentMethod.id,
      type: props.selectedPaymentMethod.type,
      provider: props.selectedPaymentMethod.provider,
      accountName: props.selectedPaymentMethod.accountName,
      accountId: props.selectedPaymentMethod.accountId,
      metadata: props.selectedPaymentMethod.metadata,
      metadataType: typeof props.selectedPaymentMethod.metadata
    });

    const metadata = props.selectedPaymentMethod.metadata || {};
    
    // Handle case where metadata might be a JSON string
    let parsedMetadata = metadata;
    if (typeof metadata === 'string') {
      try {
        parsedMetadata = JSON.parse(metadata);
        console.log('Successfully parsed metadata from string:', parsedMetadata);
      } catch (error) {
        console.error('Failed to parse metadata JSON:', error);
        parsedMetadata = {};
      }
    } else if (metadata && typeof metadata === 'object') {
      console.log('Metadata is already an object:', metadata);
      parsedMetadata = metadata;
    } else {
      console.log('Metadata is neither string nor object:', metadata);
      parsedMetadata = {};
    }

    console.log('Final parsed metadata:', parsedMetadata);

    // Test case: If this is a mock payment method, we know the structure
    if (props.selectedPaymentMethod.id === 'mock-1') {
      console.log('Using mock payment method structure');
      return {
        cardNumber: '4242 4242 4242 4242',
        expiryDate: '12/25',
        cardholderName: 'John Doe',
        last4: '4242',
        provider: 'Visa',
        cvv: '123'
      };
    }

    const cardDetails = {
      cardNumber: parsedMetadata.cardNumber || '',
      expiryDate: parsedMetadata.expiryDate || '',
      cardholderName: props.selectedPaymentMethod.accountName || parsedMetadata.cardholderName || '',
      last4: props.selectedPaymentMethod.accountId || parsedMetadata.last4 || '',
      provider: props.selectedPaymentMethod.provider || parsedMetadata.provider || 'Card',
      cvv: parsedMetadata.cvv || ''
    };

    console.log('Extracted card details:', cardDetails);

    // Only return if we have at least some card information
    if (cardDetails.cardNumber || cardDetails.last4) {
      return cardDetails;
    }

    console.log('No valid card details found in metadata');
    return null;
  };

  const savedCardDetails = getSavedCardDetails();

  // Debug: Log card details changes - only when significant changes occur
  React.useEffect(() => {
    if (cardDetails?.complete !== undefined || savedCardDetails?.cardNumber) {
      console.log('StripePayment - payment ready state:', {
        complete: cardDetails?.complete,
        hasCardDetails: !!cardDetails?.complete,
        hasSavedCard: !!savedCardDetails?.cardNumber,
        buttonEnabled: !!(cardDetails?.complete || savedCardDetails?.cardNumber)
      });
    }
  }, [cardDetails?.complete, savedCardDetails?.cardNumber]);

  const handlePayment = async () => {
    // Remove card completion check - let Stripe handle validation
    try {
      setProcessing(true);
      
      // Validate inputs before creating payment intent
      if (!props.orderId || !props.customerId) {
        throw new Error('Missing order or customer information');
      }

      if (props.amount <= 0) {
        throw new Error('Invalid payment amount');
      }

      // Validate currency support
      if (!stripeService.isCurrencySupported(props.currency)) {
        throw new Error(`Currency ${props.currency.toUpperCase()} is not supported for payments`);
      }

      console.log('Starting payment process:', {
        amount: props.amount,
        currency: props.currency,
        orderId: props.orderId,
        customerId: props.customerId,
        hasCardDetails: !!cardDetails
      });
      
      // Create payment intent
      const intent = await stripeService.createPaymentIntent(
        props.amount,
        props.currency,
        props.orderId,
        props.customerId,
        {
          userFirstName: props.userInfo?.firstName,
          userLastName: props.userInfo?.lastName,
          paymentMethod: 'new_card'
        }
      );
      
      console.log('Payment intent created:', {
        intentId: intent.id,
        amount: intent.amount,
        currency: intent.currency,
        status: intent.status
      });
      
      // Go directly to payment confirmation without showing summary
      await handleConfirmPayment(intent);
      
    } catch (error: any) {
      console.error('Payment error:', error);
      props.onPaymentError(error.message || 'Payment failed. Please try again.');
      setProcessing(false);
    }
  };

  const handleConfirmPayment = async (intent?: any) => {
    const currentPaymentIntent = intent || paymentIntent;
    
    if (!currentPaymentIntent) {
      Alert.alert('Error', 'Payment intent not found');
      return;
    }

    try {
      setProcessing(true);
      
      // Prepare payment method data
      const paymentMethodData = {
        billingDetails: {
          name: `${props.userInfo?.firstName || ''} ${props.userInfo?.lastName || ''}`.trim() || 'Customer Name',
        },
      };
      
      console.log('Confirming payment with Stripe:', {
        clientSecret: currentPaymentIntent.client_secret ? 'Present' : 'Missing',
        paymentMethodData,
        cardDetails: cardDetails ? 'Present' : 'Missing'
      });
      
      // Confirm payment with Stripe
      const { error, paymentIntent: confirmedIntent } = await confirmPayment(
        currentPaymentIntent.client_secret,
        {
          paymentMethodType: 'Card',
          paymentMethodData,
        }
      );

      if (error) {
        console.error('Stripe payment confirmation error:', error);
        const errorMessage = stripeService.handlePaymentError(error);
        props.onPaymentError(errorMessage);
      } else if (confirmedIntent) {
        console.log('Payment confirmed successfully:', {
          paymentIntentId: confirmedIntent.id,
          status: confirmedIntent.status
        });
        props.onPaymentSuccess(confirmedIntent.id);
      }
    } catch (error: any) {
      console.error('Payment confirmation error:', error);
      props.onPaymentError(error.message || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const formatCardNumber = (cardNumber: string) => {
    if (!cardNumber) return '';
    const cleaned = cardNumber.replace(/\s/g, '');
    if (cleaned.length >= 4) {
      return `**** **** **** ${cleaned.slice(-4)}`;
    }
    return cardNumber;
  };

  return (
    <Modal visible={props.visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Complete Payment</Text>
            <TouchableOpacity onPress={props.onClose}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.body}>
            <Text style={styles.amount}>
              {stripeService.formatAmount(props.amount, props.currency)}
            </Text>
            
            {/* Show saved card details if available */}
            {savedCardDetails && (
              <View style={styles.savedCardContainer}>
                <View style={styles.savedCardHeader}>
                  <Ionicons name="card-outline" size={20} color="#2563EB" />
                  <Text style={styles.savedCardTitle}>Saved Card Available</Text>
                </View>
                <View style={styles.savedCardDetails}>
                  <Text style={styles.savedCardName}>{savedCardDetails.cardholderName}</Text>
                  <Text style={styles.savedCardNumber}>
                    {formatCardNumber(savedCardDetails.cardNumber)}
                  </Text>
                  <Text style={styles.savedCardExpiry}>
                    Expires: {savedCardDetails.expiryDate}
                  </Text>
                  <Text style={styles.savedCardProvider}>
                    {savedCardDetails.provider}
                  </Text>
                </View>
                <View style={styles.savedCardNote}>
                  <Ionicons name="shield-checkmark" size={16} color="#10B981" />
                  <Text style={styles.savedCardNoteText}>
                    Your saved card is available. You can pay directly with this card or enter new details below.
                  </Text>
                </View>
              </View>
            )}
            
            {/* Card input field */}
            <View style={styles.cardInputContainer}>
              <Text style={styles.cardInputLabel}>
                {savedCardDetails ? 'Enter New Card Details (Optional)' : 'Card Details'}
              </Text>
              <CardField
                postalCodeEnabled={false}
                cardStyle={{
                  ...styles.cardField,
                  textColor: '#000000',
                  fontSize: 16,
                  placeholderColor: '#9CA3AF',
                }}
                style={styles.cardFieldStyle}
                onCardChange={handleCardChange}
              />
            </View>
            
            <TouchableOpacity
              style={[
                styles.payButton, 
                processing && styles.disabledButton
              ]}
              onPress={handlePayment}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.payButtonText}>Pay Now</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function StripePayment(props: StripePaymentProps) {
  if (!STRIPE_PUBLISHABLE_KEY) {
    return null;
  }

  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
      <StripePaymentContent {...props} />
    </StripeProvider>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  body: {
    alignItems: 'center',
  },
  amount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 24,
  },
  cardField: {
    backgroundColor: '#FFFFFF',
  },
  cardFieldStyle: {
    width: '100%',
    height: 50,
    marginBottom: 24,
  },
  payButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#E5E7EB',
  },
  savedCardContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    width: '100%',
  },
  savedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  savedCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  savedCardDetails: {
    marginBottom: 12,
  },
  savedCardName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  savedCardNumber: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  savedCardExpiry: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  savedCardProvider: {
    fontSize: 14,
    color: '#6B7280',
  },
  savedCardNote: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  savedCardNoteText: {
    fontSize: 12,
    color: '#10B981',
    marginLeft: 4,
  },
  cardInputContainer: {
    width: '100%',
    marginBottom: 24,
  },
  cardInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
}); 