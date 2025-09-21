import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import PaymentMethodSelector, { PaymentMethod } from '../components/PaymentMethodSelector';

interface ExamplePaymentScreenProps {
  amount: number;
  onPaymentComplete: (success: boolean, transactionId?: string) => void;
}

const ExamplePaymentScreen: React.FC<ExamplePaymentScreenProps> = ({
  amount,
  onPaymentComplete,
}) => {
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);

  const handlePaymentMethodSelected = (method: PaymentMethod) => {
    console.log('Selected payment method:', method);
    
    switch (method) {
      case 'stripe':
        // Handle Stripe payment
        handleStripePayment();
        break;
      case 'yonna-forex':
        // Yonna Forex is handled by the PaymentMethodSelector component
        // The form will be shown automatically
        break;
      case 'cash':
        // Handle cash payment
        handleCashPayment();
        break;
      case 'bank-transfer':
        // Handle bank transfer
        handleBankTransfer();
        break;
      default:
        Alert.alert('Error', 'Invalid payment method selected');
    }
  };

  const handlePaymentSuccess = (transactionId: string, method: PaymentMethod) => {
    console.log('Payment successful:', { transactionId, method });
    setShowPaymentMethods(false);
    Alert.alert(
      'Payment Successful',
      `Your payment has been processed successfully.\nTransaction ID: ${transactionId}`,
      [
        {
          text: 'OK',
          onPress: () => onPaymentComplete(true, transactionId),
        },
      ]
    );
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
    Alert.alert('Payment Error', error);
  };

  const handleCancel = () => {
    setShowPaymentMethods(false);
  };

  const handleStripePayment = () => {
    // Implement Stripe payment logic here
    Alert.alert('Stripe Payment', 'Stripe payment integration would go here');
  };

  const handleCashPayment = () => {
    // Implement cash payment logic here
    Alert.alert('Cash Payment', 'Cash payment on delivery selected');
    onPaymentComplete(true, 'CASH_' + Date.now());
  };

  const handleBankTransfer = () => {
    // Implement bank transfer logic here
    Alert.alert('Bank Transfer', 'Bank transfer details would be shown here');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Complete Payment</Text>
        <Text style={styles.amountText}>${amount.toFixed(2)}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>
          Choose your preferred payment method to complete your purchase.
        </Text>

        <TouchableOpacity
          style={styles.payButton}
          onPress={() => setShowPaymentMethods(true)}
        >
          <Text style={styles.payButtonText}>Select Payment Method</Text>
        </TouchableOpacity>
      </View>

      {/* Payment Method Selection Modal */}
      <Modal
        visible={showPaymentMethods}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <PaymentMethodSelector
          amount={amount}
          onPaymentMethodSelected={handlePaymentMethodSelected}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentError={handlePaymentError}
          onCancel={handleCancel}
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  payButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ExamplePaymentScreen;
