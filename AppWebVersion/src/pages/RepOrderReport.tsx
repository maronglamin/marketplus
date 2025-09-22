import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Receipt, 
  Calendar, 
  User, 
  Package,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { salesRepService } from '../api/salesReps';
import { API_CONFIG } from '../config/api';

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
  const navigate = useNavigate();
  const [orders, setOrders] = useState<RepOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [primaryCurrency, setPrimaryCurrency] = useState('USD');

  useEffect(() => {
    loadRepOrders();
  }, []);

  const getImageUrl = (imagePath: string | null | undefined): string => {
    if (!imagePath) return '';
    if (imagePath.startsWith('http')) return imagePath;
    return `${API_CONFIG.BASE_URL.replace('/api', '')}${imagePath}`;
  };

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
          totalAmount: activity.data.amount,
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
        acc[currency] += order.totalAmount;
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
        return 'bg-green-100 text-green-800';
      case 'PENDING':
      case 'PROCESSING':
        return 'bg-yellow-100 text-yellow-800';
      case 'SHIPPED':
        return 'bg-blue-100 text-blue-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'REFUNDED':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading orders...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={() => navigate(-1)}
                  className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back
                </button>
                <h1 className="text-2xl font-bold text-gray-900">Rep Orders Report</h1>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={loadRepOrders}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Rep Orders Report</h1>
            </div>
            <button
              onClick={loadRepOrders}
              className="flex items-center text-blue-600 hover:text-blue-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-blue-600 rounded-xl p-6 mb-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Sales Rep Orders</h2>
            <div className="bg-white bg-opacity-20 px-3 py-1 rounded-lg">
              <span className="text-sm font-semibold">{primaryCurrency}</span>
            </div>
          </div>
          <p className="text-3xl font-bold mb-2">
            {formatCurrency(totalRevenue, primaryCurrency)}
          </p>
          <p className="text-blue-100">
            {orders.length} total orders from sales reps
          </p>
        </div>

        {/* Orders List */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Orders</h3>
          
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">No orders found</h4>
              <p className="text-gray-500">Orders from your sales reps will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start space-x-3 flex-1">
                      {order.productImage ? (
                        <img
                          src={getImageUrl(order.productImage)}
                          alt={order.productTitle}
                          className="w-15 h-15 rounded-lg object-cover bg-gray-100"
                          onError={(e) => {
                            e.currentTarget.src = 'https://via.placeholder.com/60x60?text=No+Image';
                          }}
                        />
                      ) : (
                        <div className="w-15 h-15 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Package className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="text-lg font-semibold text-gray-900 mb-1">
                          {order.productTitle || 'Product'}
                        </h4>
                        <p className="text-sm text-gray-600 mb-1">
                          Customer: {order.customerName}
                        </p>
                        <p className="text-xs text-gray-500 mb-1">
                          {order.orderNumber}
                        </p>
                        <p className="text-xs text-blue-600 font-medium">
                          Rep: {order.salesRepName}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="w-4 h-4 mr-1" />
                      <span>{formatDate(order.createdAt)}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(order.totalAmount, order.currencyCode)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
