import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ImageBackground,
  StatusBar,
  Platform,
  TextInput,
  Alert,
  Modal,
  Keyboard,
  TouchableWithoutFeedback,
  Animated,
  BackHandler,
  RefreshControl,
  ActivityIndicator,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { AppStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../contexts/AuthContext';
import { RiderApplicationService, RiderApplication } from '../services/riderApplicationService';
import { RideRequestService, RecentDestination } from '../services/rideRequestService';
import { api } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTokenNotification } from '../contexts/TokenNotificationContext';
import { getUserLocationFromGPS } from '../utils/locationService';
import { categoryService, type Category } from '../services/categoryService';
import { rentalApi } from '../services/rentalApi';
import { userService } from '../services/userService';

const { height: screenHeight } = Dimensions.get('window');

type HomeNavigationProp = NativeStackNavigationProp<AppStackParamList, 'Home'>;

export function Home() {
  const navigation = useNavigation<HomeNavigationProp>();
  const route = useRoute();
  const { user, logout } = useAuth();
  const { checkActiveTokens } = useTokenNotification();
  

  
  // Fresh user data state (fetched from backend using JWT)
  const [freshUserData, setFreshUserData] = useState<any>(null);
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);
  
  // Rider application state
  const [riderApplication, setRiderApplication] = useState<RiderApplication | null>(null);
  const [isLoadingRiderStatus, setIsLoadingRiderStatus] = useState(true);

  // Recent destinations state
  const [recentDestinations, setRecentDestinations] = useState<RecentDestination[]>([]);
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(true);

  // Categories state
  const [categoriesData, setCategoriesData] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  // Location state
  const [userLocation, setUserLocation] = useState<string>('Detecting location...');
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  // Notifications state
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Pending payment orders count for cart badge
  const [pendingPaymentCount, setPendingPaymentCount] = useState(0);
  const [isLoadingPendingCount, setIsLoadingPendingCount] = useState(false);


  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Load fresh user data from backend using JWT token
  const loadFreshUserData = async () => {
    try {
      setIsLoadingUserData(true);
      console.log('🔄 Loading fresh user data from backend...');
      const userData = await userService.getBasicUserInfo();
      console.log('✅ Fresh user data loaded:', userData);
      setFreshUserData(userData);
    } catch (error) {
      console.error('❌ Error loading fresh user data:', error);
      setFreshUserData(null);
    } finally {
      setIsLoadingUserData(false);
    }
  };

  // Check rider application status on component mount
  useEffect(() => {
    loadFreshUserData();
    checkRiderApplicationStatus();
    loadRecentDestinations();
    loadCategories();
    getUserLocation();
    loadUnreadNotificationsCount();
    loadPendingPaymentCount();
    // Check for active tokens when component mounts
    checkActiveTokens();
  }, []);

  // Re-run data loading when user changes
  useEffect(() => {
    if (user?.id) {
      console.log('🔄 User changed in Home, refreshing data for user:', user.id);
      loadFreshUserData();
      checkRiderApplicationStatus();
      loadRecentDestinations();
      loadPendingPaymentCount();
      loadUnreadNotificationsCount();
    } else {
      console.log('⚠️ No user in Home, clearing user-specific data');
      setFreshUserData(null);
      setRiderApplication(null);
      setRecentDestinations([]);
      setUnreadNotificationsCount(0);
      setPendingPaymentCount(0);
    }
  }, [user?.id]);

  // Load unread notifications count when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadUnreadNotificationsCount();
      loadPendingPaymentCount();
    }, [])
  );

  // Refresh user-specific data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user?.id) {
        console.log('📱 Home screen focused, refreshing user data for:', user.id);
        loadFreshUserData();
        checkRiderApplicationStatus();
        loadRecentDestinations();
        loadPendingPaymentCount();
        loadUnreadNotificationsCount();
      }
    }, [user?.id])
  );

  const loadUnreadNotificationsCount = async () => {
    try {
      setIsLoadingNotifications(true);
      const data = await rentalApi.getAllNotifications();
      const unreadCount = data.totalUnread || 0;
      setUnreadNotificationsCount(unreadCount);
    } catch (error) {
      console.error('Error loading unread notifications count:', error);
      setUnreadNotificationsCount(0);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  const onRefresh = async () => {
    try {
      setIsRefreshing(true);
      await Promise.all([
        loadFreshUserData(),
        checkRiderApplicationStatus(),
        loadRecentDestinations(),
        loadCategories(),
        getUserLocation(),
        loadUnreadNotificationsCount(),
        loadPendingPaymentCount(),
      ]);
    } catch (e) {
      // no-op; errors handled within individual loaders
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle back button press to prevent navigation to login screen
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        // Show confirmation dialog when back button is pressed
        Alert.alert(
          'Exit App',
          'What would you like to do?',
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Logout',
              style: 'default',
              onPress: async () => {
                try {
                  // Properly logout and destroy auth state
                  await logout();
                  // Navigate to login screen after logout
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'Login' as any }],
                  });
                } catch (error) {
                  console.error('Error during logout:', error);
                  // Force close app if logout fails
                  BackHandler.exitApp();
                }
              },
            },
            {
              text: 'Exit App',
              style: 'destructive',
              onPress: () => {
                // Force close the app
                BackHandler.exitApp();
              },
            },
          ],
          { cancelable: false }
        );
        return true; // Prevent default back behavior
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => subscription?.remove();
    }, [logout, navigation])
  );

  const checkRiderApplicationStatus = async () => {
    try {
      setIsLoadingRiderStatus(true);
      const result = await RiderApplicationService.checkExistingApplication();
      
      if (result.success && result.data?.hasExisting && result.data.application) {
        setRiderApplication(result.data.application);
      } else {
        setRiderApplication(null);
      }
    } catch (error) {
      console.error('Error checking rider application status:', error);
      setRiderApplication(null);
    } finally {
      setIsLoadingRiderStatus(false);
    }
  };

  // Load pending-payment orders count for cart badge
  const loadPendingPaymentCount = async () => {
    try {
      setIsLoadingPendingCount(true);
      // Using shared API client to fetch current user's orders
      const response = await api.get('/api/orders/my-orders');
      const orders = response?.data?.orders || [];
      const count = orders.filter((o: any) => {
        const status = (o.status || '').toString().toLowerCase();
        const payment = (o.paymentStatus || '').toString().toLowerCase();
        return status === 'authorized' && payment !== 'paid';
      }).length;
      setPendingPaymentCount(count);
    } catch (e) {
      setPendingPaymentCount(0);
    } finally {
      setIsLoadingPendingCount(false);
    }
  };

  const loadRecentDestinations = async () => {
    try {
      setIsLoadingDestinations(true);
      const destinations = await RideRequestService.getRecentDestinations(3);
      setRecentDestinations(destinations);
    } catch (error) {
      console.error('Error loading recent destinations:', error);
      setRecentDestinations([]);
    } finally {
      setIsLoadingDestinations(false);
    }
  };

  const loadCategories = async () => {
    try {
      setIsLoadingCategories(true);
      const categories = await categoryService.getCategories();
      setCategoriesData(categories);
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategoriesData([]);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  // Function to map category names to icons
  const getCategoryIcon = (categoryName: string): string => {
    const name = categoryName.toLowerCase();
    
    if (name.includes('phone') || name.includes('mobile') || name.includes('smartphone')) {
      return 'phone-portrait-outline';
    }
    if (name.includes('laptop') || name.includes('computer') || name.includes('pc')) {
      return 'laptop-outline';
    }
    if (name.includes('clothing') || name.includes('fashion') || name.includes('shirt') || name.includes('dress')) {
      return 'shirt-outline';
    }
    if (name.includes('home') || name.includes('furniture') || name.includes('house')) {
      return 'home-outline';
    }
    if (name.includes('car') || name.includes('vehicle') || name.includes('automotive')) {
      return 'car-outline';
    }
    if (name.includes('book') || name.includes('education') || name.includes('study')) {
      return 'library-outline';
    }
    if (name.includes('food') || name.includes('restaurant') || name.includes('meal')) {
      return 'restaurant-outline';
    }
    if (name.includes('sport') || name.includes('fitness') || name.includes('gym')) {
      return 'fitness-outline';
    }
    if (name.includes('beauty') || name.includes('cosmetic') || name.includes('makeup')) {
      return 'rose-outline';
    }
    if (name.includes('baby') || name.includes('child') || name.includes('toy')) {
      return 'happy-outline';
    }
    if (name.includes('pet') || name.includes('animal') || name.includes('dog') || name.includes('cat')) {
      return 'paw-outline';
    }
    if (name.includes('garden') || name.includes('plant') || name.includes('flower')) {
      return 'leaf-outline';
    }
    if (name.includes('music') || name.includes('instrument') || name.includes('audio')) {
      return 'musical-notes-outline';
    }
    if (name.includes('art') || name.includes('craft') || name.includes('creative')) {
      return 'color-palette-outline';
    }
    if (name.includes('jewelry') || name.includes('watch') || name.includes('accessory')) {
      return 'diamond-outline';
    }
    if (name.includes('tool') || name.includes('hardware') || name.includes('diy')) {
      return 'construct-outline';
    }
    if (name.includes('game') || name.includes('entertainment') || name.includes('toy')) {
      return 'game-controller-outline';
    }
    if (name.includes('health') || name.includes('medical') || name.includes('pharmacy')) {
      return 'medical-outline';
    }
    if (name.includes('office') || name.includes('business') || name.includes('work')) {
      return 'briefcase-outline';
    }
    
    // Default icon for unknown categories
    return 'cube-outline';
  };

  const getUserLocation = async () => {
    try {
      setIsLoadingLocation(true);
      console.log('📍 Getting user location for Home screen...');
      
      const locationInfo = await getUserLocationFromGPS();
      
      if (locationInfo) {
        setUserLocation(`You're in ${locationInfo.cityName}`);
        console.log('✅ Location set for Home screen:', locationInfo.cityName);
      } else {
        // Try to get location from device timezone as fallback
        try {
          const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          const timezoneParts = timezone.split('/');
          if (timezoneParts.length > 1) {
            const city = timezoneParts[timezoneParts.length - 1].replace('_', ' ');
            setUserLocation(`You're in ${city}`);
            console.log('✅ Location set from timezone for Home screen:', city);
          } else {
            setUserLocation('Location unavailable');
            console.log('⚠️ Could not detect location for Home screen');
          }
        } catch (timezoneError) {
          setUserLocation('Location unavailable');
          console.log('⚠️ Could not detect location for Home screen');
        }
      }
    } catch (error) {
      console.error('❌ Error getting user location for Home screen:', error);
      setUserLocation('Location unavailable');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Get status-specific content
  const getRiderStatusContent = () => {
    if (isLoadingRiderStatus) {
      return {
        title: 'Checking Application Status...',
        subtitle: 'Please wait while we check your rider application',
        icon: 'hourglass-outline',
        iconColor: '#6B7280',
        buttonText: 'Loading...',
        buttonDisabled: true,
        showBenefits: false,
        showRiderTypes: false,
      };
    }

    if (!riderApplication) {
      return {
        title: 'Become a Rider',
        subtitle: 'Join our community of drivers and earn money on your own schedule',
        icon: 'car-sport-outline',
        iconColor: '#1E40AF',
        buttonText: 'Start Earning Today',
        buttonDisabled: false,
        showBenefits: true,
        showRiderTypes: true,
      };
    }

    switch (riderApplication.status) {
      case 'PENDING':
        return {
          title: 'Application Pending',
          subtitle: 'Your rider application is being reviewed. We\'ll notify you soon!',
          icon: 'time-outline',
          iconColor: '#F59E0B',
          buttonText: 'View Application',
          buttonDisabled: false,
          showBenefits: false,
          showRiderTypes: false,
          statusBadge: 'PENDING',
          statusColor: '#F59E0B',
        };
      
      case 'UNDER_REVIEW':
        return {
          title: 'Application Under Review',
          subtitle: 'Our team is carefully reviewing your Account. This usually takes 2-3 business days.',
          icon: 'search-outline',
          iconColor: '#3B82F6',
          buttonText: 'View Application',
          buttonDisabled: false,
          showBenefits: false,
          showRiderTypes: false,
          statusBadge: 'UNDER REVIEW',
          statusColor: '#3B82F6',
        };
      
      case 'APPROVED':
        return {
          title: 'SNAP Driver! 🎉',
          subtitle: 'You can now start earning as a SNAP driver.',
          icon: 'car-sport',
          iconColor: '#10B981',
          buttonText: 'Go to Driver Dashboard',
          buttonDisabled: false,
          showBenefits: false,
          showRiderTypes: false,
          statusBadge: 'APPROVED',
          statusColor: '#10B981',
          showApprovedContent: true,
        };
      
      case 'REJECTED':
        return {
          title: 'Application Not Approved',
          subtitle: riderApplication.rejectionReason || 'Your application was not approved at this time.',
          icon: 'close-circle-outline',
          iconColor: '#EF4444',
          buttonText: 'Reapply with Updates',
          buttonDisabled: false,
          showBenefits: false,
          showRiderTypes: false,
          statusBadge: 'REJECTED',
          statusColor: '#EF4444',
          showRejectedContent: true,
        };
      
      case 'SUSPENDED':
        return {
          title: 'Account Suspended',
          subtitle: 'Your rider account has been suspended. Please contact support for more information.',
          icon: 'warning-outline',
          iconColor: '#EF4444',
          buttonText: 'Contact Support',
          buttonDisabled: false,
          showBenefits: false,
          showRiderTypes: false,
          statusBadge: 'SUSPENDED',
          statusColor: '#EF4444',
          showSuspendedContent: true,
        };
      
      default:
        return {
          title: 'Become a Rider',
          subtitle: 'Join our community of drivers and earn money on your own schedule',
          icon: 'car-sport-outline',
          iconColor: '#1E40AF',
          buttonText: 'Start Earning Today',
          buttonDisabled: false,
          showBenefits: true,
          showRiderTypes: true,
        };
    }
  };

  const handleRiderButtonPress = () => {
    const statusContent = getRiderStatusContent();
    
    if (statusContent.buttonDisabled) return;

    if (riderApplication) {
      switch (riderApplication.status) {
        case 'APPROVED':
          // Navigate to driver dashboard
          navigation.navigate('DriverDashboard');
          break;
        case 'REJECTED':
          // Navigate to reapply screen with existing data
          navigation.navigate('BecomeRider', { 
            type: 'driver',
            existingData: riderApplication
          });
          break;
        case 'SUSPENDED':
          // Show contact support alert
          Alert.alert(
            'Contact Support',
            'Please contact our support team to resolve your account suspension.\n\nEmail: contact@cloudnexus.biz\nPhone: +220 3547128',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Copy Email', onPress: () => console.log('Copy email to clipboard') }
            ]
          );
          break;
        case 'PENDING':
        case 'UNDER_REVIEW':
          // Show application status info
          Alert.alert(
            'Application Status',
            `Your application is currently ${riderApplication.status.toLowerCase().replace('_', ' ')}. We'll notify you once the review is complete.`,
            [{ text: 'OK' }]
          );
          break;
        default:
          navigation.navigate('BecomeRider', { type: 'driver' });
      }
    } else {
      // Navigate to new application
      navigation.navigate('BecomeRider', { type: 'driver' });
    }
  };

  // Mock data
  const quickActions = [
    { icon: 'car-sport', label: 'Rental' },
    { icon: 'car-outline', label: 'Ride History' },
    { icon: 'bag-outline', label: 'My Orders' },
    { icon: 'heart-outline', label: 'Interest' },
  ];



  const categories = [
    { icon: 'phone-portrait-outline', name: 'Electronics' },
    { icon: 'shirt-outline', name: 'Fashion' },
    { icon: 'home-outline', name: 'Home' },
    { icon: 'flash-outline', name: 'Popular' },
  ];

  const promotions = [
    {
      title: 'Morning Special',
      subtitle: 'Save 10% on Morning Rides',
      description: 'Valid 6AM - 10AM daily',
      gradient: ['#14B8A6', '#0D9488'],
      buttonText: 'Book Now'
    },
    {
      title: 'Flash Sale',
      subtitle: 'Electronics Sale!',
      description: 'Up to 30% off selected items',
      gradient: ['#FB923C', '#F97316'],
      buttonText: 'Shop Now'
    },
    {
      title: 'Holiday Special',
      subtitle: 'Festival Discounts',
      description: 'Special offers all weekend',
      gradient: ['#6366F1', '#8B5CF6'],
      buttonText: 'View Deals'
    },
  ];

  const activities = [
    { message: 'Abdou just booked a ride near you', time: '2 mins ago' },
    { message: 'Fatou sold a phone in your area', time: '5 mins ago' },
  ];

  // Search functions
  const openSearchScreen = () => {
    navigation.navigate('UserSearch');
  };

  const handleQuickActionPress = (action: string) => {
    switch (action) {
      case 'Rental':
        navigation.navigate('RentalRequest');
        break;
      case 'Ride History':
        // Directly navigate to Requested Rides for faster access
        navigation.navigate('CustomerRides');
        break;
      case 'My Orders':
        navigation.navigate('CustomerOrders');
        break;
      case 'Interest':
        navigation.navigate('InterestManagement');
        break;
      default:
        console.log('Unknown action:', action);
    }
  };

  const handleTabPress = (tab: string) => {
    switch (tab) {
      case 'home':
        // Already on home
        break;
      case 'rides':
        navigation.navigate('CustomerRideService');
        break;
      case 'shop':
        navigation.navigate('FeaturedProducts');
        break;
      case 'messages':
        navigation.navigate('ChatList');
        break;
      case 'profile':
        navigation.navigate('SellerDashboard');
        break;
    }
  };

  const handleNotificationPress = () => {
    navigation.navigate('Notifications');
  };

  const isActiveTab = (tab: string) => {
    switch (tab) {
      case 'home':
        return route.name === 'Home';
      case 'rides':
        return route.name === 'CustomerRideService';
      case 'shop':
        return route.name === 'ProductListing';
      case 'messages':
        return route.name === 'ChatList';
      case 'profile':
        return route.name === 'SellerDashboard';
      default:
        return false;
    }
  };





    

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.logo}></Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.locationContainer}
              onPress={getUserLocation}
              disabled={isLoadingLocation}
            >
              {isLoadingLocation ? (
                <ActivityIndicator size="small" color="#6B7280" />
              ) : (
                <Ionicons name="location-outline" size={16} color="#6B7280" />
              )}
              <Text style={styles.locationText}>
                {isLoadingLocation ? 'Detecting...' : userLocation}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={handleNotificationPress}
            >
              <Ionicons name="notifications-outline" size={24} color="#6B7280" />
              {isLoadingNotifications ? (
                <View style={styles.notificationBadge}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
              ) : unreadNotificationsCount > 0 ? (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.profileButton}
              onPress={() => navigation.navigate('AccountSettings')}
            >
              <Ionicons name="person-outline" size={20} color="#6B7280" />
            </TouchableOpacity>

          </View>
        </View>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        >
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={20} color="#6B7280" />
              <TouchableOpacity 
                style={styles.searchInput}
                onPress={openSearchScreen}
                activeOpacity={0.7}
              >
                <Text style={styles.searchPlaceholder}>
                  Search products, orders, rides, rentals...
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={openSearchScreen}>
                <Ionicons name="mic-outline" size={20} color="#14B8A6" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Welcome Banner */}
          <View style={styles.welcomeBanner}>
            <Text style={styles.welcomeTitle}>
              Hello, {(() => {
                // First try fresh user data from backend
                if (freshUserData?.firstName) {
                  return freshUserData.firstName;
                }
                // Then try AuthContext user data
                if (user?.firstName) {
                  return user.firstName;
                }
                // Show loading state
                if (isLoadingUserData) {
                  return 'Loading...';
                }
                // Fallback
                return 'User!';
              })()}! 👋
            </Text>
            <Text style={styles.welcomeSubtitle}>What would you like to do today?</Text>
            
            <View style={styles.welcomeButtons}>
              <TouchableOpacity 
                style={styles.rideButton}
                onPress={() => navigation.navigate('CustomerRideService')}
                activeOpacity={0.9}
              >
                <ImageBackground 
                  source={require('../../assets/ride-image.jpeg')}
                  style={{ width: '100%', height: 160, justifyContent: 'flex-end' }}
                  imageStyle={{ borderRadius: 12 }}
                >
                  <View style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', padding: 16, alignItems: 'center', borderRadius: 12 }}>
                    <Text style={[styles.rideButtonTitle, { color: '#FFFFFF', textShadowColor: 'rgba(0, 0, 0, 0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }]}>Book a Ride</Text>
                    <Text style={[styles.rideButtonSubtitle, { color: '#F8FAFC', textShadowColor: 'rgba(0,0,0,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 }]}>Fast and reliable rides near you</Text>
                    <View style={styles.rideButtonAction}>
                      <Text style={styles.rideButtonActionText}>Find a Ride</Text>
                    </View>
                  </View>
                </ImageBackground>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.shopButton}
                onPress={() => navigation.navigate('FeaturedProducts')}
                activeOpacity={0.9}
              >
                <ImageBackground 
                  source={require('../../assets/ecommerce-image.jpeg')}
                  style={{ width: '100%', height: 160, justifyContent: 'flex-end' }}
                  imageStyle={{ borderRadius: 12 }}
                >
                  <View style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', padding: 16, alignItems: 'center', borderRadius: 12 }}>
                    <Text style={[styles.shopButtonTitle, { color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }]}>Shop Online</Text>
                    <Text style={[styles.shopButtonSubtitle, { color: '#F8FAFC', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 }]}>Buy and sell from trusted sellers</Text>
                    <View style={styles.shopButtonAction}>
                      <Text style={styles.shopButtonActionText}>Start Shopping</Text>
                    </View>
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActionsContainer}>
            <Text style={styles.sectionTitle}>Quick Access</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {quickActions.map((action, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.quickActionItem}
                  onPress={() => handleQuickActionPress(action.label)}
                >
                  <View style={styles.quickActionIcon}>
                    <Ionicons name={action.icon as any} size={24} color="#0EA5E9" />
                  </View>
                  <Text style={styles.quickActionLabel}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Service Section */}
          <View style={styles.serviceSection}>
            {/* Ride Service */}
            <View style={styles.serviceBlock}>
              <View style={styles.serviceHeader}>
                <View style={styles.serviceTitleContainer}>
                  <Text style={styles.serviceTitle}>Ride Service</Text>
                  <View style={styles.serviceBadge}>
                    <Text style={styles.serviceBadgeText}>Personalized</Text>
                  </View>
                </View>

              </View>
              
              <View style={styles.rideServiceCard}>
                <View style={styles.recentDestinationsHeader}>
                  <View style={styles.recentTitleContainer}>
                    <Ionicons name="time-outline" size={20} color="#0EA5E9" />
                    <Text style={styles.recentTitle}>Recent Destinations</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.viewAllButton}
                    onPress={() => navigation.navigate('CustomerRideHistory')}
                  >
                    <Text style={styles.viewAllText}>View All</Text>
                    <Ionicons name="chevron-forward" size={16} color="#0EA5E9" />
                  </TouchableOpacity>
                </View>
                
                {isLoadingDestinations ? (
                  <View style={styles.destinationLoadingContainer}>
                    <ActivityIndicator size="small" color="#0EA5E9" />
                    <Text style={styles.destinationLoadingText}>Loading your recent rides...</Text>
                  </View>
                ) : recentDestinations.length > 0 ? (
                  <View style={styles.destinationsList}>
                    {recentDestinations.map((destination, index) => (
                      <View 
                        key={destination.id} 
                        style={styles.destinationCard}
                      >
                        <View style={styles.destinationIconContainer}>
                          <Ionicons name="location" size={18} color="#FFFFFF" />
                        </View>
                        <View style={styles.destinationContent}>
                          <Text style={styles.destinationName} numberOfLines={1}>
                            {destination.destinationLocation.address || 'Recent Destination'}
                          </Text>
                          <Text style={styles.destinationDate}>
                            {new Date(destination.completedAt).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </Text>
                        </View>
                        <View style={styles.destinationPriceContainer}>
                          <View style={styles.priceBadge}>
                            <Text style={styles.destinationPrice}>
                              {destination.currencySymbol}{destination.totalFare.toLocaleString()}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyDestinationsContainer}>
                    <View style={styles.emptyDestinationsIcon}>
                      <Ionicons name="car-outline" size={32} color="#9CA3AF" />
                    </View>
                    <Text style={styles.emptyDestinationsTitle}>No recent rides</Text>
                    <Text style={styles.emptyDestinationsSubtitle}>
                      Book your first ride to see your destinations here
                    </Text>
                    <TouchableOpacity 
                      style={styles.bookFirstRideButton}
                      onPress={() => navigation.navigate('CustomerRideService')}
                    >
                      <Text style={styles.bookFirstRideButtonText}>Book a Ride</Text>
                    </TouchableOpacity>
                  </View>
                )}
                
                <View style={[styles.nearestDriverCard, { marginTop: 20 }]}>
                  <View style={styles.nearestDriverInfo}>
                    <Ionicons name="time-outline" size={20} color="#14B8A6" />
                    <Text style={styles.nearestDriverText}>
                      Get A Ride
                    </Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.bookNowButton}
                    onPress={() => navigation.navigate('RideRequest')}
                  >
                    <Text style={styles.bookNowButtonText}>Book Now</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Shop Online */}
            <View style={styles.serviceBlock}>
              <View style={styles.serviceHeader}>
                <View style={styles.serviceTitleContainer}>
                  <Text style={styles.serviceTitle}>Shop Online</Text>
                </View>
              </View>
              
              <View style={styles.shopGrid}>
                <TouchableOpacity 
                  style={styles.shopCard}
                  onPress={() => navigation.navigate('PopularProducts')}
                >
                  <Text style={styles.shopCardTitle}>🔥 POPULAR</Text>
                  <Text style={styles.shopCardSubtitle}>Products</Text>
                  <View style={styles.shopCardButton}>
                    <Text style={styles.shopCardButtonText}>Explore</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.shopCard}
                  onPress={() => navigation.navigate('NewArrivals')}
                >
                  <Text style={styles.shopCardTitle}>✨ New Arrivals</Text>
                  <Text style={styles.shopCardSubtitle}>Just Added</Text>
                  <View style={styles.shopCardButton}>
                    <Text style={styles.shopCardButtonText}>See New</Text>
                  </View>
                </TouchableOpacity>
              </View>
              
              <View style={styles.categoriesHeader}>
                <Text style={styles.categoriesTitle}>Categories</Text>
                <TouchableOpacity 
                  style={styles.viewAllButton}
                  onPress={() => navigation.navigate('ProductCategoryOptions')}
                >
                  <Text style={styles.viewAllText}>View All</Text>
                  <Ionicons name="chevron-forward" size={16} color="#0EA5E9" />
                </TouchableOpacity>
              </View>
              {isLoadingCategories ? (
                <View style={styles.categoriesLoading}>
                  <ActivityIndicator size="small" color="#3B82F6" />
                  <Text style={styles.categoriesLoadingText}>Loading categories...</Text>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {categoriesData.map((category, index) => (
                    <TouchableOpacity 
                      key={category.id} 
                      style={styles.categoryItem}
                      onPress={() => navigation.navigate('FeaturedByCategories', { 
                        categoryId: category.id, 
                        categoryName: category.name 
                      })}
                    >
                      <View style={styles.categoryIcon}>
                        <Ionicons name={getCategoryIcon(category.name) as any} size={20} color="#3B82F6" />
                      </View>
                      <Text style={styles.categoryName}>{category.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              
              <View style={[styles.sellCard, { marginTop: 40 }]}>
                <View style={styles.sellCardHeader}>
                  <Ionicons name="add-circle-outline" size={20} color="#3B82F6" />
                  <Text style={styles.sellCardTitle}>Have something to sell?</Text>
                </View>
                <TouchableOpacity 
                  style={styles.sellButton}
                  onPress={() => navigation.navigate('SellerDashboard')}
                >
                  <Text style={styles.sellButtonText}>Post an Item for Sale</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Promotions */}
          <View style={styles.promotionsContainer}>
            <View style={styles.promotionsHeader}>
              <Text style={styles.promotionsTitle}>Promotions</Text>
              <View style={styles.promotionsControls}>
                <TouchableOpacity style={styles.promotionControl}>
                  <Ionicons name="chevron-back-outline" size={20} color="#9CA3AF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.promotionControl}>
                  <Ionicons name="chevron-forward-outline" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {promotions.map((promo, index) => (
                <View key={index} style={[styles.promotionCard, { backgroundColor: promo.gradient[0] }]}>
                  <View style={styles.promotionContent}>
                    <Text style={styles.promotionLabel}>{promo.title}</Text>
                    <Text style={styles.promotionTitle}>{promo.subtitle}</Text>
                    <Text style={styles.promotionDescription}>{promo.description}</Text>
                  </View>
                  <TouchableOpacity style={styles.promotionButton}>
                    <Text style={styles.promotionButtonText}>{promo.buttonText}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            
            <View style={styles.securityCard}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#14B8A6" />
              <Text style={styles.securityText}>Secure Payments & Verified Drivers/Sellers</Text>
            </View>
          </View>

          {/* Live Activity */}
          {/* <View style={styles.activityContainer}>
            <View style={styles.activityHeader}>
              <Ionicons name="pulse-outline" size={20} color="#EF4444" />
              <Text style={styles.activityTitle}>Live Activity</Text>
            </View>
            {activities.map((activity, index) => (
              <View key={index} style={styles.activityItem}>
                <Text style={styles.activityMessage}>{activity.message}</Text>
                <Text style={styles.activityTime}>{activity.time}</Text>
              </View>
            ))}
          </View> */}

          {/* Become a Rider Section */}
          <View style={styles.becomeRiderContainer}>
            {(() => {
              const statusContent = getRiderStatusContent();
              return (
                <>
                  <View style={styles.becomeRiderHeader}>
                    <Ionicons name={statusContent.icon as any} size={24} color={statusContent.iconColor} />
                    <Text style={styles.becomeRiderTitle}>{statusContent.title}</Text>
                    {statusContent.statusBadge && (
                      <View style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 12,
                        marginLeft: 8,
                        backgroundColor: `${statusContent.statusColor}20`
                      }}>
                        <Text style={{
                          fontSize: 12,
                          fontWeight: '500',
                          color: statusContent.statusColor
                        }}>
                          {statusContent.statusBadge}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.becomeRiderSubtitle}>
                    {statusContent.subtitle}
                  </Text>
                  
                  {statusContent.showRiderTypes && !statusContent.showRejectedContent && !statusContent.showSuspendedContent && (
                    <View style={styles.riderTypesContainer}>
                      <TouchableOpacity 
                        style={styles.riderTypeCard}
                        onPress={() => navigation.navigate('BecomeRider', { type: 'driver' })}
                      >
                        <View style={styles.riderTypeIcon}>
                          <Ionicons name="car-outline" size={32} color="#0EA5E9" />
                        </View>
                        <Text style={styles.riderTypeTitle}>Car Driver</Text>
                        <Text style={styles.riderTypeDescription}>Drive passengers in your car</Text>
                        <View style={styles.riderTypeBadge}>
                          <Text style={styles.riderTypeBadgeText}>Most Popular</Text>
                        </View>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.riderTypeCard}
                        onPress={() => navigation.navigate('BecomeRider', { type: 'motorcycle' })}
                      >
                        <View style={styles.riderTypeIcon}>
                          <Ionicons name="bicycle-outline" size={32} color="#0EA5E9" />
                        </View>
                        <Text style={styles.riderTypeTitle}>Motorcycle</Text>
                        <Text style={styles.riderTypeDescription}>Deliver packages and food</Text>
                        <View style={styles.riderTypeBadge}>
                          <Text style={styles.riderTypeBadgeText}>Fast Delivery</Text>
                        </View>
                      </TouchableOpacity>
                      

                    </View>
                  )}
                  
                  {statusContent.showBenefits && !statusContent.showRejectedContent && !statusContent.showSuspendedContent && (
                    <View style={styles.becomeRiderBenefits}>
                      <Text style={styles.benefitsTitle}>Why Join Us?</Text>
                      <View style={styles.benefitItem}>
                        <Ionicons name="cash-outline" size={20} color="#0EA5E9" />
                        <Text style={styles.benefitText}>Earn per request ride</Text>
                      </View>
                      <View style={styles.benefitItem}>
                        <Ionicons name="time-outline" size={20} color="#0EA5E9" />
                        <Text style={styles.benefitText}>Flexible working hours</Text>
                      </View>
                      <View style={styles.benefitItem}>
                        <Ionicons name="trending-up-outline" size={20} color="#0EA5E9" />
                        <Text style={styles.benefitText}>Request settlement any time</Text>
                      </View>
                    </View>
                  )}

                  {statusContent.showApprovedContent && (
                    <View style={styles.approvedContent}>
                      <View style={styles.approvedCard}>
                        <View style={styles.approvedHeader}>
                          <Ionicons name="checkmark-circle" size={32} color="#10B981" />
                          <Text style={styles.approvedTitle}>You're All Set!</Text>
                        </View>
                        <Text style={styles.approvedDescription}>
                          Your driver account is active and ready. Start earning by going online and accepting ride requests.
                        </Text>
                        <View style={styles.approvedFeatures}>
                          <View style={styles.approvedFeature}>
                            <Ionicons name="location" size={20} color="#10B981" />
                            <Text style={styles.approvedFeatureText}>Real-time location tracking</Text>
                          </View>
                          <View style={styles.approvedFeature}>
                            <Ionicons name="shield-checkmark" size={20} color="#10B981" />
                            <Text style={styles.approvedFeatureText}>Verified driver status</Text>
                          </View>
                          <View style={styles.approvedFeature}>
                            <Ionicons name="cash" size={20} color="#10B981" />
                            <Text style={styles.approvedFeatureText}>Instant earnings</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  )}

                  {statusContent.showRejectedContent && (
                    <View style={styles.rejectedContent}>
                      <View style={styles.rejectedCard}>
                        <View style={styles.rejectedHeader}>
                          <Ionicons name="information-circle" size={24} color="#EF4444" />
                          <Text style={styles.rejectedTitle}>Application Feedback</Text>
                        </View>
                        <Text style={styles.rejectedDescription}>
                          We've reviewed your application and found some areas that need attention. Please update your information and try again.
                        </Text>
                        {riderApplication?.rejectionReason && (
                          <View style={styles.rejectionReason}>
                            <Text style={styles.rejectionReasonTitle}>Reason:</Text>
                            <Text style={styles.rejectionReasonText}>{riderApplication.rejectionReason}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}

                  {statusContent.showSuspendedContent && (
                    <View style={styles.suspendedContent}>
                      <View style={styles.suspendedCard}>
                        <View style={styles.suspendedHeader}>
                          <Ionicons name="warning" size={24} color="#EF4444" />
                          <Text style={styles.suspendedTitle}>Account Suspended</Text>
                        </View>
                        <Text style={styles.suspendedDescription}>
                          Your driver account has been temporarily suspended. Please contact our support team to resolve this issue.
                        </Text>
                        <View style={styles.suspendedContact}>
                          <Text style={styles.suspendedContactTitle}>Contact Support:</Text>
                          <Text style={styles.suspendedContactText}>Email: customercare@cloudnexus.biz</Text>
                          <Text style={styles.suspendedContactText}>Phone: +220 673 8885</Text>
                        </View>
                      </View>
                    </View>
                  )}
                  
                  <TouchableOpacity 
                    style={[
                      styles.becomeRiderButton,
                      statusContent.buttonDisabled && { backgroundColor: '#9CA3AF' }
                    ]}
                    onPress={handleRiderButtonPress}
                    disabled={statusContent.buttonDisabled}
                  >
                    <Text style={styles.becomeRiderButtonText}>
                      {statusContent.buttonText}
                    </Text>
                    {!statusContent.buttonDisabled && (
                      <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                </>
              );
            })()}
          </View>
        </ScrollView>

        {/* Floating Shopping Cart Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate('ShoppingCart')}
          style={styles.floatingCartButton}
        >
          <Ionicons name="cart" size={24} color="#FFFFFF" />
          {(isLoadingPendingCount || pendingPaymentCount > 0) && (
            <View style={styles.floatingBadge}>
              {isLoadingPendingCount ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.floatingBadgeText}>
                  {pendingPaymentCount > 99 ? '99+' : pendingPaymentCount}
                </Text>
              )}
            </View>
          )}
        </TouchableOpacity>

        {/* Bottom Navigation */}
        <SafeAreaView edges={['bottom']} style={styles.bottomNavContainer}>
          <View style={styles.bottomNav}>
            <TouchableOpacity
              style={[styles.navItem, isActiveTab('home') && styles.activeNavItem]}
              onPress={() => handleTabPress('home')}
            >
              <Ionicons
                name={isActiveTab('home') ? 'home' : 'home-outline'}
                size={24}
                color={isActiveTab('home') ? '#14B8A6' : '#6B7280'}
              />
              <Text style={[styles.navText, isActiveTab('home') && styles.activeNavText]}>
                Home
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navItem, isActiveTab('rides') && styles.activeNavItem]}
              onPress={() => handleTabPress('rides')}
            >
              <Ionicons
                name={isActiveTab('rides') ? 'car' : 'car-outline'}
                size={24}
                color={isActiveTab('rides') ? '#14B8A6' : '#6B7280'}
              />
              <Text style={[styles.navText, isActiveTab('rides') && styles.activeNavText]}>
                Rides
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navItem, isActiveTab('shop') && styles.activeNavItem]}
              onPress={() => handleTabPress('shop')}
            >
              <Ionicons
                name={isActiveTab('shop') ? 'bag' : 'bag-outline'}
                size={24}
                color={isActiveTab('shop') ? '#14B8A6' : '#6B7280'}
              />
              <Text style={[styles.navText, isActiveTab('shop') && styles.activeNavText]}>
                Shop
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navItem, isActiveTab('messages') && styles.activeNavItem]}
              onPress={() => handleTabPress('messages')}
            >
              <Ionicons
                name={isActiveTab('messages') ? 'chatbubbles' : 'chatbubbles-outline'}
                size={24}
                color={isActiveTab('messages') ? '#14B8A6' : '#6B7280'}
              />
              <Text style={[styles.navText, isActiveTab('messages') && styles.activeNavText]}>
                Messages
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navItem, isActiveTab('profile') && styles.activeNavItem]}
              onPress={() => handleTabPress('profile')}
            >
              <Ionicons
                name={isActiveTab('profile') ? 'storefront' : 'storefront-outline'}
                size={24}
                color={isActiveTab('profile') ? '#14B8A6' : '#6B7280'}
              />
              <Text style={[styles.navText, isActiveTab('profile') && styles.activeNavText]}>
                Seller
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#14B8A6',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  locationText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  notificationButton: {
    position: 'relative',
    marginRight: 12,
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#F97316',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  profileButton: {
    width: 32,
    height: 32,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  welcomeBanner: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  welcomeButtons: {
    flexDirection: 'column',
    gap: 12,
  },
  rideButton: {
    flex: 1,
    backgroundColor: '#E6F3FF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  rideButtonTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E40AF',
    marginTop: 8,
  },
  rideButtonSubtitle: {
    fontSize: 12,
    color: '#1E3A8A',
    marginTop: 4,
    textAlign: 'center',
  },
  rideButtonAction: {
    backgroundColor: '#1E40AF',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 12,
  },
  rideButtonActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  shopButton: {
    flex: 1,
    backgroundColor: '#F0F4FF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  shopButtonTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#3B82F6',
    marginTop: 8,
  },
  shopButtonSubtitle: {
    fontSize: 12,
    color: '#2563EB',
    marginTop: 4,
    textAlign: 'center',
  },
  shopButtonAction: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 12,
  },
  shopButtonActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  // Image Card styles for welcome section
  imageCardWrapper: {
    flex: 1,
    backgroundColor: '#E6F3FF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageCard: {
    width: '100%',
    height: 160,
    justifyContent: 'flex-end',
  },
  imageCardImage: {
    borderRadius: 12,
  },
  imageCardOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    padding: 16,
    alignItems: 'center',
  },
  imageCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  imageCardSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
    textAlign: 'center',
  },
  imageCardButton: {
    backgroundColor: '#1E40AF',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
  },
  imageCardButtonAlt: {
    backgroundColor: '#3B82F6',
  },
  imageCardButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#1E40AF',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1F2937',
    justifyContent: 'center',
  },
  searchPlaceholder: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  quickActionsContainer: {
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  quickActionItem: {
    alignItems: 'center',
    marginLeft: 16,
    minWidth: 70,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    color: '#374151',
    textAlign: 'center',
  },
  serviceSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
  },
  serviceBlock: {
    marginBottom: 24,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  serviceTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1F2937',
  },
  serviceBadge: {
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  serviceBadgeText: {
    fontSize: 12,
    color: '#0F766E',
  },
  orangeBadge: {
    backgroundColor: '#FED7AA',
  },
  orangeBadgeText: {
    color: '#C2410C',
  },
  blueBadge: {
    backgroundColor: '#BFDBFE',
  },
  blueBadgeText: {
    color: '#1E40AF',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#14B8A6',
  },
  orangeText: {
    color: '#F97316',
  },
  blueText: {
    color: '#3B82F6',
  },
  rideServiceCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
  },
  recentTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  destinationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  destinationInfo: {
    marginLeft: 12,
  },
  destinationName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  destinationAddress: {
    fontSize: 12,
    color: '#6B7280',
  },
  destinationPrice: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Enhanced Recent Destinations Styles
  recentDestinationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  recentTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F0F9FF',
  },
  destinationLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  destinationLoadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  destinationsList: {
    gap: 8,
  },
  destinationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  destinationIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0EA5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  destinationContent: {
    flex: 1,
  },
  destinationDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  destinationPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priceBadge: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  emptyDestinationsContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  emptyDestinationsIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyDestinationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  emptyDestinationsSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  bookFirstRideButton: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  bookFirstRideButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  nearestDriverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#CCFBF1',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 8,
    padding: 12,
  },
  nearestDriverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nearestDriverText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginLeft: 8,
  },
  nearestDriverTime: {
    color: '#14B8A6',
  },
  bookNowButton: {
    backgroundColor: '#14B8A6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  bookNowButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  shopGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  shopCard: {
    flex: 1,
    backgroundColor: '#E6F3FF',
    borderRadius: 12,
    padding: 12,
    minHeight: 120,
    justifyContent: 'space-between',
  },
  shopCardTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1E40AF',
    textAlign: 'center',
  },
  shopCardSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  shopCardButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  shopCardButtonText: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '500',
    textAlign: 'center',
  },
  categoriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoriesTitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 16,
    minWidth: 60,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#F0F4FF',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 12,
    color: '#374151',
    textAlign: 'center',
  },
  categoriesLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  categoriesLoadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  sellCard: {
    backgroundColor: '#F0F4FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  sellCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sellCardTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginLeft: 8,
  },
  sellButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  sellButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  promotionsContainer: {
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  promotionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  promotionsTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1F2937',
  },
  promotionsControls: {
    flexDirection: 'row',
  },
  promotionControl: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promotionCard: {
    width: 280,
    height: 128,
    borderRadius: 12,
    padding: 16,
    marginLeft: 16,
    justifyContent: 'space-between',
  },
  promotionContent: {
    flex: 1,
  },
  promotionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  promotionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  promotionDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  promotionButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  promotionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#14B8A6',
  },
  securityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 8,
    padding: 8,
    marginHorizontal: 16,
    marginTop: 16,
  },
  securityText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
  },
  activityContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginLeft: 8,
  },
  activityItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  activityMessage: {
    fontSize: 14,
    color: '#1F2937',
  },
  activityTime: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  bottomNavContainer: {
    backgroundColor: '#FFFFFF',
  },
  floatingCartButton: {
    position: 'absolute',
    right: 16,
    bottom: 96,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
    zIndex: 50,
  },
  floatingBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#F97316',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  floatingBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: 4,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  activeNavItem: {
    // Active state styling
  },
  navText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  activeNavText: {
    color: '#14B8A6',
  },

  // Become Rider Section Styles
  becomeRiderContainer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  becomeRiderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  becomeRiderTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginLeft: 8,
  },

  becomeRiderSubtitle: {
    fontSize: 15,
    color: '#475569',
    marginBottom: 24,
    lineHeight: 22,
  },
  riderTypesContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  riderTypeCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  riderTypeIcon: {
    width: 64,
    height: 64,
    backgroundColor: '#E0F2FE',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#0EA5E9',
  },
  riderTypeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  riderTypeDescription: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 18,
  },
  riderTypeBadge: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  riderTypeBadgeText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  becomeRiderBenefits: {
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 15,
    color: '#334155',
    marginLeft: 12,
    fontWeight: '500',
  },
  becomeRiderButton: {
    backgroundColor: '#0EA5E9',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },

  becomeRiderButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 10,
  },
  // Approved Content Styles
  approvedContent: {
    marginBottom: 20,
  },
  approvedCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 16,
  },
  approvedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  approvedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#166534',
    marginLeft: 8,
  },
  approvedDescription: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 16,
  },
  approvedFeatures: {
    gap: 8,
  },
  approvedFeature: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  approvedFeatureText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  // Rejected Content Styles
  rejectedContent: {
    marginBottom: 20,
  },
  rejectedCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 16,
  },
  rejectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rejectedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
    marginLeft: 8,
  },
  rejectedDescription: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  rejectionReason: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  rejectionReasonTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 4,
  },
  rejectionReasonText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  // Suspended Content Styles
  suspendedContent: {
    marginBottom: 20,
  },
  suspendedCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 16,
  },
  suspendedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  suspendedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
    marginLeft: 8,
  },
  suspendedDescription: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  suspendedContact: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  suspendedContactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 4,
  },
  suspendedContactText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  // Ride Requests Modal Styles
  rideRequestsModalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  rideRequestsModalContent: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  rideRequestsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  rideRequestsTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  rideRequestsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  rideRequestsSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  refreshButton: {
    padding: 8,
  },
  rideRequestsContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rideRequestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  rideRequestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rideRequestInfo: {
    flex: 1,
  },
  rideRequestId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  rideRequestDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickupIcon: {
    width: 24,
    height: 24,
    backgroundColor: '#E6F3FF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  destinationIcon: {
    width: 24,
    height: 24,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  routeInfo: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  routeAddress: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  routeLine: {
    width: 1,
    height: '100%',
    backgroundColor: '#E5E7EB',
    marginHorizontal: 12,
  },
  tripDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tripDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tripDetailText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  driverContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverAvatar: {
    width: 32,
    height: 32,
    backgroundColor: '#14B8A6',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  driverRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  driverRatingText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  vehicleInfo: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  contactDriverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F3FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  contactDriverText: {
    fontSize: 14,
    color: '#14B8A6',
    fontWeight: '500',
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  rateButtonText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '500',
    marginLeft: 8,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
    marginLeft: 8,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F3FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  detailsButtonText: {
    fontSize: 14,
    color: '#14B8A6',
    fontWeight: '500',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#F9FAFB',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  bookRideButton: {
    backgroundColor: '#14B8A6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginTop: 20,
  },
  bookRideButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F3FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  mapButtonText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
    marginLeft: 8,
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  loadingMoreText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
  },
  endOfDataContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  endOfDataText: {
    fontSize: 12,
    color: '#6B7280',
  },
  availablePaymentMethodsTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 20,
    letterSpacing: -0.4,
  },
  loadingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  noPaymentMethodsContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
  },
  noPaymentMethodsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 10,
  },
  noPaymentMethodsSubtitle: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  addPaymentMethodButton: {
    backgroundColor: '#1E40AF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  addPaymentMethodButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  paymentMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPaymentMethodItem: {
    backgroundColor: '#F0F9FF',
    borderColor: '#0EA5E9',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  defaultPaymentMethodItem: {
    backgroundColor: '#F8FAFC',
  },
  paymentMethodItemIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#F1F5F9',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  paymentMethodItemDetails: {
    flex: 1,
  },
  paymentMethodItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  paymentMethodItemProvider: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  paymentMethodItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  defaultBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  defaultBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  paymentMethodItemAccount: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  paymentMethodItemArrow: {
    width: 16,
    height: 16,
    backgroundColor: '#CCCCCC',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentActionButtons: {
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  proceedToCheckoutButton: {
    backgroundColor: '#0EA5E9',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  proceedToCheckoutButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '800',
    marginLeft: 10,
    letterSpacing: -0.4,
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  // Simple modal styles
  simpleModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  simpleModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    minWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  simpleModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  simpleModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  simpleCloseButton: {
    padding: 5,
  },
  simpleModalBody: {
    marginBottom: 20,
  },
  simpleModalText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  simpleModalButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  simpleModalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});