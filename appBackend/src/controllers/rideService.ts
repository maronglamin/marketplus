import { Request, Response } from 'express';
import { RideService, FareCalculationParams } from '../services/rideService';
import { logger } from '../utils/logger';

export class RideServiceController {
  /**
   * Get all active ride services
   */
  static async getActiveServices(req: Request, res: Response) {
    try {
      const services = await RideService.getActiveServices();
      
      logger.info(`Retrieved ${services.length} active ride services`);
      
      res.json({
        success: true,
        data: services,
        message: 'Active ride services retrieved successfully'
      });
    } catch (error) {
      logger.error('Error getting active ride services:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve ride services'
      });
    }
  }

  /**
   * Get ride service by ID
   */
  static async getServiceById(req: Request, res: Response) {
    try {
      const { serviceId } = req.params;
      
      if (!serviceId) {
        return res.status(400).json({
          success: false,
          message: 'Service ID is required'
        });
      }

      const service = await RideService.getServiceById(serviceId);
      
      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Ride service not found'
        });
      }

      logger.info(`Retrieved ride service: ${serviceId}`);
      
      res.json({
        success: true,
        data: service,
        message: 'Ride service retrieved successfully'
      });
    } catch (error) {
      logger.error('Error getting ride service by ID:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve ride service'
      });
    }
  }

  /**
   * Get default service for vehicle type
   */
  static async getDefaultService(req: Request, res: Response) {
    try {
      const { vehicleType } = req.params;
      
      if (!vehicleType) {
        return res.status(400).json({
          success: false,
          message: 'Vehicle type is required'
        });
      }

      const service = await RideService.getDefaultService(vehicleType);
      
      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Default service not found for vehicle type'
        });
      }

      logger.info(`Retrieved default service for vehicle type: ${vehicleType}`);
      
      res.json({
        success: true,
        data: service,
        message: 'Default ride service retrieved successfully'
      });
    } catch (error) {
      logger.error('Error getting default ride service:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve default ride service'
      });
    }
  }

  /**
   * Calculate fare for a ride
   */
  static async calculateFare(req: Request, res: Response) {
    try {
      const {
        distance,
        duration,
        rideServiceId,
        surgeMultiplier,
        isNightTime,
        isWeekend
      } = req.body;

      // Validate required fields
      if (!distance || !duration || !rideServiceId) {
        return res.status(400).json({
          success: false,
          message: 'Distance, duration, and rideServiceId are required'
        });
      }

      // Validate data types
      if (typeof distance !== 'number' || typeof duration !== 'number') {
        return res.status(400).json({
          success: false,
          message: 'Distance and duration must be numbers'
        });
      }

      if (distance <= 0 || duration <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Distance and duration must be positive numbers'
        });
      }

      const fareParams: FareCalculationParams = {
        distance,
        duration,
        rideServiceId,
        surgeMultiplier,
        isNightTime,
        isWeekend
      };

      const fareBreakdown = await RideService.calculateFare(fareParams);
      
      logger.info(`Calculated fare for service ${rideServiceId}: ${fareBreakdown.totalFare} ${fareBreakdown.currency}`);
      
      res.json({
        success: true,
        data: fareBreakdown,
        message: 'Fare calculated successfully'
      });
    } catch (error) {
      logger.error('Error calculating fare:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate fare'
      });
    }
  }

  /**
   * Get surge multiplier for location
   */
  static async getSurgeMultiplier(req: Request, res: Response) {
    try {
      const { latitude, longitude, radius = 5 } = req.query;
      
      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required'
        });
      }

      const lat = parseFloat(latitude as string);
      const lng = parseFloat(longitude as string);
      const radiusKm = parseFloat(radius as string);

      if (isNaN(lat) || isNaN(lng) || isNaN(radiusKm)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid coordinates or radius'
        });
      }

      const surgeMultiplier = await RideService.getSurgeMultiplier(lat, lng, radiusKm);
      
      logger.info(`Calculated surge multiplier: ${surgeMultiplier} for location (${lat}, ${lng})`);
      
      res.json({
        success: true,
        data: {
          surgeMultiplier,
          latitude: lat,
          longitude: lng,
          radius: radiusKm
        },
        message: 'Surge multiplier calculated successfully'
      });
    } catch (error) {
      logger.error('Error calculating surge multiplier:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate surge multiplier'
      });
    }
  }

  /**
   * Create a new ride service
   */
  static async createService(req: Request, res: Response) {
    try {
      const {
        serviceId,
        name,
        vehicleType,
        baseFare,
        perKmRate,
        perMinuteRate,
        minimumFare,
        maximumFare,
        currency = 'GMD',
        currencySymbol = 'D',
        distanceUnit = 'KILOMETER',
        baseDistance = 1.0,
        isDefault = false
      } = req.body;

      // Validate required fields
      if (!serviceId || !name || !vehicleType || !baseFare || !perKmRate || !perMinuteRate || !minimumFare) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: serviceId, name, vehicleType, baseFare, perKmRate, perMinuteRate, minimumFare'
        });
      }

      // Validate vehicle type
      const validVehicleTypes = ['DRIVER', 'MOTORCYCLE', 'BICYCLE'];
      if (!validVehicleTypes.includes(vehicleType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid vehicle type. Must be one of: DRIVER, MOTORCYCLE, BICYCLE'
        });
      }

      // Validate distance unit
      const validDistanceUnits = ['KILOMETER', 'MILE', 'METER'];
      if (!validDistanceUnits.includes(distanceUnit)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid distance unit. Must be one of: KILOMETER, MILE, METER'
        });
      }

      const serviceData = {
        serviceId,
        name,
        vehicleType,
        baseFare: parseFloat(baseFare),
        perKmRate: parseFloat(perKmRate),
        perMinuteRate: parseFloat(perMinuteRate),
        minimumFare: parseFloat(minimumFare),
        maximumFare: maximumFare ? parseFloat(maximumFare) : undefined,
        currency,
        currencySymbol,
        distanceUnit,
        baseDistance: parseFloat(baseDistance),
        isDefault
      };

      const service = await RideService.createService(serviceData);
      
      logger.info(`Created new ride service: ${serviceId}`);
      
      res.status(201).json({
        success: true,
        data: service,
        message: 'Ride service created successfully'
      });
    } catch (error) {
      logger.error('Error creating ride service:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create ride service'
      });
    }
  }

  /**
   * Get current time status (night time, weekend)
   */
  static async getTimeStatus(req: Request, res: Response) {
    try {
      const isNightTime = RideService.isNightTime();
      const isWeekend = RideService.isWeekend();
      const currentTime = new Date();
      
      res.json({
        success: true,
        data: {
          isNightTime,
          isWeekend,
          currentTime: currentTime.toISOString(),
          hour: currentTime.getHours(),
          dayOfWeek: currentTime.getDay()
        },
        message: 'Time status retrieved successfully'
      });
    } catch (error) {
      logger.error('Error getting time status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get time status'
      });
    }
  }

  /**
   * Get ride services with online drivers nearby
   */
  static async getServicesWithOnlineDrivers(req: Request, res: Response) {
    try {
      const { latitude, longitude, radius } = req.query;
      
      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required'
        });
      }

      const lat = parseFloat(latitude as string);
      const lng = parseFloat(longitude as string);
      const searchRadius = radius ? parseFloat(radius as string) : 5;

      if (isNaN(lat) || isNaN(lng) || isNaN(searchRadius)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid latitude, longitude, or radius values'
        });
      }

      const services = await RideService.getServicesWithOnlineDrivers(lat, lng, searchRadius);
      
      logger.info(`Retrieved ${services.length} ride services with online drivers near (${lat}, ${lng})`);
      
      res.json({
        success: true,
        data: services,
        message: 'Ride services with online drivers retrieved successfully'
      });
    } catch (error) {
      logger.error('Error getting ride services with online drivers:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve ride services with online drivers'
      });
    }
  }
} 