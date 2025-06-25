import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import { format } from 'date-fns';
import Constants from 'expo-constants';

// Get the API base URL
const LOCAL_IP = Constants.expoConfig?.extra?.localIp || '192.168.137.84';
const API_URL = process.env.EXPO_PUBLIC_API_URL || `http://${LOCAL_IP}:3000`;

type TransactionDetailNavigationProp = NativeStackNavigationProp<AppStackParamList, 'TransactionDetail'>;
type TransactionDetailRouteProp = RouteProp<AppStackParamList, 'TransactionDetail'>;

interface TransactionDetail {
  id: string;
  productTitle: string;
  productDescription: string;
  productImage: string;
  unitPrice: number;
  quantity: number;
  totalAmount: number;
  currencySymbol: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  transactionDate: string;
  status: 'completed' | 'pending' | 'cancelled';
  orderNumber: string;
  paymentMethod: string;
  shippingAddress: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
  notes?: string;
}

export function TransactionDetail() {
  const navigation = useNavigation<TransactionDetailNavigationProp>();
  const route = useRoute<TransactionDetailRouteProp>();
  const [transaction, setTransaction] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const transactionId = route.params?.transactionId || '1';
  const currency = route.params?.currency || 'USD';
  const currencySymbol = route.params?.currencySymbol || '$';

  useEffect(() => {
    loadTransactionDetail();
  }, [transactionId]);

  const loadTransactionDetail = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API call
      const mockTransaction: TransactionDetail = {
        id: transactionId,
        productTitle: 'iPhone 15 Pro Max - 256GB',
        productDescription: 'The most advanced iPhone ever with A17 Pro chip, 48MP camera system, and titanium design.',
        productImage: '/uploads/iphone15.jpg',
        unitPrice: 1199,
        quantity: 1,
        totalAmount: 1199,
        currencySymbol,
        buyerName: 'John Smith',
        buyerEmail: 'john.smith@email.com',
        buyerPhone: '+1 (555) 123-4567',
        transactionDate: '2024-01-15T10:30:00Z',
        status: 'completed',
        orderNumber: 'ORD-2024-001',
        paymentMethod: 'Credit Card (Visa ending in 1234)',
        shippingAddress: '123 Main Street, New York, NY 10001, United States',
        trackingNumber: 'TRK123456789',
        estimatedDelivery: '2024-01-18T18:00:00Z',
        notes: 'Customer requested signature confirmation for delivery.',
      };

      setTransaction(mockTransaction);
    } catch (error) {
      console.error('Error loading transaction detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#059669';
      case 'pending': return '#F59E0B';
      case 'cancelled': return '#DC2626';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'pending': return 'Pending';
      case 'cancelled': return 'Cancelled';
      default: return 'Unknown';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return 'checkmark-circle';
      case 'pending': return 'time';
      case 'cancelled': return 'close-circle';
      default: return 'help-circle';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading transaction details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!transaction) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#DC2626" />
          <Text style={styles.errorText}>Transaction not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Transaction Details</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          {/* Status Card */}
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Ionicons 
                name={getStatusIcon(transaction.status)} 
                size={24} 
                color={getStatusColor(transaction.status)} 
              />
              <Text style={[styles.statusText, { color: getStatusColor(transaction.status) }]}>
                {getStatusText(transaction.status)}
              </Text>
            </View>
            <Text style={styles.orderNumber}>{transaction.orderNumber}</Text>
          </View>

          {/* Product Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Product Information</Text>
            <View style={styles.productCard}>
              <Image
                source={{ uri: `${API_URL}${transaction.productImage}` }}
                style={styles.productImage}
                resizeMode="cover"
              />
              <View style={styles.productDetails}>
                <Text style={styles.productTitle}>{transaction.productTitle}</Text>
                <Text style={styles.productDescription}>{transaction.productDescription}</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Unit Price:</Text>
                  <Text style={styles.priceValue}>
                    {transaction.currencySymbol}{transaction.unitPrice.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Quantity:</Text>
                  <Text style={styles.priceValue}>{transaction.quantity}</Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Total Amount:</Text>
                  <Text style={styles.totalAmount}>
                    {transaction.currencySymbol}{transaction.totalAmount.toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Customer Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer Information</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={20} color="#6B7280" />
                <Text style={styles.infoLabel}>Name:</Text>
                <Text style={styles.infoValue}>{transaction.buyerName}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={20} color="#6B7280" />
                <Text style={styles.infoLabel}>Email:</Text>
                <Text style={styles.infoValue}>{transaction.buyerEmail}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={20} color="#6B7280" />
                <Text style={styles.infoLabel}>Phone:</Text>
                <Text style={styles.infoValue}>{transaction.buyerPhone}</Text>
              </View>
            </View>
          </View>

          {/* Payment & Shipping Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment & Shipping</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="card-outline" size={20} color="#6B7280" />
                <Text style={styles.infoLabel}>Payment:</Text>
                <Text style={styles.infoValue}>{transaction.paymentMethod}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={20} color="#6B7280" />
                <Text style={styles.infoLabel}>Address:</Text>
                <Text style={styles.infoValue}>{transaction.shippingAddress}</Text>
              </View>
              {transaction.trackingNumber && (
                <View style={styles.infoRow}>
                  <Ionicons name="car-outline" size={20} color="#6B7280" />
                  <Text style={styles.infoLabel}>Tracking:</Text>
                  <Text style={styles.infoValue}>{transaction.trackingNumber}</Text>
                </View>
              )}
              {transaction.estimatedDelivery && (
                <View style={styles.infoRow}>
                  <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                  <Text style={styles.infoLabel}>Delivery:</Text>
                  <Text style={styles.infoValue}>
                    {format(new Date(transaction.estimatedDelivery), 'MMM d, yyyy')}
                  </Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={20} color="#6B7280" />
                <Text style={styles.infoLabel}>Date:</Text>
                <Text style={styles.infoValue}>
                  {format(new Date(transaction.transactionDate), 'MMM d, yyyy \'at\' h:mm a')}
                </Text>
              </View>
            </View>
          </View>

          {/* Notes */}
          {transaction.notes && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <View style={styles.notesCard}>
                <Text style={styles.notesText}>{transaction.notes}</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1 },
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
  backButton: { padding: 8 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  placeholder: { width: 40 },
  content: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#6B7280' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { marginTop: 16, fontSize: 18, color: '#DC2626', fontWeight: '600' },
  statusCard: {
    margin: 16,
    padding: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  statusText: { fontSize: 18, fontWeight: '600', marginLeft: 8 },
  orderNumber: { fontSize: 14, color: '#6B7280' },
  section: { marginHorizontal: 16, marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 12 },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImage: { width: '100%', height: 200, borderRadius: 8, backgroundColor: '#F3F4F6', marginBottom: 16 },
  productDetails: { gap: 8 },
  productTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  productDescription: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLabel: { fontSize: 14, color: '#6B7280' },
  priceValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  totalAmount: { fontSize: 16, fontWeight: 'bold', color: '#2563EB' },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  infoLabel: { fontSize: 14, color: '#6B7280', marginLeft: 8, marginRight: 8, minWidth: 60 },
  infoValue: { fontSize: 14, color: '#111827', flex: 1 },
  notesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notesText: { fontSize: 14, color: '#111827', lineHeight: 20 },
}); 