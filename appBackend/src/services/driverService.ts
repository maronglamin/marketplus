import { PrismaClient, DriverStatus, RideStatus } from '@prisma/client';
import { calculateDistance } from '../utils/locationUtils';

const prisma = new PrismaClient();

export interface DriverLocation {
  latitude: number;
  longitude: number;
  address?: string;
  accuracy?: number;
  speed?: number;
  heading?: number;
}

export interface DriverStats {
  totalRides: number;
  totalEarnings: number;
  rating: number;
  onlineHours: number;
  todayEarnings: number;
  weeklyEarnings: number;
  monthlyEarnings: number;
}

export interface RideRequest {
  id: string;
  requestId: string;
  customerId: string;
  pickupLocation: DriverLocation;
  destinationLocation: DriverLocation;
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

export class DriverService {
  // Get driver profile
  async getDriverProfile(userId: string) {
    try {
      // First check if driver exists
      let driver = await prisma.driver.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              phoneNumber: true,
            }
          },
          riderApplication: {
            select: {
              vehicleModel: true,
              vehiclePlate: true,
              licenseNumber: true,
              status: true,
            }
          }
        }
      });

      // If driver doesn't exist, check if user has an approved rider application
      if (!driver) {
        const riderApplication = await prisma.riderApplication.findFirst({
          where: {
            userId,
            status: 'APPROVED'
          }
        });

        if (!riderApplication) {
          throw new Error('No approved rider application found. Please complete your rider application first.');
        }

        // Create driver record from approved rider application
        driver = await this.createDriverFromRiderApplication(riderApplication);
      }

      return driver;
    } catch (error) {
      console.error('Error getting driver profile:', error);
      throw error;
    }
  }

  // Create driver from approved rider application
  private async createDriverFromRiderApplication(riderApplication: any) {
    try {
      // Generate unique driver ID
      const driverId = `DRIVER_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

      const driver = await prisma.driver.create({
        data: {
          userId: riderApplication.userId,
          riderApplicationId: riderApplication.id,
          driverId,
          isOnline: false,
          status: DriverStatus.OFFLINE,
          totalRides: 0,
          totalEarnings: 0,
          rating: null,
          ratingCount: 0,
          vehicleInfo: {
            model: riderApplication.vehicleModel,
            plate: riderApplication.vehiclePlate,
            color: 'Unknown', // Not in rider application
            year: new Date().getFullYear() // Default to current year
          },
          documents: {
            license: {
              number: riderApplication.licenseNumber,
              expiry: riderApplication.licenseExpiry
            },
            insurance: {
              number: riderApplication.insuranceNumber,
              expiry: riderApplication.insuranceExpiry
            }
          },
          isVerified: true, // Since application is approved
          isActive: true
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              phoneNumber: true,
            }
          },
          riderApplication: {
            select: {
              vehicleModel: true,
              vehiclePlate: true,
              licenseNumber: true,
              status: true,
            }
          }
        }
      });

      return driver;
    } catch (error) {
      console.error('Error creating driver from rider application:', error);
      throw error;
    }
  }

  // Update driver online/offline status
  async updateDriverStatus(userId: string, isOnline: boolean, currentLocation?: DriverLocation) {
    try {
      const driver = await prisma.driver.findUnique({
        where: { userId }
      });

      if (!driver) {
        throw new Error('Driver not found');
      }

      const status = isOnline ? DriverStatus.ONLINE : DriverStatus.OFFLINE;

      // Prepare update data
      const updateData: any = {
        isOnline,
        status,
        lastLocationUpdate: new Date()
      };

      // If going online and location is provided, update current location
      if (isOnline && currentLocation) {
        updateData.currentLocation = currentLocation as any;
      }

      const updatedDriver = await prisma.driver.update({
        where: { userId },
        data: updateData
      });

      // If going online and location is provided, also store in location history
      if (isOnline && currentLocation) {
        await prisma.driverLocation.create({
          data: {
            driverId: driver.id,
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            address: currentLocation.address,
            accuracy: currentLocation.accuracy,
            speed: currentLocation.speed,
            heading: currentLocation.heading
          }
        });
      }

      return updatedDriver;
    } catch (error) {
      console.error('Error updating driver status:', error);
      throw error;
    }
  }

  // Update driver location with smart history management
  async updateDriverLocation(userId: string, location: DriverLocation) {
    try {
      const driver = await prisma.driver.findUnique({
        where: { userId }
      });

      if (!driver) {
        throw new Error('Driver not found');
      }

      // Update driver's current location and timestamp
      const updatedDriver = await prisma.driver.update({
        where: { userId },
        data: {
          currentLocation: location as any,
          lastLocationUpdate: new Date()
        }
      });

      console.log('✅ Driver location and lastLocationUpdate timestamp updated successfully');

      // Check if we should create a new history record or update existing one
      const recentLocation = await prisma.driverLocation.findFirst({
        where: {
          driverId: driver.id,
          timestamp: {
            gte: new Date(Date.now() - 5 * 60 * 1000) // Within last 5 minutes
          }
        },
        orderBy: {
          timestamp: 'desc'
        }
      });

      if (recentLocation) {
        // Update existing record if it's recent (within 5 minutes)
        await prisma.driverLocation.update({
          where: { id: recentLocation.id },
          data: {
            latitude: location.latitude,
            longitude: location.longitude,
            address: location.address,
            accuracy: location.accuracy,
            speed: location.speed,
            heading: location.heading,
            timestamp: new Date()
          }
        });
      } else {
        // Create new record if no recent record exists
        await prisma.driverLocation.create({
          data: {
            driverId: driver.id,
            latitude: location.latitude,
            longitude: location.longitude,
            address: location.address,
            accuracy: location.accuracy,
            speed: location.speed,
            heading: location.heading
          }
        });
      }

      return updatedDriver;
    } catch (error) {
      console.error('Error updating driver location:', error);
      throw error;
    }
  }

  // Smart location update with throttling
  async smartUpdateDriverLocation(userId: string, location: DriverLocation, forceUpdate: boolean = false) {
    try {
      const driver = await prisma.driver.findUnique({
        where: { userId }
      });

      if (!driver) {
        throw new Error('Driver not found');
      }

      // Check if driver is online and active
      if (!driver.isOnline) {
        console.log('Driver is offline, skipping location update');
        return driver;
      }

      // Check if enough time has passed since last update (throttling)
      const timeSinceLastUpdate = driver.lastLocationUpdate 
        ? Date.now() - driver.lastLocationUpdate.getTime()
        : Infinity;

      const updateInterval = forceUpdate ? 0 : 30000; // 30 seconds for normal updates, 0 for forced

      if (timeSinceLastUpdate < updateInterval) {
        console.log(`Location update throttled. Time since last update: ${timeSinceLastUpdate}ms`);
        return driver;
      }

      // Check if location has changed significantly (more than 50 meters)
      if (driver.currentLocation && !forceUpdate) {
        const currentLocation = driver.currentLocation as any;
        const distance = this.calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          location.latitude,
          location.longitude
        );

        if (distance < 0.05) { // Less than 50 meters
          console.log(`Location change too small (${distance.toFixed(2)}km), skipping update`);
          return driver;
        }
      }

      // Update location (this will also update lastLocationUpdate timestamp)
      console.log('📍 Smart location update approved - updating location and timestamp');
      return await this.updateDriverLocation(userId, location);
    } catch (error) {
      console.error('Error in smart location update:', error);
      throw error;
    }
  }

  // Helper method to calculate distance between two points
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers
    return distance;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  // Get nearby ride requests
  async getNearbyRideRequests(userId: string, radius: number = 5) {
    try {
      const driver = await prisma.driver.findUnique({
        where: { userId }
      });

      if (!driver) {
        throw new Error('Driver not found');
      }

      if (!driver.currentLocation) {
        throw new Error('Driver location not available');
      }

      const currentLocation = driver.currentLocation as any;
      const requests = await prisma.rideRequest.findMany({
        where: {
          status: RideStatus.REQUESTED,
          expiresAt: {
            gt: new Date()
          }
        },
        include: {
          customer: {
            select: {
              firstName: true,
              lastName: true,
              phoneNumber: true,
            }
          }
        }
      });

      // Filter requests within radius and add distance calculation
      const nearbyRequests = requests
        .map(request => {
          const pickupLocation = request.pickupLocation as any;
          const distance = calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            pickupLocation.latitude,
            pickupLocation.longitude
          );
          return { ...request, distance };
        })
        .filter(request => request.distance <= radius)
        .sort((a, b) => a.distance - b.distance);

      return nearbyRequests;
    } catch (error) {
      console.error('Error getting nearby requests:', error);
      throw error;
    }
  }

  // Accept ride request
  async acceptRideRequest(userId: string, requestId: string) {
    try {
      const driver = await prisma.driver.findUnique({
        where: { userId }
      });

      if (!driver) {
        throw new Error('Driver not found');
      }

      const updatedRequest = await prisma.rideRequest.update({
        where: { requestId },
        data: {
          status: RideStatus.ACCEPTED,
          driverId: driver.id,
          acceptedAt: new Date()
        }
      });

      return updatedRequest;
    } catch (error) {
      console.error('Error accepting ride request:', error);
      throw error;
    }
  }

  // Reject ride request
  async rejectRideRequest(userId: string, requestId: string, reason?: string) {
    try {
      const driver = await prisma.driver.findUnique({
        where: { userId }
      });

      if (!driver) {
        throw new Error('Driver not found');
      }

      const updatedRequest = await prisma.rideRequest.update({
        where: { requestId },
        data: {
          status: RideStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelledBy: 'driver',
          cancellationReason: reason
        }
      });

      return updatedRequest;
    } catch (error) {
      console.error('Error rejecting ride request:', error);
      throw error;
    }
  }

  // Get driver statistics
  async getDriverStats(userId: string): Promise<DriverStats> {
    try {
      const driver = await prisma.driver.findUnique({
        where: { userId }
      });

      if (!driver) {
        throw new Error('Driver not found');
      }

      // Get completed rides
      const completedRides = await prisma.ride.findMany({
        where: {
          driverId: driver.id,
          status: RideStatus.COMPLETED
        }
      });

      // Calculate earnings
      const totalEarnings = completedRides.reduce((sum, ride) => sum + Number(ride.driverEarnings), 0);

      // Calculate today's earnings
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayRides = completedRides.filter(ride => ride.completedAt && ride.completedAt >= today);
      const todayEarnings = todayRides.reduce((sum, ride) => sum + Number(ride.driverEarnings), 0);

      // Calculate weekly earnings
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weeklyRides = completedRides.filter(ride => ride.completedAt && ride.completedAt >= weekAgo);
      const weeklyEarnings = weeklyRides.reduce((sum, ride) => sum + Number(ride.driverEarnings), 0);

      // Calculate monthly earnings
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      const monthlyRides = completedRides.filter(ride => ride.completedAt && ride.completedAt >= monthAgo);
      const monthlyEarnings = monthlyRides.reduce((sum, ride) => sum + Number(ride.driverEarnings), 0);

      return {
        totalRides: completedRides.length,
        totalEarnings,
        rating: driver.rating ? Number(driver.rating) : 0,
        onlineHours: 0, // TODO: Calculate from location history
        todayEarnings,
        weeklyEarnings,
        monthlyEarnings
      };
    } catch (error) {
      console.error('Error getting driver stats:', error);
      throw error;
    }
  }

  // Get active ride
  async getActiveRide(userId: string) {
    try {
      const driver = await prisma.driver.findUnique({
        where: { userId }
      });

      if (!driver) {
        throw new Error('Driver not found');
      }

      const activeRide = await prisma.ride.findFirst({
        where: {
          driverId: driver.id,
          status: {
            in: [RideStatus.ACCEPTED, RideStatus.ARRIVING, RideStatus.ARRIVED, RideStatus.IN_PROGRESS]
          }
        },
        include: {
          customer: {
            select: {
              firstName: true,
              lastName: true,
              phoneNumber: true,
            }
          },
          rideRequest: {
            select: {
              requestId: true,
              estimatedDistance: true,
              estimatedDuration: true,
              estimatedPrice: true
            }
          }
        }
      });

      return activeRide;
    } catch (error) {
      console.error('Error getting active ride:', error);
      throw error;
    }
  }

  // Update ride status
  async updateRideStatus(rideId: string, status: RideStatus, userId: string) {
    try {
      const driver = await prisma.driver.findUnique({
        where: { userId }
      });

      if (!driver) {
        throw new Error('Driver not found');
      }

      const updatedRide = await prisma.ride.update({
        where: { id: rideId },
        data: {
          status,
          ...(status === RideStatus.IN_PROGRESS && { startedAt: new Date() }),
          ...(status === RideStatus.COMPLETED && { completedAt: new Date() })
        }
      });

      // Update driver stats if ride completed
      if (status === RideStatus.COMPLETED) {
        await prisma.driver.update({
          where: { id: driver.id },
          data: {
            totalRides: {
              increment: 1
            },
            totalEarnings: {
              increment: updatedRide.driverEarnings
            }
          }
        });
      }

      return updatedRide;
    } catch (error) {
      console.error('Error updating ride status:', error);
      throw error;
    }
  }
}

export const driverService = new DriverService(); 