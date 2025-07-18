import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { deliveryAddressService, type CreateDeliveryAddressData } from '../services/deliveryAddressService';

interface DeliveryAddressBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onAddressCreated: (address: any) => void;
  isFirstAddress?: boolean;
}

export function DeliveryAddressBottomSheet({
  isVisible,
  onClose,
  onAddressCreated,
  isFirstAddress = false,
}: DeliveryAddressBottomSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['85%', '95%'], []);
  
  // Keyboard handling
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Form state
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [addressLabel, setAddressLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<{
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  }>({});

  // Show/hide bottom sheet
  React.useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.snapToIndex(0);
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isVisible]);

  // Keyboard event listeners
  React.useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
        // Automatically snap to higher position when keyboard appears
        setTimeout(() => {
          bottomSheetRef.current?.snapToIndex(1);
        }, 100);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        // Return to normal position when keyboard hides
        setTimeout(() => {
          bottomSheetRef.current?.snapToIndex(0);
        }, 100);
      }
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      onClose();
    } else if (keyboardVisible && index === 0) {
      // When keyboard is visible, snap to the higher position
      bottomSheetRef.current?.snapToIndex(1);
    }
  }, [onClose, keyboardVisible]);

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

  const validateField = (field: string, value: string, required: boolean = true) => {
    if (required && !value.trim()) {
      return `${field} is required`;
    }
    return '';
  };

  const validateAddress = () => {
    const newErrors: {
      address?: string;
      city?: string;
      state?: string;
      country?: string;
    } = {};

    // Validate required fields
    const addressError = validateField('Address', address);
    const cityError = validateField('City', city);
    const stateError = validateField('State/Province', state);
    const countryError = validateField('Country', country);

    if (addressError) newErrors.address = addressError;
    if (cityError) newErrors.city = cityError;
    if (stateError) newErrors.state = stateError;
    if (countryError) newErrors.country = countryError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clearFieldError = (field: string) => {
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleCreateAddress = async () => {
    // Dismiss keyboard first
    Keyboard.dismiss();
    
    if (!validateAddress()) {
      return;
    }

    try {
      setSubmitting(true);
      
      const addressData: CreateDeliveryAddressData = {
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        postalCode: postalCode.trim() || undefined,
        country: country.trim(),
        label: addressLabel.trim() || undefined,
        isDefault: isFirstAddress // Set as default if it's the first address
      };

      const response = await deliveryAddressService.createDeliveryAddress(addressData);
      
      // Call the callback with the new address
      onAddressCreated(response.address);
      
      // Clear form and close
      handleClose();
      
      Alert.alert('Success', 'Delivery address created successfully');
    } catch (error: any) {
      console.error('Error creating delivery address:', error);
      Alert.alert('Error', error.message || 'Failed to create delivery address');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    // Dismiss keyboard first
    Keyboard.dismiss();
    
    // Clear form fields
    setAddress('');
    setCity('');
    setState('');
    setPostalCode('');
    setCountry('');
    setAddressLabel('');
    setErrors({});
    setSubmitting(false);
    onClose();
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

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
      keyboardBehavior={Platform.OS === 'ios' ? 'interactive' : 'extend'}
      keyboardBlurBehavior="restore"
    >
      <BottomSheetView style={styles.content}>
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <KeyboardAvoidingView 
            style={styles.keyboardAvoidingView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Add Delivery Address</Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Form */}
              <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Address Label (Optional)</Text>
            <TextInput
              style={styles.textInput}
              value={addressLabel}
              onChangeText={setAddressLabel}
              placeholder="e.g., Home, Work, Office"
              returnKeyType="next"
              blurOnSubmit={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Street Address *</Text>
            <TextInput
              style={[
                styles.textInput,
                styles.multilineInput,
                errors.address && styles.textInputError
              ]}
              value={address}
              onChangeText={(text) => {
                setAddress(text);
                clearFieldError('address');
              }}
              placeholder="Enter your street address"
              multiline
              numberOfLines={3}
              returnKeyType="next"
              blurOnSubmit={false}
            />
            {errors.address && (
              <Text style={styles.fieldErrorText}>{errors.address}</Text>
            )}
          </View>
          
          <View style={styles.row}>
            <View style={[styles.inputGroup, {flex: 1}]}>
              <Text style={styles.inputLabel}>City *</Text>
              <TextInput
                style={[
                  styles.textInput,
                  errors.city && styles.textInputError
                ]}
                value={city}
                onChangeText={(text) => {
                  setCity(text);
                  clearFieldError('city');
                }}
                placeholder="City"
                returnKeyType="next"
                blurOnSubmit={false}
              />
              {errors.city && (
                <Text style={styles.fieldErrorText}>{errors.city}</Text>
              )}
            </View>
            <View style={[styles.inputGroup, {flex: 1, marginLeft: 12}]}>
              <Text style={styles.inputLabel}>State/Province *</Text>
              <TextInput
                style={[
                  styles.textInput,
                  errors.state && styles.textInputError
                ]}
                value={state}
                onChangeText={(text) => {
                  setState(text);
                  clearFieldError('state');
                }}
                placeholder="State"
                returnKeyType="next"
                blurOnSubmit={false}
              />
              {errors.state && (
                <Text style={styles.fieldErrorText}>{errors.state}</Text>
              )}
            </View>
          </View>
          
          <View style={styles.row}>
            <View style={[styles.inputGroup, {flex: 1}]}>
              <Text style={styles.inputLabel}>Postal Code</Text>
              <TextInput
                style={styles.textInput}
                value={postalCode}
                onChangeText={setPostalCode}
                placeholder="Postal Code (optional)"
                keyboardType="numeric"
                returnKeyType="next"
                blurOnSubmit={false}
              />
            </View>
            <View style={[styles.inputGroup, {flex: 1, marginLeft: 12}]}>
              <Text style={styles.inputLabel}>Country *</Text>
              <TextInput
                style={[
                  styles.textInput,
                  errors.country && styles.textInputError
                ]}
                value={country}
                onChangeText={(text) => {
                  setCountry(text);
                  clearFieldError('country');
                }}
                placeholder="Country"
                returnKeyType="done"
                onSubmitEditing={handleCreateAddress}
              />
              {errors.country && (
                <Text style={styles.fieldErrorText}>{errors.country}</Text>
              )}
            </View>
          </View>

                        {/* Action Buttons */}
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
                  onPress={handleCreateAddress}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Address</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
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
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
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
  form: {
    flex: 1,
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
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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