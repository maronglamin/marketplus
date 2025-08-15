import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Platform,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { AppStackParamList } from '../navigation/AppNavigator';
import { GoogleMapView, type GoogleMapViewRef, type MapLocation, type RouteData } from '../components/GoogleMapView';
import { rideService, type LocationData } from '../services/rideService';
import { RideHistoryService } from '../services/rideHistoryService';
import * as Location from 'expo-location';

type JourneyMapViewNavigationProp = NativeStackNavigationProp<AppStackParamList, 'JourneyMapView'>;

interface JourneyMapViewParams {
  rideId: string;
  pickupLocation: MapLocation;
  destinationLocation: MapLocation;
  customerName: string;
  estimatedDuration: string;
  estimatedDistance: string;
  totalFare: number;
  currencySymbol: string;
}

export function JourneyMapView() {
  const navigation = useNavigation<JourneyMapViewNavigationProp>();
  const route = useRoute();
  const mapRef = useRef<GoogleMapViewRef>(null);
  const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const journeyStartTimeRef = useRef<Date | null>(null);
  
  const [currentLocation, setCurrentLocation] = useState<MapLocation | null>(null);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(true);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [journeyProgress, setJourneyProgress] = useState(0); // 0-100%
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<string>('');
  const [distanceRemaining, setDistanceRemaining] = useState<string>('');
  const [isLocationPolling, setIsLocationPolling] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const [isAutoCompleted, setIsAutoCompleted] = useState(false);
  const [journeyInitialized, setJourneyInitialized] = useState(false);

  const params = route.params as JourneyMapViewParams;

  useEffect(() => {
    initializeJourney();
    
    // Cleanup on unmount
    return () => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }
    };
  }, []);

  // Handle route highlighting when map becomes ready
  useEffect(() => {
    if (mapReady && currentLocation && params.destinationLocation && routeData) {
      console.log('🗺️ Map is ready, highlighting route for journey');
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.highlightRoute(
            currentLocation,
            {
              latitude: params.destinationLocation.latitude,
              longitude: params.destinationLocation.longitude,
              address: params.destinationLocation.address || ''
            },
            routeData
          );
        }
      }, 500);
    }
  }, [mapReady, currentLocation, params.destinationLocation, routeData]);

  const initializeJourney = async () => {
    try {
      console.log('🚀 Initializing journey...');
      
      // Get current location
      const location = await getCurrentLocation();
      setCurrentLocation(location);
      
      // Set journey start time
      journeyStartTimeRef.current = new Date();
      console.log('⏰ Journey start time set:', journeyStartTimeRef.current);
      
      // Start location polling
      startLocationPolling();
      
      // Get route data if we have both locations
      if (location && params.destinationLocation) {
        try {
          console.log('🛣️ Calculating route...');
          setLoadingRoute(true);
          setRouteError(null);
          
          // Reduce timeout for route calculation (8 seconds instead of 15)
          const routePromise = rideService.calculateRoute(
            {
              latitude: location.latitude,
              longitude: location.longitude,
              address: location.address || ''
            },
            {
              latitude: params.destinationLocation.latitude,
              longitude: params.destinationLocation.longitude,
              address: params.destinationLocation.address || ''
            }
          );
          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Route calculation timeout')), 8000)
          );
          
          const routeResult = await Promise.race([routePromise, timeoutPromise]);
          
          if (routeResult && routeResult.bestRoute) {
            setRouteData(routeResult.bestRoute);
            setLoadingRoute(false);
            console.log('✅ Route data loaded:', routeResult.bestRoute);
          } else {
            // Fallback to direct route calculation
            console.log('⚠️ No route data available, using fallback calculation');
            const fallbackRoute = createFallbackRoute(location, params.destinationLocation);
            setRouteData(fallbackRoute);
            setLoadingRoute(false);
          }
        } catch (error: any) {
          console.error('❌ Error loading route:', error);
          
          // Always provide fallback route data to prevent infinite loading
          console.log('🔄 Creating fallback route due to error');
          const fallbackRoute = createFallbackRoute(location, params.destinationLocation);
          setRouteData(fallbackRoute);
          setRouteError('Using estimated route (actual route unavailable)');
          setLoadingRoute(false);
        }
      } else {
        setLoadingRoute(false);
      }
      
      setJourneyInitialized(true);
      console.log('✅ Journey initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing journey:', error);
      // Ensure loading state is cleared even on error
      setLoadingRoute(false);
      Alert.alert('Journey Initialization Failed', 'Failed to initialize journey. Please try again.');
    }
  };

  // Create fallback route data when API fails
  const createFallbackRoute = (origin: MapLocation, destination: MapLocation) => {
    const distance = calculateDistance(
      origin.latitude,
      origin.longitude,
      destination.latitude,
      destination.longitude
    );
    
    // Estimate duration based on distance (assuming average speed of 30 km/h in city)
    const duration = Math.round(distance * 2); // 2 minutes per km
    
    return {
      legs: [{
        duration: { text: `${duration} min` },
        distance: { text: `${distance.toFixed(1)} km` }
      }],
      overview_polyline: {
        points: '' // Will be handled by map component
      },
      safetyFeatures: {
        safetyScore: 85,
        recommendedSpeed: 50,
        trafficConditions: 'Estimated route conditions'
      }
    };
  };

  const getCurrentLocation = async (): Promise<MapLocation> => {
    try {
      // Request permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission denied');
      }

      // Get current position with high accuracy
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10,
      });

      // Get address using reverse geocoding
      const address = await rideService.reverseGeocode(
        location.coords.latitude,
        location.coords.longitude
      );

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: address
      };
    } catch (error) {
      console.error('❌ Error getting current location:', error);
      throw error;
    }
  };

  const startLocationPolling = () => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
    }

    console.log('📍 Starting location polling...');
    setIsLocationPolling(true);

    // Poll location every 5 seconds instead of 3 for better performance
    locationIntervalRef.current = setInterval(async () => {
      try {
        const newLocation = await getCurrentLocation();
        
        if (newLocation && currentLocation) {
          // Only update if location changed significantly (more than 10 meters)
          const distance = calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            newLocation.latitude,
            newLocation.longitude
          );
          
          if (distance > 0.01) { // 10 meters threshold
            console.log('📍 Location updated:', newLocation.address);
            setCurrentLocation(newLocation);
            
            // Update map smoothly without visible refresh
            if (mapRef.current) {
              // Use the existing method to update location
              mapRef.current.centerMap?.(newLocation);
            }
            
            // Update journey progress
            if (routeData) {
              updateJourneyProgress(newLocation, routeData);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error in location polling:', error);
        // Don't stop polling on error, just log it
      }
    }, 5000) as unknown as NodeJS.Timeout; // 5 second interval for better performance
  };

  const updateJourneyProgress = (location: MapLocation, route: RouteData) => {
    try {
      // Calculate distance to destination
      const distanceToDestination = calculateDistance(
        location.latitude,
        location.longitude,
        params.destinationLocation.latitude,
        params.destinationLocation.longitude
      );
      
      setDistanceRemaining(`${distanceToDestination.toFixed(1)} km`);
      
      // Calculate progress based on route data
      if (route.legs?.[0]?.distance?.text) {
        const totalDistanceText = route.legs[0].distance.text;
        const totalDistance = parseFloat(totalDistanceText.replace(' km', '').replace(' mi', ''));
        const progress = Math.max(0, Math.min(100, ((totalDistance - distanceToDestination) / totalDistance) * 100));
        setJourneyProgress(progress);
        
        // Auto-complete ride when progress reaches 95% (accounting for GPS accuracy)
        if (progress >= 95 && journeyProgress < 95 && !isAutoCompleted) {
          console.log('🎉 Journey progress reached 95% - Auto-completing ride');
          setIsAutoCompleted(true);
          handleAutoCompleteRide();
        }
      }
      
      // Update estimated time remaining
      if (route.legs?.[0]?.duration?.text) {
        setEstimatedTimeRemaining(route.legs[0].duration.text);
      }
      
    } catch (error) {
      console.error('❌ Error updating journey progress:', error);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleCompleteJourney = async () => {
    Alert.alert(
      'Complete Journey',
      'Are you sure you want to complete this journey?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Complete', 
          onPress: async () => {
            try {
              // Stop location polling
              if (locationIntervalRef.current) {
                clearInterval(locationIntervalRef.current);
              }
              
              // Calculate actual distance and duration
              const actualDistance = calculateDistance(
                params.pickupLocation.latitude,
                params.pickupLocation.longitude,
                params.destinationLocation.latitude,
                params.destinationLocation.longitude
              );
              
              const journeyStartTime = journeyStartTimeRef.current;
              const actualDuration = journeyStartTime ? 
                Math.round((Date.now() - journeyStartTime.getTime()) / (1000 * 60)) : 0;
              
              console.log('📏 Journey completion data:', {
                actualDistance: `${actualDistance} km`,
                actualDuration: `${actualDuration} minutes`,
                journeyStartTime: journeyStartTime
              });
              
              // Call API to complete ride with actual data
              const result = await RideHistoryService.completeRide(params.rideId);
              
              // Show completion details including fare updates
              let completionMessage = 'The ride has been completed successfully.';
              if (result.fareUpdate) {
                completionMessage += `\n\nActual Distance: ${result.fareUpdate.actualDistance}\nActual Duration: ${result.fareUpdate.actualDuration}\n\nFare Updated: ${result.fareUpdate.originalTotal} → ${result.fareUpdate.newTotal}`;
              }
              
              Alert.alert(
                'Journey Completed! 🎉',
                completionMessage,
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.navigate('DriverRequests')
                  }
                ]
              );
            } catch (error: any) {
              console.error('Error completing ride:', error);
              
              let errorMessage = 'Failed to complete ride. Please try again.';
              
              if (error?.response?.status === 400) {
                errorMessage = 'Cannot complete ride. Please ensure the ride is in progress.';
              } else if (error?.response?.status === 404) {
                errorMessage = 'Ride not found. It may have been cancelled or expired.';
              } else if (error?.response?.status === 403) {
                errorMessage = 'You are not authorized to complete this ride.';
              }
              
              Alert.alert('Complete Ride Failed', errorMessage);
            }
          }
        }
      ]
    );
  };

  const handleAutoCompleteRide = async () => {
    try {
      // Stop location polling
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }
      
      // Calculate actual distance and duration for auto-completion
      const actualDistance = calculateDistance(
        params.pickupLocation.latitude,
        params.pickupLocation.longitude,
        params.destinationLocation.latitude,
        params.destinationLocation.longitude
      );
      
      const journeyStartTime = journeyStartTimeRef.current;
      const actualDuration = journeyStartTime ? 
        Math.round((Date.now() - journeyStartTime.getTime()) / (1000 * 60)) : 0;
      
      console.log('📏 Auto-completion data:', {
        actualDistance: `${actualDistance} km`,
        actualDuration: `${actualDuration} minutes`,
        journeyStartTime: journeyStartTime
      });
      
      // Call API to complete ride
      const result = await RideHistoryService.completeRide(params.rideId);
      
      // Show completion details including fare updates
      let completionMessage = 'You have reached your destination. The ride has been automatically completed.';
      if (result.fareUpdate) {
        completionMessage += `\n\nActual Distance: ${result.fareUpdate.actualDistance}\nActual Duration: ${result.fareUpdate.actualDuration}\n\nFare Updated: ${result.fareUpdate.originalTotal} → ${result.fareUpdate.newTotal}`;
      }
      
      Alert.alert(
        'Journey Auto-Completed! 🎉',
        completionMessage,
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('DriverRequests')
          }
        ]
      );
    } catch (error: any) {
      console.error('Error auto-completing ride:', error);
      
      // Reset auto-completion state on error
      setIsAutoCompleted(false);
      
      let errorMessage = 'Failed to auto-complete ride. You can manually complete the ride.';
      
      if (error?.response?.status === 400) {
        errorMessage = 'Cannot complete ride. Please ensure the ride is in progress.';
      } else if (error?.response?.status === 404) {
        errorMessage = 'Ride not found. It may have been cancelled or expired.';
      } else if (error?.response?.status === 403) {
        errorMessage = 'You are not authorized to complete this ride.';
      }
      
      Alert.alert('Auto-Complete Failed', errorMessage);
    }
  };

  const handleMapReady = () => {
    console.log('🗺️ Journey map is ready');
    setMapReady(true);
    
    // Center map on current location if available
    if (currentLocation && mapRef.current) {
      console.log('📍 Centering map on current location:', currentLocation);
      mapRef.current.centerMap(currentLocation);
    }
    
    // Highlight route if we have all the data
    if (mapRef.current && currentLocation && params.destinationLocation && routeData) {
      console.log('🗺️ Highlighting route on map ready');
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.highlightRoute(
            currentLocation,
            {
              latitude: params.destinationLocation.latitude,
              longitude: params.destinationLocation.longitude,
              address: params.destinationLocation.address || ''
            },
            routeData
          );
        }
      }, 500);
    }
  };

  const handleLocationUpdate = (location: MapLocation) => {
    console.log('📍 Location update from map:', location);
    setCurrentLocation(location);
    
    // Update progress based on new location
    if (routeData) {
      updateJourneyProgress(location, routeData);
    }
  };

  const handleLocationError = (error: string) => {
    console.error('❌ Location error:', error);
    Alert.alert('Location Error', error);
  };



  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" translucent />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => {
            // Stop location polling before going back
            if (locationIntervalRef.current) {
              clearInterval(locationIntervalRef.current);
            }
            navigation.goBack();
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Journey to Destination</Text>
          <Text style={styles.headerSubtitle}>
            {params.customerName} • {params.estimatedDuration}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.completeButton}
          onPress={handleCompleteJourney}
        >
          <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Map Container */}
      <View style={styles.mapContainer}>
        <GoogleMapView
          ref={mapRef}
          currentLocation={currentLocation || {
            latitude: 13.4432,
            longitude: -16.5919,
            address: 'Loading location...'
          }}
          mode="driver"
          isOnline={true}
          onMapReady={handleMapReady}
          onLocationUpdate={handleLocationUpdate}
          onLocationError={handleLocationError}
          style={styles.map}
        />
        
        {loadingRoute && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Calculating route...</Text>
            </View>
          </View>
        )}

        {/* Location Status Indicator */}
        {isLocationPolling && (
          <View style={styles.locationStatus}>
            <View style={styles.locationIndicator}>
              <Ionicons name="location" size={12} color="#10B981" />
            </View>
            <Text style={styles.locationStatusText}>Live tracking active</Text>
          </View>
        )}
      </View>

      {/* Journey Info Card */}
      <View style={styles.journeyInfoCard}>
        <View style={styles.journeyHeader}>
          <View style={styles.journeyHeaderLeft}>
            <Text style={styles.journeyTitle}>Journey Progress</Text>
            <Text style={styles.customerName}>{params.customerName}</Text>
          </View>
          <View style={styles.journeyHeaderRight}>
            <Text style={styles.fareText}>
              {params.currencySymbol}{params.totalFare.toFixed(2)}
            </Text>
            <Text style={styles.fareLabel}>Total Fare</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${journeyProgress}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {Math.round(journeyProgress)}% Complete
            {journeyProgress >= 95 && isAutoCompleted && (
              <Text style={styles.autoCompleteText}> • Auto-completing...</Text>
            )}
          </Text>
        </View>

        {/* Journey Stats */}
        <View style={styles.journeyStats}>
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={20} color="#3B82F6" />
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{estimatedTimeRemaining}</Text>
              <Text style={styles.statLabel}>Time Remaining</Text>
            </View>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <Ionicons name="location-outline" size={20} color="#10B981" />
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{distanceRemaining}</Text>
              <Text style={styles.statLabel}>Distance Remaining</Text>
            </View>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <Ionicons name="flag-outline" size={20} color="#EF4444" />
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{params.estimatedDistance}</Text>
              <Text style={styles.statLabel}>Total Distance</Text>
            </View>
          </View>
        </View>

        {/* Destination Info */}
        <View style={styles.destinationInfo}>
          <View style={styles.destinationHeader}>
            <Ionicons name="flag" size={16} color="#EF4444" />
            <Text style={styles.destinationTitle}>Destination</Text>
            <TouchableOpacity 
              style={styles.cancelJourneyButton}
              onPress={() => {
                Alert.alert(
                  'Cancel Journey',
                  'Are you sure you want to cancel this journey? This action cannot be undone.',
                  [
                    { text: 'Keep Journey', style: 'cancel' },
                    { 
                      text: 'Cancel Journey', 
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          // Stop location polling
                          if (locationIntervalRef.current) {
                            clearInterval(locationIntervalRef.current);
                          }
                          
                          // Call API to cancel journey
                          await RideHistoryService.cancelRide(params.rideId, 'Cancelled by driver');
                          
                          Alert.alert(
                            'Journey Cancelled',
                            'The journey has been cancelled successfully.',
                            [
                              {
                                text: 'OK',
                                onPress: () => navigation.navigate('DriverRequests')
                              }
                            ]
                          );
                        } catch (error: any) {
                          console.error('Error cancelling ride:', error);
                          
                          let errorMessage = 'Failed to cancel ride. Please try again.';
                          
                          if (error?.response?.status === 400) {
                            errorMessage = 'Cannot cancel ride. Please ensure the ride is not already completed.';
                          } else if (error?.response?.status === 404) {
                            errorMessage = 'Ride not found. It may have been cancelled or expired.';
                          } else if (error?.response?.status === 403) {
                            errorMessage = 'You are not authorized to cancel this ride.';
                          }
                          
                          Alert.alert('Cancel Ride Failed', errorMessage);
                        }
                      }
                    }
                  ]
                );
              }}
            >
              <Ionicons name="close-circle" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
          <Text style={styles.destinationAddress} numberOfLines={2}>
            {params.destinationLocation.address}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E3A8A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    backgroundColor: '#1E3A8A',
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
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#CBD5E1',
    marginTop: 2,
  },
  completeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelJourneyButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
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
  loadingCard: {
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
  loadingText: {
    fontSize: 16,
    color: '#3B82F6',
    marginTop: 10,
    textAlign: 'center',
  },
  journeyInfoCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  journeyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  journeyHeaderLeft: {
    flex: 1,
  },
  journeyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 14,
    color: '#64748B',
  },
  journeyHeaderRight: {
    alignItems: 'flex-end',
  },
  fareText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  fareLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
    textAlign: 'center',
  },
  autoCompleteText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '600',
  },
  journeyStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statContent: {
    marginLeft: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  destinationInfo: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
  },
  destinationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  destinationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 8,
  },
  destinationAddress: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 22,
  },
  locationStatus: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  locationIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  locationStatusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
}); 