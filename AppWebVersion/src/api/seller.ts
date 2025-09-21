import { getApi } from './config';

export interface SellerStatsResponse {
  totalProducts: number;
  activeProducts: number;
  totalSales: number;
  pendingOrders: number;
  totalOrders?: number;
  totalRevenue: number;
  revenueCurrency: string;
  hasOtherCurrencies: boolean;
}

export const sellerService = {
  async getSellerStats(): Promise<SellerStatsResponse> {
    const api = getApi();
    const res = await api.get('/products/seller/stats');
    return res.data as SellerStatsResponse;
  },
  async getSellerProducts(page: number = 1, limit: number = 9): Promise<{
    products: Array<{
      id: string;
      title: string;
      price: number;
      currencyCode: string;
      quantity: number;
      views: number;
      orderCount: number;
      images: Array<{ imageUrl: string; isPrimary: boolean }>;
      category?: { id: string; name: string; slug: string } | null;
      status: string;
      createdAt: string;
    }>;
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }> {
    const api = getApi();
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    const res = await api.get(`/products/seller?${params.toString()}`);
    return res.data;
  },
  async getSellerProductById(productId: string): Promise<any> {
    const api = getApi();
    const res = await api.get(`/products/seller/${productId}`);
    return res.data;
  },
  async updateSellerProductStock(productId: string, quantity: number): Promise<any> {
    const api = getApi();
    const res = await api.patch(`/products/${productId}`, { quantity });
    return res.data;
  },
  async createProduct(payload: {
    title: string;
    description?: string;
    price: number;
    currencyCode: string;
    quantity: number;
    categoryId?: string | null;
    condition: string;
    status: string;
    images: Array<{ imageUrl: string; isPrimary: boolean; width?: number; height?: number; size?: number; format?: string }>;
    attributes?: Array<{ key: string; value: string; unit?: string; isFilterable?: boolean }>;
    metadata?: Record<string, any>;
  }): Promise<any> {
    const api = getApi();
    const res = await api.post('/products', payload);
    return res.data;
  },
};


