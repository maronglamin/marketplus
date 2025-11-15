import { getApi } from './config';

export interface WaveCheckoutSessionRequest {
  amount: number;
  currency?: string;
  description?: string;
  orderId?: string;
  restrictPayerMobile?: string;
}

export interface WaveCheckoutSessionResponse {
  success: boolean;
  data?: {
    sessionId: string;
    transactionId?: string;
    status: string;
    checkoutStatus: string;
    waveLaunchUrl: string;
    amount: number;
    currency: string;
    serviceFee?: {
      amount: number;
      percentage: number;
      config?: string;
    };
    message?: string;
  };
  message?: string;
  error?: string | any;
}

export interface WaveSessionDetailsResponse {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
}

export interface CurrenciesResponse {
  success: boolean;
  data?: {
    currencies: Array<{ code: string; name: string; symbol: string }>;
    default: string;
  };
  message?: string;
}

export interface CheckTransactionsResponse {
  success: boolean;
  data?: {
    hasActiveTransaction: boolean;
    transactions?: any[];
    canMakePayment: boolean;
  };
  message?: string;
}

export const waveGambiaPaymentService = {
  async processPayment(data: WaveCheckoutSessionRequest): Promise<WaveCheckoutSessionResponse> {
    try {
      const api = getApi();
      const res = await api.post('/payments/wave-gambia/process', data);
      return res.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to process Wave payment',
      };
    }
  },

  async getSession(sessionId: string): Promise<WaveSessionDetailsResponse> {
    const api = getApi();
    const res = await api.get(`/payments/wave-gambia/sessions/${sessionId}`);
    return res.data;
  },

  async expireSession(sessionId: string): Promise<WaveSessionDetailsResponse> {
    const api = getApi();
    const res = await api.post(`/payments/wave-gambia/sessions/${sessionId}/expire`);
    return res.data;
  },

  async refundSession(sessionId: string): Promise<WaveSessionDetailsResponse> {
    const api = getApi();
    const res = await api.post(`/payments/wave-gambia/sessions/${sessionId}/refund`);
    return res.data;
  },

  async getSupportedCurrencies(): Promise<CurrenciesResponse> {
    const api = getApi();
    const res = await api.get('/payments/wave-gambia/currencies');
    return res.data;
  },

  async checkExistingTransactions(orderId: string): Promise<CheckTransactionsResponse> {
    const api = getApi();
    const res = await api.get(`/payments/wave-gambia/check-transactions/${orderId}`);
    return res.data;
  }
};


