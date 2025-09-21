import { getApi } from './config';

export interface Branch {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phoneNumber?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

export const branchService = {
  async getBranches(): Promise<Branch[]> {
    const api = getApi();
    const res = await api.get('/branches');
    return res.data;
  },
  async createBranch(payload: {
    name: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    phoneNumber?: string;
    email?: string;
  }): Promise<Branch> {
    const api = getApi();
    const res = await api.post('/branches', payload);
    return res.data;
  },
};


