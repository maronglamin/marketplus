import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { AppStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { generateAndSharePDF } from '../services/pdfExportService';
import { DateRangePicker } from '../components/DateRangePicker';
import { orderService, type Order } from '../services/orderService';
import { kycService } from '../services/kycService';
import Constants from 'expo-constants';

// Get the API base URL
const LOCAL_IP = Constants.expoConfig?.extra?.localIp || '192.168.137.177';
const API_URL = process.env.EXPO_PUBLIC_API_URL || `http://${LOCAL_IP}:3000`;

type CustomerOrdersNavigationProp = NativeStackNavigationProp<AppStackParamList, 'CustomerOrders'>;

export function CustomerOrders() {
  const navigation = useNavigation<CustomerOrdersNavigationProp>();
  const route = useRoute();
  const { user, token } = useAuth();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [exportDateRange, setExportDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    endDate: new Date(),
  });
  const [exporting, setExporting] = useState(false);
  
  // Tab switching state
  const [activeTab, setActiveTab] = useState<'my-orders' | 'customer-orders'>('my-orders');
  const [hasKyc, setHasKyc] = useState(false);
  const [kycLoading, setKycLoading] = useState(true);

  useEffect(() => {
    checkKycStatus();
  }, []);

  useEffect(() => {
    if (!kycLoading) {
      loadOrders();
    }
  }, [activeTab, kycLoading]);

  const checkKycStatus = async () => {
    try {
      setKycLoading(true);
      await kycService.getKycStatus();
      setHasKyc(true);
    } catch (error: any) {
      if (error.response?.status === 404) {
        setHasKyc(false);
      } else {
        console.error('Error checking KYC status:', error);
        setHasKyc(false);
      }
    } finally {
      setKycLoading(false);
    }
  };

  const loadOrders = async (isLoadMore: boolean = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setPage(1);
        setHasMore(true);
      }
      setError(null);
      
      const currentPage = isLoadMore ? page + 1 : 1;
      
      let response;
      if (activeTab === 'my-orders') {
        response = await orderService.getMyOrders(currentPage, 6);
      } else {
        response = await orderService.getCustomerOrders(currentPage, 6);
      }
      
      if (isLoadMore) {
        setOrders(prev => [...prev, ...response.orders]);
        setPage(currentPage);
        setHasMore(response.hasMore);
      } else {
        setOrders(response.orders);
        setPage(1);
        setHasMore(response.hasMore);
      }
    } catch (error: any) {
      console.error('Error loading orders:', error);
      setError('Failed to load orders');
      if (!isLoadMore) {
        Alert.alert('Error', 'Failed to load orders. Please try again.');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setIsInitialLoad(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadOrders(true);
    }
  };

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= 
      contentSize.height - paddingToBottom;
    
    if (isCloseToBottom && !loadingMore && hasMore) {
      handleLoadMore();
    }
  };

  const handleTabPress = (tab: string) => {
    switch (tab) {
      case 'home':
        navigation.navigate('Home');
        break;
      case 'orders':
        // Already on orders
        break;
      case 'interests':
        navigation.navigate('InterestManagement');
        break;
      case 'account':
        navigation.navigate('SellerDashboard');
        break;
    }
  };

  const isActiveTab = (tab: string) => {
    switch (tab) {
      case 'home':
        return route.name === 'Home';
      case 'orders':
        return route.name === 'CustomerOrders';
      case 'interests':
        return route.name === 'InterestManagement';
      case 'account':
        return route.name === 'SellerDashboard';
      default:
        return false;
    }
  };

  const handleViewProduct = (productId: string) => {
    navigation.navigate('ProductDetail', { productId });
  };

  const handleViewOrderDetails = (orderId: string) => {
    navigation.navigate('OrderDetails', { orderId });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return '#F59E0B';
      case 'confirmed':
        return '#3B82F6';
      case 'processing':
        return '#8B5CF6';
      case 'shipped':
        return '#10B981';
      case 'delivered':
        return '#059669';
      case 'cancelled':
        return '#EF4444';
      case 'refunded':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return '#F59E0B';
      case 'authorized': return '#3B82F6';
      case 'paid': return '#10B981';
      case 'failed': return '#EF4444';
      case 'refunded': return '#6B7280';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
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
    
    // Ensure proper thousand separators and decimal formatting
    const formattedPrice = new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true
    }).format(price);
    
    return `${symbol}${formattedPrice}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDateGroup = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    const diffInDays = diffInHours / 24;
    const diffInWeeks = diffInDays / 7;
    const diffInMonths = diffInDays / 30;
    const diffInYears = diffInDays / 365;

    if (diffInHours < 24) {
      return 'Today';
    } else if (diffInDays < 7) {
      return 'This Week';
    } else if (diffInWeeks < 4) {
      return 'This Month';
    } else if (diffInMonths < 12) {
      return 'This Year';
    } else {
      return 'Older';
    }
  };

  const groupOrdersByDate = (orders: Order[]) => {
    const groups: { [key: string]: Order[] } = {};
    
    orders.forEach(order => {
      const group = getDateGroup(order.createdAt);
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(order);
    });

    return groups;
  };

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      
      // Filter orders by date range
      const filteredOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= exportDateRange.startDate && orderDate <= exportDateRange.endDate;
      });

      if (filteredOrders.length === 0) {
        Alert.alert('No Data', 'No orders found for the selected date range.');
        return;
      }

      await generateAndSharePDF({
        type: 'orders',
        data: filteredOrders,
        dateRange: {
          startDate: exportDateRange.startDate.toISOString(),
          endDate: exportDateRange.endDate.toISOString(),
        },
        user: {
          firstName: user?.firstName || '',
          lastName: user?.lastName || '',
          email: user?.email,
        },
      });

      Alert.alert('Success', 'PDF exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', 'Failed to generate PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleDateRangeChange = (startDate: Date, endDate: Date) => {
    setExportDateRange({ startDate, endDate });
  };

  if (loading || kycLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar 
          barStyle="dark-content" 
          backgroundColor="#FFFFFF" 
          translucent={Platform.OS === 'android'}
        />
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.title}>Orders</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Loading orders...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={Platform.OS === 'android'}
      />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.title}>Orders</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={styles.exportButton}
              disabled={exporting}
            >
              <Ionicons name="calendar-outline" size={20} color="#2563EB" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleExportPDF}
              style={[styles.exportButton, exporting && styles.exportButtonDisabled]}
              disabled={exporting}
            >
              {exporting ? (
                <ActivityIndicator size="small" color="#2563EB" />
              ) : (
                <Ionicons name="download-outline" size={20} color="#2563EB" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => loadOrders()}
              style={styles.refreshButton}
            >
              <Ionicons name="refresh" size={24} color="#2563EB" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Switching - Only show if user has KYC */}
        {hasKyc && (
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'my-orders' && styles.activeTab]}
              onPress={() => setActiveTab('my-orders')}
            >
              <Ionicons 
                name="bag-outline" 
                size={20} 
                color={activeTab === 'my-orders' ? '#2563EB' : '#6B7280'} 
              />
              <Text style={[styles.tabText, activeTab === 'my-orders' && styles.activeTabText]}>
                My Orders
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'customer-orders' && styles.activeTab]}
              onPress={() => setActiveTab('customer-orders')}
            >
              <Ionicons 
                name="people-outline" 
                size={20} 
                color={activeTab === 'customer-orders' ? '#2563EB' : '#6B7280'} 
              />
              <Text style={[styles.tabText, activeTab === 'customer-orders' && styles.activeTabText]}>
                Customer Orders
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Date Range Display */}
        <View style={styles.dateRangeDisplay}>
          <Text style={styles.dateRangeText}>
            Export Range: {exportDateRange.startDate.toLocaleDateString()} - {exportDateRange.endDate.toLocaleDateString()}
          </Text>
        </View>

        <ScrollView style={styles.content} onScroll={handleScroll} scrollEventThrottle={16}>
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => loadOrders()} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : orders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="bag-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>
                {activeTab === 'my-orders' ? 'No Orders Yet' : 'No Customer Orders'}
              </Text>
              <Text style={styles.emptyText}>
                {activeTab === 'my-orders' 
                  ? "You haven't placed any orders yet. Start shopping to see your orders here."
                  : "You don't have any customer orders yet. When customers place orders for your products, they'll appear here."
                }
              </Text>
              {activeTab === 'my-orders' && (
                <TouchableOpacity
                  style={styles.shopButton}
                  onPress={() => navigation.navigate('Home')}
                >
                  <Text style={styles.shopButtonText}>Start Shopping</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            Object.entries(groupOrdersByDate(orders)).map(([group, groupOrders]) => (
              <View key={group} style={styles.groupContainer}>
                <Text style={styles.groupTitle}>{group}</Text>
                {groupOrders.map((order) => (
                  <TouchableOpacity 
                    key={order.id} 
                    style={styles.orderCard}
                    onPress={() => handleViewOrderDetails(order.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.orderHeader}>
                      <View style={styles.orderInfo}>
                        <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
                        <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
                        {activeTab === 'customer-orders' && order.customer && (
                          <Text style={styles.customerName}>
                            Customer: {order.customer.name}
                          </Text>
                        )}
                      </View>
                      <View style={styles.statusContainer}>
                        {/* Order Status Badge */}
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: `${getStatusColor(order.status)}20` },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusText,
                              { color: getStatusColor(order.status) },
                            ]}
                          >
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {order.items.map((item) => (
                      <View
                        key={item.id}
                        style={styles.orderItem}
                      >
                        <Image
                          source={{ 
                            uri: item.product.images && item.product.images.length > 0 
                              ? `${API_URL}${item.product.images[0]}`
                              : 'https://via.placeholder.com/80x80?text=No+Image'
                          }}
                          style={styles.productImage}
                          resizeMode="cover"
                          defaultSource={{ uri: 'https://via.placeholder.com/80x80?text=Loading' }}
                        />
                        <View style={styles.itemDetails}>
                          <Text style={styles.productName} numberOfLines={2}>
                            {item.product.title}
                          </Text>
                          {activeTab === 'my-orders' && (
                            <Text style={styles.sellerName}>
                              by {item.product.seller.name}
                            </Text>
                          )}
                          <Text style={styles.itemPrice}>
                            {formatPrice(item.unitPrice, order.currencyCode)} × {item.quantity}
                          </Text>
                        </View>
                        <View style={styles.itemTotal}>
                          <Text style={styles.totalPrice}>
                            {formatPrice(item.totalPrice, order.currencyCode)}
                          </Text>
                        </View>
                      </View>
                    ))}

                    <View style={styles.orderFooter}>
                      <View style={styles.orderTotal}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.orderTotalPrice}>
                          {formatPrice(order.totalAmount, order.currencyCode)}
                        </Text>
                      </View>
                      <View style={styles.orderFooterDetails}>
                        {order.shippingMethod && (
                          <Text style={styles.shippingMethod}>
                            Shipping: {order.shippingMethod}
                          </Text>
                        )}
                        {/* Payment Status with Checkmark */}
                        {(order as any).paymentStatus && (
                          <View style={styles.paymentStatusRow}>
                            <Text style={styles.paymentStatusLabel}>Payment status:</Text>
                            <View style={styles.paymentStatusContent}>
                              <Ionicons 
                                name={(order as any).paymentStatus?.toLowerCase() === 'paid' ? 'checkmark-circle' : 
                                      (order as any).paymentStatus?.toLowerCase() === 'pending' ? 'time' : 
                                      (order as any).paymentStatus?.toLowerCase() === 'failed' ? 'close-circle' : 'card'} 
                                size={16} 
                                color={getPaymentStatusColor((order as any).paymentStatus)} 
                              />
                              <Text style={[
                                styles.paymentStatusText,
                                { color: getPaymentStatusColor((order as any).paymentStatus) }
                              ]}>
                                {(order as any).paymentStatus.charAt(0).toUpperCase() + (order as any).paymentStatus.slice(1)}
                              </Text>
                            </View>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ))
          )}
          
          {/* Loading more indicator */}
          {loadingMore && (
            <View style={styles.loadingMoreContainer}>
              <ActivityIndicator size="small" color="#2563EB" />
              <Text style={styles.loadingMoreText}>Loading more orders...</Text>
            </View>
          )}
          
          {/* End of list indicator */}
          {!hasMore && orders.length > 0 && (
            <View style={styles.endOfListContainer}>
              <Text style={styles.endOfListText}>No more orders to load</Text>
            </View>
          )}
        </ScrollView>

        {/* Bottom Navigation */}
        <SafeAreaView edges={['bottom']} style={styles.bottomNavContainer}>
          <View style={styles.bottomNav}>
            <TouchableOpacity
              style={[styles.navItem, isActiveTab('home') && styles.activeNavItem]}
              onPress={() => handleTabPress('home')}
            >
              <Ionicons
                name={isActiveTab('home') ? 'home' : 'home-outline'}
                size={24}
                color={isActiveTab('home') ? '#2563EB' : '#6B7280'}
              />
              <Text
                style={[
                  styles.navText,
                  isActiveTab('home') && styles.activeNavText,
                ]}
              >
                Home
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navItem, isActiveTab('orders') && styles.activeNavItem]}
              onPress={() => handleTabPress('orders')}
            >
              <Ionicons
                name={isActiveTab('orders') ? 'bag' : 'bag-outline'}
                size={24}
                color={isActiveTab('orders') ? '#2563EB' : '#6B7280'}
              />
              <Text
                style={[
                  styles.navText,
                  isActiveTab('orders') && styles.activeNavText,
                ]}
              >
                Orders
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.navItem,
                isActiveTab('interestmanagement') && styles.activeNavItem,
              ]}
              onPress={() => handleTabPress('interests')}
            >
              <Ionicons
                name={
                  isActiveTab('interestmanagement')
                    ? 'heart'
                    : 'heart-outline'
                }
                size={24}
                color={isActiveTab('interestmanagement') ? '#2563EB' : '#6B7280'}
              />
              <Text
                style={[
                  styles.navText,
                  isActiveTab('interestmanagement') && styles.activeNavText,
                ]}
              >
                Interests
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navItem, isActiveTab('sellerdashboard') && styles.activeNavItem]}
              onPress={() => handleTabPress('account')}
            >
              <Ionicons
                name={isActiveTab('sellerdashboard') ? 'person' : 'person-outline'}
                size={24}
                color={isActiveTab('sellerdashboard') ? '#2563EB' : '#6B7280'}
              />
              <Text
                style={[
                  styles.navText,
                  isActiveTab('sellerdashboard') && styles.activeNavText,
                ]}
              >
                Seller
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Date Range Picker Modal */}
        <DateRangePicker
          startDate={exportDateRange.startDate}
          endDate={exportDateRange.endDate}
          onDateRangeChange={handleDateRangeChange}
          visible={showDatePicker}
          onClose={() => setShowDatePicker(false)}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
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
    padding: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  exportButton: {
    padding: 12,
  },
  exportButtonDisabled: {
    opacity: 0.5,
  },
  refreshButton: {
    padding: 12,
  },
  content: {
    flex: 1,
    padding: 16,
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
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginTop: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  shopButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  shopButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  orderDate: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  sellerName: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 12,
    color: '#6B7280',
  },
  itemTotal: {
    alignItems: 'flex-end',
  },
  totalPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  orderFooter: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  orderTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  orderTotalPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563EB',
  },
  shippingMethod: {
    fontSize: 12,
    color: '#6B7280',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: 0,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 5,
  },
  activeNavItem: {
    // Active state styling
  },
  navText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  activeNavText: {
    color: '#2563EB',
    fontWeight: '500',
  },
  loadingMoreContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingMoreText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  },
  endOfListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  endOfListText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  groupContainer: {
    marginBottom: 24,
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  dateRangeDisplay: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dateRangeText: {
    fontSize: 14,
    color: '#6B7280',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    padding: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#2563EB',
  },
  tabText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  activeTabText: {
    color: '#2563EB',
    fontWeight: '500',
  },
  customerName: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  statusContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
  },
  paymentStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  paymentStatusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  orderFooterDetails: {
    flexDirection: 'column',
    gap: 4,
  },
  paymentStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentStatusLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 8,
  },
  paymentStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bottomNavContainer: {
    backgroundColor: '#FFFFFF',
  },
}); 