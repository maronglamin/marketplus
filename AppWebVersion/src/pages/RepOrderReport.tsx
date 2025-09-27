import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Receipt, 
  Calendar, 
  User, 
  Package,
  RefreshCw,
  AlertCircle,
  Search,
  Filter,
  Download
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
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

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

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (dateFrom) {
        const from = new Date(dateFrom);
        if (new Date(order.createdAt) < new Date(from.setHours(0, 0, 0, 0))) return false;
      }

      if (dateTo) {
        const to = new Date(dateTo);
        if (new Date(order.createdAt) > new Date(to.setHours(23, 59, 59, 999))) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = [
          order.orderNumber,
          order.productTitle,
          order.salesRepName,
          order.customerName,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [orders, dateFrom, dateTo, searchQuery]);

  const filteredCompletedOrders = useMemo(
    () => filteredOrders.filter((order) => ['COMPLETED', 'DELIVERED', 'CONFIRMED', 'AUTHORIZED'].includes(order.status?.toUpperCase())),
    [filteredOrders]
  );

  const filteredRevenueByCurrency = useMemo(() => {
    return filteredCompletedOrders.reduce((acc: Record<string, number>, order) => {
      const currency = order.currencyCode || 'USD';
      acc[currency] = (acc[currency] || 0) + order.totalAmount;
      return acc;
    }, {} as Record<string, number>);
  }, [filteredCompletedOrders]);

  const filteredPrimaryCurrency = useMemo(() => {
    const keys = Object.keys(filteredRevenueByCurrency);
    if (keys.length === 0) return primaryCurrency;
    return keys.reduce((a, b) => (filteredRevenueByCurrency[a] > filteredRevenueByCurrency[b] ? a : b));
  }, [filteredRevenueByCurrency, primaryCurrency]);

  const filteredTotalRevenue = useMemo(
    () => filteredRevenueByCurrency[filteredPrimaryCurrency] || 0,
    [filteredRevenueByCurrency, filteredPrimaryCurrency]
  );

  const exportCsv = () => {
    const headers = ['Order Number', 'Status', 'Date', 'Amount', 'Currency', 'Product Title', 'Rep Name'];
    const rows = filteredOrders.map((o) => [
      o.orderNumber,
      getStatusText(o.status),
      new Date(o.createdAt).toISOString(),
      o.totalAmount.toString(),
      o.currencyCode,
      o.productTitle || '',
      o.salesRepName,
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${(v ?? '').toString().replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `rep-orders-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
      <div className="max-w-4xl mx-auto px-4 py-6 pb-20">
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
            <div className="flex items-center gap-2">
              <button
                onClick={exportCsv}
                className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
                title="Export filtered as CSV"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
            <button
              onClick={loadRepOrders}
              className="flex items-center text-blue-600 hover:text-blue-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
        </div>

        {/* Summary & Filters */
        }
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500">Total Orders (filtered)</p>
              <p className="text-2xl font-bold text-gray-900">{filteredOrders.length}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500">Completed/Delivered/Confirmed</p>
              <p className="text-2xl font-bold text-gray-900">{filteredCompletedOrders.length}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">Revenue</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">{filteredPrimaryCurrency}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(filteredTotalRevenue, filteredPrimaryCurrency)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search order #, product, rep, customer"
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
            <div>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
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
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">No matching orders</h4>
              <p className="text-gray-500">Try adjusting your filters or search</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <div key={order.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      {order.productImage ? (
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        <img
                          src={getImageUrl(order.productImage)}
                          alt={order.productTitle}
                            className="w-full h-full object-cover"
                          onError={(e) => {
                              e.currentTarget.src = 'https://via.placeholder.com/64x64?text=No+Image';
                          }}
                        />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <Package className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base md:text-lg font-semibold text-gray-900 mb-1 line-clamp-2">
                          {order.productTitle || 'Product'}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-medium">#{order.orderNumber}</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium">Rep: {order.salesRepName}</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-50 text-gray-600 text-xs">{order.customerName}</span>
                        </div>
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

