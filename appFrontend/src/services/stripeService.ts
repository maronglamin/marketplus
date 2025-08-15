import { Alert } from 'react-native';
import { api } from '../api/api';
import Constants from 'expo-constants';

// Get Stripe keys from app config
const STRIPE_PUBLISHABLE_KEY = Constants.expoConfig?.extra?.stripePublishableKey;
const STRIPE_SECRET_KEY = Constants.expoConfig?.extra?.stripeSecretKey;

// Stripe supported currencies (major ones)
const STRIPE_SUPPORTED_CURRENCIES = [
  'usd', 'eur', 'gbp', 'cad', 'aud', 'jpy', 'chf', 'sek', 'nok', 'dkk',
  'pln', 'czk', 'huf', 'ron', 'bgn', 'hrk', 'rub', 'try', 'brl', 'mxn',
  'sgd', 'hkd', 'nzd', 'myr', 'php', 'thb', 'idr', 'inr', 'krw', 'vnd',
  'zar', 'egp', 'ngn', 'kes', 'ghs', 'ugx', 'tzs', 'zmw', 'bwp', 'mwk',
  'szl', 'naf', 'aoa', 'mzn', 'stn', 'cve', 'gmd' // Added GMD (Gambian Dalasi)
];

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  client_secret: string;
}

export interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  billing_details?: {
    name: string;
    email: string;
  };
}

export interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  error?: string;
}

class StripeService {
  private publishableKey: string;

  constructor() {
    this.publishableKey = STRIPE_PUBLISHABLE_KEY || '';
    
    if (!this.publishableKey) {
      console.error('Stripe publishable key not found in app config');
    }
  }

  /**
   * Initialize Stripe with the publishable key
   */
  getPublishableKey(): string {
    return this.publishableKey;
  }

  /**
   * Check if currency is supported by Stripe
   */
  isCurrencySupported(currency: string): boolean {
    return STRIPE_SUPPORTED_CURRENCIES.includes(currency.toLowerCase());
  }

