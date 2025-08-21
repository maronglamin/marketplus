import { api } from '../api/api';

export interface UserProfileData {
  user: {
    id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    fullName: string;
    phoneNumber: string;
    createdAt: string;
    updatedAt: string;
  };
  accountInfo: {
    type: string;
    status: string;
    verificationStatus: string;
    isSeller: boolean;
    isDriver: boolean;
    sellerKycStatus: string | null;
    driverStatus: string | null;
    driverIsOnline: boolean;
  };
  sellerKyc: {
    id: string;
    status: string;
    businessName: string;
    businessType: string;
    verifiedAt: string | null;
    rejectionReason: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  driver: {
    id: string;
    driverId: string;
    isOnline: boolean;
    status: string;
    isVerified: boolean;
    isActive: boolean;
    totalRides: number;
    totalEarnings: string;
    rating: string | null;
    ratingCount: number;
    createdAt: string;
    updatedAt: string;
  } | null;
}

export const userService = {
  async getUserProfile(): Promise<UserProfileData> {
    try {
      console.log('🔄 userService: Fetching user profile...')
      const response = await api.get('/api/users/profile')
      console.log('✅ userService: Profile response:', response.data)
      return response.data
    } catch (error: any) {
      console.error('❌ userService: Error fetching user profile:', error)
      if (error.response) {
        console.error('❌ userService: Response status:', error.response.status)
        console.error('❌ userService: Response data:', error.response.data)
      }
      throw error
    }
  },

  async getBasicUserInfo() {
    try {
      console.log('🔄 userService: Fetching basic user info...')
      const response = await api.get('/api/users/me')
      console.log('✅ userService: Basic user info:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ userService: Error fetching basic user info:', error)
      throw error
    }
  }
};
