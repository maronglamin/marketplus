import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { AppStackParamList } from '../navigation/AppNavigator';
import { productService, type Product } from '../services/productService';
import { format, differenceInHours, differenceInDays, differenceInWeeks, differenceInMonths } from 'date-fns';
import Constants from 'expo-constants';
import { getImageUrl } from '../config/env';

// Get the API base URL
const LOCAL_IP = Constants.expoConfig?.extra?.localIp || '192.168.40.48';

type ProductListingNavigationProp = NativeStackNavigationProp<AppStackParamList, 'ProductListing'>;

type GroupedProducts = {
  [key: string]: Product[];
};

export function ProductListing() {
  const navigation = useNavigation<ProductListingNavigationProp>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const fabWidth = useRef(new Animated.Value(140)).current;

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
      
      const hoursDiff = differenceInHours(now, createdAt);
      const daysDiff = differenceInDays(now, createdAt);
      const weeksDiff = differenceInWeeks(now, createdAt);
      const monthsDiff = differenceInMonths(now, createdAt);

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

  const loadProducts = useCallback(async (pageNum: number, shouldRefresh = false) => {
    try {
      if (shouldRefresh) {
        setRefreshing(true);
      } else if (pageNum > 1) {
        setLoadingMore(true);
      }

      console.log('Fetching products:', { pageNum, shouldRefresh });
      // Use the backend's default limit of 10 products per page
      const response = await productService.getSellerProducts(pageNum, 10);
      console.log('Products response:', response);
      
      // Validate response data
      if (!response.products || !Array.isArray(response.products)) {
        throw new Error('Invalid products data received');
      }
      
      if (shouldRefresh) {
        setProducts(response.products);
        setPage(1);
      } else {
        // Ensure we don't add duplicate products
        setProducts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newProducts = response.products.filter(p => !existingIds.has(p.id));
          return [...prev, ...newProducts];
        });
        setPage(pageNum);
      }
      
      setHasMore(response.hasMore);
      console.log('Updated products state:', { 
        totalProducts: shouldRefresh ? response.products.length : 'appended', 
        hasMore: response.hasMore,
        currentPage: pageNum 
      });
    } catch (error: any) {
      console.error('Error loading products:', error);
      if (error.response) {
        console.error('Error response:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      Alert.alert('Error', 'Failed to load products. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadProducts(1, true);
  }, [loadProducts]);

  const handleRefresh = useCallback(() => {
    loadProducts(1, true);
  }, [loadProducts]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      console.log('Loading more products, current page:', page);
      loadProducts(page + 1);
    }
  }, [loadingMore, hasMore, loading, page, loadProducts]);

  const handleStatusChange = async (productId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await productService.updateProductStatus(productId, newStatus);
      
      setProducts(prev => prev.map(product => 
        product.id === productId 
          ? { ...product, status: newStatus }
          : product
      ));
    } catch (error) {
      console.error('Error updating product status:', error);
      Alert.alert('Error', 'Failed to update product status. Please try again.');
    }
  };

  const handleDelete = async (productId: string) => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await productService.deleteProduct(productId);
              setProducts(prev => prev.filter(product => product.id !== productId));
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert('Error', 'Failed to delete product. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleAddProduct = () => {
    navigation.navigate('AddProduct' as any);
  };

  const renderSectionHeader = (title: string, count: number) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionCount}>{count} {count === 1 ? 'item' : 'items'}</Text>
    </View>
  );

  const renderProductCard = (product: Product) => {
    // Validate product data
    if (!product || !product.id || !product.title) {
      console.warn('Invalid product data:', product);
      return null;
    }

    const primaryImage = product.images.find(img => img.isPrimary) || product.images[0];
    const formattedPrice = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: product.currencyCode,
    }).format(product.price);

    // Get quantity status and color
    const getQuantityStatus = (qty: number) => {
      if (qty <= 0) return { text: 'Out of Stock', color: '#DC2626' }; // Red
      if (qty <= 5) return { text: 'Low Stock', color: '#F59E0B' }; // Amber
      if (qty <= 10) return { text: 'Medium Stock', color: '#3B82F6' }; // Blue
      return { text: 'In Stock', color: '#059669' }; // Green
    };

    const quantityStatus = getQuantityStatus(product.quantity);

    // Construct the full image URL
    const imageUrl = primaryImage?.imageUrl 
      ? getImageUrl(primaryImage.imageUrl)
      : undefined;

    const handleProductPress = () => {
      console.log('Navigating to product detail:', product.id, product.title);
      try {
        navigation.navigate('SellerProductDetail', { productId: product.id });
      } catch (error) {
        console.error('Navigation error:', error);
        Alert.alert('Error', 'Unable to open product details. Please try again.');
      }
    };

    return (
      <TouchableOpacity
        key={product.id}
        style={styles.productCard}
        onPress={handleProductPress}
        activeOpacity={0.7}
      >
        <View style={styles.productImageContainer}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.productImage, styles.placeholderImage]}>
              <Ionicons name="image-outline" size={32} color="#9CA3AF" />
            </View>
          )}
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productTitle} numberOfLines={2}>
            {product.title}
          </Text>
          <Text style={styles.productPrice}>{formattedPrice}</Text>
          <View style={styles.productMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="eye-outline" size={16} color="#6B7280" />
              <Text style={styles.metaText}>{product.views}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="cart-outline" size={16} color="#6B7280" />
              <Text style={styles.metaText}>{product.orderCount || 0}</Text>
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
              <View style={[styles.quantityIndicator, { backgroundColor: `${quantityStatus.color}15` }]}>
                <Ionicons name="cube-outline" size={14} color={quantityStatus.color} />
                <Text style={[styles.quantityText, { color: quantityStatus.color }]}>
                  {product.quantity} {quantityStatus.text}
                </Text>
              </View>
              <View style={[styles.statusButton, product.status === 'ACTIVE' ? styles.activeButton : styles.inactiveButton]}>
                <Text style={[styles.statusButtonText, product.status === 'ACTIVE' ? styles.activeText : styles.inactiveText]}>
                  {product.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading your products...</Text>
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
            onPress={() => navigation.navigate('SellerDashboard')}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Product Listing</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#2563EB']}
            />
          }
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            const paddingToBottom = 100; // Increased padding for better detection
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

            // Trigger load more when close to bottom
            if (isCloseToBottom && hasMore && !loadingMore && !loading) {
              console.log('Close to bottom, triggering load more');
              handleLoadMore();
            }
          }}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.scrollContent}
        >
          {products.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={64} color="#9CA3AF" />
              <Text style={styles.emptyText}>No products found</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddProduct}
              >
                <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.addButtonText}>Add New Product</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {Object.entries(groupedProducts).map(([title, products]) => (
                <View key={title} style={styles.section}>
                  {renderSectionHeader(title, products.length)}
                  {products
                    .filter(product => product && product.id && product.title) // Filter out invalid products
                    .map(renderProductCard)
                    .filter(Boolean) // Remove null renders
                  }
                </View>
              ))}
              
              {/* Loading more indicator */}
              {loadingMore && (
                <View style={styles.loadingMore}>
                  <ActivityIndicator size="small" color="#2563EB" />
                  <Text style={styles.loadingMoreText}>Loading more products...</Text>
                </View>
              )}
              
              {/* End of list indicator */}
              {!hasMore && products.length > 0 && (
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
            onPress={handleAddProduct}
            activeOpacity={0.8}
          >
            {isScrolled ? (
              <Ionicons name="add" size={28} color="#FFFFFF" />
            ) : (
              <View style={styles.fabContent}>
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={styles.fabText}>Add Product</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
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
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
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
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  quantityText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  activeButton: {
    backgroundColor: '#D1FAE5',
  },
  inactiveButton: {
    backgroundColor: '#FEE2E2',
  },
  statusButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeText: {
    color: '#059669',
  },
  inactiveText: {
    color: '#DC2626',
  },
  deleteButton: {
    padding: 6,
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
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  sectionCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  scrollContent: {
    paddingBottom: 100, // Added padding for better detection
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
}); 