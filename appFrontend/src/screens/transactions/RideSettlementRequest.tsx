import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import { settlementService, type AvailableRideEarnings, type BankAccount, type Wallet } from '../../services/settlementService';

type RideSettlementRequestNavigationProp = NativeStackNavigationProp<AppStackParamList, 'RideSettlementRequest'>;

export function RideSettlementRequest() {
  const navigation = useNavigation<RideSettlementRequestNavigationProp>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [availableEarnings, setAvailableEarnings] = useState<AvailableRideEarnings[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'BANK_TRANSFER' | 'WALLET_TRANSFER' | null>(null);
  const [selectedBankAccount, setSelectedBankAccount] = useState<string>('');
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [earningsData, bankAccountsData, walletsData] = await Promise.all([
        settlementService.getAvailableRideEarnings(),
        settlementService.getBankAccounts(),
        settlementService.getWallets()
      ]);
      
      setAvailableEarnings(earningsData);
      setBankAccounts(bankAccountsData.filter(account => account.status === 'ACTIVE'));
      setWallets(walletsData.filter(wallet => wallet.status === 'ACTIVE'));
      
      // Set default currency if available
      if (earningsData.length > 0) {
        setSelectedCurrency(earningsData[0].currency);
      }
    } catch (error) {
      console.error('Error loading ride settlement data:', error);
      setError('Failed to load settlement data');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedEarnings = () => {
    return availableEarnings.find(earning => earning.currency === selectedCurrency);
  };

  const handlePaymentMethodSelect = (method: 'BANK_TRANSFER' | 'WALLET_TRANSFER') => {
    setSelectedPaymentMethod(method);
    setSelectedBankAccount('');
    setSelectedWallet('');
  };

  const handleSubmitSettlement = async () => {
    if (!selectedCurrency || !selectedPaymentMethod) {
      Alert.alert('Error', 'Please select a currency and payment method');
      return;
    }

    const earnings = getSelectedEarnings();
    if (!earnings || earnings.amount <= 0) {
      Alert.alert('Error', 'No available earnings for settlement');
      return;
    }

    if (selectedPaymentMethod === 'BANK_TRANSFER' && !selectedBankAccount) {
      Alert.alert('Error', 'Please select a bank account');
      return;
    }

    if (selectedPaymentMethod === 'WALLET_TRANSFER' && !selectedWallet) {
      Alert.alert('Error', 'Please select a wallet');
      return;
    }

    try {
      setSubmitting(true);
      
      const settlementData = {
        amount: earnings.amount,
        currency: selectedCurrency,
        type: selectedPaymentMethod,
        channel: 'RIDES' as const,
        bankAccountId: selectedPaymentMethod === 'BANK_TRANSFER' ? selectedBankAccount : undefined,
        walletId: selectedPaymentMethod === 'WALLET_TRANSFER' ? selectedWallet : undefined,
      };

      await settlementService.createSettlementRequest(settlementData);
      
      Alert.alert(
        'Success',
        'Ride settlement request submitted successfully. You will be notified once it is processed.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error: any) {
      console.error('Error submitting ride settlement request:', error);
      Alert.alert('Error', error.message || 'Failed to submit settlement request');
    } finally {
      setSubmitting(false);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    const symbol = getCurrencySymbol(currency);
    return `${symbol}${amount.toFixed(2)}`;
  };

  const getCurrencySymbol = (currency: string): string => {
    const symbols: { [key: string]: string } = {
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
      'CAD': 'C$',
      'AUD': 'A$',
      'CHF': 'CHF',
      'SEK': 'kr',
      'NOK': 'kr',
      'DKK': 'kr',
      'PLN': 'zł',
      'CZK': 'Kč',
      'HUF': 'Ft',
      'RON': 'lei',
      'BGN': 'лв',
      'HRK': 'kn',
      'RUB': '₽',
      'TRY': '₺',
      'BRL': 'R$',
      'MXN': '$',
      'SGD': 'S$',
      'HKD': 'HK$',
      'NZD': 'NZ$',
      'MYR': 'RM',
      'PHP': '₱',
      'THB': '฿',
      'IDR': 'Rp',
      'KRW': '₩',
      'VND': '₫',
      'ZMW': 'ZK',
      'BWP': 'P',
      'MWK': 'MK',
      'SZL': 'L',
      'NAF': 'N$',
      'AOA': 'Kz',
      'MZN': 'MT',
      'STN': 'Db',
      'CVE': 'Esc'
    };

    return symbols[currency] || currency;
  };

  const selectedEarnings = getSelectedEarnings();
  const hasBankAccounts = bankAccounts.length > 0;
  const hasWallets = wallets.length > 0;
  const hasAnyPaymentMethod = hasBankAccounts || hasWallets;

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading settlement data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Ride Settlement</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Available Earnings Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Earnings</Text>
            {availableEarnings.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="cash-outline" size={48} color="#9CA3AF" />
                <Text style={styles.emptyStateText}>No earnings available for settlement</Text>
              </View>
            ) : (
              <View style={styles.earningsContainer}>
                {availableEarnings.map((earning) => (
                  <TouchableOpacity
                    key={earning.currency}
                    style={[
                      styles.earningCard,
                      selectedCurrency === earning.currency && styles.selectedEarningCard
                    ]}
                    onPress={() => setSelectedCurrency(earning.currency)}
                  >
                    <View style={styles.earningHeader}>
                      <Text style={styles.earningCurrency}>{earning.currency}</Text>
                      <Ionicons 
                        name={selectedCurrency === earning.currency ? 'checkmark-circle' : 'ellipse-outline'} 
                        size={24} 
                        color={selectedCurrency === earning.currency ? '#2563EB' : '#9CA3AF'} 
                      />
                    </View>
                    <Text style={styles.earningAmount}>
                      {formatAmount(earning.amount, earning.currency)}
                    </Text>
                    <Text style={styles.earningRides}>
                      {earning.ridesCount} ride{earning.ridesCount !== 1 ? 's' : ''}
                    </Text>
                    
                    {/* Show ride details */}
                    {earning.rides && earning.rides.length > 0 && (
                      <View style={styles.rideDetailsContainer}>
                        <Text style={styles.rideDetailsTitle}>Ride Details:</Text>
                        {earning.rides.slice(0, 3).map((ride, index) => (
                          <View key={ride.id} style={styles.rideDetailItem}>
                            <Text style={styles.rideDetailText}>
                              {ride.requestId ? `#${ride.requestId}` : `#${ride.rideId}`} - {formatAmount(ride.driverEarnings, earning.currency)}
                            </Text>
                          </View>
                        ))}
                        {earning.rides.length > 3 && (
                          <Text style={styles.rideDetailText}>
                            +{earning.rides.length - 3} more rides
                          </Text>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Payment Method Section */}
          {selectedEarnings && selectedEarnings.amount > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment Method</Text>
              
              {hasAnyPaymentMethod ? (
                <>
                  {/* Bank Transfer Option */}
                  {hasBankAccounts && (
                    <TouchableOpacity
                      style={[
                        styles.paymentMethodCard,
                        selectedPaymentMethod === 'BANK_TRANSFER' && styles.selectedPaymentMethodCard
                      ]}
                      onPress={() => handlePaymentMethodSelect('BANK_TRANSFER')}
                    >
                      <View style={styles.paymentMethodHeader}>
                        <Ionicons name="card-outline" size={24} color="#2563EB" />
                        <Text style={styles.paymentMethodTitle}>Bank Transfer</Text>
                        <Ionicons 
                          name={selectedPaymentMethod === 'BANK_TRANSFER' ? 'checkmark-circle' : 'ellipse-outline'} 
                          size={24} 
                          color={selectedPaymentMethod === 'BANK_TRANSFER' ? '#2563EB' : '#9CA3AF'} 
                        />
                      </View>
                      <Text style={styles.paymentMethodSubtitle}>
                        {bankAccounts.length} account{bankAccounts.length !== 1 ? 's' : ''} available
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Wallet Transfer Option */}
                  {hasWallets && (
                    <TouchableOpacity
                      style={[
                        styles.paymentMethodCard,
                        selectedPaymentMethod === 'WALLET_TRANSFER' && styles.selectedPaymentMethodCard
                      ]}
                      onPress={() => handlePaymentMethodSelect('WALLET_TRANSFER')}
                    >
                      <View style={styles.paymentMethodHeader}>
                        <Ionicons name="wallet-outline" size={24} color="#2563EB" />
                        <Text style={styles.paymentMethodTitle}>Wallet Transfer</Text>
                        <Ionicons 
                          name={selectedPaymentMethod === 'WALLET_TRANSFER' ? 'checkmark-circle' : 'ellipse-outline'} 
                          size={24} 
                          color={selectedPaymentMethod === 'WALLET_TRANSFER' ? '#2563EB' : '#9CA3AF'} 
                        />
                      </View>
                      <Text style={styles.paymentMethodSubtitle}>
                        {wallets.length} wallet{wallets.length !== 1 ? 's' : ''} available
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Payment Method Selection */}
                  {selectedPaymentMethod === 'BANK_TRANSFER' && hasBankAccounts && (
                    <View style={styles.selectionSection}>
                      <Text style={styles.selectionTitle}>Select Bank Account</Text>
                      {bankAccounts.map((account) => (
                        <TouchableOpacity
                          key={account.id}
                          style={[
                            styles.accountCard,
                            selectedBankAccount === account.id && styles.selectedAccountCard
                          ]}
                          onPress={() => setSelectedBankAccount(account.id)}
                        >
                          <View style={styles.accountInfo}>
                            <Text style={styles.accountName}>{account.accountName}</Text>
                            <Text style={styles.accountNumber}>{account.accountNumber}</Text>
                            <Text style={styles.bankName}>{account.bankName}</Text>
                          </View>
                          <Ionicons 
                            name={selectedBankAccount === account.id ? 'checkmark-circle' : 'ellipse-outline'} 
                            size={24} 
                            color={selectedBankAccount === account.id ? '#2563EB' : '#9CA3AF'} 
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {selectedPaymentMethod === 'WALLET_TRANSFER' && hasWallets && (
                    <View style={styles.selectionSection}>
                      <Text style={styles.selectionTitle}>Select Wallet</Text>
                      {wallets.map((wallet) => (
                        <TouchableOpacity
                          key={wallet.id}
                          style={[
                            styles.accountCard,
                            selectedWallet === wallet.id && styles.selectedAccountCard
                          ]}
                          onPress={() => setSelectedWallet(wallet.id)}
                        >
                          <View style={styles.accountInfo}>
                            <Text style={styles.accountName}>{wallet.walletType.replace('_', ' ')}</Text>
                            <Text style={styles.accountNumber}>{wallet.walletAddress}</Text>
                            <Text style={styles.bankName}>{wallet.account}</Text>
                          </View>
                          <Ionicons 
                            name={selectedWallet === wallet.id ? 'checkmark-circle' : 'ellipse-outline'} 
                            size={24} 
                            color={selectedWallet === wallet.id ? '#2563EB' : '#9CA3AF'} 
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="card-outline" size={48} color="#9CA3AF" />
                  <Text style={styles.emptyStateText}>No payment methods available</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Please add a bank account or wallet to request settlements
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Submit Button */}
          {selectedEarnings && selectedEarnings.amount > 0 && hasAnyPaymentMethod && (
            <View style={styles.submitSection}>
              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmitSettlement}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="wallet-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>
                      Request Settlement ({formatAmount(selectedEarnings.amount, selectedEarnings.currency)})
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
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
    paddingHorizontal: 40,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  emptyStateSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  earningsContainer: {
    gap: 12,
  },
  earningCard: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedEarningCard: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  earningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  earningCurrency: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  earningAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  earningRides: {
    fontSize: 14,
    color: '#6B7280',
  },
  paymentMethodCard: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: 12,
  },
  selectedPaymentMethodCard: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  paymentMethodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    marginLeft: 12,
  },
  paymentMethodSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 36,
  },
  selectionSection: {
    marginTop: 16,
  },
  selectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: 8,
  },
  selectedAccountCard: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  accountNumber: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  bankName: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  submitSection: {
    marginTop: 32,
    marginBottom: 40,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  rideDetailsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  rideDetailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  rideDetailItem: {
    marginBottom: 4,
  },
  rideDetailText: {
    fontSize: 12,
    color: '#6B7280',
  },
});
