import { getApi } from './config';

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
  createdBy?: string;
}

export interface PaymentGatewayServiceProviderFilters {
  type?: string;
  countryCode?: string;
  currencyCode?: string;
}

export const paymentGatewayServiceProviderService = {
  async getProviders(filters?: PaymentGatewayServiceProviderFilters): Promise<{ providers: PaymentGatewayServiceProvider[] }> {
    const api = getApi();
    const params = new URLSearchParams();
    
    if (filters?.type) params.append('type', filters.type);
    if (filters?.countryCode) params.append('countryCode', filters.countryCode);
    if (filters?.currencyCode) params.append('currencyCode', filters.currencyCode);
    
    const queryString = params.toString();
    const url = queryString ? `/payment-gateway-service-providers?${queryString}` : '/payment-gateway-service-providers';
    
    const res = await api.get(url);
    return res.data;
  },

  async getProviderById(id: string): Promise<{ provider: PaymentGatewayServiceProvider }> {
    const api = getApi();
    const res = await api.get(`/payment-gateway-service-providers/${id}`);
    return res.data;
  }
};
