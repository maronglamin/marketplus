import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Grid, List, ShoppingCart, Heart, Star, ArrowRight } from 'lucide-react';
import { productService, categoryService, CustomerProduct, Category } from '../api/products';
import { API_CONFIG, getImageUrl } from '../config/api';
import { useAuth } from '../contexts/AuthContext';

export function Products() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<CustomerProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'random' | 'price-low' | 'price-high' | 'newest' | 'oldest'>('random');
  const [scrollLock, setScrollLock] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingMoreRef = useRef(false);
  const lastLoadTimeRef = useRef(0);


  const loadProducts = useCallback(async (isLoadMore: boolean = false, searchOverride?: string) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }

      const page = isLoadMore ? currentPage + 1 : 1;
      const limit = 20;
      
      // Add timeout to prevent hanging requests (like mobile app)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 15000); // 15 second timeout
      });
      
      // Use the customer products endpoint with proper filtering instead of featured
      // This allows for proper server-side filtering and pagination
      const productsPromise = productService.getCustomerProducts(
        page, 
        limit, 
        selectedCategoryId || undefined, 
        (searchOverride ?? debouncedSearchQuery) || undefined
      );
      const response = await Promise.race([productsPromise, timeoutPromise]) as any;
      
      // All products from customer endpoint are already filtered by the backend
      let filteredProducts = response.products;

      // Apply client-side sorting only (backend handles category and search filtering)
      switch (sortBy) {
        case 'price-low':
          filteredProducts.sort((a: CustomerProduct, b: CustomerProduct) => a.price - b.price);
          break;
        case 'price-high':
          filteredProducts.sort((a: CustomerProduct, b: CustomerProduct) => b.price - a.price);
          break;
        case 'newest':
          filteredProducts.sort((a: CustomerProduct, b: CustomerProduct) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          break;
        case 'oldest':
          filteredProducts.sort((a: CustomerProduct, b: CustomerProduct) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          break;
        case 'random':
        default:
          // Shuffle only on initial load to avoid destabilizing subsequent pages
          if (!isLoadMore) {
            const shuffleProducts = (products: CustomerProduct[]) => {
              const shuffled = [...products];
              for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
              }
              return shuffled;
            };
            filteredProducts = shuffleProducts(filteredProducts);
          }
          break;
      }

      if (isLoadMore) {
        // For load more, append new products to existing ones
        setProducts(prev => {
          // Filter out any duplicate products by ID
          const existingIds = new Set(prev.map(p => p.id));
          const newProducts = filteredProducts.filter((p: CustomerProduct) => !existingIds.has(p.id));
          return [...prev, ...newProducts];
        });
        setCurrentPage(page);
      } else {
        // For initial load, replace all products
        setProducts(filteredProducts);
        setCurrentPage(1);
      }

      // Use the hasMore from the backend response, which accounts for filtering
      setHasMore(response.hasMore);
    } catch (error: any) {
      console.error('Error loading products:', error);
      
      // Handle different types of errors like the mobile app
      if (error.message === 'Request timeout') {
        setError('Request timed out. Server might be slow.');
      } else if (error.response?.status === 401) {
        setError('Please log in to view products');
      } else if (error.response?.status === 429) {
        setError('Too many requests. Please wait a moment and try again.');
      } else if (error.response?.status >= 500) {
        setError('Server error. Please try again later.');
      } else {
        setError(`Failed to load products: ${error.response?.data?.error || error.message}`);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [selectedCategoryId, debouncedSearchQuery, sortBy, user, currentPage]);

  const loadCategories = async () => {
    try {
      const categoriesData = await categoryService.getCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // Initialize selected category and search from URL parameters
  useEffect(() => {
    const categoryFromUrl = searchParams.get('category');
    const searchFromUrl = searchParams.get('search');
    if (categoryFromUrl) {
      // Find the category by name and set both name and ID
      const category = categories.find(cat => cat.name === categoryFromUrl);
      if (category) {
        setSelectedCategory(category.name);
        setSelectedCategoryId(category.id);
      }
    }
    if (searchFromUrl !== null) {
      setSearchQuery(searchFromUrl);
      // Trigger immediate debounce update so initial load uses URL param
      setDebouncedSearchQuery(searchFromUrl);
      // Immediately load with the URL search
      setCurrentPage(1);
      setProducts([]);
      loadProducts(false, searchFromUrl);
    }
  }, [searchParams, categories, user, loadProducts]);

  // Debounce search query
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // 500ms delay

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const handleLoadMore = useCallback(() => {
    const now = Date.now();
    const timeSinceLastLoad = now - lastLoadTimeRef.current;
    
    // Prevent loading too frequently (minimum 1 second between loads)
    if (timeSinceLastLoad < 1000) {
      return;
    }
    
    if (!loadingMore && hasMore && !isLoadingMoreRef.current && !scrollLock) {
      isLoadingMoreRef.current = true;
      setScrollLock(true);
      lastLoadTimeRef.current = now;
      
      loadProducts(true).finally(() => {
        isLoadingMoreRef.current = false;
        // Release scroll lock after a short delay
        setTimeout(() => {
          setScrollLock(false);
        }, 500);
      });
    }
  }, [loadingMore, hasMore, loadProducts, scrollLock]);

  useEffect(() => {
    // Reset to page 1 when filters change
    setCurrentPage(1);
    setProducts([]);
    loadProducts();
  }, [user, selectedCategoryId, debouncedSearchQuery, sortBy]);

  // Infinite scrolling effect using both Intersection Observer and scroll fallback
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    // Fallback scroll event listener
    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.offsetHeight;
        const distanceFromBottom = documentHeight - (scrollTop + windowHeight);
        
        // Check if user has scrolled to within 300px of the bottom
        const now = Date.now();
        const timeSinceLastLoad = now - lastLoadTimeRef.current;
        
        if (distanceFromBottom <= 300 && 
            !loadingMore && 
            hasMore && 
            !isLoadingMoreRef.current && 
            !scrollLock &&
            timeSinceLastLoad >= 1000) {
          handleLoadMore();
        }
      }, 100);
    };

    // Intersection Observer
    const observer = new IntersectionObserver(
      (entries) => {
        const now = Date.now();
        const timeSinceLastLoad = now - lastLoadTimeRef.current;
        
        if (entries[0].isIntersecting && 
            !loadingMore && 
            hasMore && 
            !isLoadingMoreRef.current && 
            !scrollLock &&
            timeSinceLastLoad >= 1000) {
          handleLoadMore();
        }
      },
      {
        root: null,
        rootMargin: '200px',
        threshold: 0.1,
      }
    );

    // Set up both observers
    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    } else {
      setTimeout(() => {
        if (sentinelRef.current) {
          observer.observe(sentinelRef.current);
        }
      }, 100);
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
    };
  }, [handleLoadMore, loadingMore, hasMore, scrollLock]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadProducts();
  };

  const clearFilters = () => {
    setSelectedCategory('');
    setSelectedCategoryId('');
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setSortBy('random');
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
    if (stock > 10) return { text: 'In Stock', color: 'text-green-600' };
    if (stock > 0) return { text: `Only ${stock} left`, color: 'text-orange-600' };
    return { text: 'Out of Stock', color: 'text-red-600' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-4 text-gray-600">Loading featured products...</span>
          </div>
        </div>
      </div>
    );
  }

  // Publicly accessible; no auth gate here

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {selectedCategory ? `${selectedCategory} Products` : 'All Featured Products'}
          </h1>
          <p className="text-gray-600">
            {selectedCategory 
              ? `Browse featured products in ${selectedCategory} category`
              : 'Browse all featured products with random sorting for equal exposure'
            }
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </form>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => {
                const categoryName = e.target.value;
                const category = categories.find(cat => cat.name === categoryName);
                setSelectedCategory(categoryName);
                setSelectedCategoryId(category ? category.id : '');
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="random">Random</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>

            {/* View Mode */}
            <div className="flex border border-gray-300 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>

            {/* Clear Filters */}
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Results Count */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">
            {selectedCategory 
              ? `${products.length} ${selectedCategory} product${products.length !== 1 ? 's' : ''} found`
              : `${products.length} featured product${products.length !== 1 ? 's' : ''} found`
            }
          </p>
          {selectedCategory && (
            <button
              onClick={() => {
                setSelectedCategory('');
                setSelectedCategoryId('');
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear Category Filter
            </button>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
            <button
              onClick={() => loadProducts()}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Products Grid/List */}
        {products.length === 0 ? (
          <div className="text-center py-20 pb-32">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingCart className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No featured products found</h3>
            <p className="text-gray-600 mb-4">Try adjusting your search or filters to find featured products</p>
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'space-y-4'
          }>
            {products.map((product) => (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer block ${
                  viewMode === 'list' ? 'flex p-6' : 'p-4'
                }`}
              >
                {viewMode === 'grid' ? (
                  // Grid View
                  <>
                    <div className="aspect-square mb-4 relative">
                      <img
                        src={getImageUrl(product.image)}
                        alt={product.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      {product.isFeatured && (
                        <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">
                          Featured
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="font-semibold text-gray-900 line-clamp-2">{product.name}</h3>
                      
                      <div className="flex items-center space-x-2">
                        {product.rating ? (
                          <>
                            <Star className="w-4 h-4 text-yellow-400 fill-current" />
                            <span className="text-sm text-gray-600">
                              {product.rating.toFixed(1)} ({product.ratingCount})
                            </span>
                          </>
                        ) : (
                          <span className="text-sm text-gray-500">No ratings</span>
                        )}
                      </div>
                      
                      <p className="text-2xl font-bold text-blue-600">
                        {formatPrice(product.price, product.currencyCode)}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium ${getStockStatus(product.stock).color}`}>
                          {getStockStatus(product.stock).text}
                        </span>
                        <span className="text-sm text-gray-500">
                          {product.views} views
                        </span>
                      </div>
                      
                    </div>
                  </>
                ) : (
                  // List View
                  <>
                    <div className="w-32 h-32 flex-shrink-0 relative">
                      <img
                        src={getImageUrl(product.image)}
                        alt={product.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      {product.isFeatured && (
                        <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">
                          Featured
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 ml-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">{product.name}</h3>
                          
                          <div className="flex items-center space-x-4 mb-2">
                            {product.rating ? (
                              <div className="flex items-center space-x-1">
                                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                                <span className="text-sm text-gray-600">
                                  {product.rating.toFixed(1)} ({product.ratingCount} reviews)
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">No ratings</span>
                            )}
                            <span className="text-sm text-gray-500">•</span>
                            <span className="text-sm text-gray-500">{product.views} views</span>
                            <span className="text-sm text-gray-500">•</span>
                            <span className={`text-sm font-medium ${getStockStatus(product.stock).color}`}>
                              {getStockStatus(product.stock).text}
                            </span>
                          </div>
                          
                          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                            {product.category} • {product.condition}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-2xl font-bold text-blue-600">
                                {formatPrice(product.price, product.currencyCode)}
                              </p>
                              <p className="text-sm text-gray-500">by {product.seller}</p>
                            </div>
                            
                            <div className="flex space-x-2">
                              <button className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                                <Heart className="w-5 h-5" />
                              </button>
                              <Link
                                to={`/product/${product.id}`}
                                className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                              >
                                <ShoppingCart className="w-4 h-4 mr-2" />
                                View Details
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </Link>
            ))}
          </div>
        )}


        {/* Loading More Products */}
        {loadingMore && (
          <div className="text-center mt-8 py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading more products...</p>
          </div>
        )}


        {/* Infinite Scroll Sentinel */}
        <div ref={sentinelRef} className="h-4 w-full" />

        {/* End of Results */}
        {!hasMore && products.length > 0 && !loadingMore && (
          <div className="text-center mt-8 py-12">
            <p className="text-gray-500">You've reached the end of the featured products list</p>
          </div>
        )}
      </div>
    </div>
  );
}
