import { ENV_CONFIG } from '../config/env';

export interface RideServiceConfig {
  id: string;
  serviceId: string;
  name: string;
  vehicleType: string;
  baseFare: string;
  perKmRate: string;
  perMinuteRate: string;
  minimumFare: string;
  maximumFare?: string;
  currency: string;
  currencySymbol: string;
  distanceUnit: string;
  baseDistance: number;
  surgeMultiplier: string;
  maxSurgeMultiplier: string;
  platformFeePercentage: string;
  driverEarningsPercentage: string;
  nightFareMultiplier: string;
  weekendFareMultiplier: string;
  estimatedPickupTime: number;
  maxWaitTime: number;
  description?: string;
  features?: any;
  restrictions?: any;
}

export interface FareCalculationParams {
  distance: number;
  duration: number;
  rideServiceId: string;
  surgeMultiplier?: number;
  isNightTime?: boolean;
  isWeekend?: boolean;
}

export interface FareBreakdown {
  baseFare: string;
  distanceFare: string;
  timeFare: string;
  surgeFare: string;
  totalFare: string;
  driverEarnings: string;
  platformFee: string;
  currency: string;
  currencySymbol: string;
}

export interface RideOption {
  id: string;
  serviceId: string;
  name: string;
  icon: string;
  price: string;
  priceValue: number; // Numeric price value for calculations
  time: string;
  description: string;
  vehicleType: string;
  currency: string;
  currencySymbol: string;
  estimatedPickupTime: number;
  features?: any;
}

class RideServicesApi {
  private baseUrl = `${ENV_CONFIG.API_BASE_URL}/api/ride-services`;

  /**
   * Get all active ride services
   */
  async getActiveServices(): Promise<RideServiceConfig[]> {
    try {
      console.log('🌐 Fetching active services from:', `${this.baseUrl}`);
      const response = await fetch(`${this.baseUrl}`);
      
      console.log('📡 Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('📦 API response:', result);
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch ride services');
      }
      
      console.log('✅ Successfully fetched', result.data.length, 'services');
      return result.data;
    } catch (error) {
      console.error('❌ Error fetching active ride services:', error);
      throw error;
    }
  }

  /**
   * Get ride service by ID
   */
  async getServiceById(serviceId: string): Promise<RideServiceConfig | null> {
    try {
      const response = await fetch(`${this.baseUrl}/${serviceId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch ride service');
      }
      
      return result.data;
    } catch (error) {
      console.error('Error fetching ride service:', error);
      throw error;
    }
  }

  /**
   * Get default service for vehicle type
   */
  async getDefaultService(vehicleType: string): Promise<RideServiceConfig | null> {
    try {
      const response = await fetch(`${this.baseUrl}/default/${vehicleType}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch default ride service');
      }
      
      return result.data;
    } catch (error) {
      console.error('Error fetching default ride service:', error);
      throw error;
    }
  }

  /**
   * Calculate fare for a ride
   */
  async calculateFare(params: FareCalculationParams): Promise<FareBreakdown> {
    try {
      const response = await fetch(`${this.baseUrl}/calculate-fare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to calculate fare');
      }
      
      return result.data;
    } catch (error) {
      console.error('Error calculating fare:', error);
      throw error;
    }
  }

  /**
   * Get surge multiplier for location
   */
  async getSurgeMultiplier(latitude: number, longitude: number, radius: number = 5): Promise<number> {
    try {
      const response = await fetch(
        `${this.baseUrl}/surge-multiplier?latitude=${latitude}&longitude=${longitude}&radius=${radius}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to get surge multiplier');
      }
      
      return result.data.surgeMultiplier;
    } catch (error) {
      console.error('Error getting surge multiplier:', error);
      return 1.0; // Default to no surge
    }
  }

