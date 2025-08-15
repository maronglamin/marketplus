import { api } from './api';

export interface Interest {
  id: string;
  productId: string;
  quantity: number;
  originalPrice: number;
  discountPrice?: number;
  totalAmount: number;
  currencyCode: string;
  status: string;
  preferredDeliveryDate?: string;
  deliveryAddress?: string;
  contactPhone?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  product: {
    id: string;
    title: string;
    price: number;
    currencyCode: string;
    image?: string;
    seller?: {
      id: string;
      name: string;
      businessName?: string;
      image?: string;
    };
  };
  customer?: {
    id: string;
    name: string;
    phone: string;
  };
}

export interface InterestListResponse {
  interests: Interest[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export const interestService = {
  async getMyInterests(page: number = 1, limit: number = 6): Promise<InterestListResponse> {
    const response = await api.get(`/api/products/interests/user?page=${page}&limit=${limit}`);
    return response.data;
  },

  async getCustomerInterests(page: number = 1, limit: number = 6): Promise<InterestListResponse> {
    const response = await api.get(`/api/products/interests/customer?page=${page}&limit=${limit}`);
    return response.data;
  },

  async getChatListInterests(page: number = 1, limit: number = 50): Promise<InterestListResponse> {
    const response = await api.get(`/api/products/interests/chat-list?page=${page}&limit=${limit}`);
    return response.data;
  },

  async checkInterest(productId: string): Promise<{ exists: boolean; interest: any }> {
    const response = await api.get(`/api/products/${productId}/interest/check`);
    return response.data;
  },

  async addInterest(productId: string, data: {
    quantity?: number;
    notes?: string;
    preferredDeliveryDate?: string;
    deliveryAddress?: string;
    contactPhone?: string;
    paymentMethod?: string;
  }): Promise<any> {
    const response = await api.post(`/api/products/${productId}/interest`, data);
    return response.data;
  },

  async removeInterest(interestId: string): Promise<void> {
    await api.delete(`/api/products/interests/${interestId}`);
  },
}; 