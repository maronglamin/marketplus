import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Animated,
  Modal,
  Keyboard,
  TouchableWithoutFeedback,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { AppStackParamList } from '../../../navigation/AppNavigator';
import { productService, type CustomerProduct } from '../../../services/productService';
import { interestService } from '../../../services/interestService';
import { categoryService, type Category } from '../../../services/categoryService';
import { useAuth } from '../../../contexts/AuthContext';
import { API_URL } from '../../../config/env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TokenNotificationCard } from '../../../components/TokenNotificationCard';

// Get the API base URL
// Use centralized API_URL from env

type FeaturedProductsNavigationProp = NativeStackNavigationProp<AppStackParamList, 'FeaturedProducts'>;

export function FeaturedProducts() {
  const navigation = useNavigation<FeaturedProductsNavigationProp>();
  const { user, isLoading: authLoading } = useAuth();
  
  const [featuredProducts, setFeaturedProducts] = useState<CustomerProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<CustomerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [productInterests, setProductInterests] = useState<{ [productId: string]: { exists: boolean; interestId?: string } }>({});
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [lastInterestCheckTime, setLastInterestCheckTime] = useState(0);
  const interestCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const fabWidth = useRef(new Animated.Value(140)).current;
  
  // Category filter state
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loadingCategories, setLoadingCategories] = useState(true);
  
  // Enhanced request management
  const [isRequestInProgress, setIsRequestInProgress] = useState(false);
  const [lastLoadMoreTime, setLastLoadMoreTime] = useState(0);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const requestTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestQueueRef = useRef<Array<() => void>>([]);
  const isProcessingQueueRef = useRef(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Decode JWT token to get user info
  const decodeToken = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  };

  // Load categories from database
  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      console.log('Loading categories...');
      const categoriesData = await categoryService.getCategories();
      console.log('Categories loaded:', categoriesData);
      console.log('Categories count:', categoriesData.length);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  // Optimized interest checking with rate limiting and caching
  const checkProductInterestsWithUser = async (userData: any) => {
    const now = Date.now();
    
    // Rate limit interest checking - only check once every 10 seconds
    if (now - lastInterestCheckTime < 10000) {
      console.log('Skipping interest check - too soon since last check');
      return;
    }
    
    // Don't check if we're rate limited
    if (isRateLimited) {
      console.log('Skipping interest check - rate limited');
      return;
    }
    
    try {
      console.log('Checking product interests for user:', userData.id);
      console.log('Products to check:', featuredProducts.length);
      
      setLastInterestCheckTime(now);
      
      // Batch check interests with delays to prevent 429
      const interestsMap: { [productId: string]: { exists: boolean; interestId?: string } } = {};
      
      for (let i = 0; i < featuredProducts.length; i++) {
        const product = featuredProducts[i];
        
        try {
          console.log(`Checking interest for product ${product.id} (${i + 1}/${featuredProducts.length})...`);
          const result = await interestService.checkInterest(product.id);
          
          interestsMap[product.id] = {
            exists: result.exists,
            interestId: result.interest?.id
          };
          
          // Add delay between requests to prevent overwhelming the server
          if (i < featuredProducts.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay between requests
          }
          
                  } catch (error: any) {
            console.error(`Error checking interest for product ${product.id}:`, error);
            interestsMap[product.id] = {
              exists: false
            };
            
            // If we get a 429 error, stop checking and implement backoff
            if (error.response?.status === 429) {
            console.log('Rate limited during interest check, stopping');
            setIsRateLimited(true);
            
            const backoffTime = 30000; // 30 seconds
            
            if (interestCheckTimeoutRef.current) {
              clearTimeout(interestCheckTimeoutRef.current);
            }
            
            interestCheckTimeoutRef.current = setTimeout(() => {
              setIsRateLimited(false);
            }, backoffTime);
            
            break;
          }
        }
      }

      console.log('Final interests map:', interestsMap);
      setProductInterests(interestsMap);
    } catch (error) {
      console.error('Error checking product interests:', error);
    }
  };

  // Request queue processor
  const processRequestQueue = async () => {
    if (isProcessingQueueRef.current || requestQueueRef.current.length === 0) {
      return;
    }
    
    isProcessingQueueRef.current = true;
    
    while (requestQueueRef.current.length > 0) {
      const request = requestQueueRef.current.shift();
      if (request) {
        try {
          await request();
          // Add delay between requests to prevent overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error('Error processing queued request:', error);
        }
      }
    }
    
    isProcessingQueueRef.current = false;
  };

  const loadFeaturedProducts = async (isLoadMore: boolean = false) => {
    const now = Date.now();
    
    // More conservative rate limiting
    if (isRequestInProgress || isRateLimited) {
      console.log('Request blocked - in progress or rate limited');
      return;
    }
    
    // Prevent refreshing more than once every 8 seconds
    if (!isLoadMore && now - lastRefreshTime < 8000) {
      console.log('Skipping refresh - too soon since last refresh');
      return;
    }
    
    // Much more aggressive rate limiting for load more
    if (isLoadMore && now - lastLoadMoreTime < 8000) { // 8 seconds between load more
      console.log('Skipping load more - too soon since last load more');
      return;
    }
    
    // Queue the request if we're already processing
    if (isProcessingQueueRef.current) {
      console.log('Queueing request');
      requestQueueRef.current.push(() => loadFeaturedProducts(isLoadMore));
      return;
    }
    
    try {
      console.log('loadFeaturedProducts called:', { isLoadMore, page, retryCount });
      
      setIsRequestInProgress(true);
      
      if (isLoadMore) {
        setLoadingMore(true);
        setLastLoadMoreTime(now);
      } else {
        setLoading(true);
        setPage(1);
        setHasMore(true);
        setLastRefreshTime(now);
      }
      setError(null);
      
      const currentPage = isLoadMore ? page + 1 : 1;
      console.log('Making API call to getFeaturedProducts:', { currentPage, limit: 30 });
      
      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 15000); // 15 second timeout
      });
      
      let products: any;
      try {
        const productsPromise = productService.getFeaturedProducts(30, currentPage);
        products = await Promise.race([productsPromise, timeoutPromise]) as any;
      } catch (err: any) {
        // Fallback for anonymous browsing: use popular products if featured requires auth
        if (err?.response?.status === 401) {
          const fallbackPromise = productService.getPopularProducts(currentPage, 30);
          products = await Promise.race([fallbackPromise as any, timeoutPromise]) as any;
        } else {
          throw err;
        }
      }
      
      console.log('Featured products response:', { 
        count: products.products.length, 
        hasMore: products.hasMore,
        total: products.total 
      });
      
      // Log some product categories for debugging
      const uniqueCategories = [...new Set(products.products.map((p: CustomerProduct) => p.category))];
      console.log('Unique product categories:', uniqueCategories);
      console.log('Sample products with categories:', products.products.slice(0, 3).map((p: CustomerProduct) => ({
        name: p.name,
        category: p.category
      })));
      
      // Reset error count on successful request
      setConsecutiveErrors(0);
      setRetryCount(0);
      setIsRateLimited(false);
      
      // Shuffle products to give fair exposure to all sellers
      const shuffleProducts = (products: CustomerProduct[]) => {
        const shuffled = [...products];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
      };

      if (isLoadMore) {
        const newProducts = [...featuredProducts, ...shuffleProducts(products.products)];
        setFeaturedProducts(newProducts);
        // Apply current category filter to new products
        if (selectedCategory) {
          const selectedCategoryData = categories.find(cat => cat.id === selectedCategory);
          const categoryName = selectedCategoryData?.name;
          const filtered = newProducts.filter(product => 
            product.category?.toLowerCase() === categoryName?.toLowerCase()
          );
          setFilteredProducts(filtered);
        } else {
          setFilteredProducts(newProducts);
        }
        setPage(currentPage);
        setHasMore(products.hasMore);
      } else {
        const shuffledProducts = shuffleProducts(products.products);
        setFeaturedProducts(shuffledProducts);
        // Apply current category filter to new products
        if (selectedCategory) {
          const selectedCategoryData = categories.find(cat => cat.id === selectedCategory);
          const categoryName = selectedCategoryData?.name;
          const filtered = shuffledProducts.filter(product => 
            product.category?.toLowerCase() === categoryName?.toLowerCase()
          );
          setFilteredProducts(filtered);
        } else {
          setFilteredProducts(shuffledProducts);
        }
        setPage(1);
        setHasMore(products.hasMore);
      }
      
      // Process any queued requests
      processRequestQueue();
      
    } catch (error: any) {
      console.error('Error loading featured products:', error);
      
      // Handle different types of errors
      if (error.response?.status === 429) {
        setConsecutiveErrors(prev => prev + 1);
        setIsRateLimited(true);
        
        // More aggressive backoff for 429 errors
        const backoffTime = Math.min(60000 * Math.pow(2, consecutiveErrors), 600000); // 1min, 2min, 4min, 8min, 10min max
        
        console.log(`Rate limited (429). Backing off for ${backoffTime}ms`);
        
        if (requestTimeoutRef.current) {
          clearTimeout(requestTimeoutRef.current);
        }
        
        requestTimeoutRef.current = setTimeout(() => {
          setIsRateLimited(false);
          setConsecutiveErrors(0);
        }, backoffTime);
        
        setError(`Server is busy. Please wait ${Math.round(backoffTime / 1000)} seconds before trying again.`);
        
      } else if (error.message === 'Request timeout') {
        setConsecutiveErrors(prev => prev + 1);
        setError('Request timed out. Server might be slow.');
        
        // Shorter backoff for timeout errors
        if (consecutiveErrors >= 2) {
          setIsRateLimited(true);
          const backoffTime = 5000; // 5 seconds
          
          if (requestTimeoutRef.current) {
            clearTimeout(requestTimeoutRef.current);
          }
          
          requestTimeoutRef.current = setTimeout(() => {
            setIsRateLimited(false);
          }, backoffTime);
        }
        
      } else if (error.response?.status >= 500) {
        // Server errors - implement retry with exponential backoff
        setRetryCount(prev => prev + 1);
        setError('Server error. Retrying...');
        
        if (retryCount < 3) {
          const retryDelay = Math.pow(2, retryCount) * 2000; // 2s, 4s, 8s
          
          setTimeout(() => {
            loadFeaturedProducts(isLoadMore);
          }, retryDelay);
        } else {
          setConsecutiveErrors(prev => prev + 1);
          setError('Server is experiencing issues. Please try again later.');
        }
        
      } else {
        setConsecutiveErrors(prev => prev + 1);
        setError('Failed to load featured products');
        
        // General error backoff
        if (consecutiveErrors >= 3) {
          setIsRateLimited(true);
          const backoffTime = 15000; // 15 seconds
          
          if (requestTimeoutRef.current) {
            clearTimeout(requestTimeoutRef.current);
          }
          
          requestTimeoutRef.current = setTimeout(() => {
            setIsRateLimited(false);
          }, backoffTime);
        }
      }
      
      if (!isLoadMore) {
        Alert.alert('Error', 'Failed to load featured products. Please try again.');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setIsInitialLoad(false);
      setIsRequestInProgress(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadFeaturedProducts(true);
    }
  };

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 500; // Much more conservative padding
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= 
      contentSize.height - paddingToBottom;
    
    // Track scroll position for FAB state
    const newIsScrolled = contentOffset.y > 50;
    if (newIsScrolled !== isScrolled) {
      setIsScrolled(newIsScrolled);
      // Animate FAB width
      Animated.timing(fabWidth, {
        toValue: newIsScrolled ? 60 : 140,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
    
    // Extremely conservative load more logic
    if (isCloseToBottom && 
        !loadingMore && 
        !isRequestInProgress && 
        !isRateLimited && 
        !isProcessingQueueRef.current &&
        hasMore && 
        featuredProducts.length > 0 &&
        consecutiveErrors < 1 && // Even more conservative error threshold
        featuredProducts.length % 10 === 0) { // Only trigger on complete pages
      handleLoadMore();
    }
  };

  const handleProductPress = (productId: string) => {
    navigation.navigate('ProductDetail', { productId });
  };

  const handleRefresh = useCallback(() => {
    loadFeaturedProducts();
  }, []);

  // Search functions
  const openSearchScreen = () => {
    navigation.navigate('UserSearch');
  };

  // Handle category selection
  const handleCategorySelect = (categoryId: string | null) => {
    console.log('Category selected:', categoryId);
    setSelectedCategory(categoryId);
    
    if (categoryId === null) {
      // Show all products
      console.log('Showing all products');
      setFilteredProducts(featuredProducts);
    } else {
      // Find the selected category name
      const selectedCategoryData = categories.find(cat => cat.id === categoryId);
      const categoryName = selectedCategoryData?.name;
      console.log('Filtering by category:', categoryName);
      
      // Filter products by selected category name
      const filtered = featuredProducts.filter(product => {
        console.log(`Product: ${product.name}, Category: ${product.category}, Matching: ${categoryName}`);
        return product.category?.toLowerCase() === categoryName?.toLowerCase();
      });
      
      console.log(`Filtered ${filtered.length} products out of ${featuredProducts.length}`);
      setFilteredProducts(filtered);
    }
  };

  const getStockStatus = (stock: number) => {
    if (stock > 10) return { text: 'In Stock', color: '#059669' };
    if (stock > 0) return { text: `Only ${stock} left`, color: '#D97706' };
    return { text: 'Out of Stock', color: '#DC2626' };
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
    
    // Format with thousand separators
    const formattedPrice = price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    return `${symbol}${formattedPrice}`;
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  useEffect(() => {
    console.log('Main useEffect triggered - loading featured products');
    
    // Test AsyncStorage directly
    console.log('Testing AsyncStorage...');
    AsyncStorage.getItem('token').then(token => {
      console.log('AsyncStorage token:', token ? 'Found' : 'Not found');
    });
    AsyncStorage.getItem('user').then(user => {
      console.log('AsyncStorage user:', user ? JSON.parse(user) : 'Not found');
    });
    
    // Test API connection
    console.log('Testing API connection...');
    fetch(`${API_URL}/api/products/test`)
      .then(response => response.json())
      .then(data => console.log('API test response:', data))
      .catch(error => console.error('API test error:', error));
    
    loadFeaturedProducts();
    loadCategories();
    
    // Cleanup function to clear timeouts
    return () => {
      if (requestTimeoutRef.current) {
        clearTimeout(requestTimeoutRef.current);
      }
      if (interestCheckTimeoutRef.current) {
        clearTimeout(interestCheckTimeoutRef.current);
      }
    };
  }, []);

  // Check interests when products are loaded (with much more conservative debouncing)
  useEffect(() => {
    if (featuredProducts.length > 0 && !isRateLimited) {
      // Much more conservative debounce - only check interests on initial load, not on load more
      const timeoutId = setTimeout(() => {
        // Only check interests if this is the initial load (first 10 products)
        if (featuredProducts.length <= 10) {
          // Try to get user data from AsyncStorage or decode from token
          AsyncStorage.getItem('user').then(userData => {
            if (userData) {
              const user = JSON.parse(userData);
              console.log('Found user data, checking interests for initial products:', user.id);
              checkProductInterestsWithUser(user);
            } else {
              // Try to get user info from token
              AsyncStorage.getItem('token').then(token => {
                if (token) {
                  const decodedToken = decodeToken(token);
                  if (decodedToken && decodedToken.userId) {
                    console.log('Decoded user from token, checking interests for initial products:', decodedToken.userId);
                    const user = { id: decodedToken.userId };
                    checkProductInterestsWithUser(user);
                  }
                }
              });
            }
          });
        } else {
          console.log('Skipping interest check for load more products to prevent 429');
        }
      }, 5000); // 5 second debounce - much more conservative
      
      return () => clearTimeout(timeoutId);
    }
  }, [featuredProducts, isRateLimited]);

  const renderProductCard = (product: CustomerProduct) => {
    return (
      <TouchableOpacity
        key={product.id}
        style={styles.productCard}
        onPress={() => handleProductPress(product.id)}
        activeOpacity={0.7}
      >
        <View style={styles.productImageContainer}>
          <Image
            source={{ 
              uri: product.image 
                ? `${API_URL}${product.image}`
                : 'https://via.placeholder.com/160x160?text=No+Image'
            }}
            style={styles.productImage}
            resizeMode="cover"
          />
          <TouchableOpacity style={styles.favoriteButton}>
            <Ionicons 
              name={productInterests[product.id]?.exists ? "heart" : "heart-outline"} 
              size={20} 
              color={productInterests[product.id]?.exists ? "#2563EB" : "#6B7280"} 
            />
          </TouchableOpacity>
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productTitle} numberOfLines={2}>
            {truncateText(product.name, 50)}
          </Text>
          <Text style={styles.productPrice}>
            {formatPrice(product.price, product.currencyCode)}
          </Text>
          <View style={styles.productMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="eye-outline" size={16} color="#6B7280" />
              <Text style={styles.metaText}>{product.views || 0}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="star-outline" size={16} color="#6B7280" />
              <Text style={styles.metaText}>
                {product.rating ? product.rating.toFixed(1) : 'N/A'}
              </Text>
            </View>
          </View>
          <View style={styles.productFooter}>
            <View style={styles.footerActions}>
              <View style={[styles.stockIndicator, { backgroundColor: `${getStockStatus(product.stock).color}15` }]}>
                <Ionicons name="cube-outline" size={14} color={getStockStatus(product.stock).color} />
                <Text style={[styles.stockText, { color: getStockStatus(product.stock).color }]}>
                  {getStockStatus(product.stock).text}
                </Text>
              </View>
              <Text style={styles.sellerName} numberOfLines={1} ellipsizeMode="tail">
                {truncateText(product.seller, 15)}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && isInitialLoad) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading featured products...</Text>
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
          <Text style={styles.title}>
            Featured Products
          </Text>
          <View style={styles.placeholder} />
        </View>

        {/* Category Filter */}
        <View style={styles.categoryFilterContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryFilterScroll}
          >
            {/* All Categories Button */}
            <TouchableOpacity
              style={[
                styles.categoryButton,
                selectedCategory === null && styles.categoryButtonActive
              ]}
              onPress={() => handleCategorySelect(null)}
            >
              <Text style={[
                styles.categoryButtonText,
                selectedCategory === null && styles.categoryButtonTextActive
              ]}>
                All
              </Text>
            </TouchableOpacity>
            
            {/* Category Buttons */}
            {loadingCategories ? (
              <View style={styles.categoryLoadingContainer}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.categoryLoadingText}>Loading categories...</Text>
              </View>
            ) : (
              categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryButton,
                    selectedCategory === category.id && styles.categoryButtonActive
                  ]}
                  onPress={() => handleCategorySelect(category.id)}
                >
                  <Text style={[
                    styles.categoryButtonText,
                    selectedCategory === category.id && styles.categoryButtonTextActive
                  ]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={handleRefresh}
              colors={['#2563EB']}
              enabled={!isRateLimited && !isRequestInProgress}
            />
          }
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.scrollContent}
        >
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => loadFeaturedProducts()} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : filteredProducts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="bag-outline" size={64} color="#9CA3AF" />
              <Text style={styles.emptyText}>
                No featured products available
              </Text>
            </View>
          ) : (
            <>
              {filteredProducts.map(renderProductCard)}
              
              {/* Loading more indicator */}
              {loadingMore && (
                <View style={styles.loadingMore}>
                  <ActivityIndicator size="small" color="#2563EB" />
                  <Text style={styles.loadingMoreText}>Loading more products...</Text>
                </View>
              )}
              
              {/* Manual load more button when automatic loading is disabled */}
              {hasMore && !loadingMore && (consecutiveErrors >= 1 || isRateLimited) && (
                <View style={styles.manualLoadMoreContainer}>
                  <Text style={styles.manualLoadMoreText}>
                    {isRateLimited ? 'Rate limited. Please wait before loading more.' : 'Automatic loading disabled due to errors.'}
                  </Text>
                  <TouchableOpacity 
                    style={styles.manualLoadMoreButton}
                    onPress={handleLoadMore}
                    disabled={isRateLimited}
                  >
                    <Text style={styles.manualLoadMoreButtonText}>
                      {isRateLimited ? 'Wait...' : 'Load More Products'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              
              {/* End of list indicator */}
              {!hasMore && featuredProducts.length > 0 && (
                <View style={styles.endOfList}>
                  <Text style={styles.endOfListText}>No more products to load</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* Floating Action Button */}
        <Animated.View style={[styles.fab, { width: fabWidth }]}>
          <TouchableOpacity
            style={styles.fabTouchable}
            onPress={openSearchScreen}
            activeOpacity={0.8}
          >
            {isScrolled ? (
              <Ionicons name="search" size={28} color="#FFFFFF" />
            ) : (
              <View style={styles.fabContent}>
                <Ionicons name="search" size={20} color="#FFFFFF" />
                <Text style={styles.fabText}>Find Products</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Token Notification Card */}
      <TokenNotificationCard />
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
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 16,
    paddingBottom: 16,
    minHeight: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 64 : 64,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  clearSearchButton: {
    padding: 8,
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
    padding: 16,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    marginTop: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 16,
    textAlign: 'center',
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 8,
  },
  productMeta: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    color: '#6B7280',
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stockIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  stockText: {
    fontSize: 12,
    fontWeight: '500',
  },
  sellerName: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
    textAlign: 'right',
  },
  loadingMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 14,
    color: '#6B7280',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  endOfList: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  endOfListText: {
    fontSize: 14,
    color: '#6B7280',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#2563EB',
    borderRadius: 30,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  fabTouchable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  fabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  manualLoadMoreContainer: {
    alignItems: 'center',
    padding: 20,
    marginTop: 10,
  },
  manualLoadMoreText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 12,
  },
  manualLoadMoreButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    opacity: 0.7,
  },
  manualLoadMoreButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  categoryFilterContainer: {
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  categoryFilterScroll: {
    alignItems: 'center',
    gap: 12,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryButtonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  categoryButtonTextActive: {
    color: '#FFFFFF',
  },
  categoryLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  categoryLoadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
}); 