import { api } from './api';
import { MapLocation } from '../components/GoogleMapView';

export interface CreateRideRequestData {
  pickupLocation: MapLocation;
  destinationLocation: MapLocation;
  rideType?: 'STANDARD' | 'PREMIUM' | 'POOL' | 'DELIVERY';
  rideServiceId?: string;
  estimatedPrice?: number;
  estimatedDistance?: number;
  estimatedDuration?: number;
  currency?: string;
  currencySymbol?: string;
  paymentMethod?: 'CASH' | 'CARD' | 'MOBILE_MONEY' | 'WALLET';
  customerNotes?: string;
  driverId?: string; // For direct driver requests
}

export interface RideRequest {
  id: string;
  requestId: string;
  pickupLocation: MapLocation;
  destinationLocation: MapLocation;
  estimatedDistance: number;
  estimatedDuration: number;
  estimatedPrice: number;
  currency?: string;
  currencySymbol?: string;
  status: 'REQUESTED' | 'ACCEPTED' | 'ARRIVING' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
  paymentMethod: string;
  customerNotes?: string;
  requestedAt: string;
  expiresAt: string;
  rideServiceId?: string;
  driver?: {
    id: string;
    driverId: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      phoneNumber: string;
    };
    rating?: number;
    vehicleInfo?: any;
  } | null;
}

export interface RecentDestination {
  id: string;
  rideId: string;
  requestId: string;
  pickupLocation: MapLocation;
  destinationLocation: MapLocation;
  totalFare: number;
  currency: string;
  currencySymbol: string;
  completedAt: string;
}

export interface CustomerRideHistory {
  id: string;
  rideId: string;
  requestId: string;
  driverName: string;
  driverPhone?: string;
  customerNotes?: string;
  pickupLocation: MapLocation;
  destinationLocation: MapLocation;
  status: string;
  totalFare: number;
  currency: string;
  currencySymbol: string;
  distance?: number;
  duration?: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  customerRating?: number;
  customerReview?: string;
  hasToken: boolean;
  isTokenUsed: boolean;
  token?: string;
  tokenExpiresAt?: string;
}

export interface NearbyDriver {
  id: string;
  driverId: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
  rating?: number;
  vehicleInfo?: any;
  currentLocation?: MapLocation;
  riderApplication?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phoneNumber: string;
    dateOfBirth?: string;
    address: string;
    city: string;
    licenseNumber: string;
    licenseExpiry: string;
    vehicleModel: string;
    vehiclePlate: string;
    insuranceNumber?: string;
    insuranceExpiry?: string;
    emergencyContact?: string;
    emergencyPhone?: string;
    experience?: string;
    availability?: string;
    vehicleType: 'DRIVER' | 'MOTORCYCLE' | 'BICYCLE';
    status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  };
  driverLocation?: {
    address?: string;
    latitude: number;
    longitude: number;
    timestamp: string;
  } | null;
}

export class RideRequestService {
  /**
   * Create a new ride request
   */
  static async createRideRequest(data: CreateRideRequestData): Promise<RideRequest> {
    try {
      const response = await api.post('/api/ride-requests', data);
      return response.data.data;
    } catch (error) {
      console.error('Error creating ride request:', error);
      throw error;
    }
  }

  /**
   * Create a direct driver request
   */
  static async createDirectDriverRequest(data: CreateRideRequestData): Promise<RideRequest> {
    try {
      console.log('🚀 Frontend: Calling createDirectDriverRequest with data:', {
        driverId: data.driverId,
        pickupLocation: data.pickupLocation,
        destinationLocation: data.destinationLocation,
        estimatedPrice: data.estimatedPrice
      });
      
      const response = await api.post('/api/ride-requests/direct-driver', data);
      
      console.log('✅ Frontend: Direct driver request response:', response.data);
      
      return response.data.data;
    } catch (error) {
      console.error('❌ Frontend: Error creating direct driver request:', error);
      throw error;
    }
  }

  /**
   * Get ride request by request ID
   */
  static async getRideRequest(requestId: string): Promise<RideRequest> {
    try {
      const response = await api.get(`/api/ride-requests/${requestId}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting ride request:', error);
      throw error;
    }
  }

  /**
   * Get customer's active ride requests
   */
  static async getCustomerActiveRideRequests(): Promise<RideRequest[]> {
    try {
      const response = await api.get('/api/ride-requests/customer/active');
      return response.data.data;
    } catch (error) {
      console.error('Error getting customer ride requests:', error);
      throw error;
    }
  }

  /**
   * Cancel ride request
   */
  static async cancelRideRequest(requestId: string, reason?: string): Promise<RideRequest> {
    try {
      const response = await api.post(`/api/ride-requests/${requestId}/cancel`, { reason });
      return response.data.data;
    } catch (error) {
      console.error('Error cancelling ride request:', error);
      throw error;
    }
  }

  /**
   * Get nearby drivers
   */
  static async getNearbyDrivers(latitude: number, longitude: number, maxDistance: number = 5): Promise<NearbyDriver[]> {
    try {
      const response = await api.get('/api/ride-requests/nearby-drivers', {
        params: { latitude, longitude, maxDistance }
      });
      return response.data.data;
    } catch (error) {
      console.error('Error getting nearby drivers:', error);
      throw error;
    }
  }

  /**
   * Poll ride request status (for real-time updates)
   */
  static async pollRideRequestStatus(requestId: string): Promise<RideRequest> {
    try {
      const response = await api.get(`/api/ride-requests/${requestId}`);
      return response.data.data;
    } catch (error) {
      console.error('Error polling ride request status:', error);
      throw error;
    }
  }

  /**
   * Get online drivers for map display
   */
  static async getOnlineDrivers(latitude: number, longitude: number, maxDistance: number = 10): Promise<NearbyDriver[]> {
    try {
      const response = await api.get('/api/ride-requests/online-drivers/map', {
        params: { latitude, longitude, maxDistance }
      });
      return response.data.data;
    } catch (error) {
      console.error('Error getting online drivers:', error);
      throw error;
    }
  }

  /**
   * Get customer's recent destinations
   */
  static async getRecentDestinations(limit: number = 3): Promise<RecentDestination[]> {
    try {
      const response = await api.get(`/api/ride-history/customer/recent-destinations?limit=${limit}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting recent destinations:', error);
      throw error;
    }
  }

  /**
   * Get customer's ride history
   */
  static async getCustomerRideHistory(page: number = 1, limit: number = 20, status?: string): Promise<{
    rides: CustomerRideHistory[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (status) {
        params.append('status', status);
      }
      
      const response = await api.get(`/api/ride-history/customer?${params.toString()}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting customer ride history:', error);
      throw error;
    }
  }
} 