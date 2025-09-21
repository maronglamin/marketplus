import React, { useState, useEffect, useCallback } from 'react';
import { Star, Sparkles, RefreshCw, AlertCircle, Filter, X, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { productService, CustomerProduct } from '../api/products';
import { categoryService, Category } from '../api/products';
import { API_CONFIG } from '../config/api';

export function NewArrivals() {
  const [products, setProducts] = useState<CustomerProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<CustomerProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);

  const loadNewArrivals = async (isLoadMore: boolean = false) => {
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
      const response = await productService.getCustomerProducts(currentPage, 50); // Get more to filter
      
      // Filter products from last 2 weeks and sort by creation date
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      
      const filteredProducts = response.products
        .filter(product => new Date(product.createdAt) >= twoWeeksAgo)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      if (isLoadMore) {
        const newProducts = [...products, ...filteredProducts];
        setProducts(newProducts);
        applyCategoryFilter(newProducts, selectedCategory);
        setPage(currentPage);
        setHasMore(response.hasMore);
      } else {
        setProducts(filteredProducts);
        applyCategoryFilter(filteredProducts, selectedCategory);
        setPage(1);
        setHasMore(response.hasMore);
      }
    } catch (error: any) {
      console.error('Error loading new arrivals:', error);
      setError('Failed to load new arrivals');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadCategories = async () => {
    try {
      const categoriesData = await categoryService.getCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategories([]);
    }
  };

  const applyCategoryFilter = (productsList: CustomerProduct[], categoryId: string | null) => {
    if (categoryId === null) {
      setFilteredProducts(productsList);
    } else {
      const selectedCategoryData = categories.find(cat => cat.id === categoryId);
      const categoryName = selectedCategoryData?.name;
      const filtered = productsList.filter(product => 
        product.category?.toLowerCase() === categoryName?.toLowerCase()
      );
      setFilteredProducts(filtered);
    }
  };

  const handleCategorySelect = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
    applyCategoryFilter(products, categoryId);
    setShowCategoryFilter(false);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadNewArrivals(true);
    }
  };

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
    
    if (isNearBottom && !loadingMore && hasMore) {
      handleLoadMore();
    }
  }, [loadingMore, hasMore]);

  useEffect(() => {
    loadNewArrivals();
    loadCategories();
  }, []);

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

  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-purple-600 animate-spin mr-3" />
            <span className="text-gray-600">Loading new arrivals...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Sparkles className="w-8 h-8 text-purple-500 mr-3" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">✨ New Arrivals</h1>
                <p className="text-gray-600 mt-1">Latest products added to our marketplace</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowCategoryFilter(!showCategoryFilter)}
                className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filter by Category
              </button>
              <button
                onClick={() => loadNewArrivals()}
                disabled={loading}
                className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Category Filter */}
          {showCategoryFilter && (
            <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Filter by Category</h3>
                <button
                  onClick={() => setShowCategoryFilter(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleCategorySelect(null)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === null
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Categories
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategorySelect(category.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center space-x-6 text-sm text-gray-600">
            <span>{filteredProducts.length} products</span>
            {selectedCategory && (
              <span className="text-purple-600">
                Filtered by: {categories.find(c => c.id === selectedCategory)?.name}
              </span>
            )}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="flex flex-col items-center justify-center py-20">
            <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Products</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => loadNewArrivals()}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!error && filteredProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <Sparkles className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {selectedCategory ? 'No Products in Category' : 'No New Arrivals'}
            </h3>
            <p className="text-gray-600 text-center mb-6">
              {selectedCategory 
                ? 'No new products found in this category.'
                : 'New products will appear here as they are added to the marketplace.'
              }
            </p>
            {selectedCategory && (
              <button
                onClick={() => handleCategorySelect(null)}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Show All Products
              </button>
            )}
          </div>
        )}

        {/* Products Grid */}
        {!error && filteredProducts.length > 0 && (
          <div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            onScroll={handleScroll}
          >
            {filteredProducts.map((product) => {
              const badge = getBadgeForProduct(product.createdAt);
              const stockStatus = getStockStatus(product.stock);
              const timeAgo = getTimeAgo(product.createdAt);
              
              return (
                <Link
                  key={product.id}
                  to={`/product/${product.id}`}
                  className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 group overflow-hidden"
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
                      <div className="flex items-center bg-black/50 text-white text-xs px-2 py-1 rounded-md">
                        <Clock className="w-3 h-3 mr-1" />
                        {timeAgo}
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
                    
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors">
                      {product.name}
                    </h3>
                    
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
                    
                    <div className="mb-3">
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
                      <button className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                        Shop Now
                      </button>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Load More */}
        {loadingMore && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 text-purple-600 animate-spin mr-3" />
            <span className="text-gray-600">Loading more products...</span>
          </div>
        )}

        {/* End of List */}
        {!hasMore && products.length > 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No more new arrivals to load</p>
          </div>
        )}
      </div>
    </div>
  );
}
