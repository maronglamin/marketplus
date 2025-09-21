import React, { useState, useEffect } from 'react';
import { Star, TrendingUp, RefreshCw, AlertCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { productService, CustomerProduct } from '../api/products';
import { API_CONFIG } from '../config/api';

export function PopularProducts() {
  const [products, setProducts] = useState<CustomerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadPopularProducts = async (isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      const response = await productService.getPopularProducts(1, 9);
      setProducts(response.products);
    } catch (error: any) {
      console.error('Error loading popular products:', error);
      setError('Failed to load popular products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPopularProducts();
  }, []);

  const handleRefresh = () => {
    loadPopularProducts(true);
  };

  const formatPrice = (price: number, currencyCode: string) => {
    const currencySymbols: { [key: string]: string } = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      CAD: 'C$',
      GMD: 'D',
    };
    const symbol = currencySymbols[currencyCode] || currencyCode;
    
    const formattedPrice = price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    return `${symbol}${formattedPrice}`;
  };

  const getStockStatus = (stock: number) => {
    if (stock > 10) return { text: 'In Stock', color: '#059669' };
    if (stock > 0) return { text: `Only ${stock} left`, color: '#D97706' };
    return { text: 'Out of Stock', color: '#DC2626' };
  };

  const getImageUrl = (image: string | null) => {
    if (!image) return 'https://via.placeholder.com/300x300?text=No+Image';
    if (image.startsWith('http')) return image;
    // Remove /api from BASE_URL since images are served directly from the backend
    const baseUrl = API_CONFIG.BASE_URL.replace('/api', '');
    return `${baseUrl}${image}`;
  };

  const getBadgeForProduct = (index: number, views: number) => {
    if (index < 3) return 'HOT';
    if (views > 1000) return 'TRENDING';
    if (views > 500) return 'POPULAR';
    return 'BESTSELLER';
  };

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case 'BESTSELLER':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'TRENDING':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'HOT':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'POPULAR':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="py-6 bg-white rounded-xl shadow-sm mb-4">
        <div className="px-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <TrendingUp className="w-6 h-6 text-orange-500 mr-2" />
              <h3 className="text-xl font-semibold text-gray-800">🔥 Popular Products</h3>
            </div>
          </div>
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mr-3" />
            <span className="text-gray-600">Loading popular products...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-6 bg-white rounded-xl shadow-sm mb-4">
        <div className="px-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <TrendingUp className="w-6 h-6 text-orange-500 mr-2" />
              <h3 className="text-xl font-semibold text-gray-800">🔥 Popular Products</h3>
            </div>
            <button
              onClick={handleRefresh}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="py-6 bg-white rounded-xl shadow-sm mb-4">
        <div className="px-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <TrendingUp className="w-6 h-6 text-orange-500 mr-2" />
              <h3 className="text-xl font-semibold text-gray-800">🔥 Popular Products</h3>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-600 text-center">No popular products available at the moment</p>
            <p className="text-gray-400 text-sm text-center mt-2">Check back later for trending items</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 bg-white rounded-xl shadow-sm mb-4">
      <div className="px-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <TrendingUp className="w-6 h-6 text-orange-500 mr-2" />
            <h3 className="text-xl font-semibold text-gray-800">🔥 Popular Products</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <Link 
              to="/products/popular" 
              className="text-sm text-blue-600 font-medium hover:text-blue-700 flex items-center"
            >
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product, index) => {
            const badge = getBadgeForProduct(index, product.views);
            const stockStatus = getStockStatus(product.stock);
            
            return (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group"
              >
                <div className="relative">
                  <img
                    src={getImageUrl(product.image)}
                    alt={product.name}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3 flex flex-col gap-2">
                    <span className={`text-xs px-2 py-1 rounded-md font-medium border ${getBadgeColor(badge)}`}>
                      {badge}
                    </span>
                    <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-md font-medium">
                      #{index + 1}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <button className="w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-sm transition-colors">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="mb-2">
                    <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded">
                      {product.category}
                    </span>
                  </div>
                  
                  <h4 className="font-semibold text-sm text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {product.name}
                  </h4>
                  
                  <div className="flex items-center mb-2">
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm ml-1 text-gray-600 font-medium">
                        {product.rating ? product.rating.toFixed(1) : 'N/A'}
                      </span>
                      <span className="text-xs text-gray-400 ml-1">
                        ({product.ratingCount.toLocaleString()})
                      </span>
                    </div>
                  </div>
                  
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>👁️ {product.views.toLocaleString()} views</span>
                      <span style={{ color: stockStatus.color }}>
                        📦 {stockStatus.text}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-lg font-bold text-gray-900">
                        {formatPrice(product.price, product.currencyCode)}
                      </span>
                      <span className="text-xs text-gray-500">by {product.seller}</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
