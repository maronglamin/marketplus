import { ENV_CONFIG } from '../config/env';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  parentId?: string;
}

class CategoryService {
  private baseUrl = ENV_CONFIG.API_BASE_URL;

  async getCategories(): Promise<Category[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/products/categories`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.status}`);
      }
      
      const categories = await response.json();
      return categories;
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }
}

export const categoryService = new CategoryService();
