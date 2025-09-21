import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import YonnaForexPaymentForm from './YonnaForexPaymentForm';

export type PaymentMethod = 'stripe' | 'yonna-forex' | 'cash' | 'bank-transfer';

interface PaymentMethodOption {
  id: PaymentMethod;
  name: string;
  description: string;
  icon: string;
  available: boolean;
}

interface PaymentMethodSelectorProps {
  amount: number;
  onPaymentMethodSelected: (method: PaymentMethod) => void;
  onPaymentSuccess: (transactionId: string, method: PaymentMethod) => void;
  onPaymentError: (error: string) => void;
  onCancel: () => void;
}

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  amount,
  onPaymentMethodSelected,
  onPaymentSuccess,
  onPaymentError,
  onCancel,
}) => {
  const [showYonnaForexForm, setShowYonnaForexForm] = useState(false);

  const paymentMethods: PaymentMethodOption[] = [
    {
      id: 'stripe',
      name: 'Credit/Debit Card',
      description: 'Pay with Visa, Mastercard, or American Express',
      icon: '💳',
      available: true,
    },
    {
      id: 'yonna-forex',
      name: 'Yonna Forex Wallet',
      description: 'Pay with your Yonna Forex mobile wallet',
      icon: '📱',
      available: true,
    },
    {
      id: 'cash',
      name: 'Cash Payment',
      description: 'Pay with cash on delivery',
      icon: '💵',
      available: true,
    },
    {
      id: 'bank-transfer',
      name: 'Bank Transfer',
      description: 'Direct bank transfer',
      icon: '🏦',
      available: true,
    },
  ];

  const handlePaymentMethodPress = (method: PaymentMethod) => {
    if (method === 'yonna-forex') {
      setShowYonnaForexForm(true);
    } else {
      onPaymentMethodSelected(method);
    }
  };

  const handleYonnaForexSuccess = (transactionId: string) => {
    setShowYonnaForexForm(false);
    onPaymentSuccess(transactionId, 'yonna-forex');
  };

  const handleYonnaForexError = (error: string) => {
    onPaymentError(error);
  };

  const handleYonnaForexCancel = () => {
    setShowYonnaForexForm(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Payment Method</Text>
        <Text style={styles.amountText}>Amount: ${amount.toFixed(2)}</Text>
      </View>

      <ScrollView style={styles.methodsList} showsVerticalScrollIndicator={false}>
        {paymentMethods.map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[
              styles.methodItem,
              !method.available && styles.methodItemDisabled,
            ]}
            onPress={() => method.available && handlePaymentMethodPress(method.id)}
            disabled={!method.available}
          >
            <View style={styles.methodIcon}>
              <Text style={styles.iconText}>{method.icon}</Text>
            </View>
            <View style={styles.methodInfo}>
              <Text style={[
                styles.methodName,
                !method.available && styles.methodNameDisabled,
              ]}>
                {method.name}
              </Text>
              <Text style={[
                styles.methodDescription,
                !method.available && styles.methodDescriptionDisabled,
              ]}>
                {method.description}
              </Text>
            </View>
            <View style={styles.methodArrow}>
              <Text style={styles.arrowText}>›</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Yonna Forex Payment Modal */}
      <Modal
        visible={showYonnaForexForm}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <YonnaForexPaymentForm
          amount={amount}
          onPaymentSuccess={handleYonnaForexSuccess}
          onPaymentError={handleYonnaForexError}
          onCancel={handleYonnaForexCancel}
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
  methodsList: {
    flex: 1,
    padding: 20,
  },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  methodItemDisabled: {
    opacity: 0.5,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconText: {
    fontSize: 24,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  methodNameDisabled: {
    color: '#999999',
  },
  methodDescription: {
    fontSize: 14,
    color: '#666666',
  },
  methodDescriptionDisabled: {
    color: '#CCCCCC',
  },
  methodArrow: {
    marginLeft: 12,
  },
  arrowText: {
    fontSize: 20,
    color: '#CCCCCC',
    fontWeight: '300',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  cancelButton: {
    paddingVertical: 14,
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
});

export default PaymentMethodSelector;