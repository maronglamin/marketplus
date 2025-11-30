import React, { useState, useEffect } from 'react';
import { X, CreditCard, Smartphone, Save } from 'lucide-react';
import { paymentMethodService, CreatePaymentMethodRequest } from '../api/paymentMethods';
import { paymentGatewayServiceProviderService, PaymentGatewayServiceProvider } from '../api/paymentGatewayServiceProviders';

interface AddPaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentMethodAdded: () => void;
  userPhoneNumber?: string;
  existingPaymentMethods?: Array<{ provider: string; type: string }>;
}

const paymentMethodTypes = [
  {
    id: 'CARD',
    name: 'Card',
    description: 'Credit and debit cards',
    icon: CreditCard,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  {
    id: 'MOBILE_WALLET',
    name: 'Mobile Wallet',
    description: 'Mobile money and digital wallets',
    icon: Smartphone,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  }
];

export function AddPaymentMethodModal({ isOpen, onClose, onPaymentMethodAdded, userPhoneNumber, existingPaymentMethods = [] }: AddPaymentMethodModalProps) {
  const [selectedType, setSelectedType] = useState<string>('');
  const [formData, setFormData] = useState<CreatePaymentMethodRequest>({
    type: '',
    provider: '',
    accountName: '',
    accountId: '',
    isDefault: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileWalletProviders, setMobileWalletProviders] = useState<PaymentGatewayServiceProvider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('');

  const fetchMobileWalletProviders = async () => {
    try {
      setLoadingProviders(true);
      // Fetch all active providers regardless of type
      const response = await paymentGatewayServiceProviderService.getProviders();
      setMobileWalletProviders(response.providers);
    } catch (error) {
      console.error('Error fetching mobile wallet providers:', error);
    } finally {
      setLoadingProviders(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setFormData({
        type: '',
        provider: '',
        accountName: '',
        accountId: '',
        isDefault: false
      });
      setSelectedType('');
      setSelectedProvider('');
      setError(null);
      fetchMobileWalletProviders();
    }
  }, [isOpen]);

  const handleTypeSelect = (type: string) => {
    setSelectedType(type);
    setFormData(prev => ({ ...prev, type }));
    if (type === 'MOBILE_WALLET') {
      setSelectedProvider('');
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleProviderSelect = (providerId: string) => {
    setSelectedProvider(providerId);
    const provider = mobileWalletProviders.find(p => p.id === providerId);
    if (provider) {
      setFormData(prev => ({ ...prev, provider: provider.name }));
    }
  };

  const isProviderAlreadyUsed = (providerName: string) => {
    return existingPaymentMethods.some(method => 
      method.provider === providerName && method.type === 'MOBILE_MONEY'
    );
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validation
      if (!formData.type || !formData.provider) {
        setError('Please fill in all required fields');
        return;
      }

      if (formData.type === 'CARD' && (!formData.accountName || !formData.accountId)) {
        setError('Please enter the cardholder name and card number');
        return;
      }

      if (formData.type === 'MOBILE_WALLET' && (!userPhoneNumber || !formData.provider)) {
        setError('Phone number and provider are required for mobile wallet');
        return;
      }

      // Prepare submission data
      const submitData = {
        type: formData.type === 'CARD' ? 'CREDIT_CARD' : 'MOBILE_MONEY',
        provider: formData.provider,
        accountName: formData.type === 'CARD' ? formData.accountName : 'Mobile Wallet',
        accountId: formData.type === 'CARD' ? formData.accountId : (userPhoneNumber || ''),
        isDefault: formData.isDefault || false
      };

      await paymentMethodService.createPaymentMethod(submitData);
      onPaymentMethodAdded();
      onClose();
      
      // Reset form
      setFormData({
        type: '',
        provider: '',
        accountName: '',
        accountId: '',
        isDefault: false
      });
      setSelectedType('');
      setSelectedProvider('');
    } catch (error: any) {
      console.error('Error creating payment method:', error);
      
      // Handle specific error cases
      if (error.response?.status === 409) {
        setError('This payment method already exists. Please choose a different provider or check your existing payment methods.');
      } else if (error.response?.status === 400) {
        setError(error.response.data?.message || 'Invalid payment method data. Please check your inputs.');
      } else {
        setError('Failed to create payment method. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderFormFields = () => {
    if (!selectedType) return null;

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Provider *
          </label>
          <input
            type="text"
            value={formData.provider}
            onChange={(e) => handleInputChange('provider', e.target.value)}
            placeholder={selectedType === 'CARD' ? 'e.g., Visa, Mastercard, American Express' : 'e.g., Wave Gambia, Yonna Wallet'}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {selectedType === 'CARD' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cardholder Name *
              </label>
              <input
                type="text"
                value={formData.accountName}
                onChange={(e) => handleInputChange('accountName', e.target.value)}
                placeholder="e.g., John Doe"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Card Number (Last 4 digits) *
              </label>
              <input
                type="text"
                value={formData.accountId}
                onChange={(e) => handleInputChange('accountId', e.target.value)}
                placeholder="e.g., 1234"
                maxLength={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </>
        )}

        {selectedType === 'MOBILE_WALLET' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Mobile Wallet Provider *
              </label>
              {loadingProviders ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Loading providers...</span>
                </div>
              ) : mobileWalletProviders.length > 0 ? (
              <div className="overflow-x-auto">
                <div className="flex gap-3 pb-2">
                  {mobileWalletProviders.map((provider) => {
                    const isUsed = isProviderAlreadyUsed(provider.name);
                    const providerNameLower = (provider.name || '').toLowerCase();
                    const publicUrl = process.env.PUBLIC_URL || '';
                    const iconSrc = providerNameLower.includes('wave')
                      ? `${publicUrl}/assets/wave.jpg`
                      : (providerNameLower.includes('yonna') || providerNameLower.includes('aps'))
                        ? `${publicUrl}/assets/yonna_wallet.svg`
                        : (provider.logoUrl || '');
                    return (
                      <button
                        key={provider.id}
                        type="button"
                        onClick={() => !isUsed && handleProviderSelect(provider.id)}
                        disabled={isUsed}
                        className={`min-w-[220px] p-3 border-2 rounded-lg text-left transition-all ${
                          isUsed
                            ? 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-60'
                            : selectedProvider === provider.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          {iconSrc ? (
                            <img src={iconSrc} alt={provider.name} className="w-7 h-7 object-contain rounded" />
                          ) : provider.logoUrl ? (
                            <img src={provider.logoUrl} alt={provider.name} className="w-7 h-7 object-contain rounded" />
                          ) : (<Smartphone className="w-6 h-6 text-gray-600" />)}
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-sm text-gray-900">{provider.name}</p>
                              {isUsed && (
                                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                                  Already added
                                </span>
                              )}
                            </div>
                            {provider.description && (
                              <p className="text-xs text-gray-500">{provider.description}</p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500 text-sm">No mobile wallet providers available</p>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={userPhoneNumber || ''}
                disabled
                placeholder="Using your registered phone number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">
                This will use your registered phone number from your account
              </p>
            </div>
          </>
        )}

        <div className="flex items-center">
          <input
            type="checkbox"
            id="isDefault"
            checked={formData.isDefault}
            onChange={(e) => handleInputChange('isDefault', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="isDefault" className="ml-2 block text-sm text-gray-700">
            Set as default payment method
          </label>
        </div>
      </div>
    );
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
              <h3 className="text-xl font-semibold text-gray-900">Add Payment Method</h3>
              <p className="text-sm text-gray-500 mt-1">Add a new payment method to your account</p>
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
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Payment Type Selection */}
            {!selectedType ? (
              <div className="space-y-3">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Select Payment Type</h4>
                {paymentMethodTypes.map((type) => {
                  const IconComponent = type.icon;
                  return (
                    <div
                      key={type.id}
                      onClick={() => handleTypeSelect(type.id)}
                      className="p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${type.bgColor} ${type.color}`}>
                          <IconComponent className="w-6 h-6" />
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-900">{type.name}</h5>
                          <p className="text-sm text-gray-600">{type.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-lg font-medium text-gray-900">Payment Details</h4>
                  <button
                    onClick={() => setSelectedType('')}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Change Type
                  </button>
                </div>
                {renderFormFields()}
              </div>
            )}
          </div>

          {/* Footer */}
          {selectedType && (
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Create Payment Method
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
