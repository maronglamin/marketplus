import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

export interface FareCalculationParams {
  distance: number; // in kilometers
  duration: number; // in minutes
  rideServiceId: string;
  surgeMultiplier?: number;
  isNightTime?: boolean;
  isWeekend?: boolean;
}

export interface FareBreakdown {
  baseFare: Decimal;
  distanceFare: Decimal;
  timeFare: Decimal;
  surgeFare: Decimal;
  totalFare: Decimal;
  driverEarnings: Decimal;
  platformFee: Decimal;
  currency: string;
  currencySymbol: string;
}

export interface RideServiceConfig {
  id: string;
  serviceId: string;
  name: string;
  description?: string;
  vehicleType: string;
  baseFare: Decimal;
  perKmRate: Decimal;
  perMinuteRate: Decimal;
  minimumFare: Decimal;
  maximumFare?: Decimal;
  currency: string;
  currencySymbol: string;
  distanceUnit: string;
  baseDistance: number;
  surgeMultiplier: Decimal;
  maxSurgeMultiplier: Decimal;
  platformFeePercentage: Decimal;
  driverEarningsPercentage: Decimal;
  nightFareMultiplier: Decimal;
  weekendFareMultiplier: Decimal;
  estimatedPickupTime: number;
  maxWaitTime: number;
  restrictions?: any;
}

export class RideService {
  /**
   * Get all active ride services
   */
  static async getActiveServices(): Promise<RideServiceConfig[]> {
    try {
      const services = await prisma.rideService.findMany({
        where: {
          isActive: true
        },
        orderBy: [
          { isDefault: 'desc' },
          { name: 'asc' }
        ]
      });

      return services.map(service => ({
        id: service.id,
        serviceId: service.serviceId,
        name: service.name,
        description: service.description ?? undefined,
        vehicleType: service.vehicleType,
        baseFare: service.baseFare,
        perKmRate: service.perKmRate,
        perMinuteRate: service.perMinuteRate,
        minimumFare: service.minimumFare,
        maximumFare: service.maximumFare,
        currency: service.currency,
        currencySymbol: service.currencySymbol,
        distanceUnit: service.distanceUnit,
        baseDistance: service.baseDistance,
        surgeMultiplier: service.surgeMultiplier,
        maxSurgeMultiplier: service.maxSurgeMultiplier,
        platformFeePercentage: service.platformFeePercentage,
        driverEarningsPercentage: service.driverEarningsPercentage,
        nightFareMultiplier: service.nightFareMultiplier,
        weekendFareMultiplier: service.weekendFareMultiplier,
        estimatedPickupTime: service.estimatedPickupTime,
        maxWaitTime: service.maxWaitTime,
        restrictions: service.restrictions ?? undefined,
      }));
    } catch (error) {
      console.error('Error fetching active ride services:', error);
      throw new Error('Failed to fetch ride services');
    }
  }

  /**
   * Get all active rental ride services (isRentalType = true)
   */
  static async getRentalServices(): Promise<RideServiceConfig[]> {
    try {
      const services = await prisma.rideService.findMany({
        where: {
          isActive: true,
          isRentalType: true,
        },
        orderBy: [
          { isDefault: 'desc' },
          { name: 'asc' },
        ],
      });

      return services.map((service) => ({
        id: service.id,
        serviceId: service.serviceId,
        name: service.name,
        description: service.description ?? undefined,
        vehicleType: service.vehicleType,
        baseFare: service.baseFare,
        perKmRate: service.perKmRate,
        perMinuteRate: service.perMinuteRate,
        minimumFare: service.minimumFare,
        maximumFare: service.maximumFare,
        currency: service.currency,
        currencySymbol: service.currencySymbol,
        distanceUnit: service.distanceUnit,
        baseDistance: service.baseDistance,
        surgeMultiplier: service.surgeMultiplier,
        maxSurgeMultiplier: service.maxSurgeMultiplier,
        platformFeePercentage: service.platformFeePercentage,
        driverEarningsPercentage: service.driverEarningsPercentage,
        nightFareMultiplier: service.nightFareMultiplier,
        weekendFareMultiplier: service.weekendFareMultiplier,
        estimatedPickupTime: service.estimatedPickupTime,
        maxWaitTime: service.maxWaitTime,
        restrictions: service.restrictions ?? undefined,
      }));
    } catch (error) {
      console.error('Error fetching rental ride services:', error);
      throw new Error('Failed to fetch rental ride services');
    }
  }

