import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/api';
import { deliveryOptionsService, type DeliveryOption } from '../services/deliveryOptionsService';
import { WorldCurrencyPicker } from '../components/WorldCurrencyPicker';
import Constants from 'expo-constants';
import type { AppStackParamList } from '../navigation/AppNavigator';

const LOCAL_IP = Constants.expoConfig?.extra?.localIp || '192.168.254.48';
const API_URL = process.env.EXPO_PUBLIC_API_URL || `http://${LOCAL_IP}:3000`;
const { height: screenHeight } = Dimensions.get('window');

type OrderDetailsNavigationProp = NativeStackNavigationProp<AppStackParamList, 'OrderDetails'>;

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product: {
    id: string;
    title: string;
    images: string[];
    seller: {
      id: string;
      name: string;
    };
  };
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  currencyCode: string;
  deliveryCurrency?: string;
  shippingAmount: number;
  createdAt: string;
  updatedAt: string;
  sellerId: string;
  customer: {
    id: string;
    name: string;
    phone: string;
  };
  items: OrderItem[];
  shippingMethod?: string;
  shippingAddress?: {
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  seller: {
    id: string;
    name: string;
    phone: string;
  };
}

export function OrderDetails() {
  const navigation = useNavigation<OrderDetailsNavigationProp>();
  const route = useRoute();
  const { orderId } = route.params as { orderId: string };
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [selectedDeliveryOption, setSelectedDeliveryOption] = useState<string>('');
  const [customDeliveryPrice, setCustomDeliveryPrice] = useState('');
  const [customDeliveryCurrency, setCustomDeliveryCurrency] = useState('');
  const [selectedDeliveryType, setSelectedDeliveryType] = useState<string>('');
  const [updatingDelivery, setUpdatingDelivery] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);

  const { user, token, refreshUser } = useAuth();

  // Get delivery type labels
  const deliveryTypeLabels = deliveryOptionsService.getDeliveryTypeLabels();
  
  useEffect(() => {
    loadOrderDetails();
  }, [orderId]);

  // Reload order details when user becomes available (in case order was loaded before user)
  useEffect(() => {
    if (user && !order && !loading) {
      loadOrderDetails();
    }
  }, [user, order, loading]);

  useEffect(() => {
    if (user && order) {
      if (order.sellerId === user.id && order.items.length > 0) {
        loadDeliveryOptions(order.items[0].product.id);
      }
    }
  }, [user, order]);

  // Refresh user data to ensure we have the latest information
  useEffect(() => {
    const checkAndRefreshUserData = async () => {
      try {
        const response = await api.get('/api/users/me');
        
        // Check if there's a mismatch between AuthContext and API
        if (response.data && response.data.id !== user?.id) {
          // Use the AuthContext's refreshUser method
          await refreshUser();
        }
      } catch (error) {
        console.error('Error checking user data:', error);
      }
    };
    
    if (user) {
      checkAndRefreshUserData();
    }
  }, [user, refreshUser]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/api/orders/${orderId}`);
      const orderData = response.data;
      
      setOrder(orderData);
      
      if (orderData.sellerId === user?.id && orderData.items.length > 0) {
        await loadDeliveryOptions(orderData.items[0].product.id);
      }
    } catch (error) {
      console.error('Error loading order details:', error);
      setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const loadDeliveryOptions = async (productId: string) => {
    try {
      const response = await deliveryOptionsService.getDeliveryOptions(productId);
      setDeliveryOptions(response);
    } catch (error) {
      console.error('Error loading delivery options:', error);
    }
  };

  const checkPaymentMethods = async () => {
    try {
      setLoadingPaymentMethods(true);
      const response = await api.get('/api/payment-methods');
      setPaymentMethods(response.data.paymentMethods || []);
      return response.data.paymentMethods?.length > 0;
    } catch (error) {
      console.error('Error checking payment methods:', error);
      setPaymentMethods([]);
      return false;
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  const handleUpdateDeliveryPricing = async () => {
    // Security check - only seller can update delivery pricing
    if (order?.sellerId !== user?.id) {
      Alert.alert('Access Denied', 'Only the product owner can update delivery pricing.');
      return;
    }

    // Clear previous validation errors
    setValidationErrors([]);
    
    // Validate inputs
    const errors: string[] = [];
    
    if (!selectedDeliveryOption && !customDeliveryPrice) {
      errors.push('Please select a delivery option or enter a custom price');
    }
    
    if (customDeliveryPrice && !customDeliveryCurrency) {
      errors.push('Please select a currency for the custom price');
    }
    
    if (customDeliveryPrice) {
      const price = parseFloat(customDeliveryPrice);
      if (isNaN(price) || price < 0) {
        errors.push('Please enter a valid price (must be a positive number)');
      }
    }
    
    if (!selectedDeliveryType) {
      errors.push('Please select a delivery type');
    }
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      Alert.alert('Validation Error', errors.join('\n'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    
    try {
      setUpdatingDelivery(true);
      
      const payload: any = {
        deliveryType: selectedDeliveryType,
        shippingMethod: deliveryTypeLabels[selectedDeliveryType as keyof typeof deliveryTypeLabels] || selectedDeliveryType
      };
      
      if (selectedDeliveryOption) {
        payload.deliveryOptionId = selectedDeliveryOption;
      } else if (customDeliveryPrice) {
        payload.customPrice = parseFloat(customDeliveryPrice);
        payload.customCurrency = customDeliveryCurrency;
      }
      
      const response = await api.patch(`/api/orders/${orderId}/delivery-pricing`, payload);
      
      if (order) {
        setOrder({
          ...order,
          shippingAmount: response.data.order.shippingAmount,
          deliveryCurrency: response.data.order.deliveryCurrency,
          totalAmount: response.data.order.totalAmount,
          shippingMethod: response.data.order.shippingMethod
        });
      }
      
      setShowDeliveryModal(false);
      Alert.alert('Success', 'Delivery pricing updated successfully');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error updating delivery pricing:', error);
      Alert.alert('Error', 'Failed to update delivery pricing');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setUpdatingDelivery(false);
    }
  };

  const updateOrderStatus = async (newStatus: string) => {
    try {
      setUpdatingStatus(true);
      
      // Check if this is a buyer action (authorize or cancel)
      const isBuyerAction = newStatus === 'authorized' || newStatus === 'cancelled';
      
      if (isBuyerAction) {
        // Use the buyer authorization endpoint
        const action = newStatus === 'authorized' ? 'authorize' : 'cancel';
        
        await api.patch(`/api/orders/${orderId}/authorize`, {
          action: action,
        }, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } else {
        // Use the original seller status update endpoint
        await api.patch(`/api/orders/${orderId}/status`, {
          status: newStatus,
        }, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
      
      setOrder(prev => prev ? { ...prev, status: newStatus } : null);
      Alert.alert('Success', `Order status updated to ${newStatus}`);
    } catch (error: any) {
      console.error('Error updating order status:', error);
      Alert.alert('Error', 'Failed to update order status. Please try again.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return '#F59E0B';
      case 'confirmed': return '#3B82F6';
      case 'processing': return '#8B5CF6';
      case 'shipped': return '#10B981';
      case 'delivered': return '#059669';
      case 'cancelled': return '#EF4444';
      case 'refunded': return '#6B7280';
      case 'authorized': return '#10B981';
      default: return '#6B7280';
    }
  };

  const formatPrice = (price: number, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAvailableStatuses = (currentStatus: string) => {
    const statusFlow = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['processing', 'cancelled'],
      'processing': ['shipped', 'cancelled'],
      'shipped': ['delivered'],
      'delivered': [],
      'cancelled': [],
      'refunded': [],
    };
    
    return statusFlow[currentStatus.toLowerCase() as keyof typeof statusFlow] || [];
  };

  const getBuyerAvailableStatuses = (currentStatus: string) => {
    // Buyers can only change status to authorized or cancelled
    const buyerStatusFlow = {
      'pending': ['authorized', 'cancelled'],
      'confirmed': ['authorized', 'cancelled'],
      'processing': ['authorized', 'cancelled'],
      'shipped': ['authorized'],
      'delivered': ['authorized'],
      'authorized': ['cancelled'],
      'cancelled': [],
      'refunded': [],
    };
    
    return buyerStatusFlow[currentStatus.toLowerCase() as keyof typeof buyerStatusFlow] || [];
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error || 'Order not found'}</Text>
          <TouchableOpacity onPress={loadOrderDetails} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const availableStatuses = getAvailableStatuses(order.status);
  const buyerAvailableStatuses = getBuyerAvailableStatuses(order.status);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={styles.headerSpacer} /> 
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statusSection}>
          <View style={styles.statusHeader}>
            <Text style={styles.sectionTitle}>Order Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(order.status)}20` }]}>
              <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </Text>
            </View>
          </View>

          <Text style={styles.customerName}>Order #{order.orderNumber}</Text>

          {/* Buyer Status Actions - Only show to buyers */}
          {(() => {
            const currentUserId = user?.id;
            const orderSellerId = order?.sellerId;
            const isBuyer = currentUserId !== orderSellerId;
            
            return isBuyer && buyerAvailableStatuses.length > 0 ? (
              <View style={styles.statusActions}>
                <Text style={styles.statusActionsTitle}>Buyer Actions:</Text>
                <View style={styles.statusButtons}>
                  {buyerAvailableStatuses.map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusButton,
                        status === 'authorized' && styles.authorizeButton,
                        status === 'cancelled' && styles.buyerCancelButton
                      ]}
                      onPress={() => updateOrderStatus(status)}
                      disabled={updatingStatus}
                    >
                      <Text style={[
                        styles.statusButtonText,
                        status === 'authorized' && styles.authorizeButtonText,
                        status === 'cancelled' && styles.buyerCancelButtonText
                      ]}>
                        {status === 'authorized' ? 'Authorize Order' : status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null;
          })()}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{order.customer.name}</Text>
            <Text style={styles.customerEmail}>{order.customer.phone}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          <View style={styles.itemsContainer}>
            {order.items.map((item, index) => (
              <View key={item.id} style={[
                styles.orderItem,
                index === order.items.length - 1 && styles.lastOrderItem
              ]}>
                <Image
                  source={{ 
                    uri: item.product.images && item.product.images.length > 0 
                      ? (item.product.images[0].startsWith('http') 
                          ? item.product.images[0] 
                          : `${API_URL}${item.product.images[0]}`)
                      : 'https://via.placeholder.com/80x80?text=No+Image'
                  }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
                <View style={styles.itemDetails}>
                  <Text style={styles.productName}>{item.product.title}</Text>
                  <Text style={styles.itemPrice}>
                    {formatPrice(item.unitPrice, order.currencyCode)} × {item.quantity}
                  </Text>
                  <Text style={styles.itemTotal}>
                    {formatPrice(item.totalPrice, order.currencyCode)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Delivery Information</Text>
            {/* Only show update button if user is the seller */}
            {(() => {
              const currentUserId = user?.id;
              const orderSellerId = order?.sellerId;
              const isSeller = currentUserId === orderSellerId;
              
              return isSeller ? (
                <TouchableOpacity
                  style={styles.updateButton}
                  onPress={() => {
                    setShowDeliveryModal(true);
                    // Initialize with current shipping method if available
                    if (order.shippingMethod) {
                      const currentType = Object.keys(deliveryTypeLabels).find(
                        key => deliveryTypeLabels[key as keyof typeof deliveryTypeLabels] === order.shippingMethod
                      );
                      setSelectedDeliveryType(currentType || '');
                    } else {
                      setSelectedDeliveryType('');
                    }
                    setSelectedDeliveryOption('');
                    setCustomDeliveryPrice('');
                    setCustomDeliveryCurrency('');
                    setValidationErrors([]);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }}
                >
                  <Ionicons name="create-outline" size={16} color="#2563EB" />
                  <Text style={styles.updateButtonText}>Update Pricing</Text>
                </TouchableOpacity>
              ) : null;
            })()}
          </View>
          
          {order.shippingAddress ? (
            <View style={styles.shippingAddress}>
              <View style={styles.addressRow}>
                <Text style={styles.addressLabel}>Address:</Text>
                <Text style={styles.addressValue}>{order.shippingAddress.address}</Text>
              </View>
              <View style={styles.addressRow}>
                <Text style={styles.addressLabel}>City:</Text>
                <Text style={styles.addressValue}>{order.shippingAddress.city}</Text>
              </View>
              <View style={styles.addressRow}>
                <Text style={styles.addressLabel}>State/Province:</Text>
                <Text style={styles.addressValue}>{order.shippingAddress.state}</Text>
              </View>
              {order.shippingAddress.postalCode && (
                <View style={styles.addressRow}>
                  <Text style={styles.addressLabel}>Postal Code:</Text>
                  <Text style={styles.addressValue}>{order.shippingAddress.postalCode}</Text>
                </View>
              )}
              <View style={styles.addressRow}>
                <Text style={styles.addressLabel}>Country:</Text>
                <Text style={styles.addressValue}>{order.shippingAddress.country}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.noAddressContainer}>
              <Text style={styles.noAddressText}>No delivery address provided</Text>
            </View>
          )}

          {order.shippingMethod && (
            <View style={styles.shippingInfo}>
              <Text style={styles.shippingMethod}>Method: {order.shippingMethod}</Text>
              {order.shippingAmount > 0 && (
                <Text style={styles.shippingAmount}>
                  Cost: {formatPrice(order.shippingAmount, order.deliveryCurrency || order.currencyCode)}
                </Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Order Date:</Text>
            <Text style={styles.summaryValue}>{formatDate(order.createdAt)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Last Updated:</Text>
            <Text style={styles.summaryValue}>{formatDate(order.updatedAt)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal:</Text>
            <Text style={styles.summaryValue}>
              {formatPrice(order.totalAmount - order.shippingAmount, order.currencyCode)}
            </Text>
          </View>
          {order.shippingAmount > 0 ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery:</Text>
              <Text style={styles.summaryValue}>
                {formatPrice(order.shippingAmount, order.deliveryCurrency || order.currencyCode)}
              </Text>
            </View>
          ) : (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery:</Text>
              <Text style={styles.summaryValue}>To be determined</Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Amount:</Text>
            <Text style={styles.totalValue}>
              {order.shippingAmount > 0 
                ? formatPrice(order.totalAmount, order.currencyCode)
                : 'Pending delivery cost'
              }
            </Text>
          </View>
          
          {order.shippingAmount === 0 && order.sellerId !== user?.id && (
            <View style={styles.deliveryNote}>
              <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
              <Text style={styles.deliveryNoteText}>
                Delivery cost will be added by the seller after reviewing your address
              </Text>
            </View>
          )}
        </View>

        {/* Checkout Button - Only show to buyers when order is authorized */}
        {(() => {
          const currentUserId = user?.id;
          const orderSellerId = order?.sellerId;
          const isBuyer = currentUserId !== orderSellerId;
          
          return order.status.toLowerCase() === 'authorized' && isBuyer ? (
            <View style={styles.checkoutSection}>
              <TouchableOpacity
                style={styles.checkoutButton}
                onPress={async () => {
                  // Check for payment methods first
                  const hasPaymentMethods = await checkPaymentMethods();
                  
                  if (hasPaymentMethods) {
                    // Proceed to checkout with existing payment methods
                    Alert.alert(
                      'Checkout',
                      'Proceed to payment?',
                      [
                        {
                          text: 'Cancel',
                          style: 'cancel',
                        },
                        {
                          text: 'Proceed',
                          onPress: () => {
                            // Navigate to checkout/payment screen
                            console.log('Proceeding to checkout for order:', order.id);
                            // You can add navigation to checkout screen here
                            // navigation.navigate('Checkout', { orderId: order.id });
                          },
                        },
                      ]
                    );
                  } else {
                    // Show payment method modal
                    setShowPaymentModal(true);
                  }
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
              >
                <Ionicons name="card-outline" size={20} color="#FFFFFF" />
                <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
              </TouchableOpacity>
              <Text style={styles.checkoutNote}>
                Your order has been authorized. Click to complete payment and finalize your purchase.
              </Text>
            </View>
          ) : null;
        })()}
      </ScrollView>

      {/* Professional Bottom Sheet Modal - Only show if user is the seller */}
      {order?.sellerId === user?.id && (
        <Modal
          visible={showDeliveryModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowDeliveryModal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <View style={styles.modalContent}>
              {/* Handle Bar */}
              <View style={styles.handleBar} />
              
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Update Delivery Pricing</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowDeliveryModal(false);
                    // Reset form
                    setSelectedDeliveryType('');
                    setSelectedDeliveryOption('');
                    setCustomDeliveryPrice('');
                    setCustomDeliveryCurrency('');
                    setValidationErrors([]);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Info Banner */}
              <View style={styles.infoBanner}>
                <View style={styles.infoHeader}>
                  <View style={styles.infoIconContainer}>
                    <Ionicons name="information-circle" size={20} color="#2563EB" />
                  </View>
                  <Text style={styles.infoTitle}>Complete the form below</Text>
                </View>
                <Text style={styles.infoDescription}>
                  Select a delivery type, then choose from available options or set a custom price. Scroll down to see all options.
                </Text>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Delivery Type Selection */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Delivery Type</Text>
                  <Text style={styles.modalSectionSubtitle}>
                    Select the type of delivery service for this order
                  </Text>
                  
                  <View style={styles.deliveryTypeGrid}>
                    {Object.entries(deliveryTypeLabels).map(([type, label]) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.deliveryTypeItem,
                          selectedDeliveryType === type && styles.selectedDeliveryTypeItem
                        ]}
                        onPress={() => {
                          setSelectedDeliveryType(type);
                          setValidationErrors([]);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                      >
                        <Text style={[
                          styles.deliveryTypeText,
                          selectedDeliveryType === type && styles.selectedDeliveryTypeText
                        ]}>
                          {label}
                        </Text>
                        {selectedDeliveryType === type && (
                          <View style={styles.selectedTypeIndicator}>
                            <Ionicons name="checkmark-circle" size={20} color="#2563EB" />
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                  {validationErrors.some(err => err.includes('delivery type')) && (
                    <Text style={styles.validationErrorText}>Please select a delivery type</Text>
                  )}
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Delivery Options */}
                {deliveryOptions.length > 0 && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Choose Delivery Option</Text>
                    <Text style={styles.modalSectionSubtitle}>
                      Select from available delivery options or set a custom price below
                    </Text>
                    
                    {deliveryOptions.map((option) => (
                      <TouchableOpacity
                        key={option.id}
                        style={[
                          styles.deliveryOptionItem,
                          selectedDeliveryOption === option.id && styles.selectedDeliveryOption
                        ]}
                        onPress={() => {
                          setSelectedDeliveryOption(option.id || '');
                          setCustomDeliveryPrice('');
                          setValidationErrors([]);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                      >
                        <View style={styles.deliveryOptionContent}>
                          <View style={styles.deliveryOptionHeader}>
                            <Text style={[
                              styles.deliveryOptionName,
                              selectedDeliveryOption === option.id && styles.selectedDeliveryOptionName
                            ]}>
                              {option.name}
                            </Text>
                            <Text style={[
                              styles.deliveryOptionPrice,
                              selectedDeliveryOption === option.id && styles.selectedDeliveryOptionPrice
                            ]}>
                              {formatPrice(option.price, option.currencyCode)}
                            </Text>
                          </View>
                          <Text style={[
                            styles.deliveryOptionDescription,
                            selectedDeliveryOption === option.id && styles.selectedDeliveryOptionDescription
                          ]}>
                            {option.description} • {option.estimatedDays} days
                          </Text>
                        </View>
                        {selectedDeliveryOption === option.id && (
                          <View style={styles.selectedIndicator}>
                            <Ionicons name="checkmark-circle" size={24} color="#2563EB" />
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Divider */}
                <View style={styles.divider} />

                {/* Custom Price */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Custom Delivery Price</Text>
                  <Text style={styles.modalSectionSubtitle}>
                    Set your own delivery price and select from world currencies
                  </Text>
                  
                  <View style={styles.customPriceContainer}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Price</Text>
                      <View style={[
                        styles.priceInputContainer,
                        validationErrors.some(err => err.includes('price')) && styles.errorInputContainer
                      ]}>
                        <TextInput
                          style={styles.priceInput}
                          value={customDeliveryPrice}
                          onChangeText={(text) => {
                            setCustomDeliveryPrice(text);
                            setSelectedDeliveryOption('');
                            setValidationErrors([]);
                          }}
                          placeholder="0.00"
                          keyboardType="numeric"
                          placeholderTextColor="#9CA3AF"
                        />
                      </View>
                      {validationErrors.some(err => err.includes('price')) && (
                        <Text style={styles.validationErrorText}>Please enter a valid price</Text>
                      )}
                    </View>
                    
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Currency</Text>
                      <View style={[
                        validationErrors.some(err => err.includes('currency')) && styles.errorInputContainer
                      ]}>
                        <WorldCurrencyPicker
                          value={customDeliveryCurrency}
                          onChange={(code: string) => {
                            setCustomDeliveryCurrency(code);
                            setValidationErrors([]);
                          }}
                        />
                      </View>
                      {validationErrors.some(err => err.includes('currency')) && (
                        <Text style={styles.validationErrorText}>Please select a currency</Text>
                      )}
                    </View>
                  </View>
                </View>
              </ScrollView>

              {/* Footer */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowDeliveryModal(false);
                    // Reset form
                    setSelectedDeliveryType('');
                    setSelectedDeliveryOption('');
                    setCustomDeliveryPrice('');
                    setCustomDeliveryCurrency('');
                    setValidationErrors([]);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    ((!selectedDeliveryOption && !customDeliveryPrice) || !selectedDeliveryType) && styles.disabledButton
                  ]}
                  onPress={handleUpdateDeliveryPricing}
                  disabled={updatingDelivery || (!selectedDeliveryOption && !customDeliveryPrice) || !selectedDeliveryType}
                >
                  {updatingDelivery ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Update Pricing</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* Payment Method Modal - Show when no payment methods exist */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            {/* Handle Bar */}
            <View style={styles.handleBar} />
            
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payment Method Required</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowPaymentModal(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Payment Method Content */}
            <ScrollView style={styles.paymentMethodContent} showsVerticalScrollIndicator={false}>
              {loadingPaymentMethods ? (
                <View style={styles.loadingPaymentContainer}>
                  <ActivityIndicator size="large" color="#2563EB" />
                  <Text style={styles.loadingPaymentText}>Checking payment methods...</Text>
                </View>
              ) : (
                <View style={styles.paymentContentWrapper}>
                  {/* Icon */}
                  <View style={styles.paymentIconContainer}>
                    <View style={styles.paymentIconBackground}>
                      <Ionicons name="card-outline" size={48} color="#2563EB" />
                    </View>
                  </View>

                  {/* Title */}
                  <Text style={styles.paymentTitle}>No Payment Methods Found</Text>
                  
                  {/* Description */}
                  <Text style={styles.paymentDescription}>
                    You need to add a payment method before you can complete your purchase. 
                    This ensures a smooth checkout experience.
                  </Text>

                  {/* Order Summary */}
                  <View style={styles.orderSummaryCard}>
                    <Text style={styles.orderSummaryTitle}>Order Summary</Text>
                    <View style={styles.orderSummaryRow}>
                      <Text style={styles.orderSummaryLabel}>Order Total:</Text>
                      <Text style={styles.orderSummaryValue}>
                        {formatPrice(order.totalAmount, order.currencyCode)}
                      </Text>
                    </View>
                    <View style={styles.orderNumberContainer}>
                      <Text style={styles.orderNumberLabel}>Order Number:</Text>
                      <Text style={styles.orderNumberValue} numberOfLines={2} ellipsizeMode="tail">
                        {order.orderNumber}
                      </Text>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.paymentActionButtons}>
                    <TouchableOpacity
                      style={styles.addPaymentButton}
                      onPress={() => {
                        setShowPaymentModal(false);
                        // Navigate to add payment method screen
                        // navigation.navigate('AddPaymentMethod', { returnTo: 'OrderDetails', orderId: order.id });
                        Alert.alert(
                          'Add Payment Method',
                          'Navigate to add payment method screen',
                          [
                            {
                              text: 'Cancel',
                              style: 'cancel',
                            },
                            {
                              text: 'Add Payment Method',
                              onPress: () => {
                                console.log('Navigate to add payment method');
                                // Add navigation logic here
                              },
                            },
                          ]
                        );
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      }}
                    >
                      <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                      <Text style={styles.addPaymentButtonText}>Add Payment Method</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.cancelPaymentButton}
                      onPress={() => {
                        setShowPaymentModal(false);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Text style={styles.cancelPaymentButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
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
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  statusSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 8,
  },
  statusActions: {
    marginTop: 16,
  },
  statusActionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  statusButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
  },
  customerInfo: {
    marginBottom: 8,
  },
  customerEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  itemsContainer: {
    marginTop: 16,
  },
  orderItem: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  lastOrderItem: {
    borderBottomWidth: 0,
    marginBottom: 0,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
    backgroundColor: '#F9FAFB',
  },
  itemDetails: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    lineHeight: 22,
  },
  itemPrice: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
  },
  shippingAddress: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  addressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    flex: 0,
    minWidth: 100,
  },
  addressValue: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    textAlign: 'right',
  },
  noAddressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
  },
  noAddressText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  shippingInfo: {
    marginBottom: 16,
  },
  shippingMethod: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  shippingAmount: {
    fontSize: 14,
    color: '#374151',
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
    fontWeight: '500',
    color: '#1F2937',
  },
  totalRow: {
    borderBottomWidth: 0,
  },
  totalLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  updateButton: {
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  updateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
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
    paddingBottom: 34,
    maxHeight: screenHeight * 0.9,
    minHeight: screenHeight * 0.9,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
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
  modalBody: {
    flex: 1,
    paddingBottom: 40,
  },
  modalSection: {
    marginBottom: 32,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  modalSectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  deliveryTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  deliveryTypeItem: {
    flex: 1,
    minWidth: '48%',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minHeight: 60,
  },
  selectedDeliveryTypeItem: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  deliveryTypeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 4,
  },
  selectedDeliveryTypeText: {
    color: '#1E40AF',
    fontWeight: '700',
  },
  selectedTypeIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  deliveryOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  selectedDeliveryOption: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  deliveryOptionContent: {
    flex: 1,
  },
  deliveryOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  deliveryOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  deliveryOptionPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
  },
  deliveryOptionDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
  },
  selectedIndicator: {
    marginLeft: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 32,
  },
  customPriceContainer: {
    gap: 24,
    marginTop: 12,
  },
  inputGroup: {
    marginBottom: 0,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  priceInputContainer: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  priceInput: {
    padding: 16,
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#E5E7EB',
  },
  deliveryNote: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
  },
  deliveryNoteText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  selectedDeliveryOptionName: {
    color: '#1E40AF',
    fontWeight: '700',
  },
  selectedDeliveryOptionPrice: {
    color: '#059669',
    fontWeight: '700',
  },
  selectedDeliveryOptionDescription: {
    color: '#374151',
    fontWeight: '500',
  },
  errorInputContainer: {
    borderColor: '#EF4444',
    borderWidth: 2,
  },
  validationErrorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  infoBanner: {
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoIconContainer: {
    padding: 6,
    backgroundColor: '#DBEAFE',
    borderRadius: 6,
    marginRight: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  infoDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  checkoutNote: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  checkoutSection: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginBottom: 16,
  },
  checkoutButton: {
    padding: 12,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  authorizeButton: {
    backgroundColor: '#10B981',
  },
  authorizeButtonText: {
    color: '#FFFFFF',
  },
  buyerCancelButton: {
    backgroundColor: '#EF4444',
  },
  buyerCancelButtonText: {
    color: '#FFFFFF',
  },
  paymentMethodContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
  },
  paymentContentWrapper: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  loadingPaymentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  loadingPaymentText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  paymentIconContainer: {
    marginBottom: 24,
    marginTop: 8,
  },
  paymentIconBackground: {
    padding: 20,
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
  },
  paymentTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  paymentDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  orderSummaryCard: {
    width: '100%',
    padding: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  orderSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  orderSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  orderSummaryLabel: {
    fontSize: 14,
    color: '#6B7280',
    flex: 0,
    minWidth: 80,
    marginRight: 8,
  },
  orderSummaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    textAlign: 'right',
    flexWrap: 'wrap',
  },
  orderNumberContainer: {
    marginBottom: 12,
  },
  orderNumberLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  orderNumberValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    lineHeight: 20,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  paymentActionButtons: {
    width: '100%',
    flexDirection: 'column',
    gap: 12,
  },
  addPaymentButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addPaymentButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelPaymentButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelPaymentButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
});
