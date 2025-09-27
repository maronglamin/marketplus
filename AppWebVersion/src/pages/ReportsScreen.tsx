import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  TrendingUp, 
  Receipt, 
  Package, 
  Users, 
  BarChart3, 
  List, 
  Wallet, 
  ChevronRight,
  RefreshCw,
  X
} from 'lucide-react';
import { salesRepService, type SalesRep, type ParentSellerAnalytics } from '../api/salesReps';
import { settlementService, type AvailableRevenueResponse } from '../api/settlementService';

interface Analytics {
  totalStats: {
    totalRevenue: number;
    revenueCurrency: string;
    totalOrders: number;
    pendingOrders: number;
    totalProducts: number;
    averageRating: number;
    ratingCount: number;
  };
  currencyBreakdown: {
    primaryCurrencyCode: string;
    primaryCurrencyTotal: number;
    otherCurrencyCodes: string[];
  };
  salesReps: Array<{
    salesRepId: string;
    salesRepName: string;
    stats: {
      totalRevenue: number;
      totalOrders: number;
      pendingOrders: number;
      totalProducts: number;
      averageRating: number;
      ratingCount: number;
    };
  }>;
}

interface RecentActivity {
  id: string;
  type: 'product' | 'order';
  createdAt: string;
  data: {
    title?: string;
    orderNumber?: string;
    productTitle?: string;
    amount?: number;
    currencyCode?: string;
  };
  rep: {
    id: string;
    userId: string;
    name: string;
  } | null;
}