  /**
   * Get ride service by ID
   */
  static async getServiceById(serviceId: string): Promise<RideServiceConfig | null> {
    try {
      const service = await prisma.rideService.findUnique({
        where: { serviceId }
      });

      if (!service) return null;

      return {
        id: service.id,
        serviceId: service.serviceId,
        name: service.name,
        vehicleType: service.vehicleType,
        baseFare: service.baseFare,
        perKmRate: service.perKmRate,
        perMinuteRate: service.perMinuteRate,
        minimumFare: service.minimumFare,
        maximumFare: service.maximumFare,
        currency: service.currency,
        currencySymbol: service.currencySymbol,
        distanceUnit: service.distanceUnit,
        baseDistance: service.baseDistance,
        surgeMultiplier: service.surgeMultiplier,
        maxSurgeMultiplier: service.maxSurgeMultiplier,
        platformFeePercentage: service.platformFeePercentage,
        driverEarningsPercentage: service.driverEarningsPercentage,
        nightFareMultiplier: service.nightFareMultiplier,
        weekendFareMultiplier: service.weekendFareMultiplier,
        estimatedPickupTime: service.estimatedPickupTime,
        maxWaitTime: service.maxWaitTime
      };
    } catch (error) {
      console.error('Error fetching ride service:', error);
      throw new Error('Failed to fetch ride service');
    }
  }

  /**
   * Get default service for vehicle type
   */
  static async getDefaultService(vehicleType: string): Promise<RideServiceConfig | null> {
    try {
      const service = await prisma.rideService.findFirst({
        where: {
          vehicleType: vehicleType as any,
          isDefault: true,
          isActive: true
        }
      });

      if (!service) return null;

      return {
        id: service.id,
        serviceId: service.serviceId,
        name: service.name,
        vehicleType: service.vehicleType,
        baseFare: service.baseFare,
        perKmRate: service.perKmRate,
        perMinuteRate: service.perMinuteRate,
        minimumFare: service.minimumFare,
        maximumFare: service.maximumFare,
        currency: service.currency,
        currencySymbol: service.currencySymbol,
        distanceUnit: service.distanceUnit,
        baseDistance: service.baseDistance,
        surgeMultiplier: service.surgeMultiplier,
        maxSurgeMultiplier: service.maxSurgeMultiplier,
        platformFeePercentage: service.platformFeePercentage,
        driverEarningsPercentage: service.driverEarningsPercentage,
        nightFareMultiplier: service.nightFareMultiplier,
        weekendFareMultiplier: service.weekendFareMultiplier,
        estimatedPickupTime: service.estimatedPickupTime,
        maxWaitTime: service.maxWaitTime
      };
    } catch (error) {
      console.error('Error fetching default ride service:', error);
      throw new Error('Failed to fetch default ride service');
    }
  }

  /**
   * Calculate fare based on ride service configuration
   */
  static async calculateFare(params: FareCalculationParams): Promise<FareBreakdown> {
    try {
      const service = await this.getServiceById(params.rideServiceId);
      if (!service) {
        throw new Error('Ride service not found');
      }

      // Convert distance to service unit if needed
      const distanceInServiceUnit = this.convertDistance(
        params.distance,
        'KILOMETER',
        service.distanceUnit
      );

      // Calculate base fare
      let baseFare = service.baseFare;
      if (distanceInServiceUnit > service.baseDistance) {
        const extraDistance = distanceInServiceUnit - service.baseDistance;
        baseFare = baseFare.add(service.perKmRate.mul(extraDistance));
      }

      // Calculate distance fare
      const distanceFare = service.perKmRate.mul(distanceInServiceUnit);

      // Calculate time fare
      const timeFare = service.perMinuteRate.mul(params.duration);

      // Calculate surge fare
      let surgeMultiplier = params.surgeMultiplier || 1.0;
      surgeMultiplier = Math.min(surgeMultiplier, Number(service.maxSurgeMultiplier));
      surgeMultiplier = Math.max(surgeMultiplier, 1.0);

      // Apply time-based multipliers
      if (params.isNightTime) {
        surgeMultiplier *= Number(service.nightFareMultiplier);
      }
      if (params.isWeekend) {
        surgeMultiplier *= Number(service.weekendFareMultiplier);
      }

      const totalBeforeSurge = baseFare.add(distanceFare).add(timeFare);
      const surgeFare = totalBeforeSurge.mul(surgeMultiplier - 1);

      // Calculate total fare
      let totalFare = totalBeforeSurge.add(surgeFare);

      // Apply minimum and maximum fare limits
      if (totalFare.lessThan(service.minimumFare)) {
        totalFare = service.minimumFare;
      }

      if (service.maximumFare && totalFare.greaterThan(service.maximumFare)) {
        totalFare = service.maximumFare;
      }

      // Calculate platform fee and driver earnings
      const platformFee = totalFare.mul(service.platformFeePercentage);
      const driverEarnings = totalFare.mul(service.driverEarningsPercentage);

      return {
        baseFare,
        distanceFare,
        timeFare,
        surgeFare,
        totalFare,
        driverEarnings,
        platformFee,
        currency: service.currency,
        currencySymbol: service.currencySymbol
      };
    } catch (error) {
      console.error('Error calculating fare:', error);
      throw new Error('Failed to calculate fare');
    }
  }

