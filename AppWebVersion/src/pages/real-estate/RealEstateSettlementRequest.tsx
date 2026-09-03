import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Building2, Wallet as WalletIcon, Plus } from 'lucide-react';
import {
  settlementService,
  type AvailableRealEstateEarnings,
  type BankAccount,
  type Wallet,
  type CreateBankAccountRequest,
  type CreateWalletRequest,
} from '../../api/settlementService';
import { useAuth } from '../../contexts/AuthContext';
import { formatPrice } from '../../utils/formatPrice';

export function RealEstateSettlementRequest() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [availableEarnings, setAvailableEarnings] = useState<AvailableRealEstateEarnings[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'BANK_TRANSFER' | 'WALLET_TRANSFER' | null>(null);
  const [selectedBankAccount, setSelectedBankAccount] = useState('');
  const [selectedWallet, setSelectedWallet] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [methodType, setMethodType] = useState<'BANK' | 'WALLET' | null>(null);
  const [bankForm, setBankForm] = useState<CreateBankAccountRequest>({
    accountName: '',
    accountNumber: '',
    bankName: '',
    currency: '',
    isDefault: false,
  });
  const [walletForm, setWalletForm] = useState<CreateWalletRequest>({
    walletType: 'MOBILE_MONEY',
    walletAddress: '',
    account: user?.phoneNumber || '',
    currency: '',
    isDefault: false,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [earnings, banks, walletsData] = await Promise.all([
        settlementService.getAvailableRealEstateEarnings(),
        settlementService.getBankAccounts(),
        settlementService.getWallets(),
      ]);
      setAvailableEarnings(earnings);
      setBankAccounts(banks.filter((b) => b.status === 'ACTIVE'));
      setWallets(walletsData.filter((w) => w.status === 'ACTIVE'));
      if (earnings.length > 0) {
        const preferred = searchParams.get('currency') || undefined;
        const found = preferred ? earnings.find((e) => e.currency === preferred) : null;
        const currency = (found || earnings[0]).currency;
        setSelectedCurrency(currency);
        setBankForm((prev) => ({ ...prev, currency }));
        setWalletForm((prev) => ({ ...prev, currency }));
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load settlement data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedEarnings = availableEarnings.find((e) => e.currency === selectedCurrency);

  const handleSubmit = async () => {
    if (!selectedCurrency || !selectedPaymentMethod || !selectedEarnings || selectedEarnings.amount <= 0) {
      alert('Select a currency and payout method with available earnings.');
      return;
    }
    if (selectedPaymentMethod === 'BANK_TRANSFER' && !selectedBankAccount) {
      alert('Please select a bank account.');
      return;
    }
    if (selectedPaymentMethod === 'WALLET_TRANSFER' && !selectedWallet) {
      alert('Please select a wallet.');
      return;
    }
    try {
      setSubmitting(true);
      const ids = (selectedEarnings.bookings || []).map((b) => b.id).filter(Boolean);
      await settlementService.createSettlementRequest({
        amount: selectedEarnings.amount,
        currency: selectedCurrency,
        type: selectedPaymentMethod,
        channel: 'REAL_ESTATE',
        bankAccountId: selectedPaymentMethod === 'BANK_TRANSFER' ? selectedBankAccount : undefined,
        walletId: selectedPaymentMethod === 'WALLET_TRANSFER' ? selectedWallet : undefined,
        includedPropertyBookingIds: ids,
        totalPropertyBookingsCount: ids.length,
      });
      alert('Settlement request submitted successfully.');
      navigate('/settlement-history?channel=REAL_ESTATE');
    } catch (err: any) {
      alert(err?.message || 'Failed to submit settlement request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddMethod = async () => {
    try {
      if (methodType === 'BANK') {
        if (!bankForm.accountName || !bankForm.accountNumber || !bankForm.bankName || !bankForm.currency) {
          alert('Please fill in required bank fields.');
          return;
        }
        await settlementService.addBankAccount(bankForm);
      } else if (methodType === 'WALLET') {
        if (!walletForm.walletAddress || !walletForm.currency) {
          alert('Please fill in required wallet fields.');
          return;
        }
        await settlementService.addWallet(walletForm);
      } else {
        return;
      }
      setShowAddMethod(false);
      setMethodType(null);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to add payout method');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white min-h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
        <button type="button" onClick={() => navigate(-1)} className="p-1 text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Request Settlement</h1>
          <p className="text-sm text-gray-500">Stay & Real Estate earnings</p>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <section>
          <h2 className="font-semibold text-gray-900 mb-2">Available earnings</h2>
          {availableEarnings.length === 0 ? (
            <p className="text-sm text-gray-500">No settleable earnings yet.</p>
          ) : (
            <div className="space-y-2">
              {availableEarnings.map((earning) => (
                <button
                  key={earning.currency}
                  type="button"
                  onClick={() => setSelectedCurrency(earning.currency)}
                  className={`w-full text-left p-4 rounded-xl border ${
                    selectedCurrency === earning.currency
                      ? 'border-violet-500 bg-violet-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <p className="text-xl font-bold text-violet-700">
                    {formatPrice(earning.amount, earning.currency)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {earning.bookingsCount} booking{earning.bookingsCount === 1 ? '' : 's'} / sale(s)
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-gray-900">Payout method</h2>
            <button
              type="button"
              onClick={() => {
                setShowAddMethod(true);
                setMethodType(null);
              }}
              className="text-sm text-violet-600 font-medium flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              type="button"
              onClick={() => {
                setSelectedPaymentMethod('BANK_TRANSFER');
                setSelectedWallet('');
              }}
              className={`p-3 rounded-xl border flex items-center gap-2 ${
                selectedPaymentMethod === 'BANK_TRANSFER' ? 'border-violet-500 bg-violet-50' : 'border-gray-200'
              }`}
            >
              <Building2 className="w-4 h-4" /> Bank
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedPaymentMethod('WALLET_TRANSFER');
                setSelectedBankAccount('');
              }}
              className={`p-3 rounded-xl border flex items-center gap-2 ${
                selectedPaymentMethod === 'WALLET_TRANSFER' ? 'border-violet-500 bg-violet-50' : 'border-gray-200'
              }`}
            >
              <WalletIcon className="w-4 h-4" /> Wallet
            </button>
          </div>

          {selectedPaymentMethod === 'BANK_TRANSFER' && (
            <div className="space-y-2">
              {bankAccounts.length === 0 ? (
                <p className="text-sm text-gray-500">No bank accounts yet. Add one above.</p>
              ) : (
                bankAccounts.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => setSelectedBankAccount(account.id)}
                    className={`w-full text-left p-3 rounded-lg border ${
                      selectedBankAccount === account.id ? 'border-violet-500 bg-violet-50' : 'border-gray-200'
                    }`}
                  >
                    <p className="font-medium text-gray-900">{account.bankName}</p>
                    <p className="text-sm text-gray-500">
                      {account.accountName} · {account.accountNumber}
                    </p>
                  </button>
                ))
              )}
            </div>
          )}

          {selectedPaymentMethod === 'WALLET_TRANSFER' && (
            <div className="space-y-2">
              {wallets.length === 0 ? (
                <p className="text-sm text-gray-500">No wallets yet. Add one above.</p>
              ) : (
                wallets.map((wallet) => (
                  <button
                    key={wallet.id}
                    type="button"
                    onClick={() => setSelectedWallet(wallet.id)}
                    className={`w-full text-left p-3 rounded-lg border ${
                      selectedWallet === wallet.id ? 'border-violet-500 bg-violet-50' : 'border-gray-200'
                    }`}
                  >
                    <p className="font-medium text-gray-900">{wallet.walletType.replace('_', ' ')}</p>
                    <p className="text-sm text-gray-500">{wallet.walletAddress || wallet.account}</p>
                  </button>
                ))
              )}
            </div>
          )}
        </section>

        <button
          type="button"
          disabled={submitting || !selectedEarnings || selectedEarnings.amount <= 0}
          onClick={handleSubmit}
          className="w-full py-3 rounded-xl bg-violet-600 text-white font-semibold disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit Settlement Request'}
        </button>
      </div>

      {showAddMethod && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAddMethod(false)} />
          <div className="relative z-10 w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-4 space-y-3">
            <h3 className="font-semibold text-gray-900">Add payout method</h3>
            {!methodType ? (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setMethodType('BANK')} className="py-3 rounded-xl border border-gray-200">
                  Bank
                </button>
                <button type="button" onClick={() => setMethodType('WALLET')} className="py-3 rounded-xl border border-gray-200">
                  Wallet
                </button>
              </div>
            ) : methodType === 'BANK' ? (
              <div className="space-y-2">
                <input className="w-full border rounded-lg px-3 py-2" placeholder="Account name" value={bankForm.accountName} onChange={(e) => setBankForm({ ...bankForm, accountName: e.target.value })} />
                <input className="w-full border rounded-lg px-3 py-2" placeholder="Account number" value={bankForm.accountNumber} onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })} />
                <input className="w-full border rounded-lg px-3 py-2" placeholder="Bank name" value={bankForm.bankName} onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })} />
                <input className="w-full border rounded-lg px-3 py-2" placeholder="Currency" value={bankForm.currency} onChange={(e) => setBankForm({ ...bankForm, currency: e.target.value })} />
                <button type="button" onClick={handleAddMethod} className="w-full py-2.5 bg-violet-600 text-white rounded-xl font-semibold">Save bank</button>
              </div>
            ) : (
              <div className="space-y-2">
                <input className="w-full border rounded-lg px-3 py-2" placeholder="Wallet address / number" value={walletForm.walletAddress} onChange={(e) => setWalletForm({ ...walletForm, walletAddress: e.target.value })} />
                <input className="w-full border rounded-lg px-3 py-2" placeholder="Account phone" value={walletForm.account} onChange={(e) => setWalletForm({ ...walletForm, account: e.target.value })} />
                <input className="w-full border rounded-lg px-3 py-2" placeholder="Currency" value={walletForm.currency} onChange={(e) => setWalletForm({ ...walletForm, currency: e.target.value })} />
                <button type="button" onClick={handleAddMethod} className="w-full py-2.5 bg-violet-600 text-white rounded-xl font-semibold">Save wallet</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
