import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Calendar, ArrowRight, Wallet, Package, User, CreditCard, MapPin, Truck } from 'lucide-react';
import { transactionService, type Transaction } from '../api/transactionService';
import { format } from 'date-fns';
import { API_CONFIG } from '../config/api';

export function TransactionHistory() {
  const navigate = useNavigate();
  const { currency } = useParams<{ currency: string }>();
  const [searchParams] = useSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const currencyCode = currency || 'USD';
  const currencySymbol = searchParams.get('symbol') || '$';

  // Image URL helper function (using proxy for development)
  const getImageUrl = (image: string | null) => {
    if (!image) return 'https://via.placeholder.com/300x300?text=No+Image';
    if (image.startsWith('http')) return image;
    // Use relative path since we have a proxy configured
    return image;
  };

  useEffect(() => {
    loadTransactions();
  }, [currencyCode, page]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await transactionService.getTransactionsByCurrency(currencyCode, page, 20);
      
      if (page === 1) {
        setTransactions(response.transactions || []);
      } else {
        setTransactions(prev => [...prev, ...(response.transactions || [])]);
      }
      
      setTotalRevenue(response.totalRevenue);
      setHasMore(response.hasMore);
    } catch (error) {
      console.error('Error loading transactions:', error);
      setError(`Failed to load transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  const handleTransactionClick = (transactionId: string) => {
    navigate(`/transaction-detail/${transactionId}?currency=${currencyCode}&symbol=${encodeURIComponent(currencySymbol)}`);
  };

  const handleSettlementClick = () => {
    navigate('/settlement-request');
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
          <p className="mt-4 text-gray-600">Loading transactions...</p>
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
                <Package className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Unable to load transactions</h2>
                <p className="text-red-700 mt-1">{error}</p>
                <div className="mt-4 flex gap-3">
                  <button 
                    onClick={loadTransactions}
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
              <h1 className="text-2xl font-bold text-gray-900">{currencyCode} Transactions</h1>
            </div>
          </div>
        </div>

        {/* Summary Card */}
        <div 
          className="bg-blue-600 rounded-xl p-6 mb-6 cursor-pointer hover:bg-blue-700 transition-colors"
          onClick={handleSettlementClick}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center mb-2">
                <h2 className="text-lg font-semibold text-white mr-3">{currencyCode} Transactions</h2>
                <div className="bg-white bg-opacity-20 px-2 py-1 rounded text-sm text-white">
                  {currencySymbol}
                </div>
              </div>
              <p className="text-3xl font-bold text-white mb-1">
                {currencySymbol}{totalRevenue.toLocaleString()}
              </p>
              <p className="text-blue-100">
                {transactions.length} transactions
              </p>
            </div>
            <div className="text-center">
              <Wallet className="w-8 h-8 text-white mx-auto mb-2" />
              <p className="text-sm text-white">Tap to request settlement</p>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleTransactionClick(transaction.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start flex-1">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg mr-4 flex-shrink-0">
                      <img
                        src={getImageUrl(transaction.productImage || null)}
                        alt={transaction.productTitle}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2">
                        {transaction.productTitle}
                      </h3>
                      <div className="flex items-center text-sm text-gray-500 mb-1">
                        <User className="w-4 h-4 mr-1" />
                        <span>Sold to {transaction.buyerName || 'Unknown Buyer'}</span>
                      </div>
                      <p className="text-sm text-gray-500 font-mono">
                        {transaction.orderNumber}
                      </p>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-xl font-bold text-gray-900">
                      {currencySymbol}{transaction.totalAmount.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">
                      {currencySymbol}{transaction.unitPrice} × {transaction.quantity}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="w-4 h-4 mr-1" />
                    <span>{format(new Date(transaction.transactionDate), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(transaction.status)}`}>
                      {getStatusText(transaction.status)}
                    </span>
                    <ArrowRight className="w-4 h-4 ml-2 text-gray-400" />
                  </div>
                </div>
              </div>
            ))}
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

        {transactions.length === 0 && !loading && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
            <p className="text-gray-500 mb-4">No transactions found for {currencyCode} currency</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => navigate('/seller')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Dashboard
              </button>
              <button
                onClick={loadTransactions}
                className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
