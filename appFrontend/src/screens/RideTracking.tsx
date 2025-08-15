import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { AppStackParamList } from '../navigation/AppNavigator';
import RealTimeRideTracker from '../components/RealTimeRideTracker';

type RideTrackingNavigationProp = NativeStackNavigationProp<AppStackParamList, 'RideTracking'>;

interface RideTrackingParams {
  rideId: string;
  requestId: string;
  pickupLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  destinationLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  driver?: {
    id: string;
    firstName: string;
    lastName: string;
    rating?: number;
    vehicleInfo?: {
      model?: string;
      color?: string;
      plateNumber?: string;
    };
  };
}

export function RideTracking() {
  const navigation = useNavigation<RideTrackingNavigationProp>();
  const route = useRoute();
  const params = route.params as RideTrackingParams;

  const [rideStatus, setRideStatus] = useState<string>('ACCEPTED');
  const [estimatedArrival, setEstimatedArrival] = useState<number | null>(null);

  const handleRideUpdate = (update: any) => {
    console.log('🔄 Ride update received:', update);
    setRideStatus(update.status);
    if (update.estimatedArrival) {
      setEstimatedArrival(update.estimatedArrival);
    }
  };

  const handleDriverLocationUpdate = (update: any) => {
    console.log('📍 Driver location update:', update);
  };

  const handleRideAccepted = (notification: any) => {
    console.log('✅ Ride accepted notification:', notification);
  };

  const getStatusText = () => {
    switch (rideStatus) {
      case 'ACCEPTED':
        return 'Driver is on the way';
      case 'ARRIVING':
        return 'Driver is arriving';
      case 'ARRIVED':
        return 'Driver has arrived';
      case 'IN_PROGRESS':
        return 'Ride in progress';
      case 'COMPLETED':
        return 'Ride completed';
      default:
        return 'Tracking ride...';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Live Ride Tracking</Text>
          <Text style={styles.headerSubtitle}>Request #{params.requestId}</Text>
        </View>
      </View>

      {/* Status Bar */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>{getStatusText()}</Text>
        {estimatedArrival && (
          <Text style={styles.etaText}>ETA: {estimatedArrival} min</Text>
        )}
      </View>

      {/* Real-time Ride Tracker */}
      <View style={styles.mapContainer}>
        <RealTimeRideTracker
          rideId={params.rideId}
          pickupLocation={params.pickupLocation}
          destinationLocation={params.destinationLocation}
          onRideUpdate={handleRideUpdate}
          onDriverLocationUpdate={handleDriverLocationUpdate}
          onRideAccepted={handleRideAccepted}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statusText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  etaText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  mapContainer: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
});

export default RideTracking; 