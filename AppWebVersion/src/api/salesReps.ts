import { getApi } from './config';

export interface SalesRep {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  branchName: string;
  branchId: string;
  branchLocation?: string;
  parentSellerId: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
  updatedAt: string;
  inheritedKyc?: {
    businessName: string;
    businessType: string;
    address: string;
    city: string;
    state: string;
    country: string[];
    postalCode: string;
  } | null;
}

export interface SalesRepStats {
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  totalProducts: number;
  averageRating: number;
  ratingCount: number;
}

export interface ParentSellerAnalytics {
  totalStats: SalesRepStats & { revenueCurrency: string };
  currencyBreakdown: {
    primaryCurrencyCode: string;
    primaryCurrencyTotal: number;
    otherCurrencyCodes: string[];
  };
  salesReps: Array<{
    salesRepId: string;
    salesRepName: string;
    stats: SalesRepStats;
  }>;
  aggregatedData: any;
}

export const salesRepService = {
  async getSalesRepByUser(): Promise<SalesRep> {
    const api = getApi();
    const res = await api.get('/sales-reps/by-user');
    return res.data;
  },
  async getSalesReps(): Promise<SalesRep[]> {
    const api = getApi();
    const res = await api.get('/sales-reps');
    return res.data;
  },
  async createSalesRep(payload: {
    firstName: string;
    middleName?: string;
    lastName: string;
    phoneNumber: string;
    branchId: string;
    pin: string;
  }): Promise<SalesRep> {
    const api = getApi();
    const res = await api.post('/sales-reps', payload);
    return res.data;
  },
  async deleteSalesRep(salesRepId: string): Promise<void> {
    const api = getApi();
    await api.delete(`/sales-reps/${salesRepId}`);
  },
  async getSalesRepStatusCached(userId: string): Promise<{ isSalesRep: boolean; salesRepData: SalesRep | null }> {
    try {
      const salesRep = await this.getSalesRepByUser();
      return { isSalesRep: true, salesRepData: salesRep };
    } catch (error) {
      return { isSalesRep: false, salesRepData: null };
    }
  },
  async getParentSellerAnalytics(
    period: 'daily' | 'weekly' | 'monthly' | 'yearly',
    startDate?: string,
    endDate?: string
  ): Promise<ParentSellerAnalytics> {
    const api = getApi();
    const params = new URLSearchParams({
      period,
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
    });
    
    const response = await api.get(`/sales-reps/analytics/parent?${params}`);
    return response.data;
  },
  async getRecentActivity(params: { limit?: number; cursor?: string; type?: 'product' | 'order' }): Promise<{
    items: Array<{
      id: string;
      type: 'product' | 'order';
      createdAt: string;
      rep: { id: string; userId: string; name: string } | null;
      data: any;
    }>;
    nextCursor: string | null;
  }> {
    const api = getApi();
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.cursor) queryParams.append('cursor', params.cursor);
    if (params.type) queryParams.append('type', params.type);
    
    const response = await api.get(`/sales-reps/activity/recent?${queryParams}`);
    return response.data;
  },
};


