import { api } from './api';

export interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product: {
    id: string;
    title: string;
    price: number;
    images: string[];
    seller: {
      id: string;
      name: string;
    };
  };
}

export interface Order {
  id: string;
  orderNumber: string;
  totalAmount: number;
  currencyCode: string;
  deliveryCurrency?: string;
  status: string;
  shippingMethod?: string;
  shippingAmount?: number;
  discountAmount?: number;
  createdAt: string;
  items: OrderItem[];
  customer?: {
    id: string;
    name: string;
    phone: string;
  };
}

export interface OrderListResponse {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export const orderService = {
  async getMyOrders(page: number = 1, limit: number = 20): Promise<OrderListResponse> {
    const response = await api.get(`/api/orders/my-orders?page=${page}&limit=${limit}`);
    return response.data;
  },

  async getCustomerOrders(page: number = 1, limit: number = 20): Promise<OrderListResponse> {
    const response = await api.get(`/api/orders/customer-orders?page=${page}&limit=${limit}`);
    return response.data;
  },

  async getProductOrderCount(productId: string): Promise<{ productId: string; orderCount: number }> {
    const response = await api.get(`/api/orders/product/${productId}/count`);
    return response.data;
  },

  async getSalesRepOrders(salesRepId: string): Promise<{
    orders: Order[];
    ordersByCurrency: Array<{
      currency: string;
      orders: Order[];
      totalAmount: number;
      orderCount: number;
    }>;
    totalCount: number;
    totalAmount: number;
    salesRep: {
      id: string;
      firstName: string;
      lastName: string;
      branchName: string;
      branchLocation?: string;
    };
  }> {
    const response = await api.get(`/api/orders/sales-rep-orders/${salesRepId}`);
    return response.data;
  },
}; 