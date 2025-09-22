import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Clock, XCircle, RefreshCw, Calendar, Package } from 'lucide-react';
import { transactionService, type TransactionDetail } from '../api/transactionService';
import { format } from 'date-fns';
import { API_CONFIG } from '../config/api';

export function TransactionDetail() {
  const navigate = useNavigate();
  const { transactionId } = useParams<{ transactionId: string }>();
  const [searchParams] = useSearchParams();
  const [transaction, setTransaction] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currency = searchParams.get('currency') || 'USD';
  const currencySymbol = searchParams.get('symbol') || '$';

  // Image URL helper function (same as mobile app)
  const getImageUrl = (image: string | null) => {
    if (!image) return 'https://via.placeholder.com/400x200?text=No+Image';
    if (image.startsWith('http')) return image;
    // Use relative path since we have a proxy configured
    return image;
  };

  useEffect(() => {
    if (transactionId) {
      loadTransactionDetail();
    }
  }, [transactionId]);

  const loadTransactionDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const transactionData = await transactionService.getTransactionDetail(transactionId!);
      setTransaction(transactionData);
    } catch (error: any) {
      console.error('Error loading transaction detail:', error);
      if (error.response?.status === 404) {
        setError('Transaction not found');
      } else {
        setError('Failed to load transaction details');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'pending': return 'text-yellow-600';
      case 'cancelled': return 'text-red-600';
      case 'refunded': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'pending': return 'Pending';
      case 'cancelled': return 'Cancelled';
      case 'refunded': return 'Refunded';
      default: return 'Unknown';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'pending': return Clock;
      case 'cancelled': return XCircle;
      case 'refunded': return RefreshCw;
      default: return Clock;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading transaction details...</p>
        </div>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-10">
          <div className="bg-white rounded-xl shadow-sm p-8 border border-red-100">
            <div className="flex items-start">
              <div className="p-3 bg-red-50 rounded-lg mr-3">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Unable to load transaction</h2>
                <p className="text-red-700 mt-1">{error || 'Transaction not found'}</p>
                <div className="mt-4 flex gap-3">
                  {error && (
                    <button 
                      onClick={loadTransactionDetail}
                      className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg"
                    >
                      Retry
                    </button>
                  )}
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

  const StatusIcon = getStatusIcon(transaction.status);

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
              <h1 className="text-2xl font-bold text-gray-900">Transaction Details</h1>
            </div>
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center mb-4">
            <StatusIcon className={`w-6 h-6 mr-3 ${getStatusColor(transaction.status)}`} />
            <h2 className={`text-xl font-semibold ${getStatusColor(transaction.status)}`}>
              {getStatusText(transaction.status)}
            </h2>
          </div>
          <p className="text-gray-600 font-mono">{transaction.orderNumber}</p>
        </div>

        {/* Product Information */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Information</h3>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-1/3">
              <div className="w-full h-48 bg-gray-100 rounded-lg">
                <img
                  src={getImageUrl(transaction.productImage || null)}
                  alt={transaction.productTitle}
                  className="w-full h-full object-cover rounded-lg"
                  onError={(e) => {
                    console.error('TransactionDetail - Image failed to load:', {
                      src: e.currentTarget.src,
                      error: e
                    });
                  }}
                  onLoad={(e) => {
                    console.log('TransactionDetail - Image loaded successfully:', {
                      src: e.currentTarget.src
                    });
                  }}
                />
              </div>
            </div>
            <div className="flex-1">
              <h4 className="text-xl font-semibold text-gray-900 mb-2">{transaction.productTitle}</h4>
              <p className="text-gray-600 mb-4">{transaction.productDescription}</p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Unit Price:</span>
                  <span className="font-semibold">{currencySymbol}{transaction.unitPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Quantity:</span>
                  <span className="font-semibold">{transaction.quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-semibold">{currencySymbol}{transaction.subtotal.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Amount Breakdown */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Amount Breakdown</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-semibold">{currencySymbol}{transaction.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tax:</span>
              <span className="font-semibold">{currencySymbol}{transaction.taxAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Shipping:</span>
              <span className="font-semibold">{currencySymbol}{transaction.shippingAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Discount:</span>
              <span className="font-semibold text-red-600">-{currencySymbol}{transaction.discountAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Service Fee:</span>
              <span className="font-semibold text-red-600">-{currencySymbol}{transaction.serviceFeeAmount.toLocaleString()}</span>
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="text-blue-600">{currencySymbol}{transaction.totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Name:</span>
              <span className="font-semibold">{transaction.buyerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Email:</span>
              <span className="font-semibold">{transaction.buyerEmail}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Phone:</span>
              <span className="font-semibold">{transaction.buyerPhone}</span>
            </div>
          </div>
        </div>

        {/* Payment & Shipping Information */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment & Shipping</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Payment:</span>
              <span className="font-semibold">{transaction.paymentMethod || 'N/A'}</span>
            </div>
            {transaction.paymentReference && (
              <div className="flex justify-between">
                <span className="text-gray-600">Reference:</span>
                <span className="font-semibold font-mono">{transaction.paymentReference}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Address:</span>
              <span className="font-semibold text-right max-w-xs">{transaction.shippingAddress}</span>
            </div>
            {transaction.shippingMethod && (
              <div className="flex justify-between">
                <span className="text-gray-600">Method:</span>
                <span className="font-semibold">{transaction.shippingMethod}</span>
              </div>
            )}
            {transaction.trackingNumber && (
              <div className="flex justify-between">
                <span className="text-gray-600">Tracking:</span>
                <span className="font-semibold font-mono">{transaction.trackingNumber}</span>
              </div>
            )}
            {transaction.shippedAt && (
              <div className="flex justify-between">
                <span className="text-gray-600">Shipped:</span>
                <span className="font-semibold">{format(new Date(transaction.shippedAt), 'MMM d, yyyy')}</span>
              </div>
            )}
            {transaction.deliveredAt && (
              <div className="flex justify-between">
                <span className="text-gray-600">Delivered:</span>
                <span className="font-semibold">{format(new Date(transaction.deliveredAt), 'MMM d, yyyy')}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Date:</span>
              <span className="font-semibold">{format(new Date(transaction.transactionDate), 'MMM d, yyyy \'at\' h:mm a')}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {transaction.notes && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
            <p className="text-gray-600">{transaction.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
