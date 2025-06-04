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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { AppStackParamList } from '../navigation/AppNavigator';

type SellerProfileNavigationProp = NativeStackNavigationProp<AppStackParamList, 'SellerProfile'>;
type SellerProfileRouteProp = RouteProp<AppStackParamList, 'SellerProfile'>;

export function SellerProfile() {
  const navigation = useNavigation<SellerProfileNavigationProp>();
  const route = useRoute<SellerProfileRouteProp>();
  const { sellerId } = route.params;

  // Mock data - replace with actual API call
  const seller = {
    id: sellerId,
    name: 'TechGadgets',
    rating: 4.8,
    products: 42,
    image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a',
    description: 'Your one-stop shop for all tech gadgets and accessories.',
    joinedDate: 'January 2024',
    location: 'New York, USA',
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
          <Text style={styles.title}>Seller Profile</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.sellerInfo}>
            <Image
              source={{ uri: seller.image }}
              style={styles.sellerImage}
            />
            <Text style={styles.sellerName}>{seller.name}</Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color="#F59E0B" />
              <Text style={styles.rating}>{seller.rating}</Text>
              <Text style={styles.productsCount}>
                ({seller.products} products)
              </Text>
            </View>
          </View>

          <View style={styles.detailsContainer}>
            <View style={styles.detailItem}>
              <Ionicons name="location" size={20} color="#6B7280" />
              <Text style={styles.detailText}>{seller.location}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="calendar" size={20} color="#6B7280" />
              <Text style={styles.detailText}>Joined {seller.joinedDate}</Text>
            </View>
          </View>

          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionTitle}>About</Text>
            <Text style={styles.description}>{seller.description}</Text>
          </View>

          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => {
              // TODO: Implement contact functionality
            }}
          >
            <Text style={styles.contactButtonText}>Contact Seller</Text>
          </TouchableOpacity>
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
  },
  sellerInfo: {
    alignItems: 'center',
    padding: 20,
  },
  sellerImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
  },
  sellerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 4,
  },
  productsCount: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 4,
  },
  detailsContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 16,
    color: '#4B5563',
    marginLeft: 8,
  },
  descriptionContainer: {
    padding: 20,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
  },
  contactButton: {
    backgroundColor: '#2563EB',
    margin: 20,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 