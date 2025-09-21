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
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { productService, type ProductDetail } from '../services/productService';
import { deliveryAddressService, type DeliveryAddress } from '../services/deliveryAddressService';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/api';

const { height: screenHeight } = Dimensions.get('window');

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
  
  // Delivery address state
  const [deliveryAddresses, setDeliveryAddresses] = useState<DeliveryAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<DeliveryAddress | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  
  // Add new address form state
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [newAddress, setNewAddress] = useState({
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    label: '',
  });
  const [makeDefault, setMakeDefault] = useState(false);
  
  // Validation errors for new address
  const [addressErrors, setAddressErrors] = useState<{
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  }>({});
  
  const { user, token } = useAuth();

  useEffect(() => {
    // Load product details immediately (critical for order)
    const loadProduct = async () => {
      try {
        setLoading(true);
        const productDetail = await productService.getProductById(productId);
        setProduct(productDetail);
        setLoading(false); // Hide loading as soon as product is loaded
      } catch (error) {
        console.error('Error loading product:', error);
        Alert.alert('Error', 'Failed to load product details. Please try again.');
        setLoading(false);
      }
    };

    loadProduct();
  }, [productId]);

  // Load addresses separately and lazily (non-critical for initial render)
  useEffect(() => {
    const loadAddresses = async () => {
      try {
        setLoadingAddresses(true);
        const response = await deliveryAddressService.getDeliveryAddresses();
        setDeliveryAddresses(response.addresses);
        
        // Set default address if available
        const defaultAddress = response.addresses.find(addr => addr.isDefault);
        if (defaultAddress) {
          setSelectedAddress(defaultAddress);
        }
      } catch (error) {
        console.error('Error loading addresses:', error);
        // Don't show error for addresses as they're not critical
      } finally {
        setLoadingAddresses(false);
      }
    };

    // Load addresses after a small delay to prioritize product loading
    const timer = setTimeout(loadAddresses, 100);
    return () => clearTimeout(timer);
  }, []);

  const loadDeliveryAddresses = async () => {
    try {
      setLoadingAddresses(true);
      const response = await deliveryAddressService.getDeliveryAddresses();
      setDeliveryAddresses(response.addresses);
      
      // Set default address if available
      const defaultAddress = response.addresses.find(addr => addr.isDefault);
      if (defaultAddress) {
        setSelectedAddress(defaultAddress);
      }
    } catch (error) {
      console.error('Error loading delivery addresses:', error);
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handleAddNewAddress = async () => {
    if (!validateNewAddress()) {
      return;
    }

    try {
      const response = await deliveryAddressService.createDeliveryAddress({
        ...newAddress,
        isDefault: makeDefault || deliveryAddresses.length === 0, // Set as default if user chooses or if first address
      });
      
      // Refresh addresses and select the new one
      await loadDeliveryAddresses();
      setSelectedAddress(response.address);
      
      // Reset form
      setNewAddress({
        address: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
        label: '',
      });
      setMakeDefault(false);
      setShowAddAddressModal(false);
      setAddressErrors({});
      
      Alert.alert('Success', 'Delivery address added successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add delivery address');
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this delivery address?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deliveryAddressService.deleteDeliveryAddress(addressId);
              
              // Refresh addresses
              await loadDeliveryAddresses();
              
              // If the deleted address was selected, clear selection
              if (selectedAddress?.id === addressId) {
                setSelectedAddress(null);
              }
              
              Alert.alert('Success', 'Delivery address deleted successfully!');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete delivery address');
            }
          },
        },
      ]
    );
  };

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

  const validateNewAddress = () => {
    const newErrors: {
      address?: string;
      city?: string;
      state?: string;
      country?: string;
    } = {};

    // Validate required fields
    const addressError = validateField('Address', newAddress.address);
    const cityError = validateField('City', newAddress.city);
    const stateError = validateField('State/Province', newAddress.state);
    const countryError = validateField('Country', newAddress.country);

    if (addressError) newErrors.address = addressError;
    if (cityError) newErrors.city = cityError;
    if (stateError) newErrors.state = stateError;
    if (countryError) newErrors.country = countryError;

    setAddressErrors(newErrors);

    // Trigger haptic feedback if there are errors
    if (Object.keys(newErrors).length > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    return Object.keys(newErrors).length === 0;
  };

  const clearFieldError = (field: string) => {
    if (addressErrors[field as keyof typeof addressErrors]) {
      setAddressErrors(prev => ({ ...prev, [field]: undefined }));
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

    // Validate selected address
    if (!selectedAddress) {
      Alert.alert('Delivery Address Required', 'Please select a delivery address to continue.');
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
          address: selectedAddress.address,
          city: selectedAddress.city,
          state: selectedAddress.state,
          postalCode: selectedAddress.postalCode || '',
          country: selectedAddress.country,
        }),
        // Add a unique client request id to avoid duplicate conflicts and enable repeat orders
        clientRequestId: `${product.id}-${Date.now()}`,
      };

      console.log('Placing order with data:', orderData);

      const response = await api.post('/api/orders', orderData);
      
      console.log('Order placed successfully:', response.data);
      
      Alert.alert(
        'Order Placed Successfully!',
        'Would you like to place another order for this product?',
        [
          {
            text: 'Done',
            onPress: () => navigation.navigate('Home' as any),
            style: 'default',
          },
          {
            text: 'Order Again',
            onPress: () => {
              // Keep the user on the same screen and reset quantity only
              setQuantity(1);
              // Optionally refresh product details to reflect stock
              loadProductDetails();
            },
            style: 'default',
          },
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
        Alert.alert('Duplicate Order', 'A similar order was recently submitted. Please try again in a moment.');
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
      <SafeAreaView style={styles.container}>
        <Header
          title="Place Order"
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading product details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
          
          {selectedAddress ? (
            <View style={styles.selectedAddressContainer}>
              <View style={styles.selectedAddressContent}>
                <View style={styles.selectedAddressHeader}>
                  <Ionicons name="location" size={20} color="#2563EB" />
                  <Text style={styles.selectedAddressLabel}>
                    {selectedAddress.label || 'Selected Address'}
                  </Text>
                  {selectedAddress.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Default</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.selectedAddressText}>{selectedAddress.address}</Text>
                <Text style={styles.selectedAddressText}>
                  {selectedAddress.city}, {selectedAddress.state} {selectedAddress.postalCode}
                </Text>
                <Text style={styles.selectedAddressText}>{selectedAddress.country}</Text>
              </View>
              <TouchableOpacity
                style={styles.changeAddressButton}
                onPress={() => setShowAddressModal(true)}
              >
                <Ionicons name="create-outline" size={16} color="#2563EB" />
                <Text style={styles.changeAddressButtonText}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.selectAddressButton}
              onPress={() => setShowAddressModal(true)}
            >
              <Ionicons name="add-circle-outline" size={24} color="#2563EB" />
              <Text style={styles.selectAddressButtonText}>Select Delivery Address</Text>
            </TouchableOpacity>
          )}
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
      <SafeAreaView style={styles.footerContainer}>
        <View style={styles.footer}>
          <Button
            label={submitting ? "Placing Order..." : "Place Order"}
            icon={submitting ? undefined : <Ionicons name="checkmark" size={20} color="#FFFFFF" />}
            fullWidth
            disabled={submitting}
            onPress={handlePlaceOrder}
          />
        </View>
      </SafeAreaView>

      {/* Delivery Address Selection Modal */}
      <Modal
        visible={showAddressModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddressModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <SafeAreaView style={styles.modalContent}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Delivery Address</Text>
                <TouchableOpacity
                  onPress={() => setShowAddressModal(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ flex: 1, marginBottom: 16 }} showsVerticalScrollIndicator={false}>
                {/* Existing Addresses */}
                {loadingAddresses ? (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#2563EB" />
                    <Text style={{ marginTop: 12, color: '#6B7280' }}>Loading addresses...</Text>
                  </View>
                ) : (
                  <View style={styles.addressList}>
                    {deliveryAddresses.map((address) => (
                      <View
                        key={address.id}
                        style={[
                          styles.addressItem,
                          selectedAddress?.id === address.id && styles.selectedAddressItem
                        ]}
                      >
                        <TouchableOpacity
                          style={styles.addressItemSelectable}
                          onPress={() => {
                            setSelectedAddress(address);
                            setShowAddressModal(false);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }}
                        >
                          <Ionicons 
                            name="location" 
                            size={20} 
                            color={selectedAddress?.id === address.id ? '#2563EB' : '#6B7280'} 
                          />
                          <View style={styles.addressItemContent}>
                            <View style={styles.addressItemHeader}>
                              <Text style={styles.addressItemLabel}>
                                {address.label || 'Address'}
                              </Text>
                              {address.isDefault && (
                                <View style={styles.defaultBadge}>
                                  <Text style={styles.defaultBadgeText}>Default</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.addressItemText}>{address.address}</Text>
                            <Text style={styles.addressItemText}>
                              {address.city}, {address.state} {address.postalCode}
                            </Text>
                            <Text style={styles.addressItemText}>{address.country}</Text>
                          </View>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={styles.deleteAddressButton}
                          onPress={() => handleDeleteAddress(address.id)}
                        >
                          <Ionicons name="trash-outline" size={20} color="#DC2626" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                                {/* Add New Address Button */}
                <TouchableOpacity
                  style={styles.addNewAddressButton}
                  onPress={() => {
                    setShowAddressModal(false);
                    setShowAddAddressModal(true);
                  }}
                >
                  <Ionicons name="add-circle-outline" size={24} color="#2563EB" />
                  <Text style={styles.addNewAddressButtonText}>Add New Address</Text>
                </TouchableOpacity>
              </ScrollView>

              {/* Footer */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelModalButton}
                  onPress={() => {
                    setShowAddressModal(false);
                  }}
                >
                  <Text style={styles.cancelModalButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Add New Address Modal */}
      <Modal
        visible={showAddAddressModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddAddressModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <SafeAreaView style={styles.modalContent}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add New Address</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowAddAddressModal(false);
                    setNewAddress({
                      address: '',
                      city: '',
                      state: '',
                      postalCode: '',
                      country: '',
                      label: '',
                    });
                    setAddressErrors({});
                  }}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={{ flex: 1, marginBottom: 16 }} 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.newAddressForm}>
                  <View style={styles.formInputGroup}>
                    <Text style={styles.formInputLabel}>Label (Optional)</Text>
                    <TextInput
                      style={styles.formTextInput}
                      value={newAddress.label}
                      onChangeText={(text) => setNewAddress(prev => ({ ...prev, label: text }))}
                      placeholder="e.g., Home, Office"
                    />
                  </View>

                  <View style={styles.formInputGroup}>
                    <Text style={styles.formInputLabel}>Street Address *</Text>
                    <TextInput
                      style={[
                        styles.formTextInput,
                        addressErrors.address && styles.formTextInputError
                      ]}
                      value={newAddress.address}
                      onChangeText={(text) => {
                        setNewAddress(prev => ({ ...prev, address: text }));
                        clearFieldError('address');
                      }}
                      placeholder="Enter your street address"
                      multiline
                      numberOfLines={2}
                    />
                    {addressErrors.address && (
                      <Text style={styles.formFieldErrorText}>{addressErrors.address}</Text>
                    )}
                  </View>

                  <View style={styles.formRow}>
                    <View style={styles.formInputGroup}>
                      <Text style={styles.formInputLabel}>City *</Text>
                      <TextInput
                        style={[
                          styles.formTextInput,
                          addressErrors.city && styles.formTextInputError
                        ]}
                        value={newAddress.city}
                        onChangeText={(text) => {
                          setNewAddress(prev => ({ ...prev, city: text }));
                          clearFieldError('city');
                        }}
                        placeholder="City"
                      />
                      {addressErrors.city && (
                        <Text style={styles.formFieldErrorText}>{addressErrors.city}</Text>
                      )}
                    </View>
                    <View style={styles.formInputGroup}>
                      <Text style={styles.formInputLabel}>State/Province *</Text>
                      <TextInput
                        style={[
                          styles.formTextInput,
                          addressErrors.state && styles.formTextInputError
                        ]}
                        value={newAddress.state}
                        onChangeText={(text) => {
                          setNewAddress(prev => ({ ...prev, state: text }));
                          clearFieldError('state');
                        }}
                        placeholder="State"
                      />
                      {addressErrors.state && (
                        <Text style={styles.formFieldErrorText}>{addressErrors.state}</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.formRow}>
                    <View style={styles.formInputGroup}>
                      <Text style={styles.formInputLabel}>Postal Code</Text>
                      <TextInput
                        style={styles.formTextInput}
                        value={newAddress.postalCode}
                        onChangeText={(text) => setNewAddress(prev => ({ ...prev, postalCode: text }))}
                        placeholder="Postal Code (optional)"
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.formInputGroup}>
                      <Text style={styles.formInputLabel}>Country *</Text>
                      <TextInput
                        style={[
                          styles.formTextInput,
                          addressErrors.country && styles.formTextInputError
                        ]}
                        value={newAddress.country}
                        onChangeText={(text) => {
                          setNewAddress(prev => ({ ...prev, country: text }));
                          clearFieldError('country');
                        }}
                        placeholder="Country"
                      />
                      {addressErrors.country && (
                        <Text style={styles.formFieldErrorText}>{addressErrors.country}</Text>
                      )}
                    </View>
                  </View>

                  {/* Make Default Address Toggle */}
                  <View style={styles.defaultToggleContainer}>
                    <View style={styles.defaultToggleContent}>
                      <View style={styles.defaultToggleInfo}>
                        <Ionicons name="star" size={20} color={makeDefault ? '#F59E0B' : '#9CA3AF'} />
                        <View style={styles.defaultToggleText}>
                          <Text style={styles.defaultToggleTitle}>Make Default Address</Text>
                          <Text style={styles.defaultToggleDescription}>
                            Set this as your default delivery address
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.toggleSwitch,
                          makeDefault && styles.toggleSwitchActive
                        ]}
                        onPress={() => {
                          setMakeDefault(!makeDefault);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                      >
                        <View style={[
                          styles.toggleKnob,
                          makeDefault && styles.toggleKnobActive
                        ]} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </ScrollView>

              {/* Footer */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelModalButton}
                  onPress={() => {
                    setShowAddAddressModal(false);
                    setNewAddress({
                      address: '',
                      city: '',
                      state: '',
                      postalCode: '',
                      country: '',
                      label: '',
                    });
                    setMakeDefault(false);
                    setAddressErrors({});
                  }}
                >
                  <Text style={styles.cancelModalButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.saveAddressButton}
                  onPress={handleAddNewAddress}
                >
                  <Text style={styles.saveAddressButtonText}>Save Address</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
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
  footerContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footer: {
    padding: 10,
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
  // Delivery Address Styles
  selectedAddressContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedAddressContent: {
    flex: 1,
  },
  selectedAddressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedAddressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
    flex: 1,
  },
  defaultBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  defaultBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  selectedAddressText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 2,
  },
  changeAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  changeAddressButtonText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  selectAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  selectAddressButtonText: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 0,
    height: screenHeight * 0.85,
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  addressList: {
    marginBottom: 24,
  },
  addressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  selectedAddressItem: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  addressItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  addressItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  addressItemLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
  },
  addressItemText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 2,
  },
  addNewAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    marginBottom: 24,
  },
  addNewAddressButtonText: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  newAddressForm: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formInputGroup: {
    flex: 1,
    marginBottom: 16,
  },
  formInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  formTextInput: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    fontSize: 16,
    color: '#374151',
    backgroundColor: '#FFFFFF',
  },
  formTextInputError: {
    borderColor: '#DC2626',
    borderWidth: 2,
  },
  formFieldErrorText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cancelModalButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelModalButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  saveAddressButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    alignItems: 'center',
  },
  saveAddressButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Default Address Toggle Styles
  defaultToggleContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  defaultToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  defaultToggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  defaultToggleText: {
    marginLeft: 12,
    flex: 1,
  },
  defaultToggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  defaultToggleDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: '#2563EB',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  toggleKnobActive: {
    transform: [{ translateX: 20 }],
  },
  // Address Item Styles
  addressItemSelectable: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deleteAddressButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    marginLeft: 8,
  },
}); 