import { api } from './api';

export interface RideHistoryItem {
  id: string;
  rideId: string;
  requestId: string;
  customerName: string;
  customerPhone: string;
  customerNotes?: string;
  pickupLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  destinationLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  status: 'REQUESTED' | 'ACCEPTED' | 'ARRIVING' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
  totalFare: number;
  driverEarnings: number;
  currency: string;
  currencySymbol: string;
  distance?: number;
  duration?: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  hasToken: boolean;
  token?: string;
  isTokenUsed: boolean;
  tokenExpiresAt?: string;
}

export interface RideHistoryResponse {
  rides: RideHistoryItem[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

export interface TokenResponse {
  token: string;
  expiresAt: string;
  message: string;
  driverName: string;
  customerId: string;
  customerName: string;
}

export class RideHistoryService {
  /**
   * Get driver's ride history
   */
  static async getDriverRideHistory(
    page: number = 1,
    limit: number = 20,
    status?: string
  ): Promise<RideHistoryResponse> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (status) {
        params.append('status', status);
      }

      const response = await api.get(`/api/ride-history/driver?${params}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting ride history:', error);
      throw error;
    }
  }

  /**
   * Generate token for a ride
   */
  static async generateRideToken(rideId: string): Promise<TokenResponse> {
    try {
      const response = await api.post(`/api/ride-history/rides/${rideId}/generate-token`);
      return response.data.data;
    } catch (error) {
      console.error('Error generating ride token:', error);
      throw error;
    }
  }

  /**
   * Start ride with token validation
   */
  static async startRide(rideId: string, token: string): Promise<any> {
    try {
      console.log('RideHistoryService.startRide called with:', {
        rideId,
        token,
        tokenLength: token.length,
        tokenType: typeof token
      });

      const requestData = { token };
      console.log('Sending request data:', requestData);

      const response = await api.post(`/api/ride-history/rides/${rideId}/start`, requestData);
      
      console.log('Start ride response:', response.data);
      return response.data.data;
    } catch (error) {
      console.error('Error starting ride:', error);
      console.error('Error response:', {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message
      });
      throw error;
    }
  }

  /**
   * Get ride details
   */
  static async getRideDetails(rideId: string): Promise<RideHistoryItem> {
    try {
      const response = await api.get(`/api/ride-history/rides/${rideId}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting ride details:', error);
      throw error;
    }
  }

  /**
   * Complete ride
   */
  static async completeRide(rideId: string): Promise<any> {
    try {
      const response = await api.post(`/api/ride-history/rides/${rideId}/complete`);
      return response.data.data;
    } catch (error) {
      console.error('Error completing ride:', error);
      throw error;
    }
  }

  /**
   * Cancel ride
   */
  static async cancelRide(rideId: string, reason?: string): Promise<any> {
    try {
      const response = await api.post(`/api/ride-history/rides/${rideId}/cancel`, { reason });
      return response.data.data;
    } catch (error) {
      console.error('Error cancelling ride:', error);
      throw error;
    }
  }
} 