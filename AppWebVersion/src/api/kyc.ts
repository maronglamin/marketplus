import { getApi } from './config';

export interface SellerKycResponse {
  id: string;
  userId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  rejectionReason?: string;
  businessName?: string;
  createdAt: string;
  updatedAt: string;
}

export const kycService = {
  async getKycStatus(): Promise<SellerKycResponse> {
    const api = getApi();
    const res = await api.get('/seller-kyc');
    return res.data;
  },
  async getKycStatusByUser(userId: string): Promise<SellerKycResponse> {
    const api = getApi();
    const res = await api.get(`/seller-kyc/by-user/${userId}`);
    return res.data;
  },
  async submitKyc(data: any): Promise<SellerKycResponse> {
    const api = getApi();
    const res = await api.post('/seller-kyc/submit', data);
    return res.data;
  },
};


