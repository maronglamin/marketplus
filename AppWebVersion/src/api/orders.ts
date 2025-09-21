import { getApi } from './config';

export interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product: {
    id: string;
    title: string;
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
  status: string;
  totalAmount: number;
  currencyCode: string;
  deliveryCurrency?: string;
  shippingAmount: number;
  discountAmount?: number;
  createdAt: string;
  updatedAt: string;
  userId: string;
  sellerId: string;
  customer: {
    id: string;
    name: string;
    phone: string;
  };
  User_orders_userIdToUser?: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
  User_orders_sellerIdToUser?: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
  items: OrderItem[];
  shippingMethod?: string;
  shippingAddress?: {
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  seller: {
    id: string;
    name: string;
    phone: string;
  };
  // Payment information
  paymentStatus?: string;
  paymentMethod?: string;
  paymentReference?: string;
  paidAt?: string;
}

export interface OrdersResponse {
  orders: Order[];
  hasMore: boolean;
  total: number;
  page: number;
}

export interface UpdateOrderStatusRequest {
  status: string;
  notes?: string;
}

export interface UpdateOrderPricingRequest {
  shippingAmount?: number;
  discountAmount?: number;
  notes?: string;
}

export const orderService = {
  async getMyOrders(page: number = 1, limit: number = 20): Promise<OrdersResponse> {
    const api = getApi();
    const res = await api.get(`/orders/my-orders?page=${page}&limit=${limit}`);
    return res.data;
  },

  async getCustomerOrders(page: number = 1, limit: number = 20): Promise<OrdersResponse> {
    const api = getApi();
    const res = await api.get(`/orders/customer-orders?page=${page}&limit=${limit}`);
    return res.data;
  },

  async getOrderById(orderId: string): Promise<Order> {
    const api = getApi();
    const res = await api.get(`/orders/${orderId}`);
    return res.data;
  },

  async updateOrderStatus(orderId: string, data: UpdateOrderStatusRequest): Promise<Order> {
    const api = getApi();
    const res = await api.patch(`/orders/${orderId}/status`, data);
    return res.data;
  },

  async updateOrderPricing(orderId: string, data: UpdateOrderPricingRequest): Promise<Order> {
    const api = getApi();
    const res = await api.patch(`/orders/${orderId}/pricing`, data);
    return res.data;
  },

  async updateOrderDeliveryPricing(orderId: string, data: { deliveryType?: string; shippingMethod?: string; customPrice?: number; customCurrency?: string; deliveryOptionId?: string }): Promise<Order> {
    const api = getApi();
    const res = await api.patch(`/orders/${orderId}/delivery-pricing`, data);
    return res.data;
  },

  async updateOrderDiscount(orderId: string, data: { discountAmount: number; currency: string }): Promise<Order> {
    const api = getApi();
    const res = await api.patch(`/orders/${orderId}/discount`, data);
    return res.data;
  },

  async getOrderDeliveryOptions(productId: string): Promise<any[]> {
    const api = getApi();
    const res = await api.get(`/products/${productId}/delivery-options`);
    return res.data;
  },

  async exportOrdersPDF(startDate: string, endDate: string, type: 'my-orders' | 'customer-orders'): Promise<Blob> {
    const api = getApi();
    const res = await api.get(`/orders/export/pdf?startDate=${startDate}&endDate=${endDate}&type=${type}`, {
      responseType: 'blob'
    });
    return res.data;
  }
};
