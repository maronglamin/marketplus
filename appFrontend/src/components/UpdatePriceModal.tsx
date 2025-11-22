import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getAuthToken } from '../api/auth';
import { WorldCurrencyPicker } from './WorldCurrencyPicker';
import { deliveryOptionsService } from '../services/deliveryOptionsService';

interface UpdatePriceModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  rentalId: string;
  currencySymbol?: string;
  currency?: string;
  currentAgreedPrice?: number;
}

export default function UpdatePriceModal({ 
  isVisible, 
  onClose, 
  onSuccess, 
  rentalId, 
  currencySymbol = '$',
  currency = 'USD',
  currentAgreedPrice
}: UpdatePriceModalProps) {
  const [agreedPrice, setAgreedPrice] = useState(currentAgreedPrice ? currentAgreedPrice.toString() : '');
  const [selectedCurrency, setSelectedCurrency] = useState(currency);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!agreedPrice.trim()) {
      Alert.alert('Error', 'Please enter an agreed price');
      return;
    }

    const price = parseFloat(agreedPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Please enter a valid price greater than 0');
      return;
    }

    try {
      setIsSubmitting(true);
      const token = await getAuthToken();
      
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/rentals/${rentalId}/update-agreed-price`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          agreedPrice: price,
          currency: selectedCurrency,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update agreed price: ${response.status} - ${errorText}`);
      }

      Alert.alert('Success', 'Agreed price updated successfully!', [
        {
          text: 'OK',
          onPress: () => {
            setAgreedPrice('');
            setSelectedCurrency(currency);
            onSuccess();
            onClose();
          }
        }
      ]);
    } catch (error) {
      console.error('Error updating agreed price:', error);
      Alert.alert('Error', 'Failed to update agreed price. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setAgreedPrice(currentAgreedPrice ? currentAgreedPrice.toString() : '');
      setSelectedCurrency(currency);
      onClose();
    }
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      onRequestClose={handleClose}
      {...(Platform.OS === 'ios' ? { presentationStyle: 'pageSheet' as const } : {})}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={handleClose} 
            style={styles.closeButton}
            disabled={isSubmitting}
          >
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.title}>Update Agreed Price</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Content */}
        <KeyboardAvoidingView 
          style={styles.keyboardContainer}
          enabled={Platform.OS === 'ios'}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <ScrollView 
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.body}>
              <View style={styles.iconContainer}>
                <Ionicons name="pricetag" size={48} color="#10B981" />
              </View>
              
              <Text style={styles.description}>
                Update the agreed price for this rental request. This will be the final price that both parties agree upon.
              </Text>

              {/* Currency Picker */}
              <View style={styles.currencySection}>
                <Text style={styles.sectionTitle}>Select Currency</Text>
                <WorldCurrencyPicker
                  value={selectedCurrency}
                  onChange={setSelectedCurrency}
                  style={styles.currencyPicker}
                />
              </View>

              {/* Price Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Agreed Price</Text>
                <View style={styles.priceInputContainer}>
                  <Text style={styles.currencySymbol}>
                    {selectedCurrency ? deliveryOptionsService.getCurrencyByCode(selectedCurrency)?.symbol || '' : ''}
                  </Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="0.00"
                    value={agreedPrice}
                    onChangeText={setAgreedPrice}
                    keyboardType="decimal-pad"
                    autoFocus={Platform.OS === 'ios'}
                    editable={!isSubmitting}
                  />
                </View>
              </View>

              <View style={styles.tipsContainer}>
                <Text style={styles.tipsTitle}>💡 Tips for agreed pricing:</Text>
                <Text style={styles.tipText}>• Consider the proposed price from the customer</Text>
                <Text style={styles.tipText}>• Factor in any additional services or fees</Text>
                <Text style={styles.tipText}>• Ensure the price is fair for both parties</Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Action Buttons - Fixed at bottom */}
        <View style={styles.actionsContainer}>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.cancelButton, isSubmitting && styles.disabledButton]}
              onPress={handleClose}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.submitButton, 
                (!agreedPrice.trim() || isSubmitting) && styles.disabledButton
              ]}
              onPress={handleSubmit}
              disabled={!agreedPrice.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
              )}
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Updating...' : 'Update Price'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerSpacer: {
    width: 40,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  body: {
    alignItems: 'center',
    marginTop: 32,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  currencySection: {
    width: '100%',
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  currencyPicker: {
    // Add any specific styles for the WorldCurrencyPicker if needed
  },
  inputContainer: {
    marginBottom: 32,
    width: '100%',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#F9FAFB',
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  tipsContainer: {
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
    width: '100%',
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    color: '#166534',
    marginBottom: 4,
  },
  actionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
