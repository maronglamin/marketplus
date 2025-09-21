import React, { useState, useEffect } from 'react';
import { X, CreditCard, Smartphone, Wallet, Plus, Check } from 'lucide-react';
import { paymentMethodService, PaymentMethod } from '../api/paymentMethods';
import { AddPaymentMethodModal } from './AddPaymentMethodModal';

interface PaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPaymentMethod: (method: PaymentMethod) => void;
  orderTotal: number;
  currencyCode: string;
  userPhoneNumber?: string;
  gatewayType?: 'stripe' | 'yonna_forex';
}

export function PaymentMethodModal({ 
  isOpen, 
  onClose, 
  onSelectPaymentMethod, 
  orderTotal, 
  currencyCode,
  userPhoneNumber,
  gatewayType
}: PaymentMethodModalProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddPaymentMethodModal, setShowAddPaymentMethodModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPaymentMethods();
    }
  }, [isOpen]);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('PaymentMethodModal: Loading payment methods...');
      const response = await paymentMethodService.getPaymentMethods();
      console.log('PaymentMethodModal: Payment methods response:', response);
      
      // Filter payment methods based on gateway type
      let filteredMethods = response.paymentMethods;
      console.log('PaymentMethodModal: All payment methods:', filteredMethods);
      console.log('PaymentMethodModal: Gateway type:', gatewayType);
      
      if (gatewayType === 'stripe') {
        filteredMethods = response.paymentMethods.filter(method => 
          method.type === 'CREDIT_CARD' || method.type === 'DEBIT_CARD'
        );
        console.log('PaymentMethodModal: Filtered for Stripe:', filteredMethods);
      } else if (gatewayType === 'yonna_forex') {
        filteredMethods = response.paymentMethods.filter(method => 
          method.type === 'MOBILE_MONEY'
        );
        console.log('PaymentMethodModal: Filtered for Yonna Forex:', filteredMethods);
      }
      
      setPaymentMethods(filteredMethods);
      
      // Auto-select default payment method
      const defaultMethod = filteredMethods.find(method => method.isDefault);
      if (defaultMethod) {
        setSelectedMethod(defaultMethod.id);
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
      setError('Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMethod = (method: PaymentMethod) => {
    setSelectedMethod(method.id);
  };

  const handleProceedToPayment = () => {
    const method = paymentMethods.find(m => m.id === selectedMethod);
    if (method) {
      onSelectPaymentMethod(method);
    }
  };

  const handlePaymentMethodAdded = () => {
    setShowAddPaymentMethodModal(false);
    // Refresh payment methods
    loadPaymentMethods();
  };

  const getPaymentMethodIcon = (type: string) => {
    switch (type) {
      case 'CREDIT_CARD':
      case 'DEBIT_CARD':
        return <CreditCard className="w-6 h-6" />;
      case 'MOBILE_MONEY':
        return <Smartphone className="w-6 h-6" />;
      default:
        return <Wallet className="w-6 h-6" />;
    }
  };

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose}></div>
        <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Select Payment Method</h3>
              <p className="text-sm text-gray-500 mt-1">Choose how you'd like to pay for this order</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {/* Order Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Total Amount</span>
                <span className="text-lg font-semibold text-gray-900">
                  {formatPrice(orderTotal, currencyCode)}
                </span>
              </div>
            </div>

            {/* Payment Methods */}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading payment methods...</span>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="text-red-600 mb-2">{error}</div>
                <button
                  onClick={loadPaymentMethods}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Try Again
                </button>
              </div>
            ) : paymentMethods.length === 0 ? (
              <div className="text-center py-8">
                <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">No Payment Methods</h4>
                <p className="text-gray-600 mb-4">You need to add a payment method before you can complete your order.</p>
                <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Payment Method
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    onClick={() => handleSelectMethod(method)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedMethod === method.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${
                          selectedMethod === method.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {getPaymentMethodIcon(method.type)}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-gray-900">{method.provider}</h4>
                            {method.isDefault && (
                              <span className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-full">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{method.accountName} • {method.accountId}</p>
                        </div>
                      </div>
                      {selectedMethod === method.id && (
                        <div className="flex-shrink-0">
                          <Check className="w-5 h-5 text-blue-600" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {paymentMethods.length > 0 && (
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <div className="flex space-x-3">
                <button 
                  onClick={() => setShowAddPaymentMethodModal(true)}
                  className="inline-flex items-center px-4 py-2 text-blue-600 bg-white border border-blue-300 rounded-lg hover:bg-blue-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add More
                </button>
                <button
                  onClick={handleProceedToPayment}
                  disabled={!selectedMethod}
                  className={`px-6 py-2 rounded-lg font-medium ${
                    selectedMethod
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Process Payment
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Payment Method Modal */}
      <AddPaymentMethodModal
        isOpen={showAddPaymentMethodModal}
        onClose={() => setShowAddPaymentMethodModal(false)}
        onPaymentMethodAdded={handlePaymentMethodAdded}
        userPhoneNumber={userPhoneNumber}
        existingPaymentMethods={paymentMethods.map(method => ({
          provider: method.provider,
          type: method.type
        }))}
      />
    </div>
  );
}
