import React, { useEffect, useState, useCallback } from 'react';
import { PaymentElement, useStripe, useElements, Elements } from '@stripe/react-stripe-js';
import { X, CreditCard, AlertCircle, CheckCircle, Lock } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { stripePaymentService } from '../api/stripePaymentService';
import { getApi } from '../api/config';

interface BulkStripePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (data: any) => void;
  amount: number;
  currency: string;
  orderIds: string[];
  description?: string;
}

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_51H1234567890abcdef');

function BulkPaymentForm({
  onClose,
  onPaymentSuccess,
  amount,
  currency,
  orderIds,
  clientSecret,
  description
}: {
  onClose: () => void;
  onPaymentSuccess: (data: any) => void;
  amount: number;
  currency: string;
  orderIds: string[];
  clientSecret: string;
  description?: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret) {
      setError('Payment system not ready. Please try again.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment/return`,
        },
        redirect: 'if_required',
      });
      if (error) throw new Error(error.message || 'Payment confirmation failed');
      if (!paymentIntent) throw new Error('Payment confirmation failed.');
      // Call bulk success endpoint (align with mobile: only send ids)
      const api = getApi();
      await api.post('/payments/bulk-payment-success', {
        paymentIntentId: paymentIntent.id,
        orderIds
      });
      onPaymentSuccess({ paymentIntentId: paymentIntent.id, amount, currency, orderIds });
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Payment failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-600 mb-4">
        You are paying <span className="font-medium">{Number(amount || 0).toFixed(2)} {currency.toUpperCase()}</span> for {orderIds.length} order(s).
      </p>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      <div className="border border-gray-300 rounded-md p-3 bg-white min-h-[50px]">
        {stripe && elements ? (
          <PaymentElement />
        ) : (
          <div className="text-center py-4">
            <div className="text-gray-500 text-sm mb-2">
              {!stripe ? 'Loading Stripe...' : 'Loading payment form...'}
            </div>
            <div className="text-xs text-gray-400">
              {process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test_')
                ? 'Using test publishable key'
                : 'Initializing payment...'}
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center text-sm text-gray-500">
        <Lock className="w-4 h-4 mr-2" />
        Your payment is securely processed by Stripe. Card details are not stored on our servers.
      </div>
      <div className="flex justify-end space-x-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className={`px-4 py-2 rounded-lg text-white transition-colors flex items-center space-x-2 ${
            isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Processing...</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>Pay Now</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export function BulkStripePaymentModal({
  isOpen,
  onClose,
  onPaymentSuccess,
  amount,
  currency,
  orderIds,
  description
}: BulkStripePaymentModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPaymentIntent = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { paymentIntent } = await stripePaymentService.createPaymentIntent({
        amount: Number(amount || 0),
        currency: currency.toLowerCase(),
        description: description || `Bulk payment for ${orderIds.length} orders`,
      });
      setClientSecret(paymentIntent.client_secret);
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize payment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [amount, currency, description, orderIds.length]);

  useEffect(() => {
    if (isOpen && !clientSecret) {
      createPaymentIntent();
    }
  }, [isOpen, clientSecret, createPaymentIntent]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <CreditCard className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Pay with Card (Bulk)</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" disabled={isLoading}>
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          {isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Initializing payment...</p>
            </div>
          )}
          {clientSecret && !isLoading && (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <BulkPaymentForm
                onClose={onClose}
                onPaymentSuccess={onPaymentSuccess}
                amount={amount}
                currency={currency}
                orderIds={orderIds}
                clientSecret={clientSecret}
                description={description}
              />
            </Elements>
          )}
          {!clientSecret && !isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Preparing payment...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BulkStripePaymentModal;


