import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle, CreditCard, Wallet, Calendar, ArrowRight } from 'lucide-react';
import { settlementService, type SettlementRequest } from '../api/settlementService';

export function SettlementHistory() {
  const navigate = useNavigate();
  const [settlements, setSettlements] = useState<SettlementRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadSettlements();
  }, [page]);

  const loadSettlements = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await settlementService.getSettlementHistory(page, 20);
      
      if (page === 1) {
        setSettlements(response.settlements);
      } else {
        setSettlements(prev => [...prev, ...response.settlements]);
      }
      
      setHasMore(response.hasMore);
    } catch (error) {
      console.error('Error loading settlements:', error);
      setError('Failed to load settlement history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return CheckCircle;
      case 'PROCESSING':
        return Clock;
      case 'PENDING':
        return Clock;
      case 'FAILED':
        return XCircle;
      case 'CANCELLED':
        return XCircle;
      default:
        return AlertCircle;
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
        return CreditCard;
      case 'WALLET_TRANSFER':
        return Wallet;
      default:
        return Wallet;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'BANK_TRANSFER':
        return 'text-blue-600';
      case 'WALLET_TRANSFER':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
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
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    const formattedAmount = numericAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${symbol}${formattedAmount}`;
  };

  const handleSettlementClick = (settlementId: string, currency: string) => {
    const currencySymbol = formatAmount(1, currency).replace('1.00', '');
    navigate(`/settlement-detail/${settlementId}?currency=${currency}&symbol=${encodeURIComponent(currencySymbol)}`);
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      setPage(prev => prev + 1);
    }
  };

  if (loading && page === 1) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settlement history...</p>
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
                <h2 className="text-lg font-semibold text-gray-900">Unable to load settlement history</h2>
                <p className="text-red-700 mt-1">{error}</p>
                <div className="mt-4 flex gap-3">
                  <button 
                    onClick={loadSettlements}
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
              <h1 className="text-2xl font-bold text-gray-900">Settlement History</h1>
            </div>
            <button
              onClick={() => navigate('/settlement-request')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              New Request
            </button>
          </div>
        </div>

        {/* Settlements List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Settlements</h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {settlements.map((settlement) => {
              const StatusIcon = getStatusIcon(settlement.status);
              const TypeIcon = getTypeIcon(settlement.type);
              
              return (
                <div
                  key={settlement.id}
                  className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleSettlementClick(settlement.id, settlement.currency)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg mr-4 flex items-center justify-center">
                        <TypeIcon className={`w-6 h-6 ${getTypeColor(settlement.type)}`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {settlement.type.replace('_', ' ')}
                        </h3>
                        <p className="text-sm text-gray-500 font-mono">
                          {settlement.reference}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900">
                        {formatAmount(settlement.amount, settlement.currency)}
                      </p>
                      <p className="text-sm text-gray-500">{settlement.currency}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="w-4 h-4 mr-1" />
                      <span>{formatDate(settlement.createdAt)}</span>
                    </div>
                    <div className="flex items-center">
                      <StatusIcon className="w-4 h-4 mr-2" />
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(settlement.status)}`}>
                        {getStatusText(settlement.status)}
                      </span>
                      <ArrowRight className="w-4 h-4 ml-2 text-gray-400" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="px-6 py-4 border-t border-gray-200 text-center">
              <button
                onClick={loadMore}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>

        {settlements.length === 0 && !loading && (
          <div className="text-center py-12">
            <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No settlements found</h3>
            <p className="text-gray-500 mb-4">You haven't made any settlement requests yet</p>
            <button
              onClick={() => navigate('/settlement-request')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Request Settlement
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
