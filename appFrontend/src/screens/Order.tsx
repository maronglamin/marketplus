import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { productService, type ProductDetail } from '../services/productService';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/api';

type RootStackParamList = {
  Home: undefined;
  ProductDetail: { productId: string };
  Order: { productId: string };
};

type OrderScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Order'>;
type OrderScreenRouteProp = RouteProp<RootStackParamList, 'Order'>;

export function Order() {
  const navigation = useNavigation<OrderScreenNavigationProp>();
  const route = useRoute<OrderScreenRouteProp>();
  const { productId } = route.params;
  
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [quantity, setQuantity] = useState(1);
  
  // Address fields
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  
  // Validation errors
  const [errors, setErrors] = useState<{
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  }>({});
  
  const { user, token } = useAuth();

  useEffect(() => {
    loadProductDetails();
  }, [productId]);

  const loadProductDetails = async () => {
    try {
      setLoading(true);
      const productDetail = await productService.getProductById(productId);
      setProduct(productDetail);
    } catch (error) {
      console.error('Error loading product details:', error);
      Alert.alert('Error', 'Failed to load product details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const incrementQuantity = () => {
    if (product && quantity < product.stock) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const formatPrice = (price: number, currencyCode: string) => {
    const currencySymbols: { [key: string]: string } = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      CAD: 'C$',
    };
    const symbol = currencySymbols[currencyCode] || currencyCode;
    
    const formattedPrice = price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    return `${symbol}${formattedPrice}`;
  };

  const calculateSubtotal = () => {
    if (!product) return 0;
    return product.price * quantity;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return subtotal; // No delivery cost included initially
  };

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

    // Trigger haptic feedback if there are errors
    if (Object.keys(newErrors).length > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    return Object.keys(newErrors).length === 0;
  };

  const clearFieldError = (field: string) => {
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handlePlaceOrder = async () => {
    // Basic validation
    if (!product) {
      Alert.alert('Product Error', 'Product information is missing. Please try again.');
      return;
    }

    // Validate quantity
    if (quantity <= 0) {
      Alert.alert('Invalid Quantity', 'Please select a valid quantity.');
      return;
    }

    if (quantity > product.stock) {
      Alert.alert('Insufficient Stock', `Only ${product.stock} items available. Please reduce your quantity.`);
      return;
    }

    // Validate address
    if (!validateAddress()) {
      return;
    }

    try {
      setSubmitting(true);
      
      const orderData = {
        productId: product.id,
        quantity,
        totalAmount: calculateTotal(),
        currencyCode: product.currencyCode,
        shippingAddress: JSON.stringify({
          address: address.trim(),
          city: city.trim(),
          state: state.trim(),
          postalCode: postalCode.trim(), // Optional field
          country: country.trim(),
        }),
      };

      console.log('Placing order with data:', orderData);

      const response = await api.post('/api/orders', orderData);
      
      console.log('Order placed successfully:', response.data);
      
      Alert.alert(
        'Order Placed Successfully!',
        'Your order has been placed. The seller will review your address and set delivery pricing.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Home' as any)
          }
        ]
      );
    } catch (error: any) {
      console.error('Error placing order:', error);
      
      // Handle specific API errors
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.message || 'Invalid order data. Please check your information.';
        Alert.alert('Order Error', errorMessage);
      } else if (error.response?.status === 401) {
        Alert.alert('Authentication Error', 'Your session has expired. Please log in again.');
      } else if (error.response?.status === 404) {
        Alert.alert('Product Not Found', 'The product is no longer available.');
      } else if (error.response?.status === 409 && error.response?.data?.message === 'Order already exist') {
        Alert.alert('Order already exist');
      } else if (error.response?.status === 409) {
        Alert.alert('Stock Unavailable', 'The requested quantity is no longer available. Please try with a smaller quantity.');
      } else {
        Alert.alert('Order Failed', 'Failed to place order. Please check your connection and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header
          title="Place Order"
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading product details...</Text>
        </View>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.container}>
        <Header
          title="Place Order"
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Product not found</Text>
          <Button
            label="Go Back"
            onPress={() => navigation.goBack()}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="Place Order"
        showBack
        onBack={() => navigation.goBack()}
      />
      
      <ScrollView style={styles.content}>
        {/* Product Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Product Summary</Text>
          <View style={styles.productCard}>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productPrice}>
              {formatPrice(product.price, product.currencyCode)}
            </Text>
            <Text style={styles.stockInfo}>
              Stock: {product.stock} available
            </Text>
          </View>
        </View>

        {/* Quantity Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quantity</Text>
          <View style={styles.quantityContainer}>
            <View style={styles.quantitySelector}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={decrementQuantity}
                disabled={quantity <= 1}
              >
                <Ionicons 
                  name="remove" 
                  size={20} 
                  color={quantity <= 1 ? '#9CA3AF' : '#374151'} 
                />
              </TouchableOpacity>
              <Text style={styles.quantity}>{quantity}</Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={incrementQuantity}
                disabled={quantity >= product.stock}
              >
                <Ionicons 
                  name="add" 
                  size={20} 
                  color={quantity >= product.stock ? '#9CA3AF' : '#374151'} 
                />
              </TouchableOpacity>
            </View>
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalPrice}>
                {formatPrice(calculateSubtotal(), product.currencyCode)}
              </Text>
            </View>
          </View>
        </View>

        {/* Delivery Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <View style={styles.addressForm}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Street Address *</Text>
              <TextInput
                style={[
                  styles.textInput,
                  errors.address && styles.textInputError
                ]}
                value={address}
                onChangeText={(text) => {
                  setAddress(text);
                  clearFieldError('address');
                }}
                placeholder="Enter your street address"
                multiline
                numberOfLines={2}
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
                />
                {errors.country && (
                  <Text style={styles.fieldErrorText}>{errors.country}</Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Delivery Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Options</Text>
          
          <View style={styles.noDeliveryOptions}>
            <Ionicons name="car-outline" size={48} color="#9CA3AF" />
            <Text style={styles.noDeliveryOptionsTitle}>Delivery Options Available at Checkout</Text>
            <Text style={styles.noDeliveryOptionsText}>
              Delivery options and costs will be configured during the checkout process. The seller will review your address and provide delivery details with pricing.
            </Text>
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.orderSummary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Product Price</Text>
              <Text style={styles.summaryValue}>
                {formatPrice(product.price, product.currencyCode)} × {quantity}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>
                {formatPrice(calculateTotal(), product.currencyCode)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Cost</Text>
              <Text style={styles.summaryValue}>To be determined</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>Pending delivery cost</Text>
            </View>
            
            <View style={styles.deliveryNote}>
              <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
              <Text style={styles.deliveryNoteText}>
                Delivery costs will be added by the seller after reviewing your address
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          label={submitting ? "Placing Order..." : "Place Order"}
          icon={submitting ? undefined : <Ionicons name="checkmark" size={20} color="#FFFFFF" />}
          fullWidth
          disabled={submitting}
          onPress={handlePlaceOrder}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    marginBottom: 16,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  productCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 4,
  },
  stockInfo: {
    fontSize: 14,
    color: '#6B7280',
  },
  quantityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
  },
  quantityButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quantity: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#374151',
  },
  totalContainer: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  addressForm: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  textInput: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    fontSize: 16,
    color: '#374151',
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
  orderSummary: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    color: '#374151',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
    marginTop: 8,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  noDeliveryOptions: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  noDeliveryOptionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  noDeliveryOptionsText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  deliveryNote: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
  },
  deliveryNoteText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
  },
}); 