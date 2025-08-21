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
import { categoryService, type Category } from '../services/categoryService';
import { useAuth } from '../contexts/AuthContext';
import Constants from 'expo-constants';

const LOCAL_IP = Constants.expoConfig?.extra?.localIp || '192.168.208.48';
const API_URL = process.env.EXPO_PUBLIC_API_URL || `http://${LOCAL_IP}:3000`;

type NewArrivalsNavigationProp = NativeStackNavigationProp<AppStackParamList, 'NewArrivals'>;

export default function NewArrivalsScreen() {
  const navigation = useNavigation<NewArrivalsNavigationProp>();
  const { user } = useAuth();
  
  const [newArrivals, setNewArrivals] = useState<CustomerProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const loadCategories = async () => {
    try {
      const fetchedCategories = await categoryService.getCategories();
      setCategories(fetchedCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
      // Fallback to empty array if categories fail to load
      setCategories([]);
    }
  };

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
      
      // Use the selected category ID for filtering
      const categoryId = selectedCategory === 'all' ? undefined : selectedCategory || undefined;
      
      const products = await productService.getCustomerProducts(currentPage, 30, categoryId);
      
      // Filter to show only products from the last 2 weeks
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      
      const recentProducts = products.products.filter(product => {
        const productDate = new Date(product.createdAt);
        return productDate >= twoWeeksAgo;
      });
      
      if (isLoadMore) {
        setNewArrivals(prev => [...prev, ...recentProducts]);
        setPage(currentPage);
        setHasMore(products.hasMore && recentProducts.length > 0);
      } else {
        setNewArrivals(recentProducts);
        setPage(1);
        setHasMore(products.hasMore && recentProducts.length > 0);
      }
    } catch (error) {
      console.error('Error loading new arrivals:', error);
      setError('Failed to load new arrivals');
      if (!isLoadMore) {
        Alert.alert('Error', 'Failed to load new arrivals. Please try again.');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadNewArrivals(true);
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

  const handleCategoryPress = (categoryId: string) => {
    setSelectedCategory(categoryId === 'all' ? null : categoryId);
    setPage(1);
    setHasMore(true);
    setNewArrivals([]);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadNewArrivals();
  }, [selectedCategory]);

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

  const getDaysAgo = (dateString: string) => {
    const productDate = new Date(dateString);
    const now = new Date();
    
    // Reset time to start of day for accurate day calculation
    const productDay = new Date(productDate.getFullYear(), productDate.getMonth(), productDate.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const diffTime = today.getTime() - productDay.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 14) return `${Math.ceil(diffDays / 7)} week ago`;
    return `${Math.ceil(diffDays / 7)} weeks ago`;
  };

  const getCategoryIcon = (categoryName: string) => {
    const categoryMap: { [key: string]: string } = {
      'Electronics': 'phone-portrait-outline',
      'Fashion': 'shirt-outline',
      'Home & Garden': 'home-outline',
      'Beauty': 'sparkles-outline',
      'Sports': 'fitness-outline',
      'Books': 'library-outline',
      'Toys': 'game-controller-outline',
      'Automotive': 'car-outline',
      'Health': 'medical-outline',
      'Food': 'restaurant-outline',
    };
    
    return categoryMap[categoryName] || 'grid-outline';
  };

  if (loading && newArrivals.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Loading new arrivals...</Text>
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
            <Text style={styles.headerTitle}>✨ NEW ARRIVALS</Text>
            <Text style={styles.headerSubtitle}>Latest Products (2 Weeks)</Text>
          </View>
          <TouchableOpacity
            onPress={() => loadNewArrivals()}
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
              onRefresh={() => loadNewArrivals()}
            />
          }
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.heroContent}>
              <View style={styles.heroIconContainer}>
                <Ionicons name="sparkles" size={32} color="#FFFFFF" />
              </View>
              <Text style={styles.heroTitle}>Fresh & New</Text>
              <Text style={styles.heroSubtitle}>
                Discover the latest products added in the last 2 weeks
              </Text>
            </View>
            <View style={styles.heroStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{newArrivals.length}</Text>
                <Text style={styles.statLabel}>New Items</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>✨</Text>
                <Text style={styles.statLabel}>Fresh</Text>
              </View>
            </View>
          </View>

          {/* Category Filter */}
          <View style={styles.categoryFilter}>
            <Text style={styles.categoryFilterTitle}>Filter by Category</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScrollContent}
            >
              {/* All Categories Option */}
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  !selectedCategory && styles.categoryChipActive
                ]}
                onPress={() => handleCategoryPress('all')}
              >
                <Ionicons 
                  name="grid-outline" 
                  size={16} 
                  color={!selectedCategory ? "#FFFFFF" : "#6B7280"} 
                />
                <Text style={[
                  styles.categoryChipText,
                  !selectedCategory && styles.categoryChipTextActive
                ]}>
                  All Categories
                </Text>
              </TouchableOpacity>
              
              {/* Dynamic Categories from Database */}
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryChip,
                    selectedCategory === category.id && styles.categoryChipActive
                  ]}
                  onPress={() => handleCategoryPress(category.id)}
                >
                  <Ionicons 
                    name={getCategoryIcon(category.name) as any} 
                    size={16} 
                    color={selectedCategory === category.id ? "#FFFFFF" : "#6B7280"} 
                  />
                  <Text style={[
                    styles.categoryChipText,
                    selectedCategory === category.id && styles.categoryChipTextActive
                  ]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => loadNewArrivals()} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : newArrivals.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="sparkles-outline" size={64} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No New Arrivals</Text>
              <Text style={styles.emptyText}>
                {selectedCategory && selectedCategory !== 'all' 
                  ? `No new products in ${categories.find(c => c.id === selectedCategory)?.name || 'this'} category.`
                  : 'No new products added in the last 2 weeks.'
                }
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.productsGrid}>
                {newArrivals.map((product, index) => (
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
                        <View style={styles.timeBadge}>
                          <Text style={styles.timeText}>
                            {getDaysAgo(product.createdAt)}
                          </Text>
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
              {!hasMore && newArrivals.length > 0 && (
                <View style={styles.endOfListContainer}>
                  <Text style={styles.endOfListText}>No more new arrivals to load</Text>
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
    backgroundColor: '#8B5CF6',
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
  categoryFilter: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  categoryFilterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  categoryScrollContent: {
    paddingRight: 16,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryChipActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 6,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
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
  timeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  timeText: {
    fontSize: 10,
    fontWeight: '600',
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
    color: '#8B5CF6',
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
