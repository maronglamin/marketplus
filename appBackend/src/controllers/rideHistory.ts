import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { RideTokenService } from '../services/rideTokenService';
import { notificationService } from '../services/notificationService';
import { PrismaClient, RideStatus } from '@prisma/client';
import { RideService } from '../services/rideService';

const prisma = new PrismaClient();

export class RideHistoryController {
  /**
   * Get driver's ride history
   */
  static async getDriverRideHistory(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;

      // First get the driver record for the current user
      const driver = await prisma.driver.findUnique({
        where: { userId },
        select: { id: true }
      });

      if (!driver) {
        return res.status(404).json({
          success: false,
          message: 'Driver not found',
        });
      }

      // Build where clause using the driver's ID
      const whereClause: any = {
        driverId: driver.id,
      };

      if (status && status !== 'ALL') {
        whereClause.status = status;
      }

      // Get rides with pagination
      const rides = await prisma.ride.findMany({
        where: whereClause,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
            },
          },
          rideRequest: {
            select: {
              requestId: true,
              customerNotes: true,
              currency: true,
              currencySymbol: true,
            },
          },
          rideToken: {
            select: {
              token: true,
              isUsed: true,
              expiresAt: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      });

      // Get total count
      const totalCount = await prisma.ride.count({
        where: whereClause,
      });

      // Transform rides for frontend
      const transformedRides = rides.map((ride) => ({
        id: ride.id,
        rideId: ride.rideId,
        requestId: ride.rideRequest.requestId,
        customerName: `${ride.customer.firstName} ${ride.customer.lastName}`,
        customerPhone: ride.customer.phoneNumber,
        customerNotes: ride.rideRequest.customerNotes,
        pickupLocation: ride.pickupLocation,
        destinationLocation: ride.destinationLocation,
        status: ride.status,
        totalFare: Number(ride.totalFare),
        driverEarnings: Number(ride.driverEarnings),
        currency: ride.rideRequest.currency || 'GMD',
        currencySymbol: ride.rideRequest.currencySymbol || 'D',
        distance: ride.distance,
        duration: ride.duration,
        startedAt: ride.startedAt,
        completedAt: ride.completedAt,
        createdAt: ride.createdAt,
        hasToken: !!ride.rideToken,
        token: ride.rideToken?.token,
        isTokenUsed: ride.rideToken?.isUsed || false,
        tokenExpiresAt: ride.rideToken?.expiresAt,
      }));

      return res.json({
        success: true,
        data: {
          rides: transformedRides,
          pagination: {
            page,
            limit,
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
          },
        },
      });
    } catch (error) {
      console.error('Error getting driver ride history:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get ride history',
      });
    }
  }

  /**
   * Get customer's recent destinations
   */
  static async getCustomerRecentDestinations(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 3;

      // Get recent completed rides for the customer
      const recentRides = await prisma.ride.findMany({
        where: {
          customerId: userId,
          status: 'COMPLETED',
        },
        select: {
          id: true,
          rideId: true,
          pickupLocation: true,
          destinationLocation: true,
          totalFare: true,
          completedAt: true,
          rideRequest: {
            select: {
              requestId: true,
              currency: true,
              currencySymbol: true,
            },
          },
        },
        orderBy: {
          completedAt: 'desc',
        },
        take: limit,
      });

      // Transform destinations for frontend
      const destinations = recentRides.map((ride) => ({
        id: ride.id,
        rideId: ride.rideId,
        requestId: ride.rideRequest.requestId,
        pickupLocation: ride.pickupLocation,
        destinationLocation: ride.destinationLocation,
        totalFare: Number(ride.totalFare),
        currency: ride.rideRequest.currency || 'GMD',
        currencySymbol: ride.rideRequest.currencySymbol || 'D',
        completedAt: ride.completedAt,
      }));

      return res.json({
        success: true,
        data: destinations,
      });
    } catch (error) {
      console.error('Error getting customer recent destinations:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * Get customer's ride history
   */
  static async getCustomerRideHistory(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;

      // Build where clause using the customer's ID
      const whereClause: any = {
        customerId: userId,
      };

      if (status && status !== 'ALL') {
        whereClause.status = status;
      }

      // Get rides with pagination
      const rides = await prisma.ride.findMany({
        where: whereClause,
        include: {
          driver: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phoneNumber: true,
                },
              },
            },
          },
          rideRequest: {
            select: {
              requestId: true,
              customerNotes: true,
              currency: true,
              currencySymbol: true,
              rideType: true,
            },
          },
          rideToken: {
            select: {
              token: true,
              isUsed: true,
              expiresAt: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      });

      // Get total count
      const totalCount = await prisma.ride.count({
        where: whereClause,
      });

      // Transform rides for frontend
      const transformedRides = rides.map((ride) => ({
        id: ride.id,
        rideId: ride.rideId,
        requestId: ride.rideRequest.requestId,
        driverName: ride.driver ? `${ride.driver.user.firstName} ${ride.driver.user.lastName}` : 'Unknown Driver',
        driverPhone: ride.driver?.user.phoneNumber,
        customerNotes: ride.rideRequest.customerNotes,
        pickupLocation: ride.pickupLocation,
        destinationLocation: ride.destinationLocation,
        status: ride.status,
        rideType: ride.rideRequest.rideType,
        totalFare: Number(ride.totalFare),
        currency: ride.rideRequest.currency || 'GMD',
        currencySymbol: ride.rideRequest.currencySymbol || 'D',
        distance: ride.distance,
        duration: ride.duration,
        startedAt: ride.startedAt,
        completedAt: ride.completedAt,
        createdAt: ride.createdAt,
        customerRating: ride.customerRating,
        customerReview: ride.customerReview,
        hasToken: !!ride.rideToken,
        isTokenUsed: ride.rideToken?.isUsed || false,
        token: ride.rideToken?.token,
        tokenExpiresAt: ride.rideToken?.expiresAt,
      }));

      return res.json({
        success: true,
        data: {
          rides: transformedRides,
          pagination: {
            page,
            limit,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit),
          },
        },
      });
    } catch (error) {
      console.error('Error getting customer ride history:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get ride history',
      });
    }
  }

  /**
   * Generate token for a ride
   */
  static async generateRideToken(req: AuthRequest, res: Response) {
    try {
      const { rideId } = req.params;
      const userId = req.user!.id;

      // First get the driver record for the current user
      const driver = await prisma.driver.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            }
          }
        }
      });

      if (!driver) {
        return res.status(404).json({
          success: false,
          message: 'Driver not found',
        });
      }

      // Verify the ride belongs to this driver
      const ride = await prisma.ride.findFirst({
        where: {
          id: rideId,
          driverId: driver.id,
          status: {
            in: [RideStatus.ACCEPTED, RideStatus.ARRIVING, RideStatus.ARRIVED],
          },
        },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            }
          }
        }
      });

      if (!ride) {
        return res.status(404).json({
          success: false,
          message: 'Ride not found or not authorized',
        });
      }

      // Check if token already exists and is valid
      const existingToken = await RideTokenService.getTokenForRide(rideId);
      if (existingToken && !existingToken.isUsed && existingToken.expiresAt > new Date()) {
        return res.json({
          success: true,
          data: {
            token: existingToken.token,
            expiresAt: existingToken.expiresAt,
            message: 'Token already exists and is valid',
          },
        });
      }

      // Generate new token
      const rideToken = await RideTokenService.generateToken(rideId);

      // Send notification to customer
      try {
        await notificationService.sendRideTokenNotificationToCustomer(
          ride.customer.id,
          `${driver.user.firstName} ${driver.user.lastName}`,
          rideToken.token,
          rideId
        );
      } catch (notificationError) {
        console.error('Failed to send token notification to customer:', notificationError);
        // Don't fail the token generation if notification fails
      }

      return res.json({
        success: true,
        data: {
          token: rideToken.token,
          expiresAt: rideToken.expiresAt,
          message: 'Token generated successfully',
          driverName: `${driver.user.firstName} ${driver.user.lastName}`,
          customerId: ride.customer.id,
          customerName: `${ride.customer.firstName} ${ride.customer.lastName}`,
        },
      });
    } catch (error) {
      console.error('Error generating ride token:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate token',
      });
    }
  }

  /**
   * Start ride with token validation
   */
  static async startRide(req: AuthRequest, res: Response) {
    try {
      const { rideId } = req.params;
      const { token } = req.body;
      const userId = req.user!.id;

      // First get the driver record for the current user
      const driver = await prisma.driver.findUnique({
        where: { userId },
        select: { id: true }
      });

      if (!driver) {
        return res.status(404).json({
          success: false,
          message: 'Driver not found',
        });
      }

      // Verify the ride belongs to this driver
      const ride = await prisma.ride.findFirst({
        where: {
          id: rideId,
          driverId: driver.id,
          status: {
            in: [RideStatus.ACCEPTED, RideStatus.ARRIVING, RideStatus.ARRIVED],
          },
        },
      });

      if (!ride) {
        return res.status(404).json({
          success: false,
          message: 'Ride not found or not authorized',
        });
      }

      // Validate and consume token
      const isTokenValid = await RideTokenService.validateAndConsumeToken(token, rideId);
      if (!isTokenValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired token',
        });
      }

      // Update ride status to IN_PROGRESS
      const updatedRide = await prisma.ride.update({
        where: { id: rideId },
        data: {
          status: RideStatus.IN_PROGRESS,
          startedAt: new Date(),
        },
      });

      // Also update the ride request status
      await prisma.rideRequest.update({
        where: { id: ride.rideRequestId },
        data: {
          status: RideStatus.IN_PROGRESS,
          startedAt: new Date(),
        },
      });

      return res.json({
        success: true,
        data: {
          ride: updatedRide,
          message: 'Ride started successfully',
        },
      });
    } catch (error) {
      console.error('Error starting ride:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to start ride',
      });
    }
  }

  /**
   * Get ride details
   */
  static async getRideDetails(req: AuthRequest, res: Response) {
    try {
      const { rideId } = req.params;
      const userId = req.user!.id;

      // First get the driver record for the current user
      const driver = await prisma.driver.findUnique({
        where: { userId },
        select: { id: true }
      });

      if (!driver) {
        return res.status(404).json({
          success: false,
          message: 'Driver not found',
        });
      }

      const ride = await prisma.ride.findFirst({
        where: {
          id: rideId,
          driverId: driver.id,
        },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
            },
          },
          rideRequest: {
            select: {
              requestId: true,
              customerNotes: true,
              currency: true,
              currencySymbol: true,
            },
          },
          rideToken: {
            select: {
              token: true,
              isUsed: true,
              expiresAt: true,
            },
          },
        },
      });

      if (!ride) {
        return res.status(404).json({
          success: false,
          message: 'Ride not found',
        });
      }

      const rideDetails = {
        id: ride.id,
        rideId: ride.rideId,
        requestId: ride.rideRequest.requestId,
        customerName: `${ride.customer.firstName} ${ride.customer.lastName}`,
        customerPhone: ride.customer.phoneNumber,
        customerNotes: ride.rideRequest.customerNotes,
        pickupLocation: ride.pickupLocation,
        destinationLocation: ride.destinationLocation,
        status: ride.status,
        totalFare: Number(ride.totalFare),
        driverEarnings: Number(ride.driverEarnings),
        currency: ride.rideRequest.currency || 'GMD',
        currencySymbol: ride.rideRequest.currencySymbol || 'D',
        distance: ride.distance,
        duration: ride.duration,
        startedAt: ride.startedAt,
        completedAt: ride.completedAt,
        createdAt: ride.createdAt,
        hasToken: !!ride.rideToken,
        token: ride.rideToken?.token,
        isTokenUsed: ride.rideToken?.isUsed || false,
        tokenExpiresAt: ride.rideToken?.expiresAt,
      };

      return res.json({
        success: true,
        data: rideDetails,
      });
    } catch (error) {
      console.error('Error getting ride details:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get ride details',
      });
    }
  }

  /**
   * Complete ride
   */
  static async completeRide(req: AuthRequest, res: Response) {
    const startTime = Date.now();
    try {
      console.log('🚀 Starting ride completion process...');
      const { rideId } = req.params;
      const userId = req.user!.id;

      console.log('📋 Ride completion request:', { rideId, userId });

      // First get the driver record for the current user
      console.log('🔍 Looking up driver for user:', userId);
      const driver = await prisma.driver.findUnique({
        where: { userId },
        select: { id: true }
      });

      if (!driver) {
        console.error('❌ Driver not found for user:', userId);
        return res.status(404).json({
          success: false,
          message: 'Driver not found',
        });
      }

      console.log('✅ Driver found:', driver.id);

      // Verify the ride belongs to this driver and is in progress
      console.log('🔍 Looking up ride:', { rideId, driverId: driver.id });
      const ride = await prisma.ride.findFirst({
        where: {
          id: rideId,
          driverId: driver.id,
          status: RideStatus.IN_PROGRESS,
        },
        include: {
          rideService: true
        }
      });

      if (!ride) {
        console.error('❌ Ride not found or not in progress:', { rideId, driverId: driver.id });
        return res.status(404).json({
          success: false,
          message: 'Ride not found or not in progress',
        });
      }

      console.log('✅ Ride found:', {
        rideId: ride.id,
        status: ride.status,
        rideServiceId: ride.rideServiceId,
        startedAt: ride.startedAt
      });

      // Calculate actual distance and duration
      const actualDistance = RideHistoryController.calculateActualDistance(ride.pickupLocation, ride.destinationLocation);
      const actualDuration = RideHistoryController.calculateActualDuration(ride.startedAt);

      console.log('📏 Ride completion calculations:', {
        rideId: ride.id,
        actualDistance: `${actualDistance} km`,
        actualDuration: `${actualDuration} minutes`,
        startedAt: ride.startedAt
      });

      // Initialize fare values with original ride data
      let updatedFares = {
        distance: actualDistance,
        duration: actualDuration,
        baseFare: ride.baseFare,
        distanceFare: ride.distanceFare,
        timeFare: ride.timeFare,
        surgeFare: ride.surgeFare,
        totalFare: ride.totalFare,
        driverEarnings: ride.driverEarnings,
        platformFee: ride.platformFee
      };

      // If ride service exists, recalculate fares using service rates
      if (ride.rideService && ride.rideServiceId) {
        try {
          console.log('🔄 Recalculating fare using ride service:', {
            rideServiceId: ride.rideServiceId,
            distance: actualDistance,
            duration: actualDuration
          });

          const fareBreakdown = await RideService.calculateFare({
            distance: actualDistance,
            duration: actualDuration,
            rideServiceId: ride.rideServiceId,
            surgeMultiplier: ride.surgeFare.greaterThan(0) ? 1.2 : 1.0, // Default surge if original had surge
            isNightTime: RideService.isNightTime(),
            isWeekend: RideService.isWeekend()
          });

          updatedFares = {
            distance: actualDistance,
            duration: actualDuration,
            baseFare: fareBreakdown.baseFare,
            distanceFare: fareBreakdown.distanceFare,
            timeFare: fareBreakdown.timeFare,
            surgeFare: fareBreakdown.surgeFare,
            totalFare: fareBreakdown.totalFare,
            driverEarnings: fareBreakdown.driverEarnings,
            platformFee: fareBreakdown.platformFee
          };

          console.log('💰 Fare recalculated successfully:', {
            originalTotal: ride.totalFare.toString(),
            newTotal: fareBreakdown.totalFare.toString(),
            currency: fareBreakdown.currency,
            distance: `${actualDistance} km`,
            duration: `${actualDuration} minutes`
          });
        } catch (error) {
          console.error('⚠️ Error recalculating fare, using original values:', error);
          // Keep original fare values if recalculation fails, but update distance and duration
          updatedFares = {
            ...updatedFares,
            distance: actualDistance,
            duration: actualDuration
          };
        }
      } else {
        console.log('ℹ️ No ride service found, using original fare values with updated distance/duration');
        // Update only distance and duration, keep original fare values
        updatedFares = {
          ...updatedFares,
          distance: actualDistance,
          duration: actualDuration
        };
      }

      console.log('📝 Updating ride with final values:', {
        rideId: ride.id,
        distance: updatedFares.distance,
        duration: updatedFares.duration,
        totalFare: updatedFares.totalFare.toString()
      });

      // Update ride with actual distance, duration, and recalculated fares
      console.log('💾 Updating ride in database...');
      let updatedRide;
      try {
        const updateData = {
          status: RideStatus.COMPLETED,
          completedAt: new Date(),
          distance: updatedFares.distance,
          duration: updatedFares.duration,
          baseFare: updatedFares.baseFare,
          distanceFare: updatedFares.distanceFare,
          timeFare: updatedFares.timeFare,
          surgeFare: updatedFares.surgeFare,
          totalFare: updatedFares.totalFare,
          driverEarnings: updatedFares.driverEarnings,
          platformFee: updatedFares.platformFee,
        };
        
        console.log('📝 Update data:', updateData);
        
        updatedRide = await prisma.ride.update({
          where: { id: rideId },
          data: updateData,
        });
        console.log('✅ Ride updated successfully:', updatedRide.id);
      } catch (error) {
        console.error('❌ Error updating ride:', error);
        console.error('❌ Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        throw new Error(`Failed to update ride: ${error.message}`);
      }

      // Also update the ride request status
      console.log('💾 Updating ride request status...');
      try {
        await prisma.rideRequest.update({
          where: { id: ride.rideRequestId },
          data: {
            status: RideStatus.COMPLETED,
          },
        });
        console.log('✅ Ride request updated successfully:', ride.rideRequestId);
      } catch (error) {
        console.error('❌ Error updating ride request:', error);
        console.error('❌ Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        throw new Error(`Failed to update ride request: ${error.message}`);
      }

      // Set driver back to online
      console.log('💾 Updating driver status to ONLINE...');
      try {
        await prisma.driver.update({
          where: { id: driver.id },
          data: { status: 'ONLINE' }
        });
        console.log('✅ Driver set back to online:', driver.id);
      } catch (error) {
        console.error('❌ Error updating driver status:', error);
        console.error('❌ Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        throw new Error(`Failed to update driver status: ${error.message}`);
      }

      console.log('🎉 Ride completion successful! Sending response...');
      const response = {
        success: true,
        data: {
          ride: updatedRide,
          message: 'Ride completed successfully',
          fareUpdate: {
            originalTotal: ride.totalFare.toString(),
            newTotal: updatedFares.totalFare.toString(),
            actualDistance: `${updatedFares.distance} km`,
            actualDuration: `${updatedFares.duration} minutes`
          }
        },
      };
      
      console.log('📤 Response data:', response);
      const endTime = Date.now();
      console.log(`⏱️ Ride completion completed in ${endTime - startTime}ms`);
      return res.json(response);
    } catch (error) {
      const endTime = Date.now();
      console.error(`❌ Error completing ride after ${endTime - startTime}ms:`, error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      return res.status(500).json({
        success: false,
        message: 'Failed to complete ride',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Cancel ride
   */
  static async cancelRide(req: AuthRequest, res: Response) {
    try {
      const { rideId } = req.params;
      const { reason } = req.body;
      const userId = req.user!.id;

      console.log('🚫 Cancelling ride:', { rideId, reason, userId });

      // First get the driver record for the current user
      const driver = await prisma.driver.findUnique({
        where: { userId },
        select: { id: true }
      });

      if (!driver) {
        console.error('❌ Driver not found for user:', userId);
        return res.status(404).json({
          success: false,
          message: 'Driver not found',
        });
      }

      // Verify the ride belongs to this driver and can be cancelled
      const ride = await prisma.ride.findFirst({
        where: {
          id: rideId,
          driverId: driver.id,
          status: {
            in: [RideStatus.ACCEPTED, RideStatus.ARRIVING, RideStatus.ARRIVED, RideStatus.IN_PROGRESS],
          },
        },
        include: {
          rideRequest: true
        }
      });

      if (!ride) {
        console.error('❌ Ride not found or cannot be cancelled:', { rideId, driverId: driver.id });
        return res.status(404).json({
          success: false,
          message: 'Ride not found or cannot be cancelled',
        });
      }

      console.log('✅ Found ride to cancel:', {
        rideId: ride.id,
        status: ride.status,
        rideRequestId: ride.rideRequestId
      });

      // Start a transaction to ensure data consistency
      const result = await prisma.$transaction(async (tx) => {
        // Update ride status to CANCELLED
        const updatedRide = await tx.ride.update({
          where: { id: rideId },
          data: {
            status: RideStatus.CANCELLED,
            cancelledAt: new Date(),
            cancelledBy: 'driver',
            cancellationReason: reason || 'Cancelled by driver',
          },
        });

        // Also update the ride request status
        const updatedRideRequest = await tx.rideRequest.update({
          where: { id: ride.rideRequestId },
          data: {
            status: RideStatus.CANCELLED,
            cancelledAt: new Date(),
            cancelledBy: 'driver',
            cancellationReason: reason || 'Cancelled by driver',
          },
        });

        // Set driver back to online
        await tx.driver.update({
          where: { id: driver.id },
          data: { status: 'ONLINE' }
        });

        return { updatedRide, updatedRideRequest };
      });

      console.log('✅ Ride cancelled successfully:', {
        rideId,
        rideStatus: result.updatedRide.status,
        rideRequestStatus: result.updatedRideRequest.status,
        driverStatus: 'ONLINE'
      });

      return res.json({
        success: true,
        message: 'Ride cancelled successfully',
        data: {
          rideId: result.updatedRide.id,
          status: result.updatedRide.status,
          cancelledAt: result.updatedRide.cancelledAt,
          cancellationReason: result.updatedRide.cancellationReason
        }
      });
    } catch (error) {
      console.error('❌ Error cancelling ride:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to cancel ride',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Calculate actual distance between pickup and destination
   */
  private static calculateActualDistance(pickupLocation: any, destinationLocation: any): number {
    try {
      const lat1 = pickupLocation.latitude;
      const lon1 = pickupLocation.longitude;
      const lat2 = destinationLocation.latitude;
      const lon2 = destinationLocation.longitude;

      const R = 6371; // Earth's radius in kilometers
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      
      return Math.round(distance * 100) / 100; // Round to 2 decimal places
    } catch (error) {
      console.error('Error calculating distance:', error);
      return 0;
    }
  }

  /**
   * Calculate actual duration from start to completion
   */
  private static calculateActualDuration(startedAt: Date | null): number {
    try {
      if (!startedAt) return 0;
      
      const now = new Date();
      const durationMs = now.getTime() - startedAt.getTime();
      const durationMinutes = Math.round(durationMs / (1000 * 60));
      
      return Math.max(1, durationMinutes); // Minimum 1 minute
    } catch (error) {
      console.error('Error calculating duration:', error);
      return 0;
    }
  }
} 