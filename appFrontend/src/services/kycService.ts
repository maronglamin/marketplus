import getApi from '../api/config';
import axios from 'axios';

export interface SellerKycData {
  businessName: string;
  businessType: string;
  registrationNumber?: string;
  taxId?: string;
  address: string;
  city: string;
  state: string;
  countries: string[]; // Array of country codes
  postalCode: string;
  documentType: string;
  documentNumber: string;
  documentUrl: string | null;
  documentExpiryDate: string;
}

export interface SellerKycResponse {
  id: string;
  userId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  rejectionReason?: string;
  businessName?: string;
  businessType?: string;
  registrationNumber?: string;
  taxId?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string[];
  postalCode?: string;
  documentType?: string;
  documentNumber?: string;
  documentUrl?: string;
  documentExpiryDate?: string;
  createdAt: string;
  updatedAt: string;
  verifiedAt?: string | null;
}

const MAX_RETRIES = 3;
const TIMEOUT = 30000; // 30 seconds

export const kycService = {
  async getKycStatus(): Promise<SellerKycResponse> {
    let lastError;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`Attempting to fetch KYC status (attempt ${attempt}/${MAX_RETRIES})`);
        const api = await getApi();
        const response = await api.get('/seller-kyc', {
          timeout: TIMEOUT,
        });

        // Validate response data
        if (!response.data) {
          console.error('Empty response data received');
          throw new Error('Invalid response: Empty data');
        }

        // Check if response has required fields
        if (!response.data.status || !response.data.userId) {
          console.error('Invalid response format:', response.data);
          throw new Error('Invalid response: Missing required fields');
        }

        console.log('KYC Response:', {
          status: response.data.status,
          userId: response.data.userId,
          hasRejectionReason: !!response.data.rejectionReason,
          hasBusinessName: !!response.data.businessName
        });

        return response.data;
      } catch (error) {
        lastError = error;
        
        if (axios.isAxiosError(error)) {
          console.error(`Error in getKycStatus (attempt ${attempt}/${MAX_RETRIES}):`, {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
          });

          // If it's a 404, don't retry
          if (error.response?.status === 404) {
            throw error;
          }
        } else {
          console.error(`Error in getKycStatus (attempt ${attempt}/${MAX_RETRIES}):`, error);
        }
        
        // If it's not the last attempt, wait before retrying
        if (attempt < MAX_RETRIES) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // If all retries failed, throw the last error
    throw lastError;
  },
  async getKycStatusByUser(userId: string): Promise<SellerKycResponse> {
    const api = await getApi();
    const response = await api.get(`/seller-kyc/by-user/${userId}`, { timeout: TIMEOUT });
    if (!response.data || !response.data.status || !response.data.userId) {
      throw new Error('Invalid response: Missing required fields');
    }
    return response.data;
  },

  async submitKyc(data: SellerKycData): Promise<SellerKycResponse> {
    try {
      const api = await getApi();
      const response = await api.post('/seller-kyc/submit', data);
      
      // Validate response
      if (!response.data || !response.data.status) {
        throw new Error('Invalid response from server');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error submitting KYC:', error);
      throw error;
    }
  },

  async updateKyc(data: SellerKycData): Promise<SellerKycResponse> {
    try {
      const api = await getApi();
      const response = await api.put('/seller-kyc/submit', data);
      
      // Validate response
      if (!response.data || !response.data.status) {
        throw new Error('Invalid response from server');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error updating KYC:', error);
      throw error;
    }
  },
}; 