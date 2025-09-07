import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  RefreshControl,
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
import { salesRepService, type SalesRep } from '../services/salesRepService';
import { API_URL } from '../config/env';

// API_URL is provided by env; removed duplicate declaration

type CustomerOrdersNavigationProp = NativeStackNavigationProp<AppStackParamList, 'CustomerOrders'>;

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  maxRequests: 10, // Maximum requests per window
  windowMs: 60000, // 1 minute window
  retryDelay: 1000, // Base delay for retries (1 second)
  maxRetries: 3, // Maximum number of retries
  backoffMultiplier: 2, // Exponential backoff multiplier
};

// Request queue and rate limiting state
interface RequestQueueItem {
  id: string;
  execute: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  retryCount: number;
  timestamp: number;
}

class RateLimiter {
  private requestQueue: RequestQueueItem[] = [];
  private requestHistory: number[] = [];
  private isProcessing = false;
  private currentRetryDelay = RATE_LIMIT_CONFIG.retryDelay;

  private cleanupOldRequests() {
    const now = Date.now();
    this.requestHistory = this.requestHistory.filter(
      timestamp => now - timestamp < RATE_LIMIT_CONFIG.windowMs
    );
  }

  private canMakeRequest(): boolean {
    this.cleanupOldRequests();
    return this.requestHistory.length < RATE_LIMIT_CONFIG.maxRequests;
  }

  private addRequestToHistory() {
    this.requestHistory.push(Date.now());
  }

