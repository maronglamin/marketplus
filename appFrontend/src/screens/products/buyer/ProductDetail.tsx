import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
} from 'react-native';
import type { ScrollView as ScrollViewType } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../../components/Header';
import { Button } from '../../../components/Button';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { productService, type ProductDetail } from '../../../services/productService';
import { getImageUrl } from '../../../config/env';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../services/api';
import { TokenNotificationCard } from '../../../components/TokenNotificationCard';

type RootStackParamList = {
  Home: undefined;
  ProductDetail: { productId: string };
  ShowInterest: { productId: string };
  Order: { productId: string };
};

type ProductDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ProductDetail'>;
type ProductDetailScreenRouteProp = RouteProp<RootStackParamList, 'ProductDetail'>;

export function ProductDetail() {
  const navigation = useNavigation<ProductDetailScreenNavigationProp>();
  const route = useRoute<ProductDetailScreenRouteProp>();
  const { productId } = route.params;
  
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryOptions, setDeliveryOptions] = useState<any[]>([]);
  const [loadingDeliveryOptions, setLoadingDeliveryOptions] = useState(false);
  
  // Slideshow refs
  const scrollViewRef = useRef<ScrollViewType>(null);
  const autoSlideTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Mock delivery options
  const mockDeliveryOptions = [
    {
      id: '1',
      name: 'Standard Delivery',
      description: '3-5 business days',
      price: 5.99,
      currencyCode: 'USD',
      estimatedDays: '3-5 days'
    },
    {
      id: '2',
      name: 'Express Delivery',
      description: '1-2 business days',
      price: 12.99,
      currencyCode: 'USD',
      estimatedDays: '1-2 days'
    },
    {
      id: '3',
      name: 'Same Day Delivery',
      description: 'Within 24 hours',
      price: 19.99,
      currencyCode: 'USD',
      estimatedDays: 'Same day'
    },
    {
      id: '4',
      name: 'Seller Recommended',
      description: 'Best option for this product',
      price: 8.99,
      currencyCode: 'USD',
      estimatedDays: '2-3 days',
      recommended: true
    }
  ];

  const { user, token } = useAuth();

  useEffect(() => {
    loadProductDetails();
    
    return () => {
      // Cleanup slideshow timers
      if (autoSlideTimer.current) {
        clearInterval(autoSlideTimer.current);
      }
    };
  }, [productId]);

  useEffect(() => {
    if (product) {
      loadDeliveryOptions();
    }
  }, [product]);

  useEffect(() => {
    if (product && product.images.length > 1) {
      autoSlideTimer.current = setInterval(() => {
        const nextIndex = (currentImageIndex + 1) % product.images.length;
        setCurrentImageIndex(nextIndex);
        scrollViewRef.current?.scrollTo({
          x: nextIndex * Dimensions.get('window').width,
          animated: true,
        });
      }, 3000); // Change image every 3 seconds
    }
    
    return () => {
      stopSlideshow();
    };
  }, [currentImageIndex, product?.images.length]);

  useEffect(() => {
    if (product && product.id && token) {
      console.log('Tracking product view for:', product.id);
      // Track product view
      api.post(`/api/products/${product.id}/view`, {})
        .then(() => {
          console.log('Product view tracked successfully');
        })
        .catch((err) => {
          console.error('Failed to track product view:', err);
        });
    }
  }, [product, token]);

  const loadProductDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const productDetail = await productService.getProductById(productId);
      console.log('Product detail loaded:', {
        id: productDetail.id,
        name: productDetail.name,
        images: productDetail.images,
        imageCount: productDetail.images.length
      });
      setProduct(productDetail);
    } catch (error) {
      console.error('Error loading product details:', error);
      setError('Failed to load product details');
      Alert.alert('Error', 'Failed to load product details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadDeliveryOptions = async () => {
    try {
      setLoadingDeliveryOptions(true);
      const options = await productService.getDeliveryOptions(productId);
      setDeliveryOptions(options);
    } catch (error) {
      console.error('Error loading delivery options:', error);
      setError('Failed to load delivery options');
      Alert.alert('Error', 'Failed to load delivery options. Please try again.');
    } finally {
      setLoadingDeliveryOptions(false);
    }
  };

  const stopSlideshow = () => {
    if (autoSlideTimer.current) {
      clearInterval(autoSlideTimer.current);
      autoSlideTimer.current = null;
    }
  };

  const handleImagePress = (index: number) => {
    setCurrentImageIndex(index);
    // Restart slideshow after manual selection
    stopSlideshow();
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

  const getStockStatus = (stock: number) => {
    if (stock > 10) return { text: 'In Stock', color: '#059669' };
    if (stock > 0) return { text: `Only ${stock} left`, color: '#D97706' };
    return { text: 'Out of Stock', color: '#DC2626' };
  };

  const incrementQuantity = () => {
    if (product && quantity < product.stock) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header
          title="Product Details"
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading product details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !product) {
    return (
      <SafeAreaView style={styles.container}>
        <Header
          title="Product Details"
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Product not found'}</Text>
          <TouchableOpacity onPress={loadProductDetails} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Product Details"
        showBack
        onBack={() => navigation.goBack()}
      />
      
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
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
              product.images.map((imageUrl, index) => (
                <Image
                  key={index}
                  source={{ 
                    uri: getImageUrl(imageUrl)
                  }}
                  style={styles.productImage}
                  resizeMode="cover"
                  onError={(error) => {
                    console.error('Image loading error:', error.nativeEvent.error);
                    console.error('Failed image URL:', imageUrl);
                  }}
                  onLoad={() => {
                    console.log('Image loaded successfully:', getImageUrl(imageUrl));
                  }}
                  defaultSource={{ uri: 'https://via.placeholder.com/400x300?text=Loading...' }}
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

        <View style={styles.details}>
          <View style={styles.ratingContainer}>
            <View style={styles.rating}>
              {product.rating ? (
                <>
                  <Ionicons name="star" size={16} color="#F59E0B" />
                  <Text style={styles.ratingText}>{product.rating.toFixed(1)}</Text>
                  <Text style={styles.reviewCount}>
                    ({product.ratingCount} reviews)
                  </Text>
                </>
              ) : (
                <Text style={styles.noRatingText}>No ratings yet</Text>
              )}
            </View>
            <TouchableOpacity style={styles.heartButton}>
              <Ionicons name="heart-outline" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.price}>{formatPrice(product.price, product.currencyCode)}</Text>

          <View style={styles.stockStatus}>
            <Text style={[styles.stockText, { color: getStockStatus(product.stock).color }]}>
              {getStockStatus(product.stock).text}
            </Text>
          </View>

          <View style={styles.sellerContainer}>
            <View style={styles.sellerImageContainer}>
              <Text style={styles.sellerInitial}>
                {product.seller.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>{product.seller.name}</Text>
              <View style={styles.sellerRating}>
                {product.seller.rating ? (
                  <>
                    <Ionicons name="star" size={12} color="#F59E0B" />
                    <Text style={styles.sellerRatingText}>
                      {product.seller.rating.toFixed(1)}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.sellerRatingText}>No rating</Text>
                )}
                <Text style={styles.sellerProducts}>
                  {product.seller.products} products
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.viewSellerButton}>
              <Text style={styles.viewSellerText}>View</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{product.description}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Product Information</Text>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Condition:</Text>
              <Text style={styles.infoValue}>{product.condition}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Category:</Text>
              <Text style={styles.infoValue}>{product.category}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Views:</Text>
              <Text style={styles.infoValue}>{product.views}</Text>
            </View>
          </View>

          <View style={styles.deliveryContainer}>
            <View style={styles.deliveryItem}>
              <Ionicons name="car" size={20} color="#2563EB" />
              <Text style={styles.deliveryText}>
                Delivery options at checkout
              </Text>
            </View>
            <View style={styles.deliveryItem}>
              <Ionicons name="shield-checkmark" size={20} color="#2563EB" />
              <Text style={styles.deliveryText}>Secure Payment</Text>
            </View>
          </View>

          <View style={styles.quantityContainer}>
            <View style={styles.quantitySelector}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={decrementQuantity}
                disabled={quantity <= 1}
              >
                <Text style={styles.quantityButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.quantity}>{quantity}</Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={incrementQuantity}
                disabled={quantity >= product.stock}
              >
                <Text style={styles.quantityButtonText}>+</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total Price</Text>
              <Text style={styles.totalPrice}>
                {formatPrice(product.price * quantity, product.currencyCode)}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Delivery Modal */}
      <Modal
        visible={showDeliveryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDeliveryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Delivery Option</Text>
              <TouchableOpacity 
                onPress={() => setShowDeliveryModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            {loadingDeliveryOptions ? (
              <View style={styles.deliveryLoadingContainer}>
                <ActivityIndicator size="large" color="#2563EB" />
                <Text style={styles.deliveryLoadingText}>Loading delivery options...</Text>
              </View>
            ) : deliveryOptions.length > 0 ? (
              <ScrollView style={styles.deliveryOptionsList}>
                {deliveryOptions.map((option) => (
                  <View
                    key={option.id}
                    style={[
                      styles.deliveryOption,
                      option.isDefault && styles.recommendedOption
                    ]}
                  >
                    <View style={styles.deliveryOptionHeader}>
                      <View style={styles.deliveryOptionInfo}>
                        <Text style={styles.deliveryOptionName}>
                          {option.name}
                          {option.isDefault && (
                            <Text style={styles.recommendedBadge}> • Default</Text>
                          )}
                        </Text>
                        <Text style={styles.deliveryOptionDescription}>
                          {option.description} • {option.estimatedDays} days
                          {option.currencyCode !== product.currencyCode && (
                            <Text style={styles.currencyNote}> • {option.currencyCode}</Text>
                          )}
                        </Text>
                      </View>
                      <Text style={styles.deliveryOptionPrice}>
                        {formatPrice(option.price, option.currencyCode)}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.noDeliveryContainer}>
                <View style={styles.noDeliveryIcon}>
                  <Ionicons name="car-outline" size={48} color="#9CA3AF" />
                </View>
                <Text style={styles.noDeliveryTitle}>No Delivery Options Available</Text>
                <Text style={styles.noDeliveryDescription}>
                  This seller hasn't set up delivery options yet. Please contact the seller directly to arrange delivery.
                </Text>
                <TouchableOpacity 
                  style={styles.contactSellerButton}
                  onPress={() => {
                    setShowDeliveryModal(false);
                    navigation.navigate('ShowInterest', { productId: product.id });
                  }}
                >
                  <Ionicons name="chatbubble-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.contactSellerText}>Contact Seller</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <View style={styles.footer}>
        <Button
          label="Show Interest"
          variant="outline"
          icon={<Ionicons name="heart-outline" size={20} color="#2563EB" />}
          fullWidth
          onPress={() => navigation.navigate('ShowInterest', { productId: product.id })}
        />
        <Button
          label="Order"
          icon={<Ionicons name="cart" size={20} color="#FFFFFF" />}
          fullWidth
          onPress={() => navigation.navigate('Order', { productId: product.id })}
        />
      </View>

      {/* Token Notification Card */}
      <TokenNotificationCard />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 0,
  },
  imageContainer: {
    position: 'relative',
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
    alignItems: 'center',
  },
  imageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9CA3AF',
    marginHorizontal: 4,
  },
  activeImageDot: {
    backgroundColor: '#FFFFFF',
  },
  details: {
    padding: 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#374151',
  },
  reviewCount: {
    marginLeft: 4,
    fontSize: 14,
    color: '#6B7280',
  },
  heartButton: {
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 16,
  },
  stockStatus: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  stockText: {
    fontSize: 14,
    color: '#374151',
  },
  sellerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  sellerImageContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerInitial: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sellerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  sellerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  sellerRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  sellerRatingText: {
    fontSize: 12,
    color: '#374151',
    marginLeft: 4,
  },
  sellerProducts: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  viewSellerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  viewSellerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563EB',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    color: '#374151',
  },
  deliveryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  deliveryItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#374151',
  },
  quantityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
  },
  quantityButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quantityButtonText: {
    fontSize: 16,
    color: '#6B7280',
  },
  quantity: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#374151',
  },
  totalContainer: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  footer: {
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    marginBottom: 16,
  },
  retryButton: {
    padding: 12,
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  noRatingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 20,
    width: '80%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 8,
  },
  deliveryOptionsList: {
    maxHeight: '70%',
  },
  deliveryOption: {
    padding: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginBottom: 8,
  },
  deliveryOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deliveryOptionInfo: {
    flex: 1,
  },
  deliveryOptionName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  deliveryOptionDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  deliveryOptionPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563EB',
  },
  recommendedOption: {
    borderColor: '#2563EB',
  },
  recommendedBadge: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2563EB',
    marginLeft: 4,
  },
  deliveryLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deliveryLoadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  noDeliveryContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  noDeliveryIcon: {
    marginBottom: 16,
  },
  noDeliveryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  noDeliveryDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  contactSellerButton: {
    padding: 12,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactSellerText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  currencyNote: {
    fontSize: 12,
    color: '#6B7280',
  },
}); 