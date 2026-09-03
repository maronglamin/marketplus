import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import type { MainStackParamList } from '../../App';
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
import { AppUpdateBottomSheet } from '../components/AppUpdateBottomSheet';
import { checkForUpdate, type UpdateCheckResult } from '../services/appUpdateService';
import { homeServicesApi, type ServiceBooking } from '../services/homeServicesApi';
import { realEstateApi, type PropertyListing } from '../services/realEstateApi';
import { getListingCoverUrl } from '../utils/propertyImages';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');
const isLargeTablet = Math.max(screenWidth, screenHeight) >= 1024;
const basePadding = isLargeTablet ? 24 : 16;
const contentMaxWidth = Math.min(900, screenWidth - (isLargeTablet ? 48 : 32));

type HomeNavigationProp = NativeStackNavigationProp<MainStackParamList, 'Home'>;

export function Home() {
  const navigation = useNavigation<HomeNavigationProp>();
  const route = useRoute();
  const { user, logout, token } = useAuth();
  const { checkActiveTokens } = useTokenNotification();
  

  
  // Fresh user data state (fetched from backend using JWT)
  const [freshUserData, setFreshUserData] = useState<any>(null);
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);
  // App update state
  const [isUpdateVisible, setIsUpdateVisible] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  
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
  const [recentServiceBookings, setRecentServiceBookings] = useState<ServiceBooking[]>([]);
  const [featuredProperties, setFeaturedProperties] = useState<PropertyListing[]>([]);


  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Load fresh user data from backend using JWT token
  const loadFreshUserData = async () => {
    try {
      setIsLoadingUserData(true);
      console.log('🔄 Loading fresh user data from backend...');
      const userData = await userService.getBasicUserInfo();
      console.log('✅ Fresh user data loaded:', userData);
      setFreshUserData(userData);
      // Enforce logout if user is blocked
      if (userData?.status && userData.status.toString().toUpperCase() === 'BLOCKED') {
        Alert.alert('Unauthorized', 'Your account is blocked. You have been logged out.');
        try {
          await logout();
        } catch (e) {
          // ignore logout errors; proceed with navigation reset
        }
        // Reset to root Onboarding
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const root = (navigation as any)?.getParent?.()?.getParent?.() || (navigation as any)?.getParent?.();
        root?.reset?.({ index: 0, routes: [{ name: 'Onboarding' }] });
        return;
      }
    } catch (error) {
      console.error('❌ Error loading fresh user data:', error);
      setFreshUserData(null);
    } finally {
      setIsLoadingUserData(false);
    }
  };

  // Check rider application status on component mount
  useEffect(() => {
    if (user?.id) {
      loadFreshUserData();
      checkRiderApplicationStatus();
      loadRecentDestinations();
      loadUnreadNotificationsCount();
      loadPendingPaymentCount();
      // Check for active tokens when component mounts
      checkActiveTokens();
    } else {
      // For anonymous users, only load public data
      setFreshUserData(null);
      setRiderApplication(null);
      setRecentDestinations([]);
      setUnreadNotificationsCount(0);
      setPendingPaymentCount(0);
    }
    loadCategories();
    getUserLocation();
    loadFeaturedProperties();
    if (user?.id) loadRecentServiceBookings();
    // Check for app updates on mount (no-op if backend endpoint not present)
    (async () => {
      const result = await checkForUpdate();
      if (result.shouldPrompt) {
        setUpdateInfo(result);
        setIsUpdateVisible(true);
      }
    })();
  }, []);

  // Helper: wait for token to be written to storage (handles async write timing after login)
  const waitForStoredToken = useCallback(async (maxAttempts: number = 10, delayMs: number = 100) => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const stored = await AsyncStorage.getItem('token');
      if (stored) return true;
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    return false;
  }, []);

  // Re-run data loading when user changes
  useEffect(() => {
    const run = async () => {
      if (user?.id) {
        console.log('🔄 User changed in Home, refreshing data for user:', user.id);
        // Ensure token is available to the API interceptor before making authenticated requests
        await waitForStoredToken();
        await loadFreshUserData();
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
    };
    run();
  }, [user?.id, waitForStoredToken]);

  // Load unread notifications count when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user?.id) {
        loadUnreadNotificationsCount();
        loadPendingPaymentCount();
      } else {
        setUnreadNotificationsCount(0);
        setPendingPaymentCount(0);
      }
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
        loadFeaturedProperties(),
        ...(user?.id ? [loadRecentServiceBookings()] : []),
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
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const root = (navigation as any)?.getParent?.()?.getParent?.() || (navigation as any)?.getParent?.();
                  root?.reset?.({ index: 0, routes: [{ name: 'Onboarding' }] });
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
      if (!user?.id) {
        setPendingPaymentCount(0);
        return;
      }
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
      if (!user?.id) {
        setRecentDestinations([]);
        return;
      }
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

  const loadFeaturedProperties = async () => {
    try {
      const listings = await realEstateApi.getFeatured(6);
      setFeaturedProperties(listings);
    } catch {
      setFeaturedProperties([]);
    }
  };

  const loadRecentServiceBookings = async () => {
    try {
      if (!user?.id) {
        setRecentServiceBookings([]);
        return;
      }
      const bookings = await homeServicesApi.getMyBookings();
      setRecentServiceBookings(bookings.slice(0, 3));
    } catch {
      setRecentServiceBookings([]);
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
            'Please contact our support team to resolve your account suspension.\n\nEmail: contact@cloudnexus.biz\nPhone: +220 673 8885',
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
    { icon: 'construct-outline', label: 'Home Services' },
    { icon: 'business-outline', label: 'Properties' },
    { icon: 'car-outline', label: 'Ride History' },
    { icon: 'bag-outline', label: 'My Orders' },
    { icon: 'heart-outline', label: 'Interest' },
  ];

  const serviceCards = [
    {
      id: 'ride',
      image: require('../../assets/ride-taxi.jpeg'),
      badgeIcon: 'car-sport-outline' as const,
      badgeText: 'Ride Service',
      badgeColor: 'rgba(14, 165, 233, 0.9)',
      title: 'Book a Ride',
      subtitle: 'Fast and reliable rides near you',
      actionText: 'Find a Ride',
      actionColor: '#0EA5E9',
      onPress: () => handleRideBannerPress(),
    },
    {
      id: 'shop',
      image: require('../../assets/ecommerce-image.jpeg'),
      badgeIcon: 'bag-handle-outline' as const,
      badgeText: 'Marketplace',
      badgeColor: 'rgba(59, 130, 246, 0.85)',
      title: 'Shop Online',
      subtitle: 'Buy and sell from trusted sellers',
      actionText: 'Start Shopping',
      actionColor: '#3B82F6',
      onPress: () => navigation.navigate('FeaturedProducts'),
    },
    {
      id: 'home-services',
      image: require('../../assets/home-and-professional-service.jpeg'),
      badgeIcon: 'construct-outline' as const,
      badgeText: 'Utility Services',
      badgeColor: 'rgba(16, 185, 129, 0.9)',
      title: 'Home & Professional Services',
      subtitle: 'Plumbing, cleaning, electrical & more',
      actionText: 'Book a Service',
      actionColor: '#10B981',
      onPress: () => navigation.navigate('HomeServices', { screen: 'HomeServicesHub' }),
    },
    {
      id: 'real-estate',
      image: require('../../assets/real-estate.jpeg'),
      badgeIcon: 'business-outline' as const,
      badgeText: 'Real Estate',
      badgeColor: 'rgba(5, 150, 105, 0.9)',
      title: 'Real Estate',
      subtitle: 'Homes and land for sale',
      actionText: 'Browse Properties',
      actionColor: '#059669',
      onPress: () => navigation.navigate('RealEstate', { screen: 'RealEstateHub', params: { section: 'realestate' } }),
    },
    {
      id: 'stay',
      image: require('../../assets/hotel-and-apartment-booking.jpeg'),
      badgeIcon: 'bed-outline' as const,
      badgeText: 'Stay',
      badgeColor: 'rgba(124, 58, 237, 0.9)',
      title: 'Stay & Accommodation',
      subtitle: 'Hotels, apartments, lodges & trips',
      actionText: 'Explore Stays',
      actionColor: '#7C3AED',
      onPress: () => navigation.navigate('RealEstate', { screen: 'RealEstateHub', params: { section: 'stay' } }),
    },
  ];



  const categories = [
    { icon: 'phone-portrait-outline', name: 'Electronics' },
    { icon: 'shirt-outline', name: 'Fashion' },
    { icon: 'home-outline', name: 'Home' },
    { icon: 'flash-outline', name: 'Popular' },
  ];

  const promotions = [
    {
      id: 'morning-special',
      title: 'Morning Special',
      subtitle: 'Save 10% on Morning Rides',
      description: 'Valid 6AM – 10AM daily',
      gradient: ['#0D9488', '#115E59'],
      accentColor: '#0D9488',
      icon: 'sunny-outline' as const,
      buttonText: 'Book Now',
      action: 'RideRequest' as const,
    },
    {
      id: 'flash-sale',
      title: 'Flash Sale',
      subtitle: 'Electronics Deals',
      description: 'Up to 30% off selected items',
      gradient: ['#EA580C', '#C2410C'],
      accentColor: '#EA580C',
      icon: 'flash-outline' as const,
      buttonText: 'Shop Now',
      action: 'FeaturedProducts' as const,
    },
    {
      id: 'holiday-special',
      title: 'Weekend Offers',
      subtitle: 'Festival Discounts',
      description: 'Special deals all weekend long',
      gradient: ['#4F46E5', '#4338CA'],
      accentColor: '#4F46E5',
      icon: 'gift-outline' as const,
      buttonText: 'View Deals',
      action: 'FeaturedProducts' as const,
    },
  ];

  const activities = [
    { message: 'Abdou just booked a ride near you', time: '2 mins ago' },
    { message: 'Fatou sold a phone in your area', time: '5 mins ago' },
  ];

  // Carousel auto-slide (5s is a standard marketing carousel interval)
  const SERVICE_AUTO_SLIDE_MS = 5000;
  const PROMOTION_AUTO_SLIDE_MS = 5500;
  const CAROUSEL_RESUME_DELAY_MS = 10000;

  const serviceCarouselWidth = isLargeTablet ? contentMaxWidth : screenWidth - basePadding * 2;
  const serviceCarouselRef = useRef<ScrollView>(null);
  const [serviceCardIndex, setServiceCardIndex] = useState(0);
  const serviceAutoSlidePausedRef = useRef(false);
  const serviceResumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serviceCardCount = serviceCards.length;

  const promotionCardWidth = isLargeTablet ? contentMaxWidth : screenWidth - basePadding * 2;
  const promotionsScrollRef = useRef<ScrollView>(null);
  const [promotionIndex, setPromotionIndex] = useState(0);
  const promotionAutoSlidePausedRef = useRef(false);
  const promotionResumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxPromotionIndex = Math.max(0, promotions.length - 1);

  const pauseServiceAutoSlide = useCallback(() => {
    serviceAutoSlidePausedRef.current = true;
    if (serviceResumeTimerRef.current) clearTimeout(serviceResumeTimerRef.current);
    serviceResumeTimerRef.current = setTimeout(() => {
      serviceAutoSlidePausedRef.current = false;
    }, CAROUSEL_RESUME_DELAY_MS);
  }, []);

  const pausePromotionAutoSlide = useCallback(() => {
    promotionAutoSlidePausedRef.current = true;
    if (promotionResumeTimerRef.current) clearTimeout(promotionResumeTimerRef.current);
    promotionResumeTimerRef.current = setTimeout(() => {
      promotionAutoSlidePausedRef.current = false;
    }, CAROUSEL_RESUME_DELAY_MS);
  }, []);

  const scrollToServiceIndex = useCallback((index: number, animated = true) => {
    const clamped = ((index % serviceCardCount) + serviceCardCount) % serviceCardCount;
    setServiceCardIndex(clamped);
    serviceCarouselRef.current?.scrollTo({ x: clamped * serviceCarouselWidth, animated });
  }, [serviceCarouselWidth]);

  const scrollToPromotionIndex = useCallback((index: number, animated = true) => {
    const clamped = ((index % promotions.length) + promotions.length) % promotions.length;
    setPromotionIndex(clamped);
    promotionsScrollRef.current?.scrollTo({
      x: clamped * promotionCardWidth,
      animated,
    });
  }, [promotionCardWidth, promotions.length]);

  const handlePromotionPrev = () => {
    pausePromotionAutoSlide();
    scrollToPromotionIndex(promotionIndex - 1);
  };

  const handlePromotionNext = () => {
    pausePromotionAutoSlide();
    scrollToPromotionIndex(promotionIndex + 1);
  };

  const handlePromotionMomentumEnd = (event: any) => {
    const x = event?.nativeEvent?.contentOffset?.x ?? 0;
    const index = Math.round(x / promotionCardWidth);
    setPromotionIndex(Math.max(0, Math.min(maxPromotionIndex, index)));
  };

  const handleServiceCarouselEnd = (event: any) => {
    const x = event?.nativeEvent?.contentOffset?.x ?? 0;
    const index = Math.round(x / serviceCarouselWidth);
    setServiceCardIndex(Math.max(0, Math.min(index, serviceCardCount - 1)));
  };

  useFocusEffect(
    useCallback(() => {
      serviceAutoSlidePausedRef.current = false;
      promotionAutoSlidePausedRef.current = false;

      const serviceTimer = setInterval(() => {
        if (serviceAutoSlidePausedRef.current) return;
        setServiceCardIndex((prev) => {
          const next = (prev + 1) % serviceCardCount;
          serviceCarouselRef.current?.scrollTo({
            x: next * serviceCarouselWidth,
            animated: true,
          });
          return next;
        });
      }, SERVICE_AUTO_SLIDE_MS);

      const promotionTimer = setInterval(() => {
        if (promotionAutoSlidePausedRef.current) return;
        setPromotionIndex((prev) => {
          const next = (prev + 1) % promotions.length;
          promotionsScrollRef.current?.scrollTo({
            x: next * promotionCardWidth,
            animated: true,
          });
          return next;
        });
      }, PROMOTION_AUTO_SLIDE_MS);

      return () => {
        clearInterval(serviceTimer);
        clearInterval(promotionTimer);
        if (serviceResumeTimerRef.current) clearTimeout(serviceResumeTimerRef.current);
        if (promotionResumeTimerRef.current) clearTimeout(promotionResumeTimerRef.current);
      };
    }, [serviceCarouselWidth, promotionCardWidth, promotions.length, serviceCardCount])
  );

  // Search functions
  const openSearchScreen = () => {
    navigation.navigate('UserSearch');
  };

  const promptLogin = (message?: string) => {
    Alert.alert(
      'Login required',
      message ?? 'Please login to access this service.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Login',
          onPress: () => {
            // Try navigating to root Auth stack; fall back if nested
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (navigation as any)?.getParent?.()?.navigate?.('Auth') ?? navigation.navigate('Auth' as never);
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleRideBannerPress = () => {
    // Allow public browsing to Quick Ride route
    navigation.navigate('CustomerRideService');
  };

  const handleRideHistoryPress = () => {
    if (!user && !token) {
      promptLogin('Login to view your ride history.');
      return;
    }
    navigation.navigate('CustomerRideHistory');
  };

  const handleRideRequestPress = () => {
    if (!user && !token) {
      // Gate actions that post to backend
      promptLogin('To access the service, please login to complete');
      return;
    }
    navigation.navigate('RideRequest');
  };

  const handleBookFirstRidePress = () => {
    if (!user && !token) {
      // Gate actions that post to backend
      promptLogin('To access the service, please login to complete');
      return;
    }
    navigation.navigate('CustomerRideService');
  };

  const handleQuickActionPress = (action: string) => {
    const requireAuth = (message: string) => {
      if (!user && !token) {
        promptLogin(message);
        return true;
      }
      return false;
    };

    switch (action) {
      case 'Rental':
        if (requireAuth('Login to request a rental.')) return;
        navigation.navigate('RentalRequest');
        break;
      case 'Home Services':
        navigation.navigate('HomeServices', { screen: 'HomeServicesHub' });
        break;
      case 'Properties':
        navigation.navigate('RealEstate', { screen: 'RealEstateHub' });
        break;
      case 'Ride History':
        // Directly navigate to Requested Rides for faster access
        if (requireAuth('Login to view your ride history.')) return;
        navigation.navigate('CustomerRides');
        break;
      case 'My Orders':
        if (requireAuth('Login to view your orders.')) return;
        navigation.navigate('CustomerOrders');
        break;
      case 'Interest':
        if (requireAuth('Login to manage your interests.')) return;
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
        if (!user && !token) {
          promptLogin('Login to access ride services.');
          return;
        }
        navigation.navigate('CustomerRideService');
        break;
      case 'shop':
        navigation.navigate('FeaturedProducts');
        break;
      case 'messages':
        if (!user && !token) {
          promptLogin('Login to view your messages.');
          return;
        }
        navigation.navigate('ChatList');
        break;
      case 'profile':
        navigation.navigate('SellerDashboard');
        break;
    }
  };

  const handleNotificationPress = () => {
    if (!user && !token) {
      promptLogin('Login to view your notifications.');
      return;
    }
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
                <Ionicons name="location-outline" size={isLargeTablet ? 18 : 16} color="#6B7280" />
              )}
              <Text style={styles.locationText}>
                {isLoadingLocation ? 'Detecting...' : userLocation}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={handleNotificationPress}
            >
              <Ionicons name="notifications-outline" size={isLargeTablet ? 26 : 24} color="#6B7280" />
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
              <Ionicons name="person-outline" size={isLargeTablet ? 22 : 20} color="#6B7280" />
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
              <Ionicons name="search-outline" size={isLargeTablet ? 22 : 20} color="#6B7280" />
              <TouchableOpacity 
                style={styles.searchInput}
                onPress={openSearchScreen}
                activeOpacity={0.7}
              >
                <Text style={styles.searchPlaceholder}>
                  Search now...
                </Text>
              </TouchableOpacity>
              
            </View>
          </View>

          {/* Welcome Banner */}
          <View style={styles.welcomeBanner}>
            <Text style={styles.welcomeTitle}>
              Hello, {(() => {
                const name =
                  freshUserData?.firstName ||
                  user?.firstName ||
                  'Guest';
                return name;
              })()}! 👋
            </Text>
            <Text style={styles.welcomeSubtitle}>What would you like to do today?</Text>
            
            <View style={styles.serviceCarouselContainer}>
              <ScrollView
                ref={serviceCarouselRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                onScrollBeginDrag={pauseServiceAutoSlide}
                onMomentumScrollEnd={handleServiceCarouselEnd}
                style={{ width: serviceCarouselWidth }}
                contentContainerStyle={styles.serviceCarouselContent}
              >
                {serviceCards.map((card) => (
                  <TouchableOpacity
                    key={card.id}
                    style={[styles.serviceCard, { width: serviceCarouselWidth }]}
                    onPress={card.onPress}
                    activeOpacity={0.92}
                  >
                    <ImageBackground
                      source={card.image}
                      resizeMode="cover"
                      style={styles.serviceCardImage}
                      imageStyle={styles.serviceCardImageStyle}
                    >
                      <View style={styles.serviceCardOverlayFull}>
                        <View style={[styles.serviceCardBadge, { backgroundColor: card.badgeColor }]}>
                          <Ionicons name={card.badgeIcon} size={14} color="#FFFFFF" />
                          <Text style={styles.serviceCardBadgeText}>{card.badgeText}</Text>
                        </View>
                        <Text style={styles.serviceCardTitle}>{card.title}</Text>
                        <Text style={styles.serviceCardSubtitle}>{card.subtitle}</Text>
                        <View style={[styles.serviceCardAction, { backgroundColor: card.actionColor }]}>
                          <Text style={styles.serviceCardActionText}>{card.actionText}</Text>
                          <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                        </View>
                      </View>
                    </ImageBackground>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.servicePagination}>
                {serviceCards.map((_, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => {
                      pauseServiceAutoSlide();
                      scrollToServiceIndex(index);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.servicePaginationDot,
                        serviceCardIndex === index && styles.servicePaginationDotActive,
                      ]}
                    />
                  </TouchableOpacity>
                ))}
              </View>
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
                    onPress={handleRideHistoryPress}
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
                    onPress={handleBookFirstRidePress}
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
                    onPress={handleRideRequestPress}
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

          {/* Home & Professional Services */}
          <View style={[styles.serviceSection, { paddingHorizontal: basePadding }]}>
            <View style={styles.serviceBlock}>
              <View style={styles.serviceHeader}>
                <View style={styles.serviceTitleContainer}>
                  <Text style={styles.serviceTitle}>Home Services</Text>
                </View>
                <TouchableOpacity style={styles.viewAllButton} onPress={() => navigation.navigate('HomeServices', { screen: 'HomeServicesHub' })}>
                  <Text style={styles.viewAllText}>View All</Text>
                  <Ionicons name="chevron-forward" size={16} color="#0EA5E9" />
                </TouchableOpacity>
              </View>
              {recentServiceBookings.length > 0 ? (
                <View style={styles.destinationsList}>
                  {recentServiceBookings.map((booking) => (
                    <TouchableOpacity
                      key={booking.id}
                      style={styles.destinationCard}
                      onPress={() => navigation.navigate('HomeServices', { screen: 'ServiceBookingDetail', params: { bookingId: booking.id } })}
                    >
                      <View style={[styles.destinationIconContainer, { backgroundColor: '#10B981' }]}>
                        <Ionicons name="construct-outline" size={18} color="#FFFFFF" />
                      </View>
                      <View style={styles.destinationContent}>
                        <Text style={styles.destinationName} numberOfLines={1}>{booking.category?.name}</Text>
                        <Text style={styles.destinationDate}>{booking.serviceAddress}</Text>
                      </View>
                      <Text style={[styles.viewAllText, { fontSize: 12 }]}>{booking.status}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyDestinationsContainer}>
                  <Ionicons name="construct-outline" size={32} color="#9CA3AF" />
                  <Text style={styles.emptyDestinationsTitle}>No service bookings yet</Text>
                  <Text style={styles.emptyDestinationsSubtitle}>Book plumbing, cleaning, electrical & more</Text>
                  <TouchableOpacity style={styles.bookFirstRideButton} onPress={() => navigation.navigate('HomeServices', { screen: 'HomeServicesHub' })}>
                    <Text style={styles.bookFirstRideButtonText}>Book a Service</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Properties */}
            <View style={[styles.serviceBlock, { marginTop: 24 }]}>
              <View style={styles.serviceHeader}>
                <View style={styles.serviceTitleContainer}>
                  <Text style={styles.serviceTitle}>Properties</Text>
                </View>
                <TouchableOpacity style={styles.viewAllButton} onPress={() => navigation.navigate('RealEstate', { screen: 'RealEstateHub' })}>
                  <Text style={styles.viewAllText}>View All</Text>
                  <Ionicons name="chevron-forward" size={16} color="#0EA5E9" />
                </TouchableOpacity>
              </View>
              {featuredProperties.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {featuredProperties.map((listing) => {
                    const coverUrl = getListingCoverUrl(listing);
                    return (
                    <TouchableOpacity
                      key={listing.id}
                      style={{ width: 200, marginRight: 12, backgroundColor: '#F9FAFB', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' }}
                      onPress={() => navigation.navigate('RealEstate', { screen: 'PropertyDetail', params: { listingId: listing.id } })}
                    >
                      {coverUrl ? (
                        <Image source={{ uri: coverUrl }} style={{ width: '100%', height: 100 }} resizeMode="cover" />
                      ) : (
                        <View style={{ width: '100%', height: 100, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name="business-outline" size={32} color="#7C3AED" />
                        </View>
                      )}
                      <View style={{ padding: 10 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#1F2937' }} numberOfLines={1}>{listing.title}</Text>
                        <Text style={{ fontSize: 12, color: '#7C3AED', marginTop: 4 }}>{listing.currency} {Number(listing.price).toLocaleString()}</Text>
                        <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{listing.city}</Text>
                      </View>
                    </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              ) : (
                <View style={styles.emptyDestinationsContainer}>
                  <Ionicons name="bed-outline" size={32} color="#9CA3AF" />
                  <Text style={styles.emptyDestinationsTitle}>Explore stays & real estate</Text>
                  <Text style={styles.emptyDestinationsSubtitle}>Hotels, apartments, lodges, homes & land</Text>
                  <TouchableOpacity style={[styles.bookFirstRideButton, { backgroundColor: '#7C3AED' }]} onPress={() => navigation.navigate('RealEstate', { screen: 'RealEstateHub' })}>
                    <Text style={styles.bookFirstRideButtonText}>Browse Properties</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Promotions */}
          <View style={styles.promotionsContainer}>
            <View style={styles.promotionsHeader}>
              <Text style={styles.promotionsTitle}>Promotions</Text>
              <View style={styles.promotionsControls}>
                <TouchableOpacity style={styles.promotionControl} onPress={handlePromotionPrev} activeOpacity={0.7}>
                  <Ionicons name="chevron-back-outline" size={20} color="#9CA3AF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.promotionControl} onPress={handlePromotionNext} activeOpacity={0.7}>
                  <Ionicons name="chevron-forward-outline" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>
            
            <ScrollView
              ref={promotionsScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              onScrollBeginDrag={pausePromotionAutoSlide}
              onMomentumScrollEnd={handlePromotionMomentumEnd}
              style={{ width: promotionCardWidth, alignSelf: 'center' }}
              contentContainerStyle={styles.promotionsScrollContent}
            >
              {promotions.map((promo) => (
                <View
                  key={promo.id}
                  style={[
                    styles.promotionCard,
                    { width: promotionCardWidth, backgroundColor: promo.gradient[0] },
                  ]}
                >
                  <View style={styles.promotionCardDecor}>
                    <Ionicons name={promo.icon} size={88} color="rgba(255, 255, 255, 0.12)" />
                  </View>
                  <View style={styles.promotionContent}>
                    <View style={styles.promotionBadge}>
                      <Text style={styles.promotionBadgeText}>{promo.title}</Text>
                    </View>
                    <Text style={styles.promotionTitle}>{promo.subtitle}</Text>
                    <Text style={styles.promotionDescription}>{promo.description}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.promotionButton}
                    onPress={() => {
                      pausePromotionAutoSlide();
                      navigation.navigate(promo.action);
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.promotionButtonText, { color: promo.accentColor }]}>
                      {promo.buttonText}
                    </Text>
                    <Ionicons name="arrow-forward" size={14} color={promo.accentColor} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <View style={styles.promotionPagination}>
              {promotions.map((promo, index) => (
                <TouchableOpacity
                  key={promo.id}
                  onPress={() => {
                    pausePromotionAutoSlide();
                    scrollToPromotionIndex(index);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.promotionPaginationDot,
                      promotionIndex === index && styles.promotionPaginationDotActive,
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>
            
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
                        <Text style={styles.benefitText}>Earn per ride request</Text>
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
          onPress={() => {
            if (!user && !token) {
              promptLogin('Login to view your shopping cart.');
              return;
            }
            navigation.navigate('ShoppingCart');
          }}
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

      {/* Update Prompt - render last to avoid affecting layout/safe area */}
      <AppUpdateBottomSheet
        isVisible={isUpdateVisible}
        onClose={() => setIsUpdateVisible(false)}
        message={updateInfo?.message}
        mandatory={updateInfo?.mandatory}
        storeUrl={updateInfo?.storeUrl}
        latestVersion={updateInfo?.latestVersion}
      />

      

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
    fontSize: isLargeTablet ? 16 : 14,
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
    padding: basePadding,
    backgroundColor: '#FFFFFF',
    alignSelf: isLargeTablet ? 'center' : undefined,
    width: isLargeTablet ? '100%' : undefined,
    maxWidth: isLargeTablet ? contentMaxWidth : undefined,
  },
  welcomeTitle: {
    fontSize: isLargeTablet ? 28 : 20,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: isLargeTablet ? 18 : 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  serviceCarouselContainer: {
    marginTop: 4,
  },
  serviceCarouselContent: {
    alignItems: 'center',
  },
  serviceCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  serviceCardImage: {
    width: '100%',
    height: isLargeTablet ? 220 : 180,
    justifyContent: 'flex-end',
  },
  serviceCardImageStyle: {
    borderRadius: 16,
  },
  serviceCardOverlayFull: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    paddingHorizontal: isLargeTablet ? 24 : 20,
    paddingVertical: isLargeTablet ? 22 : 18,
    borderRadius: 16,
  },
  serviceCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(14, 165, 233, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },
  serviceCardBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  serviceCardTitle: {
    fontSize: isLargeTablet ? 26 : 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  serviceCardSubtitle: {
    fontSize: isLargeTablet ? 15 : 13,
    color: 'rgba(255, 255, 255, 0.92)',
    marginTop: 4,
    lineHeight: isLargeTablet ? 22 : 18,
  },
  serviceCardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    marginTop: 14,
  },
  serviceCardActionText: {
    fontSize: isLargeTablet ? 15 : 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  servicePagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  servicePaginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
  },
  servicePaginationDotActive: {
    width: 22,
    backgroundColor: '#0EA5E9',
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
    paddingHorizontal: basePadding,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    alignSelf: isLargeTablet ? 'center' : undefined,
    width: isLargeTablet ? '100%' : undefined,
    maxWidth: isLargeTablet ? contentMaxWidth : undefined,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: isLargeTablet ? 28 : 25,
    borderWidth: 2,
    borderColor: '#1E40AF',
    paddingHorizontal: 16,
    paddingVertical: isLargeTablet ? 14 : 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: isLargeTablet ? 18 : 16,
    color: '#1F2937',
    justifyContent: 'center',
  },
  searchPlaceholder: {
    fontSize: isLargeTablet ? 18 : 16,
    color: '#9CA3AF',
  },
  quickActionsContainer: {
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: isLargeTablet ? basePadding : undefined,
    alignSelf: isLargeTablet ? 'center' : undefined,
    width: isLargeTablet ? '100%' : undefined,
    maxWidth: isLargeTablet ? contentMaxWidth : undefined,
  },
  sectionTitle: {
    fontSize: isLargeTablet ? 16 : 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
    paddingHorizontal: basePadding,
  },
  quickActionItem: {
    alignItems: 'center',
    marginLeft: 16,
    minWidth: 70,
  },
  quickActionIcon: {
    width: isLargeTablet ? 64 : 56,
    height: isLargeTablet ? 64 : 56,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: isLargeTablet ? 14 : 12,
    color: '#374151',
    textAlign: 'center',
  },
  serviceSection: {
    paddingHorizontal: basePadding,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    alignSelf: isLargeTablet ? 'center' : undefined,
    width: isLargeTablet ? '100%' : undefined,
    maxWidth: isLargeTablet ? contentMaxWidth : undefined,
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
    fontSize: isLargeTablet ? 22 : 18,
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
    fontSize: isLargeTablet ? 16 : 14,
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
    fontSize: isLargeTablet ? 16 : 14,
    color: '#6B7280',
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 16,
    minWidth: 60,
  },
  categoryIcon: {
    width: isLargeTablet ? 56 : 48,
    height: isLargeTablet ? 56 : 48,
    backgroundColor: '#F0F4FF',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  categoryName: {
    fontSize: isLargeTablet ? 14 : 12,
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
    paddingHorizontal: isLargeTablet ? basePadding : undefined,
    alignSelf: isLargeTablet ? 'center' : undefined,
    width: isLargeTablet ? '100%' : undefined,
    maxWidth: isLargeTablet ? contentMaxWidth : undefined,
  },
  promotionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: basePadding,
    marginBottom: 12,
  },
  promotionsTitle: {
    fontSize: isLargeTablet ? 24 : 18,
    fontWeight: '500',
    color: '#1F2937',
  },
  promotionsControls: {
    flexDirection: 'row',
  },
  promotionControl: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  promotionsScrollContent: {
    alignItems: 'center',
  },
  promotionCard: {
    height: isLargeTablet ? 168 : 156,
    borderRadius: 16,
    padding: isLargeTablet ? 20 : 18,
    justifyContent: 'space-between',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  promotionCardDecor: {
    position: 'absolute',
    right: -8,
    top: -8,
  },
  promotionContent: {
    flex: 1,
    zIndex: 1,
  },
  promotionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },
  promotionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  promotionTitle: {
    fontSize: isLargeTablet ? 24 : 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  promotionDescription: {
    fontSize: isLargeTablet ? 14 : 13,
    color: 'rgba(255, 255, 255, 0.88)',
    marginTop: 6,
    lineHeight: isLargeTablet ? 20 : 18,
  },
  promotionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    zIndex: 1,
  },
  promotionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  promotionPagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingHorizontal: basePadding,
  },
  promotionPaginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
  },
  promotionPaginationDotActive: {
    width: 22,
    backgroundColor: '#0EA5E9',
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
    fontSize: isLargeTablet ? 14 : 12,
    color: '#6B7280',
    marginTop: 4,
  },
  activeNavText: {
    color: '#14B8A6',
  },

  // Become Rider Section Styles
  becomeRiderContainer: {
    padding: isLargeTablet ? 24 : 20,
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    alignSelf: isLargeTablet ? 'center' : undefined,
    width: isLargeTablet ? '100%' : undefined,
    maxWidth: isLargeTablet ? contentMaxWidth : undefined,
  },
  becomeRiderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  becomeRiderTitle: {
    fontSize: isLargeTablet ? 28 : 22,
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