export function ReportsScreen() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [showSalesModal, setShowSalesModal] = useState(false);
  const [availableRevenue, setAvailableRevenue] = useState<AvailableRevenueResponse | null>(null);
  const [availableLoading, setAvailableLoading] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  useEffect(() => {
    loadRecentActivity();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      // Use the same API as the mobile app
      const analyticsData = await salesRepService.getParentSellerAnalytics(selectedPeriod);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
      // Fallback to empty data on error
      setAnalytics({
        totalStats: {
          totalRevenue: 0,
          revenueCurrency: 'USD',
          totalOrders: 0,
          pendingOrders: 0,
          totalProducts: 0,
          averageRating: 0,
          ratingCount: 0,
        },
        currencyBreakdown: {
          primaryCurrencyCode: 'USD',
          primaryCurrencyTotal: 0,
          otherCurrencyCodes: []
        },
        salesReps: []
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivity = async () => {
    try {
      const res = await salesRepService.getRecentActivity({ limit: 5 });
      setRecentActivity(res.items);
    } catch (error) {
      console.error('Failed to load recent activity', error);
      // Fallback to empty array on error
      setRecentActivity([]);
    }
  };

  const handleViewDetailedReport = (reportType: string) => {
    if (reportType === 'Activity') {
      navigate('/recent-activity');
      return;
    }
    if (reportType === 'Sales') {
      setShowSalesModal(true);
      // Load available revenue for settlement view
      void loadAvailableRevenue();
      return;
    }
    if (reportType === 'Orders') {
      // Navigate to Rep Orders Report
      navigate('/rep-order-report');
      return;
    }
    if (reportType === 'Products') {
      // Navigate to Rep Products Report
      navigate('/rep-product-report');
      return;
    }
    if (reportType === 'Settlement') {
      // Navigate to settlement request
      navigate('/settlement-request');
      return;
    }
    alert(`${reportType} detailed report will be available soon`);
  };

  const formatCurrency = (amount: number, currencyCode?: string) => {
    const currency = currencyCode || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount);
  };

  const formatNumberAbbreviation = (num: number | string, currencyCode?: string): string => {
    const number = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(number)) return '0';
    
    const currency = currencyCode || 'USD';
    let abbreviated = '';
    
    if (number >= 1000000000) {
      abbreviated = (number / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
    } else if (number >= 1000000) {
      abbreviated = (number / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    } else if (number >= 1000) {
      abbreviated = (number / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    } else {
      abbreviated = number.toString();
    }
    
    return `${currency} ${abbreviated}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const loadAvailableRevenue = async () => {
    try {
      setAvailableLoading(true);
      const res = await settlementService.getAvailableRevenue();
      setAvailableRevenue(res);
    } catch (error) {
      console.error('Failed to load available revenue', error);
      setAvailableRevenue(null);
    } finally {
      setAvailableLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-6 pb-20">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading analytics...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
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
              <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
            </div>
            <button
              onClick={loadAnalytics}
              className="flex items-center text-blue-600 hover:text-blue-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Period Selector */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Period</h3>
          <div className="flex gap-2">
            {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedPeriod === period
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumberAbbreviation(analytics?.totalStats?.totalRevenue || 0, analytics?.totalStats?.revenueCurrency)}
              </p>
              <p className="text-sm text-gray-600">
                Total Sales {analytics?.currencyBreakdown?.otherCurrencyCodes?.length
                  ? `(Other: ${analytics?.currencyBreakdown?.otherCurrencyCodes.join(', ')})`
                  : ''}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Receipt className="w-6 h-6 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{analytics?.totalStats?.pendingOrders || 0}</p>
              <p className="text-sm text-gray-600">Total Orders</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Package className="w-6 h-6 text-yellow-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{analytics?.totalStats?.totalProducts || 0}</p>
              <p className="text-sm text-gray-600">Products</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{analytics?.salesReps?.length || 0}</p>
              <p className="text-sm text-gray-600">Sales Reps</p>
            </div>
          </div>
        </div>

        {/* Quick Reports */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Reports</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => handleViewDetailedReport('Sales')}
              className="bg-gray-50 rounded-lg p-4 text-center hover:bg-gray-100 transition-colors"
            >
              <BarChart3 className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <h4 className="font-semibold text-gray-900 mb-1">Sales Report</h4>
              <p className="text-sm text-gray-600">Settlement availability by reps</p>
            </button>

            <button
              onClick={() => handleViewDetailedReport('Orders')}
              className="bg-gray-50 rounded-lg p-4 text-center hover:bg-gray-100 transition-colors"
            >
              <List className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <h4 className="font-semibold text-gray-900 mb-1">Orders Report</h4>
              <p className="text-sm text-gray-600">Order fulfillment details</p>
            </button>

            <button
              onClick={() => handleViewDetailedReport('Products')}
              className="bg-gray-50 rounded-lg p-4 text-center hover:bg-gray-100 transition-colors"
            >
              <Package className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
              <h4 className="font-semibold text-gray-900 mb-1">Products Report</h4>
              <p className="text-sm text-gray-600">Product performance metrics</p>
            </button>

            <button
              onClick={() => handleViewDetailedReport('Settlement')}
              className="bg-gray-50 rounded-lg p-4 text-center hover:bg-gray-100 transition-colors"
            >
              <Wallet className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <h4 className="font-semibold text-gray-900 mb-1">Settlement</h4>
              <p className="text-sm text-gray-600">Request settlement payments</p>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm p-6 pb-20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <button
              onClick={() => handleViewDetailedReport('Activity')}
              className="flex items-center text-blue-600 hover:text-blue-700"
            >
              <span className="text-sm font-medium mr-1">View All</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                  activity.type === 'product' ? 'bg-green-500' : 'bg-blue-500'
                }`}>
                  {activity.type === 'product' ? (
                    <Package className="w-4 h-4 text-white" />
                  ) : (
                    <Receipt className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {activity.type === 'product'
                      ? `${activity.data?.title || 'Product'} by ${activity.rep?.name || 'Unknown Rep'}`
                      : `Order #${activity.data?.orderNumber || ''} - ${activity.data?.productTitle || 'Product'} by ${activity.rep?.name || 'Unknown Rep'}`}
                  </p>
                  <p className="text-xs text-gray-500">{formatDate(activity.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(activity.data?.amount || 0, activity.data?.currencyCode)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>

      {showSalesModal && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowSalesModal(false)}></div>
          <div className="absolute inset-x-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 top-16 md:top-24 md:w-[640px] bg-white rounded-xl shadow-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Sales Report</h3>
              <button onClick={() => setShowSalesModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-6 max-h-[70vh] overflow-auto">
              {/* Parent seller available revenue */}
              <div>
                <div className="text-sm font-semibold text-gray-900 mb-2">Available for Settlement</div>
                {availableLoading ? (
                  <div className="text-sm text-gray-500">Loading...</div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {(availableRevenue?.parentRevenue?.revenues || []).map((rev) => (
                      <div key={`parent-${rev.currency}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                        <div className="text-sm text-gray-700">Parent Seller • {rev.currency}</div>
                        <div className="text-sm font-semibold text-gray-900">{formatCurrency(rev.amount, rev.currency)}</div>
                      </div>
                    ))}
                    {!availableRevenue?.parentRevenue?.revenues?.length && (
                      <div className="text-sm text-gray-500">No available revenue for settlement.</div>
                    )}
                  </div>
                )}
              </div>

              {/* Sales reps available revenue */}
              <div>
                <div className="text-sm font-semibold text-gray-900 mb-2">Sales Reps</div>
                {availableLoading ? (
                  <div className="text-sm text-gray-500">Loading...</div>
                ) : (
                  <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
                    {(availableRevenue?.salesRepRevenue?.salesReps || []).length ? (
                      availableRevenue!.salesRepRevenue!.salesReps.map((rep) => (
                        <div key={rep.salesRepId} className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium text-gray-900">{rep.name}</div>
                          </div>
                          <div className="mt-2 grid grid-cols-1 gap-2">
                            {rep.revenues.map((rev) => (
                              <div key={`${rep.salesRepId}-${rev.currency}`} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                                <div className="text-xs text-gray-600">{rev.currency}</div>
                                <div className="text-sm font-semibold text-gray-900">{formatCurrency(rev.amount, rev.currency)}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-sm text-gray-500">No sales representative revenue available.</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end">
              <button
                onClick={() => setShowSalesModal(false)}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
