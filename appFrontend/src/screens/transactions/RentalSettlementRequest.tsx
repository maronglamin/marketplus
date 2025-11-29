import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import { settlementService, type BankAccount, type Wallet, type AvailableRentalEarnings } from '../../services/settlementService';
import { useAuth } from '../../contexts/AuthContext';

type RentalSettlementRequestNavigationProp = NativeStackNavigationProp<AppStackParamList, 'RentalSettlementRequest'>;

interface AvailableRentalEarning {
  currency: string;
  amount: number;
  currencySymbol: string;
  rentalsCount: number;
  rentals: Array<{
    id: string;
    requestId?: string;
    earnings: number;
    createdAt: string;
  }>;
}

export function RentalSettlementRequest() {
  const navigation = useNavigation<RentalSettlementRequestNavigationProp>();
  const route = useRoute<any>();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [availableEarnings, setAvailableEarnings] = useState<AvailableRentalEarnings[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'BANK_TRANSFER' | 'WALLET_TRANSFER' | null>(null);
  const [selectedBankAccount, setSelectedBankAccount] = useState<string>('');
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  // Add payout method modal/form state
  const [addMethodModalVisible, setAddMethodModalVisible] = useState(false);
  const [selectedMethodType, setSelectedMethodType] = useState<'BANK' | 'WALLET' | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [bankForm, setBankForm] = useState({
    accountName: '',
    accountNumber: '',
    bankName: '',
    bankCode: '',
    branchCode: '',
    swiftCode: '',
    iban: '',
    currency: '',
    isDefault: false,
  });
  const [walletForm, setWalletForm] = useState({
    walletType: 'MOBILE_MONEY' as 'CRYPTO' | 'MOBILE_MONEY' | 'DIGITAL_WALLET',
    walletAddress: '',
    account: user?.phoneNumber || '',
    currency: '',
    isDefault: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load available earnings and payment methods in parallel
      const [earningsData, bankAccountsData, walletsData] = await Promise.all([
        settlementService.getAvailableRentalEarnings(),
        settlementService.getBankAccounts(),
        settlementService.getWallets(),
      ]);

      setAvailableEarnings(earningsData);
      setBankAccounts(bankAccountsData.filter((a) => a.status === 'ACTIVE'));
      setWallets(walletsData.filter((w) => w.status === 'ACTIVE'));
      if (earningsData.length > 0) {
        const preferred = route?.params?.defaultCurrency as string | undefined;
        const found = preferred ? earningsData.find(e => e.currency === preferred) : null;
        setSelectedCurrency((found || earningsData[0]).currency);
        const currencyToUse = (found || earningsData[0]).currency;
        setBankForm(prev => ({ ...prev, currency: currencyToUse }));
        setWalletForm(prev => ({ ...prev, currency: currencyToUse }));
      }
    } catch (e) {
      console.error('Error loading rental settlement data:', e);
      setError('Failed to load settlement data');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedEarnings = () => {
    return availableEarnings.find((e) => e.currency === selectedCurrency);
  };

  const handlePaymentMethodSelect = (method: 'BANK_TRANSFER' | 'WALLET_TRANSFER') => {
    setSelectedPaymentMethod(method);
    setSelectedBankAccount('');
    setSelectedWallet('');
  };

  const handleAddPayoutMethod = () => {
    setAddMethodModalVisible(true);
    setSelectedMethodType(null);
    setShowForm(false);
    setBankForm({
      accountName: '',
      accountNumber: '',
      bankName: '',
      bankCode: '',
      branchCode: '',
      swiftCode: '',
      iban: '',
      currency: selectedCurrency || '',
      isDefault: false,
    });
    setWalletForm({
      walletType: 'MOBILE_MONEY',
      walletAddress: '',
      account: user?.phoneNumber || '',
      currency: selectedCurrency || '',
      isDefault: false,
    });
  };

  const handleMethodTypeSelect = (type: 'BANK' | 'WALLET') => {
    setSelectedMethodType(type);
    setShowForm(true);
  };

  const handleBankFormChange = (field: string, value: string | boolean) => {
    setBankForm(prev => ({ ...prev, [field]: value }));
  };

  const handleWalletFormChange = (field: string, value: string | boolean) => {
    setWalletForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAddMethod = async () => {
    if (!selectedMethodType) {
      Alert.alert('Error', 'Please select a method type');
      return;
    }
    try {
      if (selectedMethodType === 'BANK') {
        if (!bankForm.accountName || !bankForm.accountNumber || !bankForm.bankName || !bankForm.currency) {
          Alert.alert('Error', 'Please fill in all required fields for Bank Account');
          return;
        }
        await settlementService.addBankAccount(bankForm);
        Alert.alert('Success', 'Bank account added successfully');
      } else {
        if (!walletForm.walletAddress || !walletForm.currency) {
          Alert.alert('Error', 'Please fill in all required fields');
          return;
        }
        await settlementService.addWallet(walletForm);
        Alert.alert('Success', 'Wallet added successfully');
      }
      setAddMethodModalVisible(false);
      await loadData();
    } catch (err: any) {
      console.error('Error adding payment method:', err);
      Alert.alert('Error', err.message || 'Failed to add payment method');
    }
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
      // Submit settlement request for rentals using rental-specific columns
      await settlementService.createSettlementRequest({
        amount: earnings.amount,
        currency: selectedCurrency,
        type: selectedPaymentMethod,
        channel: 'RENTALS',
        bankAccountId: selectedPaymentMethod === 'BANK_TRANSFER' ? selectedBankAccount : undefined,
        walletId: selectedPaymentMethod === 'WALLET_TRANSFER' ? selectedWallet : undefined,
        // Store request IDs in rental-specific columns
        includedRentalIds: (earnings.rentals || [])
          .map(r => r.requestId || r.id || '')
          .filter((id) => !!id),
        totalRentalsCount: ((earnings.rentals || [])
          .map(r => r.requestId || r.id || '')
          .filter((id) => !!id)).length,
      });

      Alert.alert(
        'Success',
        'Rental settlement request submitted successfully. You will be notified once it is processed.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      console.error('Error submitting rental settlement request:', error);
      Alert.alert('Error', error.message || 'Failed to submit settlement request');
    } finally {
      setSubmitting(false);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    const symbol = getCurrencySymbol(currency);
    return `${symbol}${(amount || 0).toFixed(2)}`;
   };

  const getCurrencySymbol = (currency: string): string => {
    const symbols: { [key: string]: string } = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      GMD: 'D',
      SLL: 'Le',
      UGX: 'USh',
      TZS: 'TSh',
      NGN: '₦',
      KES: 'KSh',
      GHS: 'GH₵',
      ZAR: 'R',
      EGP: 'E£',
      INR: '₹',
      CNY: '¥',
      JPY: '¥',
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
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Rental Settlement</Text>
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
                    style={[styles.earningCard, selectedCurrency === earning.currency && styles.selectedEarningCard]}
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
                    <Text style={styles.earningAmount}>{formatAmount(earning.amount, earning.currency)}</Text>
                    <Text style={styles.earningRides}>
                      {earning.rentalsCount} rental{earning.rentalsCount !== 1 ? 's' : ''}
                    </Text>

                    {earning.rentals && earning.rentals.length > 0 && (
                      <View style={styles.rideDetailsContainer}>
                        <Text style={styles.rideDetailsTitle}>Rental Details:</Text>
                        {earning.rentals.slice(0, 3).map((r) => (
                          <View key={r.id} style={styles.rideDetailItem}>
                            <Text style={styles.rideDetailText}>
                              {r.requestId ? `#${r.requestId}` : `#${r.id}`} - {formatAmount(r.earnings, earning.currency)}
                            </Text>
                          </View>
                        ))}
                        {earning.rentals.length > 3 && (
                          <Text style={styles.rideDetailText}>+{earning.rentals.length - 3} more rentals</Text>
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
              <View style={styles.paymentHeader}>
                <Text style={styles.sectionTitle}>Payment Method</Text>
                <TouchableOpacity style={styles.addMoreButton} onPress={handleAddPayoutMethod}>
                  <Ionicons name="add-circle-outline" size={20} color="#2563EB" />
                  <Text style={styles.addMoreButtonText}>Add More</Text>
                </TouchableOpacity>
              </View>
              {hasAnyPaymentMethod ? (
                <>
                  {hasBankAccounts && (
                    <TouchableOpacity
                      style={[styles.paymentMethodCard, selectedPaymentMethod === 'BANK_TRANSFER' && styles.selectedPaymentMethodCard]}
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

                  {hasWallets && (
                    <TouchableOpacity
                      style={[styles.paymentMethodCard, selectedPaymentMethod === 'WALLET_TRANSFER' && styles.selectedPaymentMethodCard]}
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

                  {selectedPaymentMethod === 'BANK_TRANSFER' && hasBankAccounts && (
                    <View style={styles.selectionSection}>
                      <Text style={styles.selectionTitle}>Select Bank Account</Text>
                      {bankAccounts.map((account) => (
                        <TouchableOpacity
                          key={account.id}
                          style={[styles.accountCard, selectedBankAccount === account.id && styles.selectedAccountCard]}
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
                          style={[styles.accountCard, selectedWallet === wallet.id && styles.selectedAccountCard]}
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
                  <Text style={styles.emptyStateSubtext}>Please add a bank account or wallet to request settlements</Text>
                  <TouchableOpacity style={styles.addPayoutMethodButton} onPress={handleAddPayoutMethod}>
                    <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.addPayoutMethodButtonText}>Add Payout Method</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Submit */}
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
      {/* Add Payout Method Modal */}
      <Modal
        visible={addMethodModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAddMethodModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setAddMethodModalVisible(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {showForm ? (selectedMethodType === 'BANK' ? 'Add Bank Account' : 'Add Wallet') : 'Add Payout Method'}
            </Text>
            {showForm ? (
              <TouchableOpacity onPress={() => setShowForm(false)} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#2563EB" />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 24 }} />
            )}
          </View>

          <ScrollView style={styles.modalContent}>
            {!showForm ? (
              <>
                <Text style={styles.modalSubtitle}>Choose how you'd like to receive your settlements</Text>
                <View style={styles.methodTypeSection}>
                  <TouchableOpacity
                    style={[styles.methodTypeCard, selectedMethodType === 'BANK' && styles.selectedMethodTypeCard]}
                    onPress={() => handleMethodTypeSelect('BANK')}
                  >
                    <View style={styles.methodTypeHeader}>
                      <Ionicons name="card-outline" size={32} color="#2563EB" />
                      <View style={styles.methodTypeInfo}>
                        <Text style={styles.methodTypeTitle}>Bank Account</Text>
                        <Text style={styles.methodTypeDescription}>Receive settlements directly to your bank account</Text>
                      </View>
                      <Ionicons
                        name={selectedMethodType === 'BANK' ? 'checkmark-circle' : 'ellipse-outline'}
                        size={24}
                        color={selectedMethodType === 'BANK' ? '#2563EB' : '#9CA3AF'}
                      />
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.methodTypeCard, selectedMethodType === 'WALLET' && styles.selectedMethodTypeCard]}
                    onPress={() => handleMethodTypeSelect('WALLET')}
                  >
                    <View style={styles.methodTypeHeader}>
                      <Ionicons name="wallet-outline" size={32} color="#8B5CF6" />
                      <View style={styles.methodTypeInfo}>
                        <Text style={styles.methodTypeTitle}>Digital Wallet</Text>
                        <Text style={styles.methodTypeDescription}>Receive settlements to your digital wallet</Text>
                      </View>
                      <Ionicons
                        name={selectedMethodType === 'WALLET' ? 'checkmark-circle' : 'ellipse-outline'}
                        size={24}
                        color={selectedMethodType === 'WALLET' ? '#8B5CF6' : '#9CA3AF'}
                      />
                    </View>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                {selectedMethodType === 'BANK' && (
                  <View style={styles.formSection}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Account Name *</Text>
                      <TextInput
                        style={styles.textInput}
                        value={bankForm.accountName}
                        onChangeText={(v) => handleBankFormChange('accountName', v)}
                        placeholder="Enter account holder name"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Account Number *</Text>
                      <TextInput
                        style={styles.textInput}
                        value={bankForm.accountNumber}
                        onChangeText={(v) => handleBankFormChange('accountNumber', v)}
                        placeholder="Enter account number"
                        keyboardType="numeric"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Bank Name *</Text>
                      <TextInput
                        style={styles.textInput}
                        value={bankForm.bankName}
                        onChangeText={(v) => handleBankFormChange('bankName', v)}
                        placeholder="Enter bank name"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Bank Code</Text>
                      <TextInput
                        style={styles.textInput}
                        value={bankForm.bankCode}
                        onChangeText={(v) => handleBankFormChange('bankCode', v)}
                        placeholder="Enter bank code (optional)"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Currency *</Text>
                      <TextInput style={[styles.textInput, styles.disabledInput]} value={bankForm.currency} editable={false} />
                      <Text style={styles.inputNote}>Currency will match selected earnings ({selectedCurrency})</Text>
                    </View>
                  </View>
                )}
                {selectedMethodType === 'WALLET' && (
                  <View style={styles.formSection}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Wallet Type *</Text>
                      <View style={styles.pickerContainer}>
                        {(['MOBILE_MONEY', 'DIGITAL_WALLET'] as const).map((type) => (
                          <TouchableOpacity
                            key={type}
                            style={[styles.pickerOption, walletForm.walletType === type && styles.pickerOptionSelected]}
                            onPress={() => handleWalletFormChange('walletType', type)}
                          >
                            <Text
                              style={[styles.pickerOptionText, walletForm.walletType === type && styles.pickerOptionTextSelected]}
                            >
                              {type.replace('_', ' ')}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Wallet Number (Phone) *</Text>
                      <TextInput
                        style={[styles.textInput, styles.disabledInput]}
                        value={walletForm.account}
                        editable={false}
                        placeholder="Your phone number"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Wallet Provider Name *</Text>
                      <TextInput
                        style={styles.textInput}
                        value={walletForm.walletAddress}
                        onChangeText={(v) => handleWalletFormChange('walletAddress', v)}
                        placeholder="Enter wallet provider name"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Currency *</Text>
                      <TextInput style={[styles.textInput, styles.disabledInput]} value={walletForm.currency} editable={false} />
                      <Text style={styles.inputNote}>Currency will match selected earnings ({selectedCurrency})</Text>
                    </View>
                  </View>
                )}
                <TouchableOpacity style={styles.addMethodButton} onPress={handleAddMethod}>
                  <Text style={styles.addMethodButtonText}>Add {selectedMethodType === 'BANK' ? 'Account' : 'Wallet'}</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addMoreButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
    marginLeft: 8,
  },
  addPayoutMethodButton: {
    marginTop: 16,
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addPayoutMethodButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalContent: {
    padding: 16,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 16,
    textAlign: 'center',
  },
  methodTypeSection: {
    flexDirection: 'row',
    gap: 12,
  },
  methodTypeCard: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedMethodTypeCard: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  methodTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  methodTypeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  methodTypeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  methodTypeDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  formSection: {
    marginTop: 16,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  disabledInput: {
    backgroundColor: '#F3F4F6',
    color: '#9CA3AF',
  },
  inputNote: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  pickerContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  pickerOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 120,
    alignItems: 'center',
  },
  pickerOptionSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#4B5563',
  },
  pickerOptionTextSelected: {
    color: '#2563EB',
    fontWeight: '600',
  },
  addMethodButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  addMethodButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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


