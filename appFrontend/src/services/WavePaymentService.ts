import getApi from '../api/config';

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

export class WavePaymentService {
  async processPayment(payload: WaveCheckoutSessionRequest): Promise<WaveCheckoutSessionResponse> {
    try {
      const api = await getApi();
      const res = await api.post('/payments/wave-gambia/process', payload);
      return res.data;
    } catch (error: any) {
      return {
        success: false,
        error: error?.response?.data?.message || error?.message || 'Failed to process Wave payment',
      };
    }
  }

  async getSession(sessionId: string): Promise<any> {
    try {
      const api = await getApi();
      const res = await api.get(`/payments/wave-gambia/sessions/${sessionId}`);
      return res.data;
    } catch (error: any) {
      return {
        success: false,
        error: error?.response?.data?.message || error?.message || 'Failed to fetch Wave session',
      };
    }
  }
}

export default WavePaymentService;


