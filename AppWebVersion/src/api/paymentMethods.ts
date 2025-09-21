import { getApi } from './config';

export interface PaymentMethod {
  id: string;
  userId: string;
  type: 'CREDIT_CARD' | 'DEBIT_CARD' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'CRYPTO' | 'CASH';
  provider: string;
  accountName: string;
  accountId: string;
  isDefault: boolean;
  status: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentMethodRequest {
  type: string;
  provider: string;
  accountName: string;
  accountId: string;
  isDefault?: boolean;
  metadata?: any;
}

export interface UpdatePaymentMethodRequest {
  provider?: string;
  accountName?: string;
  accountId?: string;
  isDefault?: boolean;
  metadata?: any;
}

export const paymentMethodService = {
  async getPaymentMethods(): Promise<{ paymentMethods: PaymentMethod[] }> {
    const api = getApi();
    const res = await api.get('/payment-methods');
    console.log('Payment methods API response:', res.data);
    // Backend returns { success: true, data: [...] }
    // We need to map it to { paymentMethods: [...] }
    return { paymentMethods: res.data.data || [] };
  },

  async createPaymentMethod(payload: CreatePaymentMethodRequest): Promise<{ paymentMethod: PaymentMethod }> {
    const api = getApi();
    const res = await api.post('/payment-methods', payload);
    // Backend returns { message: "...", paymentMethod: {...} }
    return { paymentMethod: res.data.paymentMethod };
  },

  async updatePaymentMethod(methodId: string, payload: UpdatePaymentMethodRequest): Promise<{ paymentMethod: PaymentMethod }> {
    const api = getApi();
    const res = await api.patch(`/payment-methods/${methodId}`, payload);
    // Backend returns { message: "...", paymentMethod: {...} }
    return { paymentMethod: res.data.paymentMethod };
  },

  async deletePaymentMethod(methodId: string): Promise<void> {
    const api = getApi();
    await api.delete(`/payment-methods/${methodId}`);
  },

  async setDefaultPaymentMethod(methodId: string): Promise<{ paymentMethod: PaymentMethod }> {
    const api = getApi();
    const res = await api.patch(`/payment-methods/${methodId}/set-default`);
    return res.data;
  }
};