  /**
   * Convert amount to smallest currency unit (cents for most currencies)
   */
  convertToSmallestUnit(amount: number, currency: string): number {
    const currencyLower = currency.toLowerCase();
    
    // Zero-decimal currencies (like JPY)
    const zeroDecimalCurrencies = ['jpy', 'bif', 'clp', 'djf', 'gnf', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf'];
    
    if (zeroDecimalCurrencies.includes(currencyLower)) {
      return Math.round(amount);
    }
    
    // For non-USD currencies, assume amounts are already in smallest unit
    // This is common in many countries where amounts are already in cents
    if (currencyLower !== 'usd') {
      console.log(`Non-USD currency ${currencyLower}: using amount as-is (already in smallest unit)`);
      return Math.round(amount);
    }
    
    // For USD, convert to cents (multiply by 100)
    console.log(`USD currency: converting ${amount} to cents (${amount * 100})`);
    return Math.round(amount * 100);
  }

  /**
   * Check if amount is already in smallest unit (e.g., cents)
   */
  isAmountInSmallestUnit(amount: number, currency: string): boolean {
    // Always return false - let backend handle conversion
    // This ensures consistent conversion across all currencies
    return false;
  }

  /**
   * Convert amount to smallest unit, handling cases where it might already be converted
   */
  ensureSmallestUnit(amount: number, currency: string): number {
    // Backend now handles currency conversion properly
    // Just return the original amount to avoid double conversion
    console.log('Frontend sending original amount to backend for conversion:', amount);
    return amount;
  }

  /**
   * Create a payment intent on the backend
   */
  async createPaymentIntent(
    amount: number,
    currency: string = 'usd',
    orderId: string,
    customerId: string,
    metadata?: any
  ): Promise<PaymentIntent> {
    try {
      // Validate currency support
      if (!this.isCurrencySupported(currency)) {
        throw new Error(`Currency ${currency.toUpperCase()} is not supported by Stripe`);
      }

      // Ensure amount is in smallest currency unit
      const amountInSmallestUnit = this.ensureSmallestUnit(amount, currency);
      
      console.log('Creating payment intent:', {
        originalAmount: amount,
        currency: currency,
        amountInSmallestUnit: amountInSmallestUnit,
        orderId: orderId,
        customerId: customerId,
        metadata: metadata
      });

      console.log('Making API request to create payment intent:', {
        url: '/api/payments/create-payment-intent',
        data: {
          amount: amountInSmallestUnit,
          currency: currency.toLowerCase(),
          orderId,
          customerId,
          metadata
        }
      });

      const response = await api.post('/api/payments/create-payment-intent', {
        amount: amountInSmallestUnit, // Send the converted amount
        currency: currency.toLowerCase(),
        orderId,
        customerId,
        metadata,
      });

      console.log('Payment intent created successfully:', {
        status: response.status,
        data: response.data
      });

      return response.data.paymentIntent;
    } catch (error: any) {
      console.error('Error creating payment intent:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        hasResponse: !!error.response,
        isNetworkError: !error.response,
        isTimeout: error.code === 'ECONNABORTED'
      });
      
      // Handle specific error cases
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timed out. Please check your internet connection and try again.');
      } else if (error.response?.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      } else if (error.response?.status === 500) {
        throw new Error('Payment service is temporarily unavailable. Please try again later.');
      } else if (error.response?.status === 404) {
        throw new Error('Payment endpoint not found. Please contact support.');
      } else if (!error.response) {
        throw new Error('Unable to connect to payment service. Please check your internet connection and try again.');
      }
      
      throw new Error(error.response?.data?.message || 'Failed to create payment intent');
    }
  }

  /**
   * Confirm a payment with a payment method
   */
  async confirmPayment(
    paymentIntentId: string,
    paymentMethodId: string
  ): Promise<PaymentResult> {
    try {
      const response = await api.post('/api/payments/confirm-payment', {
        paymentIntentId,
        paymentMethodId,
      });
      return { success: true, paymentIntentId: response.data.paymentIntent.id };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Payment confirmation failed',
      };
    }
  }

  /**
   * Create a payment method for future use
   */
  async createPaymentMethod(
    type: string,
    cardDetails: {
      number: string;
      expMonth: number;
      expYear: number;
      cvc: string;
      name: string;
    }
  ): Promise<PaymentMethod> {
    try {
      const response = await api.post('/api/payments/create-payment-method', {
        type,
        card: {
          number: cardDetails.number.replace(/\s/g, ''),
          exp_month: cardDetails.expMonth,
          exp_year: cardDetails.expYear,
          cvc: cardDetails.cvc,
        },
        billing_details: {
          name: cardDetails.name,
        },
      });

      return response.data.paymentMethod;
    } catch (error: any) {
      console.error('Error creating payment method:', error);
      throw new Error(error.response?.data?.message || 'Failed to create payment method');
    }
  }

  /**
   * Attach a payment method to a customer
   */
  async attachPaymentMethodToCustomer(
    paymentMethodId: string,
    customerId: string
  ): Promise<void> {
    try {
      await api.post('/api/payments/attach-payment-method', {
        paymentMethodId,
        customerId,
      });
    } catch (error: any) {
      console.error('Error attaching payment method:', error);
      throw new Error(error.response?.data?.message || 'Failed to attach payment method');
    }
  }

  /**
   * Get saved payment methods for a customer
   */
  async getCustomerPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    try {
      const response = await api.get(`/api/payments/customer/${customerId}/payment-methods`);
      return response.data.paymentMethods;
    } catch (error: any) {
      console.error('Error getting customer payment methods:', error);
      throw new Error(error.response?.data?.message || 'Failed to get payment methods');
    }
  }

  /**
   * Process a payment with saved payment method
   */
  async processPaymentWithSavedMethod(
    amount: number,
    currency: string,
    paymentMethodId: string,
    orderId: string,
    customerId: string
  ): Promise<PaymentResult> {
    try {
      // First create payment intent
      const paymentIntent = await this.createPaymentIntent(amount, currency, orderId, customerId);
      
      // Then confirm with saved payment method
      const result = await this.confirmPayment(paymentIntent.id, paymentMethodId);
      
      return result;
    } catch (error: any) {
      console.error('Error processing payment with saved method:', error);
      return {
        success: false,
        error: error.message || 'Payment processing failed',
      };
    }
  }

  /**
   * Format card number for display (show only last 4 digits)
   */
  formatCardNumber(cardNumber: string): string {
    const cleaned = cardNumber.replace(/\s/g, '');
    if (cleaned.length >= 4) {
      return `**** **** **** ${cleaned.slice(-4)}`;
    }
    return cardNumber;
  }

  /**
   * Validate card number using Luhn algorithm
   */
  validateCardNumber(cardNumber: string): boolean {
    const cleaned = cardNumber.replace(/\s/g, '');
    if (cleaned.length < 13 || cleaned.length > 19) {
      return false;
    }

    let sum = 0;
    let isEven = false;

    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i]);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  /**
   * Validate expiry date
   */
  validateExpiryDate(month: number, year: number): boolean {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    if (year < currentYear) {
      return false;
    }

    if (year === currentYear && month < currentMonth) {
      return false;
    }

    return month >= 1 && month <= 12;
  }

  /**
   * Validate CVC
   */
  validateCVC(cvc: string): boolean {
    const cleaned = cvc.replace(/\s/g, '');
    return cleaned.length >= 3 && cleaned.length <= 4;
  }

  /**
   * Get card brand from card number
   */
  getCardBrand(cardNumber: string): string {
    const cleaned = cardNumber.replace(/\s/g, '');
    
    // Visa
    if (/^4/.test(cleaned)) {
      return 'visa';
    }
    
    // Mastercard
    if (/^5[1-5]/.test(cleaned) || /^2[2-7]/.test(cleaned)) {
      return 'mastercard';
    }
    
    // American Express
    if (/^3[47]/.test(cleaned)) {
      return 'amex';
    }
    
    // Discover
    if (/^6(?:011|5)/.test(cleaned)) {
      return 'discover';
    }
    
    return 'unknown';
  }

  /**
   * Format amount for display in UI
   */
  formatAmount(amount: number, currency: string): string {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase(),
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch (error) {
      // Fallback formatting
      return `${currency.toUpperCase()} ${amount.toFixed(2)}`;
    }
  }

  /**
   * Handle payment errors and show appropriate messages
   */
  handlePaymentError(error: any): string {
    if (error?.code) {
      switch (error.code) {
        case 'card_declined':
          return 'Your card was declined. Please try a different card.';
        case 'expired_card':
          return 'Your card has expired. Please use a different card.';
        case 'incorrect_cvc':
          return 'The security code (CVC) is incorrect.';
        default:
          return error.message || 'Payment failed. Please try again.';
      }
    }
    return error?.message || 'An unexpected error occurred.';
  }
}

export const stripeService = new StripeService(); 