  private async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) return;

    this.isProcessing = true;

    while (this.requestQueue.length > 0) {
      if (!this.canMakeRequest()) {
        // Wait before processing next request
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      const request = this.requestQueue.shift();
      if (!request) continue;

      try {
        this.addRequestToHistory();
        const result = await request.execute();
        request.resolve(result);
      } catch (error: any) {
        if (error.response?.status === 429 && request.retryCount < RATE_LIMIT_CONFIG.maxRetries) {
          // Rate limited - retry with exponential backoff
          request.retryCount++;
          const delay = this.currentRetryDelay * Math.pow(RATE_LIMIT_CONFIG.backoffMultiplier, request.retryCount - 1);
          
          console.log(`Rate limited. Retrying request ${request.id} in ${delay}ms (attempt ${request.retryCount})`);
          
          setTimeout(() => {
            this.requestQueue.unshift(request);
          }, delay);
        } else {
          request.reject(error);
        }
      }
    }

    this.isProcessing = false;
  }

  async executeRequest<T>(executeFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const requestId = Math.random().toString(36).substr(2, 9);
      const queueItem: RequestQueueItem = {
        id: requestId,
        execute: executeFn,
        resolve,
        reject,
        retryCount: 0,
        timestamp: Date.now(),
      };

      this.requestQueue.push(queueItem);
      this.processQueue();
    });
  }

  clearQueue() {
    this.requestQueue = [];
    this.requestHistory = [];
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter();

export function CustomerOrders() {
  const navigation = useNavigation<CustomerOrdersNavigationProp>();
  const route = useRoute();
  const { user, token, refreshUser } = useAuth();
  const [freshUser, setFreshUser] = useState<any>(null);
  
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
  const [refreshing, setRefreshing] = useState(false);
  
  // Tab switching state
  const [activeTab, setActiveTab] = useState<'my-orders' | 'customer-orders'>('my-orders');
  const [hasKyc, setHasKyc] = useState(false);
  const [kycLoading, setKycLoading] = useState(true);
  const [salesRepStatus, setSalesRepStatus] = useState<SalesRep | null>(null);
  const [salesRepLoading, setSalesRepLoading] = useState(true);

  // Refs for optimization
  const scrollViewRef = useRef<ScrollView>(null);
  const lastScrollY = useRef(0);
  const scrollThrottleTimeout = useRef<number | null>(null);
  const loadMoreTimeout = useRef<number | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollThrottleTimeout.current) {
        clearTimeout(scrollThrottleTimeout.current);
      }
      if (loadMoreTimeout.current) {
        clearTimeout(loadMoreTimeout.current);
      }
      rateLimiter.clearQueue();
    };
  }, []);

  useEffect(() => {
    // Load KYC status first (critical for determining access)
    checkKycStatus();
    // Load sales rep status in background (non-blocking)
    checkSalesRepStatus();
  }, []);

  // Fetch fresh user via JWT and prefer it for seller/buyer logic
  useEffect(() => {
    const fetchFreshUser = async () => {
      try {
        const response = await api.get('/api/users/me');
        setFreshUser(response.data);
        await refreshUser();
      } catch (e) {
        console.log('Failed to fetch fresh user:', e);
      }
    };
    fetchFreshUser();
  }, [refreshUser]);

  // Load orders as soon as KYC status is determined (don't wait for sales rep check)
  useEffect(() => {
    if (!kycLoading) {
      loadOrders();
    }
  }, [activeTab, kycLoading]);

  // Update UI when sales rep status is determined (but don't block orders loading)
  useEffect(() => {
    if (!salesRepLoading && salesRepStatus) {
      // Sales rep status determined, refresh orders to show correct data
      loadOrders();
    }
  }, [salesRepStatus, salesRepLoading]);

  const checkKycStatus = useCallback(async () => {
    try {
      setKycLoading(true);
      await rateLimiter.executeRequest(() => kycService.getKycStatus());
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
  }, []);

  const checkSalesRepStatus = useCallback(async () => {
    if (!user?.id) return;

    try {
      setSalesRepLoading(true);
      console.log('Checking sales rep status for user:', user.id);
      
      // Use cached sales rep check for better performance
      const { isSalesRep, salesRepData } = await salesRepService.getSalesRepStatusCached(user.id);
      
      if (isSalesRep && salesRepData && salesRepData.status === 'ACTIVE') {
        console.log('User is an active sales rep:', salesRepData);
        setSalesRepStatus(salesRepData);
      } else {
        console.log('User is not an active sales rep');
        setSalesRepStatus(null);
      }
    } catch (error: any) {
      console.error('Error checking sales rep status:', error);
      setSalesRepStatus(null);
    } finally {
      setSalesRepLoading(false);
    }
  }, [user?.id]);

  const loadOrders = useCallback(async (isLoadMore: boolean = false) => {
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
        response = await rateLimiter.executeRequest(() => 
          orderService.getMyOrders(currentPage, 20)
        );
      } else {
        response = await rateLimiter.executeRequest(() => 
          orderService.getCustomerOrders(currentPage, 20)
        );
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
      
      if (error.response?.status === 429) {
        setError('Too many requests. Please wait a moment and try again.');
      } else {
        setError('Failed to load orders');
        if (!isLoadMore) {
          Alert.alert('Error', 'Failed to load orders. Please try again.');
        }
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setIsInitialLoad(false);
    }
  }, [activeTab, page]);

  // Attach focus listener after loadOrders is defined
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      try {
        const response = await api.get('/api/users/me');
        setFreshUser(response.data);
        await refreshUser();
        // Only refresh sales rep status if not already loaded (avoid redundant checks)
        if (salesRepLoading) {
          await checkSalesRepStatus();
        }
        await loadOrders();
      } catch (e) {
        console.log('Focus refresh user/orders failed:', e);
      }
    });
    return unsubscribe;
  }, [navigation, loadOrders, refreshUser, checkSalesRepStatus, salesRepLoading]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loadMoreTimeout.current) {
      loadMoreTimeout.current = setTimeout(() => {
        loadOrders(true);
        loadMoreTimeout.current = null;
      }, 500); // Debounce load more requests
    }
  }, [loadingMore, hasMore, loadOrders]);

  const handleScroll = useCallback((event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const currentScrollY = contentOffset.y;
    
    // Throttle scroll events
    if (scrollThrottleTimeout.current) {
      clearTimeout(scrollThrottleTimeout.current);
    }
    
    scrollThrottleTimeout.current = setTimeout(() => {
      const paddingToBottom = 20;
      const isCloseToBottom = layoutMeasurement.height + currentScrollY >= 
        contentSize.height - paddingToBottom;
      
      if (isCloseToBottom && !loadingMore && hasMore) {
        handleLoadMore();
      }
      
      lastScrollY.current = currentScrollY;
    }, 100); // Throttle to 100ms
  }, [loadingMore, hasMore, handleLoadMore]);



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

  // Compute order total from items to ensure consistency with header/title display
  const computeOrderItemsTotal = (order: Order): number => {
    try {
      if (Array.isArray(order.items)) {
        return order.items.reduce((sum, item) => {
          const itemTotal = typeof item.totalPrice === 'number'
            ? item.totalPrice
            : (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0);
          return sum + (Number(itemTotal) || 0);
        }, 0);
      }
      return Number(order.totalAmount) || 0;
    } catch {
      return Number(order.totalAmount) || 0;
    }
  };

  // Compute payable total = items total + shipping - discount
  const computeOrderPayableTotal = (order: Order): number => {
    const itemsTotal = computeOrderItemsTotal(order);
    const shipping = Number(order.shippingAmount) || 0;
    const discount = Number(order.discountAmount) || 0;
    const total = itemsTotal + shipping - discount;
    return total >= 0 ? total : 0;
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

  const handleExportPDF = useCallback(async () => {
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

      await rateLimiter.executeRequest(() => generateAndSharePDF({
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
      }));

      Alert.alert('Success', 'PDF exported successfully!');
    } catch (error: any) {
      console.error('Export error:', error);
      if (error.response?.status === 429) {
        Alert.alert('Export Failed', 'Too many requests. Please wait a moment and try again.');
      } else {
        Alert.alert('Export Failed', 'Failed to generate PDF. Please try again.');
      }
    } finally {
      setExporting(false);
    }
  }, [orders, exportDateRange, user]);

  const handleDateRangeChange = (startDate: Date, endDate: Date) => {
    setExportDateRange({ startDate, endDate });
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadOrders();
    } finally {
      setRefreshing(false);
    }
  }, [loadOrders]);

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
            <View style={styles.titleContainer}>
              <Text style={styles.title}>
                {salesRepLoading ? 'Orders' : 
                 salesRepStatus?.status === 'ACTIVE' ? 'Sales Rep Orders' : 'Orders'}
              </Text>
              {salesRepLoading ? (
                <View style={styles.loadingBadge}>
                  <ActivityIndicator size="small" color="#2563EB" />
                </View>
              ) : salesRepStatus?.status === 'ACTIVE' ? (
                <View style={styles.salesRepBadge}>
                  <Text style={styles.salesRepBadgeText}>Sales Rep</Text>
                </View>
              ) : null}
            </View>
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
              onPress={handleRefresh}
              style={styles.refreshButton}
              disabled={refreshing}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#2563EB" />
              ) : (
                <Ionicons name="refresh" size={24} color="#2563EB" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Switching - Show if user has KYC or is an active sales rep */}
        {(() => {
          const showTabs = hasKyc || (salesRepStatus?.status === 'ACTIVE');
          console.log('CustomerOrders tab visibility check:', {
            hasKyc,
            salesRepStatus: salesRepStatus?.status,
            salesRepLoading,
            showTabs
          });
          return showTabs;
        })() && (
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
                {salesRepStatus?.status === 'ACTIVE' ? 'My Sales' : 'Customer Orders'}
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

        <ScrollView 
          ref={scrollViewRef}
          style={styles.content} 
          onScroll={handleScroll} 
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#2563EB']}
              tintColor="#2563EB"
            />
          }
        >
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
                {activeTab === 'my-orders' 
                  ? 'No Orders Yet' 
                  : salesRepStatus?.status === 'ACTIVE' 
                    ? 'No Sales Yet' 
                    : 'No Customer Orders'
                }
              </Text>
              <Text style={styles.emptyText}>
                {activeTab === 'my-orders' 
                  ? "You haven't placed any orders yet. Start shopping to see your orders here."
                  : salesRepStatus?.status === 'ACTIVE'
                    ? "You don't have any sales yet. When customers place orders for products you've sold, they'll appear here."
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
                            {salesRepStatus?.status === 'ACTIVE' ? 'Customer' : 'Customer'}: {order.customer.name}
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
                          {formatPrice(computeOrderPayableTotal(order), order.currencyCode)}
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
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  salesRepBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  salesRepBadgeText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
  },
  loadingBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
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

}); 