import { api } from './api';
import { MapLocation } from '../components/GoogleMapView';
import { rateLimitedFetch, debounce, throttle } from '../utils/rateLimiter';

export interface DriverStats {
  totalRides: number;
  totalEarnings: number;
  rating: number;
  onlineHours: number;
  todayEarnings: number;
  todayCurrency: string;
  weeklyEarnings: number;
  monthlyEarnings: number;
  currency: string;
  currencySymbol: string;
  todayRidesCount: number;
  todayRidesWithRatings: number;
  todayOnlineHours: number;
}

export interface RideRequest {
  id: string;
  requestId: string;
  customerId: string;
  pickupLocation: MapLocation;
  destinationLocation: MapLocation;
  estimatedDistance: number;
  estimatedDuration: number;
  estimatedPrice: number;
  rideType: string;
  customerNotes?: string;
  requestedAt: Date;
  expiresAt: Date;
  customer: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    rating?: number;
  };
}

export interface DriverLocation {
  latitude: number;
  longitude: number;
  address?: string;
  accuracy?: number;
  speed?: number;
  heading?: number;
}

export class DriverService {
  // Get driver profile
  async getDriverProfile() {
    try {
      return await rateLimitedFetch('/api/driver/profile', () => api.get('/api/driver/profile'));
    } catch (error) {
      console.error('Error getting driver profile:', error);
      throw error;
    }
  }

  // Update driver online/offline status
  async updateDriverStatus(isOnline: boolean, location?: DriverLocation) {
    try {
      // Convert boolean to status string as expected by backend
      const status = isOnline ? 'ONLINE' : 'OFFLINE';
      const requestBody: any = { status };
      if (location) {
        requestBody.location = location;
      }
      
      return await rateLimitedFetch('/api/driver/status', () => api.post('/api/driver/status', requestBody));
    } catch (error) {
      console.error('Error updating driver status:', error);
      throw error;
    }
  }

  // Update driver location
  async updateDriverLocation(location: DriverLocation) {
    try {
      // Use the correct endpoint that exists in the backend
      return await rateLimitedFetch('/api/driver/location/update', () => api.post('/api/driver/location/update', {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        speed: location.speed,
        heading: location.heading
      }));
    } catch (error) {
      console.error('Error updating driver location:', error);
      throw error;
    }
  }

  // Smart update driver location with throttling
  async smartUpdateDriverLocation(location: DriverLocation, forceUpdate: boolean = false) {
    try {
      // Use the correct endpoint that exists in the backend
      return await rateLimitedFetch('/api/driver/location/update', () => api.post('/api/driver/location/update', {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        speed: location.speed,
        heading: location.heading
      }));
    } catch (error) {
      console.error('Error in smart location update:', error);
      throw error;
    }
  }

  /**
   * Get nearby ride requests for drivers
   */
  static async getNearbyRideRequests(
    latitude: number,
    longitude: number,
    maxDistance: number = 5
  ): Promise<any[]> {
    try {
      console.log('🔍 Getting nearby ride requests for driver...');
      
      const response = await rateLimitedFetch('/api/ride-requests/nearby-requests', () => 
        api.get('/api/ride-requests/nearby-requests', {
          params: {
            latitude,
            longitude,
            maxDistance
          }
        })
      );

      console.log('📊 Nearby ride requests response:', response.data);

      if (response.data.success) {
        return response.data.data || [];
      } else {
        throw new Error(response.data.message || 'Failed to get nearby ride requests');
      }
    } catch (error) {
      console.error('❌ Error getting nearby ride requests:', error);
      throw error;
    }
  }

  /**
   * Get direct ride requests sent specifically to this driver
   */
  static async getDirectDriverRequests(): Promise<any[]> {
    try {
      console.log('🎯 Getting direct driver requests...');
      
      const response = await rateLimitedFetch('/api/ride-requests/direct-driver-requests', () => 
        api.get('/api/ride-requests/direct-driver-requests')
      );

      console.log('📊 Direct driver requests response:', response.data);

      if (response.data.success) {
        return response.data.data || [];
      } else {
        throw new Error(response.data.message || 'Failed to get direct driver requests');
      }
    } catch (error) {
      console.error('❌ Error getting direct driver requests:', error);
      throw error;
    }
  }

  // Accept ride request
  async acceptRideRequest(requestId: string) {
    try {
      console.log('🚗 Accepting ride request:', requestId);
      
      const response = await rateLimitedFetch(`/api/ride-requests/${requestId}/accept`, () => 
        api.post(`/api/ride-requests/${requestId}/accept`)
      );
      
      console.log('✅ Accept ride request response:', response.data);
      
      // Check if the response indicates success
      if (response.data.success) {
        return response.data;
      } else {
        throw new Error(response.data.message || 'Failed to accept ride request');
      }
    } catch (error: any) {
      console.error('❌ Error accepting ride request:', error);
      console.error('❌ Error details:', {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message
      });
      throw error;
    }
  }

