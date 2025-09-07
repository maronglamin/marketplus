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
  Modal,
  TextInput,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import { settlementService, type AvailableRevenue, type AvailableRevenueResponse, type SalesRepRevenue, type BankAccount, type Wallet } from '../../services/settlementService';
import { salesRepService, type SalesRep } from '../../services/salesRepService';
import { orderService, type Order } from '../../services/orderService';
import { useAuth } from '../../contexts/AuthContext';

type SettlementRequestNavigationProp = NativeStackNavigationProp<AppStackParamList, 'SettlementRequest'>;
type SettlementRequestRouteProp = RouteProp<AppStackParamList, 'SettlementRequest'>;

export function SettlementRequest() {
  const navigation = useNavigation<SettlementRequestNavigationProp>();
  const route = useRoute<SettlementRequestRouteProp>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [availableRevenue, setAvailableRevenue] = useState<AvailableRevenueResponse | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isSalesRep, setIsSalesRep] = useState(false);
  const [salesRepData, setSalesRepData] = useState<SalesRep | null>(null);
  const [showSalesRepsRevenue, setShowSalesRepsRevenue] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'BANK_TRANSFER' | 'WALLET_TRANSFER' | null>(null);
  const [selectedBankAccount, setSelectedBankAccount] = useState<string>('');
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [selectedSalesRepId, setSelectedSalesRepId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addMethodModalVisible, setAddMethodModalVisible] = useState(false);
  const [selectedMethodType, setSelectedMethodType] = useState<'BANK' | 'WALLET' | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [bankFormError, setBankFormError] = useState<string | null>(null);
  
  // Bank account form fields
  const [bankForm, setBankForm] = useState({
    accountName: '',
    accountNumber: '',
    bankName: '',
    bankCode: '',
    branchCode: '',
    swiftCode: '',
    iban: '',
    currency: '',
    isDefault: false
  });
  
  // Bank form pagination
  const [bankFormStep, setBankFormStep] = useState(1);
  const totalBankFormSteps = 3; // 3 steps with 4, 3, and 2 fields respectively
  
  // Bank form validation errors
  const [bankFormErrors, setBankFormErrors] = useState<{[key: string]: boolean}>({});
  
  // Wallet form fields
  const [walletForm, setWalletForm] = useState({
    walletType: 'MOBILE_MONEY' as 'CRYPTO' | 'MOBILE_MONEY' | 'DIGITAL_WALLET',
    walletAddress: '',
    account: user?.phoneNumber || '', // Pre-populate with user's phone number
    currency: '',
    isDefault: false
  });

  useEffect(() => {
    checkSalesRepStatus();
  }, []);

  const checkSalesRepStatus = async () => {
    try {
      // Check if current user is a sales rep using cached method
      const { isSalesRep, salesRepData } = await salesRepService.getSalesRepStatusCached(user?.id || '');
      
      if (isSalesRep && salesRepData) {
        setIsSalesRep(true);
        setSalesRepData(salesRepData);
        setError('Access Denied: Sales representatives cannot request settlements. Only the parent seller can make settlement requests.');
        setLoading(false); // Stop loading when access is denied
      } else {
        // User is not a sales rep, proceed with normal flow
        setIsSalesRep(false);
        setSalesRepData(null);
        loadData();
      }
    } catch (error) {
      // User is not a sales rep, proceed with normal flow
      setIsSalesRep(false);
      setSalesRepData(null);
      loadData();
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [revenueData, bankAccountsData, walletsData] = await Promise.all([
        settlementService.getAvailableRevenue(),
        settlementService.getBankAccounts(),
        settlementService.getWallets()
      ]);
      
      setAvailableRevenue(revenueData);
      setBankAccounts(bankAccountsData.filter(account => account.status === 'ACTIVE'));
      setWallets(walletsData.filter(wallet => wallet.status === 'ACTIVE'));
      
      // Set default currency if available in parent revenue
      if (revenueData.parentRevenue.revenues.length > 0) {
        setSelectedCurrency(revenueData.parentRevenue.revenues[0].currency);
        // Pre-fill currency in forms
        setBankForm(prev => ({ ...prev, currency: revenueData.parentRevenue.revenues[0].currency }));
        setWalletForm(prev => ({ ...prev, currency: revenueData.parentRevenue.revenues[0].currency }));
      }
    } catch (error) {
      console.error('Error loading settlement data:', error);
      setError('Failed to load settlement data');
    } finally {
      setLoading(false);
    }
  };


  const getSelectedRevenue = () => {
    if (!availableRevenue || !selectedCurrency) return null;
    
    if (selectedSalesRepId) {
      // Sales rep revenue
      const salesRep = availableRevenue.salesRepRevenue.salesReps.find(rep => rep.salesRepId === selectedSalesRepId);
      if (salesRep) {
        const revenue = salesRep.revenues.find(rev => rev.currency === selectedCurrency);
        return revenue ? { ...revenue, salesRepName: salesRep.name } : null;
      }
    } else {
      // Parent revenue
      const revenue = availableRevenue.parentRevenue.revenues.find(rev => rev.currency === selectedCurrency);
      return revenue ? { ...revenue, salesRepName: 'Your revenue' } : null;
    }
    
    return null;
  };

  const getCombinedRevenueByCurrency = () => {
    if (!availableRevenue) return [];
    
    const combinedRevenue: { [currency: string]: { amount: number; salesReps: number } } = {};
    
    // Add parent seller revenue
    availableRevenue.parentRevenue.revenues.forEach(revenue => {
      combinedRevenue[revenue.currency] = {
        amount: revenue.amount,
        salesReps: 0
      };
    });
    
    // Add sales rep revenue
    availableRevenue.salesRepRevenue.salesReps.forEach(repRevenue => {
      repRevenue.revenues.forEach(revenue => {
        if (combinedRevenue[revenue.currency]) {
          combinedRevenue[revenue.currency].amount += revenue.amount;
          combinedRevenue[revenue.currency].salesReps += 1;
        } else {
          combinedRevenue[revenue.currency] = {
            amount: revenue.amount,
            salesReps: 1
          };
        }
      });
    });
    
    return Object.entries(combinedRevenue).map(([currency, data]) => ({
      currency,
      amount: data.amount,
      salesReps: data.salesReps,
      currencySymbol: getCurrencySymbol(currency)
    }));
  };

  const getCurrencySymbol = (currency: string) => {
    const symbols: { [key: string]: string } = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      NGN: '₦',
      GMD: 'D',
    };
    return symbols[currency] || currency;
  };

  const formatCurrency = (amount: number | string, currency: string) => {
    const symbol = getCurrencySymbol(currency);
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `${symbol} ${numericAmount.toLocaleString()}`;
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

    const revenue = getSelectedRevenue();
    if (!revenue || revenue.amount <= 0) {
      Alert.alert('Error', 'No available revenue for settlement');
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
        amount: revenue.amount,
        currency: selectedCurrency,
        type: selectedPaymentMethod,
        bankAccountId: selectedPaymentMethod === 'BANK_TRANSFER' ? selectedBankAccount : undefined,
        walletId: selectedPaymentMethod === 'WALLET_TRANSFER' ? selectedWallet : undefined,
      };

      if (selectedSalesRepId) {
        // Create sales rep settlement request
        await settlementService.createSalesRepSettlementRequest(selectedSalesRepId, settlementData);
      } else {
        // Create parent settlement request
        await settlementService.createSettlementRequest(settlementData);
      }
      
      const settlementType = selectedSalesRepId ? 'sales rep' : 'your';
      Alert.alert(
        'Success',
        `${settlementType.charAt(0).toUpperCase() + settlementType.slice(1)} settlement request submitted successfully. You will be notified once it is processed.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error: any) {
      console.error('Error submitting settlement request:', error);
      Alert.alert('Error', error.message || 'Failed to submit settlement request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddPayoutMethod = () => {
    setAddMethodModalVisible(true);
    setSelectedMethodType(null);
    setShowForm(false);
    setBankFormStep(1);
    setBankFormErrors({});
    // Reset forms
    setBankForm({
      accountName: '',
      accountNumber: '',
      bankName: '',
      bankCode: '',
      branchCode: '',
      swiftCode: '',
      iban: '',
      currency: selectedCurrency || '',
      isDefault: false
    });
    setWalletForm({
      walletType: 'MOBILE_MONEY',
      walletAddress: '',
      account: user?.phoneNumber || '', // Pre-populate with user's phone number
      currency: selectedCurrency || '',
      isDefault: false
    });
  };

  const handleMethodTypeSelect = (type: 'BANK' | 'WALLET') => {
    setSelectedMethodType(type);
    setShowForm(true);
  };

  const handleBankFormChange = (field: string, value: string | boolean) => {
    setBankForm(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (bankFormErrors[field]) {
      setBankFormErrors(prev => ({ ...prev, [field]: false }));
    }
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
        // Validate bank form - bank code is now optional
        if (!bankForm.accountName || !bankForm.accountNumber || !bankForm.bankName || !bankForm.currency) {
          Alert.alert('Error', 'Please fill in all required fields for Bank Account');
          return;
        }
        
        // Create bank account
        await settlementService.addBankAccount(bankForm);
        Alert.alert('Success', 'Bank account added successfully');
      } else {
        // Validate wallet form
        if (!walletForm.walletAddress || !walletForm.currency) {
          Alert.alert('Error', 'Please fill in all required fields');
          return;
        }
        
        // Create wallet
        await settlementService.addWallet(walletForm);
        Alert.alert('Success', 'Wallet added successfully');
      }
      
      // Close modal and refresh data
      setAddMethodModalVisible(false);
      await loadData();
    } catch (error: any) {
      console.error('Error adding payment method:', error);
      Alert.alert('Error', error.message || 'Failed to add payment method');
    }
  };

  const handleBackToSelection = () => {
    setShowForm(false);
    setSelectedMethodType(null);
  };

  const handleNextBankStep = () => {
    if (bankFormStep < totalBankFormSteps) {
      const isValid = isBankFormStepValid();
      if (!isValid) {
        // Show validation errors and haptic feedback
        Vibration.vibrate(100);
        const errors: {[key: string]: boolean} = {};
        
        if (bankFormStep === 1) {
          if (!bankForm.accountName) errors.accountName = true;
          if (!bankForm.accountNumber) errors.accountNumber = true;
          if (!bankForm.bankName) errors.bankName = true;
        }
        
        setBankFormErrors(errors);
        return;
      }
      
      // Clear errors and proceed
      setBankFormErrors({});
      setBankFormStep(bankFormStep + 1);
    }
  };

  const handlePrevBankStep = () => {
    if (bankFormStep > 1) {
      setBankFormStep(bankFormStep - 1);
      setBankFormErrors({});
    }
  };

  const handleAddBankAccount = async () => {
    const isValid = isBankFormStepValid();
    if (!isValid) {
      // Show validation errors and haptic feedback
      Vibration.vibrate(100);
      const errors: {[key: string]: boolean} = {};
      
      if (bankFormStep === 1) {
        if (!bankForm.accountName) errors.accountName = true;
        if (!bankForm.accountNumber) errors.accountNumber = true;
        if (!bankForm.bankName) errors.bankName = true;
      }
      
      setBankFormErrors(errors);
      return;
    }
    
    // Clear errors and proceed with adding account
    setBankFormErrors({});
    await handleAddMethod();
  };

  const isBankFormStepValid = () => {
    switch (bankFormStep) {
      case 1:
        return bankForm.accountName && bankForm.accountNumber && bankForm.bankName;
      case 2:
        return true; // All fields are optional in step 2
      case 3:
        return true; // Currency is pre-filled and read-only
      default:
        return false;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
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
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.title}>Settlement Request</Text>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.errorContainer}>
            <Ionicons 
              name={isSalesRep ? "person-remove-outline" : "alert-circle-outline"} 
              size={48} 
              color={isSalesRep ? "#F59E0B" : "#DC2626"} 
            />
            <Text style={styles.errorText}>{error}</Text>
            {isSalesRep ? (
              <View style={styles.salesRepInfo}>
                <Text style={styles.salesRepInfoText}>
                  As a sales representative, you cannot request settlements. 
                  Only the parent seller can make settlement requests.
                </Text>
                {salesRepData && (
                  <Text style={styles.salesRepDetails}>
                    You are registered under: {salesRepData.parentSellerId}
                  </Text>
                )}
              </View>
            ) : (
              <TouchableOpacity style={styles.retryButton} onPress={loadData}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const selectedRevenue = getSelectedRevenue();
  const hasBankAccounts = bankAccounts.length > 0;
  const hasWallets = wallets.length > 0;
  const hasAnyPaymentMethod = hasBankAccounts || hasWallets;

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
          <Text style={styles.title}>Settlement Request</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('SettlementHistory')}
            style={styles.historyButton}
          >
            <Ionicons name="time-outline" size={24} color="#2563EB" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Parent Revenue Section */}
          {availableRevenue && availableRevenue.parentRevenue.revenues.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Revenue</Text>
              <View style={styles.currencySelector}>
                {availableRevenue.parentRevenue.revenues.map((revenue) => (
                  <TouchableOpacity
                    key={revenue.currency}
                    style={[
                      styles.currencyCard,
                      selectedCurrency === revenue.currency && !selectedSalesRepId && styles.selectedCurrencyCard
                    ]}
                    onPress={() => {
                      setSelectedCurrency(revenue.currency);
                      setSelectedSalesRepId(null); // Parent revenue
                    }}
                  >
                    <Text style={styles.currencyCode}>{revenue.currency}</Text>
                    <Text style={styles.currencyAmount}>
                      {revenue.currencySymbol}{revenue.amount.toLocaleString()}
                    </Text>
                    <Text style={styles.currencySubtext}>Your revenue</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Sales Rep Revenue Section */}
          {availableRevenue && availableRevenue.salesRepRevenue.salesReps.length > 0 && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.salesRepRevenueHeader}
                onPress={() => setShowSalesRepsRevenue(!showSalesRepsRevenue)}
              >
                <View style={styles.salesRepRevenueHeaderLeft}>
                  <Ionicons name="people-outline" size={24} color="#2563EB" />
                  <View style={styles.salesRepRevenueHeaderText}>
                    <Text style={styles.sectionTitle}>Sales Rep Revenue</Text>
                    <Text style={styles.salesRepRevenueSubtitle}>
                      {availableRevenue.salesRepRevenue.salesReps.length} sales rep{availableRevenue.salesRepRevenue.salesReps.length !== 1 ? 's' : ''} with revenue
                    </Text>
                  </View>
                </View>
                <Ionicons 
                  name={showSalesRepsRevenue ? "chevron-up" : "chevron-down"} 
                  size={24} 
                  color="#6B7280" 
                />
              </TouchableOpacity>
              
              {showSalesRepsRevenue && (
                <View style={styles.salesRepRevenueContent}>
                  {availableRevenue.salesRepRevenue.salesReps.map((salesRep) => (
                    <View key={salesRep.salesRepId} style={styles.salesRepCard}>
                      <View style={styles.salesRepHeader}>
                        <Text style={styles.salesRepName}>{salesRep.name}</Text>
                      </View>
                      <View style={styles.salesRepCurrencies}>
                        {salesRep.revenues.map((revenue, index) => (
                          <TouchableOpacity
                            key={index}
                            style={[
                              styles.currencyCard,
                              selectedCurrency === revenue.currency && selectedSalesRepId === salesRep.salesRepId && styles.selectedCurrencyCard
                            ]}
                            onPress={() => {
                              setSelectedCurrency(revenue.currency);
                              setSelectedSalesRepId(salesRep.salesRepId); // Sales rep revenue
                            }}
                          >
                            <Text style={styles.currencyCode}>{revenue.currency}</Text>
                            <Text style={styles.currencyAmount}>
                              {revenue.currencySymbol}{revenue.amount.toLocaleString()}
                            </Text>
                            <Text style={styles.currencySubtext}>{salesRep.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* No Revenue State */}
          {availableRevenue && 
           availableRevenue.parentRevenue.revenues.length === 0 && 
           availableRevenue.salesRepRevenue.salesReps.length === 0 && (
            <View style={styles.section}>
              <View style={styles.emptyState}>
                <Ionicons name="wallet-outline" size={48} color="#9CA3AF" />
                <Text style={styles.emptyStateText}>No available revenue for settlement</Text>
              </View>
            </View>
          )}


          {/* Payment Method Section */}
          {selectedRevenue && selectedRevenue.amount > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Payment Method</Text>
                <TouchableOpacity 
                  style={styles.addMoreButton}
                  onPress={handleAddPayoutMethod}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#2563EB" />
                  <Text style={styles.addMoreButtonText}>Add More</Text>
                </TouchableOpacity>
              </View>
              
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
                        <Ionicons name="wallet-outline" size={24} color="#8B5CF6" />
                        <Text style={styles.paymentMethodTitle}>Wallet Transfer</Text>
                        <Ionicons 
                          name={selectedPaymentMethod === 'WALLET_TRANSFER' ? 'checkmark-circle' : 'ellipse-outline'} 
                          size={24} 
                          color={selectedPaymentMethod === 'WALLET_TRANSFER' ? '#8B5CF6' : '#9CA3AF'} 
                        />
                      </View>
                      <Text style={styles.paymentMethodSubtitle}>
                        {wallets.length} wallet{wallets.length !== 1 ? 's' : ''} available
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <View style={styles.noPaymentMethodContainer}>
                  <Ionicons name="alert-circle-outline" size={48} color="#F59E0B" />
                  <Text style={styles.noPaymentMethodText}>No payment methods available</Text>
                  <Text style={styles.noPaymentMethodSubtext}>
                    Add a bank account or wallet to receive settlements
                  </Text>
                  <TouchableOpacity 
                    style={styles.addPayoutMethodButton}
                    onPress={handleAddPayoutMethod}
                  >
                    <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.addPayoutMethodButtonText}>Add Payout Method</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Account Selection Section */}
          {selectedPaymentMethod === 'BANK_TRANSFER' && hasBankAccounts && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Select Bank Account</Text>
                <TouchableOpacity 
                  style={styles.addMoreButton}
                  onPress={handleAddPayoutMethod}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#2563EB" />
                  <Text style={styles.addMoreButtonText}>Add More</Text>
                </TouchableOpacity>
              </View>
              {bankAccounts.map((account) => (
                <TouchableOpacity
                  key={account.id}
                  style={[
                    styles.accountCard,
                    selectedBankAccount === account.id && styles.selectedAccountCard
                  ]}
                  onPress={() => setSelectedBankAccount(account.id)}
                >
                  <View style={styles.accountHeader}>
                    <View style={styles.accountInfo}>
                      <Text style={styles.accountName}>{account.accountName}</Text>
                      <Text style={styles.accountNumber}>****{account.accountNumber.slice(-4)}</Text>
                      <Text style={styles.bankName}>{account.bankName}</Text>
                    </View>
                    <Ionicons 
                      name={selectedBankAccount === account.id ? 'checkmark-circle' : 'ellipse-outline'} 
                      size={24} 
                      color={selectedBankAccount === account.id ? '#2563EB' : '#9CA3AF'} 
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {selectedPaymentMethod === 'WALLET_TRANSFER' && hasWallets && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Select Wallet</Text>
                <TouchableOpacity 
                  style={[styles.addMoreButton, styles.addMoreButtonWallet]}
                  onPress={handleAddPayoutMethod}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#8B5CF6" />
                  <Text style={[styles.addMoreButtonText, styles.addMoreButtonTextWallet]}>Add More</Text>
                </TouchableOpacity>
              </View>
              {wallets.map((wallet) => (
                <TouchableOpacity
                  key={wallet.id}
                  style={[
                    styles.accountCard,
                    selectedWallet === wallet.id && styles.selectedAccountCard
                  ]}
                  onPress={() => setSelectedWallet(wallet.id)}
                >
                  <View style={styles.accountHeader}>
                    <View style={styles.accountInfo}>
                      <Text style={styles.accountName}>{wallet.walletType.replace('_', ' ')}</Text>
                      <Text style={styles.accountNumber}>{wallet.account}</Text>
                      <Text style={styles.bankName}>{wallet.currency}</Text>
                    </View>
                    <Ionicons 
                      name={selectedWallet === wallet.id ? 'checkmark-circle' : 'ellipse-outline'} 
                      size={24} 
                      color={selectedWallet === wallet.id ? '#8B5CF6' : '#9CA3AF'} 
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Submit Button */}
          {selectedRevenue && selectedRevenue.amount > 0 && selectedPaymentMethod && 
           ((selectedPaymentMethod === 'BANK_TRANSFER' && selectedBankAccount) || 
            (selectedPaymentMethod === 'WALLET_TRANSFER' && selectedWallet)) && (
            <View style={styles.submitSection}>
              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmitSettlement}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {selectedSalesRepId ? 'Request Sales Rep Settlement' : 'Request Your Settlement'}
                  </Text>
                )}
              </TouchableOpacity>
              <Text style={styles.submitNote}>
                Settlement will be processed within 1-3 business days
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Add Payout Method Modal */}
        <Modal
          visible={addMethodModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setAddMethodModalVisible(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                onPress={() => setAddMethodModalVisible(false)} 
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {showForm ? (selectedMethodType === 'BANK' ? 'Add Bank Account' : 'Add Wallet') : 'Add Payout Method'}
              </Text>
              {showForm && (
                <TouchableOpacity onPress={handleBackToSelection} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={24} color="#2563EB" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.modalContent}>
              {!showForm ? (
                <>
                  <Text style={styles.modalSubtitle}>
                    Choose how you'd like to receive your settlements
                  </Text>

                  {/* Method Type Selection - Inline */}
                  <View style={styles.methodTypeSection}>
                    <TouchableOpacity
                      style={[
                        styles.methodTypeCard,
                        selectedMethodType === 'BANK' && styles.selectedMethodTypeCard
                      ]}
                      onPress={() => handleMethodTypeSelect('BANK')}
                    >
                      <View style={styles.methodTypeHeader}>
                        <Ionicons name="card-outline" size={32} color="#2563EB" />
                        <View style={styles.methodTypeInfo}>
                          <Text style={styles.methodTypeTitle}>Bank Account</Text>
                          <Text style={styles.methodTypeDescription}>
                            Receive settlements directly to your bank account
                          </Text>
                        </View>
                        <Ionicons 
                          name={selectedMethodType === 'BANK' ? 'checkmark-circle' : 'ellipse-outline'} 
                          size={24} 
                          color={selectedMethodType === 'BANK' ? '#2563EB' : '#9CA3AF'} 
                        />
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.methodTypeCard,
                        selectedMethodType === 'WALLET' && styles.selectedMethodTypeCard
                      ]}
                      onPress={() => handleMethodTypeSelect('WALLET')}
                    >
                      <View style={styles.methodTypeHeader}>
                        <Ionicons name="wallet-outline" size={32} color="#8B5CF6" />
                        <View style={styles.methodTypeInfo}>
                          <Text style={styles.methodTypeTitle}>Digital Wallet</Text>
                          <Text style={styles.methodTypeDescription}>
                            Receive settlements to your digital wallet
                          </Text>
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
                  {/* Bank Account Form */}
                  {selectedMethodType === 'BANK' && (
                    <View style={styles.formSection}>
                      {/* Progress Indicator */}
                      <View style={styles.progressContainer}>
                        <Text style={styles.progressText}>Step {bankFormStep} of {totalBankFormSteps}</Text>
                        <View style={styles.progressBar}>
                          <View style={[styles.progressFill, { width: `${(bankFormStep / totalBankFormSteps) * 100}%` }]} />
                        </View>
                      </View>

                      {/* Step 1: Basic Information (4 fields) */}
                      {bankFormStep === 1 && (
                        <>
                          <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Account Name *</Text>
                            <TextInput
                              style={[
                                styles.textInput,
                                bankFormErrors.accountName && styles.textInputError
                              ]}
                              value={bankForm.accountName}
                              onChangeText={(value) => handleBankFormChange('accountName', value)}
                              placeholder="Enter account holder name"
                              placeholderTextColor="#9CA3AF"
                            />
                            {bankFormErrors.accountName && (
                              <Text style={styles.fieldErrorText}>Account Name is required</Text>
                            )}
                          </View>

                          <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Account Number *</Text>
                            <TextInput
                              style={[
                                styles.textInput,
                                bankFormErrors.accountNumber && styles.textInputError
                              ]}
                              value={bankForm.accountNumber}
                              onChangeText={(value) => handleBankFormChange('accountNumber', value)}
                              placeholder="Enter account number"
                              keyboardType="numeric"
                              placeholderTextColor="#9CA3AF"
                            />
                            {bankFormErrors.accountNumber && (
                              <Text style={styles.fieldErrorText}>Account Number is required</Text>
                            )}
                          </View>

                          <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Bank Name *</Text>
                            <TextInput
                              style={[
                                styles.textInput,
                                bankFormErrors.bankName && styles.textInputError
                              ]}
                              value={bankForm.bankName}
                              onChangeText={(value) => handleBankFormChange('bankName', value)}
                              placeholder="Enter bank name"
                              placeholderTextColor="#9CA3AF"
                            />
                            {bankFormErrors.bankName && (
                              <Text style={styles.fieldErrorText}>Bank Name is required</Text>
                            )}
                          </View>

                          <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Bank Code</Text>
                            <TextInput
                              style={styles.textInput}
                              value={bankForm.bankCode}
                              onChangeText={(value) => handleBankFormChange('bankCode', value)}
                              placeholder="Enter bank code (optional)"
                              placeholderTextColor="#9CA3AF"
                            />
                          </View>
                        </>
                      )}

                      {/* Step 2: Additional Details (3 fields) */}
                      {bankFormStep === 2 && (
                        <>
                          <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Branch Code</Text>
                            <TextInput
                              style={styles.textInput}
                              value={bankForm.branchCode}
                              onChangeText={(value) => handleBankFormChange('branchCode', value)}
                              placeholder="Enter branch code (optional)"
                              placeholderTextColor="#9CA3AF"
                            />
                          </View>

                          <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>SWIFT Code</Text>
                            <TextInput
                              style={styles.textInput}
                              value={bankForm.swiftCode}
                              onChangeText={(value) => handleBankFormChange('swiftCode', value)}
                              placeholder="Enter SWIFT code (optional)"
                              placeholderTextColor="#9CA3AF"
                            />
                          </View>

                          <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>IBAN</Text>
                            <TextInput
                              style={styles.textInput}
                              value={bankForm.iban}
                              onChangeText={(value) => handleBankFormChange('iban', value)}
                              placeholder="Enter IBAN (optional)"
                              placeholderTextColor="#9CA3AF"
                            />
                          </View>
                        </>
                      )}

                      {/* Step 3: Currency and Settings (2 fields) */}
                      {bankFormStep === 3 && (
                        <>
                          <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Currency *</Text>
                            <TextInput
                              style={[styles.textInput, styles.disabledInput]}
                              value={bankForm.currency}
                              editable={false}
                              placeholder="Currency will match selected revenue"
                              placeholderTextColor="#9CA3AF"
                            />
                            <Text style={styles.inputNote}>
                              Currency will match your selected revenue ({selectedCurrency})
                            </Text>
                          </View>

                          <TouchableOpacity
                            style={[
                              styles.checkboxContainer,
                              bankForm.isDefault && styles.checkboxContainerSelected
                            ]}
                            onPress={() => handleBankFormChange('isDefault', !bankForm.isDefault)}
                          >
                            <Ionicons 
                              name={bankForm.isDefault ? 'checkmark-circle' : 'ellipse-outline'} 
                              size={24} 
                              color={bankForm.isDefault ? '#2563EB' : '#9CA3AF'} 
                            />
                            <Text style={styles.checkboxLabel}>Set as default account</Text>
                          </TouchableOpacity>
                        </>
                      )}

                      {/* Navigation Buttons */}
                      <View style={styles.formNavigation}>
                        {bankFormStep > 1 && (
                          <TouchableOpacity
                            style={styles.navButton}
                            onPress={handlePrevBankStep}
                          >
                            <Ionicons name="arrow-back" size={20} color="#2563EB" />
                            <Text style={styles.navButtonText}>Previous</Text>
                          </TouchableOpacity>
                        )}
                        
                        {bankFormStep < totalBankFormSteps ? (
                          <TouchableOpacity
                            style={[
                              styles.navButton,
                              styles.navButtonPrimary,
                              !isBankFormStepValid() && styles.navButtonDisabled
                            ]}
                            onPress={handleNextBankStep}
                            disabled={!isBankFormStepValid()}
                          >
                            <Text style={[styles.navButtonText, styles.navButtonTextPrimary]}>Next</Text>
                            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={[
                              styles.navButton,
                              styles.navButtonPrimary,
                              !isBankFormStepValid() && styles.navButtonDisabled
                            ]}
                            onPress={handleAddBankAccount}
                            disabled={!isBankFormStepValid()}
                          >
                            <Text style={[styles.navButtonText, styles.navButtonTextPrimary]}>Add Account</Text>
                            <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Wallet Form */}
                  {selectedMethodType === 'WALLET' && (
                    <View style={styles.formSection}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Wallet Type *</Text>
                        <View style={styles.pickerContainer}>
                          {(['MOBILE_MONEY', 'DIGITAL_WALLET', 'CRYPTO'] as const).map((type) => (
                            <TouchableOpacity
                              key={type}
                              style={[
                                styles.pickerOption,
                                walletForm.walletType === type && styles.pickerOptionSelected
                              ]}
                              onPress={() => handleWalletFormChange('walletType', type)}
                            >
                              <Text style={[
                                styles.pickerOptionText,
                                walletForm.walletType === type && styles.pickerOptionTextSelected
                              ]}>
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
                        <Text style={styles.inputNote}>
                          Wallet number is automatically set to your phone number
                        </Text>
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Wallet Address *</Text>
                        <TextInput
                          style={styles.textInput}
                          value={walletForm.walletAddress}
                          onChangeText={(value) => handleWalletFormChange('walletAddress', value)}
                          placeholder="Enter wallet address"
                          placeholderTextColor="#9CA3AF"
                        />
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Currency *</Text>
                        <TextInput
                          style={[styles.textInput, styles.disabledInput]}
                          value={walletForm.currency}
                          editable={false}
                          placeholder="Currency will match selected revenue"
                          placeholderTextColor="#9CA3AF"
                        />
                        <Text style={styles.inputNote}>
                          Currency will match your selected revenue ({selectedCurrency})
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.checkboxContainer,
                          walletForm.isDefault && styles.checkboxContainerSelected
                        ]}
                        onPress={() => handleWalletFormChange('isDefault', !walletForm.isDefault)}
                      >
                        <Ionicons 
                          name={walletForm.isDefault ? 'checkmark-circle' : 'ellipse-outline'} 
                          size={24} 
                          color={walletForm.isDefault ? '#8B5CF6' : '#9CA3AF'} 
                        />
                        <Text style={styles.checkboxLabel}>Set as default wallet</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Add Method Button - Only for Wallet */}
                  {selectedMethodType === 'WALLET' && (
                    <TouchableOpacity
                      style={styles.addMethodButton}
                      onPress={handleAddMethod}
                    >
                      <Text style={styles.addMethodButtonText}>
                        Add Wallet
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>
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
  historyButton: {
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
  salesRepInfo: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  salesRepInfoText: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
    marginBottom: 8,
  },
  salesRepDetails: {
    fontSize: 12,
    color: '#B45309',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  currencySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  currencyCard: {
    flex: 1,
    minWidth: 120,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCurrencyCard: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  currencyAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#059669',
  },
  currencySubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    fontStyle: 'italic',
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
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  paymentMethodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  paymentMethodTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 12,
  },
  paymentMethodSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 36,
  },
  accountCard: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: 12,
  },
  selectedAccountCard: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  accountNumber: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  bankName: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  submitSection: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    margin: 16,
    borderRadius: 12,
  },
  submitButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  submitNote: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  noPaymentMethodContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noPaymentMethodText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    textAlign: 'center',
  },
  noPaymentMethodSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  addPayoutMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  addPayoutMethodButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
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
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 12,
    paddingBottom: 12,
    minHeight: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 56 : 56,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalContent: {
    padding: 16,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 24,
    textAlign: 'center',
  },
  methodTypeSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    gap: 12,
  },
  methodTypeCard: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  selectedMethodTypeCard: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  methodTypeHeader: {
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  methodTypeInfo: {
    alignItems: 'center',
    marginTop: 8,
  },
  methodTypeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  methodTypeDescription: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  addMethodButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  addMethodButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  addMethodButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  formSection: {
    marginTop: 24,
  },
  inputGroup: {
    marginBottom: 16,
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
  textInputError: {
    borderColor: '#DC2626',
  },
  fieldErrorText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 4,
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
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 100,
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
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  checkboxLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4B5563',
  },
  checkboxContainerSelected: {
    borderColor: '#2563EB',
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 4,
  },
  formNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  navButtonPrimary: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  navButtonDisabled: {
    backgroundColor: '#9CA3AF',
    borderColor: '#9CA3AF',
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  navButtonTextPrimary: {
    color: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  addMoreButtonWallet: {
    backgroundColor: '#F3E8FF',
  },
  addMoreButtonTextWallet: {
    color: '#8B5CF6',
  },
  // Sales Rep Revenue Styles
  salesRepRevenueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  salesRepRevenueHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  salesRepRevenueHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
  salesRepRevenueSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  salesRepRevenueContent: {
    marginTop: 16,
  },
  combinedRevenueSection: {
    marginBottom: 24,
  },
  combinedRevenueTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  combinedRevenueCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0F2FE',
    marginBottom: 8,
  },
  combinedRevenueInfo: {
    flex: 1,
  },
  combinedRevenueCurrency: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  combinedRevenueSalesReps: {
    fontSize: 12,
    color: '#6B7280',
  },
  combinedRevenueAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#059669',
  },
  individualSalesRepsSection: {
    marginTop: 16,
  },
  individualSalesRepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  salesRepRevenueCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  salesRepRevenueCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  salesRepInfo: {
    flex: 1,
  },
  salesRepName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  salesRepBranch: {
    fontSize: 14,
    color: '#6B7280',
  },
  salesRepTotalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
  },
  salesRepCurrencyBreakdown: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  currencyBreakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  currencyBreakdownInfo: {
    flex: 1,
  },
  currencyBreakdownCode: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 2,
  },
  currencyBreakdownOrders: {
    fontSize: 12,
    color: '#6B7280',
  },
  currencyBreakdownAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
}); 