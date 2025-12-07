import React, { useState, useEffect } from 'react';
import { X, CreditCard, Smartphone, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { paymentService, PaymentRequest } from '../api/paymentService';
import YonnaQRPaymentModal from './YonnaQRPaymentModal';
import WaveQRPaymentModal from './WaveQRPaymentModal';
import { waveGambiaPaymentService } from '../api/waveGambiaPayment';
import { getApi } from '../api/config';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (paymentData: any) => void;
  orderId: string;
  amount: number;
  currency: string;
  description?: string;
  customerId?: string;
  paymentMethod: {
    id: string;
    type: string;
    provider: string;
  };
  gateway?: {
    id: string;
    name: string;
    type: string;
  };
}

type PaymentStatus = 'idle' | 'processing' | 'success' | 'error';

export function PaymentModal({
  isOpen,
  onClose,
  onPaymentSuccess,
  orderId,
  amount,
  currency,
  description,
  customerId,
  paymentMethod,
  gateway
}: PaymentModalProps) {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [showYonnaQR, setShowYonnaQR] = useState(false);
  const [showWaveQR, setShowWaveQR] = useState(false);
  const [waveSessionId, setWaveSessionId] = useState<string | null>(null);
  const [wavePaymentUrl, setWavePaymentUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPaymentStatus('idle');
      setError(null);
      setPaymentData(null);
    }
  }, [isOpen]);

  const handlePayment = async () => {
    try {
      setPaymentStatus('processing');
      setError(null);

      // Wave: short-circuit to Wave checkout + QR flow when selected under Mobile Wallet
      if (paymentMethod.type === 'MOBILE_MONEY' && (paymentMethod.provider || '').toLowerCase().includes('wave')) {
        try {
          const res = await waveGambiaPaymentService.processPayment({
            amount,
            currency,
            description: description || `Payment for Order ${orderId}`,
            orderId
          });
          if (res.success && res.data?.waveLaunchUrl && res.data.sessionId) {
            setWaveSessionId(res.data.sessionId);
            setWavePaymentUrl(res.data.waveLaunchUrl);
            setShowWaveQR(true);
            return;
          }
          throw new Error(res.message || (res as any)?.error || 'Failed to create Wave checkout session');
        } catch (e: any) {
          setError(e?.message || 'Failed to start Wave payment.');
          setPaymentStatus('error');
          return;
        }
      }

      const paymentRequest: PaymentRequest = {
        amount,
        currency,
        description: description || `Payment for Order ${orderId}`,
        orderId,
        customerId,
        paymentMethod
      };

      const response = await paymentService.processPayment(paymentRequest);
      
      if (response.success && response.data) {
        setPaymentData(response.data);

        const isYonna = (gateway?.type === 'yonna_forex' || paymentMethod.type === 'MOBILE_MONEY');
        if (isYonna && response.data.transactionId) {
          // Keep page as-is, open QR modal and continue polling there
          setPaymentStatus('processing');
          setShowYonnaQR(true);
        } else {
          setPaymentStatus('success');
          setTimeout(() => {
            onPaymentSuccess({
              ...response.data,
              amount,
              currency,
              paymentMethod: paymentMethod.provider
            });
          }, 2000);
        }
      } else {
        throw new Error(response.error || 'Payment failed');
      }

    } catch (error: any) {
      console.error('Payment error:', error);
      setError(error.message || 'Payment failed. Please try again.');
      setPaymentStatus('error');
    }
  };

  const getPaymentMethodIcon = () => {
    if (paymentMethod.type === 'CREDIT_CARD' || paymentMethod.type === 'DEBIT_CARD') {
      return <CreditCard className="w-8 h-8" />;
    } else {
      return <Smartphone className="w-8 h-8" />;
    }
  };

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'processing':
        return <Loader2 className="w-6 h-6 animate-spin text-blue-600" />;
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-6 h-6 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusMessage = () => {
    switch (paymentStatus) {
      case 'processing':
        return 'Processing your payment...';
      case 'success':
        return 'Payment successful!';
      case 'error':
        return 'Payment failed';
      default:
        return 'Ready to process payment';
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  if (!isOpen) return null;

  return (
    <>
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose}></div>
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              {getPaymentMethodIcon()}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Process Payment</h3>
                <p className="text-sm text-gray-500">
                  {paymentMethod.provider} via {gateway?.name || 'Payment Gateway'}
                </p>
              </div>
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
            {/* Order Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Order #{orderId}</span>
                <span className="text-lg font-semibold text-gray-900">
                  {formatAmount(amount, currency)}
                </span>
              </div>
              {description && (
                <p className="text-sm text-gray-600 mt-2">{description}</p>
              )}
            </div>

            {/* Payment Status */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center space-x-2 mb-2">
                {getStatusIcon()}
                <span className={`text-lg font-medium ${
                  paymentStatus === 'success' ? 'text-green-600' :
                  paymentStatus === 'error' ? 'text-red-600' :
                  paymentStatus === 'processing' ? 'text-blue-600' :
                  'text-gray-900'
                }`}>
                  {getStatusMessage()}
                </span>
              </div>
              
              {paymentStatus === 'processing' && (
                <p className="text-sm text-gray-600">
                  Please wait while we process your payment...
                </p>
              )}
              
              {paymentStatus === 'success' && (
                <p className="text-sm text-green-600">
                  Your payment has been processed successfully!
                </p>
              )}
              
              {paymentStatus === 'error' && error && (
                <p className="text-sm text-red-600">
                  {error}
                </p>
              )}
            </div>

            {/* Payment Details */}
            {paymentData && (
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Payment Details</h4>
                <div className="text-sm text-blue-800">
                  {paymentData.paymentIntentId && (
                    <p>Payment Intent ID: {paymentData.paymentIntentId}</p>
                  )}
                  {paymentData.transactionId && (
                    <p>Transaction ID: {paymentData.transactionId}</p>
                  )}
                {paymentData.appTransactionId && (
                  <p>App Transaction ID: {paymentData.appTransactionId}</p>
                )}
                  <p>Status: {paymentData.status}</p>
                  <p>Message: {paymentData.message}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {paymentStatus === 'success' ? 'Close' : 'Cancel'}
              </button>
              
              {paymentStatus === 'idle' && (
                <button
                  onClick={handlePayment}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Process Payment
                </button>
              )}
              
              {paymentStatus === 'error' && (
                <button
                  onClick={() => {
                    setPaymentStatus('idle');
                    setError(null);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Try Again
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    {paymentData && showYonnaQR && (
      <YonnaQRPaymentModal
        isOpen={showYonnaQR}
        onClose={() => setShowYonnaQR(false)}
        orderId={orderId}
        transactionId={paymentData.transactionId}
        appTransactionId={paymentData.appTransactionId}
        amount={amount}
        currency={currency}
        paymentUrl={paymentData.paymentUrl}
        qrCodeUrl={paymentData.qrCodeUrl}
        qrCodeBase64={paymentData.qrCodeBase64}
        paymentHtml={paymentData.paymentHtml}
        onCompleted={() => {
          setShowYonnaQR(false);
          onPaymentSuccess({
            ...paymentData,
            amount,
            currency,
            paymentMethod: paymentMethod.provider
          });
        }}
        onFailed={(msg) => {
          // keep modal open; optionally surface error
          console.warn('Yonna payment failed:', msg);
        }}
      />
    )}
    {showWaveQR && waveSessionId && (
      <WaveQRPaymentModal
        isOpen={showWaveQR}
        onClose={() => setShowWaveQR(false)}
        orderId={orderId}
        sessionId={waveSessionId}
        paymentUrl={wavePaymentUrl || ''}
        amount={amount}
        currency={currency}
        onCompleted={async ({ sessionId, transactionId }) => {
          try {
            await getApi().post('/payments/external-success', {
              provider: 'wave_gambia',
              transactionReference: transactionId || sessionId,
              orderId,
              currencyCode: currency,
            });
          } catch (e) {
            // ignore and continue
          } finally {
            setShowWaveQR(false);
            onPaymentSuccess({
              transactionId: transactionId || sessionId,
              amount,
              currency,
              paymentMethod: paymentMethod.provider
            });
          }
        }}
        onFailed={() => {}}
      />
    )}
    </>
  );
}