  // Helper method to get current driver ID from token
  private async getCurrentDriverId(): Promise<string> {
    try {
      const response = await rateLimitedFetch('/api/driver/profile', () => api.get('/api/driver/profile'));
      return response.data.data.id;
    } catch (error) {
      console.error('Error getting driver ID:', error);
      throw error;
    }
  }

  // Reject ride request
  async rejectRideRequest(requestId: string, reason?: string) {
    try {
      return await rateLimitedFetch(`/api/driver/reject-request/${requestId}`, () => 
        api.post(`/api/driver/reject-request/${requestId}`, { reason })
      );
    } catch (error) {
      console.error('Error rejecting ride request:', error);
      throw error;
    }
  }

  // Get driver statistics
  async getDriverStats(period: string = 'TODAY'): Promise<DriverStats> {
    try {
      const response = await rateLimitedFetch('/api/driver/stats', () => 
        api.get('/api/driver/stats', {
          params: { period }
        })
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to get driver stats');
      }
    } catch (error) {
      console.error('Error getting driver stats:', error);
      // Return fallback data if API fails
      return {
        totalRides: 0,
        totalEarnings: 0,
        rating: 0,
        onlineHours: 0,
        todayEarnings: 0,
        todayCurrency: 'GMD',
        weeklyEarnings: 0,
        monthlyEarnings: 0,
        currency: 'GMD',
        currencySymbol: 'D',
        todayRidesCount: 0,
        todayRidesWithRatings: 0,
        todayOnlineHours: 0,
      };
    }
  }

  // Get driver earnings by period
  async getDriverEarnings(period: string = 'TODAY'): Promise<any> {
    try {
      const response = await rateLimitedFetch('/api/driver/earnings', () => 
        api.get('/api/driver/earnings', {
          params: { period }
        })
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to get driver earnings');
      }
    } catch (error: any) {
      console.error('Error getting driver earnings:', error);
      throw error;
    }
  }

  // Get available settlement amount
  async getAvailableSettlementAmount(): Promise<any> {
    try {
      const response = await rateLimitedFetch('/api/driver/settlements/available', () => 
        api.get('/api/driver/settlements/available')
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to get available settlement amount');
      }
    } catch (error: any) {
      console.error('Error getting available settlement amount:', error);
      throw error;
    }
  }

  // Get settlement history
  async getSettlementHistory(page: number = 1, limit: number = 20): Promise<any> {
    try {
      const response = await rateLimitedFetch('/api/driver/settlements', () => 
        api.get('/api/driver/settlements', {
          params: { page, limit }
        })
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to get settlement history');
      }
    } catch (error: any) {
      console.error('Error getting settlement history:', error);
      throw error;
    }
  }

  // Get settlement details
  async getSettlementDetails(settlementId: string): Promise<any> {
    try {
      const response = await rateLimitedFetch(`/api/driver/settlements/${settlementId}`, () => 
        api.get(`/api/driver/settlements/${settlementId}`)
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to get settlement details');
      }
    } catch (error: any) {
      console.error('Error getting settlement details:', error);
      throw error;
    }
  }

  // Request settlement
  async requestSettlement(settlementData: {
    amount: number;
    paymentMethod: 'BANK_TRANSFER' | 'WALLET_TRANSFER';
    bankAccountId?: string;
    walletId?: string;
  }): Promise<any> {
    try {
      const response = await rateLimitedFetch('/api/driver/settlements/request', () => 
        api.post('/api/driver/settlements/request', settlementData)
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to request settlement');
      }
    } catch (error: any) {
      console.error('Error requesting settlement:', error);
      throw error;
    }
  }

  // Get active ride
  async getActiveRide() {
    try {
      return await rateLimitedFetch('/api/driver/active-ride', () => api.get('/api/driver/active-ride'));
    } catch (error) {
      console.error('Error getting active ride:', error);
      throw error;
    }
  }

  // Update ride status
  async updateRideStatus(rideId: string, status: string) {
    try {
      return await rateLimitedFetch(`/api/driver/ride/${rideId}/status`, () => 
        api.post(`/api/driver/ride/${rideId}/status`, { status })
      );
    } catch (error) {
      console.error('Error updating ride status:', error);
      throw error;
    }
  }

  // Add ride location update
  async addRideLocationUpdate(rideId: string, location: DriverLocation) {
    try {
      return await rateLimitedFetch(`/api/driver/ride/${rideId}/location`, () => 
        api.post(`/api/driver/ride/${rideId}/location`, location)
      );
    } catch (error) {
      console.error('Error adding ride location update:', error);
      throw error;
    }
  }

  // Rate ride
  async rateRide(rideId: string, rating: number, review?: string) {
    try {
      return await rateLimitedFetch(`/api/driver/ride/${rideId}/rate`, () => 
        api.post(`/api/driver/ride/${rideId}/rate`, { rating, review })
      );
    } catch (error) {
      console.error('Error rating ride:', error);
      throw error;
    }
  }
}

export const driverService = new DriverService(); 