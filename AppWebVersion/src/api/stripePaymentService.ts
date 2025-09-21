import { loadStripe, Stripe, StripeElements, StripePaymentElement } from '@stripe/stripe-js';
import { getApi } from './config';

// Initialize Stripe with publishable key
// Add REACT_APP_STRIPE_PUBLISHABLE_KEY to your .env file
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_51H1234567890abcdef');

export interface StripePaymentData {
  paymentIntentId: string;
  paymentMethodId: string;
  status: 'succeeded' | 'requires_action' | 'requires_payment_method' | 'processing' | 'canceled';
  clientSecret?: string;
}

export interface StripePaymentResult {
  success: boolean;
  data?: StripePaymentData;
  error?: string;
  requiresAction?: boolean;
  clientSecret?: string;
}

export class StripePaymentService {
  private stripe: Stripe | null = null;

  constructor() {
    this.initializeStripe();
  }

  private async initializeStripe() {
    this.stripe = await stripePromise;
  }

  /**
   * Create a payment intent on the backend
   */
  async createPaymentIntent(data: {
    amount: number;
    currency: string;
    description?: string;
    orderId?: string;
    customerId?: string;
  }) {
    const response = await getApi().post('/payments/create-payment-intent', data);
    return response.data;
  }

  /**
   * Confirm a payment intent using Stripe.js
   * This handles 3D Secure authentication automatically
   */
  async confirmPayment(
    clientSecret: string,
    elements: StripeElements,
    paymentElement: StripePaymentElement
  ): Promise<StripePaymentResult> {
    if (!this.stripe) {
      throw new Error('Stripe has not loaded yet. Please try again.');
    }

    try {
      console.log('Confirming payment with Stripe.js...');
      
      const { error, paymentIntent } = await this.stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment/return`,
        },
        redirect: 'if_required', // Only redirect if 3D Secure is required
      });

      if (error) {
        console.error('Stripe payment confirmation error:', error);
        return {
          success: false,
          error: error.message || 'Payment confirmation failed',
        };
      }

      if (paymentIntent) {
        console.log('Payment confirmed successfully:', paymentIntent);
        return {
          success: true,
          data: {
            paymentIntentId: paymentIntent.id,
            paymentMethodId: paymentIntent.payment_method as string,
            status: paymentIntent.status as any,
            clientSecret: paymentIntent.client_secret || undefined,
          },
          requiresAction: paymentIntent.status === 'requires_action',
          clientSecret: paymentIntent.client_secret || undefined,
        };
      }

      return {
        success: false,
        error: 'Payment confirmation failed - no payment intent returned',
      };
    } catch (error: any) {
      console.error('Stripe payment confirmation error:', error);
      return {
        success: false,
        error: error.message || 'Payment confirmation failed',
      };
    }
  }

  /**
   * Process payment success on the backend
   */
  async processPaymentSuccess(paymentIntentId: string, orderId: string) {
    const response = await getApi().post('/payments/payment-success', {
      paymentIntentId,
      orderId
    });
    return response.data;
  }

  /**
   * Get Stripe instance
   */
  getStripe(): Stripe | null {
    return this.stripe;
  }

  /**
   * Check if Stripe is loaded
   */
  isLoaded(): boolean {
    return this.stripe !== null;
  }
}

// Export a singleton instance
export const stripePaymentService = new StripePaymentService();
