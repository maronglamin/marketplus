import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import realTimeRideService, {
  RideUpdate,
  DriverLocationUpdate,
  RideAcceptedNotification
} from '../services/realTimeRideService';
import { GoogleMapView, type GoogleMapViewRef, type MapLocation } from './GoogleMapView';

interface DriverMarker {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
}

interface RealTimeRideTrackerProps {
  rideId: string;
  pickupLocation: MapLocation;
  destinationLocation: MapLocation;
  onRideUpdate?: (update: RideUpdate) => void;
  onDriverLocationUpdate?: (update: DriverLocationUpdate) => void;
  onRideAccepted?: (notification: RideAcceptedNotification) => void;
}

const RealTimeRideTracker: React.FC<RealTimeRideTrackerProps> = ({
  rideId,
  pickupLocation,
  destinationLocation,
  onRideUpdate,
  onDriverLocationUpdate,
  onRideAccepted
}) => {
  const [driverLocation, setDriverLocation] = useState<DriverMarker | null>(null);
  const [rideStatus, setRideStatus] = useState<string>('ACCEPTED');
  const [estimatedArrival, setEstimatedArrival] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<MapLocation | null>(null);

  const mapRef = useRef<GoogleMapViewRef>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const reconnectTimeout = useRef<number | null>(null);

  // Connect to WebSocket service
  const connectToWebSocket = useCallback(async () => {
    try {
      console.log('🔌 Connecting to WebSocket service...');
      await realTimeRideService.connect();
      setIsConnected(true);
      setConnectionError(null);
      
      // Join the specific ride room
      realTimeRideService.joinRide(rideId);
      console.log('✅ Joined ride room:', rideId);
      
    } catch (error) {
      console.error('❌ Failed to connect to WebSocket:', error);
      setConnectionError(error instanceof Error ? error.message : 'Unknown error');
      setIsConnected(false);
      
      // Retry connection after delay
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      reconnectTimeout.current = setTimeout(connectToWebSocket, 5000);
    }
  }, [rideId]);

  // Disconnect from WebSocket service
  const disconnectFromWebSocket = useCallback(() => {
    console.log('🔌 Disconnecting from WebSocket service...');
    realTimeRideService.leaveRide(rideId);
    realTimeRideService.disconnect();
    setIsConnected(false);
    
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
  }, [rideId]);

  // Handle ride updates
  const handleRideUpdate = useCallback((update: RideUpdate) => {
    console.log('📡 Ride update received:', update);
    setRideStatus(update.data.status);
    
    if (update.data.estimatedArrival) {
      setEstimatedArrival(update.data.estimatedArrival);
    }
    
    // Update map with new ride status
    if (mapRef.current) {
      mapRef.current.updateRideStatus(update.data.status, update.data.estimatedArrival);
    }
    
    // Call parent callback
    onRideUpdate?.(update);
  }, [onRideUpdate]);

  // Handle driver location updates
  const handleDriverLocationUpdate = useCallback((update: DriverLocationUpdate) => {
    console.log('📍 Driver location update received:', update);
    
    const newDriverLocation: DriverMarker = {
      latitude: update.location.latitude,
      longitude: update.location.longitude,
      heading: update.location.heading,
      speed: update.location.speed
    };
    
    setDriverLocation(newDriverLocation);
    
    // Update map with new driver location
    if (mapRef.current) {
      mapRef.current.updateDriverLocation({
        latitude: update.location.latitude,
        longitude: update.location.longitude
      });
    }
    
    // Call parent callback
    onDriverLocationUpdate?.(update);
  }, [onDriverLocationUpdate]);

  // Handle ride accepted notifications
  const handleRideAccepted = useCallback((notification: RideAcceptedNotification) => {
    console.log('✅ Ride accepted notification received:', notification);
    
    // Call parent callback
    onRideAccepted?.(notification);
  }, [onRideAccepted]);

  // Subscribe to real-time events
  useEffect(() => {
    const unsubscribeRideUpdate = realTimeRideService.onRideUpdate(handleRideUpdate);
    const unsubscribeDriverLocation = realTimeRideService.onDriverLocationUpdate(handleDriverLocationUpdate);
    const unsubscribeRideAccepted = realTimeRideService.onRideAccepted(handleRideAccepted);

    return () => {
      unsubscribeRideUpdate();
      unsubscribeDriverLocation();
      unsubscribeRideAccepted();
    };
  }, [handleRideUpdate, handleDriverLocationUpdate, handleRideAccepted]);

  // Connect to WebSocket when component mounts
  useEffect(() => {
    connectToWebSocket();

    return () => {
      disconnectFromWebSocket();
    };
  }, [connectToWebSocket, disconnectFromWebSocket]);

  // Get current location and request permissions
  useEffect(() => {
    const getCurrentLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Location Permission Required',
            'This app needs location access to show your current position on the map.',
            [{ text: 'OK' }]
          );
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        const newLocation: MapLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        };

        setCurrentLocation(newLocation);
        console.log('📍 Current location set:', newLocation);
      } catch (error) {
        console.error('❌ Error getting current location:', error);
        Alert.alert(
          'Location Error',
          'Failed to get your current location. Please check your location settings.',
          [{ text: 'OK' }]
        );
      }
    };

    getCurrentLocation();
  }, []);

  // Focus effect to reconnect when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (!isConnected) {
        connectToWebSocket();
      }
    }, [isConnected, connectToWebSocket])
  );

  // Calculate distance between two points
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

  return (
    <View style={styles.container}>
      {/* Status Bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusInfo}>
          <Text style={styles.statusText}>
            {rideStatus === 'ACCEPTED' && 'Driver is on the way'}
            {rideStatus === 'ARRIVING' && 'Driver is arriving'}
            {rideStatus === 'ARRIVED' && 'Driver has arrived'}
            {rideStatus === 'IN_PROGRESS' && 'Ride in progress'}
            {rideStatus === 'COMPLETED' && 'Ride completed'}
            {!rideStatus && 'Unknown status'}
          </Text>
          {estimatedArrival && (
            <Text style={styles.etaText}>ETA: {estimatedArrival} min</Text>
          )}
        </View>
        <View style={styles.connectionStatus}>
          <View style={[styles.connectionDot, { backgroundColor: isConnected ? '#10B981' : '#EF4444' }]} />
          <Text style={[styles.connectionText, { color: isConnected ? '#10B981' : '#EF4444' }]}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>
      </View>

      {/* Map Container */}
      <View style={styles.mapContainer}>
        {currentLocation ? (
          <GoogleMapView
            ref={mapRef}
            currentLocation={currentLocation}
            destination={destinationLocation}
            mode="customer"
            style={styles.map}
            onMapReady={() => {
              console.log('🗺️ Map is ready');
              // Show the route between pickup and destination
              if (mapRef.current) {
                mapRef.current.highlightRoute(pickupLocation, destinationLocation);
              }
            }}
          />
        ) : (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading map...</Text>
          </View>
        )}
      </View>

      {/* Connection Error */}
      {connectionError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Connection Error: {connectionError}</Text>
          <Text style={styles.errorSubtext}>Attempting to reconnect...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#E0F2F7',
    borderBottomWidth: 1,
    borderBottomColor: '#B2EBF2',
  },
  statusInfo: {
    flex: 1,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007B8C',
  },
  etaText: {
    fontSize: 14,
    color: '#007B8C',
    marginTop: 2,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  connectionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
    margin: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderTopWidth: 1,
    borderTopColor: '#FECACA',
    padding: 12,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '500',
  },
  errorSubtext: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 2,
  },
});

export default RealTimeRideTracker; 