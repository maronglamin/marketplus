import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
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
  onPaymentSuccess: (paymentIntentId: string) => void;
  onPaymentError: (error: string) => void;
  userInfo?: {
    firstName: string;
    lastName: string;
  };
  transactionType?: 'order' | 'ride' | 'rental';
}

function StripePaymentContent(props: StripePaymentProps) {
  const { confirmPayment } = useStripe();
  const [cardDetails, setCardDetails] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [paymentIntent, setPaymentIntent] = useState<any>(null);

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
          paymentMethod: 'new_card',
          transactionType: props.transactionType || 'order'
        }
      );
      
      console.log('Payment intent created:', {
        intentId: intent.id,
        amount: intent.amount,
        currency: intent.currency,
        status: intent.status
      });
      
      // Go directly to payment confirmation
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

  return (
    <Modal visible={props.visible} animationType="slide" transparent={true}>
      {(() => { console.log('🎯 StripePayment modal rendering:', { visible: props.visible, orderId: props.orderId, amount: props.amount }); return null; })()}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
          >
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
            
            {/* Card input field */}
            <View style={styles.cardInputContainer}>
              <Text style={styles.cardInputLabel}>Card Details</Text>
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
          </KeyboardAvoidingView>
      </View>
      </TouchableWithoutFeedback>
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
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
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
}); 