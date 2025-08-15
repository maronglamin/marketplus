import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  StatusBar,
  Platform,
  Alert,
  Keyboard,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { AppStackParamList } from '../navigation/AppNavigator';
import { rideService, type LocationData, type SuggestionItem } from '../services/rideService';
import { rideServicesApi, type RideOption } from '../services/rideServicesApi';
import { GoogleMapView, type GoogleMapViewRef, type MapLocation, type RouteData } from '../components/GoogleMapView';
import * as Location from 'expo-location';
import { RideRequestService, type RideRequest } from '../services/rideRequestService';
import { TokenNotificationCard } from '../components/TokenNotificationCard';

declare global {
  interface Window {
    trackingInterval?: NodeJS.Timeout;
  }
}

export function RideRequest() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList, 'RideRequest'>>();
  const route = useRoute<RouteProp<AppStackParamList, 'RideRequest'>>();
  const mapRef = useRef<GoogleMapViewRef>(null);
  const trackingIntervalRef = useRef<number | null>(null);
  
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedRide, setSelectedRide] = useState('standard');
  const [showRideOptions, setShowRideOptions] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<MapLocation | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<MapLocation | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [routeAlternatives, setRouteAlternatives] = useState<any[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [isRouteSummaryCollapsed, setIsRouteSummaryCollapsed] = useState(true);
  const [showRouteAlternatives, setShowRouteAlternatives] = useState(false);
  const [lastKnownLocation, setLastKnownLocation] = useState<MapLocation | null>(null);
  const [currentRideRequest, setCurrentRideRequest] = useState<RideRequest | null>(null);
  const [hasCreatedRequest, setHasCreatedRequest] = useState(false);
  const [isRequestingRide, setIsRequestingRide] = useState(false);
  const [onlineDrivers, setOnlineDrivers] = useState<any[]>([]);
  const [showDriverMarkers, setShowDriverMarkers] = useState(false);
  const [trackingMode, setTrackingMode] = useState(false);
  const [showTrackingInfo, setShowTrackingInfo] = useState(false);
  const [isViewingRoute, setIsViewingRoute] = useState(false);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [rideOptions, setRideOptions] = useState<RideOption[]>([]);
  const [loadingRideOptions, setLoadingRideOptions] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Add this helper
  const isFromRequestListing = !!route.params?.showRoute;

  // Helper function to determine if vehicle selection should be disabled
  const shouldDisableVehicleSelection = () => {
    // Disable if there's a current ride request and it's not in REQUESTED status
    if (currentRideRequest) {
      const status = currentRideRequest.status;
      const shouldDisable = status !== 'REQUESTED';
      
      console.log('🔍 Vehicle selection check:', { 
        status, 
        shouldDisable, 
        hasDriver: !!currentRideRequest.driver 
      });
      
      // Disable for all statuses except REQUESTED
      return shouldDisable;
    }
    return false;
  };

  useEffect(() => {
    // Start location fetching immediately
    getCurrentLocation();
    
    // Load ride options with default values initially
    setTimeout(() => {
      loadRideOptions();
    }, 1000);
    
    // Cleanup function for tracking intervals
    return () => {
      // Clear any tracking intervals when component unmounts
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
        trackingIntervalRef.current = null;
        console.log('🧹 Cleaned up tracking interval on unmount');
      }
      // Clear driver markers when component unmounts
      if (mapRef.current) {
        mapRef.current.clearDriverMarkers();
      }
    };
  }, []);

  // Handle route parameters for showing route on map
  useEffect(() => {
    if (route.params?.showRoute && route.params.pickupLocation && route.params.destinationLocation) {
      setIsViewingRoute(true);
      setPickup(route.params.pickupLocation.address);
      setDestination(route.params.destinationLocation.address);
      setDestinationLocation(route.params.destinationLocation);
      
      // Calculate actual route data for proper polyline
      const calculateRouteForRequest = async () => {
        try {
          console.log('🗺️ Calculating route for request listing view');
          const routeResult = await rideService.calculateRoute(
            route.params.pickupLocation,
            route.params.destinationLocation
          );
          
          if (routeResult && routeResult.bestRoute) {
            console.log('✅ Route calculated for request listing:', routeResult.bestRoute);
            setRouteData(routeResult.bestRoute);
            
            // Load ride options after route is calculated
            setTimeout(() => {
              loadRideOptions(routeResult.bestRoute);
            }, 100);
          } else {
            console.warn('⚠️ No route result, using fallback data');
            // Fallback to provided route data if available
            if (route.params.routeData) {
              setRouteData({
                overview_polyline: {
                  points: '' // Will be calculated by the map component
                },
                legs: [{
                  duration: { text: `${route.params.routeData.duration} min` },
                  distance: { text: `${route.params.routeData.distance.toFixed(1)} km` }
                }]
              });
              
              // Load ride options with fallback route data
              setTimeout(() => {
                loadRideOptions({
                  legs: [{
                    duration: { text: `${route.params.routeData.duration} min` },
                    distance: { text: `${route.params.routeData.distance.toFixed(1)} km` }
                  }]
                });
              }, 100);
            } else {
              // Load ride options even without route data
              setTimeout(() => {
                loadRideOptions();
              }, 100);
            }
          }
        } catch (error) {
          console.error('❌ Error calculating route for request listing:', error);
          // Fallback to provided route data if available
          if (route.params.routeData) {
            setRouteData({
              overview_polyline: {
                points: '' // Will be calculated by the map component
              },
              legs: [{
                duration: { text: `${route.params.routeData.duration} min` },
                distance: { text: `${route.params.routeData.distance.toFixed(1)} km` }
              }]
            });
            
            // Load ride options with fallback route data
            setTimeout(() => {
              loadRideOptions({
                legs: [{
                  duration: { text: `${route.params.routeData.duration} min` },
                  distance: { text: `${route.params.routeData.distance.toFixed(1)} km` }
                }]
              });
            }, 100);
          } else {
            // Load ride options even without route data
            setTimeout(() => {
              loadRideOptions();
            }, 100);
          }
        }
      };
      
      calculateRouteForRequest();
    }
  }, [route.params]);

  // Highlight route on map when viewing route from ride requests
  useEffect(() => {
    if (isViewingRoute && route.params?.pickupLocation && route.params?.destinationLocation && mapRef.current) {
      // Wait a bit for the map to be ready
      setTimeout(() => {
        if (route.params?.pickupLocation && route.params?.destinationLocation) {
          mapRef.current?.highlightRoute(
            route.params.pickupLocation,
            route.params.destinationLocation,
            routeData || undefined
          );
        }
      }, 1000);
    }
  }, [isViewingRoute, route.params, routeData]);

  // Handle route highlighting when map becomes ready for restored requests
  useEffect(() => {
    if (mapReady && currentRideRequest && !hasCreatedRequest && routeData && destinationLocation && currentLocation) {
      console.log('🗺️ Map is ready, highlighting route for restored request');
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.highlightRoute(currentLocation, destinationLocation, routeData);
        }
      }, 500);
    }
  }, [mapReady, currentRideRequest, hasCreatedRequest, routeData, destinationLocation, currentLocation]);



  const checkLocationPermission = async () => {
    try {
      setLoadingLocation(true);
      // Get location once before map mounts
      await getCurrentLocation();
    } catch (error) {
      console.error('Error checking location permission:', error);
      setPermissionDenied(true);
      setLoadingLocation(false);
      Alert.alert('Error', 'Unable to access location services. Please check your device settings.');
    }
  };

  const getCurrentLocation = async () => {
    try {
      setLoadingLocation(true);
      console.log('🔍 Getting current location...');
      
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
      console.log('🔄 Starting reverse geocoding for coordinates:', location.coords.latitude, location.coords.longitude);
      const address = await rideService.reverseGeocode(
        location.coords.latitude,
        location.coords.longitude
      );
      console.log('✅ Reverse geocoding result:', address);

      const newLocation: MapLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: address
      };

      console.log('📍 Location obtained:', newLocation);
      setCurrentLocation(newLocation);
      setPickup(newLocation.address || 'Current Location');
      setLoadingLocation(false);
      
      // Start loading online drivers when location is obtained
      loadOnlineDrivers();
      startDriverTracking();
      
    } catch (error) {
      console.error('Error getting location:', error);
      setLoadingLocation(false);
      // Don't show alert immediately, let user continue with map
      console.log('⚠️ Location not available, continuing with map...');
    }
  };

  const searchPlaces = async (query: string) => {
    if (!query.trim() || query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      setSearching(true);
      setShowSuggestions(true);
      
      console.log('🔍 Searching for:', query);
      console.log('🔍 Query length:', query.length);
      console.log('🔍 Query trimmed:', query.trim());
      
      // Pass the user's current location to get nearby suggestions
      const userLocation = currentLocation ? {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude
      } : undefined;
      
      console.log('📍 User location for search:', userLocation);
      
      const results = await rideService.searchPlaces(query, userLocation);
      console.log('📋 Search results:', results.length, 'suggestions');
      console.log('📋 Search results details:', JSON.stringify(results, null, 2));
      
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      
      // Show helpful message if using fallback suggestions
      if (results.length > 0 && results[0].place_id.startsWith('fallback_')) {
        console.log('ℹ️ Using fallback suggestions - API may be unavailable');
      }
    } catch (error) {
      console.error('❌ Error searching places:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setSearching(false);
    }
  };

  const selectDestination = async (suggestion: SuggestionItem) => {
    setDestination(suggestion.description);
    setShowSuggestions(false);
    setSuggestions([]);
    
    console.log('🎯 Selected destination:', suggestion.description);
    console.log('🆔 Place ID:', suggestion.place_id);
    
    try {
      // Check if this is a Plus Code suggestion with geometry data
      if (suggestion.geometry && suggestion.place_id.startsWith('pluscode_')) {
        console.log('🔍 Plus Code with geometry data detected');
        const plusCodeLocation: MapLocation = {
          latitude: (suggestion.geometry as any).location.lat,
          longitude: (suggestion.geometry as any).location.lng,
          address: suggestion.description,
        };
        setDestinationLocation(plusCodeLocation);
        
        // Calculate route for Plus Code location
        if (currentLocation) {
          const routeResult = await rideService.calculateRoute(
            { ...currentLocation, address: currentLocation.address || 'Current Location' },
            { ...plusCodeLocation, address: plusCodeLocation.address || 'Destination' }
          );
          const distance = rideService.calculateDistance(
            { ...currentLocation, address: currentLocation.address || 'Current Location' },
            { ...plusCodeLocation, address: plusCodeLocation.address || 'Destination' }
          );
          console.log('📏 Distance calculated:', distance, 'km');
          
          // Store route alternatives for user selection
          if (routeResult && routeResult.routes) {
            console.log('🗺️ Route alternatives stored for selection');
            setRouteAlternatives(routeResult.routes);
            setRouteData(routeResult.bestRoute);
            setSelectedRouteIndex(0);
            
            // Load ride options after route is calculated
            setTimeout(() => {
              loadRideOptions(routeResult.bestRoute);
            }, 100);
          } else {
            // Load ride options even if route calculation fails
            setTimeout(() => {
              loadRideOptions();
            }, 100);
          }
          
          // Update map via component method with the best route
          if (mapRef.current && routeResult) {
            console.log('🗺️ Calling highlightRoute with routeResult.bestRoute:', routeResult.bestRoute);
            console.log('🗺️ RouteResult structure:', JSON.stringify(routeResult, null, 2));
            // Show route with both pickup and destination endpoints
            mapRef.current.highlightRoute(currentLocation, plusCodeLocation, routeResult.bestRoute);
          }
        } else {
          // Load ride options even if no current location
          setTimeout(() => {
            loadRideOptions();
          }, 100);
        }
        return;
      }

      // Check if this is a fallback suggestion
      if (suggestion.place_id.startsWith('fallback_')) {
        console.log('🔄 Using fallback destination');
        // For fallback suggestions, create a location near the user
        const fallbackLocation: MapLocation = {
          latitude: currentLocation?.latitude ? currentLocation.latitude + 0.01 : 37.78825,
          longitude: currentLocation?.longitude ? currentLocation.longitude + 0.01 : -122.4324,
          address: suggestion.description,
        };
        setDestinationLocation(fallbackLocation);
        
        // Calculate route for fallback location
        if (currentLocation) {
          const route = await rideService.calculateRoute(
            { ...currentLocation, address: currentLocation.address || 'Current Location' },
            { ...fallbackLocation, address: fallbackLocation.address || 'Destination' }
          );
          if (route) {
            setRouteData(route);
            
            // Load ride options after route is calculated
            setTimeout(() => {
              loadRideOptions(route);
            }, 100);
          } else {
            // Load ride options even if route calculation fails
            setTimeout(() => {
              loadRideOptions();
            }, 100);
          }
          
          // Update map via component method
          if (mapRef.current) {
            // Show route with both pickup and destination endpoints
            mapRef.current.highlightRoute(currentLocation, fallbackLocation, route);
          }
        } else {
          // Load ride options even if no current location
          setTimeout(() => {
            loadRideOptions();
          }, 100);
        }
        return;
      }
      
      // Get actual coordinates for the selected place
      const placeDetails = await rideService.getPlaceDetails(suggestion.place_id);
      
      if (placeDetails) {
        console.log('✅ Place details obtained:', placeDetails);
        setDestinationLocation(placeDetails);
        
        // Calculate real route and distance
        if (currentLocation) {
          const routeResult = await rideService.calculateRoute(
            { ...currentLocation, address: currentLocation.address || 'Current Location' },
            { ...placeDetails, address: placeDetails.address || 'Destination' }
          );
          const distance = rideService.calculateDistance(
            { ...currentLocation, address: currentLocation.address || 'Current Location' },
            { ...placeDetails, address: placeDetails.address || 'Destination' }
          );
          console.log('📏 Distance calculated:', distance, 'km');
          
          // Store route alternatives for user selection
          if (routeResult && routeResult.routes) {
            console.log('🗺️ Route alternatives stored for selection');
            setRouteAlternatives(routeResult.routes);
            setRouteData(routeResult.bestRoute);
            setSelectedRouteIndex(0);
            
            // Load ride options after route is calculated
            setTimeout(() => {
              loadRideOptions(routeResult.bestRoute);
            }, 100);
          } else {
            // Load ride options even if route calculation fails
            setTimeout(() => {
              loadRideOptions();
            }, 100);
          }
          
          // Update map via component method with the best route
          if (mapRef.current && routeResult) {
            console.log('🗺️ Calling highlightRoute with routeResult.bestRoute:', routeResult.bestRoute);
            console.log('🗺️ RouteResult structure:', JSON.stringify(routeResult, null, 2));
            // Show route with both pickup and destination endpoints
            mapRef.current.highlightRoute(currentLocation, placeDetails, routeResult.bestRoute);
          }
        } else {
          console.log('⚠️ No place details, using fallback location');
          // Fallback to mock location if API fails
          const mockLocation: MapLocation = {
            latitude: currentLocation?.latitude ? currentLocation.latitude + 0.01 : 37.78825,
            longitude: currentLocation?.longitude ? currentLocation.longitude + 0.01 : -122.4324,
            address: suggestion.description,
          };
          setDestinationLocation(mockLocation);
          
          // Load ride options for fallback location
          setTimeout(() => {
            loadRideOptions();
          }, 100);
        }
      }
    } catch (error) {
      console.error('❌ Error getting place details:', error);
      // Fallback to mock location
      const mockLocation: MapLocation = {
        latitude: currentLocation?.latitude ? currentLocation.latitude + 0.01 : 37.78825,
        longitude: currentLocation?.longitude ? currentLocation.longitude + 0.01 : -122.4324,
        address: suggestion.description,
      };
      setDestinationLocation(mockLocation);
      
      // Load ride options for fallback location
      setTimeout(() => {
        loadRideOptions();
      }, 100);
    }
  };

  const handleBackPress = () => {
    // Stop polling if active (but don't cancel the request)
    if (trackingIntervalRef.current) {
      clearInterval(trackingIntervalRef.current);
      trackingIntervalRef.current = null;
      console.log('🛑 Stopped polling on back press (request remains active)');
    }
    
    // Don't cancel the ride request - let it continue in the background
    // The user can come back and check the status, or cancel explicitly via the cancel button
    
    navigation.goBack();
  };

  const handleRequestRide = async () => {
    if (!destination.trim()) {
      Alert.alert('Error', 'Please enter a destination');
      return;
    }
    
    if (!currentLocation || !destinationLocation) {
      Alert.alert('Error', 'Please select valid pickup and destination locations.');
      return;
    }

    try {
      setIsRequestingRide(true);
      setCurrentRideRequest(null);

      // Get the selected ride option
      const selectedRideOption = rideOptions.find(opt => opt.id === selectedRide);
      if (!selectedRideOption) {
        Alert.alert('Error', 'Please select a valid ride option');
        return;
      }

      // Calculate distance and duration using the same logic as loadRideOptions
      let estimatedDistance = 5; // Default 5km
      let estimatedDuration = 15; // Default 15 minutes
      
      if (routeData && routeData.legs && routeData.legs.length > 0) {
        // Use route data if available
        const distanceText = routeData.legs[0]?.distance?.text;
        const durationText = routeData.legs[0]?.duration?.text;
        
        if (distanceText) {
          const distanceMatch = distanceText.match(/(\d+(?:\.\d+)?)/);
          if (distanceMatch) {
            estimatedDistance = parseFloat(distanceMatch[1]);
          }
        }
        
        if (durationText) {
          const durationMatch = durationText.match(/(\d+)/);
          if (durationMatch) {
            estimatedDuration = parseInt(durationMatch[1]);
          }
        }
      } else if (currentLocation && destinationLocation) {
        // Calculate actual distance and estimated duration when route data is not available
        const lat1 = currentLocation.latitude;
        const lon1 = currentLocation.longitude;
        const lat2 = destinationLocation.latitude;
        const lon2 = destinationLocation.longitude;
        
        const R = 6371; // Earth's radius in kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        estimatedDistance = R * c;
        
        // Estimate duration based on distance (assuming average speed of 30 km/h in city)
        estimatedDuration = Math.round(estimatedDistance * 2); // 2 minutes per km
      }

      // Use the numeric price value from the selected ride option
      const estimatedPrice = selectedRideOption.priceValue || 0;
      console.log('💰 Using price from selected ride option:', {
        originalPrice: selectedRideOption.price,
        priceValue: estimatedPrice,
        selectedRideOption: selectedRideOption
      });

      console.log('🚗 Creating ride request with:', {
        distance: estimatedDistance,
        duration: estimatedDuration,
        price: estimatedPrice,
        currency: selectedRideOption.currency,
        currencySymbol: selectedRideOption.currencySymbol,
        serviceId: selectedRideOption.serviceId,
        rideType: selectedRide
      });

      // Create ride request with backend
      const rideRequestData = {
        pickupLocation: currentLocation,
        destinationLocation: destinationLocation,
        rideType: (selectedRide === 'premium' ? 'PREMIUM' : 'STANDARD') as 'PREMIUM' | 'STANDARD',
        rideServiceId: selectedRideOption.serviceId,
        estimatedPrice: estimatedPrice,
        estimatedDistance: estimatedDistance,
        estimatedDuration: estimatedDuration,
        currency: selectedRideOption.currency,
        currencySymbol: selectedRideOption.currencySymbol,
        paymentMethod: 'CASH' as const,
        customerNotes: `Ride type: ${selectedRideOption.name}`
      };

      const rideRequest = await RideRequestService.createRideRequest(rideRequestData);
      console.log('✅ Ride request created:', {
        requestId: rideRequest.requestId,
        status: rideRequest.status,
        hasDriver: !!rideRequest.driver
      });
      setCurrentRideRequest(rideRequest);
      setHasCreatedRequest(true); // Mark that user has created a request in this session

      // Hide loading state
      setIsRequestingRide(false);

      // Start map tracking
      setTrackingMode(true);
      
      // Load and show online drivers
      await loadOnlineDrivers();
      
      // Show success alert with tracking option
      Alert.alert(
        'Ride Request Created! 🚗',
        `Your ride request has been created successfully!\n\nRequest ID: ${rideRequest.requestId}\nEstimated Price: ${selectedRideOption.price}\nEstimated Time: ${rideRequest.estimatedDuration} minutes\n\nWe're searching for nearby drivers...`,
        [
          {
            text: 'Track on Map',
            onPress: () => {
              // Close the bottom sheet modal
              setShowRideOptions(false);
              
              // Start continuous tracking
              const trackingInterval = startDriverTracking();
              
              // Show tracking info
              Alert.alert(
                'Live Tracking Active 🗺️',
                'You can now see:\n• Your route highlighted on the map\n• Available drivers nearby\n• Real-time driver locations\n\nDrivers will be notified of your request.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Continue tracking in background
                      console.log('Tracking active for request:', rideRequest.requestId);
                    }
                  }
                ]
              );
            }
          },
          {
            text: 'OK',
            style: 'cancel',
            onPress: () => {
              // Close the bottom sheet modal
              setShowRideOptions(false);
              
              // Still start polling but don't show tracking UI
              startStatusPolling(rideRequest.requestId);
            }
          }
        ]
      );

      // Start polling for status updates
      startStatusPolling(rideRequest.requestId);

    } catch (error) {
      console.error('Error creating ride request:', error);
      setIsRequestingRide(false);
      Alert.alert('Error', 'Failed to create ride request. Please try again.');
    }
  };

  const startStatusPolling = async (requestId: string) => {
    console.log('🔄 Starting status polling for request:', requestId);
    
    // Store interval reference for cleanup
    const pollInterval = setInterval(async () => {
      try {
        const rideRequest = await RideRequestService.pollRideRequestStatus(requestId);
        
        console.log('📊 Ride request status:', rideRequest.status);
        
        // Check if ride request has been accepted
        if (rideRequest.status === 'ACCEPTED' && rideRequest.driver) {
          clearInterval(pollInterval);
          console.log('✅ Ride request accepted, updating status and disabling vehicle selection');
          setCurrentRideRequest(rideRequest);
          
          Alert.alert(
            'Driver Found! 🚗',
            `Your ride has been accepted!\n\nDriver: ${rideRequest.driver.user.firstName} ${rideRequest.driver.user.lastName}\nVehicle: ${rideRequest.driver.vehicleInfo?.model || 'Car'}\nRating: ${rideRequest.driver.rating || 'N/A'}\n\nYour driver is on the way!`,
            [
              {
                text: 'Track Ride',
                onPress: () => {
                  // Navigate to ride tracking screen
                  if (rideRequest.ride?.id) {
                    navigation.navigate('RideTracking', {
                      rideId: rideRequest.ride.id,
                      requestId: rideRequest.requestId,
                      pickupLocation: rideRequest.pickupLocation,
                      destinationLocation: rideRequest.destinationLocation,
                      driver: rideRequest.driver
                    });
                  } else {
                    console.log('No ride ID available for tracking');
                    navigation.goBack();
                  }
                }
              },
              {
                text: 'OK',
                style: 'cancel'
              }
            ]
          );
          return;
        }
        
        // Always update the current ride request with the latest data
        console.log('🔄 Updating currentRideRequest from polling:', {
          requestId: rideRequest.requestId,
          status: rideRequest.status,
          hasDriver: !!rideRequest.driver
        });
        setCurrentRideRequest(rideRequest);
        
        // Check if ride request has expired
        if (rideRequest.status === 'EXPIRED') {
          clearInterval(pollInterval);
          Alert.alert(
            'Request Expired',
            'No drivers were available. Please try again.',
            [
              {
                text: 'Try Again',
                onPress: () => {
                  // Allow user to create a new request
                }
              }
            ]
          );
          return;
        }
        
        // Check if ride request has been cancelled
        if (rideRequest.status === 'CANCELLED') {
          clearInterval(pollInterval);
          Alert.alert(
            'Request Cancelled',
            'Your ride request has been cancelled.',
            [
              {
                text: 'OK',
                style: 'cancel'
              }
            ]
          );
          return;
        }
        
      } catch (error) {
        console.error('Error polling ride request status:', error);
        // Don't clear interval on error, just log it
        // clearInterval(pollInterval);
      }
    }, 10000); // Increased to 10 seconds to reduce API calls
    
    // Store interval reference for cleanup
    trackingIntervalRef.current = pollInterval;
    
    // Stop polling after 2 minutes (request expires)
    setTimeout(() => {
      if (trackingIntervalRef.current === pollInterval) {
        clearInterval(pollInterval);
        trackingIntervalRef.current = null;
        console.log('⏰ Polling stopped after timeout');
      }
    }, 120000);
  };

  const handleRetryLocation = () => {
    getCurrentLocation();
  };

  const loadRideOptions = async (providedRouteData?: any) => {
    console.log('🎯 loadRideOptions function called!');
    try {
      setLoadingRideOptions(true);
      console.log('🚗 Loading ride options...');
      
      // Calculate distance and duration based on available data
      let distance = 5; // Default 5km
      let duration = 15; // Default 15 minutes
      
      // Use provided route data first, then fall back to state routeData
      const routeDataToUse = providedRouteData || routeData;
      
      console.log('🔍 Route data to use:', routeDataToUse);
      console.log('🔍 Route data structure:', routeDataToUse ? {
        hasLegs: !!routeDataToUse.legs,
        legsLength: routeDataToUse.legs?.length,
        firstLeg: routeDataToUse.legs?.[0],
        distanceText: routeDataToUse.legs?.[0]?.distance?.text,
        durationText: routeDataToUse.legs?.[0]?.duration?.text
      } : 'No route data');
      
      if (routeDataToUse && routeDataToUse.legs && routeDataToUse.legs.length > 0) {
        // Use route data if available
        const distanceText = routeDataToUse.legs[0]?.distance?.text;
        const durationText = routeDataToUse.legs[0]?.duration?.text;
        
        console.log('📏 Route data - Distance:', distanceText, 'Duration:', durationText);
        
        if (distanceText) {
          // Parse distance (e.g., "5.2 km" -> 5.2)
          const distanceMatch = distanceText.match(/(\d+(?:\.\d+)?)/);
          if (distanceMatch) {
            distance = parseFloat(distanceMatch[1]);
            console.log('✅ Parsed distance:', distance, 'km');
          } else {
            console.log('⚠️ Could not parse distance from:', distanceText);
          }
        }
        
        if (durationText) {
          // Parse duration (e.g., "15 mins" -> 15)
          const durationMatch = durationText.match(/(\d+)/);
          if (durationMatch) {
            duration = parseInt(durationMatch[1]);
            console.log('✅ Parsed duration:', duration, 'minutes');
          } else {
            console.log('⚠️ Could not parse duration from:', durationText);
          }
        }
      } else if (currentLocation && destinationLocation) {
        // Calculate actual distance and estimated duration when route data is not available
        console.log('📏 Calculating distance between locations...');
        
        // Calculate distance using Haversine formula
        const lat1 = currentLocation.latitude;
        const lon1 = currentLocation.longitude;
        const lat2 = destinationLocation.latitude;
        const lon2 = destinationLocation.longitude;
        
        const R = 6371; // Earth's radius in kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        distance = R * c;
        
        // Estimate duration based on distance (assuming average speed of 30 km/h in city)
        duration = Math.round(distance * 2); // 2 minutes per km
        
        console.log('📏 Calculated - Distance:', distance.toFixed(2), 'km, Duration:', duration, 'minutes');
      } else {
        console.log('⚠️ No route data or locations available, using default values');
      }
      
      const latitude = currentLocation?.latitude;
      const longitude = currentLocation?.longitude;
      
      console.log('📍 Location:', { latitude, longitude });
      console.log('📊 Final Parameters:', { distance, duration });
      
      const options = await rideServicesApi.getRideOptions(
        distance,
        duration,
        latitude,
        longitude
      );
      
      console.log('✅ Loaded ride options:', options.length, options);
      setRideOptions(options);
      
      // Set the first option as default if available
      if (options.length > 0 && !selectedRide) {
        setSelectedRide(options[0].id);
      }
    } catch (error) {
      console.error('❌ Error loading ride options:', error);
      // Keep existing options or set empty array
      setRideOptions([]);
    } finally {
      setLoadingRideOptions(false);
    }
  };

  const loadOnlineDrivers = async () => {
    try {
      if (!currentLocation) return;
      
      setLoadingDrivers(true);
      console.log('🚗 Loading online drivers...');
      
      const drivers = await RideRequestService.getOnlineDrivers(
        currentLocation.latitude,
        currentLocation.longitude,
        10 // 10km radius
      );
      
      console.log('✅ Found online drivers:', drivers?.length || 0);
      
      setOnlineDrivers(drivers || []);
      setLoadingDrivers(false);
      
      // Show driver markers on map
      if (mapRef.current && drivers && drivers.length > 0) {
        mapRef.current.addDriverMarkers(drivers);
        setShowDriverMarkers(true);
      } else {
        // Clear existing markers if no drivers
        if (mapRef.current) {
          mapRef.current.clearDriverMarkers();
        }
        setShowDriverMarkers(false);
      }
    } catch (error) {
      console.error('❌ Error loading online drivers:', error);
      setLoadingDrivers(false);
      setOnlineDrivers([]);
      setShowDriverMarkers(false);
      
      // Clear any existing markers on error
      if (mapRef.current) {
        mapRef.current.clearDriverMarkers();
      }
    }
  };

  const startDriverTracking = () => {
    setTrackingMode(true);
    loadOnlineDrivers();
    
    // Clear any existing interval
    if (trackingIntervalRef.current) {
      clearInterval(trackingIntervalRef.current);
    }
    
    // Refresh driver locations every 30 seconds
    trackingIntervalRef.current = setInterval(() => {
      loadOnlineDrivers();
    }, 30000);
    
    return trackingIntervalRef.current;
  };

  const stopDriverTracking = () => {
    setTrackingMode(false);
    setShowTrackingInfo(false);
    
    // Clear tracking interval
    if (trackingIntervalRef.current) {
      clearInterval(trackingIntervalRef.current);
      trackingIntervalRef.current = null;
    }
    
    // Clear driver markers
    if (mapRef.current) {
      mapRef.current.clearDriverMarkers();
    }
    
    setOnlineDrivers([]);
    setShowDriverMarkers(false);
  };

  const handleMapReady = () => {
    console.log('Map is ready');
    // Start loading online drivers when map is ready
    if (currentLocation) {
      loadOnlineDrivers();
      startDriverTracking();
    }
    setMapReady(true);
  };

  const handleLocationUpdate = (location: MapLocation) => {
    console.log('📍 Location updated from map:', location);
    // Only update if we don't have a location yet
    if (!currentLocation) {
      setCurrentLocation(location);
      setPickup(location.address || 'Current Location');
      
      // Start loading online drivers when location is available
      loadOnlineDrivers();
      startDriverTracking();
    }
  };

  const handleLocationError = (error: string) => {
    console.error('❌ Location error:', error);
    setLoadingLocation(false);
    Alert.alert('Location Error', error);
  };

  const handleRouteSelection = (routeIndex: number) => {
    if (routeIndex !== selectedRouteIndex && routeAlternatives[routeIndex]) {
      setSelectedRouteIndex(routeIndex);
      setRouteData(routeAlternatives[routeIndex]);
      
      // Update map with selected route
      if (mapRef.current && currentLocation && destinationLocation) {
        mapRef.current.highlightRoute(currentLocation, destinationLocation, routeAlternatives[routeIndex]);
      }
      
      // Reload ride options with new route
      setTimeout(() => {
        loadRideOptions(routeAlternatives[routeIndex]);
      }, 100);
    }
  };

  const toggleRouteAlternatives = () => {
    setShowRouteAlternatives(!showRouteAlternatives);
  };

  const toggleTrackingInfo = () => {
    if (trackingMode) {
      if (showTrackingInfo) {
        stopDriverTracking();
      } else {
        setShowTrackingInfo(true);
      }
    } else {
      // If not in tracking mode, start tracking first
      setTrackingMode(true);
      setShowTrackingInfo(true);
      loadOnlineDrivers();
    }
  };

  // Check for active ride requests when component mounts
  useEffect(() => {
    const checkActiveRideRequest = async () => {
      try {
        // Get active ride requests for the current user
        const activeRequests = await RideRequestService.getCustomerActiveRideRequests();
        if (activeRequests && activeRequests.length > 0) {
          const latestRequest = activeRequests[0]; // Get the most recent active request
          console.log('🔄 Setting currentRideRequest from active requests:', {
            requestId: latestRequest.requestId,
            status: latestRequest.status,
            hasDriver: !!latestRequest.driver
          });
          setCurrentRideRequest(latestRequest);
          // Don't set hasCreatedRequest here - this is for requests from previous sessions
          console.log('🔄 Found active ride request from previous session:', latestRequest.requestId);
          
          // Restore map state from the active request
          if (latestRequest.destinationLocation) {
            setDestinationLocation(latestRequest.destinationLocation);
            console.log('📍 Restored destination location:', latestRequest.destinationLocation.address);
          }
          
          if (latestRequest.pickupLocation) {
            setCurrentLocation(latestRequest.pickupLocation);
            console.log('📍 Restored pickup location:', latestRequest.pickupLocation.address);
          }
          
          // Restore selected ride service if available
          if (latestRequest.rideServiceId) {
            setSelectedRide(latestRequest.rideServiceId);
            console.log('🚗 Restored selected ride service:', latestRequest.rideServiceId);
          }
          
          // Recalculate route for the restored locations
          if (latestRequest.destinationLocation && latestRequest.pickupLocation) {
            console.log('🗺️ Recalculating route for restored locations...');
            try {
              const routeResult = await rideService.calculateRoute(
                { ...latestRequest.pickupLocation, address: latestRequest.pickupLocation.address || 'Current Location' },
                { ...latestRequest.destinationLocation, address: latestRequest.destinationLocation.address || 'Destination' }
              );
              
              if (routeResult && routeResult.routes) {
                console.log('🗺️ Route alternatives calculated for restored locations');
                setRouteAlternatives(routeResult.routes);
                setRouteData(routeResult.bestRoute);
                setSelectedRouteIndex(0);
                
                // Update map with the calculated route
                if (mapRef.current) {
                  console.log('🗺️ Highlighting route on map for restored locations');
                  // Add a small delay to ensure map is fully ready
                  setTimeout(() => {
                    if (mapRef.current && mapReady) {
                      mapRef.current.highlightRoute(latestRequest.pickupLocation, latestRequest.destinationLocation, routeResult.bestRoute);
                    }
                  }, 1000);
                }
              }
            } catch (error) {
              console.error('❌ Error recalculating route for restored locations:', error);
            }
          }
          
          // Load ride options for the restored destination
          if (latestRequest.destinationLocation && latestRequest.pickupLocation) {
            console.log('🚗 Loading ride options for restored destination...');
            // Pass the calculated route data if available
            const routeDataToPass = routeResult?.bestRoute || null;
            await loadRideOptions(routeDataToPass);
          }
          
          // Start polling for status updates
          startStatusPolling(latestRequest.requestId);
        }
      } catch (error) {
        console.error('Error checking for active ride requests:', error);
      }
    };

    checkActiveRideRequest();
  }, []);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" translucent />
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          {/* Header - Floating */}
          <View style={styles.floatingHeader}>
            <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              Book Your Trip
              {trackingMode && onlineDrivers.length > 0 && (
                <Text style={styles.driverCountText}> • {onlineDrivers.length} drivers nearby</Text>
              )}
            </Text>
            <TouchableOpacity 
              style={styles.trackingButton} 
              onPress={toggleTrackingInfo}
              activeOpacity={0.7}
            >
              {loadingDrivers ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons 
                  name={showTrackingInfo ? "close" : "location"} 
                  size={20} 
                  color="#FFFFFF" 
                />
              )}
              {trackingMode && onlineDrivers.length > 0 && (
                <View style={styles.trackingBadge}>
                  <Text style={styles.trackingBadgeText}>{onlineDrivers.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Google Maps - Full Screen */}
          <View style={styles.fullScreenMapContainer}>
            <GoogleMapView
              ref={mapRef}
              currentLocation={currentLocation || {
                latitude: 13.4432,
                longitude: -16.5919,
                address: 'Loading location...'
              }}
              destination={destinationLocation || undefined}
              routeData={routeData || undefined}
              mode="customer"
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
                  <Text style={styles.locationLoadingSubtext}>This helps us find the best route</Text>
                </View>
              </View>
            )}

            {/* Tracking Status Indicator */}
            {trackingMode && showTrackingInfo && (
              <View style={styles.trackingStatusOverlay}>
                <View style={styles.trackingStatusCard}>
                  <View style={styles.trackingStatusHeader}>
                    <View style={styles.trackingIconContainer}>
                      <Ionicons name="location" size={20} color="#10B981" />
                    </View>
                    <Text style={styles.trackingStatusTitle}>Live Tracking Active</Text>
                    <TouchableOpacity 
                      style={styles.closeTrackingButton}
                      onPress={stopDriverTracking}
                    >
                      <Ionicons name="close" size={20} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.trackingStatusText}>
                    {loadingDrivers 
                      ? 'Loading drivers...'
                      : onlineDrivers.length > 0 
                        ? `${onlineDrivers.length} driver${onlineDrivers.length > 1 ? 's' : ''} nearby`
                        : 'Searching for drivers...'
                    }
                  </Text>
                  {currentRideRequest && (
                    <Text style={styles.trackingRequestId}>
                      Request ID: {currentRideRequest.requestId}
                    </Text>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* Route Summary - Professional Design */}
          {destinationLocation && routeData && !showRideOptions && (
            <View style={styles.routeSummaryContainer}>
              <View style={styles.routeSummaryCard}>
                <TouchableOpacity 
                  style={styles.routeSummaryHeader}
                  onPress={() => setIsRouteSummaryCollapsed(!isRouteSummaryCollapsed)}
                  activeOpacity={0.7}
                >
                  <View style={styles.routeHeaderLeft}>
                    <View style={styles.routeIconContainer}>
                      <Ionicons name="car" size={20} color="#3B82F6" />
                    </View>
                    <Text style={styles.routeSummaryTitle}>Route Summary</Text>
                    {routeAlternatives.length > 1 && (
                      <View style={styles.routeCountBadge}>
                        <Text style={styles.routeCountText}>{routeAlternatives.length} routes</Text>
                      </View>
                    )}
                  </View>
                  <Ionicons 
                    name={isRouteSummaryCollapsed ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#64748B" 
                  />
                </TouchableOpacity>
                
                {!isRouteSummaryCollapsed && (
                  <>
                    {/* Route Alternatives */}
                    {routeAlternatives.length > 1 && (
                      <View style={styles.routeAlternativesContainer}>
                        <View style={styles.routeAlternativesHeader}>
                          <Text style={styles.routeAlternativesTitle}>Route Options</Text>
                          <TouchableOpacity 
                            style={styles.toggleAlternativesButton}
                            onPress={toggleRouteAlternatives}
                          >
                            <Ionicons 
                              name={showRouteAlternatives ? "chevron-up" : "chevron-down"} 
                              size={16} 
                              color="#3B82F6" 
                            />
                          </TouchableOpacity>
                        </View>
                        
                        {showRouteAlternatives && (
                          <ScrollView 
                            style={styles.routeAlternativesList}
                            showsVerticalScrollIndicator={false}
                            nestedScrollEnabled={true}
                          >
                            {routeAlternatives.map((route, index) => (
                              <TouchableOpacity
                                key={index}
                                style={[
                                  styles.routeAlternativeItem,
                                  selectedRouteIndex === index && styles.selectedRouteAlternative
                                ]}
                                onPress={() => handleRouteSelection(index)}
                                activeOpacity={0.7}
                              >
                                <View style={styles.routeAlternativeLeft}>
                                  <View style={styles.routeAlternativeIcon}>
                                    <Ionicons 
                                      name={route.isRecommended ? "star" : "car-outline"} 
                                      size={16} 
                                      color={selectedRouteIndex === index ? "#FFFFFF" : "#3B82F6"} 
                                    />
                                  </View>
                                  <View style={styles.routeAlternativeInfo}>
                                    <Text style={[
                                      styles.routeAlternativeName,
                                      selectedRouteIndex === index && styles.selectedRouteText
                                    ]}>
                                      {route.isRecommended ? 'Recommended' : `Route ${index + 1}`}
                                    </Text>
                                    <Text style={[
                                      styles.routeAlternativeDetails,
                                      selectedRouteIndex === index && styles.selectedRouteText
                                    ]}>
                                      {route.legs?.[0]?.duration?.text} • {route.legs?.[0]?.distance?.text}
                                    </Text>
                                  </View>
                                </View>
                                <View style={styles.routeAlternativeRight}>
                                  <Text style={[
                                    styles.routeAlternativeScore,
                                    selectedRouteIndex === index && styles.selectedRouteText
                                  ]}>
                                    {Math.round(route.score)}%
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        )}
                      </View>
                    )}
                    
                    <View style={styles.routeDetailsContainer}>
                      <View style={styles.routeDetailRow}>
                        <View style={styles.routeDetailItem}>
                          <Ionicons name="time-outline" size={16} color="#64748B" />
                          <Text style={styles.routeDetailLabel}>Duration</Text>
                          <Text style={styles.routeDetailValue}>{routeData.legs?.[0]?.duration?.text || 'N/A'}</Text>
                        </View>
                        
                        <View style={styles.routeDetailDivider} />
                        
                        <View style={styles.routeDetailItem}>
                          <Ionicons name="location-outline" size={16} color="#64748B" />
                          <Text style={styles.routeDetailLabel}>Distance</Text>
                          <Text style={styles.routeDetailValue}>{routeData.legs?.[0]?.distance?.text || 'N/A'}</Text>
                        </View>
                        
                        <View style={styles.routeDetailDivider} />
                        
                        <View style={styles.routeDetailItem}>
                          <Ionicons name="speedometer-outline" size={16} color="#64748B" />
                          <Text style={styles.routeDetailLabel}>Speed</Text>
                          <Text style={styles.routeDetailValue}>{routeData.safetyFeatures?.recommendedSpeed || 60} km/h</Text>
                        </View>
                      </View>
                      
                      {/* Safety Score */}
                      <View style={styles.safetyScoreContainer}>
                        <View style={styles.safetyScoreHeader}>
                          <Ionicons name="shield-checkmark-outline" size={16} color="#10B981" />
                          <Text style={styles.safetyScoreLabel}>Safety Score</Text>
                          <View style={styles.safetyScoreBadge}>
                            <Text style={styles.safetyScoreValue}>
                              {routeData.safetyFeatures?.safetyScore || 85}%
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.safetyScoreDescription}>
                          {routeData.safetyFeatures?.trafficConditions || 'Optimal driving conditions'}
                        </Text>
                      </View>
                    </View>
                  </>
                )}
              </View>
              
              {/* Action Buttons - Always Visible */}
              <View style={styles.routeActionsContainer}>
                <TouchableOpacity 
                  style={[
                    styles.routeActionButton,
                    // Disable button when vehicle selection should be disabled
                    shouldDisableVehicleSelection() && styles.disabledButton
                  ]}
                  onPress={() => {
                    // Only allow opening if vehicle selection is not disabled
                    if (!shouldDisableVehicleSelection() && !loadingRideOptions && rideOptions.length > 0) {
                      setShowRideOptions(true);
                    }
                  }}
                  disabled={loadingRideOptions || rideOptions.length === 0 || shouldDisableVehicleSelection()}
                >
                  {loadingRideOptions ? (
                    <ActivityIndicator size="small" color="#3B82F6" />
                  ) : shouldDisableVehicleSelection() ? (
                    <Ionicons 
                      name={
                        currentRideRequest?.status === 'ACCEPTED' ? 'checkmark-circle' :
                        currentRideRequest?.status === 'IN_PROGRESS' ? 'car' :
                        currentRideRequest?.status === 'COMPLETED' ? 'checkmark-done-circle' :
                        currentRideRequest?.status === 'CANCELLED' ? 'close-circle' :
                        currentRideRequest?.status === 'EXPIRED' ? 'time' :
                        'car-outline'
                      } 
                      size={16} 
                      color="#3B82F6" 
                    />
                  ) : (
                    <Ionicons name="car-outline" size={16} color="#3B82F6" />
                  )}
                  <Text style={styles.routeActionText}>
                    {loadingRideOptions ? 'Loading...' : 
                     shouldDisableVehicleSelection() ? 
                       currentRideRequest?.status === 'ACCEPTED' ? 'Driver Assigned' :
                       currentRideRequest?.status === 'IN_PROGRESS' ? 'Ride in Progress' :
                       currentRideRequest?.status === 'COMPLETED' ? 'Ride Completed' :
                       currentRideRequest?.status === 'CANCELLED' ? 'Request Cancelled' :
                       currentRideRequest?.status === 'EXPIRED' ? 'Request Expired' :
                       'Vehicle Selected' :
                     rideOptions.length > 0 ? 'Select Vehicle' : 'No vehicles available'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.routeActionButton}>
                  <Ionicons name="share-outline" size={16} color="#3B82F6" />
                  <Text style={styles.routeActionText}>Share Route</Text>
                </TouchableOpacity>
                

              </View>
            </View>
          )}

          {/* Location Input */}
          <View style={styles.locationContainer}>
            <View style={styles.locationInput}>
              <View style={styles.locationRow}>
                <View style={styles.locationColumn}>
                  <View style={styles.locationLabel}>
                    <View style={styles.pickupDot} />
                    <Text style={styles.locationText}>From</Text>
                  </View>
                  <TextInput
                    style={[styles.input, styles.disabledInput]}
                    placeholder="Getting your location..."
                    placeholderTextColor="#94A3B8"
                    value={pickup}
                    editable={false}
                    multiline={true}
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
                <View style={styles.locationDivider} />
                <View style={styles.locationColumn}>
                  <View style={styles.locationLabel}>
                    <Ionicons name="location" size={12} color="#64748B" />
                    <Text style={styles.locationText}>To</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Where would you like to go?"
                    placeholderTextColor="#94A3B8"
                    value={destination}
                    onChangeText={(text) => {
                      setDestination(text);
                      searchPlaces(text);
                    }}
                    onFocus={() => {
                      if (destination.trim()) {
                        setShowSuggestions(true);
                      }
                    }}
                    multiline={true}
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              </View>
            </View>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                <ScrollView style={styles.suggestionsList} keyboardShouldPersistTaps="handled">
                  {searching && (
                    <View style={styles.searchingItem}>
                      <ActivityIndicator size="small" color="#3B82F6" />
                      <Text style={styles.searchingText}>Searching...</Text>
                    </View>
                  )}
                  {suggestions.map((suggestion) => (
                    <TouchableOpacity
                      key={suggestion.place_id}
                      style={styles.suggestionItem}
                      onPress={() => selectDestination(suggestion)}
                    >
                      <Ionicons name="location" size={16} color="#64748B" />
                      <View style={styles.suggestionText}>
                        <Text style={styles.suggestionMainText}>
                          {suggestion.structured_formatting.main_text}
                        </Text>
                        <Text style={styles.suggestionSecondaryText}>
                          {suggestion.structured_formatting.secondary_text}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Vehicle Options - Floating Bottom Sheet */}
          {showRideOptions && !isFromRequestListing && (
            <View style={styles.bottomSheetOverlay}>
              <TouchableOpacity 
                style={styles.bottomSheetBackdrop}
                onPress={() => setShowRideOptions(false)}
                activeOpacity={1}
              />
              <View style={styles.floatingVehicleOptions}>
                {/* Bottom Sheet Handle */}
                <View style={styles.bottomSheetHandle}>
                  <View style={styles.bottomSheetHandleBar} />
                </View>
                
                {/* Header */}
                <View style={styles.rideOptionsHeader}>
                  <TouchableOpacity 
                    style={styles.backToRouteButton}
                    onPress={() => setShowRideOptions(false)}
                  >
                    <Ionicons name="arrow-back" size={20} color="#3B82F6" />
                    <Text style={styles.backToRouteText}>Back</Text>
                  </TouchableOpacity>
                  <Text style={styles.rideOptionsTitle}>
                    {shouldDisableVehicleSelection()
                      ? 'Selected Vehicle Service' 
                      : 'Choose your vehicle'
                    }
                  </Text>
                  <View style={styles.headerSpacer} />
                </View>
                
                {/* Content */}
                <View style={styles.rideOptionsContent}>
                  {loadingRideOptions ? (
                    <View style={styles.rideOptionsLoading}>
                      <ActivityIndicator size="large" color="#3B82F6" />
                      <Text style={styles.rideOptionsLoadingText}>Loading vehicle options...</Text>
                    </View>
                  ) : rideOptions.length === 0 ? (
                    <View style={styles.rideOptionsEmpty}>
                      <Ionicons name="car-outline" size={48} color="#94A3B8" />
                      <Text style={styles.rideOptionsEmptyTitle}>No vehicles available</Text>
                      <Text style={styles.rideOptionsEmptyText}>
                        Try selecting a different destination or check back later.
                      </Text>
                    </View>
                  ) : (
                    <ScrollView
                      style={styles.rideOptionsScrollView}
                      contentContainerStyle={styles.rideOptionsScrollContent}
                      showsVerticalScrollIndicator={true}
                      bounces={true}
                      nestedScrollEnabled={true}
                      scrollEventThrottle={16}
                    >
                      {rideOptions.map((option) => (
                        <TouchableOpacity
                          key={option.id}
                          style={[
                            styles.rideOption,
                            selectedRide === option.id && styles.selectedRideOption,
                            // Disable selection when vehicle selection should be disabled
                            shouldDisableVehicleSelection() && styles.disabledRideOption
                          ]}
                          onPress={() => {
                            // Only allow selection if vehicle selection is not disabled
                            if (!shouldDisableVehicleSelection()) {
                              setSelectedRide(option.id);
                            }
                          }}
                          disabled={shouldDisableVehicleSelection()}
                        >
                          <View style={styles.rideOptionLeft}>
                            <View style={styles.rideOptionIcon}>
                              <Ionicons name={option.icon as any} size={24} color="#3B82F6" />
                            </View>
                            <View style={styles.rideOptionInfo}>
                              <Text style={styles.rideOptionName}>{option.name}</Text>
                              <Text style={styles.rideOptionDescription}>{option.description}</Text>
                              <View style={styles.rideOptionMeta}>
                                <View style={styles.rideOptionMetaItem}>
                                  <Ionicons name="time-outline" size={14} color="#94A3B8" />
                                  <Text style={styles.rideOptionTime}>{option.time}</Text>
                                </View>
                                <View style={styles.rideOptionMetaItem}>
                                  <Ionicons name="location-outline" size={14} color="#94A3B8" />
                                  <Text style={styles.rideOptionDistance}>Nearby</Text>
                                </View>
                              </View>
                            </View>
                          </View>
                          <View style={styles.rideOptionRight}>
                            <Text style={styles.rideOptionPrice}>{option.price}</Text>
                            {selectedRide === option.id && (
                              <View style={styles.selectedIndicator}>
                                <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
                
                {/* Footer */}
                <View style={styles.rideOptionsFooter}>
                  {currentRideRequest && currentRideRequest.status === 'REQUESTED' && hasCreatedRequest && selectedRide ? (
                    // Show cancel button only when ride request is in REQUESTED status AND user created it in this session AND has selected a ride service
                    <TouchableOpacity 
                      style={[styles.requestButton, styles.cancelButton]} 
                      onPress={() => {
                        Alert.alert(
                          'Cancel Ride Request',
                          'Are you sure you want to cancel this ride request? This action cannot be undone.',
                          [
                            {
                              text: 'Keep Request',
                              style: 'cancel'
                            },
                            {
                              text: 'Cancel Request',
                              style: 'destructive',
                              onPress: () => {
                                if (trackingIntervalRef.current) {
                                  clearInterval(trackingIntervalRef.current);
                                  trackingIntervalRef.current = null;
                                }
                                RideRequestService.cancelRideRequest(currentRideRequest.requestId, 'User cancelled')
                                  .then(() => {
                                    setCurrentRideRequest(null);
                                    setHasCreatedRequest(false);
                                    console.log('✅ Ride request cancelled');
                                  })
                                  .catch((error) => {
                                    console.error('❌ Error cancelling ride request:', error);
                                  });
                              }
                            }
                          ]
                        );
                      }}
                    >
                      <Text style={styles.requestButtonText}>
                        Cancel Request
                      </Text>
                    </TouchableOpacity>
                  ) : currentRideRequest && currentRideRequest.status !== 'REQUESTED' ? (
                    // Show status info when ride request is not in REQUESTED status
                    <View style={styles.trackingInfoContainer}>
                      <Text style={styles.trackingInfoText}>
                        📍 Ride request status: {currentRideRequest.status}
                      </Text>
                      <Text style={styles.trackingInfoSubtext}>
                        Request ID: {currentRideRequest.requestId}
                      </Text>
                      {currentRideRequest.driver && (
                        <Text style={styles.trackingInfoSubtext}>
                          Driver: {currentRideRequest.driver.user?.firstName} {currentRideRequest.driver.user?.lastName}
                        </Text>
                      )}
                    </View>
                  ) : currentRideRequest && !hasCreatedRequest ? (
                    // Show tracking info when there's an active request from previous session
                    <View style={styles.trackingInfoContainer}>
                      <Text style={styles.trackingInfoText}>
                        📍 Tracking active ride request: {currentRideRequest.requestId}
                      </Text>
                      <Text style={styles.trackingInfoSubtext}>
                        Status: {currentRideRequest.status}
                      </Text>
                    </View>
                  ) : (
                    // Show request button when no active request or user hasn't created one in this session
                    <TouchableOpacity 
                      style={[styles.requestButton, isRequestingRide && styles.requestButtonDisabled]} 
                      onPress={handleRequestRide}
                      disabled={isRequestingRide || rideOptions.length === 0 || !selectedRide}
                    >
                      {isRequestingRide ? (
                        <View style={styles.requestButtonLoading}>
                          <ActivityIndicator size="small" color="#FFFFFF" />
                          <Text style={styles.requestButtonText}>
                            Creating Request...
                          </Text>
                        </View>
                      ) : !selectedRide ? (
                        <Text style={styles.requestButtonText}>
                          Select a Ride Service
                        </Text>
                      ) : (
                        <Text style={styles.requestButtonText}>
                          Confirm {rideOptions.find(opt => opt.id === selectedRide)?.name || 'Trip'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          )}
        </SafeAreaView>

        {/* Token Notification Card */}
        <TokenNotificationCard />
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E3A8A',
  },
  safeArea: {
    flex: 1,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1E3A8A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E40AF',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  driverCountText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#CBD5E1',
  },
  headerSpacer: {
    width: 40,
  },
  fullScreenMapContainer: {
    flex: 1,
    position: 'relative',
  },
  mapContainer: {
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
  loadingContainer: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    maxWidth: 300,
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
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 12,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  locationContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 90,
    left: 16,
    right: 16,
    zIndex: 5,
  },
  locationInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationColumn: {
    flex: 1,
  },
  locationLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pickupDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#64748B',
    marginRight: 6,
  },
  locationText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  input: {
    fontSize: 14,
    color: '#1E293B',
    paddingVertical: 6,
    paddingHorizontal: 0,
    minHeight: 50,
    textAlignVertical: 'top',
  },
  disabledInput: {
    color: '#94A3B8',
  },
  locationDivider: {
    width: 1,
    height: 80,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 16,
    marginTop: 8,
  },
  suggestionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  suggestionText: {
    marginLeft: 12,
    flex: 1,
  },
  suggestionMainText: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },
  suggestionSecondaryText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  searchingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  searchingText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#64748B',
  },
  bottomSheetOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2000,
  },
  bottomSheetBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  floatingVehicleOptions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 2001,
    flexDirection: 'column',
  },
  bottomSheetHandle: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
    flexShrink: 0,
  },
  bottomSheetHandleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
  },
  chooseRideButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  chooseRideButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
    opacity: 0.5,
  },
  rideOptionsContainer: {
    marginBottom: 24,
  },
  rideOptionsContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
    minHeight: 0,
  },
  rideOptionsScrollView: {
    flex: 1,
    minHeight: 0,
  },
  rideOptionsScrollContent: {
    paddingBottom: 20,
    paddingTop: 8,
    flexGrow: 1,
  },
  rideOptionsFooter: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    flexShrink: 0,
  },
  rideOptionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    flexShrink: 0,
  },
  backToRouteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  backToRouteText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
    marginLeft: 4,
  },
  rideOptionsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 20,
  },
  rideOptionsLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  rideOptionsLoadingText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 16,
    textAlign: 'center',
  },
  rideOptionsEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  rideOptionsEmptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  rideOptionsEmptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  rideOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedRideOption: {
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
    borderColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  rideOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rideOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rideOptionInfo: {
    flex: 1,
  },
  rideOptionName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  rideOptionDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
    lineHeight: 20,
  },
  rideOptionTime: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  rideOptionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 4,
  },
  rideOptionMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rideOptionDistance: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  selectedIndicator: {
    marginTop: 4,
  },
  rideOptionRight: {
    alignItems: 'flex-end',
  },
  rideOptionPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  requestButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  requestButtonDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0.1,
  },
  cancelButton: {
    backgroundColor: '#EF4444',
  },
  requestButtonLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  mapPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  mapPlaceholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
    marginBottom: 4,
  },
  mapPlaceholderSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  locationDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 12,
    marginBottom: 8,
  },
  locationAddress: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 4,
  },
  locationCoords: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'monospace',
  },
  locationLoading: {
    fontSize: 16,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  destinationInfo: {
    alignItems: 'center',
    marginTop: 20,
  },
  destinationDivider: {
    width: 60,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginBottom: 16,
  },
  destinationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 8,
    marginBottom: 6,
  },
  destinationAddress: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 4,
  },
  destinationCoords: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'monospace',
  },
  // Route Summary Styles
  routeSummaryContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 140 : 120,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  routeSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
    maxHeight: 400, // Prevent card from becoming too tall
  },
  routeSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  routeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  routeSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  routeCountBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  routeCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  routeDetailsContainer: {
    marginBottom: 16,
    marginTop: 8,
  },
  routeDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routeDetailItem: {
    flex: 1,
    alignItems: 'center',
  },
  routeDetailLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 2,
  },
  routeDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  routeDetailDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  routeActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
  },
  routeActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  routeActionButtonDisabled: {
    opacity: 0.5,
    backgroundColor: 'rgba(100, 116, 139, 0.05)',
  },
  routeActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
    marginLeft: 6,
  },
  // Safety Score Styles
  safetyScoreContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  safetyScoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  safetyScoreLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
    marginLeft: 4,
    flex: 1,
  },
  safetyScoreBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  safetyScoreValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  safetyScoreDescription: {
    fontSize: 11,
    color: '#64748B',
    marginLeft: 20,
  },
  // Route Alternatives Styles
  routeAlternativesContainer: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  routeAlternativesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  routeAlternativesTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  toggleAlternativesButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  routeAlternativesList: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxHeight: 200, // Limit height to prevent overflow
  },
  routeAlternativeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    minHeight: 70,
  },
  selectedRouteAlternative: {
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  routeAlternativeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  routeAlternativeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  routeAlternativeInfo: {
    flex: 1,
    marginRight: 8,
  },
  routeAlternativeName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  selectedRouteText: {
    color: '#3B82F6',
  },
  routeAlternativeDetails: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  routeAlternativeRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 50,
  },
  routeAlternativeScore: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  // Location Loading Overlay Styles
  locationLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  locationLoadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 200,
  },
  locationLoadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
    textAlign: 'center',
  },
  locationLoadingSubtext: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
  trackingStatusOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 100, // Better position for breathing room
    left: 20,
    right: 20,
    zIndex: 10,
  },
  trackingStatusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.1)',
  },
  trackingStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  trackingIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  trackingStatusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  trackingPulse: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    marginLeft: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
  trackingStatusText: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  trackingRequestId: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  trackingButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  trackingBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  trackingBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeTrackingButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  trackingInfoContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  trackingInfoText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 4,
  },
  trackingInfoSubtext: {
    fontSize: 12,
    color: '#CBD5E1',
    textAlign: 'center',
  },
  disabledRideOption: {
    opacity: 0.5,
  },

}); 