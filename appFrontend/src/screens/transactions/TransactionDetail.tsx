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
import { transactionService, type TransactionDetail } from '../../services/transactionService';
import { getImageUrl } from '../../utils/imageUtils';

type TransactionDetailNavigationProp = NativeStackNavigationProp<AppStackParamList, 'TransactionDetail'>;
type TransactionDetailRouteProp = RouteProp<AppStackParamList, 'TransactionDetail'>;

export function TransactionDetail() {
  const navigation = useNavigation<TransactionDetailNavigationProp>();
  const route = useRoute<TransactionDetailRouteProp>();
  const [transaction, setTransaction] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const transactionId = route.params?.transactionId || '';

  useEffect(() => {
    if (transactionId) {
    loadTransactionDetail();
    }
  }, [transactionId]);

  const loadTransactionDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading transaction detail for ID:', transactionId);
      
      const transactionData = await transactionService.getTransactionDetail(transactionId);
      setTransaction(transactionData);
    } catch (error: any) {
      console.error('Error loading transaction detail:', error);
      if (error.response?.status === 404) {
        setError('Transaction not found');
      } else {
        setError('Failed to load transaction details');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#059669';
      case 'pending': return '#F59E0B';
      case 'cancelled': return '#DC2626';
      case 'refunded': return '#8B5CF6';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'pending': return 'Pending';
      case 'cancelled': return 'Cancelled';
      case 'refunded': return 'Refunded';
      default: return 'Unknown';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return 'checkmark-circle';
      case 'pending': return 'time';
      case 'cancelled': return 'close-circle';
      case 'refunded': return 'refresh-circle';
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

  if (error || !transaction) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.title}>Transaction Details</Text>
            <View style={styles.placeholder} />
          </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#DC2626" />
            <Text style={styles.errorText}>{error || 'Transaction not found'}</Text>
            {error && (
              <TouchableOpacity style={styles.retryButton} onPress={loadTransactionDetail}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            )}
          </View>
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
                  source={{ 
                    uri: transaction.productImage 
                      ? (getImageUrl(transaction.productImage) || 'https://via.placeholder.com/400x200?text=No+Image')
                      : 'https://via.placeholder.com/400x200?text=No+Image'
                  }}
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
                  <Text style={styles.priceLabel}>Subtotal:</Text>
                  <Text style={styles.priceValue}>
                    {transaction.currencySymbol}{transaction.subtotal.toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Amounts Breakdown */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Amount Breakdown</Text>
            <View style={styles.amountsCard}>
              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>Subtotal:</Text>
                <Text style={styles.amountValue}>
                  {transaction.currencySymbol}{transaction.subtotal.toLocaleString()}
                </Text>
              </View>
              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>Tax:</Text>
                <Text style={styles.amountValue}>
                  {transaction.currencySymbol}{transaction.taxAmount.toLocaleString()}
                </Text>
              </View>
              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>Shipping:</Text>
                <Text style={styles.amountValue}>
                  {transaction.currencySymbol}{transaction.shippingAmount.toLocaleString()}
                </Text>
              </View>
              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>Discount:</Text>
                <Text style={[styles.amountValue, { color: '#DC2626' }]}>
                  -{transaction.currencySymbol}{transaction.discountAmount.toLocaleString()}
                </Text>
              </View>
              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>Service Fee:</Text>
                <Text style={[styles.amountValue, { color: '#DC2626' }]}>
                  -{transaction.currencySymbol}{transaction.serviceFeeAmount.toLocaleString()}
                </Text>
              </View>
              
              {/* Calculation Summary */}
              <View style={[styles.amountRow, styles.calculationRow]}>
                <Text style={styles.calculationLabel}>Calculation:</Text>
                <Text style={styles.calculationValue}>
                  {transaction.currencySymbol}{transaction.subtotal.toFixed(2)} + {transaction.currencySymbol}{transaction.taxAmount.toFixed(2)} + {transaction.currencySymbol}{transaction.shippingAmount.toFixed(2)} - {transaction.currencySymbol}{transaction.discountAmount.toFixed(2)} - {transaction.currencySymbol}{transaction.serviceFeeAmount.toFixed(2)}
                </Text>
              </View>
              
              {/* Calculated Total */}
              {(() => {
                // Round all values to 2 decimal places to avoid floating-point precision issues
                const subtotal = Math.round(transaction.subtotal * 100) / 100;
                const taxAmount = Math.round(transaction.taxAmount * 100) / 100;
                const shippingAmount = Math.round(transaction.shippingAmount * 100) / 100;
                const discountAmount = Math.round(transaction.discountAmount * 100) / 100;
                const serviceFeeAmount = Math.round(transaction.serviceFeeAmount * 100) / 100;
                const totalAmount = Math.round(transaction.totalAmount * 100) / 100;
                
                const calculatedTotal = Math.round((subtotal + taxAmount + shippingAmount - discountAmount - serviceFeeAmount) * 100) / 100;
                const difference = Math.abs(calculatedTotal - totalAmount);
                const hasDiscrepancy = difference > 0.01; // Allow for small rounding differences
                
                // Debug logging
                console.log('Transaction Amount Breakdown:', {
                  subtotal,
                  taxAmount,
                  shippingAmount,
                  discountAmount,
                  serviceFeeAmount,
                  calculatedTotal,
                  actualTotal: totalAmount,
                  difference,
                  hasDiscrepancy
                });
                
                return (
                  <>
                    <View style={[styles.amountRow, styles.calculatedRow]}>
                      <Text style={styles.calculatedLabel}>Calculated Total:</Text>
                      <Text style={styles.calculatedValue}>
                        {transaction.currencySymbol}{calculatedTotal.toFixed(2)}
                      </Text>
                    </View>
                    {hasDiscrepancy && (
                      <View style={[styles.amountRow, styles.discrepancyRow]}>
                        <Text style={styles.discrepancyLabel}>Difference:</Text>
                        <Text style={[styles.discrepancyValue, { color: '#DC2626' }]}>
                          {transaction.currencySymbol}{difference.toFixed(2)}
                        </Text>
                      </View>
                    )}
                  </>
                );
              })()}
              
              <View style={[styles.amountRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Final Total:</Text>
                <Text style={styles.totalValue}>
                  {transaction.currencySymbol}{transaction.totalAmount.toLocaleString()}
                </Text>
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
              {transaction.paymentGatewayProvider && (
                <View style={styles.infoRow}>
                  <Ionicons name="server-outline" size={20} color="#6B7280" />
                  <Text style={styles.infoLabel}>Gateway:</Text>
                  <Text style={styles.infoValue}>{transaction.paymentGatewayProvider}</Text>
                </View>
              )}
              {transaction.paymentReference && (
                <View style={styles.infoRow}>
                  <Ionicons name="receipt-outline" size={20} color="#6B7280" />
                  <Text style={styles.infoLabel}>Reference:</Text>
                  <Text style={styles.infoValue}>{transaction.paymentReference}</Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={20} color="#6B7280" />
                <Text style={styles.infoLabel}>Address:</Text>
                <Text style={styles.infoValue}>{transaction.shippingAddress}</Text>
              </View>
              {transaction.shippingMethod && (
                <View style={styles.infoRow}>
                  <Ionicons name="car-outline" size={20} color="#6B7280" />
                  <Text style={styles.infoLabel}>Method:</Text>
                  <Text style={styles.infoValue}>{transaction.shippingMethod}</Text>
                </View>
              )}
              {transaction.trackingNumber && (
                <View style={styles.infoRow}>
                  <Ionicons name="car-outline" size={20} color="#6B7280" />
                  <Text style={styles.infoLabel}>Tracking:</Text>
                  <Text style={styles.infoValue}>{transaction.trackingNumber}</Text>
                </View>
              )}
              {transaction.shippedAt && (
                <View style={styles.infoRow}>
                  <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                  <Text style={styles.infoLabel}>Shipped:</Text>
                  <Text style={styles.infoValue}>
                    {format(new Date(transaction.shippedAt), 'MMM d, yyyy')}
                  </Text>
                </View>
              )}
              {transaction.deliveredAt && (
                <View style={styles.infoRow}>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#6B7280" />
                  <Text style={styles.infoLabel}>Delivered:</Text>
                  <Text style={styles.infoValue}>
                    {format(new Date(transaction.deliveredAt), 'MMM d, yyyy')}
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
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 12,
    paddingBottom: 12,
    minHeight: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 56 : 56,
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
  errorText: { marginTop: 16, fontSize: 18, color: '#DC2626', fontWeight: '600', textAlign: 'center', marginBottom: 24 },
  retryButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
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
  amountsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  amountLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  amountValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  calculatedRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
    marginTop: 8,
  },
  calculatedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  calculatedValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  discrepancyRow: {
    marginTop: 4,
  },
  discrepancyLabel: {
    fontSize: 12,
    color: '#DC2626',
  },
  discrepancyValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  calculationRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  calculationLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  calculationValue: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'monospace',
    flex: 1,
  },
}); 