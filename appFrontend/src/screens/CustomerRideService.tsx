import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import OptimizedImage from '../components/OptimizedImage';
import { useImagePreloader } from '../hooks/useImagePreloader';
import ScheduleRideModal from '../components/ScheduleRideModal';
import type { AppStackParamList } from '../navigation/AppNavigator';

type CustomerRideServiceNavigationProp = NativeStackNavigationProp<AppStackParamList, 'CustomerRideService'>;

export function CustomerRideService() {
  const navigation = useNavigation<CustomerRideServiceNavigationProp>();
  const [showRentalModal, setShowRentalModal] = useState(false);
  const { preloadedImages } = useImagePreloader();

  const rideServices = [
    {
      id: 'quick-ride',
      title: 'Quick Ride',
      subtitle: 'Book a ride now',
      description: 'Get a ride immediately to your destination',
      image: preloadedImages.taxi,
      backgroundColor: '#EFF6FF',
      borderColor: '#DBEAFE',
      onPress: () => navigation.navigate('RideRequest'),
    },
    {
      id: 'rental',
      title: 'Rental',
      subtitle: 'Rent a vehicle',
      description: 'Rent a car or motorcycle for extended periods',
      image: preloadedImages.rental,
      backgroundColor: '#ECFDF5',
      borderColor: '#D1FAE5',
      onPress: () => {
        console.log('🚗 Rental button pressed - opening modal');
        setShowRentalModal(true);
      },
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Ride Services</Text>
              <Text style={styles.headerSubtitle}>Choose your preferred service</Text>
            </View>
          </View>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Services Grid */}
          <View style={styles.servicesContainer}>
            {rideServices.map((service, index) => (
              <TouchableOpacity
                key={service.id}
                style={[
                  styles.serviceCard,
                  {
                    backgroundColor: service.backgroundColor,
                    borderColor: service.borderColor,
                  },
                ]}
                onPress={service.onPress}
                activeOpacity={0.8}
              >
                {/* Service Image */}
                <View style={styles.serviceImageContainer}>
                  <OptimizedImage
                    source={service.image}
                    style={styles.serviceImage}
                    showLoader={true}
                  />
                </View>

                {/* Service Content */}
                <View style={styles.serviceContent}>
                  <Text style={styles.serviceTitle}>{service.title}</Text>
                  <Text style={styles.serviceSubtitle}>{service.subtitle}</Text>
                  <Text style={styles.serviceDescription}>{service.description}</Text>
                </View>

                {/* Arrow Icon */}
                <View style={styles.serviceArrow}>
                  <Ionicons 
                    name="chevron-forward" 
                    size={20} 
                    color="#6B7280" 
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Service Information - Fixed at bottom */}
        <View style={styles.bottomInfoSection}>
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="information-circle-outline" size={24} color="#3B82F6" />
              <Text style={styles.infoTitle}>Service Information</Text>
            </View>
            <Text style={styles.infoText}>
              All our services are backed by verified drivers.
            </Text>
          </View>
        </View>
      </SafeAreaView>

      {/* Rental Modal */}
      <ScheduleRideModal
        isVisible={showRentalModal}
        onClose={() => setShowRentalModal(false)}
        onSave={async (scheduleData) => {
          // TODO: Implement save logic - send to backend API
          console.log('Rental data:', scheduleData);
          // For now, just simulate API call
          await new Promise(resolve => setTimeout(resolve, 1000));
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 0, // Remove bottom padding since info card is fixed at bottom
  },
  servicesContainer: {
    gap: 16,
    marginBottom: 20,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  serviceImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    padding: 8, // Add padding to give images some breathing room
  },
  serviceImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  serviceContent: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  serviceSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  serviceArrow: {
    marginLeft: 12,
  },
  bottomInfoSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  infoCard: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
});
