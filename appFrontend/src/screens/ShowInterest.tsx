import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/AppNavigator';
import { Ionicons } from '@expo/vector-icons';

type ShowInterestNavigationProp = NativeStackNavigationProp<AppStackParamList, 'ShowInterest'>;
type ShowInterestRouteProp = RouteProp<AppStackParamList, 'ShowInterest'>;

export function ShowInterest() {
  const navigation = useNavigation<ShowInterestNavigationProp>();
  const route = useRoute<ShowInterestRouteProp>();
  const { productId } = route.params;

  const [message, setMessage] = useState('');

  // Mock data - replace with actual API call
  const product = {
    id: productId,
    name: 'iPhone 13 Pro',
    price: 999.99,
    image: 'https://images.unsplash.com/photo-1632661674596-79b3d5b0b5a1',
    seller: {
      name: 'TechGadgets',
      rating: 4.8,
      image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a',
    },
  };

  const handleSubmit = () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    // TODO: Implement API call to submit interest
    Alert.alert(
      'Success',
      'Your interest has been submitted successfully!',
      [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]
    );
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
          <Text style={styles.title}>Show Interest</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.productCard}>
            <Image
              source={{ uri: product.image }}
              style={styles.productImage}
            />
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.price}>${product.price}</Text>
            </View>
          </View>

          <View style={styles.sellerCard}>
            <Image
              source={{ uri: product.seller.image }}
              style={styles.sellerImage}
            />
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>{product.seller.name}</Text>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={16} color="#F59E0B" />
                <Text style={styles.rating}>{product.seller.rating}</Text>
              </View>
            </View>
          </View>

          <View style={styles.messageContainer}>
            <Text style={styles.messageLabel}>Message to Seller *</Text>
            <TextInput
              style={styles.messageInput}
              value={message}
              onChangeText={setMessage}
              placeholder="Write a message to the seller..."
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>Tips for a successful interest:</Text>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.tipText}>
                Be specific about what you're interested in
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.tipText}>
                Mention any questions you have about the product
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.tipText}>
                Be polite and professional in your message
              </Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
          >
            <Text style={styles.submitButtonText}>Submit Interest</Text>
          </TouchableOpacity>
        </View>
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
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  productInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  price: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2563EB',
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  sellerImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  sellerInfo: {
    marginLeft: 12,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  messageContainer: {
    marginBottom: 24,
  },
  messageLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    height: 120,
    textAlignVertical: 'top',
  },
  tipsContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  submitButton: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 