import { Request, Response } from 'express';
import { RideRequestService } from '../services/rideRequestService';
import { RideType, RidePaymentMethod } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { DriverService } from '../services/driverService';

export class RideRequestController {
  /**
   * Create a new ride request
   */
  static async createRideRequest(req: AuthRequest, res: Response) {
    try {
      const customerId = req.user!.id;
      const {
        pickupLocation,
        destinationLocation,
        rideType = 'STANDARD',
        rideServiceId,
        estimatedPrice,
        estimatedDistance,
        estimatedDuration,
        currency,
        currencySymbol,
        paymentMethod = 'CASH',
        customerNotes
      } = req.body;

      // Validate required fields
      if (!pickupLocation || !destinationLocation) {
        return res.status(400).json({
          success: false,
          message: 'Pickup and destination locations are required'
        });
      }

      // Validate ride type
      if (!Object.values(RideType).includes(rideType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid ride type'
        });
      }

      // Validate payment method
      if (!Object.values(RidePaymentMethod).includes(paymentMethod)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid payment method'
        });
      }

      const rideRequest = await RideRequestService.createRideRequest({
        customerId,
        pickupLocation,
        destinationLocation,
        rideType: rideType as RideType,
        rideServiceId,
        estimatedPrice,
        estimatedDuration,
        estimatedDistance,
        currency,
        currencySymbol,
        paymentMethod: paymentMethod as RidePaymentMethod,
        customerNotes
      });

      res.status(201).json({
        success: true,
        message: 'Ride request created successfully',
        data: {
          id: rideRequest.id,
          requestId: rideRequest.requestId,
          estimatedDistance: rideRequest.estimatedDistance,
          estimatedDuration: rideRequest.estimatedDuration,
          estimatedPrice: Number(rideRequest.estimatedPrice),
          currency: rideRequest.currency,
          currencySymbol: rideRequest.currencySymbol,
          status: rideRequest.status,
          expiresAt: rideRequest.expiresAt,
          requestedAt: rideRequest.requestedAt
        }
      });
    } catch (error) {
      console.error('Error creating ride request:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create ride request'
      });
    }
  }

  /**
   * Get ride request by ID
   */
  static async getRideRequest(req: AuthRequest, res: Response) {
    try {
      const { requestId } = req.params;
      const customerId = req.user!.id;

      const rideRequest = await RideRequestService.getRideRequestByRequestId(requestId);

      if (!rideRequest) {
        return res.status(404).json({
          success: false,
          message: 'Ride request not found'
        });
      }

      // Check if user owns this ride request
      if (rideRequest.customerId !== customerId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      res.json({
        success: true,
        data: {
          id: rideRequest.id,
          requestId: rideRequest.requestId,
          pickupLocation: rideRequest.pickupLocation,
          destinationLocation: rideRequest.destinationLocation,
          estimatedDistance: rideRequest.estimatedDistance,
          estimatedDuration: rideRequest.estimatedDuration,
          estimatedPrice: Number(rideRequest.estimatedPrice),
          currency: rideRequest.currency,
          currencySymbol: rideRequest.currencySymbol,
          status: rideRequest.status,
          paymentMethod: rideRequest.paymentMethod,
          customerNotes: rideRequest.customerNotes,
          requestedAt: rideRequest.requestedAt,
          expiresAt: rideRequest.expiresAt,
          rideServiceId: rideRequest.rideServiceId,
          driver: rideRequest.driver ? {
            id: rideRequest.driver.id,
            driverId: rideRequest.driver.driverId,
            user: rideRequest.driver.user,
            rating: rideRequest.driver.rating,
            vehicleInfo: rideRequest.driver.vehicleInfo
          } : null
        }
      });
    } catch (error) {
      console.error('Error getting ride request:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get ride request'
      });
    }
  }

  /**
   * Get customer's active ride requests
   */
  static async getCustomerRideRequests(req: AuthRequest, res: Response) {
    try {
      const customerId = req.user!.id;

      const rideRequests = await RideRequestService.getCustomerActiveRideRequests(customerId);

      res.json({
        success: true,
        data: rideRequests.map((request: any) => ({
          id: request.id,
          requestId: request.requestId,
          pickupLocation: request.pickupLocation,
          destinationLocation: request.destinationLocation,
          estimatedDistance: request.estimatedDistance || 0,
          estimatedDuration: request.estimatedDuration || 0,
          estimatedPrice: request.estimatedPrice ? Number(request.estimatedPrice) : 0,
          status: request.status,
          requestedAt: request.requestedAt,
          expiresAt: request.expiresAt,
          rideServiceId: request.rideServiceId,
          driver: request.driver ? {
            id: request.driver.id,
            driverId: request.driver.driverId,
            user: request.driver.user,
            rating: request.driver.rating,
            vehicleInfo: request.driver.vehicleInfo
          } : null
        }))
      });
    } catch (error) {
      console.error('Error getting customer ride requests:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get ride requests'
      });
    }
  }

  /**
   * Get all ride requests for customer (including completed, cancelled, etc.)
   */
  static async getAllCustomerRideRequests(req: AuthRequest, res: Response) {
    try {
      const customerId = req.user!.id;

      const rideRequests = await RideRequestService.getAllCustomerRideRequests(customerId);

      res.json({
        success: true,
        data: rideRequests.map((request: any) => ({
          id: request.id,
          requestId: request.requestId,
          pickupLocation: request.pickupLocation,
          destinationLocation: request.destinationLocation,
          estimatedDistance: request.estimatedDistance || 0,
          estimatedDuration: request.estimatedDuration || 0,
          estimatedPrice: request.estimatedPrice ? Number(request.estimatedPrice) : 0,
          status: request.status,
          paymentMethod: request.paymentMethod,
          customerNotes: request.customerNotes,
          requestedAt: request.requestedAt,
          expiresAt: request.expiresAt,
          driver: request.driver ? {
            id: request.driver.id,
            driverId: request.driver.driverId,
            user: {
              id: request.driver.user.id,
              firstName: request.driver.user.firstName,
              lastName: request.driver.user.lastName,
              phoneNumber: request.driver.user.phoneNumber
            },
            rating: request.driver.rating ? Number(request.driver.rating) : null,
            vehicleInfo: request.driver.vehicleInfo
          } : null,
          ride: request.ride ? {
            id: request.ride.id,
            rideId: request.ride.rideId,
            paymentStatus: request.ride.paymentStatus,
            customerRating: request.ride.customerRating,
            customerReview: request.ride.customerReview,
            totalFare: request.ride.totalFare ? Number(request.ride.totalFare) : 0,
            status: request.ride.status
          } : null
        }))
      });
    } catch (error) {
      console.error('Error getting all customer ride requests:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get ride requests'
      });
    }
  }

  /**
   * Accept ride request by driver
   */
  static async acceptRideRequest(req: AuthRequest, res: Response) {
    try {
      const { requestId } = req.params;
      const currentUserId = req.user!.id;

      console.log('🚗 Accept ride request called:', { requestId, currentUserId });

      // Get the ride request to check if driver is trying to accept their own request
      const rideRequest = await RideRequestService.getRideRequestByRequestId(requestId);
      
      if (!rideRequest) {
        console.log('❌ Ride request not found:', requestId);
        return res.status(404).json({
          success: false,
          message: 'Ride request not found'
        });
      }

      // Check if ride request has customer data
      if (!rideRequest.customer) {
        console.log('❌ Ride request has no customer data:', requestId);
        return res.status(400).json({
          success: false,
          message: 'Ride request has invalid customer data'
        });
      }

      console.log('📋 Ride request found:', {
        id: rideRequest.id,
        status: rideRequest.status,
        customerId: rideRequest.customerId,
        expiresAt: rideRequest.expiresAt
      });

      // Prevent driver from accepting their own request
      if (rideRequest.customerId === currentUserId) {
        console.log('❌ Driver trying to accept own request');
        return res.status(403).json({
          success: false,
          message: 'You cannot accept your own ride request'
        });
      }

      // Check if ride request is still available
      if (rideRequest.status !== 'REQUESTED') {
        console.log('❌ Ride request not available for acceptance:', rideRequest.status);
        return res.status(400).json({
          success: false,
          message: `Ride request is not available for acceptance. Current status: ${rideRequest.status}`
        });
      }

      // Check if ride request has expired
      if (rideRequest.expiresAt < new Date()) {
        console.log('❌ Ride request has expired:', rideRequest.expiresAt);
        return res.status(400).json({
          success: false,
          message: 'Ride request has expired'
        });
      }

      // Get driver profile to get the driver ID
      const driverService = new DriverService();
      const driverProfile = await driverService.getDriverProfile(currentUserId);
      
      if (!driverProfile) {
        console.log('❌ Driver profile not found for user:', currentUserId);
        return res.status(403).json({
          success: false,
          message: 'Driver profile not found. Please complete your driver application first.'
        });
      }

      console.log('👤 Driver profile found:', {
        id: driverProfile.id,
        status: driverProfile.status,
        isOnline: driverProfile.isOnline
      });

      // Check if driver is online
      if (driverProfile.status !== 'ONLINE') {
        console.log('❌ Driver is not online:', driverProfile.status);
        return res.status(400).json({
          success: false,
          message: 'You must be online to accept ride requests'
        });
      }

      const acceptedRequest = await RideRequestService.acceptRideRequest(requestId, driverProfile.id);

      console.log('✅ Ride request accepted successfully:', {
        id: acceptedRequest.id,
        status: acceptedRequest.status,
        driverId: acceptedRequest.driverId
      });

      res.json({
        success: true,
        message: 'Ride request accepted successfully',
        data: {
          id: acceptedRequest.id,
          requestId: acceptedRequest.requestId,
          status: acceptedRequest.status,
          acceptedAt: acceptedRequest.acceptedAt,
          driverId: acceptedRequest.driverId
        }
      });
    } catch (error) {
      console.error('❌ Error accepting ride request:', error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to accept ride request'
      });
    }
  }

  /**
   * Cancel ride request
   */
  static async cancelRideRequest(req: AuthRequest, res: Response) {
    try {
      const { requestId } = req.params;
      const customerId = req.user!.id;
      const { reason } = req.body;

      const rideRequest = await RideRequestService.getRideRequestByRequestId(requestId);

      if (!rideRequest) {
        return res.status(404).json({
          success: false,
          message: 'Ride request not found'
        });
      }

      // Check if user owns this ride request
      if (rideRequest.customerId !== customerId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const cancelledRequest = await RideRequestService.cancelRideRequest(
        requestId,
        'customer',
        reason
      );

      res.json({
        success: true,
        message: 'Ride request cancelled successfully',
        data: {
          id: cancelledRequest.id,
          requestId: cancelledRequest.requestId,
          status: cancelledRequest.status,
          cancelledAt: cancelledRequest.cancelledAt
        }
      });
    } catch (error) {
      console.error('Error cancelling ride request:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel ride request'
      });
    }
  }

  /**
   * Get nearby drivers (for customer to see available drivers)
   */
  static async getNearbyDrivers(req: AuthRequest, res: Response) {
    try {
      const { latitude, longitude, maxDistance = 5 } = req.query;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required'
        });
      }

      const drivers = await RideRequestService.getNearbyDrivers(
        Number(latitude),
        Number(longitude),
        Number(maxDistance)
      );

      res.json({
        success: true,
        data: drivers.map(driver => ({
          id: driver.id,
          driverId: driver.driverId,
          user: driver.user,
          rating: driver.rating ? Number(driver.rating) : null,
          vehicleInfo: driver.vehicleInfo,
          currentLocation: driver.currentLocation
        }))
      });
    } catch (error) {
      console.error('Error getting nearby drivers:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get nearby drivers'
      });
    }
  }

  /**
   * Get online drivers for map display
   */
  static async getOnlineDriversForMap(req: AuthRequest, res: Response) {
    try {
      const { latitude, longitude, maxDistance = 10 } = req.query;
      
      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required'
        });
      }

      const drivers = await RideRequestService.getOnlineDriversForMap(
        parseFloat(latitude as string),
        parseFloat(longitude as string),
        parseFloat(maxDistance as string)
      );

      res.json({
        success: true,
        message: 'Online drivers retrieved successfully',
        data: drivers
      });
    } catch (error) {
      console.error('Error getting online drivers for map:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get online drivers'
      });
    }
  }

  /**
   * Get nearby ride requests for drivers
   */
  static async getNearbyRideRequests(req: AuthRequest, res: Response) {
    try {
      const { latitude, longitude, maxDistance = 5 } = req.query;
      const driverId = req.user!.id; // Get driver ID from authenticated user

      console.log('🔍 getNearbyRideRequests called with:', {
        latitude,
        longitude,
        maxDistance,
        driverId
      });

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required'
        });
      }

      console.log('📞 Calling RideRequestService.getNearbyRideRequests...');
      
      const requests = await RideRequestService.getNearbyRideRequests(
        Number(latitude),
        Number(longitude),
        Number(maxDistance),
        driverId
      );

      console.log('✅ getNearbyRideRequests completed successfully, returning', requests.length, 'requests');

      res.json({
        success: true,
        data: requests,
        message: 'Nearby ride requests retrieved successfully'
      });
    } catch (error) {
      console.error('❌ Error in getNearbyRideRequests controller:', error);
      
      // Log the full error details
      if (error instanceof Error) {
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to get nearby ride requests',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
} 