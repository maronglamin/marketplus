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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import type { AppStackParamList } from '../navigation/AppNavigator';

type RideRequestNavigationProp = NativeStackNavigationProp<AppStackParamList, 'RideRequest'>;

interface RideOption {
  id: string;
  name: string;
  icon: string;
  price: string;
  time: string;
  description: string;
}

interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
}

interface SuggestionItem {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export function RideRequest() {
  const navigation = useNavigation<RideRequestNavigationProp>();
  const mapRef = useRef<MapView>(null);
  
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedRide, setSelectedRide] = useState('standard');
  const [showRideOptions, setShowRideOptions] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<LocationData | null>(null);
  const [region, setRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [searching, setSearching] = useState(false);

  const rideOptions: RideOption[] = [
    {
      id: 'standard',
      name: 'Standard',
      icon: 'car',
      price: '$12.55',
      time: '3 min',
      description: 'Reliable transportation for everyday trips',
    },
    {
      id: 'premium',
      name: 'Premium',
      icon: 'car-sport',
      price: '$15.85',
      time: '5 min',
      description: 'Luxury vehicles with enhanced comfort',
    },
    {
      id: 'eco',
      name: 'Eco',
      icon: 'leaf',
      price: '$13.25',
      time: '4 min',
      description: 'Environmentally friendly electric vehicles',
    },
  ];

  useEffect(() => {
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    try {
      setLoadingLocation(true);
      
      // Check current permission status
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      
      if (existingStatus === 'granted') {
        await getCurrentLocation();
      } else {
        // Request permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status === 'granted') {
          await getCurrentLocation();
        } else {
          setPermissionDenied(true);
          setLoadingLocation(false);
          Alert.alert(
            'Location Permission Required',
            'This app needs access to your location to provide ride services. Please enable location permissions in your device settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => {
                // This would typically open device settings
                Alert.alert('Settings', 'Please go to Settings > Privacy & Security > Location Services and enable location access for this app.');
              }}
            ]
          );
        }
      }
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
      console.log('🔍 Starting location request...');
      
      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      console.log('📍 Location obtained:', location);
      const { latitude, longitude } = location.coords;
      console.log('🌍 Coordinates:', { latitude, longitude });

      // Get address from coordinates
      const addressResponse = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      console.log('🏠 Address response:', addressResponse);
      let address = 'Current Location';
      if (addressResponse.length > 0) {
        const addressData = addressResponse[0];
        const addressParts = [
          addressData.street,
          addressData.city,
          addressData.region,
        ].filter(Boolean);
        address = addressParts.join(', ');
        console.log('📍 Formatted address:', address);
      }

      const locationData: LocationData = {
        latitude,
        longitude,
        address,
      };

      console.log('✅ Final location data:', locationData);
      setCurrentLocation(locationData);
      setPickup(address);
      
