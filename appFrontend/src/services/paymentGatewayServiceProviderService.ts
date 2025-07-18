import { api } from '../api/api';

export interface PaymentGatewayServiceProvider {
  id: string;
  name: string;
  type: string;
  countryCode: string;
  currencyCode: string;
  isActive: boolean;
  logoUrl?: string;
  description?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentGatewayServiceProviderData {
  name: string;
  type: string;
  countryCode: string;
  currencyCode: string;
  logoUrl?: string;
  description?: string;
  metadata?: any;
}

export interface UpdatePaymentGatewayServiceProviderData extends CreatePaymentGatewayServiceProviderData {
  isActive?: boolean;
}

class PaymentGatewayServiceProviderService {
  // Get all payment gateway service providers
  async getPaymentGatewayServiceProviders(filters?: {
    type?: string;
    countryCode?: string;
    currencyCode?: string;
  }): Promise<{ providers: PaymentGatewayServiceProvider[]; count: number }> {
    try {
      const params = new URLSearchParams();
      if (filters?.type) params.append('type', filters.type);
      if (filters?.countryCode) params.append('countryCode', filters.countryCode);
      if (filters?.currencyCode) params.append('currencyCode', filters.currencyCode);

      const response = await api.get(`/api/payment-gateway-service-providers?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching payment gateway service providers:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error('Failed to fetch payment gateway service providers');
      }
    }
  }

  // Get payment gateway service provider by ID
  async getPaymentGatewayServiceProviderById(id: string): Promise<{ provider: PaymentGatewayServiceProvider }> {
    try {
      const response = await api.get(`/api/payment-gateway-service-providers/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching payment gateway service provider:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error('Failed to fetch payment gateway service provider');
      }
    }
  }

  // Get mobile money providers
  async getMobileMoneyProviders(countryCode?: string): Promise<PaymentGatewayServiceProvider[]> {
    try {
      const filters: any = { type: 'MOBILE_MONEY' };
      if (countryCode) filters.countryCode = countryCode;

      const response = await this.getPaymentGatewayServiceProviders(filters);
      return response.providers;
    } catch (error) {
      console.error('Error fetching mobile money providers:', error);
      return [];
    }
  }

  // Get digital wallet providers
  async getDigitalWalletProviders(countryCode?: string): Promise<PaymentGatewayServiceProvider[]> {
    try {
      const filters: any = { type: 'DIGITAL_WALLET' };
      if (countryCode) filters.countryCode = countryCode;

      const response = await this.getPaymentGatewayServiceProviders(filters);
      return response.providers;
    } catch (error) {
      console.error('Error fetching digital wallet providers:', error);
      return [];
    }
  }

  // Create a new payment gateway service provider (Admin only)
  async createPaymentGatewayServiceProvider(data: CreatePaymentGatewayServiceProviderData): Promise<{ message: string; provider: PaymentGatewayServiceProvider }> {
    try {
      const response = await api.post('/api/payment-gateway-service-providers', data);
      return response.data;
    } catch (error: any) {
      console.error('Error creating payment gateway service provider:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error('Failed to create payment gateway service provider');
      }
    }
  }

  // Update a payment gateway service provider (Admin only)
  async updatePaymentGatewayServiceProvider(id: string, data: UpdatePaymentGatewayServiceProviderData): Promise<{ message: string; provider: PaymentGatewayServiceProvider }> {
    try {
      const response = await api.put(`/api/payment-gateway-service-providers/${id}`, data);
      return response.data;
    } catch (error: any) {
      console.error('Error updating payment gateway service provider:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error('Failed to update payment gateway service provider');
      }
    }
  }

  // Delete a payment gateway service provider (Admin only)
  async deletePaymentGatewayServiceProvider(id: string): Promise<{ message: string }> {
    try {
      const response = await api.delete(`/api/payment-gateway-service-providers/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error deleting payment gateway service provider:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error('Failed to delete payment gateway service provider');
      }
    }
  }
}

export const paymentGatewayServiceProviderService = new PaymentGatewayServiceProviderService(); 