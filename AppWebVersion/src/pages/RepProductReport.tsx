import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Package, 
  User, 
  RefreshCw,
  AlertCircle,
  Box,
  Image as ImageIcon
} from 'lucide-react';
import { salesRepService } from '../api/salesReps';
import { getImageUrl } from '../config/api';

interface RepProduct {
  id: string;
  title: string;
  price: number;
  currencyCode: string;
  quantity: number;
  status: string;
  createdAt: string;
  productImage?: string;
  salesRepName: string;
  salesRepId: string;
}

type GroupedProducts = {
  [key: string]: RepProduct[];
};

export function RepProductReport() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<RepProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // use centralized image URL helper

  // Group products by time
  const groupedProducts = useMemo(() => {
    const groups: GroupedProducts = {
      'Last Hour': [],
      'Today': [],
      'This Week': [],
      'This Month': [],
      'Older': []
    };

    products.forEach(product => {
      const createdAt = new Date(product.createdAt);
      const now = new Date();
      
      const hoursDiff = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60));
      const daysDiff = Math.floor(hoursDiff / 24);
      const weeksDiff = Math.floor(daysDiff / 7);
      const monthsDiff = Math.floor(daysDiff / 30);

      if (hoursDiff < 1) {
        groups['Last Hour'].push(product);
      } else if (daysDiff < 1) {
        groups['Today'].push(product);
      } else if (weeksDiff < 1) {
        groups['This Week'].push(product);
      } else if (monthsDiff < 1) {
        groups['This Month'].push(product);
      } else {
        groups['Older'].push(product);
      }
    });

    // Remove empty groups
    return Object.fromEntries(
      Object.entries(groups).filter(([_, products]) => products.length > 0)
    );
  }, [products]);

  const loadProducts = useCallback(async (shouldRefresh = false) => {
    try {
      if (shouldRefresh) {
        setRefreshing(true);
      }
      setLoading(true);
      setError(null);
      
      console.log('Fetching rep products:', { shouldRefresh });
      
      // Get recent activity which includes products from sales reps
      const response = await salesRepService.getRecentActivity({ 
        limit: 30, 
        type: 'product' // Only fetch products
      });
      
      // Filter only products and transform the data
      const productActivities = response.items
        .filter((activity: any) => activity.type === 'product')
        .map((activity: any) => ({
          id: activity.data.productId,
          title: activity.data.title,
          price: Number(activity.data.amount) || 0,
          currencyCode: activity.data.currencyCode,
          quantity: activity.data.quantity || 0,
          status: activity.data.status || 'ACTIVE',
          createdAt: activity.createdAt,
          productImage: activity.data.productImage,
          salesRepName: activity.rep?.name || 'Unknown Rep',
          salesRepId: activity.rep?.id || '',
        }));

      setProducts(productActivities);
      console.log('Updated rep products state:', { 
        totalProducts: productActivities.length,
        hasMore: response.nextCursor !== null
      });
    } catch (error: any) {
      console.error('Error loading rep products:', error);
      setError('Failed to load products');
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProducts(true);
  }, [loadProducts]);

  const handleRefresh = useCallback(() => {
    loadProducts(true);
  }, [loadProducts]);

  const getQuantityStatus = (qty: number) => {
    if (qty <= 0) return { text: 'Out of Stock', color: 'bg-red-100 text-red-800' };
    if (qty <= 5) return { text: 'Low Stock', color: 'bg-yellow-100 text-yellow-800' };
    if (qty <= 10) return { text: 'Medium Stock', color: 'bg-blue-100 text-blue-800' };
    return { text: 'In Stock', color: 'bg-green-100 text-green-800' };
  };

  const formatCurrency = (amount: number, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && !refreshing) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading products from sales reps...</p>
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
                <h1 className="text-2xl font-bold text-gray-900">Rep Products Report</h1>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={handleRefresh}
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
              <h1 className="text-2xl font-bold text-gray-900">Rep Products Report</h1>
            </div>
            <button
              onClick={handleRefresh}
              className="flex items-center text-blue-600 hover:text-blue-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Content */}
        {products.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Box className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found from sales reps</h3>
            <p className="text-gray-500">Products uploaded by your sales reps will appear here</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedProducts).map(([title, products]) => (
              <div key={title} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                    <span className="text-sm text-gray-500">
                      {products.length} {products.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="space-y-3">
                    {products
                      .filter(product => product && product.id && product.title)
                      .map((product) => {
                        const quantityStatus = getQuantityStatus(product.quantity);
                        const imageUrl = product.productImage ? getImageUrl(product.productImage) : undefined;

                        return (
                          <div key={product.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
                            <div className="flex items-center gap-3">
                              <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                {imageUrl ? (
                                  <img
                                    src={imageUrl}
                                    alt={product.title}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.src = 'https://via.placeholder.com/80x80?text=No+Image';
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon className="w-8 h-8 text-gray-400" />
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <h4 className="text-base md:text-lg font-semibold text-gray-900 mb-1 line-clamp-2">
                                      {product.title}
                                    </h4>
                                    <div className="flex items-center text-sm text-gray-500">
                                      <User className="w-4 h-4 mr-1" />
                                      <span className="truncate">{product.salesRepName}</span>
                                    </div>
                                  </div>

                                  <div className="text-right flex-shrink-0">
                                    <p className="text-lg md:text-xl font-bold text-blue-600">
                                      {formatCurrency(product.price, product.currencyCode)}
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-3 flex items-center justify-between">
                                  <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${quantityStatus.color}`}>
                                    <Box className="w-3 h-3 mr-1" />
                                    <span>{product.quantity} {quantityStatus.text}</span>
                                  </div>
                                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    product.status === 'ACTIVE'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {product.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
