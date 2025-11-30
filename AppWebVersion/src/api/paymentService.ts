import { stripePaymentService } from './stripePaymentService';
import { yonnaForexPaymentService, YonnaForexPaymentRequest } from './yonnaForexPayment';

export interface CreatePaymentIntentRequest {
  amount: number;
  currency: string;
  description?: string;
  orderId?: string;
  customerId?: string;
}

export interface PaymentGateway {
  id: string;
  name: string;
  type: 'card' | 'mobile_wallet';
  supportedCurrencies: string[];
  isActive: boolean;
}

export interface PaymentRequest {
  amount: number;
  currency: string;
  description?: string;
  orderId?: string;
  customerId?: string;
  paymentMethod: {
    id: string;
    type: string;
    provider: string;
  };
}

export interface PaymentResponse {
  success: boolean;
  data?: {
    transactionId?: string;
    paymentIntentId?: string;
    status: string;
    message: string;
    appTransactionId?: string;
    paymentUrl?: string;
    qrCodeUrl?: string;
    qrCodeBase64?: string;
    paymentHtml?: string;
  };
  error?: string;
}

export const paymentGateways: PaymentGateway[] = [
  {
    id: 'card',
    name: 'Card',
    type: 'card',
    supportedCurrencies: [
      'usd', 'eur', 'gbp', 'cad', 'aud', 'jpy', 'chf', 'sek', 'nok', 'dkk',
      'pln', 'czk', 'huf', 'ron', 'bgn', 'hrk', 'rub', 'try', 'brl', 'mxn',
      'sgd', 'hkd', 'nzd', 'myr', 'php', 'thb', 'idr', 'inr', 'krw', 'vnd',
      'zar', 'egp', 'ngn', 'kes', 'ghs', 'ugx', 'tzs', 'zmw', 'bwp', 'mwk',
      'szl', 'naf', 'aoa', 'mzn', 'stn', 'cve', 'gmd'
    ],
    isActive: true
  },
  {
    id: 'mobile_wallet',
    name: 'Mobile Wallet',
    type: 'mobile_wallet',
    supportedCurrencies: ['gmd'], // Only GMD currency
    isActive: true
  }
];

export const paymentService = {
  /**
   * Get available payment gateways
   */
  getPaymentGateways(): PaymentGateway[] {
    return paymentGateways.filter(gateway => gateway.isActive);
  },

  /**
   * Get supported payment gateways for a currency
   */
  getSupportedGateways(currency: string): PaymentGateway[] {
    if (!currency) return [];
    
    return paymentGateways.filter(gateway => 
      gateway.isActive && 
      gateway.supportedCurrencies.some(c => c.toLowerCase() === currency.toLowerCase())
    );
  },

  /**
   * Process payment using the appropriate gateway
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const { paymentMethod, amount, currency, description, orderId, customerId } = request;
    
    try {
      console.log('Starting payment processing:', { paymentMethod, amount, currency, orderId, customerId });
      
      // Determine which gateway to use based on payment method type
      let gateway: PaymentGateway;
      
      if (paymentMethod.type === 'CREDIT_CARD' || paymentMethod.type === 'DEBIT_CARD') {
        gateway = paymentGateways.find(g => g.type === 'card')!;
      } else if (paymentMethod.type === 'MOBILE_MONEY') {
        gateway = paymentGateways.find(g => g.type === 'mobile_wallet')!;
      } else {
        throw new Error(`Unsupported payment method type: ${paymentMethod.type}`);
      }

      console.log('Selected gateway:', gateway);

      // Check if gateway supports the currency
      if (!gateway.supportedCurrencies.some(c => c.toLowerCase() === currency.toLowerCase())) {
        throw new Error(`Currency ${currency} is not supported by ${gateway.name}`);
      }

      // Process payment based on gateway type
      if (gateway.type === 'card') {
        const paymentIntentData: CreatePaymentIntentRequest = {
          amount,
          currency: currency.toLowerCase(),
          description: description || `Payment for Order ${orderId}`,
          orderId,
          customerId
        };

        console.log('Processing Stripe payment with data:', paymentIntentData);
        
        // Step 1: Create payment intent
        const { paymentIntent } = await stripePaymentService.createPaymentIntent(paymentIntentData);
        console.log('Payment intent created:', paymentIntent);
        
        // Step 2: Process the payment success (this will create database records and update order status)
        if (!orderId) {
          throw new Error('Order ID is required for payment processing');
        }
        const processResult = await stripePaymentService.processPaymentSuccess(paymentIntent.id, orderId);
        console.log('Payment success processed:', processResult);
        
        if (!processResult.success) {
          throw new Error(processResult.error || 'Failed to process order payment');
        }
        
        return {
          success: true,
          data: {
            transactionId: processResult.data?.transactionId || paymentIntent.id,
            paymentIntentId: paymentIntent.id,
            status: 'COMPLETED',
            message: 'Payment processed successfully'
          }
        };
      } else if (gateway.type === 'mobile_wallet') {
        const paymentData: YonnaForexPaymentRequest = {
          amount,
          currency: currency.toUpperCase(),
          description: description || `Payment for Order ${orderId}`,
          orderId
        };

        const response = await yonnaForexPaymentService.processPayment(paymentData);
        
        if (response.success && response.data) {
          // Pass through all fields including paymentHtml/QR for web rendering
          return {
            success: true,
            data: {
              transactionId: response.data.transactionId,
              status: response.data.status,
              message: response.data.message,
              appTransactionId: (response.data as any).appTransactionId,
              paymentUrl: (response.data as any).paymentUrl,
              qrCodeUrl: (response.data as any).qrCodeUrl,
              qrCodeBase64: (response.data as any).qrCodeBase64,
              paymentHtml: (response.data as any).paymentHtml
            }
          };
        } else {
          throw new Error(response.error || response.message || 'Yonna Forex payment failed');
        }
      }

      throw new Error('Unknown payment gateway type');
    } catch (error: any) {
      console.error('Payment processing error:', error);
      return {
        success: false,
        error: error.message || 'Payment processing failed'
      };
    }
  },

  /**
   * Check if a payment method is supported by any gateway
   */
  isPaymentMethodSupported(paymentMethodType: string, currency: string): boolean {
    const supportedGateways = this.getSupportedGateways(currency);
    
    return supportedGateways.some(gateway => {
      if (gateway.type === 'card') {
        return paymentMethodType === 'CREDIT_CARD' || paymentMethodType === 'DEBIT_CARD';
      } else if (gateway.type === 'mobile_wallet') {
        return paymentMethodType === 'MOBILE_MONEY';
      }
      return false;
    });
  },

  /**
   * Get the best payment gateway for a payment method and currency
   */
  getBestGateway(paymentMethodType: string, currency: string): PaymentGateway | null {
    const supportedGateways = this.getSupportedGateways(currency);
    
    // Prefer Stripe for card payments
    if (paymentMethodType === 'CREDIT_CARD' || paymentMethodType === 'DEBIT_CARD') {
      return supportedGateways.find(g => g.type === 'card') || null;
    }
    
    // Prefer Yonna Forex for mobile money
    if (paymentMethodType === 'MOBILE_MONEY') {
      return supportedGateways.find(g => g.type === 'mobile_wallet') || null;
    }
    
    return null;
  }
};
