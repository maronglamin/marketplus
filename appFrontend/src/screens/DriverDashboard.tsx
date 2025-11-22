import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Switch,
  Alert,
  ActivityIndicator,
  Dimensions,
  Modal,
  AppState,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useKeepAwake } from 'expo-keep-awake';
import type { AppStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../contexts/AuthContext';
import { GoogleMapView, type GoogleMapViewRef, type MapLocation, type RouteData } from '../components/GoogleMapView';
import { rideService, type LocationData } from '../services/rideService';
import { driverService, DriverService, type DriverStats as ServiceDriverStats, type RideRequest as ServiceRideRequest } from '../services/driverService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationSound } from '../utils/notificationSound';
import { debounce, throttle } from '../utils/rateLimiter';

type DriverDashboardNavigationProp = NativeStackNavigationProp<AppStackParamList, 'DriverDashboard'>;

interface DriverStats {
  totalRides: number;
  totalEarnings: number;
  rating: number;
  onlineHours: number;
  todayEarnings: number;
  weeklyEarnings: number;
  monthlyEarnings: number;
}

interface RideRequest {
  id: string;
  requestId?: string; // Add requestId field for compatibility
  requestType?: 'DIRECT' | 'BROADCAST';
  customerName: string;
  customerPhone: string;
  customerNotes?: string;
  requestTime: string;
  pickup: string;
  destination: string;
  distance: string;
  duration: string;
  price: string;
  currencySymbol: string;
  customerRating: number;
  pickupLocation: MapLocation;
  destinationLocation: MapLocation;
}

const { width, height } = Dimensions.get('window');

export function DriverDashboard() {
  const navigation = useNavigation<DriverDashboardNavigationProp>();
  const { user } = useAuth();
  const mapRef = useRef<GoogleMapViewRef>(null);
  const insets = useSafeAreaInsets();
  useKeepAwake();
  const DRIVER_ONLINE_CACHE_KEY = 'driver_last_online_state';
  const DRIVER_ONLINE_SINCE_KEY = 'driver_online_since_ms';
  const [onlineSinceMs, setOnlineSinceMs] = useState<number | null>(null);
  
  const [isOnline, setIsOnline] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<MapLocation | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [pendingRequests, setPendingRequests] = useState<RideRequest[]>([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showRequestsList, setShowRequestsList] = useState(false);
  const [showRequestDetail, setShowRequestDetail] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RideRequest | null>(null);
  const [mapRequestMarkers, setMapRequestMarkers] = useState<any[]>([]);
  const [currentActiveRide, setCurrentActiveRide] = useState<RideRequest | null>(null);
  const [ridePhase, setRidePhase] = useState<'navigating' | 'pickup' | 'driving' | null>(null);
  const [stats, setStats] = useState<ServiceDriverStats>({
    totalRides: 0,
    totalEarnings: 0,
    rating: 0,
    onlineHours: 0,
    todayEarnings: 0,
    weeklyEarnings: 0,
    monthlyEarnings: 0,
  });
  const [showRequestNotification, setShowRequestNotification] = useState(false);
  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);
  const ensuredOnlineRef = useRef(false);

  useEffect(() => {
    // Pre-hydrate toggle from cached state to avoid flicker
    (async () => {
      try {
        const cached = await AsyncStorage.getItem(DRIVER_ONLINE_CACHE_KEY);
        if (cached !== null) {
          const cachedValue = JSON.parse(cached);
          if (typeof cachedValue === 'boolean') {
            setIsOnline(cachedValue);
          }
        }
        const sinceVal = await AsyncStorage.getItem(DRIVER_ONLINE_SINCE_KEY);
        if (sinceVal) {
          const parsed = parseInt(sinceVal, 10);
          if (!Number.isNaN(parsed)) {
            setOnlineSinceMs(parsed);
          }
        }
      } catch (e) {
        // no-op
      }
    })();
    getCurrentLocation();
    loadDriverStats();
    loadDriverOnlineStatus(); // Load driver's current online status
    // Real-time requests are now handled by the polling useEffect
    
    // Initialize notification sound
    notificationSound.initialize();
    
    // Cleanup on unmount
    return () => {
      notificationSound.cleanup();
    };
  }, []); // Only run once on mount, not when isOnline changes

  // Refresh backend online status whenever screen gains focus
  useFocusEffect(
    useCallback(() => {
      // Immediately reflect cached state, then reconcile with backend
      (async () => {
        try {
          const cached = await AsyncStorage.getItem(DRIVER_ONLINE_CACHE_KEY);
          if (cached !== null) {
            const cachedValue = JSON.parse(cached);
            if (typeof cachedValue === 'boolean') {
              setIsOnline(cachedValue);
            }
          }
          const sinceVal = await AsyncStorage.getItem(DRIVER_ONLINE_SINCE_KEY);
          if (sinceVal) {
            const parsed = parseInt(sinceVal, 10);
            if (!Number.isNaN(parsed)) {
              setOnlineSinceMs(parsed);
            } else {
              setOnlineSinceMs(null);
            }
          } else {
            setOnlineSinceMs(null);
          }
        } catch (e) {
          // no-op
        }
      })();
      loadDriverOnlineStatus();
    }, [])
  );

  // Automatic location updates when online (use location watcher for more frequent updates)
  useEffect(() => {
    let unsubscribed = false;
    const startWatching = async () => {
      try {
        if (!isOnline) return;
        // Request permissions if not already granted
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Location permission not granted for driver watch');
          return;
        }
        // Avoid duplicate watchers
        if (locationWatchRef.current) {
          return;
        }
        // Start watching position with reasonable intervals for real-time updates
        const sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 15000, // 15 seconds
            distanceInterval: 30, // update if moved ~30 meters for higher precision
          },
          (loc) => {
            if (unsubscribed) return;
            const locObj: MapLocation = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              // address will be filled by throttledLocationUpdate via reverse geocode
            };
            // Push update through throttled pipeline; also updates backend if online
            throttledLocationUpdate(locObj);
          }
        );
        locationWatchRef.current = sub;
      } catch (err) {
        console.error('Error starting location watch:', err);
      }
    };
    if (isOnline) {
      startWatching();
    } else {
      // Stop watching when going offline
      if (locationWatchRef.current) {
        try { locationWatchRef.current.remove(); } catch {}
        locationWatchRef.current = null;
      }
    }
    return () => {
      unsubscribed = true;
      if (locationWatchRef.current) {
        try { locationWatchRef.current.remove(); } catch {}
        locationWatchRef.current = null;
      }
    };
  }, [isOnline]);

  // Real-time polling for nearby ride requests when online
  useEffect(() => {
    let requestInterval: number | null = null;

    if (isOnline && currentLocation) {
      // Load requests immediately
      loadNearbyRequests();
      
      // Poll for new requests every 45 seconds (increased from 30 to reduce rate)
      requestInterval = setInterval(() => {
        loadNearbyRequests();
      }, 45000); // 45 seconds
    }

    return () => {
      if (requestInterval) {
        clearInterval(requestInterval);
      }
    };
  }, [isOnline, currentLocation]);

  // Handle component unmount - preserve online status
  useEffect(() => {
    return () => {
      // When component unmounts, don't change the online status
      // This allows the driver to return to the same online/offline state
      console.log('🚪 Driver dashboard unmounting - preserving online status');
    };
  }, []);

  // Handle app state changes to preserve online status
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        // App came to foreground - reload online status if needed
        console.log('📱 App came to foreground - checking online status');
        if (isOnline) {
          // Reload nearby requests if driver was online
          loadNearbyRequests();
        }
      } else if (nextAppState === 'background') {
        // App went to background - preserve online status
        console.log('📱 App went to background - preserving online status');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [isOnline]);



  // Debug useEffect hooks
  useEffect(() => {
    console.log('🔄 showRequestDetail state changed to:', showRequestDetail);
  }, [showRequestDetail]);

  useEffect(() => {
    console.log('🔄 selectedRequest state changed to:', selectedRequest?.customerName);
  }, [selectedRequest]);

  // Debug isOnline state changes
  useEffect(() => {
    console.log('🔄 isOnline state changed to:', isOnline);
  }, [isOnline]);

  const getCurrentLocation = async () => {
    try {
      setLoadingLocation(true);
      console.log('🔍 Getting driver current location...');
      
      // Request permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission denied');
      }

      // Get current position with optimized settings
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced, // Use balanced accuracy for faster response
      });

      // Get the actual address using reverse geocoding
      const address = await rideService.reverseGeocode(
        location.coords.latitude,
        location.coords.longitude
      );

      const newLocation: MapLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: address
      };

      console.log('📍 Driver location obtained:', newLocation);
      setCurrentLocation(newLocation);
      setLoadingLocation(false);
      
    } catch (error) {
      console.error('Error getting driver location:', error);
      setLoadingLocation(false);
      Alert.alert('Location Error', 'Unable to get your current location.');
    }
  };

  const loadDriverStats = async () => {
    try {
      console.log('📊 Loading driver stats from API...');
      const driverStats = await driverService.getDriverStats();
      console.log('📊 Driver stats received:', driverStats);
      console.log('📊 Today online hours:', driverStats.todayOnlineHours);
      console.log('📊 General online hours:', driverStats.onlineHours);
      setStats(driverStats);
    } catch (error) {
      console.error('Error loading driver stats:', error);
      // Fallback to mock data if API fails
      setStats({
        totalRides: 127,
        totalEarnings: 2450.75,
        rating: 4.8,
        onlineHours: 156,
        todayEarnings: 45.50,
        todayCurrency: 'GMD',
        weeklyEarnings: 320.25,
        monthlyEarnings: 1250.80,
        currency: 'GMD',
        currencySymbol: 'D',
        todayRidesCount: 0,
        todayRidesWithRatings: 0,
        todayOnlineHours: 0,
      });
    }
  };

  const loadDriverOnlineStatus = async () => {
    try {
      console.log('🔄 Loading driver online status from server...');
      const response = await driverService.getDriverProfile();
      
      if (response && response.success && response.data) {
        console.log('📊 Full driver profile response:', response.data);
        
        // Check if driver status is "ONLINE" in the database
        // The backend stores both isOnline (boolean) and status (enum: ONLINE/OFFLINE/BUSY/SUSPENDED)
        const driverStatus = response.data.status || 'OFFLINE';
        const isOnlineBoolean = response.data.isOnline || false;
        
        // Treat BUSY as online for the toggle; fallback to isOnline boolean
        const isDriverOnline = (driverStatus === 'ONLINE' || driverStatus === 'BUSY') || isOnlineBoolean;
        
        console.log('📱 Driver status from database:', driverStatus);
        console.log('📱 Driver isOnline boolean from database:', isOnlineBoolean);
        console.log('📱 Driver online status determined:', isDriverOnline);
        
        // Set the online state based on database status and ensure UI reflects backend state
        setIsOnline(isDriverOnline);
        try {
          await AsyncStorage.setItem(DRIVER_ONLINE_CACHE_KEY, JSON.stringify(isDriverOnline));
        } catch (e) {
          // no-op
        }
        if (isDriverOnline && !ensuredOnlineRef.current) {
          ensuredOnlineRef.current = true;
          console.log('✅ Forcing online UI state to match backend');
          // Trigger immediate nearby requests fetch
          loadNearbyRequests();
          // Kick a location refresh to seed watcher
          try {
            if (mapRef.current) {
              mapRef.current.getCurrentLocation();
            }
          } catch (e) {
            console.warn('⚠️ Unable to trigger immediate location refresh on status sync', e);
          }
          // Seed onlineSince if missing
          try {
            const existingSince = await AsyncStorage.getItem(DRIVER_ONLINE_SINCE_KEY);
            if (!existingSince) {
              const nowMs = Date.now();
              setOnlineSinceMs(nowMs);
              await AsyncStorage.setItem(DRIVER_ONLINE_SINCE_KEY, String(nowMs));
            }
          } catch (_e) {
            // no-op
          }
        }
        if (!isDriverOnline) {
          console.log('🔴 Driver is offline, not loading requests');
        }
      } else {
        console.log('⚠️ No driver profile data received');
        // Preserve existing toggle state on missing data
      }
    } catch (error) {
      console.error('❌ Error loading driver online status:', error);
      // Preserve current state if API fails
    }
  };

  // Throttled version of loadNearbyRequests to prevent rate limiting
  const throttledLoadNearbyRequests = useCallback(
    throttle(async () => {
      try {
        if (!currentLocation) {
          console.log('⚠️ No current location available for requests');
          return;
        }

        console.log('🔍 Loading nearby ride requests...');
        
        // Use the new real API to get nearby ride requests
        const requests = await DriverService.getNearbyRideRequests(
          currentLocation.latitude,
          currentLocation.longitude,
          5 // 5km radius
        );

        console.log('📊 Nearby requests response:', requests);

        if (requests && requests.length > 0) {
          // Transform API response to match our interface
          const transformedRequests: RideRequest[] = requests.map((req: any, index: number) => {
            // Safely handle estimatedPrice - convert to number if it's a string
            const estimatedPrice = typeof req.estimatedPrice === 'string' 
              ? parseFloat(req.estimatedPrice) 
              : req.estimatedPrice || 0;
            
            // Safely handle estimatedDistance - convert to number if it's a string
            const estimatedDistance = typeof req.estimatedDistance === 'string'
              ? parseFloat(req.estimatedDistance)
              : req.estimatedDistance || 0;

            // Format request time
            const requestTime = req.requestedAt ? new Date(req.requestedAt).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }) : '';

            // Debug currency data
            console.log('💰 Currency data for request:', {
              requestId: req.requestId,
              currency: req.currency,
              currencySymbol: req.currencySymbol,
              estimatedPrice: estimatedPrice
            });

            return {
              id: req.requestId, // Use requestId instead of id for the API call
              requestId: req.requestId, // Keep both for compatibility
              requestType: req.requestType || 'BROADCAST',
              customerName: `${req.customer?.firstName || 'Customer'} ${req.customer?.lastName || ''}`,
              customerPhone: req.customer?.phoneNumber || '',
              customerNotes: req.customerNotes || '',
              requestTime: requestTime,
              pickup: req.pickupLocation?.address || 'Pickup Location',
              destination: req.destinationLocation?.address || 'Destination',
              distance: `${estimatedDistance.toFixed(1)} km`,
              duration: `${req.estimatedDuration || 0} min`,
              price: `${req.currencySymbol || '$'}${estimatedPrice.toFixed(2)}`,
              currencySymbol: req.currencySymbol,
              customerRating: req.customer?.rating || 4.5,
              pickupLocation: req.pickupLocation,
              destinationLocation: req.destinationLocation
            };
          });
          
          console.log('✅ Transformed requests:', transformedRequests);
          setPendingRequests(transformedRequests);
          
          // Show request markers on map
          if (mapRef.current) {
            transformedRequests.forEach((request, index) => {
              // Add a small delay to show markers one by one
              setTimeout(() => {
                mapRef.current?.addRequestMarker(request, index);
              }, index * 500);
            });
          }

          // Show floating notification for new requests
          if (transformedRequests.length > 0) {
            setShowRequestNotification(true);
            
            // Play notification sound for new requests
            notificationSound.playNotification();
            
            // Auto-hide notification after 10 seconds
            setTimeout(() => {
              setShowRequestNotification(false);
            }, 10000);
          }
        } else {
          console.log('📭 No nearby ride requests found');
          setPendingRequests([]);
          setShowRequestNotification(false);
        }
      } catch (error) {
        console.error('❌ Error loading nearby requests:', error);
        setPendingRequests([]);
        setShowRequestNotification(false);
      }
    }, 5000), // Throttle to max once every 5 seconds
    [currentLocation]
  );

  const loadNearbyRequests = async () => {
    await throttledLoadNearbyRequests();
  };

  // Debounced online toggle to prevent rapid status changes
  const debouncedOnlineToggle = useCallback(
    debounce(async (value: boolean) => {
      try {
        console.log('🔄 Starting online toggle process:', { value, hasLocation: !!currentLocation });
        
        // If going online, we need current location
        if (value && !currentLocation) {
          Alert.alert('Location Required', 'Please wait for location to load before going online.');
          return;
        }

        // Prepare location data for API call
        const locationData = value && currentLocation ? {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          address: currentLocation.address
        } : undefined;

        console.log('📡 Calling updateDriverStatus API:', { value, locationData });
        await driverService.updateDriverStatus(value, locationData);
        console.log('✅ updateDriverStatus API call completed');
        
        // Update the local state immediately after successful API call
        console.log('🔄 Setting isOnline state to:', value);
        setIsOnline(value);
        try {
          await AsyncStorage.setItem(DRIVER_ONLINE_CACHE_KEY, JSON.stringify(value));
          if (value) {
            const nowMs = Date.now();
            setOnlineSinceMs(nowMs);
            await AsyncStorage.setItem(DRIVER_ONLINE_SINCE_KEY, String(nowMs));
          } else {
            setOnlineSinceMs(null);
            await AsyncStorage.removeItem(DRIVER_ONLINE_SINCE_KEY);
          }
        } catch (e) {
          // no-op
        }
        
        // If going online, force an immediate location update for accuracy
        if (value && currentLocation) {
          setTimeout(async () => {
            try {
              console.log('📍 Forcing location update after going online');
              await driverService.smartUpdateDriverLocation({
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                address: currentLocation.address
              }, true); // Force update
              console.log('✅ Forced location update completed');
            } catch (error) {
              console.error('❌ Error in forced location update:', error);
            }
          }, 1000); // Small delay to ensure status is updated first
        }
        
        if (value) {
          console.log('🎉 Driver is now online, loading nearby requests');
          Alert.alert('Online', 'You are now online and ready to receive ride requests!');
          loadNearbyRequests();
        } else {
          console.log('🔴 Driver is now offline, clearing requests');
          Alert.alert('Offline', 'You are now offline and will not receive ride requests.');
          setPendingRequests([]);
          // Clear request markers from map
          if (mapRef.current) {
            mapRef.current.clearRequestMarkers();
          }
        }
      } catch (error) {
        console.error('❌ Error updating driver status:', error);
        Alert.alert('Error', 'Failed to update status. Please try again.');
        // Don't update local state if API call failed
      }
    }, 1000), // Debounce for 1 second
    [currentLocation]
  );

  const handleOnlineToggle = async (value: boolean) => {
    console.log('🎛️ handleOnlineToggle called with value:', value);
    console.log('🔄 Current isOnline state:', isOnline);
    
    // Immediately update the UI state for better responsiveness
    // The actual API call will happen in the debounced function
    setIsOnline(value);
    
    // Call the debounced function for the actual API update
    await debouncedOnlineToggle(value);
  };

  const handleCenterMap = () => {
    if (mapRef.current && currentLocation) {
      mapRef.current.centerMap(currentLocation);
    }
  };

  const handleRideHistory = () => {
    navigation.navigate('DriverRequests');
  };

  const handleEarnings = () => {
    navigation.navigate('DriverEarnings');
  };

  const handleRentals = () => {
    navigation.navigate('RentalEarnings');
  };

  const handleSettings = () => {
    navigation.navigate('DriverSettings');
  };

  const handleRequestPress = () => {
    if (pendingRequests.length > 0) {
      setShowRequestsList(true);
    }
  };

  const handleAcceptRequest = async (request: RideRequest) => {
    try {
      console.log('✅ Accepting request from:', request.customerName);
      console.log('📋 Request details:', {
        id: request.id,
        requestId: request.requestId,
        customerName: request.customerName
      });
      
      // Accept the request via real API using the service method
      const response = await driverService.acceptRideRequest(request.id);

      console.log('📊 Accept response:', response);

      if (response.success) {
        console.log('✅ Request accepted successfully:', response);
        
        // Close the detail modal
        setShowRequestDetail(false);
        
        // Remove the accepted request from pending list
        setPendingRequests(prev => prev.filter(r => r.id !== request.id));
        
        // Remove this specific request marker from map
        if (mapRef.current) {
          // Clear all markers and re-add the remaining ones
          mapRef.current.clearRequestMarkers();
          
          // Re-add remaining request markers
          const remainingRequests = pendingRequests.filter(r => r.id !== request.id);
          remainingRequests.forEach((req, index) => {
            mapRef.current?.addRequestMarker(req, index);
          });
        }
        
        // Start navigation with the accepted request
        handleStartNavigation(request);
        
        // Show success message
        Alert.alert(
          'Request Accepted! 🎉',
          `You're now on your way to pick up ${request.customerName}.`,
          [{ text: 'OK' }]
        );
      } else {
        console.log('❌ Accept response indicates failure:', response);
        throw new Error(response.message || 'Failed to accept request');
      }
    } catch (error: any) {
      console.error('❌ Error accepting request:', error);
      console.error('❌ Error details:', {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message
      });
      
      let errorMessage = 'Failed to accept request. Please try again.';
      
      if (error?.response?.status === 400) {
        const responseData = error.response?.data;
        errorMessage = responseData?.message || 'Request is no longer available for acceptance.';
      } else if (error?.response?.status === 403) {
        errorMessage = 'You are not authorized to accept this request.';
      } else if (error?.response?.status === 404) {
        errorMessage = 'Request not found. It may have been cancelled or expired.';
      } else if (error?.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error?.message?.includes('Network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      Alert.alert(
        'Accept Request Failed',
        errorMessage,
        [
          { text: 'OK', style: 'default' },
          { 
            text: 'Try Again', 
            onPress: () => handleAcceptRequest(request)
          }
        ]
      );
    }
  };

  const handleRejectRequest = async (request: RideRequest) => {
    try {
      console.log('❌ Rejecting request from:', request.customerName);
      
      // Reject the request via real API
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/ride-requests/${request.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await AsyncStorage.getItem('token')}`
        },
        body: JSON.stringify({
          cancelledBy: 'driver',
          cancellationReason: 'Driver rejected'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Request rejected:', data);
      
      // Close the detail modal
      setShowRequestDetail(false);
      
      // Remove the request from pending list
      setPendingRequests(prev => prev.filter(r => r.id !== request.id));
      
      // Remove this specific request marker from map
      if (mapRef.current) {
        // Clear all markers and re-add the remaining ones
        mapRef.current.clearRequestMarkers();
        
        // Re-add remaining request markers
        const remainingRequests = pendingRequests.filter(r => r.id !== request.id);
        remainingRequests.forEach((req, index) => {
          mapRef.current?.addRequestMarker(req, index);
        });
      }
      
      // Show rejection message
      Alert.alert(
        'Request Rejected',
        `You've rejected ${request.customerName}'s request.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('❌ Error rejecting request:', error);
      Alert.alert('Error', 'Failed to reject request. Please try again.');
    }
  };

  const handleViewRequest = (request: RideRequest) => {
    console.log('🎯 handleViewRequest called with:', request.customerName);
    console.log('📋 Setting selectedRequest:', request);
    console.log('🔍 Current showRequestsList state:', showRequestsList);
    console.log('🔍 Current showRequestDetail state:', showRequestDetail);
    
    // Close the requests list modal first
    setShowRequestsList(false);
    
    // Set the selected request and show detail modal
    setSelectedRequest(request);
    setShowRequestDetail(true);
    
    console.log('✅ State updated - showRequestDetail should be true');
    console.log('✅ Requests list modal closed, detail modal should open');
    
    // Add a small delay to ensure the first modal closes before opening the second
    setTimeout(() => {
      console.log('⏰ Timeout executed - checking if detail modal is visible');
    }, 100);
  };

  const handleMapReady = () => {
    console.log('Driver map is ready');
  };

  // Throttled location update to prevent rate limiting
  const throttledLocationUpdate = useCallback(
    throttle(async (location: MapLocation) => {
      try {
        console.log('📍 Driver real location obtained:', location);
        
        // Get the actual address using reverse geocoding
        const address = await rideService.reverseGeocode(
          location.latitude,
          location.longitude
        );

        const updatedLocation: MapLocation = {
          ...location,
          address: address
        };

        setCurrentLocation(updatedLocation);
        setLoadingLocation(false);
        
        // Only update driver location via API if driver is online
        if (isOnline) {
          await driverService.smartUpdateDriverLocation({
            latitude: location.latitude,
            longitude: location.longitude,
            address: address
          });
        }
      } catch (error) {
        console.error('Error updating driver location:', error);
      }
    }, 10000), // Throttle to max once every 10 seconds
    [isOnline]
  );

  const handleLocationUpdate = async (location: MapLocation) => {
    await throttledLocationUpdate(location);
  };

  const handleLocationError = (error: string) => {
    console.error('❌ Driver location error:', error);
    setLoadingLocation(false);
    Alert.alert('Location Error', error);
  };

  const getRequestColor = (index: number) => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
    return colors[index % colors.length];
  };

  // Calculate earnings breakdown based on actual price
  const calculateEarningsBreakdown = (price: string, currencySymbol: string) => {
    // Extract numeric value from price string (e.g., "D15.55" -> 15.55)
    const numericPrice = parseFloat(price.replace(/[^0-9.]/g, ''));
    
    if (isNaN(numericPrice)) {
      return {
        baseFare: `${currencySymbol}0.00`,
        distanceBonus: `${currencySymbol}0.00`,
        timeBonus: `${currencySymbol}0.00`,
        total: price
      };
    }

    // Calculate breakdown (example percentages)
    const baseFare = numericPrice * 0.7; // 70% base fare
    const distanceBonus = numericPrice * 0.2; // 20% distance bonus
    const timeBonus = numericPrice * 0.1; // 10% time bonus

    return {
      baseFare: `${currencySymbol}${baseFare.toFixed(2)}`,
      distanceBonus: `${currencySymbol}${distanceBonus.toFixed(2)}`,
      timeBonus: `${currencySymbol}${timeBonus.toFixed(2)}`,
      total: price
    };
  };

  const handleCompleteRide = () => {
    if (currentActiveRide) {
      console.log('✅ Completing ride for:', currentActiveRide.customerName);
      
      Alert.alert(
        'Complete Ride',
        `Complete ride for ${currentActiveRide.customerName}?\n\nEarnings: ${currentActiveRide.price}`,
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Complete',
            onPress: () => {
              // Clear the active ride
              setCurrentActiveRide(null);
              setRidePhase(null);
              
              // Clear the route from map
              if (mapRef.current) {
                mapRef.current.clearRequestMarkers();
              }
              
              // Show completion message
              Alert.alert(
                'Ride Completed! 🎉',
                `You've earned ${currentActiveRide.price} for this ride.`,
                [{ text: 'OK' }]
              );
              
              // Update stats (in a real app, this would be an API call)
              setStats(prev => ({
                ...prev,
                totalRides: prev.totalRides + 1,
                todayEarnings: prev.todayEarnings + parseFloat(currentActiveRide.price.replace('$', ''))
              }));
            }
          }
        ]
      );
    }
  };

  const handleStartNavigation = async (request: RideRequest) => {
    console.log('🧭 Starting navigation to customer:', request.customerName);
    
    // Create a mock pickup location near the driver's current location
    const mockPickupLocation: MapLocation = {
      latitude: currentLocation ? currentLocation.latitude + 0.005 : 13.4432 + 0.005,
      longitude: currentLocation ? currentLocation.longitude + 0.005 : -16.5919 + 0.005,
      address: request.pickup
    };
    
    // Update the request with the mock pickup location
    const updatedRequest = {
      ...request,
      pickupLocation: mockPickupLocation
    };
    
    // Set this as the current active ride
    setCurrentActiveRide(updatedRequest);
    setRidePhase('navigating');
    
    // Close the detail modal
    setShowRequestDetail(false);
    
    // Remove the request from pending list
    setPendingRequests(prev => prev.filter(r => r.id !== request.id));
    
    // Clear all request markers from map
    if (mapRef.current) {
      mapRef.current.clearRequestMarkers();
    }
    
    // Show animated route to mock customer pickup location using actual road routing
    if (mapRef.current && currentLocation) {
      console.log('🗺️ Calculating actual road route to pickup location');
      
      try {
        // Convert MapLocation to LocationData for rideService
        const originLocation: LocationData = {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          address: currentLocation.address || 'Current Location'
        };
        
        const destinationLocation: LocationData = {
          latitude: mockPickupLocation.latitude,
          longitude: mockPickupLocation.longitude,
          address: mockPickupLocation.address || request.pickup
        };
        
        // Get actual road route using Google Maps Directions API
        const routeResult = await rideService.calculateRoute(originLocation, destinationLocation);
        
        if (routeResult && routeResult.bestRoute) {
          console.log('✅ Actual road route calculated successfully');
          
          // Show the route from driver's current location to mock pickup location
          mapRef.current.showRoute(
            currentLocation, // Driver's current location
            mockPickupLocation, // Mock customer pickup location
            routeResult.bestRoute // Actual road route data
          );
          
          // Show navigation started message with actual route data
          const routeData = routeResult.bestRoute;
          Alert.alert(
            'Navigation Started! 🧭',
            `You're navigating to pick up ${request.customerName}.\n\nPickup: ${request.pickup}\nEstimated Time: ${routeData.legs?.[0]?.duration?.text || '8 min'}\nDistance: ${routeData.legs?.[0]?.distance?.text || '2.3 km'}`,
            [
              {
                text: 'View Route',
                onPress: () => {
                  console.log('🗺️ Focusing on route');
                  // Center map on the route
                  if (mapRef.current) {
                    mapRef.current.centerMap(currentLocation);
                  }
                }
              },
              {
                text: 'OK',
                style: 'cancel'
              }
            ]
          );
        } else {
          console.log('⚠️ Could not calculate actual route, using fallback');
          // Fallback to direct route if API fails
          const fallbackRoute: RouteData = {
            legs: [{
              duration: { text: '8 min' },
              distance: { text: '2.3 km' }
            }],
            safetyFeatures: {
              safetyScore: 85,
              recommendedSpeed: 60,
              trafficConditions: 'Optimal driving conditions'
            }
          };
          
          mapRef.current.showRoute(
            currentLocation,
            mockPickupLocation,
            fallbackRoute
          );
          
          Alert.alert(
            'Navigation Started! 🧭',
            `You're navigating to pick up ${request.customerName}.\n\nPickup: ${request.pickup}\nEstimated Time: 8 min\nDistance: 2.3 km`,
            [{ text: 'OK' }]
          );
        }
      } catch (error) {
        console.error('❌ Error calculating route:', error);
        Alert.alert('Navigation Error', 'Unable to calculate route. Please try again.');
      }
    } else {
      Alert.alert('Error', 'Unable to start navigation. Please check your location.');
    }
  };

  const handleReachPickup = () => {
    if (currentActiveRide) {
      console.log('📍 Reached pickup location for:', currentActiveRide.customerName);
      setRidePhase('pickup');
      
      Alert.alert(
        'Reached Pickup Location',
        `You've arrived at ${currentActiveRide.pickup} to pick up ${currentActiveRide.customerName}.`,
        [
          {
            text: 'Start Trip to Destination',
            onPress: async () => {
              console.log('🚗 Starting trip to destination');
              setRidePhase('driving');
              
              // Create a mock destination location
              const mockDestinationLocation: MapLocation = {
                latitude: currentLocation ? currentLocation.latitude + 0.01 : 13.4432 + 0.01,
                longitude: currentLocation ? currentLocation.longitude + 0.01 : -16.5919 + 0.01,
                address: currentActiveRide.destination
              };
              
              // Show route from pickup to destination using actual road routing
              if (mapRef.current && currentActiveRide.pickupLocation) {
                try {
                  // Convert MapLocation to LocationData for rideService
                  const originLocation: LocationData = {
                    latitude: currentActiveRide.pickupLocation.latitude,
                    longitude: currentActiveRide.pickupLocation.longitude,
                    address: currentActiveRide.pickupLocation.address || currentActiveRide.pickup
                  };
                  
                  const destinationLocation: LocationData = {
                    latitude: mockDestinationLocation.latitude,
                    longitude: mockDestinationLocation.longitude,
                    address: mockDestinationLocation.address || currentActiveRide.destination
                  };
                  
                  // Get actual road route using Google Maps Directions API
                  const routeResult = await rideService.calculateRoute(originLocation, destinationLocation);
                  
                  if (routeResult && routeResult.bestRoute) {
                    console.log('✅ Actual road route to destination calculated successfully');
                    
                    mapRef.current.showRoute(
                      currentActiveRide.pickupLocation, // Pickup location
                      mockDestinationLocation, // Destination location
                      routeResult.bestRoute // Actual road route data
                    );
                    
                    const routeData = routeResult.bestRoute;
                    Alert.alert(
                      'Trip Started! 🚗',
                      `You're now driving ${currentActiveRide.customerName} to ${currentActiveRide.destination}.\n\nEstimated Time: ${routeData.legs?.[0]?.duration?.text || currentActiveRide.duration}\nDistance: ${routeData.legs?.[0]?.distance?.text || currentActiveRide.distance}`,
                      [{ text: 'OK' }]
                    );
                  } else {
                    console.log('⚠️ Could not calculate actual route to destination, using fallback');
                    // Fallback to direct route if API fails
                    const fallbackRoute: RouteData = {
                      legs: [{
                        duration: { text: currentActiveRide.duration },
                        distance: { text: currentActiveRide.distance }
                      }],
                      safetyFeatures: {
                        safetyScore: 90,
                        recommendedSpeed: 65,
                        trafficConditions: 'Good traffic conditions'
                      }
                    };
                    
                    mapRef.current.showRoute(
                      currentActiveRide.pickupLocation,
                      mockDestinationLocation,
                      fallbackRoute
                    );
                    
                    Alert.alert(
                      'Trip Started! 🚗',
                      `You're now driving ${currentActiveRide.customerName} to ${currentActiveRide.destination}.\n\nEstimated Time: ${currentActiveRide.duration}\nDistance: ${currentActiveRide.distance}`,
                      [{ text: 'OK' }]
                    );
                  }
                } catch (error) {
                  console.error('❌ Error calculating route to destination:', error);
                  Alert.alert('Navigation Error', 'Unable to calculate route to destination. Please try again.');
                }
              }
            }
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" translucent />
      
      {/* Floating Header */}
      <View style={[
        styles.floatingHeader,
        { top: Platform.OS === 'ios' ? insets.top + 8 : ((StatusBar.currentHeight || 0) + 8) }
      ]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Driver Dashboard</Text>
            <Text style={styles.headerSubtitle}>
              {currentActiveRide 
                ? ridePhase === 'navigating' 
                  ? `Navigating to ${currentActiveRide.customerName}`
                  : ridePhase === 'pickup'
                  ? `Reached pickup for ${currentActiveRide.customerName}`
                  : ridePhase === 'driving'
                  ? `Driving ${currentActiveRide.customerName} to destination`
                  : `En route to ${currentActiveRide.customerName}`
                : `Welcome back, ${user?.firstName || 'Driver'}!`
              }
            </Text>
            {currentActiveRide && (
              <View style={styles.activeRideIndicator}>
                <Ionicons name="car" size={12} color="#10B981" />
                <Text style={styles.activeRideText}>Active Ride</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.settingsButton} onPress={handleSettings}>
            <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Full Screen Map */}
      <View style={styles.fullScreenMapContainer}>
        <GoogleMapView
          ref={mapRef}
          currentLocation={currentLocation || {
            latitude: 13.4432,
            longitude: -16.5919,
            address: 'Loading location...'
          }}
          mode="driver"
          isOnline={isOnline}
          onMapReady={handleMapReady}
          onLocationUpdate={handleLocationUpdate}
          onLocationError={handleLocationError}
          style={styles.map}
        />
        
        {/* Location Loading Overlay */}
        {loadingLocation && (
          <View style={styles.locationLoadingOverlay}>
            <View style={styles.locationLoadingCard}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.locationLoadingText}>Getting your location...</Text>
              <Text style={styles.locationLoadingSubtext}>This helps you receive nearby requests</Text>
            </View>
          </View>
        )}
      </View>

      {/* Compact Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Ionicons name="car-sport" size={16} color="#3B82F6" />
          <Text style={styles.statValue}>{stats.totalRides}</Text>
          <Text style={styles.statLabel}>Rides</Text>
        </View>
        
        <View style={styles.statDivider} />
        
        <View style={styles.statItem}>
          <Ionicons name="cash" size={16} color="#3B82F6" />
          <Text style={styles.statValue}>
            {stats.todayEarnings > 0 
              ? `${stats.currencySymbol || 'D'}${stats.todayEarnings.toFixed(2)}`
              : '0'
            }
          </Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
        
        <View style={styles.statDivider} />
        
        <View style={styles.statItem}>
          <Ionicons name="star" size={16} color="#3B82F6" />
          <Text style={styles.statValue}>{stats.rating}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
        
        <View style={styles.statDivider} />
        
        <View style={styles.statItem}>
          <Ionicons name="time" size={16} color="#3B82F6" />
          {(() => {
            // Derive display online hours:
            // 1) Prefer backend-provided todayOnlineHours
            // 2) Fallback to overall onlineHours
            // 3) If still unavailable and currently online, approximate using onlineSinceMs
            const todayHours = typeof (stats as any).todayOnlineHours === 'number' ? (stats as any).todayOnlineHours : undefined;
            const overallHours = typeof (stats as any).onlineHours === 'number' ? (stats as any).onlineHours : undefined;
            let displayHours: number = 0;
            if (todayHours !== undefined && !Number.isNaN(todayHours) && todayHours > 0) {
              displayHours = todayHours;
            } else if (overallHours !== undefined && !Number.isNaN(overallHours) && overallHours > 0) {
              displayHours = overallHours;
            } else if (isOnline && onlineSinceMs) {
              const diffMs = Date.now() - onlineSinceMs;
              displayHours = Math.max(0, diffMs / (1000 * 60 * 60));
            }
            const formatted = displayHours >= 10 ? Math.round(displayHours).toString() : displayHours.toFixed(1);
            return <Text style={styles.statValue}>{formatted}h</Text>;
          })()}
          <Text style={styles.statLabel}>Online Today</Text>
        </View>
      </View>

      {/* Online/Offline Toggle */}
      <View style={styles.toggleContainer}>
        <View style={styles.toggleLeft}>
          <Ionicons 
            name={isOnline ? "radio-button-on" : "radio-button-off"} 
            size={20} 
            color={isOnline ? "#3B82F6" : "#9CA3AF"} 
          />
          <Text style={[styles.toggleText, { color: isOnline ? "#3B82F6" : "#9CA3AF" }]}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
        <Switch
          value={isOnline}
          onValueChange={(value) => {
            console.log('🎛️ Switch onValueChange triggered:', { value, currentIsOnline: isOnline });
            handleOnlineToggle(value);
          }}
          trackColor={{ false: "#E5E7EB", true: "#DBEAFE" }}
          thumbColor={isOnline ? "#3B82F6" : "#9CA3AF"}
          ios_backgroundColor="#E5E7EB"
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.actionButton} onPress={handleRideHistory}>
          <Ionicons name="list" size={20} color="#1E3A8A" />
          <Text style={styles.actionButtonText}>Ride History</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={handleEarnings}>
          <Ionicons name="analytics" size={20} color="#1E3A8A" />
          <Text style={styles.actionButtonText}>Earnings</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={handleRentals}>
          <Ionicons name="car-sport" size={20} color="#1E3A8A" />
          <Text style={styles.actionButtonText}>Rentals</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      {isOnline && (
        <View style={styles.quickActions}>
          {currentActiveRide ? (
            <TouchableOpacity 
              style={styles.navigateToHistoryButton} 
              onPress={() => {
                Alert.alert(
                  'Navigate to Ride History',
                  'Please navigate to Ride History to start your ride and manage ride operations.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                      text: 'Go to Ride History', 
                      onPress: () => navigation.navigate('DriverRequests')
                    }
                  ]
                );
              }}
            >
              <Ionicons name="list" size={24} color="#FFFFFF" />
              <Text style={styles.navigateToHistoryText}>
                Go to Ride History to Start Ride
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.acceptRideButton} 
              onPress={handleRequestPress}
              disabled={pendingRequests.length === 0}
            >
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              <Text style={styles.acceptRideText}>
                {pendingRequests.length > 0 
                  ? `Accept Request${pendingRequests.length > 1 ? `s (${pendingRequests.length})` : ''}`
                  : 'No Requests'
                }
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Ride Request Modal */}
      <Modal
        visible={showRequestModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRequestModal(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Text style={styles.modalTitle}>Ride Request</Text>
                <View style={styles.modalStatusBadge}>
                  <Ionicons name="time-outline" size={12} color="#3B82F6" />
                  <Text style={styles.modalStatusText}>New Request</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowRequestModal(false)}
              >
                <Ionicons name="close" size={24} color="#1E3A8A" />
              </TouchableOpacity>
            </View>
            
            {selectedRequest && (
              <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                <View style={styles.requestCard}>
                  {/* Customer Information */}
                  <View style={styles.customerInfo}>
                    <View style={styles.customerAvatar}>
                      <Ionicons name="person" size={24} color="#3B82F6" />
                    </View>
                    <View style={styles.customerDetails}>
                      <Text style={styles.customerName}>{selectedRequest.customerName}</Text>
                      <View style={styles.ratingContainer}>
                        <Ionicons name="star" size={16} color="#F59E0B" />
                        <Text style={styles.ratingText}>{selectedRequest.customerRating}</Text>
                        <Text style={styles.ratingLabel}>• Excellent Customer</Text>
                      </View>
                      {selectedRequest.requestTime && (
                        <View style={styles.requestTimeContainer}>
                          <Ionicons name="time-outline" size={14} color="#64748B" />
                          <Text style={styles.requestTimeText}>Requested at {selectedRequest.requestTime}</Text>
                        </View>
                      )}
                      {selectedRequest.customerNotes && (
                        <View style={styles.customerNotesContainer}>
                          <Ionicons name="chatbubble-outline" size={14} color="#64748B" />
                          <Text style={styles.customerNotesText}>{selectedRequest.customerNotes}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.customerStatus}>
                      <View style={styles.statusIndicator}>
                        <Text style={styles.statusText}>Online</Text>
                      </View>
                    </View>
                  </View>
                  
                  {/* Call Customer Button */}
                  <TouchableOpacity 
                    style={styles.callCustomerButton}
                    onPress={() => {
                      if (selectedRequest.customerPhone) {
                        // Open phone dialer
                        Linking.openURL(`tel:${selectedRequest.customerPhone}`);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.callCustomerButtonContent}>
                      <Ionicons name="call" size={20} color="#FFFFFF" />
                      <Text style={styles.callCustomerButtonText}>
                        Call {selectedRequest.customerName}
                      </Text>
                      <Text style={styles.callCustomerButtonSubtext}>
                        {selectedRequest.customerPhone || 'No phone number'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  
                  {/* Route Information */}
                  <View style={styles.routeInfo}>
                    <View style={styles.routeHeader}>
                      <Ionicons name="map-outline" size={16} color="#64748B" />
                      <Text style={styles.routeHeaderText}>Trip Details</Text>
                    </View>
                    
                    <View style={styles.locationItem}>
                      <View style={styles.locationIcon}>
                        <Ionicons name="location" size={16} color="#3B82F6" />
                      </View>
                      <View style={styles.locationText}>
                        <Text style={styles.locationLabel}>Pickup Location</Text>
                        <Text style={styles.locationAddress}>{selectedRequest.pickup}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.routeLine} />
                    
                    <View style={styles.locationItem}>
                      <View style={styles.locationIcon}>
                        <Ionicons name="flag" size={16} color="#EF4444" />
                      </View>
                      <View style={styles.locationText}>
                        <Text style={styles.locationLabel}>Destination</Text>
                        <Text style={styles.locationAddress}>{selectedRequest.destination}</Text>
                      </View>
                    </View>
                  </View>
                  
                  {/* Trip Statistics */}
                  <View style={styles.tripStats}>
                    <View style={styles.tripStat}>
                      <View style={styles.tripStatIcon}>
                        <Ionicons name="time-outline" size={16} color="#3B82F6" />
                      </View>
                      <View style={styles.tripStatContent}>
                        <Text style={styles.tripStatLabel}>Duration</Text>
                        <Text style={styles.tripStatValue}>{selectedRequest.duration}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.tripStatDivider} />
                    
                    <View style={styles.tripStat}>
                      <View style={styles.tripStatIcon}>
                        <Ionicons name="location-outline" size={16} color="#10B981" />
                      </View>
                      <View style={styles.tripStatContent}>
                        <Text style={styles.tripStatLabel}>Distance</Text>
                        <Text style={styles.tripStatValue}>{selectedRequest.distance}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.tripStatDivider} />
                    
                    <View style={styles.tripStat}>
                      <View style={styles.tripStatIcon}>
                        <Ionicons name="cash-outline" size={16} color="#F59E0B" />
                      </View>
                      <View style={styles.tripStatContent}>
                        <Text style={styles.tripStatLabel}>Earnings</Text>
                        <Text style={styles.tripStatValue}>{selectedRequest.price}</Text>
                      </View>
                    </View>
                  </View>
                  
                  {/* Estimated Earnings Breakdown */}
                  <View style={styles.earningsBreakdown}>
                    <Text style={styles.earningsTitle}>Earnings Breakdown</Text>
                    {(() => {
                      const breakdown = calculateEarningsBreakdown(selectedRequest.price, selectedRequest.currencySymbol || '$');
                      return (
                        <>
                          <View style={styles.earningsRow}>
                            <Text style={styles.earningsLabel}>Base Fare</Text>
                            <Text style={styles.earningsValue}>{breakdown.baseFare}</Text>
                          </View>
                          <View style={styles.earningsRow}>
                            <Text style={styles.earningsLabel}>Distance Bonus</Text>
                            <Text style={styles.earningsValue}>{breakdown.distanceBonus}</Text>
                          </View>
                          <View style={styles.earningsRow}>
                            <Text style={styles.earningsLabel}>Time Bonus</Text>
                            <Text style={styles.earningsValue}>{breakdown.timeBonus}</Text>
                          </View>
                          <View style={[styles.earningsRow, styles.earningsTotal]}>
                            <Text style={styles.earningsTotalLabel}>Total Earnings</Text>
                            <Text style={styles.earningsTotalValue}>{breakdown.total}</Text>
                          </View>
                        </>
                      );
                    })()}
                  </View>
                </View>
              </ScrollView>
            )}
            
            <View style={[styles.modalActions, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <TouchableOpacity 
                style={styles.rejectButton}
                onPress={() => selectedRequest && handleRejectRequest(selectedRequest)}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={20} color="#EF4444" />
                <Text style={styles.rejectButtonText}>Reject</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.acceptButton}
                onPress={() => selectedRequest && handleAcceptRequest(selectedRequest)}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                <Text style={styles.acceptButtonText}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Requests List Bottom Sheet */}
      <Modal
        visible={showRequestsList}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRequestsList(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay} pointerEvents="box-none">
          <View style={styles.requestsListContainer} pointerEvents="box-none">
            <View style={styles.requestsListHeader}>
              <View style={styles.requestsListHeaderLeft}>
                <Text style={styles.requestsListTitle}>Pending Requests</Text>
                <View style={styles.requestsCountBadge}>
                  <Text style={styles.requestsCountText}>{pendingRequests.length}</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowRequestsList(false)}
              >
                <Ionicons name="close" size={24} color="#1E3A8A" />
              </TouchableOpacity>
            </View>
            
            {pendingRequests.length === 0 ? (
              <View style={styles.emptyRequestsContainer}>
                <View style={styles.emptyRequestsIcon}>
                  <Ionicons name="car-outline" size={48} color="#CBD5E1" />
                </View>
                <Text style={styles.emptyRequestsTitle}>No Requests Available</Text>
                <Text style={styles.emptyRequestsSubtitle}>
                  When you're online, ride requests will appear here
                </Text>
              </View>
            ) : (
              <ScrollView 
                style={styles.requestsListContent} 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.requestsListContentContainer}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={true}
              >

                
                {pendingRequests.map((request, index) => (
                  <TouchableOpacity
                    key={request.id}
                    style={styles.requestListItem}
                    onPress={() => handleViewRequest(request)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <View style={styles.requestListLeft}>
                      <View style={[styles.requestListIcon, { backgroundColor: getRequestColor(index) }]}>
                        <Text style={styles.requestListNumber}>{index + 1}</Text>
                      </View>
                      <View style={styles.requestListInfo}>
                        <View style={styles.requestListHeaderRow}>
                          <Text style={styles.requestListName}>{request.customerName}</Text>
                          {request.requestType === 'DIRECT' && (
                            <View style={styles.directBadge}>
                              <Text style={styles.directBadgeText}>Direct</Text>
                            </View>
                          )}
                          <View style={styles.requestListRating}>
                            <Ionicons name="star" size={14} color="#F59E0B" />
                            <Text style={styles.requestListRatingText}>{request.customerRating}</Text>
                          </View>
                        </View>
                        <View style={styles.requestListPhone}>
                          <TouchableOpacity 
                            style={styles.requestListPhoneText}
                            onPress={() => {
                              if (request.customerPhone) {
                                Linking.openURL(`tel:${request.customerPhone}`);
                              }
                            }}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="call-outline" size={12} color="#3B82F6" />
                            <Text style={styles.requestListPhoneTextContent}>{request.customerPhone || 'No phone'}</Text>
                          </TouchableOpacity>
                        </View>
                        {request.requestTime && (
                          <View style={styles.requestListTime}>
                            <Ionicons name="time-outline" size={12} color="#64748B" />
                            <Text style={styles.requestListTimeText}>{request.requestTime}</Text>
                          </View>
                        )}
                        <View style={styles.requestListLocation}>
                          <Ionicons name="location" size={12} color="#64748B" />
                          <Text style={styles.requestListPickup}>{request.pickup}</Text>
                        </View>
                        <View style={styles.requestListDetails}>
                          <View style={styles.requestListDetail}>
                            <Ionicons name="time-outline" size={12} color="#64748B" />
                            <Text style={styles.requestListDetailText}>{request.duration}</Text>
                          </View>
                          <View style={styles.requestListDetail}>
                            <Ionicons name="location-outline" size={12} color="#64748B" />
                            <Text style={styles.requestListDetailText}>{request.distance}</Text>
                          </View>
                          <Text style={styles.requestListPrice}>{request.price}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.requestListRight}>
                      <View style={styles.requestListArrow}>
                        <Ionicons name="chevron-forward" size={20} color="#64748B" />
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Request Detail Bottom Sheet */}
      <Modal
        visible={showRequestDetail}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRequestDetail(false)}
        onShow={() => console.log('🎉 Request Detail Modal is now visible!')}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.requestDetailContainer}>
            {/* Handle Bar */}
            <View style={styles.handleBar}>
              <View style={styles.handleBarLine} />
            </View>
            
            <View style={styles.requestDetailHeader}>
              <View style={styles.requestDetailHeaderLeft}>
                <Text style={styles.requestDetailTitle}>Ride Request</Text>
                <View style={styles.requestDetailStatusBadge}>
                  <Ionicons name="time-outline" size={12} color="#3B82F6" />
                  <Text style={styles.requestDetailStatusText}>New Request</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowRequestDetail(false)}
              >
                <Ionicons name="close" size={24} color="#1E3A8A" />
              </TouchableOpacity>
            </View>
            
            {selectedRequest && (
              <ScrollView 
                style={styles.requestDetailContent} 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.requestDetailContentContainer}
              >
                <View style={styles.requestDetailCard}>
                  {/* Customer Information */}
                  <View style={styles.customerInfo}>
                    <View style={styles.customerAvatar}>
                      <Ionicons name="person" size={24} color="#3B82F6" />
                    </View>
                    <View style={styles.customerDetails}>
                      <Text style={styles.customerName}>{selectedRequest.customerName}</Text>
                      <View style={styles.ratingContainer}>
                        <Ionicons name="star" size={16} color="#F59E0B" />
                        <Text style={styles.ratingText}>{selectedRequest.customerRating}</Text>
                        <Text style={styles.ratingLabel}>• Excellent Customer</Text>
                      </View>
                      {selectedRequest.requestTime && (
                        <View style={styles.requestTimeContainer}>
                          <Ionicons name="time-outline" size={14} color="#64748B" />
                          <Text style={styles.requestTimeText}>Requested at {selectedRequest.requestTime}</Text>
                        </View>
                      )}
                      {selectedRequest.customerNotes && (
                        <View style={styles.customerNotesContainer}>
                          <Ionicons name="chatbubble-outline" size={14} color="#64748B" />
                          <Text style={styles.customerNotesText}>{selectedRequest.customerNotes}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.customerStatus}>
                      <View style={styles.statusIndicator}>
                        <Text style={styles.statusText}>Online</Text>
                      </View>
                    </View>
                  </View>
                  
                  {/* Call Customer Button */}
                  <TouchableOpacity 
                    style={styles.callCustomerButton}
                    onPress={() => {
                      if (selectedRequest.customerPhone) {
                        // Open phone dialer
                        Linking.openURL(`tel:${selectedRequest.customerPhone}`);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.callCustomerButtonContent}>
                      <Ionicons name="call" size={20} color="#FFFFFF" />
                      <Text style={styles.callCustomerButtonText}>
                        Call {selectedRequest.customerName}
                      </Text>
                      <Text style={styles.callCustomerButtonSubtext}>
                        {selectedRequest.customerPhone || 'No phone number'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  
                  {/* Route Information */}
                  <View style={styles.routeInfo}>
                    <View style={styles.routeHeader}>
                      <Ionicons name="map-outline" size={16} color="#64748B" />
                      <Text style={styles.routeHeaderText}>Trip Details</Text>
                    </View>
                    
                    <View style={styles.locationItem}>
                      <View style={styles.locationIcon}>
                        <Ionicons name="location" size={16} color="#3B82F6" />
                      </View>
                      <View style={styles.locationText}>
                        <Text style={styles.locationLabel}>Pickup Location</Text>
                        <Text style={styles.locationAddress}>{selectedRequest.pickup}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.routeLine} />
                    
                    <View style={styles.locationItem}>
                      <View style={styles.locationIcon}>
                        <Ionicons name="flag" size={16} color="#EF4444" />
                      </View>
                      <View style={styles.locationText}>
                        <Text style={styles.locationLabel}>Destination</Text>
                        <Text style={styles.locationAddress}>{selectedRequest.destination}</Text>
                      </View>
                    </View>
                  </View>
                  
                  {/* Trip Statistics */}
                  <View style={styles.tripStats}>
                    <View style={styles.tripStat}>
                      <View style={styles.tripStatIcon}>
                        <Ionicons name="time-outline" size={16} color="#3B82F6" />
                      </View>
                      <View style={styles.tripStatContent}>
                        <Text style={styles.tripStatLabel}>Duration</Text>
                        <Text style={styles.tripStatValue}>{selectedRequest.duration}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.tripStatDivider} />
                    
                    <View style={styles.tripStat}>
                      <View style={styles.tripStatIcon}>
                        <Ionicons name="location-outline" size={16} color="#10B981" />
                      </View>
                      <View style={styles.tripStatContent}>
                        <Text style={styles.tripStatLabel}>Distance</Text>
                        <Text style={styles.tripStatValue}>{selectedRequest.distance}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.tripStatDivider} />
                    
                    <View style={styles.tripStat}>
                      <View style={styles.tripStatIcon}>
                        <Ionicons name="cash-outline" size={16} color="#F59E0B" />
                      </View>
                      <View style={styles.tripStatContent}>
                        <Text style={styles.tripStatLabel}>Earnings</Text>
                        <Text style={styles.tripStatValue}>{selectedRequest.price}</Text>
                      </View>
                    </View>
                  </View>
                  
                  {/* Estimated Earnings Breakdown */}
                  <View style={styles.earningsBreakdown}>
                    <Text style={styles.earningsTitle}>Earnings Breakdown</Text>
                    {(() => {
                      const breakdown = calculateEarningsBreakdown(selectedRequest.price, selectedRequest.currencySymbol || '$');
                      return (
                        <>
                          <View style={styles.earningsRow}>
                            <Text style={styles.earningsLabel}>Base Fare</Text>
                            <Text style={styles.earningsValue}>{breakdown.baseFare}</Text>
                          </View>
                          <View style={styles.earningsRow}>
                            <Text style={styles.earningsLabel}>Distance Bonus</Text>
                            <Text style={styles.earningsValue}>{breakdown.distanceBonus}</Text>
                          </View>
                          <View style={styles.earningsRow}>
                            <Text style={styles.earningsLabel}>Time Bonus</Text>
                            <Text style={styles.earningsValue}>{breakdown.timeBonus}</Text>
                          </View>
                          <View style={[styles.earningsRow, styles.earningsTotal]}>
                            <Text style={styles.earningsTotalLabel}>Total Earnings</Text>
                            <Text style={styles.earningsTotalValue}>{breakdown.total}</Text>
                          </View>
                        </>
                      );
                    })()}
                  </View>
                </View>
              </ScrollView>
            )}
            
            <View style={[styles.requestDetailActions, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <TouchableOpacity 
                style={styles.rejectButton}
                onPress={() => {
                  if (selectedRequest) {
                    handleRejectRequest(selectedRequest);
                    setShowRequestDetail(false);
                  }
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={20} color="#EF4444" />
                <Text style={styles.rejectButtonText}>Reject</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.acceptButton}
                onPress={() => {
                  if (selectedRequest) {
                    handleAcceptRequest(selectedRequest);
                    setShowRequestDetail(false);
                  }
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                <Text style={styles.acceptButtonText}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Floating Ride Request Notification */}
      {showRequestNotification && pendingRequests.length > 0 && (
        <View style={styles.floatingNotification}>
          <View style={styles.notificationContent}>
            <View style={styles.notificationHeader}>
              <View style={styles.notificationIcon}>
                <Ionicons name="car" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.notificationInfo}>
                <Text style={styles.notificationTitle}>New Ride Request!</Text>
                <Text style={styles.notificationSubtitle}>
                  {pendingRequests.length} request{pendingRequests.length > 1 ? 's' : ''} nearby
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.notificationClose}
                onPress={() => setShowRequestNotification(false)}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={() => {
                setShowRequestNotification(false);
                setShowRequestsList(true);
              }}
            >
              <Text style={styles.notificationButtonText}>View Requests</Text>
              <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E3A8A',
  },
  floatingHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 16,
    right: 16,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(30, 58, 138, 0.9)',
    borderRadius: 16,
    backdropFilter: 'blur(10px)',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#CBD5E1',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenMapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 1,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#3B82F6',
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E3A8A',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E3A8A',
    marginLeft: 6,
  },
  quickActions: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 20 : 16,
  },
  acceptRideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  acceptRideText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  completeRideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981', // A different color for completion
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  completeRideText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  reachPickupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  reachPickupText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  startTripButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  startTripText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '95%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  modalStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 4,
  },
  modalStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
    marginLeft: 4,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  requestCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 4,
  },
  ratingLabel: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 4,
  },
  customerStatus: {
    marginTop: 8,
  },
  statusIndicator: {
    backgroundColor: '#E0F2FE',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
  },
  routeInfo: {
    marginBottom: 16,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  routeHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 8,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  locationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  locationText: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 14,
    color: '#1E3A8A',
    fontWeight: '500',
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: '#E2E8F0',
    marginLeft: 15,
    marginBottom: 12,
  },
  tripStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tripStat: {
    alignItems: 'center',
  },
  tripStatIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tripStatContent: {
    alignItems: 'center',
  },
  tripStatLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  tripStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  tripStatDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#E2E8F0',
    marginHorizontal: 16,
  },
  earningsBreakdown: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  earningsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E3A8A',
    marginBottom: 12,
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  earningsLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  earningsValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  earningsTotal: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  earningsTotalLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  earningsTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  rejectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    marginLeft: 8,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  // Requests List Bottom Sheet Styles
  requestsListContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  requestsListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  requestsListHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestsListTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E3A8A',
    marginRight: 8,
  },
  requestsCountBadge: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  requestsCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  requestsListContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  requestsListContentContainer: {
    paddingBottom: 20, // Add some padding at the bottom for the last item
  },
  requestListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  requestListLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestListIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  requestListNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  requestListInfo: {
    flex: 1,
  },
  requestListHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  directBadge: {
    marginLeft: 8,
    backgroundColor: '#FCE7F3',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  directBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DB2777',
  },
  requestListName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  requestListRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestListRatingText: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 4,
  },
  requestListPhone: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  requestListPhoneText: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  requestListPhoneTextContent: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 4,
  },
  requestListTime: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  requestListTimeText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 4,
  },
  requestListLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  requestListPickup: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 4,
  },
  requestListDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestListDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestListDetailText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 4,
  },
  requestListPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  requestListRight: {
    alignItems: 'center',
  },
  requestListArrow: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyRequestsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyRequestsIcon: {
    marginBottom: 16,
  },
  emptyRequestsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E3A8A',
    marginBottom: 8,
  },
  emptyRequestsSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  locationLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 1,
  },
  locationLoadingCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  locationLoadingText: {
    fontSize: 16,
    color: '#3B82F6',
    marginTop: 10,
    textAlign: 'center',
  },
  locationLoadingSubtext: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  // Request Detail Bottom Sheet Styles
  requestDetailContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '95%',
    height: '95%',
    overflow: 'hidden',
  },
  handleBar: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    marginTop: 12,
    marginBottom: 16,
  },
  handleBarLine: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
  },
  requestDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  requestDetailHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestDetailTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  requestDetailStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 4,
  },
  requestDetailStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
    marginLeft: 4,
  },
  requestDetailContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  requestDetailContentContainer: {
    paddingBottom: 120,
  },
  requestDetailCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  requestDetailActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },

  activeRideIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 4,
  },
  activeRideText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
    marginLeft: 4,
  },
  floatingNotification: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 100,
    left: 16,
    right: 16,
    zIndex: 2000,
  },
  notificationContent: {
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  notificationSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  notificationClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  notificationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 8,
  },
  customerPhoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  customerPhoneButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
  },
  customerPhoneButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 4,
    marginRight: 4,
  },
  requestTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  requestTimeText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 4,
  },
  customerNotesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  customerNotesText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 4,
  },
  callCustomerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginTop: 20,
    marginBottom: 24,
  },
  callCustomerButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callCustomerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  callCustomerButtonSubtext: {
    fontSize: 12,
    color: '#CBD5E1',
    marginLeft: 4,
  },
  navigateToHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  navigateToHistoryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
}); 