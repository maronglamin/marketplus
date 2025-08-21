import React, { useState, useEffect } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { AppStackParamList } from '../navigation/AppNavigator';
import { productService, type CustomerProduct } from '../services/productService';
import { useAuth } from '../contexts/AuthContext';
import Constants from 'expo-constants';

const LOCAL_IP = Constants.expoConfig?.extra?.localIp || '192.168.208.48';
const API_URL = process.env.EXPO_PUBLIC_API_URL || `http://${LOCAL_IP}:3000`;

type PopularProductsNavigationProp = NativeStackNavigationProp<AppStackParamList, 'PopularProducts'>;

export default function PopularProductsScreen() {
  const navigation = useNavigation<PopularProductsNavigationProp>();
  const { user } = useAuth();
  
  const [popularProducts, setPopularProducts] = useState<CustomerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadPopularProducts = async (isLoadMore: boolean = false) => {
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
      
      // For now, use regular products until we implement the popular products endpoint
      const products = await productService.getCustomerProducts(currentPage, 30);
      
      if (isLoadMore) {
        setPopularProducts(prev => [...prev, ...products.products]);
        setPage(currentPage);
        setHasMore(products.hasMore);
      } else {
        setPopularProducts(products.products);
        setPage(1);
        setHasMore(products.hasMore);
      }
    } catch (error) {
      console.error('Error loading popular products:', error);
      setError('Failed to load popular products');
      if (!isLoadMore) {
        Alert.alert('Error', 'Failed to load popular products. Please try again.');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadPopularProducts(true);
    }
  };

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 500;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= 
      contentSize.height - paddingToBottom;
    
    if (isCloseToBottom && !loadingMore && hasMore) {
      handleLoadMore();
    }
  };

  const handleProductPress = (productId: string) => {
    navigation.navigate('ProductDetail', { productId });
  };

  useEffect(() => {
    loadPopularProducts();
  }, []);

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

  if (loading && popularProducts.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Loading popular products...</Text>
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
            <Text style={styles.headerTitle}>🔥 POPULAR</Text>
            <Text style={styles.headerSubtitle}>Most Ordered Products</Text>
          </View>
          <TouchableOpacity
            onPress={() => loadPopularProducts()}
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
              onRefresh={() => loadPopularProducts()}
            />
          }
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.heroContent}>
              <View style={styles.heroIconContainer}>
                <Ionicons name="trending-up" size={32} color="#FFFFFF" />
              </View>
              <Text style={styles.heroTitle}>Trending Now</Text>
              <Text style={styles.heroSubtitle}>
                Discover the most popular products that customers love
              </Text>
            </View>
            <View style={styles.heroStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{popularProducts.length}</Text>
                <Text style={styles.statLabel}>Products</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>🔥</Text>
                <Text style={styles.statLabel}>Hot</Text>
              </View>
            </View>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => loadPopularProducts()} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : popularProducts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="trending-up-outline" size={64} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No Popular Products</Text>
              <Text style={styles.emptyText}>
                Popular products will appear here based on customer orders.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.productsGrid}>
                {popularProducts.map((product, index) => (
                  <View key={product.id} style={styles.productCard}>
                    <TouchableOpacity
                      style={styles.productCardTouchable}
                      onPress={() => handleProductPress(product.id)}
                      activeOpacity={0.8}
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
                        <View style={styles.popularBadge}>
                          <Ionicons name="flame" size={12} color="#FFFFFF" />
                          <Text style={styles.popularText}>HOT</Text>
                        </View>
                        <View style={styles.rankBadge}>
                          <Text style={styles.rankText}>#{index + 1}</Text>
                        </View>
                      </View>
                      <View style={styles.productInfo}>
                        <Text style={styles.productName} numberOfLines={2} ellipsizeMode="tail">
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
                  </View>
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
              {!hasMore && popularProducts.length > 0 && (
                <View style={styles.endOfListContainer}>
                  <Text style={styles.endOfListText}>No more popular products to load</Text>
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
    fontWeight: '700',
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
  heroSection: {
    backgroundColor: '#667eea',
    margin: 16,
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  heroContent: {
    flex: 1,
  },
  heroIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 16,
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
    paddingHorizontal: 8,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 8,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
  },
  productCardTouchable: {
    flexDirection: 'row',
  },
  productImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  popularBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  popularText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  rankBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  productInfo: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '700',
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
  loadingMoreContainer: {
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
  endOfListContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  endOfListText: {
    fontSize: 14,
    color: '#6B7280',
  },
});
