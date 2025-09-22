import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Wallet, TrendingUp, DollarSign } from 'lucide-react';
import { productService } from '../api/productService';
import { CurrencyRevenue } from '../types/transaction';

export function TransactionCurrencyOverview() {
  const navigate = useNavigate();
  const [currencies, setCurrencies] = useState<CurrencyRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCurrencyData();
  }, []);

  const getCurrencySymbol = (currencyCode: string) => {
    const currencySymbols: { [key: string]: string } = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      CAD: 'C$',
      AUD: 'A$',
      CHF: 'CHF',
      CNY: '¥',
      INR: '₹',
      BRL: 'R$',
      MXN: '$',
      KRW: '₩',
      SGD: 'S$',
      HKD: 'HK$',
      NZD: 'NZ$',
    };
    return currencySymbols[currencyCode] || currencyCode;
  };

  const loadCurrencyData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await productService.getSellerRevenue();
      
      // Transform the API data to match the component's expected format
      const transformedData: CurrencyRevenue[] = response.revenueByCurrency.map(item => ({
        currency: item.currency,
        currencySymbol: getCurrencySymbol(item.currency),
        totalRevenue: item.amount,
        transactionCount: 0, // We don't have transaction count from revenue API
        percentage: item.percentage // Include percentage from API
      }));
      
      setCurrencies(transformedData);
    } catch (error) {
      console.error('Error loading currency data:', error);
      setError('Failed to load currency data');
    } finally {
      setLoading(false);
    }
  };

  const handleCurrencyClick = (currency: string, symbol: string) => {
    navigate(`/transactions/${currency}?symbol=${encodeURIComponent(symbol)}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading currencies...</p>
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
                <Wallet className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Unable to load currencies</h2>
                <p className="text-red-700 mt-1">{error}</p>
                <div className="mt-4 flex gap-3">
                  <button 
                    onClick={loadCurrencyData}
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
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6 pb-20">
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
              <h1 className="text-2xl font-bold text-gray-900">Transaction History</h1>
            </div>
          </div>
        </div>

        {/* Currency Cards - Full Width Layout */}
        <div className="space-y-4">
          {currencies.map((currency) => (
            <div
              key={currency.currency}
              className="bg-white rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow border border-gray-200 w-full"
              onClick={() => handleCurrencyClick(currency.currency, currency.currencySymbol)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{currency.currency}</h3>
                    <p className="text-sm text-gray-500">Currency</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">
                    {currency.currencySymbol}{currency.totalRevenue.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    {currency.percentage}% of total revenue
                  </p>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${currency.percentage || 0}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center text-sm text-gray-500">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  <span>Total Revenue</span>
                </div>
                <div className="flex items-center text-sm text-blue-600">
                  <span>View Details</span>
                  <ArrowLeft className="w-4 h-4 ml-1 rotate-180" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {currencies.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
            <p className="text-gray-500 mb-4">You haven't made any sales yet</p>
            <button
              onClick={() => navigate('/seller')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
