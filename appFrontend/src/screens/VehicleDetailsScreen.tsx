import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Dimensions,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { rentalApi } from '../services/rentalApi';
import { RentalDriver } from '../services/rentalService';
import { ENV_CONFIG } from '../config/env';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/api';
import { getAuthToken } from '../api/auth';

type VehicleDetailsRouteProp = RouteProp<{
  VehicleDetails: {
    driver: RentalDriver;
    selectedService: any;
    scheduleData: any;
  };
}, 'VehicleDetails'>;

// Helper function to get user ID from JWT token
const getUserIdFromToken = async (): Promise<string | null> => {
  try {
    const token = await getAuthToken();
    if (!token) return null;
    
    // Decode JWT token to get userId
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId || null;
  } catch (error) {
    console.log('Error decoding JWT token:', error);
    return null;
  }
};

export default function VehicleDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute<VehicleDetailsRouteProp>();
  const { driver, selectedService, scheduleData } = route.params;
  const { user, refreshUser } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [vehicleImages, setVehicleImages] = useState<{
    interior: Array<{ id: string; fileUrl: string; fileName: string; uploadedAt: string }>;
    exterior: Array<{ id: string; fileUrl: string; fileName: string; uploadedAt: string }>;
  }>({ interior: [], exterior: [] });
  const [activeExteriorIndex, setActiveExteriorIndex] = useState(0);
  const [activeInteriorIndex, setActiveInteriorIndex] = useState(0);

  useEffect(() => {
    loadVehicleImages();
  }, []);

  // Ensure screen is properly focused when it becomes active
  useFocusEffect(
    React.useCallback(() => {
      // This ensures the screen is properly displayed when it comes into focus
      return () => {
        // Cleanup if needed
      };
    }, [])
  );

  const loadVehicleImages = async () => {
    try {
      setIsLoading(true);
      
      // Use documents from the driver's rider application if available
      const documents = driver.riderApplication?.documents || [];
      
      const images = {
        interior: documents.filter(doc => doc.documentType === 'CAR_INTERIOR_PHOTO'),
        exterior: documents.filter(doc => doc.documentType === 'CAR_EXTERIOR_PHOTO')
      };
      
      setVehicleImages(images);
    } catch (error) {
      console.error('Error loading vehicle images:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookRental = async () => {
    try {
      setIsLoading(true);
      
      // Validate required fields before making the API call
      if (!user?.id) {
        Alert.alert('Error', 'User authentication is required. Please log in again.');
        return;
      }
      
      // Refresh user data to ensure we have the latest information
      try {
        await refreshUser();
        console.log('User data refreshed successfully');
      } catch (error) {
        console.log('Failed to refresh user data, proceeding with current data:', error);
      }
      
      if (!selectedService?.id) {
        Alert.alert('Error', 'Ride service information is missing. Please try again.');
        return;
      }
      
      if (!scheduleData.pickupAddress && !scheduleData.pickupLocation) {
        Alert.alert('Error', 'Pickup address is required. Please try again.');
        return;
      }
      
      if (!scheduleData.startDate || !scheduleData.endDate) {
        Alert.alert('Error', 'Start and end dates are required. Please try again.');
        return;
      }
      
      // Get user ID from JWT token to ensure consistency
      const tokenUserId = await getUserIdFromToken();
      if (!tokenUserId) {
        Alert.alert('Error', 'Unable to get user ID from token. Please log in again.');
        return;
      }
      
      // Use the user ID from the JWT token instead of user context
      const customerId = tokenUserId;
      
      // Validate that we have a valid UUID format
      if (!customerId || customerId === 'undefined' || customerId === 'null') {
        Alert.alert('Error', 'Invalid user ID. Please log in again.');
        return;
      }
      
      // Log the comparison for debugging
      console.log('JWT Token User ID:', tokenUserId);
      console.log('User Context ID:', user?.id);
      console.log('Using JWT Token ID for rental booking');
      
      const payload = {
        customerId: customerId,
        rideServiceId: selectedService.id,
        driverId: driver.id,
        riderApplicationId: driver.riderApplication.id,
        pickupAddress: scheduleData.pickupAddress || scheduleData.pickupLocation,
        pickupLatitude: undefined,
        pickupLongitude: undefined,
        startDate: scheduleData.startDate.toISOString(),
        endDate: scheduleData.endDate.toISOString(),
        notes: undefined,
      };

      console.log('=== RENTAL BOOKING DEBUG ===');
      console.log('Rental booking payload:', payload);
      console.log('Authenticated user:', user);
      console.log('ScheduleData user:', scheduleData.user);
      console.log('CustomerId type:', typeof customerId, 'Value:', customerId);
      console.log('Expected JWT userId: ce077982-11e0-4f94-8d7a-b9cf9c8d600a');
      console.log('CustomerId matches JWT:', customerId === 'ce077982-11e0-4f94-8d7a-b9cf9c8d600a');
      console.log('============================');
      await rentalApi.createRental(payload);
      
      Alert.alert(
        'Success', 
        'Vehicle rental booked successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to Home screen after successful booking
              console.log('Attempting to navigate to Home screen...');
              // Reset navigation stack to Home screen with a small delay
              setTimeout(() => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Home' }],
                });
              }, 100);
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('Error booking rental:', error);
      Alert.alert('Error', 'Failed to book vehicle rental. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getAvailabilityStatus = () => {
    // This would typically check if the vehicle is already booked for the selected dates
    // For now, we'll show as available if the driver is online and active
    const isAvailable = driver.isOnline && driver.isActive && driver.isVerified;
    return {
      isAvailable,
      message: isAvailable 
        ? 'Vehicle is available for your selected dates'
        : 'Vehicle is currently not available'
    };
  };

  const availability = getAvailabilityStatus();
  const { width } = Dimensions.get('window');

  const renderImageSlider = (images: Array<{ id: string; fileUrl: string; fileName: string; uploadedAt: string }>, title: string, activeIndex: number, setActiveIndex: (index: number) => void) => {
    if (images.length === 0) {
      return (
        <View style={styles.imageCard}>
          <Text style={styles.imageTitle}>{title}</Text>
          <View style={styles.noImageContainer}>
            <Ionicons name={title.includes('Exterior') ? "car-outline" : "car-sport-outline"} size={48} color="#9CA3AF" />
            <Text style={styles.noImageText}>No {title.toLowerCase()} photos available</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.imageCard}>
        <Text style={styles.imageTitle}>{title}</Text>
        <FlatList
          data={images}
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          snapToInterval={width - 40} // Account for padding
          decelerationRate="fast"
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.sliderItem}>
              <Image 
                source={{ uri: item.fileUrl }} 
                style={styles.vehicleImage}
                resizeMode="cover"
              />
            </View>
          )}
          contentContainerStyle={styles.sliderContainer}
          onMomentumScrollEnd={(event) => {
            const newIndex = Math.round(event.nativeEvent.contentOffset.x / (width - 40));
            setActiveIndex(newIndex);
          }}
        />
        {images.length > 1 && (
          <View style={styles.paginationContainer}>
            {images.map((_, index) => (
              <View 
                key={index} 
                style={[
                  styles.paginationDot,
                  index === activeIndex && styles.paginationDotActive
                ]} 
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vehicle Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Availability Status */}
        <View style={styles.availabilityCard}>
          <View style={styles.availabilityHeader}>
            <Ionicons 
              name={availability.isAvailable ? "checkmark-circle" : "close-circle"} 
              size={24} 
              color={availability.isAvailable ? "#10B981" : "#EF4444"} 
            />
            <Text style={[
              styles.availabilityTitle,
              { color: availability.isAvailable ? "#10B981" : "#EF4444" }
            ]}>
              {availability.isAvailable ? "Available" : "Not Available"}
            </Text>
          </View>
          <Text style={styles.availabilityMessage}>
            {availability.message}
          </Text>
        </View>

        {/* Driver Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Asset Owner</Text>
          <View style={styles.driverCard}>
            <View style={styles.driverAvatar}>
              <Ionicons name="person" size={32} color="#6B7280" />
            </View>
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>
                {driver.riderApplication.firstName || driver.user.firstName} {driver.riderApplication.lastName || driver.user.lastName}
              </Text>
              <Text style={styles.driverSubtitle}>Verified Driver</Text>
              {driver.riderApplication.address && (
                <Text style={styles.driverAddress}>
                  <Ionicons name="location" size={14} color="#6B7280" />
                  {' '}{driver.riderApplication.address}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Vehicle Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Information</Text>
          <View style={styles.vehicleInfoCard}>
            <View style={styles.vehicleInfoRow}>
              <Ionicons name="car" size={20} color="#3B82F6" />
              <Text style={styles.vehicleInfoLabel}>Model:</Text>
              <Text style={styles.vehicleInfoValue}>
                {driver.riderApplication.vehicleYear} {driver.riderApplication.vehicleModel}
              </Text>
            </View>
            <View style={styles.vehicleInfoRow}>
              <Ionicons name="pricetag" size={20} color="#3B82F6" />
              <Text style={styles.vehicleInfoLabel}>Plate:</Text>
              <Text style={styles.vehicleInfoValue}>
                {driver.riderApplication.licensePlate}
              </Text>
            </View>
            {driver.riderApplication.vehicleColor && (
              <View style={styles.vehicleInfoRow}>
                <Ionicons name="color-palette" size={20} color="#3B82F6" />
                <Text style={styles.vehicleInfoLabel}>Color:</Text>
                <Text style={styles.vehicleInfoValue}>
                  {driver.riderApplication.vehicleColor}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Vehicle Images */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Photos</Text>
          
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Loading images...</Text>
            </View>
          ) : (
            <View style={styles.imagesContainer}>
              {renderImageSlider(vehicleImages.exterior, 'Exterior View', activeExteriorIndex, setActiveExteriorIndex)}
              {renderImageSlider(vehicleImages.interior, 'Interior View', activeInteriorIndex, setActiveInteriorIndex)}
            </View>
          )}
        </View>

        {/* Rental Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rental Details</Text>
          <View style={styles.rentalDetailsCard}>
            <View style={styles.rentalDetailRow}>
              <Text style={styles.rentalDetailLabel}>Service:</Text>
              <Text style={styles.rentalDetailValue}>{selectedService.name}</Text>
            </View>
            <View style={styles.rentalDetailRow}>
              <Text style={styles.rentalDetailLabel}>Start Date:</Text>
              <Text style={styles.rentalDetailValue}>
                {scheduleData.startDate.toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.rentalDetailRow}>
              <Text style={styles.rentalDetailLabel}>End Date:</Text>
              <Text style={styles.rentalDetailValue}>
                {scheduleData.endDate.toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.rentalDetailRow}>
              <Text style={styles.rentalDetailLabel}>Pickup Location:</Text>
              <Text style={styles.rentalDetailValue}>
                {scheduleData.pickupAddress || scheduleData.pickupLocation}
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Book Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.bookButton,
            (!availability.isAvailable || isLoading) && styles.bookButtonDisabled
          ]}
          onPress={handleBookRental}
          disabled={!availability.isAvailable || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.bookButtonText}>Book This Vehicle</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const { width: screenWidth } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  availabilityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  availabilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  availabilityTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  availabilityMessage: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  driverCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  driverAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  driverSubtitle: {
    fontSize: 14,
    color: '#10B981',
    marginBottom: 4,
  },
  driverAddress: {
    fontSize: 14,
    color: '#6B7280',
  },
  vehicleInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  vehicleInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  vehicleInfoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 8,
    marginRight: 8,
    minWidth: 60,
  },
  vehicleInfoValue: {
    fontSize: 14,
    color: '#1F2937',
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  imagesContainer: {
    gap: 16,
  },
  imageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  imageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  vehicleImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  sliderContainer: {
    paddingHorizontal: 0,
  },
  sliderItem: {
    width: screenWidth - 40, // Account for container padding
    marginRight: 0,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#3B82F6',
  },
  noImageContainer: {
    height: 200,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  noImageText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  rentalDetailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  rentalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  rentalDetailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  rentalDetailValue: {
    fontSize: 14,
    color: '#1F2937',
    flex: 1,
    textAlign: 'right',
  },
  bottomSpacing: {
    height: 100,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32, // Add extra bottom padding for better spacing
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  bookButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
