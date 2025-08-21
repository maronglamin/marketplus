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
import { Image } from 'react-native';
import { useImagePreloader } from '../hooks/useImagePreloader';
import OptimizedImage from '../components/OptimizedImage';
import ScheduleRideModal from '../components/ScheduleRideModal';
import type { AppStackParamList } from '../navigation/AppNavigator';

type CustomerRideServiceNavigationProp = NativeStackNavigationProp<AppStackParamList, 'CustomerRideService'>;

export function CustomerRideService() {
  const navigation = useNavigation<CustomerRideServiceNavigationProp>();
  const { preloadedImages } = useImagePreloader();
  const [showRentalModal, setShowRentalModal] = useState(false);

  const rideServices = [
    {
      id: 'quick-ride',
      title: 'Quick Ride',
      subtitle: 'Book a ride now',
      description: 'Get a ride immediately to your destination',
      icon: 'car-sport',
      iconColor: '#6B7280',
      backgroundColor: '#F9FAFB',
      borderColor: '#E5E7EB',
      onPress: () => navigation.navigate('RideRequest'),
    },
    {
      id: 'schedule-ride',
      title: 'Schedule a Ride',
      subtitle: 'Book for later',
      description: 'Schedule a ride for a specific time and date',
      icon: 'calendar',
      iconColor: '#6B7280',
      backgroundColor: '#F9FAFB',
      borderColor: '#E5E7EB',
      onPress: () => {
        // TODO: Navigate to Schedule Ride screen
        console.log('Schedule Ride pressed');
      },
    },
    {
      id: 'rental',
      title: 'Rental',
      subtitle: 'Rent a vehicle',
      description: 'Rent a car or motorcycle for extended periods',
      icon: 'car',
      iconColor: '#6B7280',
      backgroundColor: '#F9FAFB',
      borderColor: '#E5E7EB',
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
                {/* Service Icon */}
                <View style={[
                  styles.serviceIcon,
                  { backgroundColor: '#F3F4F6' }
                ]}>
                  {service.id === 'quick-ride' ? (
                    <OptimizedImage 
                      source={preloadedImages.taxi}
                      style={{ 
                        width: 56, 
                        height: 56
                      }}
                      size={56}
                      showLoader={false}
                    />
                  ) : service.id === 'rental' ? (
                    <OptimizedImage 
                      source={preloadedImages.rental}
                      style={{ 
                        width: 56, 
                        height: 56
                      }}
                      size={56}
                      showLoader={false}
                    />
                  ) : (
                    <Ionicons 
                      name={service.icon as any} 
                      size={36} 
                      color={service.iconColor} 
                    />
                  )}
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
                    color={service.iconColor} 
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Additional Information */}
          <View style={styles.infoSection}>
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

          {/* Quick Actions */}
          {/* <View style={styles.quickActionsSection}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              <TouchableOpacity style={styles.quickActionCard}>
                <View style={{
                  backgroundColor: '#F3F4F6',
                  borderRadius: 12,
                  padding: 10,
                  marginBottom: 4
                }}>
                  <OptimizedImage 
                    source={preloadedImages.taxi}
                    style={{ 
                      width: 36, 
                      height: 36
                    }}
                    size={36}
                    showLoader={false}
                  />
                </View>
                <Text style={styles.quickActionText}>Recent Rides</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionCard}>
                <Ionicons name="star" size={24} color="#6B7280" />
                <Text style={styles.quickActionText}>Favorites</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionCard}>
                <Ionicons name="card" size={24} color="#6B7280" />
                <Text style={styles.quickActionText}>Payment</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionCard}>
                <Ionicons name="call" size={24} color="#6B7280" />
                <Text style={styles.quickActionText}>Support</Text>
              </TouchableOpacity>
            </View>
          </View> */}
        </ScrollView>
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
  },
  servicesContainer: {
    gap: 16,
    marginBottom: 32,
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
  serviceIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
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
  infoSection: {
    marginBottom: 32,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  quickActionsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginTop: 8,
    textAlign: 'center',
  },
});
