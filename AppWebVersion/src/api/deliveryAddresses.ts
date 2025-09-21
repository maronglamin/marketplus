import { getApi } from './config';

export interface DeliveryAddress {
  id: string;
  address: string;
  city: string;
  state: string;
  postalCode?: string;
  country: string;
  label?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryAddressResponse {
  addresses: DeliveryAddress[];
  total: number;
}

export interface CreateDeliveryAddressRequest {
  address: string;
  city: string;
  state: string;
  postalCode?: string;
  country: string;
  label?: string;
  isDefault?: boolean;
}

export interface UpdateDeliveryAddressRequest extends Partial<CreateDeliveryAddressRequest> {
  id: string;
}

export const deliveryAddressService = {
  async getDeliveryAddresses(): Promise<DeliveryAddressResponse> {
    const api = getApi();
    const res = await api.get('/delivery-addresses');
    return res.data;
  },

  async createDeliveryAddress(payload: CreateDeliveryAddressRequest): Promise<{ address: DeliveryAddress }> {
    const api = getApi();
    const res = await api.post('/delivery-addresses', payload);
    return res.data;
  },

  async updateDeliveryAddress(payload: UpdateDeliveryAddressRequest): Promise<{ address: DeliveryAddress }> {
    const api = getApi();
    const res = await api.put(`/delivery-addresses/${payload.id}`, payload);
    return res.data;
  },

  async deleteDeliveryAddress(addressId: string): Promise<void> {
    const api = getApi();
    await api.delete(`/delivery-addresses/${addressId}`);
  },

  async setDefaultAddress(addressId: string): Promise<{ address: DeliveryAddress }> {
    const api = getApi();
    const res = await api.patch(`/delivery-addresses/${addressId}/set-default`);
    return res.data;
  }
};
