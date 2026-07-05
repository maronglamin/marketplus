import { PrismaClient, RideRequest, RideStatus, RideType, RidePaymentMethod, TransactionStatus } from '@prisma/client';
import { calculateFare } from '../utils/fareCalculator';
import { notificationService } from './notificationService';

const prisma = new PrismaClient();

// Helper function to get WebSocket service
function getWebSocketService() {
  return (global as any).webSocketService;
}

export interface CreateRideRequestData {
  customerId: string;
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
  rideType?: RideType;
  rideServiceId?: string;
  estimatedPrice?: number;
  estimatedDistance?: number;
  estimatedDuration?: number;
  currency?: string;
  currencySymbol?: string;
  paymentMethod?: RidePaymentMethod;
  customerNotes?: string;
}

export class RideRequestService {
  /**
   * Create a new ride request
   */
  static async createRideRequest(data: CreateRideRequestData): Promise<RideRequest> {
    const {
      customerId,
      pickupLocation,
      destinationLocation,
      rideType = RideType.STANDARD,
      rideServiceId,
      estimatedPrice: providedPrice,
      estimatedDistance: providedDistance,
      estimatedDuration: providedDuration,
      currency: providedCurrency,
      currencySymbol: providedCurrencySymbol,
      paymentMethod = RidePaymentMethod.CASH,
      customerNotes
    } = data;

    // Clean up any expired requests for this customer before creating a new one
    await this.cleanupExpiredRequestsForCustomer(customerId);

    // Use provided distance and duration if available, otherwise calculate
    let distance: number;
    let duration: number;
    
    if (providedDistance && providedDistance > 0) {
      distance = providedDistance;
      console.log(`📏 Using provided distance: ${distance} km`);
    } else {
      distance = this.calculateDistance(
        pickupLocation.latitude,
        pickupLocation.longitude,
        destinationLocation.latitude,
        destinationLocation.longitude
      );
      console.log(`📏 Calculated distance: ${distance} km`);
    }
    
    if (providedDuration && providedDuration > 0) {
      duration = providedDuration;
      console.log(`⏱️ Using provided duration: ${duration} minutes`);
    } else {
      duration = this.estimateDuration(distance);
      console.log(`⏱️ Estimated duration: ${duration} minutes`);
    }
    
    // Use provided price if available, otherwise calculate from service or use default
    let estimatedPrice: number;
    let currency: string = 'GMD'; // Default currency
    let currencySymbol: string = 'D'; // Default currency symbol
    
    if (providedPrice && providedPrice > 0) {
      // Use the price provided by the frontend (from selected ride service)
      estimatedPrice = providedPrice;
      currency = providedCurrency || 'GMD';
      currencySymbol = providedCurrencySymbol || 'D';
      console.log(`💰 Using provided price: ${estimatedPrice} ${currencySymbol} for service: ${rideServiceId}`);
    } else if (rideServiceId) {
      // Calculate price using the specific ride service configuration
      try {
        const rideService = await prisma.rideService.findUnique({
          where: { serviceId: rideServiceId }
        });
        
        if (rideService) {
          estimatedPrice = this.calculatePriceFromService(rideService, distance, duration);
          currency = rideService.currency || 'GMD';
          currencySymbol = rideService.currencySymbol || 'D';
          console.log(`💰 Calculated price from service: ${estimatedPrice} ${currencySymbol} for service: ${rideServiceId}`);
        } else {
          // Fallback to default calculation
          estimatedPrice = calculateFare(distance, duration, rideType);
          console.log(`⚠️ Service not found, using default calculation: ${estimatedPrice} ${currencySymbol}`);
        }
      } catch (error) {
        console.error('Error calculating price from service:', error);
        estimatedPrice = calculateFare(distance, duration, rideType);
      }
    } else {
      // Fallback to default calculation
      estimatedPrice = calculateFare(distance, duration, rideType);
      console.log(`💰 Using default fare calculation: ${estimatedPrice} ${currencySymbol}`);
    }

    // Generate unique request ID
    const requestId = `RIDE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Set expiration time (5 minutes from now)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const rideRequest = await prisma.rideRequest.create({
      data: {
        requestId,
        customerId,
        pickupLocation,
        destinationLocation,
        rideType,
        estimatedDistance: distance,
        estimatedDuration: duration,
        estimatedPrice,
        currency,
        currencySymbol,
        paymentMethod,
        customerNotes,
        expiresAt,
        status: RideStatus.REQUESTED
      }
    });

    return rideRequest;
  }

  /**
   * Get ride request by ID
   */
  static async getRideRequestById(id: string): Promise<RideRequest | null> {
    return await prisma.rideRequest.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true
          }
        },
        driver: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true
              }
            }
          }
        }
      }
    });
  }

  /**
   * Get ride request by request ID
   */
  static async getRideRequestByRequestId(requestId: string): Promise<RideRequest | null> {
    return await prisma.rideRequest.findUnique({
      where: { requestId },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true
          }
        },
        driver: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true
              }
            }
          }
        },
        ride: {
          select: {
            id: true,
            rideId: true,
            paymentStatus: true,
            customerRating: true,
            customerReview: true,
            totalFare: true,
            status: true
          }
        }
      }
    });
  }

  /**
   * Get active ride requests for a customer
   */
  static async getCustomerActiveRideRequests(customerId: string): Promise<RideRequest[]> {
    return await prisma.rideRequest.findMany({
      where: {
        customerId,
        status: {
          in: [RideStatus.REQUESTED, RideStatus.ACCEPTED, RideStatus.ARRIVING, RideStatus.ARRIVED, RideStatus.IN_PROGRESS]
        },
        expiresAt: {
          gt: new Date() // Only non-expired requests
        }
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true
          }
        },
        driver: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true
              }
            }
          }
        }
      },
      orderBy: { requestedAt: 'desc' }
    });
  }

  /**
   * Get all ride requests for customer (including completed, cancelled, etc.)
   */
  static async getAllCustomerRideRequests(customerId: string): Promise<RideRequest[]> {
    return await prisma.rideRequest.findMany({
      where: {
        customerId
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true
          }
        },
        driver: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true
              }
            }
          }
        },
        ride: {
          select: {
            id: true,
            rideId: true,
            paymentStatus: true,
            customerRating: true,
            customerReview: true,
            totalFare: true,
            status: true
          }
        }
      },
      orderBy: { requestedAt: 'desc' }
    });
  }

  /**
   * Get nearby available drivers
   */
  static async getNearbyDrivers(
    latitude: number,
    longitude: number,
    maxDistance: number = 5 // 5km radius
  ) {
    const drivers = await prisma.driver.findMany({
      where: {
        isOnline: true,
        status: 'ONLINE',
        isActive: true,
        isVerified: true
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true
          }
        }
      }
    });

    // Filter drivers by distance
    const nearbyDrivers = drivers.filter(driver => {
      if (!driver.currentLocation) return false;
      
      const driverLocation = driver.currentLocation as any;
      const distance = this.calculateDistance(
        latitude,
        longitude,
        driverLocation.latitude,
        driverLocation.longitude
      );
      
      return distance <= maxDistance;
    });

    // Sort by distance
    return nearbyDrivers.sort((a, b) => {
      const aLocation = a.currentLocation as any;
      const bLocation = b.currentLocation as any;
      
      const distanceA = this.calculateDistance(
        latitude,
        longitude,
        aLocation.latitude,
        aLocation.longitude
      );
      
      const distanceB = this.calculateDistance(
        latitude,
        longitude,
        bLocation.latitude,
        bLocation.longitude
      );
      
      return distanceA - distanceB;
    });
  }

  /**
   * Get online drivers for map display
   */
  static async getOnlineDriversForMap(
    latitude: number,
    longitude: number,
    maxDistance: number = 10 // 10km radius
  ) {
    const drivers = await prisma.driver.findMany({
      where: {
        isOnline: true,
        status: 'ONLINE',
        isActive: true,
        isVerified: true,
        currentLocation: {
          not: null as any
        }
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true
          }
        },
        rideService: {
          select: {
            id: true,
            serviceId: true,
            name: true,
            currency: true,
            currencySymbol: true
          }
        },
        riderApplication: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            dateOfBirth: true,
            address: true,
            city: true,
            licenseNumber: true,
            licenseExpiry: true,
            vehicleModel: true,
            vehiclePlate: true,
            insuranceNumber: true,
            insuranceExpiry: true,
            emergencyContact: true,
            emergencyPhone: true,
            experience: true,
            availability: true,
            vehicleType: true,
            status: true
          }
        },
        locationHistory: {
          orderBy: {
            timestamp: 'desc'
          },
          take: 1,
          select: {
            address: true,
            latitude: true,
            longitude: true,
            timestamp: true
          }
        }
      }
    });

    // Filter drivers by distance and transform data
    const nearbyDrivers = drivers
      .filter(driver => {
        if (!driver.currentLocation) return false;
        
        const driverLocation = driver.currentLocation as any;
        const distance = this.calculateDistance(
          latitude,
          longitude,
          driverLocation.latitude,
          driverLocation.longitude
        );
        
        return distance <= maxDistance;
      })
      .map(driver => {
        const driverLocation = driver.currentLocation as any;
        const distance = this.calculateDistance(
          latitude,
          longitude,
          driverLocation.latitude,
          driverLocation.longitude
        );
        
        return {
          id: driver.id,
          user: driver.user,
          rideServiceId: driver.rideServiceId,
          rideService: driver.rideService ? {
            id: driver.rideService.id,
            serviceId: driver.rideService.serviceId,
            name: driver.rideService.name,
            currency: driver.rideService.currency,
            currencySymbol: driver.rideService.currencySymbol
          } : null,
          currentLocation: {
            latitude: driverLocation.latitude,
            longitude: driverLocation.longitude
          },
          rating: driver.rating || 4.5,
          vehicleInfo: driver.vehicleInfo,
          distance: distance,
          riderApplication: driver.riderApplication,
          driverLocation: driver.locationHistory[0] || null
        };
      })
      .sort((a, b) => a.distance - b.distance);

    return nearbyDrivers;
  }

  /**
   * Accept ride request by driver
   */
  static async acceptRideRequest(requestId: string, driverId: string): Promise<RideRequest> {
    console.log('🔄 Starting acceptRideRequest transaction:', { requestId, driverId });

    const rideRequest = await prisma.rideRequest.findUnique({
      where: { requestId },
      include: {
        customer: true,
        rideService: true
      }
    });

    if (!rideRequest) {
      console.log('❌ Ride request not found in service:', requestId);
      throw new Error('Ride request not found');
    }

    // Check if customer relationship exists
    if (!rideRequest.customer) {
      console.log('❌ Ride request has no customer data:', requestId);
      throw new Error('Ride request has invalid customer data');
    }

    console.log('📋 Ride request details:', {
      id: rideRequest.id,
      status: rideRequest.status,
      customerId: rideRequest.customerId,
      expiresAt: rideRequest.expiresAt
    });

    if (rideRequest.status !== RideStatus.REQUESTED) {
      console.log('❌ Ride request status not REQUESTED:', rideRequest.status);
      throw new Error('Ride request is not available for acceptance');
    }

    if (rideRequest.expiresAt < new Date()) {
      console.log('❌ Ride request expired:', rideRequest.expiresAt);
      throw new Error('Ride request has expired');
    }

    // Ensure driverId and customerId are never the same
    if (rideRequest.customerId === driverId) {
      console.log('❌ Driver trying to accept own request');
      throw new Error('Driver cannot accept their own ride request');
    }

    // Check if driver is available
    const driver = await prisma.driver.findUnique({
      where: { id: driverId }
    });

    if (!driver) {
      console.log('❌ Driver not found:', driverId);
      throw new Error('Driver not found');
    }

    console.log('👤 Driver details:', {
      id: driver.id,
      status: driver.status,
      isOnline: driver.isOnline
    });

    if (driver.status !== 'ONLINE') {
      console.log('❌ Driver not online:', driver.status);
      throw new Error('Driver is not available for rides');
    }

    // Use transaction to ensure data consistency
    try {
      const result = await prisma.$transaction(async (tx) => {
        console.log('🔄 Starting database transaction');

        // Update ride request
        const updatedRequest = await tx.rideRequest.update({
          where: { requestId },
          data: {
            driverId,
            status: RideStatus.ACCEPTED,
            acceptedAt: new Date()
          }
        });

        console.log('✅ Ride request updated:', {
          id: updatedRequest.id,
          status: updatedRequest.status,
          driverId: updatedRequest.driverId
        });

        // Create ride record
        const ride = await tx.ride.create({
          data: {
            rideId: `RIDE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            rideRequestId: rideRequest.id,
            driverId,
            customerId: rideRequest.customerId,
            rideServiceId: rideRequest.rideServiceId,
            pickupLocation: rideRequest.pickupLocation as any,
            destinationLocation: rideRequest.destinationLocation as any,
            rideType: rideRequest.rideType,
            baseFare: rideRequest.estimatedPrice,
            distanceFare: rideRequest.estimatedPrice,
            timeFare: 0,
            surgeFare: 0,
            totalFare: rideRequest.estimatedPrice,
            driverEarnings: rideRequest.estimatedPrice,
            platformFee: 0,
            paymentMethod: rideRequest.paymentMethod,
            status: RideStatus.ACCEPTED
          }
        });

        console.log('✅ Ride record created:', {
          id: ride.id,
          rideId: ride.rideId,
          status: ride.status
        });

        // Update driver status to busy
        const updatedDriver = await tx.driver.update({
          where: { id: driverId },
          data: { status: 'BUSY' }
        });

        console.log('✅ Driver status updated to BUSY:', updatedDriver.id);

        return { updatedRequest, ride };
      });

      console.log('✅ Transaction completed successfully');

      // Send real-time notifications via WebSocket
      try {
        const webSocketService = getWebSocketService();
        if (webSocketService) {
          // Send ride acceptance notification to customer
          await webSocketService.sendRideAcceptedNotification(rideRequest, driver);
          
          // Send ride update to both customer and driver
          await webSocketService.sendRideUpdate(result.ride.id, {
            rideId: result.ride.id,
            status: RideStatus.ACCEPTED,
            estimatedArrival: 5 // Default 5 minutes
          });
        }
      } catch (wsError) {
        console.error('⚠️ WebSocket notification failed:', wsError);
        // Don't fail the main operation if WebSocket fails
      }

      return result.updatedRequest;
    } catch (transactionError) {
      console.error('❌ Transaction failed:', transactionError);
      throw transactionError;
    }
  }

  /**
   * Update ride request status
   */
  static async updateRideRequestStatus(
    requestId: string,
    status: RideStatus,
    additionalData?: any
  ): Promise<RideRequest> {
    console.log('🔄 Updating ride request status:', { requestId, status, additionalData });

    const updateData: any = { status };

    switch (status) {
      case RideStatus.ARRIVING:
        updateData.arrivingAt = new Date();
        break;
      case RideStatus.ARRIVED:
        updateData.arrivedAt = new Date();
        break;
      case RideStatus.IN_PROGRESS:
        updateData.startedAt = new Date();
        break;
      case RideStatus.COMPLETED:
        updateData.completedAt = new Date();
        updateData.actualPrice = additionalData?.actualPrice;
        break;
      case RideStatus.CANCELLED:
        updateData.cancelledAt = new Date();
        updateData.cancelledBy = additionalData?.cancelledBy;
        updateData.cancellationReason = additionalData?.cancellationReason;
        break;
      case RideStatus.EXPIRED:
        updateData.expiresAt = new Date();
        break;
    }

    try {
      const updatedRequest = await prisma.rideRequest.update({
        where: { requestId },
        data: updateData
      });

      console.log('✅ Ride request status updated successfully:', {
        requestId,
        newStatus: updatedRequest.status,
        updatedFields: Object.keys(updateData)
      });

      // Send real-time update via WebSocket
      try {
        const webSocketService = getWebSocketService();
        if (webSocketService) {
          // Get the associated ride to send updates
          const ride = await prisma.ride.findFirst({
            where: { rideRequestId: updatedRequest.id }
          });
          
          if (ride) {
            await webSocketService.sendRideUpdate(ride.id, {
              rideId: ride.id,
              status: updatedRequest.status,
              estimatedArrival: status === RideStatus.ARRIVING ? 2 : undefined
            });
          }
        }
      } catch (wsError) {
        console.error('⚠️ WebSocket update failed:', wsError);
        // Don't fail the main operation if WebSocket fails
      }

      return updatedRequest;
    } catch (error) {
      console.error('❌ Error updating ride request status:', error);
      throw new Error(`Failed to update ride request status: ${error.message}`);
    }
  }

  /**
   * Cancel ride request
   */
  static async cancelRideRequest(
    requestId: string,
    cancelledBy: 'customer' | 'driver',
    reason?: string
  ): Promise<RideRequest> {
    console.log('🚫 Cancelling ride request:', { requestId, cancelledBy, reason });

    const rideRequest = await prisma.rideRequest.findUnique({
      where: { requestId },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true
          }
        },
        driver: {
          select: {
            id: true,
            status: true
          }
        }
      }
    });

    if (!rideRequest) {
      console.error('❌ Ride request not found:', requestId);
      throw new Error('Ride request not found');
    }

    // Check if ride request has customer data
    if (!rideRequest.customer) {
      console.log('❌ Ride request has no customer data:', requestId);
      throw new Error('Ride request has invalid customer data');
    }

    if (rideRequest.status === RideStatus.COMPLETED) {
      console.error('❌ Cannot cancel completed ride:', requestId);
      throw new Error('Cannot cancel completed ride');
    }

    if (rideRequest.status === RideStatus.CANCELLED) {
      console.log('ℹ️ Ride request already cancelled:', requestId);
      return rideRequest;
    }

    console.log('✅ Found ride request to cancel:', {
      requestId: rideRequest.requestId,
      status: rideRequest.status,
      customerId: rideRequest.customerId,
      driverId: rideRequest.driverId
    });

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      const updatedRequest = await this.updateRideRequestStatus(
        requestId,
        RideStatus.CANCELLED,
        { cancelledBy, cancellationReason: reason }
      );

      // If driver was assigned, set them back to online
      if (rideRequest.driverId && rideRequest.driver) {
        await tx.driver.update({
          where: { id: rideRequest.driverId },
          data: { status: 'ONLINE' }
        });
        console.log('✅ Driver set back to online:', rideRequest.driverId);
      }

      return updatedRequest;
    });

    console.log('✅ Ride request cancelled successfully:', {
      requestId,
      status: result.status,
      cancelledBy: result.cancelledBy,
      cancellationReason: result.cancellationReason
    });

    return result;
  }

  /**
   * Clean up expired requests for a specific customer
   */
  static async cleanupExpiredRequestsForCustomer(customerId: string): Promise<void> {
    // Defensive: avoid crashing if client accessors aren't initialized for any reason
    // @ts-expect-error optional chaining to guard against unexpected undefined
    if (!prisma?.rideRequest?.updateMany) {
      console.warn('rideRequestService.cleanupExpiredRequestsForCustomer: prisma.rideRequest.updateMany is unavailable');
      return;
    }
    await prisma.rideRequest.updateMany({
      where: {
        customerId,
        status: RideStatus.REQUESTED,
        expiresAt: {
          lt: new Date()
        }
      },
      data: {
        status: RideStatus.EXPIRED
      }
    });
  }

  /**
   * Clean up all expired requests
   */
  static async cleanupExpiredRequests(): Promise<void> {
    // Defensive: avoid crashing if client accessors aren't initialized for any reason
    // @ts-expect-error optional chaining to guard against unexpected undefined
    if (!prisma?.rideRequest?.updateMany) {
      console.warn('rideRequestService.cleanupExpiredRequests: prisma.rideRequest.updateMany is unavailable');
      return;
    }
    await prisma.rideRequest.updateMany({
      where: {
        status: RideStatus.REQUESTED,
        expiresAt: {
          lt: new Date()
        }
      },
      data: {
        status: RideStatus.EXPIRED
      }
    });
  }

  /**
   * Get nearby ride requests for drivers
   */
  static async getNearbyRideRequests(
    latitude: number,
    longitude: number,
    maxDistance: number = 5, // 5km radius
    driverId?: string
  ) {
    try {
      console.log(`🔍 Getting nearby ride requests for location: (${latitude}, ${longitude}), maxDistance: ${maxDistance}km`);

      // Get driver's ride service if driverId is provided
      let driverRideService = null;
      if (driverId) {
        const driver = await prisma.driver.findUnique({
          where: { id: driverId },
          include: { rideService: true }
        });
        driverRideService = driver?.rideService;
      }

      // Get all active ride requests:
      // - Broadcast: driverId is null (visible to nearby drivers)
      // - Direct: driverId equals the current driver (targeted requests)
      const rideRequests = await prisma.rideRequest.findMany({
        where: {
          status: RideStatus.REQUESTED,
          expiresAt: {
            gt: new Date() // Only non-expired requests
          },
          OR: [
            { driverId: null },
            ...(driverId ? [{ driverId }] : [])
          ]
        },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true
            }
          },
          rideService: {
            select: {
              id: true,
              name: true,
              vehicleType: true,
              baseFare: true,
              perKmRate: true,
              currency: true,
              currencySymbol: true
            }
          }
        },
        orderBy: {
          requestedAt: 'desc' // Most recent first
        }
      });

      console.log(`📋 Found ${rideRequests.length} active ride requests`);

      // Filter requests by distance and driver's ride service compatibility,
      // Always include DIRECT requests (driverId == current driver) even if outside radius.
      const nearbyRequests = rideRequests.filter(request => {
        try {
          // Check if customer data exists
          if (!request.customer) {
            console.warn(`❌ Ride request ${request.id} has no customer data, skipping`);
            return false;
          }

          // Parse pickup location
          const pickupLocation = request.pickupLocation as any;
          if (!pickupLocation || !pickupLocation.latitude || !pickupLocation.longitude) {
            console.warn(`❌ Ride request ${request.id} has invalid pickup location, skipping`);
            return false;
          }

          // Calculate distance from driver to pickup location
          const distance = this.calculateDistance(
            latitude,
            longitude,
            pickupLocation.latitude,
            pickupLocation.longitude
          );

          // If this is a direct targeted request to this driver, include it regardless of distance
          const isDirect = driverId ? request.driverId === driverId : false;
          if (isDirect) {
            return true;
          }

          // Check if request is within max distance
          if (distance > maxDistance) {
            return false;
          }

          // If driver has a ride service, check if it matches the request
          if (driverRideService && request.rideService) {
            return driverRideService.vehicleType === request.rideService.vehicleType;
          }

          return true;
        } catch (error) {
          console.error(`❌ Error processing ride request ${request.id}:`, error);
          return false;
        }
      });

      console.log(`✅ Found ${nearbyRequests.length} nearby ride requests after filtering`);

      return nearbyRequests.map(request => {
        try {
          const pickupLocation = request.pickupLocation as any;
          
          // Add null checks for customer data
          if (!request.customer) {
            console.warn(`❌ Ride request ${request.id} has no customer data in mapping, skipping`);
            return null;
          }
          
          const requestType = driverId && request.driverId === driverId ? 'DIRECT' : 'BROADCAST';

          return {
            id: request.id,
            requestId: request.requestId,
            customer: request.customer,
            pickupLocation: request.pickupLocation,
            destinationLocation: request.destinationLocation,
            estimatedDistance: Number(request.estimatedDistance),
            estimatedDuration: Number(request.estimatedDuration),
            estimatedPrice: Number(request.estimatedPrice),
            currency: request.currency,
            currencySymbol: request.currencySymbol,
            rideType: request.rideType,
            paymentMethod: request.paymentMethod,
            customerNotes: request.customerNotes,
            requestedAt: request.requestedAt,
            expiresAt: request.expiresAt,
            rideService: request.rideService,
            requestType,
            // Calculate distance from driver to pickup
            distanceFromDriver: this.calculateDistance(
              latitude,
              longitude,
              pickupLocation.latitude,
              pickupLocation.longitude
            )
          };
        } catch (error) {
          console.error(`❌ Error mapping ride request ${request.id}:`, error);
          return null;
        }
      }).filter(Boolean); // Remove null entries
    } catch (error) {
      console.error('❌ Error getting nearby ride requests:', error);
      throw error;
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Estimate duration based on distance
   */
  private static estimateDuration(distance: number): number {
    // Assume average speed of 30 km/h in city
    const averageSpeed = 30;
    return Math.round((distance / averageSpeed) * 60); // Convert to minutes
  }

  /**
   * Calculate price using ride service configuration
   */
  private static calculatePriceFromService(rideService: any, distance: number, duration: number): number {
    const baseFare = parseFloat(rideService.baseFare);
    const perKmRate = parseFloat(rideService.perKmRate);
    const perMinuteRate = parseFloat(rideService.perMinuteRate);
    
    let estimatedPrice = baseFare + (distance * perKmRate) + (duration * perMinuteRate);
    
    // Apply minimum fare
    const minimumFare = parseFloat(rideService.minimumFare);
    if (estimatedPrice < minimumFare) {
      estimatedPrice = minimumFare;
    }
    
    // Apply maximum fare if set
    if (rideService.maximumFare) {
      const maximumFare = parseFloat(rideService.maximumFare);
      if (estimatedPrice > maximumFare) {
        estimatedPrice = maximumFare;
      }
    }
    
    // Round to 2 decimal places
    return Math.round(estimatedPrice * 100) / 100;
  }

  /**
   * Create external transaction for ride payment and update ride/ride request payment status
   */
  static async createRidePaymentTransaction(data: {
    requestId: string;
    paymentIntentId: string;
    paymentMethod: string;
    amount: number;
    customerId: string;
    currency: string;
  }) {
    try {
      // Get the ride request to get additional details
      const rideRequest = await this.getRideRequestByRequestId(data.requestId);
      if (!rideRequest) {
        throw new Error('Ride request not found');
      }

      // Get the ride to get driver/seller information
      const ride = await prisma.ride.findUnique({
        where: { rideRequestId: rideRequest.id },
        include: { driver: true }
      });

      if (!ride) {
        throw new Error('Ride not found for this request');
      }

      // Use a transaction to ensure all updates happen together
      const result = await prisma.$transaction(async (tx) => {
        // 1. Update Ride table: set paymentStatus to PAID and paymentMethod to CARD
        const updatedRide = await tx.ride.update({
          where: { id: ride.id },
          data: {
            paymentStatus: 'PAID',
            paymentMethod: 'CARD',
            updatedAt: new Date()
          }
        });

        // 2. Update RideRequest table: set paymentMethod to CARD
        const updatedRideRequest = await tx.rideRequest.update({
          where: { id: rideRequest.id },
          data: {
            paymentMethod: 'CARD',
            updatedAt: new Date()
          }
        });

        // Generate a unique app transaction ID for all three transactions
        const appTransactionId = `ride_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Calculate fees (similar to ecommerce payments)
        const gatewayChargeFees = Math.round(data.amount * 0.029 + 30); // 2.9% + 30 cents
        const serviceFeeAmount = Math.round(data.amount * 0.05); // 5% service fee

        // 3. Create ORIGINAL transaction record (main customer payment)
        const originalTransaction = await tx.externalTransaction.create({
          data: {
            rideRequestId: rideRequest.id,
            customerId: data.customerId,
            sellerId: ride.driver.userId, // Driver is the seller for rides
            gatewayProvider: 'stripe',
            gatewayTransactionId: data.paymentIntentId,
            paymentReference: data.paymentIntentId,
            appTransactionId: appTransactionId,
            appService: 'RIDES' as any,
            transactionType: 'ORIGINAL',
            amount: data.amount,
            currencyCode: data.currency,
            paidThroughGateway: true,
            status: 'SUCCESS',
            processedAt: new Date(),
            gatewayResponse: {
              paymentIntentId: data.paymentIntentId,
              paymentMethod: data.paymentMethod,
              amount: data.amount,
              currency: data.currency
            }
          } as any
        });

        // 4. Create FEE transaction record (Stripe fees)
        const feeTransaction = await tx.externalTransaction.create({
          data: {
            rideRequestId: rideRequest.id,
            customerId: data.customerId,
            sellerId: ride.driver.userId,
            gatewayProvider: 'stripe',
            gatewayTransactionId: `${data.paymentIntentId}-fee`,
            paymentReference: data.paymentIntentId,
            appTransactionId: appTransactionId, // Same app transaction ID
            appService: 'RIDES' as any,
            transactionType: 'FEE',
            amount: gatewayChargeFees,
            currencyCode: data.currency,
            gatewayChargeFees: gatewayChargeFees,
            processedAmount: 0, // Fees are deducted, so processed amount is 0
            paidThroughGateway: true,
            gatewayResponse: {
              originalPaymentIntent: data.paymentIntentId,
              feeCalculation: {
                percentage: 0.029,
                fixedFee: 30,
                totalFees: gatewayChargeFees
              }
            },
            status: 'SUCCESS',
            processedAt: new Date()
          } as any
        });

        // 5. Create SERVICE_FEE transaction record (App service fee)
        const serviceFeeTransaction = await tx.externalTransaction.create({
          data: {
            rideRequestId: rideRequest.id,
            customerId: data.customerId,
            sellerId: ride.driver.userId,
            gatewayProvider: 'stripe',
            gatewayTransactionId: `${data.paymentIntentId}-servicefee`,
            paymentReference: data.paymentIntentId,
            appTransactionId: appTransactionId, // Same app transaction ID
            appService: 'RIDES' as any,
            transactionType: 'SERVICE_FEE' as any,
            amount: serviceFeeAmount,
            currencyCode: data.currency,
            gatewayChargeFees: null,
            processedAmount: 0, // Service fee is deducted from driver
            paidThroughGateway: false,
            gatewayResponse: {
              originalPaymentIntent: data.paymentIntentId,
              serviceFeeConfig: {
                name: 'Ride Service Fee',
                value: 0.05,
                description: '5% service fee for ride payments',
                serviceType: 'ride_service',
                metadata: { rideType: 'standard' }
              },
              serviceFeePercentage: 0.05,
              serviceFeeAmount: serviceFeeAmount
            },
            status: 'SUCCESS',
            processedAt: new Date()
          } as any
        });

        return {
          ride: updatedRide,
          rideRequest: updatedRideRequest,
          originalTransaction: originalTransaction,
          feeTransaction: feeTransaction,
          serviceFeeTransaction: serviceFeeTransaction
        };
      });

      console.log('Successfully processed ride payment with 3 transactions:', {
        originalTransactionId: result.originalTransaction.id,
        feeTransactionId: result.feeTransaction.id,
        serviceFeeTransactionId: result.serviceFeeTransaction.id,
        requestId: data.requestId,
        rideRequestId: result.rideRequest.id,
        rideId: result.ride.id,
        amount: data.amount,
        currency: data.currency,
        appService: 'RIDES',
        paymentStatus: 'PAID',
        paymentMethod: 'CARD',
        gatewayFees: Math.round(data.amount * 0.029 + 30),
        serviceFee: Math.round(data.amount * 0.05)
      });

      void notificationService.sendPaymentCompletedNotifications({
        customerId: data.customerId,
        sellerId: ride.driver.userId,
        amount: data.amount,
        currency: data.currency.toUpperCase(),
        context: 'ride',
        referenceId: rideRequest.id,
      });

      return result.originalTransaction;
    } catch (error) {
      console.error('Error creating ride payment transaction:', error);
      throw error;
    }
  }

  /**
   * Rate a ride (customer or driver)
   */
  static async rateRide(rideId: string, rating: number, review: string, userId: string, ratedBy: 'customer' | 'driver') {
    try {
      const ride = await prisma.ride.findUnique({
        where: { id: rideId },
        include: {
          customer: true,
          driver: {
            include: {
              user: true
            }
          }
        }
      });

      if (!ride) {
        throw new Error('Ride not found');
      }

      // Verify the user is authorized to rate this ride
      if (ratedBy === 'customer' && ride.customerId !== userId) {
        throw new Error('Customer not authorized to rate this ride');
      }

      if (ratedBy === 'driver' && ride.driver.userId !== userId) {
        throw new Error('Driver not authorized to rate this ride');
      }

      // Update the ride with rating and review
      const updatedRide = await prisma.ride.update({
        where: { id: rideId },
        data: {
          ...(ratedBy === 'customer' ? {
            customerRating: rating,
            customerReview: review
          } : {
            driverRating: rating,
            driverReview: review
          })
        },
        include: {
          customer: true,
          driver: {
            include: {
              user: true
            }
          }
        }
      });

      return updatedRide;
    } catch (error) {
      console.error('Error rating ride:', error);
      throw error;
    }
  }

} 