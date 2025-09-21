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
};


