import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, CheckCircle, AlertCircle, Wallet as WalletIcon, CreditCard, Users, ChevronDown, ChevronUp, Clock, XCircle } from 'lucide-react';
import { settlementService, type AvailableRevenueResponse, type BankAccount, type Wallet, type CreateSettlementRequest, type CreateBankAccountRequest, type CreateWalletRequest } from '../api/settlementService';
import { salesRepService, type SalesRep } from '../api/salesReps';
import { useAuth } from '../contexts/AuthContext';

export function SettlementRequest() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [availableRevenue, setAvailableRevenue] = useState<AvailableRevenueResponse | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(false);
  const [isSalesRep, setIsSalesRep] = useState(false);
  const [salesRepData, setSalesRepData] = useState<SalesRep | null>(null);
  const [showSalesRepsRevenue, setShowSalesRepsRevenue] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'BANK_TRANSFER' | 'WALLET_TRANSFER' | null>(null);
  const [selectedBankAccount, setSelectedBankAccount] = useState<string>('');
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [selectedSalesRepId, setSelectedSalesRepId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddMethodModal, setShowAddMethodModal] = useState(false);
  const [selectedMethodType, setSelectedMethodType] = useState<'BANK' | 'WALLET' | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Bank account form fields
  const [bankForm, setBankForm] = useState<CreateBankAccountRequest>({
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
  
  // Wallet form fields
  const [walletForm, setWalletForm] = useState<CreateWalletRequest>({
    walletType: 'MOBILE_MONEY',
    walletAddress: '',
    account: user?.phoneNumber || '',
    currency: '',
    isDefault: false
  });

  useEffect(() => {
    checkSalesRepStatus();
  }, []);

  const checkSalesRepStatus = async () => {
    try {
      const salesRepData = await salesRepService.getSalesRepByUser();
      
      if (salesRepData) {
        setIsSalesRep(true);
        setSalesRepData(salesRepData);
        setError('Access Denied: Sales representatives cannot request settlements. Only the parent seller can make settlement requests.');
        setLoading(false);
      } else {
        setIsSalesRep(false);
        setSalesRepData(null);
        loadData();
      }
    } catch (error) {
      setIsSalesRep(false);
      setSalesRepData(null);
      loadData();
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setPaymentMethodsLoading(true);
      setError(null);
      
      const [revenueData, bankAccountsData, walletsData] = await Promise.all([
        settlementService.getAvailableRevenue(),
        settlementService.getBankAccounts(),
        settlementService.getWallets()
      ]);
      
      setAvailableRevenue(revenueData);
      
      // Debug: Log the actual response structure
      console.log('Bank accounts response:', bankAccountsData);
      console.log('Wallets response:', walletsData);
      console.log('Bank accounts type:', typeof bankAccountsData);
      console.log('Wallets type:', typeof walletsData);
      console.log('Bank accounts keys:', Object.keys(bankAccountsData || {}));
      console.log('Wallets keys:', Object.keys(walletsData || {}));
      
      // Handle bank accounts - check for different response structures
      let bankAccountsArray = [];
      if (Array.isArray(bankAccountsData)) {
        bankAccountsArray = bankAccountsData;
      } else if (bankAccountsData && Array.isArray((bankAccountsData as any).data)) {
        bankAccountsArray = (bankAccountsData as any).data;
      } else if (bankAccountsData && Array.isArray((bankAccountsData as any).bankAccounts)) {
        bankAccountsArray = (bankAccountsData as any).bankAccounts;
      } else if (bankAccountsData && Array.isArray((bankAccountsData as any).accounts)) {
        bankAccountsArray = (bankAccountsData as any).accounts;
      } else {
        console.error('Bank accounts data is not an array or doesn\'t contain expected array property:', bankAccountsData);
        bankAccountsArray = [];
      }
      
      setBankAccounts(bankAccountsArray.filter((account: any) => account.status === 'ACTIVE'));
      console.log('Processed bank accounts:', bankAccountsArray.filter((account: any) => account.status === 'ACTIVE'));
      
      // Handle wallets - check for different response structures
      let walletsArray = [];
      if (Array.isArray(walletsData)) {
        walletsArray = walletsData;
      } else if (walletsData && Array.isArray((walletsData as any).data)) {
        walletsArray = (walletsData as any).data;
      } else if (walletsData && Array.isArray((walletsData as any).wallets)) {
        walletsArray = (walletsData as any).wallets;
      } else if (walletsData && Array.isArray((walletsData as any).accounts)) {
        walletsArray = (walletsData as any).accounts;
      } else {
        console.error('Wallets data is not an array or doesn\'t contain expected array property:', walletsData);
        walletsArray = [];
      }
      
      setWallets(walletsArray.filter((wallet: any) => wallet.status === 'ACTIVE'));
      console.log('Processed wallets:', walletsArray.filter((wallet: any) => wallet.status === 'ACTIVE'));
      
      // Set default currency if available in parent revenue - match mobile app approach
      if (revenueData.parentRevenue.revenues.length > 0) {
        setSelectedCurrency(revenueData.parentRevenue.revenues[0].currency);
        setBankForm(prev => ({ ...prev, currency: revenueData.parentRevenue.revenues[0].currency }));
        setWalletForm(prev => ({ ...prev, currency: revenueData.parentRevenue.revenues[0].currency }));
      }
    } catch (error) {
      console.error('Error loading settlement data:', error);
      setError('Failed to load settlement data');
    } finally {
      setLoading(false);
      setPaymentMethodsLoading(false);
    }
  };

  const getSelectedRevenue = () => {
    if (!availableRevenue || !selectedCurrency) return null;
    
    if (selectedSalesRepId) {
      // Sales rep revenue - match mobile app approach
      const salesRep = availableRevenue.salesRepRevenue.salesReps.find(rep => rep.salesRepId === selectedSalesRepId);
      if (salesRep) {
        const revenue = salesRep.revenues.find(rev => rev.currency === selectedCurrency);
        return revenue ? { ...revenue, salesRepName: salesRep.name } : null;
      }
    } else {
      // Parent revenue - match mobile app approach
      const revenue = availableRevenue.parentRevenue.revenues.find(rev => rev.currency === selectedCurrency);
      return revenue ? { ...revenue, salesRepName: 'Your revenue' } : null;
    }
    
    return null;
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

  const handlePaymentMethodSelect = (method: 'BANK_TRANSFER' | 'WALLET_TRANSFER') => {
    setSelectedPaymentMethod(method);
    setSelectedBankAccount('');
    setSelectedWallet('');
  };

  const reloadPaymentMethods = async () => {
    try {
      console.log('🔄 Reloading payment methods...');
      setPaymentMethodsLoading(true);
      const [bankAccountsData, walletsData] = await Promise.all([
        settlementService.getBankAccounts(),
        settlementService.getWallets()
      ]);
      
      console.log('🔄 Reloading - Bank accounts response:', bankAccountsData);
      console.log('🔄 Reloading - Wallets response:', walletsData);
      
      // Handle bank accounts - check for different response structures
      let bankAccountsArray = [];
      if (Array.isArray(bankAccountsData)) {
        bankAccountsArray = bankAccountsData;
      } else if (bankAccountsData && Array.isArray((bankAccountsData as any).data)) {
        bankAccountsArray = (bankAccountsData as any).data;
      } else if (bankAccountsData && Array.isArray((bankAccountsData as any).bankAccounts)) {
        bankAccountsArray = (bankAccountsData as any).bankAccounts;
      } else if (bankAccountsData && Array.isArray((bankAccountsData as any).accounts)) {
        bankAccountsArray = (bankAccountsData as any).accounts;
      } else {
        console.error('❌ Reloading - Bank accounts data is not an array or doesn\'t contain expected array property:', bankAccountsData);
        bankAccountsArray = [];
      }
      
      const activeBankAccounts = bankAccountsArray.filter((account: any) => account.status === 'ACTIVE');
      setBankAccounts(activeBankAccounts);
      console.log('✅ Reloaded bank accounts:', activeBankAccounts);
      
      // Handle wallets - check for different response structures
      let walletsArray = [];
      if (Array.isArray(walletsData)) {
        walletsArray = walletsData;
      } else if (walletsData && Array.isArray((walletsData as any).data)) {
        walletsArray = (walletsData as any).data;
      } else if (walletsData && Array.isArray((walletsData as any).wallets)) {
        walletsArray = (walletsData as any).wallets;
      } else if (walletsData && Array.isArray((walletsData as any).accounts)) {
        walletsArray = (walletsData as any).accounts;
      } else {
        console.error('❌ Reloading - Wallets data is not an array or doesn\'t contain expected array property:', walletsData);
        walletsArray = [];
      }
      
      const activeWallets = walletsArray.filter((wallet: any) => wallet.status === 'ACTIVE');
      setWallets(activeWallets);
      console.log('✅ Reloaded wallets:', activeWallets);
      
      console.log('✅ Payment methods reload completed');
    } catch (error) {
      console.error('❌ Error reloading payment methods:', error);
    } finally {
      setPaymentMethodsLoading(false);
    }
  };

  const handleSubmitSettlement = async () => {
    if (!selectedCurrency || !selectedPaymentMethod) {
      alert('Please select a currency and payment method');
      return;
    }

    const revenue = getSelectedRevenue();
    if (!revenue || revenue.amount <= 0) {
      alert('No available revenue for settlement');
      return;
    }

    if (selectedPaymentMethod === 'BANK_TRANSFER' && !selectedBankAccount) {
      alert('Please select a bank account');
      return;
    }

    if (selectedPaymentMethod === 'WALLET_TRANSFER' && !selectedWallet) {
      alert('Please select a wallet');
      return;
    }

    try {
      setSubmitting(true);
      
      const settlementData: CreateSettlementRequest = {
        amount: revenue.amount,
        currency: selectedCurrency,
        type: selectedPaymentMethod,
        bankAccountId: selectedPaymentMethod === 'BANK_TRANSFER' ? selectedBankAccount : undefined,
        walletId: selectedPaymentMethod === 'WALLET_TRANSFER' ? selectedWallet : undefined,
      };

      if (selectedSalesRepId) {
        await settlementService.createSalesRepSettlementRequest(selectedSalesRepId, settlementData);
      } else {
        await settlementService.createSettlementRequest(settlementData);
      }
      
      const settlementType = selectedSalesRepId ? 'sales rep' : 'your';
      setSuccessMessage(`${settlementType.charAt(0).toUpperCase() + settlementType.slice(1)} settlement request submitted successfully. You will be notified once it is processed.`);
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Error submitting settlement request:', error);
      alert(error.message || 'Failed to submit settlement request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddPayoutMethod = () => {
    setShowAddMethodModal(true);
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
      isDefault: false
    });
    setWalletForm({
      walletType: 'MOBILE_MONEY',
      walletAddress: '',
      account: user?.phoneNumber || '',
      currency: selectedCurrency || '',
      isDefault: false
    });
  };

  const handleMethodTypeSelect = (type: 'BANK' | 'WALLET') => {
    setSelectedMethodType(type);
    setShowForm(true);
  };

  const handleAddMethod = async () => {
    if (!selectedMethodType) {
      alert('Please select a method type');
      return;
    }

    try {
      console.log('➕ Adding payment method:', selectedMethodType);
      
      if (selectedMethodType === 'BANK') {
        if (!bankForm.accountName || !bankForm.accountNumber || !bankForm.bankName || !bankForm.currency) {
          alert('Please fill in all required fields for Bank Account');
          return;
        }
        
        console.log('➕ Adding bank account:', bankForm);
        await settlementService.addBankAccount(bankForm);
        console.log('✅ Bank account added successfully');
        alert('Bank account added successfully');
      } else {
        if (!walletForm.walletAddress || !walletForm.currency) {
          alert('Please fill in all required fields');
          return;
        }
        
        console.log('➕ Adding wallet:', walletForm);
        await settlementService.addWallet(walletForm);
        console.log('✅ Wallet added successfully');
        alert('Wallet added successfully');
      }
      
      console.log('🔄 Closing modal and reloading payment methods...');
      setShowAddMethodModal(false);
      
      // Add a small delay to ensure the backend has processed the new payment method
      setTimeout(async () => {
        await reloadPaymentMethods();
        console.log('✅ Payment method addition completed');
      }, 1000);
    } catch (error: any) {
      console.error('❌ Error adding payment method:', error);
      alert(error.message || 'Failed to add payment method');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settlement data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-10">
          <div className="bg-white rounded-xl shadow-sm p-8 border border-red-100">
            <div className="flex items-start">
              <div className="p-3 bg-red-50 rounded-lg mr-3">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Unable to access Settlement Request</h2>
                <p className="text-red-700 mt-1">{error}</p>
                {isSalesRep ? (
                  <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-yellow-800 text-sm">
                      As a sales representative, you cannot request settlements. 
                      Only the parent seller can make settlement requests.
                    </p>
                    {salesRepData && (
                      <p className="text-yellow-700 text-xs mt-2 italic">
                        You are registered under: {salesRepData.parentSellerId}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 flex gap-3">
                    <button 
                      onClick={loadData}
                      className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg"
                    >
                      Retry
                    </button>
                    <button 
                      onClick={() => navigate(-1)}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    >
                      Go Back
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const selectedRevenue = getSelectedRevenue();
  const hasBankAccounts = bankAccounts.length > 0;
  const hasWallets = wallets.length > 0;
  const hasAnyPaymentMethod = hasBankAccounts || hasWallets;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Settlement Request</h1>
            </div>
            <button
              onClick={() => navigate('/settlement-history')}
              className="flex items-center text-blue-600 hover:text-blue-700"
            >
              <Clock className="w-5 h-5 mr-2" />
              History
            </button>
          </div>
        </div>

        {/* Parent Revenue Section */}
        {availableRevenue && availableRevenue.parentRevenue.revenues.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Revenue</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableRevenue.parentRevenue.revenues.map((revenue) => (
                <button
                  key={revenue.currency}
                  className={`p-4 rounded-lg border-2 text-left transition-colors ${
                    selectedCurrency === revenue.currency && !selectedSalesRepId 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => {
                    setSelectedCurrency(revenue.currency);
                    setSelectedSalesRepId(null);
                  }}
                >
                  <div className="text-lg font-semibold text-gray-900">{revenue.currency}</div>
                  <div className="text-2xl font-bold text-green-600">
                    {revenue.currencySymbol}{revenue.amount.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">Your revenue</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sales Rep Revenue Section */}
        {availableRevenue && availableRevenue.salesRepRevenue.salesReps.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <button
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors"
              onClick={() => setShowSalesRepsRevenue(!showSalesRepsRevenue)}
            >
              <div className="flex items-center">
                <Users className="w-6 h-6 text-blue-600 mr-3" />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Sales Rep Revenue</h2>
                  <p className="text-sm text-gray-500">
                    {availableRevenue.salesRepRevenue.salesReps.length} sales rep{availableRevenue.salesRepRevenue.salesReps.length !== 1 ? 's' : ''} with revenue
                  </p>
                </div>
              </div>
              {showSalesRepsRevenue ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            
            {showSalesRepsRevenue && (
              <div className="mt-4 space-y-4">
                {availableRevenue.salesRepRevenue.salesReps.map((salesRep) => (
                  <div key={salesRep.salesRepId} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">{salesRep.name}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {salesRep.revenues.map((revenue, index) => (
                        <button
                          key={index}
                          className={`p-3 rounded-lg border-2 text-left transition-colors ${
                            selectedCurrency === revenue.currency && selectedSalesRepId === salesRep.salesRepId
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => {
                            setSelectedCurrency(revenue.currency);
                            setSelectedSalesRepId(salesRep.salesRepId);
                          }}
                        >
                          <div className="font-semibold text-gray-900">{revenue.currency}</div>
                          <div className="text-lg font-bold text-green-600">
                            {revenue.currencySymbol}{revenue.amount.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">{salesRep.name}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* No Revenue State */}
        {availableRevenue && 
         availableRevenue.parentRevenue.revenues.length === 0 && 
         availableRevenue.salesRepRevenue.salesReps.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <WalletIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No available revenue for settlement</h3>
            <p className="text-gray-500">Start selling to generate revenue for settlement</p>
          </div>
        )}

        {/* Payment Method Section */}
        {selectedRevenue && selectedRevenue.amount > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Payment Method</h2>
              <div className="flex items-center space-x-2">
                <button 
                  className="flex items-center text-gray-600 hover:text-gray-700"
                  onClick={reloadPaymentMethods}
                  disabled={paymentMethodsLoading}
                >
                  <Clock className="w-4 h-4 mr-1" />
                  Refresh
                </button>
              <button 
                className="flex items-center text-blue-600 hover:text-blue-700"
                onClick={handleAddPayoutMethod}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add More
              </button>
              </div>
            </div>
            
            {paymentMethodsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading payment methods...</p>
              </div>
            ) : hasAnyPaymentMethod ? (
              <div className="space-y-4">
                {/* Bank Transfer Option */}
                {hasBankAccounts && (
                  <button
                    className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                      selectedPaymentMethod === 'BANK_TRANSFER' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handlePaymentMethodSelect('BANK_TRANSFER')}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <CreditCard className="w-6 h-6 text-blue-600 mr-3" />
                        <div>
                          <div className="font-semibold text-gray-900">Bank Transfer</div>
                          <div className="text-sm text-gray-500">
                            {bankAccounts.length} account{bankAccounts.length !== 1 ? 's' : ''} available
                          </div>
                        </div>
                      </div>
                      <CheckCircle className={`w-6 h-6 ${selectedPaymentMethod === 'BANK_TRANSFER' ? 'text-blue-600' : 'text-gray-300'}`} />
                    </div>
                  </button>
                )}

                {/* Wallet Transfer Option */}
                {hasWallets && (
                  <button
                    className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                      selectedPaymentMethod === 'WALLET_TRANSFER' 
                        ? 'border-purple-500 bg-purple-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handlePaymentMethodSelect('WALLET_TRANSFER')}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <WalletIcon className="w-6 h-6 text-purple-600 mr-3" />
                        <div>
                          <div className="font-semibold text-gray-900">Wallet Transfer</div>
                          <div className="text-sm text-gray-500">
                            {wallets.length} wallet{wallets.length !== 1 ? 's' : ''} available
                          </div>
                        </div>
                      </div>
                      <CheckCircle className={`w-6 h-6 ${selectedPaymentMethod === 'WALLET_TRANSFER' ? 'text-purple-600' : 'text-gray-300'}`} />
                    </div>
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No payment methods available</h3>
                <p className="text-gray-500 mb-4">Add a bank account or wallet to receive settlements</p>
                <button 
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                  onClick={handleAddPayoutMethod}
                >
                  Add Payout Method
                </button>
              </div>
            )}
          </div>
        )}

        {/* Account Selection Section */}
        {selectedPaymentMethod === 'BANK_TRANSFER' && hasBankAccounts && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Select Bank Account</h2>
              <button 
                className="flex items-center text-blue-600 hover:text-blue-700"
                onClick={handleAddPayoutMethod}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add More
              </button>
            </div>
            <div className="space-y-3">
              {bankAccounts.map((account) => (
                <button
                  key={account.id}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                    selectedBankAccount === account.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedBankAccount(account.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{account.accountName}</div>
                      <div className="text-sm text-gray-500">****{account.accountNumber.slice(-4)}</div>
                      <div className="text-sm text-gray-500">{account.bankName}</div>
                    </div>
                    <CheckCircle className={`w-6 h-6 ${selectedBankAccount === account.id ? 'text-blue-600' : 'text-gray-300'}`} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedPaymentMethod === 'WALLET_TRANSFER' && hasWallets && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Select Wallet</h2>
              <button 
                className="flex items-center text-purple-600 hover:text-purple-700"
                onClick={handleAddPayoutMethod}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add More
              </button>
            </div>
            <div className="space-y-3">
              {wallets.map((wallet) => (
                <button
                  key={wallet.id}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                    selectedWallet === wallet.id 
                      ? 'border-purple-500 bg-purple-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedWallet(wallet.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{wallet.walletType.replace('_', ' ')}</div>
                      <div className="text-sm text-gray-500">{wallet.account}</div>
                      <div className="text-sm text-gray-500 font-mono break-all">{wallet.walletAddress}</div>
                      <div className="text-sm text-gray-500">{wallet.currency}</div>
                    </div>
                    <CheckCircle className={`w-6 h-6 ${selectedWallet === wallet.id ? 'text-purple-600' : 'text-gray-300'}`} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Submit Button */}
        {selectedRevenue && selectedRevenue.amount > 0 && selectedPaymentMethod && 
         ((selectedPaymentMethod === 'BANK_TRANSFER' && selectedBankAccount) || 
          (selectedPaymentMethod === 'WALLET_TRANSFER' && selectedWallet)) && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <button
              className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-colors ${
                submitting 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
              onClick={handleSubmitSettlement}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : (selectedSalesRepId ? 'Request Sales Rep Settlement' : 'Request Your Settlement')}
            </button>
            <p className="text-sm text-gray-500 text-center mt-3">
              Settlement will be processed within 1-3 business days
            </p>
          </div>
        )}

        {/* Add Payout Method Modal */}
        {showAddMethodModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {showForm ? (selectedMethodType === 'BANK' ? 'Add Bank Account' : 'Add Wallet') : 'Add Payout Method'}
                  </h3>
                  <button
                    onClick={() => setShowAddMethodModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {!showForm ? (
                  <div className="space-y-4">
                    <p className="text-gray-600 text-center mb-6">
                      Choose how you'd like to receive your settlements
                    </p>

                    <button
                      className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                        selectedMethodType === 'BANK' 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleMethodTypeSelect('BANK')}
                    >
                      <div className="flex items-center">
                        <CreditCard className="w-8 h-8 text-blue-600 mr-4" />
                        <div>
                          <div className="font-semibold text-gray-900">Bank Account</div>
                          <div className="text-sm text-gray-500">Receive settlements directly to your bank account</div>
                        </div>
                        <CheckCircle className={`w-6 h-6 ml-auto ${selectedMethodType === 'BANK' ? 'text-blue-600' : 'text-gray-300'}`} />
                      </div>
                    </button>

                    <button
                      className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                        selectedMethodType === 'WALLET' 
                          ? 'border-purple-500 bg-purple-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleMethodTypeSelect('WALLET')}
                    >
                      <div className="flex items-center">
                        <WalletIcon className="w-8 h-8 text-purple-600 mr-4" />
                        <div>
                          <div className="font-semibold text-gray-900">Digital Wallet</div>
                          <div className="text-sm text-gray-500">Receive settlements to your digital wallet</div>
                        </div>
                        <CheckCircle className={`w-6 h-6 ml-auto ${selectedMethodType === 'WALLET' ? 'text-purple-600' : 'text-gray-300'}`} />
                      </div>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedMethodType === 'BANK' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Account Name *</label>
                          <input
                            type="text"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={bankForm.accountName}
                            onChange={(e) => setBankForm(prev => ({ ...prev, accountName: e.target.value }))}
                            placeholder="Enter account holder name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Account Number *</label>
                          <input
                            type="text"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={bankForm.accountNumber}
                            onChange={(e) => setBankForm(prev => ({ ...prev, accountNumber: e.target.value }))}
                            placeholder="Enter account number"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name *</label>
                          <input
                            type="text"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={bankForm.bankName}
                            onChange={(e) => setBankForm(prev => ({ ...prev, bankName: e.target.value }))}
                            placeholder="Enter bank name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Bank Code</label>
                          <input
                            type="text"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={bankForm.bankCode}
                            onChange={(e) => setBankForm(prev => ({ ...prev, bankCode: e.target.value }))}
                            placeholder="Enter bank code (optional)"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Currency *</label>
                          <input
                            type="text"
                            className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100"
                            value={bankForm.currency}
                            readOnly
                          />
                          <p className="text-xs text-gray-500 mt-1">Currency will match your selected revenue</p>
                        </div>
                      </>
                    )}

                    {selectedMethodType === 'WALLET' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Wallet Type *</label>
                          <select
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            value={walletForm.walletType}
                            onChange={(e) => setWalletForm(prev => ({ ...prev, walletType: e.target.value as any }))}
                          >
                            <option value="MOBILE_MONEY">Mobile Money</option>
                            <option value="DIGITAL_WALLET">Digital Wallet</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Wallet Number (Phone) *</label>
                          <input
                            type="text"
                            className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100"
                            value={walletForm.account}
                            readOnly
                          />
                          <p className="text-xs text-gray-500 mt-1">Wallet number is automatically set to your phone number</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Wallet Address *</label>
                          <input
                            type="text"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            value={walletForm.walletAddress}
                            onChange={(e) => setWalletForm(prev => ({ ...prev, walletAddress: e.target.value }))}
                            placeholder="Enter wallet address"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Currency *</label>
                          <input
                            type="text"
                            className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100"
                            value={walletForm.currency}
                            readOnly
                          />
                          <p className="text-xs text-gray-500 mt-1">Currency will match your selected revenue</p>
                        </div>
                      </>
                    )}

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isDefault"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={selectedMethodType === 'BANK' ? bankForm.isDefault : walletForm.isDefault}
                        onChange={(e) => {
                          if (selectedMethodType === 'BANK') {
                            setBankForm(prev => ({ ...prev, isDefault: e.target.checked }));
                          } else {
                            setWalletForm(prev => ({ ...prev, isDefault: e.target.checked }));
                          }
                        }}
                      />
                      <label htmlFor="isDefault" className="ml-2 text-sm text-gray-700">
                        Set as default {selectedMethodType === 'BANK' ? 'account' : 'wallet'}
                      </label>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  {showForm && (
                    <button
                      onClick={() => setShowForm(false)}
                      className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Back
                    </button>
                  )}
                  <button
                    onClick={showForm ? handleAddMethod : () => setShowForm(true)}
                    className={`flex-1 py-3 px-4 rounded-lg text-white ${
                      selectedMethodType === 'WALLET' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                    disabled={!selectedMethodType}
                  >
                    {showForm ? `Add ${selectedMethodType === 'BANK' ? 'Account' : 'Wallet'}` : 'Continue'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full">
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Success!</h3>
                <p className="text-gray-600 mb-6">{successMessage}</p>
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    navigate(-1);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