  /**
   * Convert distance between different units
   */
  private static convertDistance(
    distance: number,
    fromUnit: string,
    toUnit: string
  ): number {
    if (fromUnit === toUnit) return distance;

    // Convert to meters first
    let distanceInMeters = distance;
    switch (fromUnit) {
      case 'KILOMETER':
        distanceInMeters = distance * 1000;
        break;
      case 'MILE':
        distanceInMeters = distance * 1609.34;
        break;
      case 'METER':
        distanceInMeters = distance;
        break;
    }

    // Convert from meters to target unit
    switch (toUnit) {
      case 'KILOMETER':
        return distanceInMeters / 1000;
      case 'MILE':
        return distanceInMeters / 1609.34;
      case 'METER':
        return distanceInMeters;
      default:
        return distance;
    }
  }

  /**
   * Check if current time is night time (10 PM - 6 AM)
   */
  static isNightTime(): boolean {
    const hour = new Date().getHours();
    return hour >= 22 || hour < 6;
  }

  /**
   * Check if current day is weekend
   */
  static isWeekend(): boolean {
    const day = new Date().getDay();
    return day === 0 || day === 6; // Sunday = 0, Saturday = 6
  }

  /**
   * Get surge multiplier based on demand
   */
  static async getSurgeMultiplier(
    latitude: number,
    longitude: number,
    radius: number = 5
  ): Promise<number> {
    try {
      // Count active drivers in the area
      const activeDrivers = await prisma.driverLocation.count({
        where: {
          driver: {
            status: 'ONLINE'
          },
          latitude: {
            gte: latitude - (radius / 111), // Approximate degrees
            lte: latitude + (radius / 111)
          },
          longitude: {
            gte: longitude - (radius / 111),
            lte: longitude + (radius / 111)
          }
        }
      });

      // Count pending ride requests in the area
      const pendingRequests = await prisma.rideRequest.count({
        where: {
          status: 'REQUESTED',
          requestedAt: {
            gte: new Date(Date.now() - 10 * 60 * 1000) // Last 10 minutes
          }
        }
      });

      // Calculate surge based on demand/supply ratio
      const demandSupplyRatio = activeDrivers > 0 ? pendingRequests / activeDrivers : 2;
      
      // Surge multiplier calculation
      if (demandSupplyRatio <= 0.5) return 1.0; // No surge
      if (demandSupplyRatio <= 1.0) return 1.2; // Low surge
      if (demandSupplyRatio <= 2.0) return 1.5; // Medium surge
      if (demandSupplyRatio <= 3.0) return 2.0; // High surge
      return 3.0; // Maximum surge
    } catch (error) {
      console.error('Error calculating surge multiplier:', error);
      return 1.0; // Default to no surge
    }
  }

