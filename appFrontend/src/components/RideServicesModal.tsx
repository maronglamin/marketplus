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
import { rentalService, RentalRideService } from '../services/rentalService';

interface RideServicesModalProps {
  isVisible: boolean;
  onClose: () => void;
  onServiceSelect: (service: RentalRideService) => void;
}

export default function RideServicesModal({ 
  isVisible, 
  onClose, 
  onServiceSelect 
}: RideServicesModalProps) {
  const [services, setServices] = useState<RentalRideService[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedService, setSelectedService] = useState<RentalRideService | null>(null);

  useEffect(() => {
    if (isVisible) {
      fetchRentalServices();
    }
  }, [isVisible]);

  const fetchRentalServices = async () => {
    try {
      setIsLoading(true);
      const rentalServices = await rentalService.getRentalServices();
      setServices(rentalServices);
    } catch (error) {
      console.error('Error fetching rental services:', error);
      Alert.alert('Error', 'Failed to load rental services. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleServiceSelect = (service: RentalRideService) => {
    setSelectedService(service);
    onServiceSelect(service);
    onClose();
  };

  const getServiceIcon = (vehicleType: string) => {
    switch (vehicleType) {
      case 'DRIVER':
        return 'car';
      case 'MOTORCYCLE':
        return 'bicycle';
      case 'BICYCLE':
        return 'bicycle';
      default:
        return 'car';
    }
  };

  const getServiceColor = (vehicleType: string) => {
    switch (vehicleType) {
      case 'DRIVER':
        return '#3B82F6';
      case 'MOTORCYCLE':
        return '#10B981';
      case 'BICYCLE':
        return '#F59E0B';
      default:
        return '#3B82F6';
    }
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
          <Text style={styles.headerTitle}>Select Rental Service</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Loading rental services...</Text>
            </View>
          ) : services.length > 0 ? (
            <View style={styles.servicesContainer}>
              {services.map((service) => (
                <TouchableOpacity
                  key={service.id}
                  style={styles.serviceCard}
                  onPress={() => handleServiceSelect(service)}
                >
                  {/* Service Icon */}
                  <View 
                    style={[
                      styles.serviceIcon, 
                      { backgroundColor: getServiceColor(service.vehicleType) + '20' }
                    ]}
                  >
                    <Ionicons 
                      name={getServiceIcon(service.vehicleType) as any} 
                      size={32} 
                      color={getServiceColor(service.vehicleType)} 
                    />
                  </View>

                  {/* Service Info */}
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceName}>{service.name}</Text>
                    {service.description && (
                      <Text style={styles.serviceDescription}>{service.description}</Text>
                    )}
                    {/* Restrictions */}
                    {service.restrictions && (
                      <View style={styles.restrictionsContainer}>
                        <View style={styles.restrictionsHeader}>
                          <Ionicons name="information-circle" size={16} color="#3B82F6" />
                          <Text style={styles.restrictionsTitle}>Restrictions</Text>
                        </View>
                        {Array.isArray(service.restrictions)
                          ? service.restrictions.map((item: any, idx: number) => (
                              <View key={idx} style={styles.restrictionItem}>
                                <View style={styles.bullet} />
                                <Text style={styles.restrictionText}>{String(item)}</Text>
                              </View>
                            ))
                          : Object.entries(service.restrictions).map(([key, value], idx) => (
                              <View key={idx} style={styles.restrictionItem}>
                                <View style={styles.bullet} />
                                <Text style={styles.restrictionText}>
                                  {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </Text>
                              </View>
                            ))}
                      </View>
                    )}
                    {/* Footer: Divider + currency at lower-right */}
                    <View style={styles.divider} />
                    <View style={styles.footerRow}>
                      <View style={styles.currencyChip}>
                        <Ionicons name="cash" size={14} color="#0EA5E9" />
                        <Text style={styles.chipText}>{service.currencySymbol} · {service.currency}</Text>
                      </View>
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
              <Ionicons name="car-outline" size={64} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No Rental Services Available</Text>
              <Text style={styles.emptyText}>
                There are currently no rental services available. Please check back later.
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
  servicesContainer: {
    paddingVertical: 20,
    gap: 16,
  },
  serviceCard: {
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
  serviceIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  serviceInfo: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  currencyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 0,
    alignSelf: 'flex-start',
  },
  chipText: {
    fontSize: 12,
    color: '#0369A1',
    marginLeft: 6,
    fontWeight: '600',
  },
  serviceDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  serviceDetails: {
    gap: 4,
  },
  restrictionsContainer: {
    marginTop: 6,
    marginBottom: 6,
  },
  restrictionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  restrictionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
  restrictionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 2,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
    marginTop: 6,
    marginRight: 8,
  },
  restrictionText: {
    flex: 1,
    fontSize: 12,
    color: '#4B5563',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
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