      // Update map region
      const newRegion = {
        latitude,
        longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
      setRegion(newRegion);

      // Animate map to current location
      if (mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 1000);
      }

    } catch (error) {
      console.error('❌ Error getting location:', error);
      setPermissionDenied(true);
      Alert.alert('Location Error', 'Unable to get your current location. Please check your device settings and try again.');
    } finally {
      setLoadingLocation(false);
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
      
      // This would typically use Google Places API
      // For now, we'll simulate suggestions
      const mockSuggestions: SuggestionItem[] = [
        {
          place_id: '1',
          description: `${query} Street, Downtown`,
          structured_formatting: {
            main_text: query,
            secondary_text: 'Street, Downtown'
          }
        },
        {
          place_id: '2',
          description: `${query} Avenue, Midtown`,
          structured_formatting: {
            main_text: query,
            secondary_text: 'Avenue, Midtown'
          }
        },
        {
          place_id: '3',
          description: `${query} Plaza, City Center`,
          structured_formatting: {
            main_text: query,
            secondary_text: 'Plaza, City Center'
          }
        }
      ];
      
      setSuggestions(mockSuggestions);
    } catch (error) {
      console.error('Error searching places:', error);
    } finally {
      setSearching(false);
    }
  };

  const selectDestination = (suggestion: SuggestionItem) => {
    setDestination(suggestion.description);
    setShowSuggestions(false);
    setSuggestions([]);
    
    // Simulate getting coordinates for the selected place
    const mockLocation: LocationData = {
      latitude: currentLocation ? currentLocation.latitude + 0.01 : 37.78825,
      longitude: currentLocation ? currentLocation.longitude + 0.01 : -122.4324,
      address: suggestion.description,
    };
    
    setDestinationLocation(mockLocation);
    
    // Update map to show both locations
    if (currentLocation && mapRef.current) {
      const newRegion = {
        latitude: (currentLocation.latitude + mockLocation.latitude) / 2,
        longitude: (currentLocation.longitude + mockLocation.longitude) / 2,
        latitudeDelta: Math.abs(currentLocation.latitude - mockLocation.latitude) * 1.5,
        longitudeDelta: Math.abs(currentLocation.longitude - mockLocation.longitude) * 1.5,
      };
      mapRef.current.animateToRegion(newRegion, 1000);
    }
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleRequestRide = () => {
    if (!destination.trim()) {
      Alert.alert('Error', 'Please enter a destination');
      return;
    }
    
    Alert.alert(
      'Confirm Trip',
      `Requesting ${rideOptions.find(opt => opt.id === selectedRide)?.name} trip to ${destination}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => {
          Alert.alert('Success', 'Your trip has been confirmed!');
          navigation.goBack();
        }}
      ]
    );
  };

  const handleRetryLocation = () => {
    setPermissionDenied(false);
    checkLocationPermission();
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1E293B" translucent />
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Book Your Trip</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Google Map */}
          <View style={styles.mapContainer}>
            {Platform.OS === 'ios' || Platform.OS === 'android' ? (
              <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                region={region}
                showsUserLocation={true}
                showsMyLocationButton={true}
                showsCompass={true}
                showsScale={true}
                showsBuildings={true}
                mapType="standard"
              >
                {currentLocation && (
                  <Marker
                    coordinate={{
                      latitude: currentLocation.latitude,
                      longitude: currentLocation.longitude,
                    }}
                    title="Your Location"
                    description={currentLocation.address}
                    pinColor="#3B82F6"
                  />
                )}
                {destinationLocation && (
                  <Marker
                    coordinate={{
                      latitude: destinationLocation.latitude,
                      longitude: destinationLocation.longitude,
                    }}
                    title="Destination"
                    description={destinationLocation.address}
                    pinColor="#EF4444"
                  />
                )}
              </MapView>
            ) : (
              <View style={[styles.map, { backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: '#64748B', fontSize: 16 }}>Map not available on this platform</Text>
              </View>
            )}
            
            {/* Location Loading Overlay */}
            {loadingLocation && (
              <View style={styles.loadingOverlay}>
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#3B82F6" />
                  <Text style={styles.loadingText}>Getting your location...</Text>
                </View>
              </View>
            )}

            {/* Permission Denied Overlay */}
            {permissionDenied && !loadingLocation && (
              <View style={styles.loadingOverlay}>
                <View style={styles.loadingContainer}>
                  <Ionicons name="location" size={48} color="#EF4444" />
                  <Text style={styles.errorTitle}>Location Access Required</Text>
                  <Text style={styles.errorText}>
                    This app needs location access to provide ride services.
                  </Text>
                  <TouchableOpacity style={styles.retryButton} onPress={handleRetryLocation}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.retryButton, { marginTop: 12, backgroundColor: '#10B981' }]} 
                    onPress={() => {
                      console.log('🧪 Manual location test triggered');
                      getCurrentLocation();
                    }}
                  >
                    <Text style={styles.retryButtonText}>Test Location</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

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

          {/* Bottom Content */}
          <View style={styles.bottomContainer}>
            {!showRideOptions ? (
              <TouchableOpacity 
                style={[styles.chooseRideButton, !destination.trim() && styles.disabledButton]}
                onPress={() => setShowRideOptions(true)}
                disabled={!destination.trim()}
              >
                <Text style={styles.chooseRideButtonText}>Select Vehicle</Text>
              </TouchableOpacity>
            ) : (
              <>
                {/* Detailed Trip Options */}
                <View style={styles.rideOptionsContainer}>
                  <Text style={styles.rideOptionsTitle}>Choose your vehicle</Text>
                  {rideOptions.map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.rideOption,
                        selectedRide === option.id && styles.selectedRideOption
                      ]}
                      onPress={() => setSelectedRide(option.id)}
                    >
                      <View style={styles.rideOptionLeft}>
                        <View style={styles.rideOptionIcon}>
                          <Ionicons name={option.icon as any} size={20} color="#3B82F6" />
                        </View>
                        <View style={styles.rideOptionInfo}>
                          <Text style={styles.rideOptionName}>{option.name}</Text>
                          <Text style={styles.rideOptionDescription}>{option.description}</Text>
                          <Text style={styles.rideOptionTime}>{option.time} away</Text>
                        </View>
                      </View>
                      <View style={styles.rideOptionRight}>
                        <Text style={styles.rideOptionPrice}>{option.price}</Text>
                        {selectedRide === option.id && (
                          <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <TouchableOpacity style={styles.requestButton} onPress={handleRequestRide}>
                  <Text style={styles.requestButtonText}>
                    Confirm {rideOptions.find(opt => opt.id === selectedRide)?.name} Trip
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </SafeAreaView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E293B',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
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
  headerSpacer: {
    width: 40,
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
    top: Platform.OS === 'ios' ? 115 : 80,
    left: 16,
    right: 16,
    zIndex: 5,
  },
  locationInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
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
  },
  disabledInput: {
    color: '#94A3B8',
  },
  locationDivider: {
    width: 1,
    height: 60,
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
  bottomContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingTop: 28,
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
  },
  rideOptionsContainer: {
    marginBottom: 24,
  },
  rideOptionsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 20,
  },
  rideOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedRideOption: {
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
    borderColor: '#3B82F6',
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
    backgroundColor: '#1E293B',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  requestButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 