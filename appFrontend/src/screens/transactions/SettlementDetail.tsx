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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import { settlementService, type SettlementRequest, type IncludedOrder } from '../../services/settlementService';

type SettlementDetailNavigationProp = NativeStackNavigationProp<AppStackParamList, 'SettlementDetail'>;
type SettlementDetailRouteProp = RouteProp<AppStackParamList, 'SettlementDetail'>;

export function SettlementDetail() {
  const navigation = useNavigation<SettlementDetailNavigationProp>();
  const route = useRoute<SettlementDetailRouteProp>();
  const { settlementId, currency, currencySymbol } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [settlement, setSettlement] = useState<SettlementRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [includedOrders, setIncludedOrders] = useState<IncludedOrder[]>([]);

  useEffect(() => {
    loadSettlementDetail();
  }, [settlementId]);

  const loadSettlementDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the new service method to get settlement details with included orders
      const response = await settlementService.getSettlementDetails(settlementId);
      
      setSettlement(response.settlement);
      setIncludedOrders(response.includedOrders);
      
    } catch (error: any) {
      console.error('Error loading settlement detail:', error);
      setError(error.message || 'Failed to load settlement details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return '#059669';
      case 'PROCESSING':
        return '#2563EB';
      case 'PENDING':
        return '#F59E0B';
      case 'FAILED':
        return '#DC2626';
      case 'CANCELLED':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'checkmark-circle';
      case 'PROCESSING':
        return 'time';
      case 'PENDING':
        return 'hourglass-outline';
      case 'FAILED':
        return 'close-circle';
      case 'CANCELLED':
        return 'close-circle-outline';
      default:
        return 'help-circle-outline';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'Completed';
      case 'PROCESSING':
        return 'Processing';
      case 'PENDING':
        return 'Pending';
      case 'FAILED':
        return 'Failed';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'BANK_TRANSFER':
        return 'card-outline';
      case 'WALLET_TRANSFER':
        return 'wallet-outline';
      default:
        return 'cash-outline';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'BANK_TRANSFER':
        return '#2563EB';
      case 'WALLET_TRANSFER':
        return '#8B5CF6';
      default:
        return '#6B7280';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAmount = (amount: number | string, currency: string) => {
    const currencySymbols: { [key: string]: string } = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'GMD': 'D',
      'SLL': 'Le',
      'UGX': 'USh',
      'TZS': 'TSh',
      'NGN': '₦',
      'KES': 'KSh',
      'GHS': 'GH₵',
      'ZAR': 'R',
      'EGP': 'E£',
      'INR': '₹',
      'CNY': '¥',
      'JPY': '¥',
    };

    const symbol = currencySymbols[currency] || currency;
    // Ensure amount is a number and add thousand separators with proper formatting
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    const formattedAmount = numericAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${symbol}${formattedAmount}`;
  };

  const renderMetadataSection = () => {
    if (!settlement?.metadata) return null;

    const metadata = settlement.metadata as any;
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settlement Details</Text>
        <View style={styles.metadataContainer}>
          {metadata.requestedAt && (
            <View style={styles.metadataRow}>
              <Text style={styles.metadataLabel}>Requested At:</Text>
              <Text style={styles.metadataValue}>
                {formatDate(metadata.requestedAt)}
              </Text>
            </View>
          )}
          {metadata.requestSource && (
            <View style={styles.metadataRow}>
              <Text style={styles.metadataLabel}>Request Source:</Text>
              <Text style={styles.metadataValue}>
                {metadata.requestSource.replace('_', ' ')}
              </Text>
            </View>
          )}
          {metadata.calculationDetails && (
            <>
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Gross Amount:</Text>
                <Text style={styles.metadataValue}>
                  {formatAmount(metadata.calculationDetails.grossAmount || 0, currency)}
                </Text>
              </View>
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Service Fees:</Text>
                <Text style={styles.metadataValue}>
                  {formatAmount(metadata.calculationDetails.serviceFees || 0, currency)}
                </Text>
              </View>
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Net Amount:</Text>
                <Text style={styles.metadataValue}>
                  {formatAmount(metadata.calculationDetails.netAmount || 0, currency)}
                </Text>
              </View>
              {metadata.calculationDetails.ordersIncluded && (
                <View style={styles.metadataRow}>
                  <Text style={styles.metadataLabel}>Orders Included:</Text>
                  <Text style={styles.metadataValue}>
                    {metadata.calculationDetails.ordersIncluded.length} orders
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading settlement details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !settlement) {
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
            <Text style={styles.title}>Settlement Details</Text>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
            <Text style={styles.errorText}>{error || 'Settlement not found'}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadSettlementDetail}>
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
          <Text style={styles.title}>Settlement Details</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Amount and Status Section */}
          <View style={styles.amountSection}>
            <View style={styles.amountContainer}>
              <Text style={styles.amountText}>
                {formatAmount(settlement.amount, settlement.currency)}
              </Text>
              <Text style={styles.currencyText}>{settlement.currency}</Text>
            </View>
            <View style={styles.statusContainer}>
              <Ionicons 
                name={getStatusIcon(settlement.status)} 
                size={32} 
                color={getStatusColor(settlement.status)} 
              />
              <Text style={[styles.statusText, { color: getStatusColor(settlement.status) }]}>
                {getStatusText(settlement.status)}
              </Text>
            </View>
          </View>

          {/* Settlement Type Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Settlement Type</Text>
            <View style={styles.typeCard}>
              <View style={styles.typeHeader}>
                <Ionicons 
                  name={getTypeIcon(settlement.type)} 
                  size={24} 
                  color={getTypeColor(settlement.type)} 
                />
                <Text style={[styles.typeText, { color: getTypeColor(settlement.type) }]}>
                  {settlement.type.replace('_', ' ')}
                </Text>
              </View>
            </View>
          </View>

          {/* Reference Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reference Number</Text>
            <View style={styles.referenceCard}>
              <Text style={styles.referenceText}>{settlement.reference}</Text>
            </View>
          </View>

          {/* Timestamps Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Timeline</Text>
            <View style={styles.timelineCard}>
              <View style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineLabel}>Created</Text>
                  <Text style={styles.timelineValue}>{formatDate(settlement.createdAt)}</Text>
                </View>
              </View>
              {settlement.processedAt && (
                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot, styles.timelineDotCompleted]} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineLabel}>Processed</Text>
                    <Text style={styles.timelineValue}>{formatDate(settlement.processedAt)}</Text>
                  </View>
                </View>
              )}
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, styles.timelineDotCurrent]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineLabel}>Last Updated</Text>
                  <Text style={styles.timelineValue}>{formatDate(settlement.updatedAt)}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Metadata Section */}
          {renderMetadataSection()}

          {/* Included Orders Section */}
          {includedOrders.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Included Orders</Text>
              <View style={styles.ordersCard}>
                <View style={styles.ordersHeader}>
                  <Text style={styles.ordersHeaderText}>Order Details</Text>
                  <Text style={styles.ordersCountText}>{includedOrders.length} orders</Text>
                </View>
                {includedOrders.map((order, index) => (
                  <View key={order.id} style={[
                    styles.orderItem,
                    index % 2 === 1 && styles.orderItemAlternate
                  ]}>
                    <View style={styles.orderHeader}>
                      <View style={styles.orderNumberSection}>
                        <View style={styles.orderNumberRow}>
                          <Text style={styles.orderIndexText}>#{index + 1}</Text>
                          <Text style={styles.orderNumberText}>{order.orderNumber}</Text>
                        </View>
                        <View style={styles.orderDetailsColumn}>
                          <View style={styles.orderDetailRow}>
                            <Text style={styles.orderDetailLabel}>Total Amount:</Text>
                            <Text style={styles.orderAmountText}>
                              {formatAmount(order.totalAmount, order.currencyCode)}
                            </Text>
                          </View>
                          <View style={styles.orderDetailRow}>
                            <Text style={styles.orderDetailLabel}>Date:</Text>
                            <Text style={styles.orderDateText}>
                              {formatDate(order.createdAt)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                    {index < includedOrders.length - 1 && <View style={styles.orderDivider} />}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Payment Method Details Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {settlement.type === 'BANK_TRANSFER' ? 'Bank Account Details' : 'Wallet Details'}
            </Text>
            <View style={styles.infoCard}>
              {settlement.type === 'BANK_TRANSFER' && settlement.bankAccount && (
                <>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Account Name:</Text>
                    <Text style={styles.infoValue}>{settlement.bankAccount.accountName}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Account Number:</Text>
                    <Text style={styles.infoValue}>****{settlement.bankAccount.accountNumber.slice(-4)}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Bank Name:</Text>
                    <Text style={styles.infoValue}>{settlement.bankAccount.bankName}</Text>
                  </View>
                  {settlement.bankAccount.bankCode && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Bank Code:</Text>
                      <Text style={styles.infoValue}>{settlement.bankAccount.bankCode}</Text>
                    </View>
                  )}
                  {settlement.bankAccount.branchCode && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Branch Code:</Text>
                      <Text style={styles.infoValue}>{settlement.bankAccount.branchCode}</Text>
                    </View>
                  )}
                  {settlement.bankAccount.swiftCode && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>SWIFT Code:</Text>
                      <Text style={styles.infoValue}>{settlement.bankAccount.swiftCode}</Text>
                    </View>
                  )}
                  {settlement.bankAccount.iban && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>IBAN:</Text>
                      <Text style={styles.infoValue}>{settlement.bankAccount.iban}</Text>
                    </View>
                  )}
                </>
              )}
              {settlement.type === 'WALLET_TRANSFER' && settlement.wallet && (
                <>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Wallet Type:</Text>
                    <Text style={styles.infoValue}>{settlement.wallet.walletType.replace('_', ' ')}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Account Number:</Text>
                    <Text style={styles.infoValue}>{settlement.wallet.account}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Wallet Address:</Text>
                    <Text style={styles.infoValue}>{settlement.wallet.walletAddress}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Currency:</Text>
                    <Text style={styles.infoValue}>{settlement.wallet.currency}</Text>
                  </View>
                </>
              )}
            </View>
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
  amountSection: {
    backgroundColor: '#F8FAFC',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  amountContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  amountText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  currencyText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  typeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '400',
    flex: 2,
    textAlign: 'right',
  },
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
    marginTop: 4,
    marginRight: 12,
  },
  timelineDotCompleted: {
    backgroundColor: '#059669',
  },
  timelineDotCurrent: {
    backgroundColor: '#2563EB',
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 2,
  },
  timelineValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '400',
  },
  metadataContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  metadataLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    flex: 1,
  },
  metadataValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '400',
    flex: 2,
    textAlign: 'right',
  },
  referenceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  referenceText: {
    fontSize: 18,
    color: '#111827',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  ordersCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  ordersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  ordersHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  ordersCountText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  orderItem: {
    paddingVertical: 16,
  },
  orderItemAlternate: {
    backgroundColor: '#F8FAFC',
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  orderNumberSection: {
    flex: 1,
  },
  orderNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderIndexText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginRight: 8,
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  orderNumberText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    flex: 1,
    marginBottom: 4,
  },
  orderAmountText: {
    fontSize: 15,
    color: '#059669',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  orderDateText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '400',
    flex: 1,
    textAlign: 'right',
  },
  orderDetailsColumn: {
    marginTop: 8,
  },
  orderDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderDetailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    flex: 1,
  },
  orderDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 16,
  },
}); 