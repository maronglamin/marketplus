import { loadStripe, Stripe, StripeElements, StripePaymentElement } from '@stripe/stripe-js';
import { getApi } from './config';

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

  private async ensureStripeLoaded(): Promise<Stripe> {
    if (this.stripe) {
      return this.stripe;
    }
    const publishableKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      throw new Error('Missing Stripe publishable key. Set REACT_APP_STRIPE_PUBLISHABLE_KEY.');
    }
    const loaded = await loadStripe(publishableKey);
    if (!loaded) {
      throw new Error('Failed to load Stripe.js');
    }
    this.stripe = loaded;
    return this.stripe;
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
    const stripe = await this.ensureStripeLoaded();

    try {
      console.log('Confirming payment with Stripe.js...');
      
      const { error, paymentIntent } = await stripe.confirmPayment({
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
