import { getApi } from './config';

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

export interface CheckTransactionsResponse {
  success: boolean;
  data?: {
    hasActiveTransaction: boolean;
    canMakePayment: boolean;
  };
  message?: string;
}

export const yonnaForexPaymentService = {
  /**
   * Process payment through Yonna Forex
   */
  async processPayment(paymentData: YonnaForexPaymentRequest): Promise<YonnaForexPaymentResponse> {
    try {
      const api = getApi();
      console.log('Processing Yonna Forex payment with data:', paymentData);
      const res = await api.post('/payments/yonna-forex/process', paymentData);
      console.log('Yonna Forex payment response:', res.data);
      return res.data;
    } catch (error: any) {
      console.error('Yonna Forex payment error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Failed to process Yonna Forex payment' 
      };
    }
  },

  /**
   * Get supported currencies
   */
  async getSupportedCurrencies(): Promise<CurrenciesResponse> {
    const api = getApi();
    const res = await api.get('/payments/yonna-forex/currencies');
    return res.data;
  },

  /**
   * Check existing transactions for an order
   */
  async checkExistingTransactions(orderId: string): Promise<CheckTransactionsResponse> {
    const api = getApi();
    const res = await api.get(`/payments/yonna-forex/check-transactions/${orderId}`);
    return res.data;
  },

  /**
   * Get transaction status
   */
  async getTransactionStatus(transactionId: string): Promise<YonnaForexPaymentResponse> {
    const api = getApi();
    const res = await api.get(`/payments/yonna-forex/status/${transactionId}`);
    return res.data;
  },

  /**
   * Cancel a transaction
   */
  async cancelTransaction(transactionId: string): Promise<YonnaForexPaymentResponse> {
    const api = getApi();
    const res = await api.post(`/payments/yonna-forex/cancel/${transactionId}`);
    return res.data;
  }
};
