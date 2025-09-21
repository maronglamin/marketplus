import React, { useState, useEffect, useCallback } from 'react';
import { PaymentElement, useStripe, useElements, Elements } from '@stripe/react-stripe-js';
import { X, CreditCard, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { stripePaymentService } from '../api/stripePaymentService';
import { loadStripe } from '@stripe/stripe-js';

interface StripePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (paymentData: any) => void;
  orderId: string;
  amount: number;
  currency: string;
  description?: string;
  customerId?: string;
  cardholderName?: string;
}

// Initialize Stripe with publishable key
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_51H1234567890abcdef');

// Debug Stripe loading (remove in production)
// stripePromise.then(stripe => {
//   console.log('Stripe loaded:', !!stripe);
// }).catch(error => {
//   console.error('Stripe loading error:', error);
// });

// Payment form component that uses Stripe hooks (just the form, not the modal)
interface PaymentFormProps {
  onClose: () => void;
  onPaymentSuccess: (paymentData: any) => void;
  orderId: string;
  amount: number;
  currency: string;
  description?: string;
  customerId?: string;
  cardholderName?: string;
  clientSecret: string;
}

function PaymentForm({
  onClose,
  onPaymentSuccess,
  orderId,
  amount,
  currency,
  description,
  customerId,
  cardholderName,
  clientSecret
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debug Stripe loading (remove in production)
  // console.log('PaymentForm Stripe state:', { 
  //   stripe: !!stripe, 
  //   elements: !!elements, 
  //   clientSecret: clientSecret?.substring(0, 20) + '...' 
  // });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      setError('Payment system not ready. Please try again.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      console.log('Confirming payment...');
      
      // Confirm payment using Stripe.js (handles 3D Secure automatically)
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment/return`,
        },
        redirect: 'if_required', // Only redirect if 3D Secure is required
      });

      if (error) {
        throw new Error(error.message || 'Payment confirmation failed');
      }

      if (!paymentIntent) {
        throw new Error('Payment confirmation failed without error object or payment intent.');
      }

      const result = {
        success: true,
        data: {
          paymentIntentId: paymentIntent.id,
          paymentMethodId: paymentIntent.payment_method as string,
          status: paymentIntent.status as 'succeeded' | 'requires_action' | 'requires_payment_method' | 'processing' | 'canceled',
          clientSecret: paymentIntent.client_secret,
        }
      };

      if (result.success && result.data) {
        console.log('Payment confirmed, processing success...');
        
        // Process payment success on backend
        const processResult = await stripePaymentService.processPaymentSuccess(
          result.data.paymentIntentId,
          orderId
        );

        if (processResult.success) {
          console.log('Payment processed successfully');
          onPaymentSuccess({
            transactionId: result.data.paymentIntentId,
            paymentIntentId: result.data.paymentIntentId,
            status: 'COMPLETED',
            message: 'Payment processed successfully'
          });
        } else {
          throw new Error(processResult.error || 'Failed to process payment success');
        }
      } else {
        throw new Error('Payment confirmation failed');
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-600 mb-4">
        You are paying <span className="font-medium">{Number(amount || 0).toFixed(2)} {currency.toUpperCase()}</span>.
      </p>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {/* Stripe Payment Element */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Payment Details
        </label>
        <div className="border border-gray-300 rounded-md p-3 bg-white min-h-[50px]">
          {stripe && elements ? (
            <PaymentElement 
              options={{
                defaultValues: {
                  billingDetails: {
                    name: cardholderName || '',
                  },
                },
              }}
            />
          ) : (
            <div className="text-center py-4">
              <div className="text-gray-500 text-sm mb-2">
                {!stripe ? 'Loading Stripe...' : 'Loading payment form...'}
              </div>
              <div className="text-xs text-gray-400">
                {process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test_51H1234567890abcdef') 
                  ? 'Please add a valid Stripe publishable key to .env file' 
                  : 'Initializing payment...'}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center text-sm text-gray-500">
        <Lock className="w-4 h-4 mr-2" />
        Your payment information is securely processed by Stripe. We do not store your card details.
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4">
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
            isSubmitting
              ? 'bg-blue-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
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

export function StripePaymentModal({
  isOpen,
  onClose,
  onPaymentSuccess,
  orderId,
  amount,
  currency,
  description,
  customerId,
  cardholderName
}: StripePaymentModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPaymentIntent = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Creating payment intent for order:', orderId);
      const { paymentIntent } = await stripePaymentService.createPaymentIntent({
        amount: Number(amount || 0),
        currency: currency.toLowerCase(),
        description: description || `Payment for Order ${orderId}`,
        orderId,
        customerId,
      });

      console.log('Payment intent created:', paymentIntent);
      setClientSecret(paymentIntent.client_secret);
    } catch (err: any) {
      console.error('Error creating payment intent:', err);
      setError(err.message || 'Failed to initialize payment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [amount, currency, description, orderId, customerId]);

  // Create payment intent when modal opens
  useEffect(() => {
    if (isOpen && !clientSecret) {
      createPaymentIntent();
    }
  }, [isOpen, clientSecret, createPaymentIntent]);

  const handleClose = () => {
    setError(null);
    setClientSecret(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <CreditCard className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Pay with Card</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isLoading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
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
              <PaymentForm
                onClose={handleClose}
                onPaymentSuccess={onPaymentSuccess}
                orderId={orderId}
                amount={amount}
                currency={currency}
                description={description}
                customerId={customerId}
                cardholderName={cardholderName}
                clientSecret={clientSecret}
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

export default StripePaymentModal;