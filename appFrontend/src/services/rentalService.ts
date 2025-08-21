import { ENV_CONFIG } from '../config/env';

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
  private baseUrl = ENV_CONFIG.API_BASE_URL;

  /**
   * Get all rental ride services
   */
  async getRentalServices(): Promise<RentalRideService[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ride-services/rental`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.data || [];
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
      const response = await fetch(`${this.baseUrl}/api/driver/rental/${serviceId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching drivers for service:', error);
      throw new Error('Failed to fetch drivers for service');
    }
  }

  /**
   * Get all verified rental drivers
   */
  async getVerifiedRentalDrivers(): Promise<RentalDriver[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/driver/rental/verified`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching verified rental drivers:', error);
      throw new Error('Failed to fetch verified rental drivers');
    }
  }
}

export const rentalService = new RentalService();
