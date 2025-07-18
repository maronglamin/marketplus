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
import { transactionService, type Transaction } from '../../services/transactionService';
import { getImageUrl } from '../../utils/imageUtils';

type TransactionHistoryNavigationProp = NativeStackNavigationProp<AppStackParamList, 'TransactionHistory'>;
type TransactionHistoryRouteProp = RouteProp<AppStackParamList, 'TransactionHistory'>;

export function TransactionHistory() {
  const navigation = useNavigation<TransactionHistoryNavigationProp>();
  const route = useRoute<TransactionHistoryRouteProp>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const currency = route.params?.currency || 'USD';
  const currencySymbol = route.params?.currencySymbol || '$';

  useEffect(() => {
    loadTransactions();
  }, [currency]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await transactionService.getTransactionsByCurrency(currency);
      
      console.log('Transactions loaded:', response.transactions.map(t => ({ id: t.id, productTitle: t.productTitle })));
      setTransactions(response.transactions);
      setTotalRevenue(response.totalRevenue);
    } catch (error) {
      console.error('Error loading transactions:', error);
      setError('Failed to load transactions');
      setTransactions([]);
      setTotalRevenue(0);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#059669';
      case 'pending':
        return '#F59E0B';
      case 'cancelled':
        return '#DC2626';
      case 'refunded':
        return '#8B5CF6';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'pending':
        return 'Pending';
      case 'cancelled':
        return 'Cancelled';
      case 'refunded':
        return 'Refunded';
      default:
        return 'Unknown';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.title}>Transaction History</Text>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadTransactions}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

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
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Transaction History</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          <TouchableOpacity 
            style={styles.summaryCard}
            onPress={() => navigation.navigate('SettlementRequest')}
          >
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>{currency} Transactions</Text>
              <View style={styles.currencyBadge}>
                <Text style={styles.currencyText}>{currencySymbol}</Text>
              </View>
            </View>
            <Text style={styles.summaryValue}>
              {currencySymbol}{totalRevenue.toLocaleString()}
            </Text>
            <Text style={styles.summarySubtitle}>
              {transactions.length} transactions
            </Text>
            <View style={styles.settlementHint}>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              <Text style={styles.settlementHintText}>Tap to request settlement</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.transactionsList}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            {transactions.map((transaction) => (
              <TouchableOpacity
                key={transaction.id}
                style={styles.transactionCard}
                onPress={() => navigation.navigate('TransactionDetail', { 
                  transactionId: transaction.id,
                  currency,
                  currencySymbol
                })}
              >
                <View style={styles.transactionHeader}>
                  <View style={styles.productInfo}>
                    <Image
                      source={{ 
                        uri: transaction.productImage 
                          ? (getImageUrl(transaction.productImage) || 'https://via.placeholder.com/60x60?text=No+Image')
                          : 'https://via.placeholder.com/60x60?text=No+Image'
                      }}
                      style={styles.productImage}
                      resizeMode="cover"
                    />
                    <View style={styles.productDetails}>
                      <Text style={styles.productTitle} numberOfLines={2}>
                        {transaction.productTitle}
                      </Text>
                      <Text style={styles.buyerName}>
                        Sold to {transaction.buyerName}
                      </Text>
                      <Text style={styles.orderNumber}>
                        {transaction.orderNumber}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.transactionAmount}>
                    <Text style={styles.amountValue}>
                      {currencySymbol}{transaction.totalAmount.toLocaleString()}
                    </Text>
                    <Text style={styles.unitPrice}>
                      {currencySymbol}{transaction.unitPrice} × {transaction.quantity}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.transactionFooter}>
                  <View style={styles.dateContainer}>
                    <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                    <Text style={styles.transactionDate}>
                      {format(new Date(transaction.transactionDate), 'MMM d, yyyy')}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(transaction.status)}15` }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(transaction.status) }]}>
                      {getStatusText(transaction.status)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
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
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 12,
    paddingBottom: 12,
    minHeight: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 56 : 56,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
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
  summaryCard: {
    margin: 16,
    padding: 20,
    backgroundColor: '#2563EB',
    borderRadius: 12,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  currencyBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  currencyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  summarySubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  settlementHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  settlementHintText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  transactionsList: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  transactionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  productInfo: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  productDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  buyerName: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  orderNumber: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amountValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  unitPrice: {
    fontSize: 14,
    color: '#6B7280',
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionDate: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
}); 