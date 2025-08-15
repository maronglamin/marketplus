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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { AppStackParamList } from '../navigation/AppNavigator';
import { productService, type CustomerProduct } from '../services/productService';
import { interestService } from '../services/interestService';
import { useAuth } from '../contexts/AuthContext';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';

// Get the API base URL
const LOCAL_IP = Constants.expoConfig?.extra?.localIp || '192.168.208.48';
const API_URL = process.env.EXPO_PUBLIC_API_URL || `http://${LOCAL_IP}:3000`;

type HomeNavigationProp = NativeStackNavigationProp<AppStackParamList, 'Home'>;

export function Home() {
  const navigation = useNavigation<HomeNavigationProp>();
  const route = useRoute();
  const { user, isLoading: authLoading } = useAuth();
  
  // Bottom sheet refs and state
  const rideBottomSheetRef = useRef<BottomSheetModal>(null);
  const [isRideBottomSheetOpen, setIsRideBottomSheetOpen] = useState(false);
  const [isDriverMode, setIsDriverMode] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // Bottom sheet snap points
  const rideSnapPoints = useMemo(() => ['90%'], []);
  
  console.log('Home component render - auth state:', { 
    hasUser: !!user, 
    userId: user?.id,
    userFirstName: user?.firstName,
    authLoading
  });
  
  const [featuredProducts, setFeaturedProducts] = useState<CustomerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [productInterests, setProductInterests] = useState<{ [productId: string]: { exists: boolean; interestId?: string } }>({});
  const [lastRefreshTime, setLastRefreshTime] = useState(0);

  const categories = [
    { id: '1', name: 'Electronics', icon: '📱' },
    { id: '2', name: 'Fashion', icon: '👕' },
    { id: '3', name: 'Home', icon: '🏠' },
    { id: '4', name: 'Beauty', icon: '💄' },
    { id: '5', name: 'Sports', icon: '⚽' },
    { id: '6', name: 'Groceries', icon: '🛒' },
  ];

  const popularSellers = [
    {
      id: '1',
      name: 'TechGadgets',
      rating: 4.8,
      products: 42,
      image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a',
    },
    {
      id: '2',
      name: 'LeatherCrafts',
      rating: 4.5,
      products: 28,
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2',
    },
    {
      id: '3',
      name: 'EcoFriendly',
      rating: 4.7,
      products: 36,
      image: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857',
    },
  ];

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
  }, []);

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

  // Manual interest checking with user data
  const checkProductInterestsWithUser = async (userData: any) => {
    try {
      console.log('Checking product interests for user:', userData.id);
      console.log('Products to check:', featuredProducts.length);
      
      const interestPromises = featuredProducts.map(async (product) => {
        try {
          console.log(`Checking interest for product ${product.id}...`);
          const result = await interestService.checkInterest(product.id);
          console.log(`Interest result for product ${product.id}:`, result);
          return {
            productId: product.id,
            exists: result.exists,
            interestId: result.interest?.id
          };
        } catch (error) {
          console.error(`Error checking interest for product ${product.id}:`, error);
          return {
            productId: product.id,
            exists: false
          };
        }
      });

      const results = await Promise.all(interestPromises);
      const interestsMap: { [productId: string]: { exists: boolean; interestId?: string } } = {};
      
      results.forEach(result => {
        interestsMap[result.productId] = {
          exists: result.exists,
          interestId: result.interestId
        };
      });

      console.log('Final interests map:', interestsMap);
      setProductInterests(interestsMap);
    } catch (error) {
      console.error('Error checking product interests:', error);
    }
  };

  const loadFeaturedProducts = async (isLoadMore: boolean = false) => {
    // Simple rate limiting - prevent refreshing more than once every 3 seconds
    const now = Date.now();
    if (!isLoadMore && now - lastRefreshTime < 3000) {
      console.log('Skipping refresh - too soon since last refresh');
      return;
    }
    
    try {
      console.log('loadFeaturedProducts called:', { isLoadMore, page });
      
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setPage(1);
        setHasMore(true);
        setLastRefreshTime(now);
      }
      setError(null);
      
      const currentPage = isLoadMore ? page + 1 : 1;
      console.log('Making API call to getFeaturedProducts:', { currentPage, limit: 6 });
      
      const products = await productService.getFeaturedProducts(6, currentPage);
      
      console.log('Featured products response:', { 
        count: products.products.length, 
        hasMore: products.hasMore,
        total: products.total 
      });
      
      if (isLoadMore) {
        setFeaturedProducts(prev => [...prev, ...products.products]);
        setPage(currentPage);
        setHasMore(products.hasMore);
      } else {
        setFeaturedProducts(products.products);
        setPage(1);
        setHasMore(products.hasMore);
      }
    } catch (error) {
      console.error('Error loading featured products:', error);
      setError('Failed to load featured products');
      if (!isLoadMore) {
        Alert.alert('Error', 'Failed to load featured products. Please try again.');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setIsInitialLoad(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadFeaturedProducts(true);
    }
  };

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= 
      contentSize.height - paddingToBottom;
    
    if (isCloseToBottom && !loadingMore && hasMore) {
      handleLoadMore();
    }
  };

  const handleProductPress = (productId: string) => {
    navigation.navigate('ProductDetail', { productId });
  };

  const handleTabPress = (tab: string) => {
    switch (tab) {
      case 'home':
        // Already on home
        break;
      case 'orders':
        navigation.navigate('CustomerOrders');
        break;
      case 'interests':
        navigation.navigate('InterestManagement');
        break;
      case 'account':
        navigation.navigate('SellerDashboard');
        break;
    }
  };

  const isActiveTab = (tab: string) => {
    switch (tab) {
      case 'home':
        return route.name === 'Home';
      case 'orders':
        return route.name === 'CustomerOrders';
      case 'interests':
        return route.name === 'InterestManagement';
      case 'account':
        return route.name === 'SellerDashboard';
      default:
        return false;
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

  // Check interests when products are loaded
  useEffect(() => {
    if (featuredProducts.length > 0) {
      // Try to get user data from AsyncStorage or decode from token
      AsyncStorage.getItem('user').then(userData => {
        if (userData) {
          const user = JSON.parse(userData);
          console.log('Found user data, checking interests for:', user.id);
          checkProductInterestsWithUser(user);
        } else {
          // Try to get user info from token
          AsyncStorage.getItem('token').then(token => {
            if (token) {
              const decodedToken = decodeToken(token);
              if (decodedToken && decodedToken.userId) {
                console.log('Decoded user from token, checking interests for:', decodedToken.userId);
                const user = { id: decodedToken.userId };
                checkProductInterestsWithUser(user);
              }
            }
          });
        }
      });
    }
  }, [featuredProducts]);

  const handleRideCardPress = useCallback(() => {
    console.log('Ride card pressed!');
    console.log('Bottom sheet ref:', rideBottomSheetRef.current);
    rideBottomSheetRef.current?.present();
  }, []);

  const handleRideBottomSheetClose = useCallback(() => {
    rideBottomSheetRef.current?.dismiss();
  }, []);

  const handleRideServicePress = (serviceType: string) => {
    console.log('Selected ride service:', serviceType);
    // Handle different ride services here
    handleRideBottomSheetClose();
    
    if (serviceType === 'getRide') {
      navigation.navigate('RideRequest');
    }
  };

  const handleDriverModeToggle = () => {
    setIsDriverMode(!isDriverMode);
  };

  if (loading && isInitialLoad) {
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
        <View style={styles.mainContent}>
          {/* Fixed Header */}
          <View style={styles.fixedHeader}>
            <View style={styles.headerLogo}>
              {imageError ? (
                <View style={styles.logoFallback}>
                  <Text style={styles.logoText}>SNAP</Text>
                </View>
              ) : (
                <Image
                  source={require('../../assets/icon.png')}
                  style={styles.logo}
                  resizeMode="contain"
                  onError={(error) => {
                    console.error('Failed to load logo:', error.nativeEvent.error);
                    setImageError(true);
                  }}
                />
              )}
              <Text style={styles.logoLabel}>SNAP</Text>
            </View>
            <View style={styles.headerIcons}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Notifications')}
                style={styles.iconButton}
              >
                <Ionicons name="notifications-outline" size={24} color="#111827" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('AccountSettings')}
                style={styles.iconButton}
              >
                <Ionicons name="person-outline" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Riders Card (Uber-style) */}
          <TouchableOpacity style={styles.ridersCard} onPress={handleRideCardPress}>
            <View style={styles.ridersIconContainer}>
              <Ionicons name="car-outline" size={32} color="#2563EB" />
            </View>
            <Text style={styles.ridersLabel}>Riders</Text>
          </TouchableOpacity>

          {/* Scrollable Content */}
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
            {/* <View style={styles.welcomeCard}>
              <Text style={styles.welcomeTitle}>
                Hello, {user?.firstName || 'User'}!
              </Text>
              <Text style={styles.welcomeSubtitle}>
                Find amazing products from sellers.
              </Text>
            </View> */}

            <View style={styles.categoriesContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {categories.map((category) => (
                  <View key={category.id} style={styles.categoryItem}>
                    <View style={styles.categoryIcon}>
                      <Text style={styles.categoryEmoji}>{category.icon}</Text>
                    </View>
                    <Text style={styles.categoryName}>{category.name}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Featured Products</Text>
                <View style={styles.sectionActions}>
                  <TouchableOpacity 
                    onPress={() => loadFeaturedProducts()}
                    style={styles.reloadButton}
                    disabled={loading}
                  >
                    <Ionicons 
                      name="refresh" 
                      size={16} 
                      color={loading ? "#9CA3AF" : "#2563EB"} 
                    />
                  </TouchableOpacity>
                  <TouchableOpacity>
                    <Text style={styles.seeAllButton}>See All</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity onPress={() => loadFeaturedProducts()} style={styles.retryButton}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : featuredProducts.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="bag-outline" size={48} color="#9CA3AF" />
                  <Text style={styles.emptyText}>No featured products available</Text>
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
                      <Text style={styles.endOfListText}>No more products to load</Text>
                    </View>
                  )}
                </>
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Popular Sellers</Text>
                <TouchableOpacity>
                  <Text style={styles.seeAllButton}>See All</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.sellersList}>
                {popularSellers.map((seller) => (
                  <TouchableOpacity key={seller.id} style={styles.sellerCard}>
                    <Image
                      source={{ uri: seller.image }}
                      style={styles.sellerImage}
                    />
                    <View style={styles.sellerInfo}>
                      <Text style={styles.sellerName}>{seller.name}</Text>
                      <View style={styles.sellerStats}>
                        <Ionicons name="star" size={16} color="#F59E0B" />
                        <Text style={styles.sellerRating}>
                          {seller.rating.toFixed(1)}
                        </Text>
                        <Text style={styles.sellerProducts}>
                          {seller.products} products
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Fixed Bottom Navigation */}
          <SafeAreaView edges={['bottom']} style={styles.bottomNavContainer}>
            <View style={styles.bottomNav}>
              <TouchableOpacity
                style={[styles.navItem, isActiveTab('home') && styles.activeNavItem]}
                onPress={() => handleTabPress('home')}
              >
                <Ionicons
                  name={isActiveTab('home') ? 'home' : 'home-outline'}
                  size={24}
                  color={isActiveTab('home') ? '#2563EB' : '#6B7280'}
                />
                <Text
                  style={[
                    styles.navText,
                    isActiveTab('home') && styles.activeNavText,
                  ]}
                >
                  Home
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navItem, isActiveTab('orders') && styles.activeNavItem]}
                onPress={() => handleTabPress('orders')}
              >
                <Ionicons
                  name={isActiveTab('orders') ? 'bag' : 'bag-outline'}
                  size={24}
                  color={isActiveTab('orders') ? '#2563EB' : '#6B7280'}
                />
                <Text
                  style={[
                    styles.navText,
                    isActiveTab('orders') && styles.activeNavText,
                  ]}
                >
                  Orders
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.navItem,
                  isActiveTab('interestmanagement') && styles.activeNavItem,
                ]}
                onPress={() => handleTabPress('interests')}
              >
                <Ionicons
                  name={
                    isActiveTab('interestmanagement')
                      ? 'heart'
                      : 'heart-outline'
                  }
                  size={24}
                  color={isActiveTab('interestmanagement') ? '#2563EB' : '#6B7280'}
                />
                <Text
                  style={[
                    styles.navText,
                    isActiveTab('interestmanagement') && styles.activeNavText,
                  ]}
                >
                  Interests
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.navItem,
                  isActiveTab('accountsettings') && styles.activeNavItem,
                ]}
                onPress={() => handleTabPress('account')}
              >
                <Ionicons
                  name={
                    isActiveTab('accountsettings')
                      ? 'person'
                      : 'person-outline'
                  }
                  size={24}
                  color={isActiveTab('accountsettings') ? '#2563EB' : '#6B7280'}
                />
                <Text
                  style={[
                    styles.navText,
                    isActiveTab('accountsettings') && styles.activeNavText,
                  ]}
                >
                  Seller
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </SafeAreaView>

      {/* Ride Services Bottom Sheet */}
      <BottomSheetModal
        ref={rideBottomSheetRef}
        index={0}
        snapPoints={rideSnapPoints}
        enablePanDownToClose={true}
        onDismiss={() => setIsRideBottomSheetOpen(false)}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.bottomSheetIndicator}
      >
        <BottomSheetView style={styles.rideBottomSheetContent}>
          {/* Header */}
          <View style={styles.rideBottomSheetHeader}>
            <Text style={styles.rideBottomSheetTitle}>Choose Your Ride</Text>
            <TouchableOpacity onPress={handleRideBottomSheetClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Car Icon */}
          <View style={styles.carIconContainer}>
            <View style={styles.carIconBackground}>
              <Ionicons name="car" size={48} color="#2563EB" />
            </View>
          </View>

          {/* Service Options */}
          <View style={styles.serviceOptionsContainer}>
            {!isDriverMode ? (
              <>
                <TouchableOpacity 
                  style={styles.serviceOption}
                  onPress={() => handleRideServicePress('getRide')}
                >
                  <View style={styles.serviceIconContainer}>
                    <Ionicons name="flash" size={24} color="#2563EB" />
                  </View>
                  <View style={styles.serviceContent}>
                    <Text style={styles.serviceTitle}>Get a Ride</Text>
                    <Text style={styles.serviceDescription}>Request a ride now and get picked up in minutes</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.serviceOption}
                  onPress={() => handleRideServicePress('scheduleRide')}
                >
                  <View style={styles.serviceIconContainer}>
                    <Ionicons name="time" size={24} color="#059669" />
                  </View>
                  <View style={styles.serviceContent}>
                    <Text style={styles.serviceTitle}>Schedule a Ride</Text>
                    <Text style={styles.serviceDescription}>Book a ride for a specific time today</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.serviceOption}
                  onPress={() => handleRideServicePress('futureTrip')}
                >
                  <View style={styles.serviceIconContainer}>
                    <Ionicons name="calendar" size={24} color="#DC2626" />
                  </View>
                  <View style={styles.serviceContent}>
                    <Text style={styles.serviceTitle}>Future Trip</Text>
                    <Text style={styles.serviceDescription}>Plan and book rides for upcoming trips</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.driverModeContainer}>
                <View style={styles.driverModeIcon}>
                  <Ionicons name="car-sport" size={48} color="#2563EB" />
                </View>
                <Text style={styles.driverModeTitle}>Driver Mode</Text>
                <Text style={styles.driverModeDescription}>
                  You're now in driver mode. Switch back to rider mode to book rides.
                </Text>
              </View>
            )}
          </View>

          {/* Footer with Driver Mode Toggle */}
          <View style={styles.rideBottomSheetFooter}>
            <View style={styles.modeToggleContainer}>
              <View style={styles.modeToggle}>
                <TouchableOpacity 
                  style={[
                    styles.modeButton, 
                    !isDriverMode && styles.activeModeButton
                  ]}
                  onPress={() => setIsDriverMode(false)}
                >
                  <Ionicons 
                    name="person" 
                    size={16} 
                    color={!isDriverMode ? "#FFFFFF" : "#6B7280"} 
                  />
                  <Text style={[
                    styles.modeButtonText,
                    !isDriverMode && styles.activeModeButtonText
                  ]}>
                    Rider
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.modeButton, 
                    isDriverMode && styles.activeModeButton
                  ]}
                  onPress={() => setIsDriverMode(true)}
                >
                  <Ionicons 
                    name="car-sport" 
                    size={16} 
                    color={isDriverMode ? "#FFFFFF" : "#6B7280"} 
                  />
                  <Text style={[
                    styles.modeButtonText,
                    isDriverMode && styles.activeModeButtonText
                  ]}>
                    Driver
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.footerText}>All rides are subject to availability and pricing</Text>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
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
  mainContent: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  fixedHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  headerLogo: {
    flexDirection: 'column', // Changed to column
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 40,
    height: 40,
    marginBottom: 4, // Added margin bottom
  },
  logoFallback: {
    width: 40,
    height: 40,
    backgroundColor: '#2563EB',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4, // Added margin bottom
  },
  logoText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  logoLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827', // Changed to black
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  welcomeCard: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    padding: 16,
    margin: 16,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#EFF6FF',
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 16,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryEmoji: {
    fontSize: 24,
  },
  categoryName: {
    fontSize: 12,
    color: '#374151',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  seeAllButton: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563EB',
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
  sellersList: {
    paddingHorizontal: 16,
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sellerImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  sellerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  sellerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  sellerRating: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  sellerProducts: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingBottom: 0,
    paddingTop: 0,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
  },
  activeNavItem: {
    // Add any active state styles if needed
  },
  navText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  activeNavText: {
    color: '#2563EB',
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
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reloadButton: {
    padding: 4,
  },
  bottomNavContainer: {
    backgroundColor: '#FFFFFF',
  },
  ridersCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  ridersIconContainer: {
    backgroundColor: '#EFF6FF',
    borderRadius: 24,
    padding: 12,
    marginRight: 16,
  },
  ridersLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2563EB',
  },
  bottomSheetBackground: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  bottomSheetIndicator: {
    backgroundColor: '#E5E7EB',
    width: 40,
    height: 4,
  },
  rideBottomSheetContent: {
    flex: 1,
    padding: 20,
  },
  rideBottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8,
  },
  rideBottomSheetTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  carIconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  carIconBackground: {
    backgroundColor: '#EFF6FF',
    borderRadius: 40,
    padding: 20,
    borderWidth: 2,
    borderColor: '#DBEAFE',
    width: '100%',
    alignItems: 'center',
  },
  serviceOptionsContainer: {
    flex: 1,
  },
  serviceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  serviceIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  serviceContent: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  rideBottomSheetFooter: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 16,
  },
  driverModeContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  driverModeIcon: {
    backgroundColor: '#EFF6FF',
    borderRadius: 40,
    padding: 20,
    borderWidth: 2,
    borderColor: '#DBEAFE',
    marginBottom: 16,
  },
  driverModeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  driverModeDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  modeToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 16,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 20,
    padding: 2,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 18,
  },
  activeModeButton: {
    backgroundColor: '#2563EB',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    color: '#6B7280',
  },
  activeModeButtonText: {
    color: '#FFFFFF',
  },
}); 