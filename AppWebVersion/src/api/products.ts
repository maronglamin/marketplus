import { getApi } from './config';

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

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  parentId?: string;
}

export const productService = {
  async getPopularProducts(page: number = 1, limit: number = 30): Promise<CustomerProductListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    const response = await getApi().get(`/products/popular?${params.toString()}`);
    return response.data;
  },

  async getFeaturedProducts(limit: number = 30, page: number = 1): Promise<CustomerProductListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    const response = await getApi().get(`/products/featured?${params.toString()}`);
    return response.data;
  },

  async getCustomerProducts(page: number = 1, limit: number = 30, categoryId?: string, search?: string): Promise<CustomerProductListResponse> {
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
    
    const response = await getApi().get(`/products/customer?${params.toString()}`);
    return response.data;
  },

  async getProductById(productId: string): Promise<any> {
    const response = await getApi().get(`/products/${productId}`);
    return response.data;
  }
};

export const categoryService = {
  async getCategories(): Promise<Category[]> {
    try {
      const response = await getApi().get('/products/categories');
      return response.data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }
};