  /**
   * Get time status (night time, weekend)
   */
  async getTimeStatus(): Promise<{ isNightTime: boolean; isWeekend: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/time-status`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to get time status');
      }
      
      return {
        isNightTime: result.data.isNightTime,
        isWeekend: result.data.isWeekend,
      };
    } catch (error) {
      console.error('Error getting time status:', error);
      return { isNightTime: false, isWeekend: false };
    }
  }

  /**
   * Convert ride service config to ride option for UI
   */
  convertToRideOption(service: RideServiceConfig, distance: number, duration: number, surgeMultiplier: number = 1.0): RideOption {
    // Calculate estimated price based on service configuration
    const baseFare = parseFloat(service.baseFare);
    const perKmRate = parseFloat(service.perKmRate);
    const perMinuteRate = parseFloat(service.perMinuteRate);
    
    let estimatedPrice = baseFare + (distance * perKmRate) + (duration * perMinuteRate);
    
    // Apply surge multiplier
    estimatedPrice *= surgeMultiplier;
    
    // Apply minimum fare
    const minimumFare = parseFloat(service.minimumFare);
    if (estimatedPrice < minimumFare) {
      estimatedPrice = minimumFare;
    }
    
    // Apply maximum fare if set
    if (service.maximumFare) {
      const maximumFare = parseFloat(service.maximumFare);
      if (estimatedPrice > maximumFare) {
        estimatedPrice = maximumFare;
      }
    }

    // Get icon based on vehicle type
    const getIcon = (vehicleType: string): string => {
      switch (vehicleType) {
        case 'DRIVER':
          return 'car';
        case 'MOTORCYCLE':
          return 'bicycle'; // Using bicycle icon for motorcycle
        case 'BICYCLE':
          return 'bicycle';
        default:
          return 'car';
      }
    };

    // Get description based on vehicle type
    const getDescription = (vehicleType: string): string => {
      switch (vehicleType) {
        case 'DRIVER':
          return 'Reliable transportation for everyday trips';
        case 'MOTORCYCLE':
          return 'Quick motorcycle rides for faster travel';
        case 'BICYCLE':
          return 'Eco-friendly bicycle rides';
        default:
          return 'Reliable transportation for everyday trips';
      }
    };

    return {
      id: service.serviceId,
      serviceId: service.serviceId,
      name: service.name,
      icon: getIcon(service.vehicleType),
      price: `${service.currencySymbol}${estimatedPrice.toFixed(2)}`,
      priceValue: estimatedPrice, // Add numeric price value
      time: `${service.estimatedPickupTime} min`,
      description: getDescription(service.vehicleType),
      vehicleType: service.vehicleType,
      currency: service.currency,
      currencySymbol: service.currencySymbol,
      estimatedPickupTime: service.estimatedPickupTime,
      features: service.features,
    };
  }

  /**
   * Get ride options for the vehicle selection bottom sheet
   */
  async getRideOptions(distance: number, duration: number, latitude?: number, longitude?: number): Promise<RideOption[]> {
    try {
      console.log('🔧 getRideOptions called with:', { distance, duration, latitude, longitude });
      
      let services: RideServiceConfig[];
      
      // If we have location coordinates, get services with online drivers nearby
      if (latitude && longitude) {
        console.log('📍 Using location-based service filtering');
        services = await this.getServicesWithOnlineDrivers(latitude, longitude, 5);
      } else {
        console.log('🌍 Using general service filtering (no location)');
        services = await this.getActiveServices();
      }
      
      console.log('📋 Retrieved services:', services.length, services.map(s => ({ id: s.serviceId, name: s.name, vehicleType: s.vehicleType })));
      
      let surgeMultiplier = 1.0;
      if (latitude && longitude) {
        try {
          surgeMultiplier = await this.getSurgeMultiplier(latitude, longitude);
          console.log('📈 Surge multiplier:', surgeMultiplier);
        } catch (error) {
          console.warn('Failed to get surge multiplier, using default:', error);
        }
      }
      
      const rideOptions = services.map(service => {
        const option = this.convertToRideOption(service, distance, duration, surgeMultiplier);
        console.log('🚗 Converted option:', { id: option.id, name: option.name, price: option.price });
        return option;
      });
      
      const sortedOptions = rideOptions.sort((a, b) => {
        const priceA = a.priceValue || 0;
        const priceB = b.priceValue || 0;
        return priceA - priceB;
      });
      
      console.log('✅ Final ride options:', sortedOptions.length, sortedOptions.map(o => ({ id: o.id, name: o.name, price: o.price })));
      return sortedOptions;
    } catch (error) {
      console.error('❌ Error getting ride options:', error);
      const fallbackOptions = this.getFallbackRideOptions(distance);
      console.log('🔄 Using fallback options:', fallbackOptions.length);
      return fallbackOptions;
    }
  }

  /**
   * Fallback ride options when API is not available
   */
  private getFallbackRideOptions(distance: number): RideOption[] {
    const basePrice = Math.max(5, distance * 2.5);
    
    return [
      {
        id: 'standard-car-gmd',
        serviceId: 'standard-car-gmd',
        name: 'Standard Car',
        icon: 'car',
        price: `D${basePrice.toFixed(2)}`,
        priceValue: basePrice,
        time: '5 min',
        description: 'Reliable transportation for everyday trips',
        vehicleType: 'DRIVER',
        currency: 'GMD',
        currencySymbol: 'D',
        estimatedPickupTime: 5,
      },
      {
        id: 'premium-car-gmd',
        serviceId: 'premium-car-gmd',
        name: 'Premium Car',
        icon: 'car-sport',
        price: `D${(basePrice * 1.3).toFixed(2)}`,
        priceValue: basePrice * 1.3,
        time: '8 min',
        description: 'Luxury vehicles with enhanced comfort',
        vehicleType: 'DRIVER',
        currency: 'GMD',
        currencySymbol: 'D',
        estimatedPickupTime: 8,
      },
      {
        id: 'motorcycle-gmd',
        serviceId: 'motorcycle-gmd',
        name: 'Motorcycle',
        icon: 'bicycle',
        price: `D${(basePrice * 0.8).toFixed(2)}`,
        priceValue: basePrice * 0.8,
        time: '3 min',
        description: 'Quick motorcycle rides for faster travel',
        vehicleType: 'MOTORCYCLE',
        currency: 'GMD',
        currencySymbol: 'D',
        estimatedPickupTime: 3,
      },
    ];
  }

  /**
   * Get ride services with online drivers nearby
   */
  async getServicesWithOnlineDrivers(latitude: number, longitude: number, radius: number = 5): Promise<RideServiceConfig[]> {
    try {
      console.log('🌐 Fetching services with online drivers from:', `${this.baseUrl}/with-online-drivers`);
      console.log('📍 Location:', { latitude, longitude, radius });
      
      const url = `${this.baseUrl}/with-online-drivers?latitude=${latitude}&longitude=${longitude}&radius=${radius}`;
      const response = await fetch(url);
      
      console.log('📡 Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('📦 API response:', result);
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch ride services with online drivers');
      }
      
      console.log('✅ Successfully fetched', result.data.length, 'services with online drivers');
      return result.data;
    } catch (error) {
      console.error('❌ Error fetching ride services with online drivers:', error);
      throw error;
    }
  }
}

export const rideServicesApi = new RideServicesApi(); 