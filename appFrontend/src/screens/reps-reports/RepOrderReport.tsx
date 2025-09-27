import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import { format } from 'date-fns';
import { salesRepService } from '../../services/salesRepService';
import { getImageUrl } from '../../utils/imageUtils';

type RepOrderReportNavigationProp = NativeStackNavigationProp<AppStackParamList, 'RepOrderReport'>;

interface RepOrder {
  id: string;
  orderNumber: string;
  totalAmount: number;
  currencyCode: string;
  status: string;
  createdAt: string;
  customerName: string;
  customerEmail?: string;
  productTitle?: string;
  productImage?: string;
  salesRepName: string;
  salesRepId: string;
}

export function RepOrderReport() {
  const navigation = useNavigation<RepOrderReportNavigationProp>();
  const [orders, setOrders] = useState<RepOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [primaryCurrency, setPrimaryCurrency] = useState('USD');

  useEffect(() => {
    loadRepOrders();
  }, []);

  const loadRepOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get recent activity which includes orders from sales reps
      const response = await salesRepService.getRecentActivity({ limit: 100 });
      
      // Filter only orders and transform the data
      const orderActivities = response.items
        .filter((activity: any) => activity.type === 'order')
        .map((activity: any) => ({
          id: activity.data.orderId,
          orderNumber: activity.data.orderNumber,
          totalAmount: Number(activity.data.amount) || 0,
          currencyCode: activity.data.currencyCode,
          status: activity.data.status, // Use actual status from backend
          createdAt: activity.createdAt,
          customerName: 'Customer', // We don't have customer name in recent activity
          productTitle: activity.data.productTitle,
          productImage: activity.data.productImage,
          salesRepName: activity.rep?.name || 'Unknown Rep',
          salesRepId: activity.rep?.id || '',
        }));

      setOrders(orderActivities);
      
      // Calculate total revenue by currency from completed orders only
      const completedOrders = orderActivities.filter(order => 
        ['COMPLETED', 'DELIVERED', 'CONFIRMED', 'AUTHORIZED'].includes(order.status?.toUpperCase())
      );
      
      const revenueByCurrency = completedOrders.reduce((acc: any, order) => {
        const currency = order.currencyCode || 'USD';
        if (!acc[currency]) {
          acc[currency] = 0;
        }
        acc[currency] += Number(order.totalAmount) || 0;
        return acc;
      }, {});

      // Find the primary currency (most used by revenue amount, not count)
      const primaryCurrencyCode = Object.keys(revenueByCurrency).reduce((a, b) => 
        revenueByCurrency[a] > revenueByCurrency[b] ? a : b, 'USD'
      );
      
      setPrimaryCurrency(primaryCurrencyCode);
      setTotalRevenue(revenueByCurrency[primaryCurrencyCode] || 0);
      
    } catch (error) {
      console.error('Error loading rep orders:', error);
      setError('Failed to load orders');
      setOrders([]);
      setTotalRevenue(0);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
      case 'DELIVERED':
      case 'CONFIRMED':
      case 'AUTHORIZED':
        return '#059669';
      case 'PENDING':
      case 'PROCESSING':
        return '#F59E0B';
      case 'SHIPPED':
        return '#3B82F6';
      case 'CANCELLED':
        return '#DC2626';
      case 'REFUNDED':
        return '#8B5CF6';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return 'Completed';
      case 'DELIVERED':
        return 'Delivered';
      case 'CONFIRMED':
        return 'Confirmed';
      case 'AUTHORIZED':
        return 'Authorized';
      case 'PENDING':
        return 'Pending';
      case 'PROCESSING':
        return 'Processing';
      case 'SHIPPED':
        return 'Shipped';
      case 'CANCELLED':
        return 'Cancelled';
      case 'REFUNDED':
        return 'Refunded';
      default:
        return 'Unknown';
    }
  };

  const formatCurrency = (amount: number, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode || 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.title}>Rep Orders Report</Text>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadRepOrders}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
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
        translucent
      />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Rep Orders Report</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>Sales Rep Orders</Text>
              <View style={styles.currencyBadge}>
                <Text style={styles.currencyText}>{primaryCurrency}</Text>
              </View>
            </View>
            <Text style={styles.summaryValue}>
              {formatCurrency(totalRevenue, primaryCurrency)}
            </Text>
            <Text style={styles.summarySubtitle}>
              {orders.length} total orders from sales reps
            </Text>
          </View>

          <View style={styles.ordersList}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            {orders.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="receipt-outline" size={48} color="#9CA3AF" />
                <Text style={styles.emptyText}>No orders found</Text>
                <Text style={styles.emptySubtext}>Orders from your sales reps will appear here</Text>
              </View>
            ) : (
              orders.map((order) => (
                <View key={order.id} style={styles.orderCard}>
                  <View style={styles.orderHeader}>
                    <View style={styles.orderInfo}>
                      <View style={styles.productInfo}>
                        {order.productImage ? (
                          <Image
                            source={{ 
                              uri: getImageUrl(order.productImage) || 'https://via.placeholder.com/60x60?text=No+Image'
                            }}
                            style={styles.productImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.placeholderImage}>
                            <Ionicons name="cube-outline" size={24} color="#9CA3AF" />
                          </View>
                        )}
                        <View style={styles.productDetails}>
                          <Text style={styles.productTitle} numberOfLines={2}>
                            {order.productTitle || 'Product'}
                          </Text>
                          <Text style={styles.customerName}>
                            Customer: {order.customerName}
                          </Text>
                          <Text style={styles.orderNumber}>
                            {order.orderNumber}
                          </Text>
                          <Text style={styles.salesRepName}>
                            Rep: {order.salesRepName}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.statusContainer}>
                      <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(order.status)}15` }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                          {getStatusText(order.status)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.orderFooter}>
                    <View style={styles.dateContainer}>
                      <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                      <Text style={styles.orderDate}>
                        {format(new Date(order.createdAt), 'MMM d, yyyy')}
                      </Text>
                    </View>
                    <View style={styles.orderAmount}>
                      <Text style={styles.amountValue}>
                        {formatCurrency(order.totalAmount, order.currencyCode)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 12,
    paddingBottom: 12,
    minHeight: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 56 : 56,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  placeholder: {
    width: 40,
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
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  summaryCard: {
    margin: 16,
    padding: 20,
    backgroundColor: '#2563EB',
    borderRadius: 12,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  currencyBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  currencyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  summarySubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  ordersList: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
    marginRight: 12,
  },
  productInfo: {
    flexDirection: 'row',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  placeholderImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  orderNumber: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  salesRepName: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
  orderAmount: {
    alignItems: 'flex-end',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  amountValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderDate: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
