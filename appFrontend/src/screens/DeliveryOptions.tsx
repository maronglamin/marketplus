import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { deliveryOptionsService, type DeliveryOption } from '../services/deliveryOptionsService';
import { productService, type Product } from '../services/productService';

interface RouteParams {
  productId: string;
}

export function DeliveryOptions() {
  const navigation = useNavigation();
  const route = useRoute();
  const { productId } = route.params as RouteParams;

  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    loadProductAndDeliveryOptions();
  }, [productId]);

  const loadProductAndDeliveryOptions = async () => {
    try {
      setLoading(true);

      // Load product details first to get the currency - use seller endpoint
      const productDetails = await productService.getSellerProductById(productId);
      setProduct(productDetails);

      // Load delivery options
      const options = await deliveryOptionsService.getDeliveryOptions(productId);
      if (options.length === 0) {
        // Ensure exactly one default option exists
        const singleDefaultOption: DeliveryOption = {
          deliveryType: 'STANDARD',
          name: '',
          description: '',
          price: 0,
          currencyCode: productDetails.currencyCode,
          estimatedDays: 1,
          isDefault: true,
          isActive: true,
        };
        setDeliveryOptions([singleDefaultOption]);
      } else {
        // Keep existing options, correct currency, and ensure a single default
        const optionsWithCorrectCurrency = options.map(option => ({
          ...option,
          currencyCode: productDetails.currencyCode,
        }));
        const defaultIndexes = optionsWithCorrectCurrency
          .map((o, idx) => (o.isDefault ? idx : -1))
          .filter(idx => idx !== -1);
        if (defaultIndexes.length === 0 && optionsWithCorrectCurrency.length > 0) {
          optionsWithCorrectCurrency[0].isDefault = true;
        } else if (defaultIndexes.length > 1) {
          const firstDefault = defaultIndexes[0];
          optionsWithCorrectCurrency.forEach((o, idx) => {
            o.isDefault = idx === firstDefault;
          });
        }
        setDeliveryOptions(optionsWithCorrectCurrency);
      }
    } catch (error) {
      console.error('Error loading product and delivery options:', error);
      // Don't set default options on error - wait for product to load
      setDeliveryOptions([]);
    } finally {
      setLoading(false);
    }
  };

  const addDeliveryOption = () => {
    if (!product) {
      Alert.alert('Error', 'Product information not loaded. Please try again.');
      return;
    }
    const newOption: DeliveryOption = {
      deliveryType: 'STANDARD',
      name: '',
      description: '',
      price: 0,
      currencyCode: product.currencyCode,
      estimatedDays: 1,
      isDefault: false,
      isActive: true,
    };
    setDeliveryOptions([...deliveryOptions, newOption]);
  };

  const updateDeliveryOption = (index: number, field: keyof DeliveryOption, value: any) => {
    const updatedOptions = [...deliveryOptions];
    updatedOptions[index] = { ...updatedOptions[index], [field]: value };
    
    if (field === 'isDefault' && value === true) {
      updatedOptions.forEach((option, i) => {
        if (i !== index) {
          option.isDefault = false;
        }
      });
    }
    
    setDeliveryOptions(updatedOptions);
  };

  const removeDeliveryOption = (index: number) => {
    Alert.alert(
      'Remove Delivery Option',
      'Are you sure you want to remove this delivery option?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const updatedOptions = deliveryOptions.filter((_, i) => i !== index);
            setDeliveryOptions(updatedOptions);
          },
        },
      ]
    );
  };

  const saveDeliveryOptions = async () => {
    try {
      setSaving(true);
      
      if (!product) {
        Alert.alert('Error', 'Product information not loaded. Please try again.');
        return;
      }
      
      if (deliveryOptions.length === 0) {
        Alert.alert('Error', 'At least one delivery option is required');
        return;
      }

      const hasDefault = deliveryOptions.some(option => option.isDefault);
      if (!hasDefault) {
        Alert.alert('Error', 'At least one delivery option must be set as default');
        return;
      }

      // Ensure all options use the product's currency
      const optionsWithCorrectCurrency = deliveryOptions.map(option => ({
        ...option,
        currencyCode: product.currencyCode
      }));

      await deliveryOptionsService.updateDeliveryOptions(productId, optionsWithCorrectCurrency);
      
      Alert.alert('Success', 'Delivery options saved successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error saving delivery options:', error);
      Alert.alert('Error', 'Failed to save delivery options');
    } finally {
      setSaving(false);
    }
  };

  const deliveryTypeLabels = deliveryOptionsService.getDeliveryTypeLabels();

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading delivery options...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent />
      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.title}>Delivery Options</Text>
            <TouchableOpacity
              onPress={saveDeliveryOptions}
              disabled={saving}
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
          >
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Configure Delivery Options</Text>
              <Text style={styles.sectionDescription}>
                Set up delivery options for your product. At least one option must be set as default.
              </Text>
            </View>

            {deliveryOptions.map((option, index) => (
              <View key={index} style={styles.optionCard}>
                <View style={styles.optionHeader}>
                  <Text style={styles.optionTitle}>Option {index + 1}</Text>
                  <TouchableOpacity
                    onPress={() => removeDeliveryOption(index)}
                    style={styles.removeButton}
                  >
                    <Ionicons name="trash-outline" size={20} color="#DC2626" />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Delivery Type</Text>
                  <View style={styles.pickerContainer}>
                    {Object.entries(deliveryTypeLabels).map(([type, label]) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.pickerOption,
                          option.deliveryType === type && styles.pickerOptionSelected,
                        ]}
                        onPress={() => updateDeliveryOption(index, 'deliveryType', type)}
                      >
                        <Text
                          style={[
                            styles.pickerOptionText,
                            option.deliveryType === type && styles.pickerOptionTextSelected,
                          ]}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Name</Text>
                  <TextInput
                    style={styles.textInput}
                    value={option.name}
                    onChangeText={(text) => updateDeliveryOption(index, 'name', text)}
                    placeholder="e.g., Standard Delivery"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Description (Optional)</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={option.description}
                    onChangeText={(text) => updateDeliveryOption(index, 'description', text)}
                    placeholder="e.g., Regular delivery within 3-5 business days"
                    multiline
                    numberOfLines={3}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, {flex: 1}]}>
                    <Text style={styles.inputLabel}>Price</Text>
                    <TextInput
                      style={styles.textInput}
                      value={option.price.toString()}
                      onChangeText={(text) => updateDeliveryOption(index, 'price', parseFloat(text) || 0)}
                      placeholder="0.00"
                      keyboardType="numeric"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                  <View style={[styles.inputGroup, {flex: 1, marginLeft: 12}]}>
                    <Text style={styles.inputLabel}>Estimated Days</Text>
                    <TextInput
                      style={styles.textInput}
                      value={option.estimatedDays.toString()}
                      onChangeText={(text) => updateDeliveryOption(index, 'estimatedDays', parseInt(text) || 1)}
                      placeholder="1"
                      keyboardType="numeric"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Currency</Text>
                  <View style={styles.currencyDisplayContainer}>
                    <Text style={styles.currencyDisplayText}>
                      {product?.currencyCode}
                    </Text>
                    <Text style={styles.currencyNote}>
                      Product currency (fixed)
                    </Text>
                  </View>
                </View>
                <View style={styles.checkboxContainer}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => updateDeliveryOption(index, 'isDefault', !option.isDefault)}
                  >
                    {option.isDefault && (
                      <Ionicons name="checkmark" size={16} color="#2563EB" />
                    )}
                  </TouchableOpacity>
                  <Text style={styles.checkboxLabel}>Set as default option</Text>
                </View>
              </View>
            ))}
            <TouchableOpacity 
              style={[styles.addButton, !product && styles.disabledButton]} 
              onPress={addDeliveryOption}
              disabled={!product}
            >
              <Ionicons name="add-circle-outline" size={24} color={product ? "#2563EB" : "#9CA3AF"} />
              <Text style={[styles.addButtonText, !product && styles.disabledText]}>
                {product ? 'Add Delivery Option' : 'Loading product...'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 16,
    paddingBottom: 16,
    minHeight: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 64 : 64,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  backButton: { 
    padding: 12 
  },
  title: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#111827' 
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  saveButtonDisabled: { backgroundColor: '#9CA3AF' },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#6B7280' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 },
  sectionDescription: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
  optionCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  optionTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  removeButton: { padding: 4 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#111827',
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row' },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pickerOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    marginBottom: 8,
  },
  pickerOptionSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#374151',
  },
  pickerOptionTextSelected: {
    color: '#FFFFFF',
  },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxLabel: { fontSize: 14, color: '#374151' },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#2563EB',
    borderStyle: 'dashed',
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 32,
  },
  addButtonText: { fontSize: 16, fontWeight: '600', color: '#2563EB', marginLeft: 8 },
  currencyDisplayContainer: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  currencyDisplayText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
    marginBottom: 4,
  },
  currencyNote: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  contentContainer: {
    paddingBottom: 64,
  },
  disabledButton: {
    opacity: 0.7,
  },
  disabledText: {
    color: '#9CA3AF',
  },
}); 