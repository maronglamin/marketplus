import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { AppStackParamList } from '../navigation/AppNavigator';

type InterestManagementNavigationProp = NativeStackNavigationProp<AppStackParamList, 'InterestManagement'>;

export function InterestManagement() {
  const navigation = useNavigation<InterestManagementNavigationProp>();

  // Mock data - replace with actual API call
  const interests = [
    {
      id: '1',
      productName: 'iPhone 13 Pro',
      buyerName: 'John Doe',
      price: 999.99,
      status: 'pending',
      image: 'https://images.unsplash.com/photo-1632661674596-79b3d5b0b5a1',
      date: '2024-03-15',
    },
    {
      id: '2',
      productName: 'MacBook Pro M1',
      buyerName: 'Jane Smith',
      price: 1299.99,
      status: 'accepted',
      image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8',
      date: '2024-03-14',
    },
    {
      id: '3',
      productName: 'AirPods Pro',
      buyerName: 'Mike Johnson',
      price: 249.99,
      status: 'rejected',
      image: 'https://images.unsplash.com/photo-1588156979435-3795d3d3e8f5',
      date: '2024-03-13',
    },
  ];

  const handleViewProduct = (productId: string) => {
    navigation.navigate('ProductDetail', { productId });
  };

  const handleViewBuyer = (buyerId: string) => {
    // TODO: Implement buyer profile view
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#F59E0B';
      case 'accepted':
        return '#10B981';
      case 'rejected':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent
      />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.title}>Interest Management</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content}>
          {interests.map((interest) => (
            <View key={interest.id} style={styles.interestCard}>
              <TouchableOpacity
                style={styles.productInfo}
                onPress={() => handleViewProduct(interest.id)}
              >
                <Image
                  source={{ uri: interest.image }}
                  style={styles.productImage}
                />
                <View style={styles.productDetails}>
                  <Text style={styles.productName}>{interest.productName}</Text>
                  <Text style={styles.price}>${interest.price}</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.buyerInfo}>
                <TouchableOpacity
                  style={styles.buyerDetails}
                  onPress={() => handleViewBuyer(interest.id)}
                >
                  <Text style={styles.buyerName}>{interest.buyerName}</Text>
                  <Text style={styles.date}>{interest.date}</Text>
                </TouchableOpacity>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: `${getStatusColor(interest.status)}20` },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(interest.status) },
                    ]}
                  >
                    {interest.status.charAt(0).toUpperCase() + interest.status.slice(1)}
                  </Text>
                </View>
              </View>

              {interest.status === 'pending' && (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.acceptButton]}
                    onPress={() => {
                      // TODO: Implement accept functionality
                    }}
                  >
                    <Text style={styles.acceptButtonText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => {
                      // TODO: Implement reject functionality
                    }}
                  >
                    <Text style={styles.rejectButtonText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  interestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productInfo: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  productDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '600',
  },
  buyerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  buyerDetails: {
    flex: 1,
  },
  buyerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
}); 