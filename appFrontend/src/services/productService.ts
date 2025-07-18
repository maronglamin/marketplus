import { api } from '../api/api';

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  currencyCode: string;
  quantity: number;
  condition: string;
  status: string;
  categoryId: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  createdAt: string;
  updatedAt: string;
  images: {
    id: string;
    imageUrl: string;
    isPrimary: boolean;
  }[];
  views: number;
  favorites: number;
  orderCount?: number;
  rating?: number;
  ratingCount: number;
  metadata?: {
    features?: string[];
  };
}

export interface ProductListResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface CustomerProduct {
  id: string;
  name: string;
  price: number;
  currencyCode: string;
  image: string | null;
  seller: string;
  stock: number;
  views: number;
  rating: number | null;
  ratingCount: number;
  condition: string;
  category: string;
  description: string;
  createdAt: string;
  isFeatured: boolean;
}

export interface CustomerProductListResponse {
  products: CustomerProduct[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ProductDetail {
  id: string;
  name: string;
  price: number;
  currencyCode: string;
  rating: number | null;
  ratingCount: number;
  description: string;
  images: string[];
  seller: {
    name: string;
    rating: number | null;
    products: number;
    image: string | null;
  };
  stock: number;
  condition: string;
  category: string;
  views: number;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SellerStats {
  totalProducts: number;
  activeProducts: number;
  totalSales: number;
  pendingOrders: number;
  totalRevenue: number;
  revenueCurrency: string;
  hasOtherCurrencies: boolean;
}

export interface RevenueBreakdown {
  totalRevenue: number;
  revenueByCurrency: Array<{
    currency: string;
    amount: number;
    percentage: number;
  }>;
}

export const productService = {
  async getSellerProducts(page: number = 1, limit: number = 10): Promise<ProductListResponse> {
    const response = await api.get(`/api/products/seller?page=${page}&limit=${limit}`);
    return response.data;
  },

  async getSellerStats(): Promise<SellerStats> {
    const response = await api.get('/api/products/seller/stats')
    return response.data
  },

  async getSellerRevenue(): Promise<RevenueBreakdown> {
    const response = await api.get('/api/products/seller/revenue')
    return response.data
  },

  async getCustomerProducts(page: number = 1, limit: number = 10, categoryId?: string, search?: string): Promise<CustomerProductListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    if (categoryId) {
      params.append('categoryId', categoryId);
    }
    
    if (search) {
      params.append('search', search);
    }
    
    const response = await api.get(`/api/products/customer?${params.toString()}`);
    return response.data;
  },

  async getFeaturedProducts(limit: number = 4, page: number = 1): Promise<CustomerProductListResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      page: page.toString()
    });
    
    const response = await api.get(`/api/products/featured?${params.toString()}`);
    return response.data;
  },

  async getProductById(productId: string, allowOwn: boolean = false): Promise<ProductDetail> {
    const params = new URLSearchParams();
    if (allowOwn) {
      params.append('allowOwn', 'true');
    }
    
    const response = await api.get(`/api/products/${productId}?${params.toString()}`);
    return response.data;
  },

  async getSellerProductById(productId: string): Promise<Product> {
    const response = await api.get(`/api/products/seller/${productId}`);
    return response.data;
  },

  async updateProductStatus(productId: string, status: string): Promise<Product> {
    const response = await api.patch(`/api/products/${productId}/status`, { status });
    return response.data;
  },

  async deleteProduct(productId: string): Promise<void> {
    await api.delete(`/api/products/${productId}`);
  },

  async updateProduct(productId: string, data: Partial<Product>): Promise<Product> {
    const response = await api.patch(`/api/products/${productId}`, data);
    return response.data;
  },

  async getDeliveryOptions(productId: string): Promise<any[]> {
    const response = await api.get(`/api/products/${productId}/delivery-options`);
    return response.data;
  },
}; 