import { ENV_CONFIG } from '../config/env';
import getApi from '../api/config';

export interface YonnaForexPaymentRequest {
  amount: number;
  currency: string;
  description?: string;
  transactionId?: string;
  countryCode?: string;
  phoneNumber?: string;
  orderId?: string;
}

export interface YonnaForexPaymentResponse {
  success: boolean;
  data?: {
    transactionId: string;
    status: string;
    message: string;
    paymentUrl?: string;
    paymentHtml?: string;
  };
  message?: string;
  error?: string;
}

export interface SupportedCurrency {
  code: string;
  name: string;
  symbol: string;
}

export interface CurrenciesResponse {
  success: boolean;
  data?: {
    currencies: SupportedCurrency[];
    default: string;
  };
  message?: string;
}

export class YonnaForexPaymentService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${ENV_CONFIG.API_BASE_URL}/api/payments/yonna-forex`;
  }

  /**
   * Process payment through Yonna Forex
   */
  async processPayment(paymentData: YonnaForexPaymentRequest): Promise<YonnaForexPaymentResponse> {
    try {
      console.log('YonnaForexPaymentService: Processing payment with data:', paymentData);
      
      const api = await getApi();
      const response = await api.post('/payments/yonna-forex/process', paymentData);

      console.log('YonnaForexPaymentService: Response status:', response.status);
      console.log('YonnaForexPaymentService: Response data:', response.data);

      if (response.status !== 200) {
        throw new Error(response.data?.message || `Payment processing failed with status ${response.status}`);
      }

      return response.data;
    } catch (error: any) {
      console.error('Yonna Forex payment error:', error);
      
      // Provide more specific error messages based on error type
      let errorMessage = 'Payment processing failed';
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = 'Network error: Unable to connect to payment service. Please check your internet connection.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timeout: Payment service is taking too long to respond. Please try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        message: errorMessage,
        error: error.message
      };
    }
  }

  /**
   * Verify payment status
   */
  async verifyPayment(transactionId: string): Promise<YonnaForexPaymentResponse> {
    try {
      const api = await getApi();
      const response = await api.post('/payments/yonna-forex/verify', { transactionId });

      const result = response.data;

      if (response.status !== 200) {
        throw new Error(result.message || 'Payment verification failed');
      }

      return result;
    } catch (error: any) {
      console.error('Yonna Forex verification error:', error);
      return {
        success: false,
        message: error.message || 'Payment verification failed',
        error: error.message
      };
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(transactionId: string): Promise<YonnaForexPaymentResponse> {
    try {
      const api = await getApi();
      const response = await api.get(`/payments/yonna-forex/status/${transactionId}`);

      const result = response.data;

      if (response.status !== 200) {
        throw new Error(result.message || 'Unable to retrieve payment status');
      }

      return result;
    } catch (error: any) {
      console.error('Yonna Forex status error:', error);
      return {
        success: false,
        message: error.message || 'Unable to retrieve payment status',
        error: error.message
      };
    }
  }

  /**
   * Get supported currencies
   */
  async getSupportedCurrencies(): Promise<CurrenciesResponse> {
    try {
      const api = await getApi();
      const response = await api.get('/payments/yonna-forex/currencies');

      const result = response.data;

      if (response.status !== 200) {
        throw new Error(result.message || 'Unable to retrieve currencies');
      }

      return result;
    } catch (error: any) {
      console.error('Yonna Forex currencies error:', error);
      return {
        success: false,
        message: error.message || 'Unable to retrieve currencies',
      };
    }
  }

  /**
   * Generate unique transaction ID
   */
  generateTransactionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `YF_${timestamp}_${random}`.toUpperCase();
  }

  /**
   * Format amount for display
   */
  formatAmount(amount: number, currency: string): string {
    const currencySymbols: { [key: string]: string } = {
      'GMD': 'D',
      'USD': '$',
      'EUR': '€',
      'GBP': '£'
    };

    const symbol = currencySymbols[currency] || currency;
    return `${symbol}${amount.toFixed(2)}`;
  }

  /**
   * Check if order has existing external transactions
   */
  async checkExistingTransactions(orderId: string): Promise<{
    success: boolean;
    data?: {
      hasActiveTransaction: boolean;
      transactions: any[];
      canMakePayment: boolean;
    };
    message?: string;
  }> {
    try {
      const api = await getApi();
      const response = await api.get(`/payments/yonna-forex/check-transactions/${orderId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error checking existing transactions:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to check existing transactions'
      };
    }
  }
}

export default YonnaForexPaymentService;
