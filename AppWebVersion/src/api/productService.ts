import { getApi } from './config';

const api = getApi();

export interface RevenueBreakdown {
  totalRevenue: number;
  revenueByCurrency: Array<{
    currency: string;
    amount: number;
    percentage: number;
  }>;
}

export class ProductService {
  /**
   * Get seller revenue breakdown by currency
   */
  async getSellerRevenue(): Promise<RevenueBreakdown> {
    const res = await api.get('/products/seller/revenue');
    return res.data;
  }
}

export const productService = new ProductService();
