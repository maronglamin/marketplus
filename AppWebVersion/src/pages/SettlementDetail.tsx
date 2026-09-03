import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Clock, XCircle, AlertCircle, CreditCard, Wallet, Calendar, MapPin, Truck } from 'lucide-react';
import { settlementService, type SettlementRequest, type IncludedOrder, type IncludedPropertyBooking } from '../api/settlementService';

export function SettlementDetail() {
  const { settlementId } = useParams<{ settlementId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [settlement, setSettlement] = useState<SettlementRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [includedOrders, setIncludedOrders] = useState<IncludedOrder[]>([]);
  const [includedPropertyBookings, setIncludedPropertyBookings] = useState<IncludedPropertyBooking[]>([]);
  const [includedServiceBookings, setIncludedServiceBookings] = useState<IncludedPropertyBooking[]>([]);

  const currency = searchParams.get('currency') || 'USD';
  const currencySymbol = searchParams.get('symbol') || '$';

  useEffect(() => {
    if (settlementId) {
      loadSettlementDetail();
    }
  }, [settlementId]);

  const loadSettlementDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await settlementService.getSettlementDetails(settlementId!);
      setSettlement(response.settlement);
      setIncludedOrders(response.includedOrders || []);
      setIncludedPropertyBookings(response.includedPropertyBookings || []);
      setIncludedServiceBookings(response.includedServiceBookings || []);
    } catch (error: any) {
      console.error('Error loading settlement detail:', error);
      setError(error.message || 'Failed to load settlement details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'text-green-600';
      case 'PROCESSING':
        return 'text-blue-600';
      case 'PENDING':
        return 'text-yellow-600';
      case 'FAILED':
        return 'text-red-600';
      case 'CANCELLED':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settlement details...</p>
        </div>
      </div>
    );
  }

  if (error || !settlement) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-10">
          <div className="bg-white rounded-xl shadow-sm p-8 border border-red-100">
            <div className="flex items-start">
              <div className="p-3 bg-red-50 rounded-lg mr-3">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Unable to load settlement</h2>
                <p className="text-red-700 mt-1">{error || 'Settlement not found'}</p>
                <div className="mt-4 flex gap-3">
                  <button 
                    onClick={loadSettlementDetail}
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

  const StatusIcon = getStatusIcon(settlement.status);
  const TypeIcon = getTypeIcon(settlement.type);

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
              <h1 className="text-2xl font-bold text-gray-900">Settlement Details</h1>
            </div>
          </div>
        </div>

        {/* Amount and Status Section */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-6 text-center">
          <div className="mb-6">
            <h2 className="text-4xl font-bold text-gray-900 mb-2">
              {formatAmount(settlement.amount, settlement.currency)}
            </h2>
            <p className="text-lg text-gray-600">{settlement.currency}</p>
          </div>
          <div className="flex items-center justify-center">
            <StatusIcon className={`w-8 h-8 mr-3 ${getStatusColor(settlement.status)}`} />
            <h3 className={`text-xl font-semibold ${getStatusColor(settlement.status)}`}>
              {getStatusText(settlement.status)}
            </h3>
          </div>
        </div>

        {/* Settlement Type Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Settlement Type</h3>
          <div className="flex items-center">
            <TypeIcon className={`w-6 h-6 mr-3 ${getTypeColor(settlement.type)}`} />
            <span className={`text-lg font-semibold ${getTypeColor(settlement.type)}`}>
              {settlement.type.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Reference Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Reference Number</h3>
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <p className="text-xl font-mono text-gray-900">{settlement.reference}</p>
          </div>
        </div>

        {/* Timeline Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gray-300 rounded-full mr-4"></div>
              <div>
                <p className="font-medium text-gray-900">Created</p>
                <p className="text-sm text-gray-500">{formatDate(settlement.createdAt)}</p>
              </div>
            </div>
            {settlement.processedAt && (
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-4"></div>
                <div>
                  <p className="font-medium text-gray-900">Processed</p>
                  <p className="text-sm text-gray-500">{formatDate(settlement.processedAt)}</p>
                </div>
              </div>
            )}
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-4"></div>
              <div>
                <p className="font-medium text-gray-900">Last Updated</p>
                <p className="text-sm text-gray-500">{formatDate(settlement.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Metadata Section */}
        {settlement.metadata && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Settlement Details</h3>
            <div className="space-y-3">
              {settlement.metadata.requestedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Requested At:</span>
                  <span className="font-semibold">{formatDate(settlement.metadata.requestedAt)}</span>
                </div>
              )}
              {settlement.metadata.requestSource && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Request Source:</span>
                  <span className="font-semibold">{settlement.metadata.requestSource.replace('_', ' ')}</span>
                </div>
              )}
              {settlement.metadata.calculationDetails && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gross Amount:</span>
                    <span className="font-semibold">
                      {formatAmount(settlement.metadata.calculationDetails.grossAmount || 0, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service Fees:</span>
                    <span className="font-semibold">
                      {formatAmount(settlement.metadata.calculationDetails.serviceFees || 0, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Net Amount:</span>
                    <span className="font-semibold">
                      {formatAmount(settlement.metadata.calculationDetails.netAmount || 0, currency)}
                    </span>
                  </div>
                  {settlement.metadata.calculationDetails.ordersIncluded && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Orders Included:</span>
                      <span className="font-semibold">
                        {settlement.metadata.calculationDetails.ordersIncluded.length} orders
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Included Orders Section */}
        {includedOrders.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Included Orders</h3>
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {includedOrders.length} orders
              </span>
            </div>
            <div className="space-y-3">
              {includedOrders.map((order, index) => (
                <div key={order.id} className={`p-4 rounded-lg ${index % 2 === 1 ? 'bg-gray-50' : 'bg-white'} border border-gray-200`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-sm text-gray-500 bg-gray-200 px-2 py-1 rounded mr-3">
                        #{index + 1}
                      </span>
                      <div>
                        <p className="font-mono text-gray-900">{order.orderNumber}</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        {formatAmount(order.totalAmount, order.currencyCode)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {includedPropertyBookings.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Included Property Bookings / Sales</h3>
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {includedPropertyBookings.length}
              </span>
            </div>
            <div className="space-y-3">
              {includedPropertyBookings.map((item, index) => (
                <div key={item.id} className={`p-4 rounded-lg ${index % 2 === 1 ? 'bg-gray-50' : 'bg-white'} border border-gray-200`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono text-gray-900">{item.bookingRef}</p>
                      {item.title ? <p className="text-sm text-gray-600">{item.title}</p> : null}
                      <p className="text-sm text-gray-500">{formatDate(item.createdAt)}</p>
                    </div>
                    <p className="font-semibold text-green-600">{formatAmount(item.totalPrice, item.currency)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {includedServiceBookings.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Included Service Bookings</h3>
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {includedServiceBookings.length}
              </span>
            </div>
            <div className="space-y-3">
              {includedServiceBookings.map((item, index) => (
                <div key={item.id} className={`p-4 rounded-lg ${index % 2 === 1 ? 'bg-gray-50' : 'bg-white'} border border-gray-200`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono text-gray-900">{item.bookingRef}</p>
                      {item.title ? <p className="text-sm text-gray-600">{item.title}</p> : null}
                      <p className="text-sm text-gray-500">{formatDate(item.createdAt)}</p>
                    </div>
                    <p className="font-semibold text-green-600">{formatAmount(item.totalPrice, item.currency)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment Method Details Section */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {settlement.type === 'BANK_TRANSFER' ? 'Bank Account Details' : 'Wallet Details'}
          </h3>
          <div className="space-y-3">
            {settlement.type === 'BANK_TRANSFER' && settlement.bankAccount && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Account Name:</span>
                  <span className="font-semibold">{settlement.bankAccount.accountName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Account Number:</span>
                  <span className="font-semibold">****{settlement.bankAccount.accountNumber.slice(-4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Bank Name:</span>
                  <span className="font-semibold">{settlement.bankAccount.bankName}</span>
                </div>
                {settlement.bankAccount.bankCode && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bank Code:</span>
                    <span className="font-semibold">{settlement.bankAccount.bankCode}</span>
                  </div>
                )}
                {settlement.bankAccount.branchCode && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Branch Code:</span>
                    <span className="font-semibold">{settlement.bankAccount.branchCode}</span>
                  </div>
                )}
                {settlement.bankAccount.swiftCode && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">SWIFT Code:</span>
                    <span className="font-semibold">{settlement.bankAccount.swiftCode}</span>
                  </div>
                )}
                {settlement.bankAccount.iban && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">IBAN:</span>
                    <span className="font-semibold">{settlement.bankAccount.iban}</span>
                  </div>
                )}
              </>
            )}
            {settlement.type === 'WALLET_TRANSFER' && settlement.wallet && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Wallet Type:</span>
                  <span className="font-semibold">{settlement.wallet.walletType.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Account Number:</span>
                  <span className="font-semibold">{settlement.wallet.account}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Wallet Address:</span>
                  <span className="font-semibold font-mono text-sm">{settlement.wallet.walletAddress}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Currency:</span>
                  <span className="font-semibold">{settlement.wallet.currency}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
