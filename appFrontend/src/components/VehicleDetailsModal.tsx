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
  Modal,
  Dimensions,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { rentalApi } from '../services/rentalApi';
import { RentalDriver, RentalRideService } from '../services/rentalService';
import { ENV_CONFIG } from '../config/env';

interface VehicleDetailsModalProps {
  isVisible: boolean;
  onClose: () => void;
  driver: RentalDriver;
  selectedService: RentalRideService;
  scheduleData: any;
}

export default function VehicleDetailsModal({ 
  isVisible, 
  onClose, 
  driver, 
  selectedService, 
  scheduleData 
}: VehicleDetailsModalProps) {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [vehicleImages, setVehicleImages] = useState<{
    interior: Array<{ id: string; fileUrl: string; fileName: string; uploadedAt: string; documentType?: string }>;
    exterior: Array<{ id: string; fileUrl: string; fileName: string; uploadedAt: string; documentType?: string }>;
  }>({ interior: [], exterior: [] });
  const [activeExteriorIndex, setActiveExteriorIndex] = useState(0);
  const [activeInteriorIndex, setActiveInteriorIndex] = useState(0);

  useEffect(() => {
    if (isVisible) {
      loadVehicleImages();
    }
  }, [isVisible]);

  const loadVehicleImages = async () => {
    try {
      setIsLoading(true);
      
      // Use documents from the driver's rider application if available
      const documents = driver.riderApplication?.documents || [];
      
      console.log('VehicleDetailsModal: Driver data:', {
        driverId: driver.id,
        riderApplicationId: driver.riderApplication?.id,
        totalDocuments: documents.length,
        documents: documents.map(doc => ({
          id: doc.id,
          documentType: doc.documentType,
          fileUrl: doc.fileUrl,
          fileName: doc.fileName
        }))
      });
      
      console.log('VehicleDetailsModal: ENV_CONFIG.API_BASE_URL:', ENV_CONFIG.API_BASE_URL);
      
      const images = {
        interior: documents.filter(doc => doc.documentType === 'CAR_INTERIOR_PHOTO'),
        exterior: documents.filter(doc => doc.documentType === 'CAR_EXTERIOR_PHOTO')
      };
      
      console.log('VehicleDetailsModal: Filtered images:', {
        interior: images.interior.length,
        exterior: images.exterior.length
      });
      
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
      
      const payload = {
        customerId: scheduleData.user?.id,
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

      await rentalApi.createRental(payload);
      
      Alert.alert(
        'Success', 
        'Vehicle rental booked successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              onClose();
              navigation.navigate('AssetRental' as never);
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
    // Since this driver was selected from the available drivers list,
    // they should be available for the selected dates
    const isAvailable = true; // Driver is available for the selected dates
    return {
      isAvailable,
      message: 'Vehicle is available for your selected dates'
    };
  };

  const availability = getAvailabilityStatus();
  const { width } = Dimensions.get('window');

  const renderImageSlider = (images: Array<{ id: string; fileUrl: string; fileName: string; uploadedAt: string; documentType?: string }>, title: string, activeIndex: number, setActiveIndex: (index: number) => void) => {
    if (images.length === 0) {
      return (
        <View style={styles.imageCard}>
          <Text style={styles.imageTitle}>{title}</Text>
          <View style={styles.noImageContainer}>
            <Ionicons name={title.includes('Exterior') ? "car-outline" : "car-sport-outline"} size={48} color="#9CA3AF" />
            <Text style={styles.noImageText}>No {title.toLowerCase()} images available</Text>
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
          onMomentumScrollEnd={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.x / width);
            setActiveIndex(index);
          }}
          renderItem={({ item }) => {
            const imageUrl = `${ENV_CONFIG.API_BASE_URL}${item.fileUrl}`;
            console.log('VehicleDetailsModal: Loading image:', {
              originalFileUrl: item.fileUrl,
              fullImageUrl: imageUrl,
              documentType: item.documentType,
              fileName: item.fileName
            });
            
            return (
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.vehicleImage}
                  resizeMode="cover"
                  onLoad={() => console.log('VehicleDetailsModal: Image loaded successfully:', imageUrl)}
                  onError={(error) => console.error('VehicleDetailsModal: Image failed to load:', imageUrl, error)}
                />
              </View>
            );
          }}
          keyExtractor={(item) => item.id}
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
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Vehicle Details</Text>
          </View>
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
            <Text style={styles.availabilityMessage}>{availability.message}</Text>
          </View>

          {/* Driver Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Driver Information</Text>
            <View style={styles.card}>
              <View style={styles.driverInfo}>
                <View style={styles.driverHeader}>
                  <Text style={styles.driverName}>
                    {driver.riderApplication.firstName || driver.user.firstName} {driver.riderApplication.lastName || driver.user.lastName}
                  </Text>
                  <View style={styles.verificationBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={styles.verificationText}>Verified</Text>
                  </View>
                </View>
                {driver.riderApplication.address && (
                  <View style={styles.addressRow}>
                    <Ionicons name="location" size={16} color="#6B7280" />
                    <Text style={styles.addressText}>{driver.riderApplication.address}</Text>
                  </View>
                )}
                {driver.rating && (
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={16} color="#F59E0B" />
                    <Text style={styles.ratingText}>{driver.rating} ({driver.ratingCount} rides)</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Vehicle Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vehicle Information</Text>
            <View style={styles.card}>
              <View style={styles.vehicleInfo}>
                <View style={styles.vehicleRow}>
                  <Ionicons name="car" size={20} color="#3B82F6" />
                  <View style={styles.vehicleDetails}>
                    <Text style={styles.vehicleLabel}>Model</Text>
                    <Text style={styles.vehicleValue}>{driver.riderApplication.vehicleModel}</Text>
                  </View>
                </View>
                <View style={styles.vehicleRow}>
                  <Ionicons name="pricetag" size={20} color="#10B981" />
                  <View style={styles.vehicleDetails}>
                    <Text style={styles.vehicleLabel}>License Plate</Text>
                    <Text style={styles.vehicleValue}>{driver.riderApplication.licensePlate}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Vehicle Images */}
          {renderImageSlider(vehicleImages.exterior, 'Exterior Photos', activeExteriorIndex, setActiveExteriorIndex)}
          {renderImageSlider(vehicleImages.interior, 'Interior Photos', activeInteriorIndex, setActiveInteriorIndex)}

          {/* Rental Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rental Details</Text>
            <View style={styles.card}>
              <View style={styles.rentalDetails}>
                <View style={styles.rentalRow}>
                  <Ionicons name="calendar" size={20} color="#3B82F6" />
                  <View style={styles.rentalInfo}>
                    <Text style={styles.rentalLabel}>Start Date</Text>
                    <Text style={styles.rentalValue}>
                      {scheduleData.startDate.toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <View style={styles.rentalRow}>
                  <Ionicons name="calendar" size={20} color="#EF4444" />
                  <View style={styles.rentalInfo}>
                    <Text style={styles.rentalLabel}>End Date</Text>
                    <Text style={styles.rentalValue}>
                      {scheduleData.endDate.toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <View style={styles.rentalRow}>
                  <Ionicons name="location" size={20} color="#10B981" />
                  <View style={styles.rentalInfo}>
                    <Text style={styles.rentalLabel}>Pickup Location</Text>
                    <Text style={styles.rentalValue}>
                      {scheduleData.pickupAddress || scheduleData.pickupLocation}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Bottom spacing for scroll */}
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
                <Text style={styles.bookButtonText}>Book Vehicle</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

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
  closeButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
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
    paddingHorizontal: 20,
  },
  availabilityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  driverInfo: {
    flex: 1,
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  verificationText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#10B981',
    marginLeft: 2,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  ratingText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  vehicleInfo: {
    gap: 12,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleDetails: {
    marginLeft: 12,
    flex: 1,
  },
  vehicleLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  vehicleValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  imageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  imageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  noImageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  noImageText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  imageContainer: {
    width: Dimensions.get('window').width - 64,
    height: 200,
    marginRight: 12,
  },
  vehicleImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
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
  rentalDetails: {
    gap: 12,
  },
  rentalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rentalInfo: {
    marginLeft: 12,
    flex: 1,
  },
  rentalLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  rentalValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  bottomSpacing: {
    height: 100,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  bookButton: {
    backgroundColor: '#10B981',
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
