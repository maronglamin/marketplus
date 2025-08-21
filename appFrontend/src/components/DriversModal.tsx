import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { rentalService, RentalDriver, RentalRideService } from '../services/rentalService';

interface DriversModalProps {
  isVisible: boolean;
  onClose: () => void;
  selectedService: RentalRideService | null;
  onDriverSelect: (driver: RentalDriver) => void;
  scheduleData?: any;
}

export default function DriversModal({ 
  isVisible, 
  onClose, 
  selectedService,
  onDriverSelect,
  scheduleData
}: DriversModalProps) {
  const navigation = useNavigation();
  const [drivers, setDrivers] = useState<RentalDriver[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<RentalDriver | null>(null);

  useEffect(() => {
    if (isVisible && selectedService) {
      fetchDriversByService(selectedService.id);
    }
  }, [isVisible, selectedService]);

  const fetchDriversByService = async (serviceId: string) => {
    try {
      setIsLoading(true);
      const serviceDrivers = await rentalService.getDriversByService(serviceId);
      setDrivers(serviceDrivers);
    } catch (error) {
      console.error('Error fetching drivers for service:', error);
      Alert.alert('Error', 'Failed to load drivers. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDriverSelect = (driver: RentalDriver) => {
    setSelectedDriver(driver);
    onClose();
    // Navigate to vehicle details screen instead of directly selecting
    navigation.navigate('VehicleDetails' as never, {
      driver,
      selectedService,
      scheduleData: scheduleData || {}
    } as never);
  };

  const getDriverFullName = (driver: RentalDriver) => {
    return `${driver.user.firstName} ${driver.user.lastName}`;
  };

  const getVehicleInfo = (driver: RentalDriver) => {
    const app = driver.riderApplication;
    return `${app.vehicleYear} ${app.vehicleModel} • ${app.vehicleColor}`;
  };

  const getRatingDisplay = (driver: RentalDriver) => {
    if (driver.rating && driver.ratingCount > 0) {
      return `${driver.rating} (${driver.ratingCount} rides)`;
    }
    return 'New driver';
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Asset Owners</Text>
            {selectedService && (
              <Text style={styles.headerSubtitle}>{selectedService.name}</Text>
            )}
          </View>
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Loading drivers...</Text>
            </View>
          ) : drivers.length > 0 ? (
            <View style={styles.driversContainer}>
              {drivers.map((driver) => (
                <TouchableOpacity
                  key={driver.id}
                  style={styles.driverCard}
                  onPress={() => handleDriverSelect(driver)}
                >
                  {/* Driver Avatar */}
                  <View style={styles.driverAvatar}>
                    <Ionicons name="person" size={24} color="#6B7280" />
                  </View>

                  {/* Owner / Asset Info */}
                  <View style={styles.driverInfo}>
                    <View style={styles.driverHeader}>
                      <Text style={styles.driverName}>{driver.riderApplication.firstName || driver.user.firstName} {driver.riderApplication.lastName || driver.user.lastName}</Text>
                      <View style={styles.verificationBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                        <Text style={styles.verificationText}>Verified</Text>
                      </View>
                    </View>

                    {/* Address */}
                    {driver.riderApplication.address ? (
                      <View style={styles.addressRow}>
                        <Ionicons name="location" size={14} color="#6B7280" />
                        <Text style={styles.addressText}>{driver.riderApplication.address}</Text>
                      </View>
                    ) : null}

                    {/* Vehicle */}
                    <View style={styles.vehicleRow}>
                      <Ionicons name="car" size={14} color="#6B7280" />
                      <Text style={styles.vehicleInfoText}>Vehicle Model: {driver.riderApplication.vehicleModel}</Text>
                    </View>
                    <View style={styles.plateRow}>
                      <Ionicons name="pricetag" size={14} color="#6B7280" />
                      <Text style={styles.plateText}>Vehicle Plate: {driver.riderApplication.licensePlate}</Text>
                    </View>
                  </View>

                  {/* Selection Arrow */}
                  <View style={styles.arrowContainer}>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No Drivers Available</Text>
              <Text style={styles.emptyText}>
                There are currently no drivers available for this service. Please try another service or check back later.
              </Text>
            </View>
          )}
        </ScrollView>
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
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  driversContainer: {
    paddingVertical: 20,
    gap: 16,
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  driverInfo: {
    flex: 1,
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
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
    marginTop: 6,
  },
  addressText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 6,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  vehicleInfoText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 6,
  },
  plateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  plateText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 6,
  },
  arrowContainer: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
