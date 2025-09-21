import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Package, 
  Users, 
  Download, 
  Calendar, 
  RefreshCw, 
  Eye, 
  MoreVertical,
  CheckCircle,
  Clock,
  Truck,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { orderService, type Order, type OrdersResponse } from '../api/orders';
import { useAuth } from '../contexts/AuthContext';
import { OrderDetailsModal } from '../components/OrderDetailsModal';
import { getApi } from '../api/config';
import { API_CONFIG } from '../config/api';

type TabType = 'my-orders' | 'customer-orders';

export function Orders() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State management
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Tab switching
  const [activeTab, setActiveTab] = useState<TabType>('my-orders');
  
  // Export functionality
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [exportDateRange, setExportDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    endDate: new Date(),
  });
  const [exporting, setExporting] = useState(false);
  
  // Image URL helper function (same as Products page)
  const getImageUrl = (image: string | null) => {
    if (!image) return 'https://via.placeholder.com/300x300?text=No+Image';
    if (image.startsWith('http')) return image;
    const baseUrl = API_CONFIG.BASE_URL.replace('/api', '');
    return `${baseUrl}${image}`;
  };
  
  // Order details modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  
  // Fresh user data and KYC status
  const [freshUser, setFreshUser] = useState<any>(null);
  const [hasKyc, setHasKyc] = useState(false);
  const [kycLoading, setKycLoading] = useState(true);

  // Fetch fresh user data on component mount
  useEffect(() => {
    const fetchFreshUser = async () => {
      try {
        const response = await getApi().get('/users/me');
        setFreshUser(response.data);
      } catch (e) {
        console.log('Failed to fetch fresh user:', e);
      }
    };
    fetchFreshUser();
  }, []);

  // Check KYC status
  useEffect(() => {
    const checkKycStatus = async () => {
      try {
        setKycLoading(true);
        // You can implement KYC checking here if needed
        // For now, we'll assume all users have KYC
        setHasKyc(true);
      } catch (error) {
        console.error('Error checking KYC status:', error);
        setHasKyc(false);
      } finally {
        setKycLoading(false);
      }
    };
    checkKycStatus();
  }, []);

  // Load orders when tab changes or component mounts
  useEffect(() => {
    if (!kycLoading) {
      loadOrders();
    }
  }, [activeTab, kycLoading]);

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
      
      let response: OrdersResponse;
      if (activeTab === 'my-orders') {
        response = await orderService.getMyOrders(currentPage, 20);
      } else {
        response = await orderService.getCustomerOrders(currentPage, 20);
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
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [activeTab, page]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadOrders(true);
    }
  }, [loadingMore, hasMore, loadOrders]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadOrders();
    } finally {
      setRefreshing(false);
    }
  }, [loadOrders]);

  const handleViewOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const handleOrderUpdate = (updatedOrder: Order) => {
    setOrders(prev => prev.map(order => order.id === updatedOrder.id ? updatedOrder : order));
    setSelectedOrder(updatedOrder);
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
        alert('No orders found for the selected date range.');
        return;
      }

      const startDate = exportDateRange.startDate.toISOString();
      const endDate = exportDateRange.endDate.toISOString();
      
      const blob = await orderService.exportOrdersPDF(startDate, endDate, activeTab);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `orders-${activeTab}-${startDate.split('T')[0]}-to-${endDate.split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      alert('PDF exported successfully!');
    } catch (error: any) {
      console.error('Export error:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setExporting(false);
    }
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

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'confirmed':
        return <CheckCircle className="w-4 h-4" />;
      case 'processing':
        return <Package className="w-4 h-4" />;
      case 'shipped':
        return <Truck className="w-4 h-4" />;
      case 'delivered':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      case 'refunded':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
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

  const computeOrderTotal = (order: Order): number => {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-4 text-gray-600">Loading orders...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mb-16">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowDatePicker(true)}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={exporting}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Select Date Range
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50"
                disabled={exporting}
              >
                {exporting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Export PDF
              </button>
              <button
                onClick={handleRefresh}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                disabled={refreshing}
              >
                {refreshing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Tab Switching */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('my-orders')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'my-orders'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  My Orders
                </div>
              </button>
              <button
                onClick={() => setActiveTab('customer-orders')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'customer-orders'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Customer Orders
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Date Range Display */}
        <div className="mb-6 p-4 bg-gray-100 rounded-lg">
          <p className="text-sm text-gray-600">
            Export Range: {exportDateRange.startDate.toLocaleDateString()} - {exportDateRange.endDate.toLocaleDateString()}
          </p>
        </div>

        {/* Orders List */}
        {error ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Orders</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => loadOrders()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {activeTab === 'my-orders' ? 'No Orders Yet' : 'No Customer Orders'}
            </h3>
            <p className="text-gray-600 mb-4">
              {activeTab === 'my-orders' 
                ? "You haven't placed any orders yet. Start shopping to see your orders here."
                : "You don't have any customer orders yet. When customers place orders for your products, they'll appear here."
              }
            </p>
            {activeTab === 'my-orders' && (
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Start Shopping
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupOrdersByDate(orders)).map(([group, groupOrders]) => (
              <div key={group}>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">{group}</h2>
                <div className="space-y-4">
                  {groupOrders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleViewOrderDetails(order)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              #{order.orderNumber}
                            </h3>
                            <div className="flex items-center space-x-2">
                              <div
                                className="flex items-center px-3 py-1 rounded-full text-xs font-medium"
                                style={{
                                  backgroundColor: `${getStatusColor(order.status)}20`,
                                  color: getStatusColor(order.status)
                                }}
                              >
                                {getStatusIcon(order.status)}
                                <span className="ml-1 capitalize">{order.status}</span>
                              </div>
                              <button className="p-1 text-gray-400 hover:text-gray-600">
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex items-center text-sm text-gray-600 mb-4">
                            <span>{formatDate(order.createdAt)}</span>
                            {activeTab === 'customer-orders' && order.customer && (
                              <span className="ml-4">
                                Customer: {order.customer.name || 'N/A'}
                              </span>
                            )}
                          </div>

                          {/* Order Items */}
                          <div className="space-y-3 mb-4">
                            {order.items && order.items.length > 0 ? order.items.map((item) => (
                              <div key={item.id} className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                                  <img
                                    src={getImageUrl(item.product?.images?.[0] || null)}
                                    alt={item.product?.title || 'Product'}
                                    className="w-12 h-12 object-cover rounded-lg"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {item.product?.title || 'Unknown Product'}
                                  </p>
                                  {activeTab === 'my-orders' && item.product?.seller && (
                                    <p className="text-xs text-gray-500">
                                      by {item.product.seller.name || 'Unknown Seller'}
                                    </p>
                                  )}
                                  <p className="text-xs text-gray-500">
                                    {formatPrice(item.unitPrice, order.currencyCode)} × {item.quantity}
                                  </p>
                                </div>
                                <div className="text-sm font-medium text-gray-900">
                                  {formatPrice(item.totalPrice, order.currencyCode)}
                                </div>
                              </div>
                            )) : (
                              <div className="text-center py-4 text-gray-500">
                                No items found for this order
                              </div>
                            )}
                          </div>

                          {/* Order Footer */}
                          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <span>Total: {formatPrice(computeOrderTotal(order), order.currencyCode)}</span>
                              {order.shippingMethod && (
                                <span>Shipping: {order.shippingMethod}</span>
                              )}
                              {order.paymentStatus && (
                                <span
                                  className="font-medium"
                                  style={{ color: getPaymentStatusColor(order.paymentStatus) }}
                                >
                                  Payment: {order.paymentStatus}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewOrderDetails(order);
                                }}
                                className="flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-700"
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View Details
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Load More Button */}
            {hasMore && (
              <div className="text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-3 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {loadingMore ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      Loading more orders...
                    </div>
                  ) : (
                    'Load More Orders'
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Order Details Modal */}
        <OrderDetailsModal
          order={selectedOrder}
          isOpen={showOrderDetails}
          onClose={() => setShowOrderDetails(false)}
          onOrderUpdate={handleOrderUpdate}
          isSeller={activeTab === 'customer-orders'}
          freshUser={freshUser}
        />
      </div>
    </div>
  );
}
