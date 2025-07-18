import { api } from '../api/api';

export interface DeliveryAddress {
  id: string;
  userId: string;
  address: string;
  city: string;
  state: string;
  postalCode?: string;
  country: string;
  isDefault: boolean;
  label?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeliveryAddressData {
  address: string;
  city: string;
  state: string;
  postalCode?: string;
  country: string;
  label?: string;
  isDefault?: boolean;
}

export interface UpdateDeliveryAddressData extends CreateDeliveryAddressData {
  id: string;
}

class DeliveryAddressService {
  // Get all delivery addresses for the current user
  async getDeliveryAddresses(): Promise<{ addresses: DeliveryAddress[]; count: number }> {
    try {
      const response = await api.get('/api/delivery-addresses');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching delivery addresses:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error('Failed to fetch delivery addresses');
      }
    }
  }

  // Create a new delivery address
  async createDeliveryAddress(data: CreateDeliveryAddressData): Promise<{ message: string; address: DeliveryAddress }> {
    try {
      const response = await api.post('/api/delivery-addresses', data);
      return response.data;
    } catch (error: any) {
      console.error('Error creating delivery address:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error('Failed to create delivery address');
      }
    }
  }

  // Update an existing delivery address
  async updateDeliveryAddress(data: UpdateDeliveryAddressData): Promise<{ message: string; address: DeliveryAddress }> {
    try {
      const response = await api.put(`/api/delivery-addresses/${data.id}`, data);
      return response.data;
    } catch (error: any) {
      console.error('Error updating delivery address:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error('Failed to update delivery address');
      }
    }
  }

  // Delete a delivery address
  async deleteDeliveryAddress(addressId: string): Promise<{ message: string }> {
    try {
      const response = await api.delete(`/api/delivery-addresses/${addressId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error deleting delivery address:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error('Failed to delete delivery address');
      }
    }
  }

  // Set a delivery address as default
  async setDefaultDeliveryAddress(addressId: string): Promise<{ message: string; address: DeliveryAddress }> {
    try {
      const response = await api.patch(`/api/delivery-addresses/${addressId}/default`);
      return response.data;
    } catch (error: any) {
      console.error('Error setting default delivery address:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error('Failed to set default delivery address');
      }
    }
  }

  // Get the default delivery address
  async getDefaultDeliveryAddress(): Promise<DeliveryAddress | null> {
    try {
      const response = await this.getDeliveryAddresses();
      const defaultAddress = response.addresses.find(addr => addr.isDefault);
      return defaultAddress || null;
    } catch (error) {
      console.error('Error getting default delivery address:', error);
      return null;
    }
  }
}

export const deliveryAddressService = new DeliveryAddressService(); 