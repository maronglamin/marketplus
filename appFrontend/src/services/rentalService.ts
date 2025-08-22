import { ENV_CONFIG } from '../config/env';
import { api } from '../api/api';

export interface RentalRideService {
  id: string;
  serviceId: string;
  name: string;
  description?: string;
  vehicleType: string;
  isActive: boolean;
  isRentalType: boolean;
  baseFare: string;
  perKmRate: string;
  perMinuteRate: string;
  minimumFare: string;
  currency: string;
  currencySymbol: string;
  features?: any;
  restrictions?: any;
}

export interface RentalDriver {
  id: string;
  userId: string;
  driverId: string;
  isOnline: boolean;
  status: string;
  totalRides: number;
  totalEarnings: string;
  rating?: string;
  ratingCount: number;
  isVerified: boolean;
  isActive: boolean;
  isRentalType: boolean;
  rideService: {
    id: string;
    name: string;
    description?: string;
  } | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
  };
  riderApplication: {
    id: string;
    firstName?: string;
    lastName?: string;
    address?: string;
    vehicleModel: string;
    vehicleType?: string;
    licensePlate: string;
    documents?: Array<{
      id: string;
      documentType: string;
      fileUrl: string;
      fileName: string;
      uploadedAt: string;
    }>;
  };
  documents: {
    id: string;
    documentType: string;
    documentUrl: string;
    uploadedAt: string;
  }[];
}

class RentalService {

  /**
   * Get all rental ride services
   */
  async getRentalServices(): Promise<RentalRideService[]> {
    try {
      const response = await api.get('/api/ride-services/rental');
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching rental services:', error);
      throw new Error('Failed to fetch rental services');
    }
  }

  /**
   * Get drivers for a specific rental service
   */
  async getDriversByService(serviceId: string): Promise<RentalDriver[]> {
    try {
      const response = await api.get(`/api/driver/rental/${serviceId}`);
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching drivers by service:', error);
      throw error;
    }
  }

  async getAvailableDriversByService(serviceId: string, startDate: Date, endDate: Date): Promise<RentalDriver[]> {
    try {
      const startDateStr = startDate.toISOString();
      const endDateStr = endDate.toISOString();
      
      const response = await api.get(
        `/api/driver/rental/${serviceId}/available?startDate=${startDateStr}&endDate=${endDateStr}`
      );

      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching available drivers by service:', error);
      throw error;
    }
  }

  /**
   * Get all verified rental drivers
   */
  async getVerifiedRentalDrivers(): Promise<RentalDriver[]> {
    try {
      const response = await api.get('/api/driver/rental/verified');
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching verified rental drivers:', error);
      throw new Error('Failed to fetch verified rental drivers');
    }
  }
}

export const rentalService = new RentalService();
