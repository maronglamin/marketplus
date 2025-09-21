import React, { useState, useEffect } from 'react';
import { Star, Sparkles, Clock, RefreshCw, AlertCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { productService, CustomerProduct } from '../api/products';
import { API_CONFIG } from '../config/api';

export function NewArrivals() {
  const [products, setProducts] = useState<CustomerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadNewArrivals = async (isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      // Get recent products (sorted by creation date)
      const response = await productService.getCustomerProducts(1, 50); // Get more to filter
      // Filter products from last 2 weeks and sort by creation date
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      
      const filteredProducts = response.products
        .filter(product => new Date(product.createdAt) >= twoWeeksAgo)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 9); // Take only first 9
      
      setProducts(filteredProducts);
    } catch (error: any) {
      console.error('Error loading new arrivals:', error);
      setError('Failed to load new arrivals');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNewArrivals();
  }, []);

  const handleRefresh = () => {
    loadNewArrivals(true);
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

  const getImageUrl = (image: string | null) => {
    if (!image) return 'https://via.placeholder.com/300x300?text=No+Image';
    if (image.startsWith('http')) return image;
    // Remove /api from BASE_URL since images are served directly from the backend
    const baseUrl = API_CONFIG.BASE_URL.replace('/api', '');
    return `${baseUrl}${image}`;
  };

  const getTimeAgo = (createdAt: string) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffInHours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 168) { // 7 days
      const days = Math.floor(diffInHours / 24);
      return `${days}d ago`;
    } else {
      const weeks = Math.floor(diffInHours / 168);
      return `${weeks}w ago`;
    }
  };

  const getBadgeForProduct = (createdAt: string) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffInHours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) return 'NEW';
    if (diffInHours < 72) return 'FRESH';
    if (diffInHours < 168) return 'LATEST';
    return 'HOT';
  };

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case 'NEW':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'LATEST':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'FRESH':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'HOT':
        return 'bg-red-100 text-red-800 border-red-200';
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
              <Sparkles className="w-6 h-6 text-purple-500 mr-2" />
              <h3 className="text-xl font-semibold text-gray-800">✨ New Arrivals</h3>
            </div>
          </div>
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-purple-600 animate-spin mr-3" />
            <span className="text-gray-600">Loading new arrivals...</span>
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
              <Sparkles className="w-6 h-6 text-purple-500 mr-2" />
              <h3 className="text-xl font-semibold text-gray-800">✨ New Arrivals</h3>
            </div>
            <button
              onClick={handleRefresh}
              className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
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
              <Sparkles className="w-6 h-6 text-purple-500 mr-2" />
              <h3 className="text-xl font-semibold text-gray-800">✨ New Arrivals</h3>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center py-12">
            <Sparkles className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-600 text-center">No new arrivals available at the moment</p>
            <p className="text-gray-400 text-sm text-center mt-2">Check back later for fresh items</p>
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
            <Sparkles className="w-6 h-6 text-purple-500 mr-2" />
            <h3 className="text-xl font-semibold text-gray-800">✨ New Arrivals</h3>
          </div>
          <Link 
            to="/products/new" 
            className="text-sm text-blue-600 font-medium hover:text-blue-700 flex items-center"
          >
            View All
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
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
                  <span className={`text-xs px-2 py-1 rounded-md font-medium border ${getBadgeColor(getBadgeForProduct(product.createdAt))}`}>
                    {getBadgeForProduct(product.createdAt)}
                  </span>
                  <div className="flex items-center bg-black/50 text-white text-xs px-2 py-1 rounded-md">
                    <Clock className="w-3 h-3 mr-1" />
                    {getTimeAgo(product.createdAt)}
                  </div>
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
                  <span className="text-xs text-purple-600 font-medium bg-purple-50 px-2 py-1 rounded">
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
          ))}
        </div>
      </div>
    </div>
  );
}
