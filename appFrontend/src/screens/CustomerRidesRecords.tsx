import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/AppNavigator';

type CustomerRidesRecordsNavigationProp = NativeStackNavigationProp<AppStackParamList, 'CustomerRidesRecords'>;

export default function CustomerRidesRecordsScreen() {
  const navigation = useNavigation<CustomerRidesRecordsNavigationProp>();

  const handleRideHistoryPress = () => {
    navigation.navigate('CustomerRideHistory');
  };

  const handleRequestedRidesPress = () => {
    navigation.navigate('CustomerRides');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconBtn}>
          <Ionicons name="arrow-back" size={22} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.title}>Ride Records</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.subtitle}>Choose what you'd like to view:</Text>
        
        {/* Ride History Card */}
        <TouchableOpacity style={styles.card} onPress={handleRideHistoryPress}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconContainer}>
              <Ionicons name="time-outline" size={32} color="#0EA5E9" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Ride History</Text>
              <Text style={styles.cardSubtitle}>View your completed rides and past trips</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
          </View>
          <View style={styles.cardFeatures}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.featureText}>Completed rides</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.featureText}>Payment history</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.featureText}>Driver ratings</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Requested Rides Card */}
        <TouchableOpacity style={styles.card} onPress={handleRequestedRidesPress}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconContainer}>
              <Ionicons name="car-outline" size={32} color="#F59E0B" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Requested Rides</Text>
              <Text style={styles.cardSubtitle}>Track your active and pending ride requests</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
          </View>
          <View style={styles.cardFeatures}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.featureText}>Active requests</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.featureText}>Request status</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.featureText}>Driver details</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoIcon}>
            <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
          </View>
          <Text style={styles.infoText}>
            Ride History shows your completed trips, while Requested Rides shows your active and pending ride requests.
          </Text>
        </View>
      </View>
    </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerIconBtn: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerSpacer: {
    width: 38, // Same width as back button for centering
  },
  content: {
    flex: 1,
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  cardFeatures: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  infoSection: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
});