  /**
   * Create a new ride service
   */
  static async createService(serviceData: Partial<RideServiceConfig>): Promise<RideServiceConfig> {
    try {
      const service = await prisma.rideService.create({
        data: {
          serviceId: serviceData.serviceId!,
          name: serviceData.name!,
          vehicleType: serviceData.vehicleType as any,
          baseFare: serviceData.baseFare!,
          perKmRate: serviceData.perKmRate!,
          perMinuteRate: serviceData.perMinuteRate!,
          minimumFare: serviceData.minimumFare!,
          maximumFare: serviceData.maximumFare,
          currency: serviceData.currency || 'GMD',
          currencySymbol: serviceData.currencySymbol || 'D',
          distanceUnit: serviceData.distanceUnit as any || 'KILOMETER',
          baseDistance: serviceData.baseDistance || 1.0,
          surgeMultiplier: serviceData.surgeMultiplier || new Decimal(1.0),
          maxSurgeMultiplier: serviceData.maxSurgeMultiplier || new Decimal(3.0),
          platformFeePercentage: serviceData.platformFeePercentage || new Decimal(0.15),
          driverEarningsPercentage: serviceData.driverEarningsPercentage || new Decimal(0.85),
          nightFareMultiplier: serviceData.nightFareMultiplier || new Decimal(1.2),
          weekendFareMultiplier: serviceData.weekendFareMultiplier || new Decimal(1.1),
          estimatedPickupTime: serviceData.estimatedPickupTime || 5,
          maxWaitTime: serviceData.maxWaitTime || 10
        }
      });

      return {
        id: service.id,
        serviceId: service.serviceId,
        name: service.name,
        vehicleType: service.vehicleType,
        baseFare: service.baseFare,
        perKmRate: service.perKmRate,
        perMinuteRate: service.perMinuteRate,
        minimumFare: service.minimumFare,
        maximumFare: service.maximumFare,
        currency: service.currency,
        currencySymbol: service.currencySymbol,
        distanceUnit: service.distanceUnit,
        baseDistance: service.baseDistance,
        surgeMultiplier: service.surgeMultiplier,
        maxSurgeMultiplier: service.maxSurgeMultiplier,
        platformFeePercentage: service.platformFeePercentage,
        driverEarningsPercentage: service.driverEarningsPercentage,
        nightFareMultiplier: service.nightFareMultiplier,
        weekendFareMultiplier: service.weekendFareMultiplier,
        estimatedPickupTime: service.estimatedPickupTime,
        maxWaitTime: service.maxWaitTime
      };
    } catch (error) {
      console.error('Error creating ride service:', error);
      throw new Error('Failed to create ride service');
    }
  }

  /**
   * Get ride services that have online drivers nearby
   */
  static async getServicesWithOnlineDrivers(
    latitude: number,
    longitude: number,
    radius: number = 5
  ): Promise<RideServiceConfig[]> {
    try {
      // Calculate bounding box for efficient querying
      const latDelta = radius / 111.32; // 1 degree latitude ≈ 111.32 km
      const lngDelta = radius / (111.32 * Math.cos(latitude * Math.PI / 180));

      const services = await prisma.rideService.findMany({
        where: {
          isActive: true,
          drivers: {
            some: {
              isOnline: true,
              isActive: true,
              status: 'ONLINE',
              currentLocation: {
                not: null
              }
            }
          }
        },
        include: {
          drivers: {
            where: {
              isOnline: true,
              isActive: true,
              status: 'ONLINE',
              currentLocation: {
                not: null
              }
            },
            select: {
              id: true,
              currentLocation: true,
              lastLocationUpdate: true
            }
          }
        },
        orderBy: [
          { isDefault: 'desc' },
          { name: 'asc' }
        ]
      });

      // Filter services to only include those with drivers within the specified radius
      const servicesWithNearbyDrivers = services.filter(service => {
        return service.drivers.some(driver => {
          if (!driver.currentLocation) return false;
          
          const driverLocation = driver.currentLocation as any;
          const driverLat = driverLocation.latitude;
          const driverLng = driverLocation.longitude;
          
          // Calculate distance using Haversine formula
          const distance = this.calculateDistance(
            latitude, longitude,
            driverLat, driverLng
          );
          
          return distance <= radius;
        });
      });

      return servicesWithNearbyDrivers.map(service => ({
        id: service.id,
        serviceId: service.serviceId,
        name: service.name,
        vehicleType: service.vehicleType,
        baseFare: service.baseFare,
        perKmRate: service.perKmRate,
        perMinuteRate: service.perMinuteRate,
        minimumFare: service.minimumFare,
        maximumFare: service.maximumFare,
        currency: service.currency,
        currencySymbol: service.currencySymbol,
        distanceUnit: service.distanceUnit,
        baseDistance: service.baseDistance,
        surgeMultiplier: service.surgeMultiplier,
        maxSurgeMultiplier: service.maxSurgeMultiplier,
        platformFeePercentage: service.platformFeePercentage,
        driverEarningsPercentage: service.driverEarningsPercentage,
        nightFareMultiplier: service.nightFareMultiplier,
        weekendFareMultiplier: service.weekendFareMultiplier,
        estimatedPickupTime: service.estimatedPickupTime,
        maxWaitTime: service.maxWaitTime
      }));
    } catch (error) {
      console.error('Error fetching ride services with online drivers:', error);
      throw new Error('Failed to fetch ride services with online drivers');
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private static calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
} 