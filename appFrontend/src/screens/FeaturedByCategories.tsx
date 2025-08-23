import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { AppStackParamList } from '../navigation/AppNavigator';
import { productService, type CustomerProduct } from '../services/productService';
import { interestService } from '../services/interestService';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config/env';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use centralized API_URL from env

type FeaturedByCategoriesNavigationProp = NativeStackNavigationProp<AppStackParamList, 'FeaturedByCategories'>;

export default function FeaturedByCategoriesScreen() {
  const navigation = useNavigation<FeaturedByCategoriesNavigationProp>();
  const route = useRoute();
  const { categoryId, categoryName } = route.params as { categoryId: string; categoryName: string };
  const { user } = useAuth();
  
  const [featuredProducts, setFeaturedProducts] = useState<CustomerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [productInterests, setProductInterests] = useState<{ [productId: string]: { exists: boolean; interestId?: string } }>({});
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [lastInterestCheckTime, setLastInterestCheckTime] = useState(0);
  const interestCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Enhanced request management
  const [isRequestInProgress, setIsRequestInProgress] = useState(false);
  const [lastLoadMoreTime, setLastLoadMoreTime] = useState(0);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const requestTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestQueueRef = useRef<Array<() => void>>([]);
  const isProcessingQueueRef = useRef(false);

  useEffect(() => {
    loadFeaturedProducts();
    
    // Cleanup function to clear timeouts
    return () => {
      if (requestTimeoutRef.current) {
        clearTimeout(requestTimeoutRef.current);
      }
      if (interestCheckTimeoutRef.current) {
        clearTimeout(interestCheckTimeoutRef.current);
      }
    };
  }, [categoryId]);

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
        const product: CustomerProduct = featuredProducts[i];
        
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
      console.log('Making API call to getFeaturedProducts with category filter:', { currentPage, limit: 30, categoryId });
      
      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 15000); // 15 second timeout
      });
      
      const productsPromise = productService.getCustomerProducts(currentPage, 30, categoryId);
      const products = await Promise.race([productsPromise, timeoutPromise]) as any;
      
      console.log('Featured products response:', { 
        count: products.products.length, 
        hasMore: products.hasMore,
        total: products.total 
      });
      
      // Reset error count on successful request
      setConsecutiveErrors(0);
      setRetryCount(0);
      setIsRateLimited(false);
      
      // Filter to only show featured products
      const featuredOnly = products.products.filter((product: CustomerProduct) => product.isFeatured);
      
      if (isLoadMore) {
        setFeaturedProducts(prev => [...prev, ...featuredOnly]);
        setPage(currentPage);
        setHasMore(products.hasMore && featuredOnly.length > 0);
      } else {
        setFeaturedProducts(featuredOnly);
        setPage(1);
        setHasMore(products.hasMore && featuredOnly.length > 0);
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

  if (loading && featuredProducts.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Loading featured products...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent
      />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Featured Products</Text>
            <Text style={styles.headerSubtitle}>{categoryName}</Text>
          </View>
          <TouchableOpacity
            onPress={() => loadFeaturedProducts()}
            style={styles.refreshButton}
            disabled={loading}
          >
            <Ionicons 
              name="refresh" 
              size={20} 
              color={loading ? "#9CA3AF" : "#2563EB"} 
            />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false} 
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => loadFeaturedProducts()}
            />
          }
        >
          {/* Category Header */}
          <View style={styles.categoryHeader}>
            <View style={styles.categoryHeaderContent}>
              {/* <Text style={styles.categoryHeaderTitle}>Featured Products</Text> */}
              <Text style={styles.categoryHeaderTitle}>{categoryName}</Text>
            </View>
            <View style={styles.categoryHeaderIcon}>
              <Ionicons name="star" size={24} color="#F59E0B" />
            </View>
          </View>
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => loadFeaturedProducts()} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : featuredProducts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="star-outline" size={64} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No Featured Products</Text>
              <Text style={styles.emptyText}>
                No featured products available in {categoryName} category yet.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.productsGrid}>
                {featuredProducts.map((product) => (
                  <TouchableOpacity
                    key={product.id}
                    style={styles.productCard}
                    onPress={() => handleProductPress(product.id)}
                  >
                    <View style={styles.productImageContainer}>
                      <Image
                        source={{ 
                          uri: product.image 
                            ? `${API_URL}${product.image}`
                            : 'https://via.placeholder.com/160x160?text=No+Image'
                        }}
                        style={styles.productImage}
                      />
                      {/* <View style={styles.featuredBadge}>
                        <Ionicons name="star" size={12} color="#FFFFFF" />
                        <Text style={styles.featuredText}>Featured</Text>
                      </View> */}
                      <View style={styles.favoriteButton}>
                        <Ionicons 
                          name={productInterests[product.id]?.exists ? "heart" : "heart-outline"} 
                          size={20} 
                          color={productInterests[product.id]?.exists ? "#2563EB" : "#6B7280"} 
                        />
                      </View>
                    </View>
                    <View style={styles.productInfo}>
                      <Text style={styles.productName} numberOfLines={2} ellipsizeMode="tail">
                        {truncateText(product.name, 50)}
                      </Text>
                      <Text style={styles.productPrice}>
                        {formatPrice(product.price, product.currencyCode)}
                      </Text>
                      <View style={styles.productDetails}>
                        <Text
                          style={[
                            styles.stockText,
                            { color: getStockStatus(product.stock).color },
                          ]}
                        >
                          {getStockStatus(product.stock).text}
                        </Text>
                        <Text style={styles.sellerName} numberOfLines={1} ellipsizeMode="tail">
                          {truncateText(product.seller, 15)}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* Loading more indicator */}
              {loadingMore && (
                <View style={styles.loadingMoreContainer}>
                  <ActivityIndicator size="small" color="#2563EB" />
                  <Text style={styles.loadingMoreText}>Loading more products...</Text>
                </View>
              )}
              
              {/* End of list indicator */}
              {!hasMore && featuredProducts.length > 0 && (
                <View style={styles.endOfListContainer}>
                  <Text style={styles.endOfListText}>No more featured products to load</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  content: {
    flex: 1,
  },
  categoryHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 30,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  categoryHeaderContent: {
    flex: 1,
  },
  categoryHeaderTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  categoryHeaderSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  categoryHeaderIcon: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 8,
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
    padding: 32,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
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
    padding: 48,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
  },
  productCard: {
    width: '50%',
    padding: 8,
  },
  productImageContainer: {
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: 160,
    borderRadius: 8,
  },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 4,
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
    padding: 8,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
    flex: 1,
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
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
  loadingMoreContainer: {
    padding: 16,
    alignItems: 'center',
  },
  loadingMoreText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  endOfListContainer: {
    padding: 16,
    alignItems: 'center',
  },
  endOfListText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
