import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, TrendingUp, ArrowRight, Wallet, Users } from 'lucide-react';
import { settlementService, type AvailableRevenueResponse } from '../api/settlementService';

interface CurrencyRevenue {
  currency: string;
  symbol: string;
  amount: number;
  percentage: number;
  salesReps: number;
}

export function RevenueDetails() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<CurrencyRevenue[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRevenueData();
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
      GMD: 'D',
      SLL: 'Le',
      UGX: 'USh',
      TZS: 'TSh',
      NGN: '₦',
      KES: 'KSh',
      GHS: 'GH₵',
      ZAR: 'R',
      EGP: 'E£',
    };
    return currencySymbols[currencyCode] || currencyCode;
  };

  const loadRevenueData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await settlementService.getAvailableRevenue();
      
      // Transform the API data to match the component's expected format
      const transformedData: CurrencyRevenue[] = [];
      
      // Add parent seller revenue
      response.parentRevenue.revenues.forEach(revenue => {
        transformedData.push({
          currency: revenue.currency,
          symbol: getCurrencySymbol(revenue.currency),
          amount: revenue.amount,
          percentage: 0, // Will be calculated after we have all data
          salesReps: 0
        });
      });
      
      // Add sales rep revenue
      response.salesRepRevenue.salesReps.forEach(repRevenue => {
        repRevenue.revenues.forEach(revenue => {
          const existingIndex = transformedData.findIndex(item => item.currency === revenue.currency);
          if (existingIndex >= 0) {
            transformedData[existingIndex].amount += revenue.amount;
            transformedData[existingIndex].salesReps += 1;
          } else {
            transformedData.push({
              currency: revenue.currency,
              symbol: getCurrencySymbol(revenue.currency),
              amount: revenue.amount,
              percentage: 0,
              salesReps: 1
            });
          }
        });
      });
      
      // Calculate percentages
      const totalAmount = transformedData.reduce((sum, item) => sum + item.amount, 0);
      transformedData.forEach(item => {
        item.percentage = totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0;
      });
      
      // Sort by amount descending
      transformedData.sort((a, b) => b.amount - a.amount);
      
      setRevenueData(transformedData);
    } catch (error) {
      console.error('Error loading revenue data:', error);
      setError('Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  };

  const handleCurrencyClick = (currency: string, symbol: string) => {
    navigate(`/transactions?currency=${currency}&symbol=${encodeURIComponent(symbol)}`);
  };

  const handleSettlementClick = () => {
    navigate('/settlement-request');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading revenue details...</p>
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
                <TrendingUp className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Unable to load revenue data</h2>
                <p className="text-red-700 mt-1">{error}</p>
                <div className="mt-4 flex gap-3">
                  <button 
                    onClick={loadRevenueData}
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
              <h1 className="text-2xl font-bold text-gray-900">Revenue Details</h1>
            </div>
          </div>
        </div>

        {/* Summary Card */}
        <div 
          className="bg-blue-600 rounded-xl p-6 mb-6 cursor-pointer hover:bg-blue-700 transition-colors"
          onClick={handleSettlementClick}
        >
          <div className="text-center">
            <h2 className="text-lg font-semibold text-white mb-2">Revenue Breakdown</h2>
            <p className="text-blue-100 mb-4">
              {revenueData.length > 0 ? `${revenueData.length} currenc${revenueData.length === 1 ? 'y' : 'ies'}` : 'No revenue data'}
            </p>
            <div className="flex items-center justify-center text-white">
              <Wallet className="w-4 h-4 mr-2" />
              <span className="text-sm">Tap to request settlement</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </div>
          </div>
        </div>

        {/* Currency List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Revenue by Currency</h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {revenueData.map((item, index) => (
              <div
                key={item.currency}
                className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleCurrencyClick(item.currency, item.symbol)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-blue-600 font-semibold text-sm">{item.symbol}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{item.currency}</h3>
                      <p className="text-sm text-gray-500">
                        {item.salesReps > 0 ? `${item.salesReps} sales rep${item.salesReps === 1 ? '' : 's'}` : 'Your revenue only'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900">
                      {item.symbol}{item.amount.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">
                      {item.percentage.toFixed(1)}%
                    </p>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(item.percentage, 100)}%` }}
                  />
                </div>
                
                <div className="flex items-center justify-between mt-3">
                  <span className="text-sm text-blue-600 font-medium">View Transactions</span>
                  <ArrowRight className="w-4 h-4 text-blue-600" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {revenueData.length === 0 && (
          <div className="text-center py-12">
            <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No revenue data</h3>
            <p className="text-gray-500 mb-4">Start selling to see your revenue breakdown</p>
            <button
              onClick={() => navigate('/seller/add-product')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center"
            >
              Add Your First Product
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
