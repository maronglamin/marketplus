import React, { useState } from 'react';
import { X, CreditCard, Smartphone, CheckCircle } from 'lucide-react';
import { paymentService, PaymentGateway } from '../api/paymentService';

interface PaymentGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGatewaySelected: (gateway: PaymentGateway) => void;
  amount: number;
  currency: string;
}

export function PaymentGatewayModal({
  isOpen,
  onClose,
  onGatewaySelected,
  amount,
  currency
}: PaymentGatewayModalProps) {
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>(null);

  const availableGateways = paymentService.getSupportedGateways(currency);
  const isGMDCurrency = currency?.toLowerCase() === 'gmd';

  const handleGatewaySelect = (gateway: PaymentGateway) => {
    setSelectedGateway(gateway);
  };

  const handleConfirm = () => {
    if (selectedGateway) {
      onGatewaySelected(selectedGateway);
      onClose();
    }
  };

  const getGatewayIcon = (gateway: PaymentGateway) => {
    if (gateway.type === 'stripe') {
      return <CreditCard className="w-8 h-8 text-blue-600" />;
    } else if (gateway.type === 'yonna_forex') {
      return <Smartphone className="w-8 h-8 text-green-600" />;
    }
    return <CreditCard className="w-8 h-8 text-gray-600" />;
  };

  const getGatewayDescription = (gateway: PaymentGateway) => {
    if (gateway.type === 'stripe') {
      return 'Secure payment processing with credit/debit cards';
    } else if (gateway.type === 'yonna_forex') {
      return 'Mobile money and local payment methods';
    }
    return 'Payment processing';
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose}></div>
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Select Payment Method</h3>
              <p className="text-sm text-gray-500">
                Choose how you'd like to pay {formatAmount(amount, currency)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Payment Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Total Amount</span>
                <span className="text-lg font-semibold text-gray-900">
                  {formatAmount(amount, currency)}
                </span>
              </div>
            </div>

            {/* Available Gateways */}
            <div className="space-y-3 mb-6">
              {availableGateways.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No payment methods available for {currency.toUpperCase()}</p>
                </div>
              ) : (
                availableGateways.map((gateway) => {
                  const isYonnaForex = gateway.type === 'yonna_forex';
                  const isDisabled = isYonnaForex && !isGMDCurrency;
                  
                  return (
                    <button
                      key={gateway.id}
                      onClick={() => !isDisabled && handleGatewaySelect(gateway)}
                      disabled={isDisabled}
                      className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                        isDisabled
                          ? 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-60'
                          : selectedGateway?.id === gateway.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                    <div className="flex items-center space-x-3">
                      {getGatewayIcon(gateway)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900">{gateway.name}</h4>
                          <div className="flex items-center space-x-2">
                            {isDisabled && (
                              <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                                GMD only
                              </span>
                            )}
                            {selectedGateway?.id === gateway.id && (
                              <CheckCircle className="w-5 h-5 text-blue-600" />
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {isDisabled 
                            ? 'Only available for GMD currency'
                            : getGatewayDescription(gateway)
                          }
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {gateway.supportedCurrencies.slice(0, 3).map((curr) => (
                            <span
                              key={curr}
                              className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                            >
                              {curr.toUpperCase()}
                            </span>
                          ))}
                          {gateway.supportedCurrencies.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{gateway.supportedCurrencies.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                  );
                })
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              
              <button
                onClick={handleConfirm}
                disabled={!selectedGateway}
                className={`flex-1 px-4 py-2 rounded-lg ${
                  selectedGateway
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
