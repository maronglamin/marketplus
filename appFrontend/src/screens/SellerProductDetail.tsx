import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
  Dimensions,
} from 'react-native';
import type { ScrollView as ScrollViewType } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { AppStackParamList } from '../navigation/AppNavigator';
import { productService, type Product } from '../services/productService';
import { deliveryOptionsService, type DeliveryOption } from '../services/deliveryOptionsService';
import { orderService } from '../services/orderService';
import { getImageUrl } from '../config/env';
import Constants from 'expo-constants';

// Get the API base URL
const LOCAL_IP = Constants.expoConfig?.extra?.localIp || '192.168.137.200';

type SellerProductDetailNavigationProp = NativeStackNavigationProp<AppStackParamList, 'SellerProductDetail'>;
type SellerProductDetailRouteProp = RouteProp<AppStackParamList, 'SellerProductDetail'>;

export function SellerProductDetail() {
  const navigation = useNavigation<SellerProductDetailNavigationProp>();
  const route = useRoute<SellerProductDetailRouteProp>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [loadingDeliveryOptions, setLoadingDeliveryOptions] = useState(false);
  const [orderCount, setOrderCount] = useState<number>(0);
  const [loadingOrderCount, setLoadingOrderCount] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const scrollViewRef = useRef<ScrollViewType>(null);
  const autoSlideTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadProduct();
  }, [route.params.productId]);

  useEffect(() => {
    if (product) {
      loadDeliveryOptions();
      loadOrderCount();
    }
  }, [product]);

  // Auto slide effect
  useEffect(() => {
    if (product?.images.length && product.images.length > 1) {
      autoSlideTimer.current = setInterval(() => {
        const nextIndex = (currentImageIndex + 1) % product.images.length;
        setCurrentImageIndex(nextIndex);
        scrollViewRef.current?.scrollTo({
          x: nextIndex * Dimensions.get('window').width,
          animated: true,
        });
      }, 3000); // Change slide every 3 seconds
    }

    return () => {
      if (autoSlideTimer.current) {
        clearInterval(autoSlideTimer.current);
      }
    };
  }, [currentImageIndex, product?.images.length]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      console.log('Loading product details for ID:', route.params.productId);
      const productData = await productService.getSellerProductById(route.params.productId);
      console.log('Product data loaded:', productData);
      setProduct(productData);
    } catch (error: any) {
      console.error('Error loading product:', error);
      if (error.response?.status === 404) {
        Alert.alert('Error', 'Product not found or access denied.');
      } else {
        Alert.alert('Error', 'Failed to load product details. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadDeliveryOptions = async () => {
    try {
      setLoadingDeliveryOptions(true);
      const options = await deliveryOptionsService.getDeliveryOptions(route.params.productId);
      setDeliveryOptions(options);
    } catch (error) {
      console.error('Error loading delivery options:', error);
      Alert.alert('Error', 'Failed to load delivery options');
    } finally {
      setLoadingDeliveryOptions(false);
    }
  };

  const loadOrderCount = async () => {
    if (!product) return;
    
    try {
      setLoadingOrderCount(true);
      const response = await orderService.getProductOrderCount(product.id);
      setOrderCount(response.orderCount);
    } catch (error) {
      console.error('Error loading order count:', error);
      // Don't show alert for order count errors, just log them
    } finally {
      setLoadingOrderCount(false);
    }
  };

  const handleStatusChange = async () => {
    if (!product) return;

    try {
      const newStatus = product.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await productService.updateProductStatus(product.id, newStatus);
      setProduct(prev => prev ? { ...prev, status: newStatus } : null);
    } catch (error) {
      console.error('Error updating product status:', error);
      Alert.alert('Error', 'Failed to update product status');
    }
  };

  const handleDelete = () => {
    if (!product) return;

    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await productService.deleteProduct(product.id);
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert('Error', 'Failed to delete product');
            }
          },
        },
      ]
    );
  };

  useFocusEffect(
    React.useCallback(() => {
      loadDeliveryOptions();
      if (product) {
        loadOrderCount();
      }
    }, [route.params.productId])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading product details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
          <Text style={styles.errorText}>Product not found</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadProduct}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const primaryImage = product.images.find(img => img.isPrimary) || product.images[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent
      />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Product Details</Text>
          <TouchableOpacity
            onPress={loadDeliveryOptions}
            style={styles.refreshButton}
          >
            <Ionicons name="refresh-outline" size={24} color="#2563EB" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Image Gallery */}
          <View style={styles.imageContainer}>
            <ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={({ nativeEvent }) => {
                const slide = Math.ceil(
                  nativeEvent.contentOffset.x / nativeEvent.layoutMeasurement.width
                );
                if (slide !== currentImageIndex) {
                  setCurrentImageIndex(slide);
                }
              }}
              scrollEventThrottle={16}
              onTouchStart={() => {
                if (autoSlideTimer.current) {
                  clearInterval(autoSlideTimer.current);
                }
              }}
              onTouchEnd={() => {
                if (product?.images.length && product.images.length > 1) {
                  autoSlideTimer.current = setInterval(() => {
                    const nextIndex = (currentImageIndex + 1) % product.images.length;
                    setCurrentImageIndex(nextIndex);
                    scrollViewRef.current?.scrollTo({
                      x: nextIndex * Dimensions.get('window').width,
                      animated: true,
                    });
                  }, 3000);
                }
              }}
            >
              {product.images.length > 0 ? (
                product.images.map((image, index) => (
                  <Image
                    key={image.id}
                    source={{ uri: getImageUrl(image.imageUrl) }}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                ))
              ) : (
                <View style={[styles.productImage, styles.placeholderImage]}>
                  <Ionicons name="image-outline" size={48} color="#9CA3AF" />
                </View>
              )}
            </ScrollView>
            {product.images.length > 1 && (
              <View style={styles.imageDots}>
                {product.images.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.imageDot,
                      index === currentImageIndex && styles.activeImageDot,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Product Stats */}
          <View style={styles.statusContainer}>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Ionicons name="eye-outline" size={20} color="#6B7280" />
                <Text style={styles.statValue}>{product.views}</Text>
                <Text style={styles.statLabel}>Views</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="cart-outline" size={20} color="#6B7280" />
                {loadingOrderCount ? (
                  <ActivityIndicator size="small" color="#6B7280" />
                ) : (
                  <Text style={styles.statValue}>{orderCount}</Text>
                )}
                <Text style={styles.statLabel}>Orders</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="star-outline" size={20} color="#6B7280" />
                <Text style={styles.statValue}>
                  {product.rating ? product.rating.toFixed(1) : 'N/A'}
                </Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
            </View>
          </View>

          {/* Product Information */}
          <View style={styles.infoContainer}>
            <Text style={styles.productTitle}>{product.title}</Text>
            <Text style={styles.productPrice}>
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: product.currencyCode,
              }).format(product.price)}
            </Text>

            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Category</Text>
                <Text style={styles.detailValue}>{product.category?.name || 'Uncategorized'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Condition</Text>
                <Text style={styles.detailValue}>{product.condition}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Quantity</Text>
                <Text style={styles.detailValue}>{product.quantity}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Posted at</Text>
                <Text style={styles.detailValue}>
                  {new Date(product.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>

            <View style={styles.descriptionContainer}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{product.description}</Text>
            </View>

            {/* Delivery Options */}
            <View style={styles.deliveryOptionsContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Delivery Options</Text>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => navigation.navigate('DeliveryOptions', { productId: product.id })}
                >
                  <Ionicons name="create-outline" size={20} color="#2563EB" />
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>
              
              {loadingDeliveryOptions ? (
                <View style={styles.deliveryOptionsLoading}>
                  <ActivityIndicator size="small" color="#2563EB" />
                  <Text style={styles.deliveryOptionsLoadingText}>Loading delivery options...</Text>
                </View>
              ) : deliveryOptions.length > 0 ? (
                <View style={styles.deliveryOptionsList}>
                  {deliveryOptions.map((option, index) => (
                    <View key={index} style={styles.deliveryOptionItem}>
                      <View style={styles.deliveryOptionHeader}>
                        <View style={styles.deliveryOptionInfo}>
                          <Text style={styles.deliveryOptionName}>{option.name}</Text>
                          <View style={styles.deliveryOptionMeta}>
                            <Text style={styles.deliveryOptionType}>
                              {deliveryOptionsService.getDeliveryTypeLabels()[option.deliveryType]}
                            </Text>
                            {option.isDefault && (
                              <View style={styles.defaultBadge}>
                                <Ionicons name="checkmark-circle" size={14} color="#059669" />
                                <Text style={styles.defaultBadgeText}>Default</Text>
                              </View>
                            )}
                          </View>
                        </View>
                        <View style={styles.deliveryOptionPrice}>
                          <Text style={styles.deliveryOptionPriceText}>
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: option.currencyCode,
                            }).format(option.price)}
                          </Text>
                          <Text style={styles.deliveryOptionDays}>
                            {option.estimatedDays} day{option.estimatedDays !== 1 ? 's' : ''}
                          </Text>
                        </View>
                      </View>
                      {option.description && (
                        <Text style={styles.deliveryOptionDescription}>{option.description}</Text>
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.noDeliveryOptions}>
                  <Ionicons name="car-outline" size={32} color="#9CA3AF" />
                  <Text style={styles.noDeliveryOptionsText}>No delivery options configured</Text>
                  <TouchableOpacity
                    style={styles.addDeliveryOptionsButton}
                    onPress={() => navigation.navigate('DeliveryOptions', { productId: product.id })}
                  >
                    <Text style={styles.addDeliveryOptionsButtonText}>Add Delivery Options</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.footerButton}
            onPress={() => navigation.navigate('UpdateStock', { productId: product.id })}
          >
            <Ionicons name="add-circle-outline" size={20} color="#2563EB" />
            <Text style={styles.footerButtonText}>Update Stock</Text>
          </TouchableOpacity>
        </View>
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
  },
  refreshButton: {
    padding: 12,
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: '#DC2626',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  imageContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#F3F4F6',
  },
  productImage: {
    width: Dimensions.get('window').width,
    height: 300,
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageDots: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  imageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  activeImageDot: {
    backgroundColor: '#2563EB',
  },
  statusContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  infoContainer: {
    padding: 16,
  },
  productTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 24,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
    gap: 16,
  },
  detailItem: {
    flex: 1,
    minWidth: '45%',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  descriptionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  footerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
  },
  deliveryOptionsContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    gap: 4,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  deliveryOptionsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  deliveryOptionsLoadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  deliveryOptionsList: {
    gap: 12,
  },
  deliveryOptionItem: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    position: 'relative',
  },
  deliveryOptionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  deliveryOptionInfo: {
    flex: 1,
  },
  deliveryOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  deliveryOptionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deliveryOptionType: {
    fontSize: 14,
    color: '#6B7280',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  deliveryOptionPrice: {
    alignItems: 'flex-end',
  },
  deliveryOptionPriceText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 2,
  },
  deliveryOptionDays: {
    fontSize: 12,
    color: '#6B7280',
  },
  deliveryOptionDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginTop: 8,
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
  },
  defaultBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  noDeliveryOptions: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  noDeliveryOptionsText: {
    marginTop: 12,
    marginBottom: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  addDeliveryOptionsButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  addDeliveryOptionsButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
}); 