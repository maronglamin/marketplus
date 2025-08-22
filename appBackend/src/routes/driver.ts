import express from 'express';
import { authenticate as authenticateToken, AuthRequest } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';
import { DriverService } from '../services/driverService';
import { logger } from '../utils/logger';
import jwt from 'jsonwebtoken';

const router = express.Router();
const prisma = new PrismaClient();

// Helper function to get WebSocket service
function getWebSocketService() {
  return (global as any).webSocketService;
}

/**
 * Update driver location in real-time
 * This endpoint is called frequently by the driver app to update their position
 */
router.post('/location/update', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    const { latitude, longitude, accuracy, speed, heading, rideId } = req.body;

    // Validate required fields
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    // Get driver record first
    const driver = await prisma.driver.findUnique({
      where: { userId }
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    // Update driver's current location
    // First try to find existing location record
    const existingLocation = await prisma.driverLocation.findFirst({
      where: { driverId: driver.id }
    });

    if (existingLocation) {
      // Update existing record
      await prisma.driverLocation.update({
        where: { id: existingLocation.id },
        data: {
          latitude,
          longitude,
          accuracy: accuracy || null,
          speed: speed || null,
          heading: heading || null,
          timestamp: new Date()
        }
      });
    } else {
      // Create new record
      await prisma.driverLocation.create({
        data: {
          driverId: driver.id,
          latitude,
          longitude,
          accuracy: accuracy || null,
          speed: speed || null,
          heading: heading || null
        }
      });
    }

    // If this is during an active ride, send location update to customer
    if (rideId) {
      try {
        const webSocketService = getWebSocketService();
        if (webSocketService) {
          await webSocketService.sendDriverLocationUpdate(rideId, {
            latitude,
            longitude,
            accuracy,
            speed,
            heading,
            timestamp: new Date()
          });
        }
      } catch (wsError) {
        console.error('⚠️ WebSocket location update failed:', wsError);
        // Don't fail the main operation if WebSocket fails
      }
    }

    res.json({
      success: true,
      message: 'Driver location updated successfully',
      data: {
        latitude,
        longitude,
        accuracy,
        speed,
        heading,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Error updating driver location:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update driver location',
      error: error.message
    });
  }
});

/**
 * Get driver's current location
 */
router.get('/location/current', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Get driver record first
    const driver = await prisma.driver.findUnique({
      where: { userId }
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    const location = await prisma.driverLocation.findFirst({
      where: { driverId: driver.id }
    });

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Driver location not found'
      });
    }

    res.json({
      success: true,
      data: location
    });

  } catch (error) {
    console.error('❌ Error getting driver location:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get driver location',
      error: error.message
    });
  }
});

/**
 * Get driver's ride history
 */
router.get('/rides/history', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Get driver record first
    const driver = await prisma.driver.findUnique({
      where: { userId }
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const rides = await prisma.ride.findMany({
      where: { driverId: driver.id },
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
            name: true,
            vehicleType: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit
    });

    const total = await prisma.ride.count({
      where: { driverId: driver.id }
    });

    res.json({
      success: true,
      data: {
        rides,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('❌ Error getting driver ride history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get driver ride history',
      error: error.message
    });
  }
});

/**
 * Get driver's current active ride
 */
router.get('/rides/active', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Get driver record first
    const driver = await prisma.driver.findUnique({
      where: { userId }
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    const activeRide = await prisma.ride.findFirst({
      where: {
        driverId: driver.id,
        status: {
          in: ['ACCEPTED', 'ARRIVING', 'ARRIVED', 'IN_PROGRESS']
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
        rideRequest: {
          select: {
            pickupLocation: true,
            destinationLocation: true,
            estimatedPrice: true,
            estimatedDistance: true,
            estimatedDuration: true
          }
        }
      }
    });

    if (!activeRide) {
      return res.json({
        success: true,
        data: null,
        message: 'No active ride found'
      });
    }

    res.json({
      success: true,
      data: activeRide
    });

  } catch (error) {
    console.error('❌ Error getting active ride:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get active ride',
      error: error.message
    });
  }
});

/**
 * Update driver status (online/offline/busy)
 */
router.put('/status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    const { status, location } = req.body;

    if (!['ONLINE', 'OFFLINE', 'BUSY'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be ONLINE, OFFLINE, or BUSY'
      });
    }

    // Convert status to boolean for the service method
    const isOnline = status === 'ONLINE';
    
    // Use the DriverService to properly update both isOnline and status fields
    const driverService = new DriverService();
    const updatedDriver = await driverService.updateDriverStatus(userId, isOnline, location);

    res.json({
      success: true,
      message: 'Driver status updated successfully',
      data: {
        id: updatedDriver.id,
        status: updatedDriver.status,
        isOnline: updatedDriver.isOnline
      }
    });

  } catch (error) {
    console.error('❌ Error updating driver status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update driver status',
      error: error.message
    });
  }
});

/**
 * Update driver status (POST method for compatibility)
 */
router.post('/status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    const { status, location } = req.body;

    if (!['ONLINE', 'OFFLINE', 'BUSY'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be ONLINE, OFFLINE, or BUSY'
      });
    }

    // Convert status to boolean for the service method
    const isOnline = status === 'ONLINE';
    
    // Use the DriverService to properly update both isOnline and status fields
    const driverService = new DriverService();
    const updatedDriver = await driverService.updateDriverStatus(userId, isOnline, location);

    res.json({
      success: true,
      message: 'Driver status updated successfully',
      data: {
        id: updatedDriver.id,
        status: updatedDriver.status,
        isOnline: updatedDriver.isOnline
      }
    });

  } catch (error) {
    console.error('❌ Error updating driver status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update driver status',
      error: error.message
    });
  }
});

/**
 * Get driver profile
 */
router.get('/profile', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Use the DriverService to get driver profile (handles creation if needed)
    const driverService = new DriverService();
    const driver = await driverService.getDriverProfile(userId);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    res.json({
      success: true,
      data: driver
    });

  } catch (error) {
    console.error('❌ Error getting driver profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get driver profile',
      error: error.message
    });
  }
});

/**
 * Get vehicle images for a specific driver
 * Returns CAR_INTERIOR_PHOTO and CAR_EXTERIOR_PHOTO documents
 * Uses distant relationship: Driver → RiderApplication → RiderDocument
 */
router.get('/:driverId/vehicle-images', async (req, res) => {
  try {
    const { driverId } = req.params;
    if (!driverId) {
      return res.status(400).json({ success: false, message: 'driverId is required' });
    }

    // Get the driver with their rider application and documents
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        riderApplication: {
          include: {
            documents: {
              where: {
                documentType: { in: ['CAR_INTERIOR_PHOTO', 'CAR_EXTERIOR_PHOTO'] }
              },
              select: {
                id: true,
                documentType: true,
                fileUrl: true,
                fileName: true,
                uploadedAt: true
              },
              orderBy: { uploadedAt: 'desc' }
            }
          }
        }
      }
    });

    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    if (!driver.riderApplication) {
      return res.status(404).json({ success: false, message: 'Rider application not found' });
    }

    // Group images by type from the included documents
    const groupedImages = {
      interior: driver.riderApplication.documents.filter(img => img.documentType === 'CAR_INTERIOR_PHOTO'),
      exterior: driver.riderApplication.documents.filter(img => img.documentType === 'CAR_EXTERIOR_PHOTO')
    };

    return res.json({ 
      success: true, 
      data: groupedImages 
    });
  } catch (error: any) {
    console.error('Error fetching vehicle images:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch vehicle images', 
      error: error?.message || String(error) 
    });
  }
});

/**
 * Get vehicle images for a specific user
 * Returns CAR_INTERIOR_PHOTO and CAR_EXTERIOR_PHOTO documents
 * Uses distant relationship: User → RiderApplication → RiderDocument
 */
router.get('/user/:userId/vehicle-images', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }

    // Get the user's rider application with documents
    const riderApplication = await prisma.riderApplication.findFirst({
      where: { userId },
      include: {
        documents: {
          where: {
            documentType: { in: ['CAR_INTERIOR_PHOTO', 'CAR_EXTERIOR_PHOTO'] }
          },
          select: {
            id: true,
            documentType: true,
            fileUrl: true,
            fileName: true,
            uploadedAt: true
          },
          orderBy: { uploadedAt: 'desc' }
        }
      }
    });

    if (!riderApplication) {
      return res.status(404).json({ success: false, message: 'Rider application not found for this user' });
    }

    // Group images by type
    const groupedImages = {
      interior: riderApplication.documents.filter(img => img.documentType === 'CAR_INTERIOR_PHOTO'),
      exterior: riderApplication.documents.filter(img => img.documentType === 'CAR_EXTERIOR_PHOTO')
    };

    return res.json({ 
      success: true, 
      data: groupedImages 
    });
  } catch (error: any) {
    console.error('Error fetching vehicle images for user:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch vehicle images', 
      error: error?.message || String(error) 
    });
  }
});

/**
 * Get verified rental drivers for a given service with availability check
 * Filters: isVerified = true, isActive = true, isRentalType = true, rideServiceId matches
 * Excludes drivers who have conflicting bookings during the specified date range
 * Excludes the current user from the list (if authenticated)
 */
router.get('/rental/:serviceId/available', async (req, res) => {
  try {
    // Get user ID from token if available, but don't require authentication
    let currentUserId: string | null = null;
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as {
          userId: string;
          deviceId: string;
        };
        currentUserId = decoded.userId;
      }
    } catch (error) {
      // Token is invalid or missing, continue without user exclusion
      console.log('No valid token found, showing all drivers');
    }

    const { serviceId } = req.params;
    const { startDate, endDate } = req.query;
    
    if (!serviceId) {
      return res.status(400).json({ success: false, message: 'serviceId is required' });
    }
    
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'startDate and endDate are required' });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    // Get all drivers for the service (excluding the current user if authenticated)
    const whereClause: any = {
      isVerified: true,
      isActive: true,
      isRentalType: true,
      rideServiceId: serviceId,
    };
    
    // Exclude current user if we have a valid user ID
    if (currentUserId) {
      whereClause.userId = { not: currentUserId };
    }
    
    const allDrivers = await prisma.driver.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, phoneNumber: true },
        },
        riderApplication: {
          include: {
            documents: {
              where: {
                documentType: { in: ['CAR_INTERIOR_PHOTO', 'CAR_EXTERIOR_PHOTO'] }
              },
              select: {
                id: true,
                documentType: true,
                fileUrl: true,
                fileName: true,
                uploadedAt: true
              },
              orderBy: { uploadedAt: 'desc' }
            }
          }
        },
        rideService: { select: { id: true, name: true, description: true } },
      },
    });

    if (allDrivers.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Get conflicting bookings for the date range
    const conflictingBookings = await prisma.rentalRequest.findMany({
      where: {
        driverId: { in: allDrivers.map(d => d.id) },
        status: { in: ['PENDING_QUOTE', 'QUOTED', 'ACCEPTED'] }, // Only check active bookings
        OR: [
          // Booking starts during the requested period
          {
            startDate: { gte: start, lte: end }
          },
          // Booking ends during the requested period
          {
            endDate: { gte: start, lte: end }
          },
          // Booking spans the entire requested period
          {
            startDate: { lte: start },
            endDate: { gte: end }
          }
        ]
      },
      select: {
        driverId: true
      }
    });

    // Get driver IDs that have conflicting bookings
    const conflictingDriverIds = new Set(conflictingBookings.map(booking => booking.driverId));

    // Filter out drivers with conflicting bookings
    const availableDrivers = allDrivers.filter(driver => !conflictingDriverIds.has(driver.id));

    const payload = availableDrivers.map((d) => ({
      id: d.id,
      userId: d.userId,
      driverId: d.driverId,
      isOnline: d.isOnline,
      status: d.status,
      totalRides: d.totalRides,
      totalEarnings: (d.totalEarnings as any)?.toString?.() ?? String(d.totalEarnings ?? ''),
      rating: (d.rating as any)?.toString?.() ?? (d.rating as any),
      ratingCount: d.ratingCount,
      isVerified: d.isVerified,
      isActive: d.isActive,
      isRentalType: d.isRentalType,
      rideService: d.rideService,
      user: d.user,
      riderApplication: {
        id: d.riderApplication?.id,
        firstName: (d.riderApplication as any)?.firstName,
        lastName: (d.riderApplication as any)?.lastName,
        address: (d.riderApplication as any)?.address,
        vehicleModel: d.riderApplication?.vehicleModel,
        vehicleType: d.riderApplication?.vehicleType,
        licensePlate: d.riderApplication?.vehiclePlate,
        documents: (d.riderApplication as any)?.documents || [],
      },
      documents: (d.riderApplication as any)?.documents || [],
    }));

    logger.info(`Returned ${payload.length} available rental drivers for service ${serviceId} from ${startDate} to ${endDate}`);
    return res.json({ success: true, data: payload });
  } catch (error: any) {
    console.error('Error fetching available rental drivers:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch available rental drivers', error: error?.message || String(error) });
  }
});

/**
 * Get verified rental drivers for a given service
 * Filters: isVerified = true, isActive = true, isRentalType = true, rideServiceId matches
 * Includes: user basic info, riderApplication vehicle details, documents limited to interior/exterior car photos
 * Excludes the current user from the list (if authenticated)
 */
router.get('/rental/:serviceId', async (req, res) => {
  try {
    // Get user ID from token if available, but don't require authentication
    let currentUserId: string | null = null;
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as {
          userId: string;
          deviceId: string;
        };
        currentUserId = decoded.userId;
      }
    } catch (error) {
      // Token is invalid or missing, continue without user exclusion
      console.log('No valid token found, showing all drivers');
    }

    const { serviceId } = req.params;
    if (!serviceId) {
      return res.status(400).json({ success: false, message: 'serviceId is required' });
    }

    // Build where clause
    const whereClause: any = {
      isVerified: true,
      isActive: true,
      isRentalType: true,
      rideServiceId: serviceId,
    };
    
    // Exclude current user if we have a valid user ID
    if (currentUserId) {
      whereClause.userId = { not: currentUserId };
    }
    
    const drivers = await prisma.driver.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, phoneNumber: true },
        },
        riderApplication: {
          include: {
            documents: {
              where: {
                documentType: { in: ['CAR_INTERIOR_PHOTO', 'CAR_EXTERIOR_PHOTO'] }
              },
              select: {
                id: true,
                documentType: true,
                fileUrl: true,
                fileName: true,
                uploadedAt: true
              },
              orderBy: { uploadedAt: 'desc' }
            }
          }
        },
        rideService: { select: { id: true, name: true, description: true } },
        // Documents are stored in rider_documents table linked via riderApplication
        // We'll fetch CAR_INTERIOR_PHOTO and CAR_EXTERIOR_PHOTO
      },
    });

    if (drivers.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const payload = drivers.map((d) => ({
      id: d.id,
      userId: d.userId,
      driverId: d.driverId,
      isOnline: d.isOnline,
      status: d.status,
      totalRides: d.totalRides,
      totalEarnings: (d.totalEarnings as any)?.toString?.() ?? String(d.totalEarnings ?? ''),
      rating: (d.rating as any)?.toString?.() ?? (d.rating as any),
      ratingCount: d.ratingCount,
      isVerified: d.isVerified,
      isActive: d.isActive,
      isRentalType: d.isRentalType,
      rideService: d.rideService,
      user: d.user,
      riderApplication: {
        id: d.riderApplication?.id,
        firstName: (d.riderApplication as any)?.firstName,
        lastName: (d.riderApplication as any)?.lastName,
        address: (d.riderApplication as any)?.address,
        vehicleModel: d.riderApplication?.vehicleModel,
        vehicleType: d.riderApplication?.vehicleType,
        licensePlate: d.riderApplication?.vehiclePlate,
        documents: (d.riderApplication as any)?.documents || [],
      },
      documents: (d.riderApplication as any)?.documents || [],
    }));

    logger.info(`Returned ${payload.length} rental drivers for service ${serviceId}`);
    return res.json({ success: true, data: payload });
  } catch (error: any) {
    console.error('Error fetching rental drivers:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch rental drivers', error: error?.message || String(error) });
  }
});

/**
 * Get all verified rental drivers (across services)
 * Excludes the current user from the list (if authenticated)
 */
router.get('/rental/verified', async (req, res) => {
  try {
    // Get user ID from token if available, but don't require authentication
    let currentUserId: string | null = null;
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as {
          userId: string;
          deviceId: string;
        };
        currentUserId = decoded.userId;
      }
    } catch (error) {
      // Token is invalid or missing, continue without user exclusion
      console.log('No valid token found, showing all drivers');
    }

    // Build where clause
    const whereClause: any = { 
      isVerified: true, 
      isActive: true, 
      isRentalType: true, 
      rideServiceId: { not: null },
    };
    
    // Exclude current user if we have a valid user ID
    if (currentUserId) {
      whereClause.userId = { not: currentUserId };
    }
    
    const drivers = await prisma.driver.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, phoneNumber: true } },
        riderApplication: { 
          include: {
            documents: {
              where: {
                documentType: { in: ['CAR_INTERIOR_PHOTO', 'CAR_EXTERIOR_PHOTO'] }
              },
              select: {
                id: true,
                documentType: true,
                fileUrl: true,
                fileName: true,
                uploadedAt: true
              },
              orderBy: { uploadedAt: 'desc' }
            }
          }
        },
        rideService: { select: { id: true, name: true, description: true } },
      },
    });

    if (drivers.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const payload = drivers.map((d) => ({
      id: d.id,
      userId: d.userId,
      driverId: d.driverId,
      isOnline: d.isOnline,
      status: d.status,
      totalRides: d.totalRides,
      totalEarnings: (d.totalEarnings as any)?.toString?.() ?? String(d.totalEarnings ?? ''),
      rating: (d.rating as any)?.toString?.() ?? (d.rating as any),
      ratingCount: d.ratingCount,
      isVerified: d.isVerified,
      isActive: d.isActive,
      isRentalType: d.isRentalType,
      rideService: d.rideService,
      user: d.user,
      riderApplication: {
        id: d.riderApplication?.id,
        firstName: (d.riderApplication as any)?.firstName,
        lastName: (d.riderApplication as any)?.lastName,
        address: (d.riderApplication as any)?.address,
        vehicleModel: d.riderApplication?.vehicleModel,
        vehicleType: d.riderApplication?.vehicleType,
        licensePlate: d.riderApplication?.vehiclePlate,
        documents: (d.riderApplication as any)?.documents || [],
      },
      documents: (d.riderApplication as any)?.documents || [],
    }));

    return res.json({ success: true, data: payload });
  } catch (error: any) {
    console.error('Error fetching verified rental drivers:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch verified rental drivers', error: error?.message || String(error) });
  }
});

/**
 * Get driver statistics and earnings
 */
router.get('/stats', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Get driver record first
    const driver = await prisma.driver.findUnique({
      where: { userId }
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    // Get period filter from query params
    const period = req.query.period as string || 'TODAY';
    
    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'TODAY':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'WEEK':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'MONTH':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'ALL':
        startDate = new Date(0); // Beginning of time
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    // Get completed rides with earnings
    const completedRides = await prisma.ride.findMany({
      where: {
        driverId: driver.id,
        status: 'COMPLETED',
        createdAt: {
          gte: startDate
        }
      },
      select: {
        id: true,
        driverEarnings: true,
        totalFare: true,
        createdAt: true,
        completedAt: true,
        customer: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calculate statistics
    const totalRides = completedRides.length;
    const totalEarnings = completedRides.reduce((sum, ride) => sum + Number(ride.driverEarnings), 0);
    
    // Calculate today's earnings
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayRides = completedRides.filter(ride => 
      new Date(ride.createdAt) >= todayStart
    );
    const todayEarnings = todayRides.reduce((sum, ride) => sum + Number(ride.driverEarnings), 0);

    // Calculate weekly earnings (last 7 days)
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weeklyRides = completedRides.filter(ride => 
      new Date(ride.createdAt) >= weekStart
    );
    const weeklyEarnings = weeklyRides.reduce((sum, ride) => sum + Number(ride.driverEarnings), 0);

    // Calculate monthly earnings (current month)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyRides = completedRides.filter(ride => 
      new Date(ride.createdAt) >= monthStart
    );
    const monthlyEarnings = monthlyRides.reduce((sum, ride) => sum + Number(ride.driverEarnings), 0);

    // Calculate online hours (mock data for now)
    const onlineHours = Math.floor(Math.random() * 24) + 1;

    // Calculate average rating (mock data for now)
    const rating = 4.5 + (Math.random() * 0.5);

    res.json({
      success: true,
      data: {
        totalRides,
        totalEarnings,
        todayEarnings,
        weeklyEarnings,
        monthlyEarnings,
        onlineHours,
        rating: parseFloat(rating.toFixed(1)),
        currency: 'GMD',
        currencySymbol: 'D'
      }
    });

  } catch (error) {
    console.error('❌ Error getting driver stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get driver stats',
      error: error.message
    });
  }
});

/**
 * Get driver earnings by period
 */
router.get('/earnings', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Get driver record first
    const driver = await prisma.driver.findUnique({
      where: { userId }
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    // Get period filter from query params
    const period = req.query.period as string || 'TODAY';
    
    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    let days: number;
    
    switch (period) {
      case 'TODAY':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        days = 1;
        break;
      case 'WEEK':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        days = 7;
        break;
      case 'MONTH':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        days = 30;
        break;
      case 'ALL':
        startDate = new Date(0); // Beginning of time
        days = 90;
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        days = 1;
    }

    // Get completed rides grouped by date
    const completedRides = await prisma.ride.findMany({
      where: {
        driverId: driver.id,
        status: 'COMPLETED',
        createdAt: {
          gte: startDate
        }
      },
      select: {
        id: true,
        driverEarnings: true,
        totalFare: true,
        createdAt: true,
        completedAt: true,
        customer: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Group rides by date
    const earningsByDate = new Map<string, {
      date: string;
      amount: number;
      rides: number;
      status: string;
      createdAt: string;
    }>();

    completedRides.forEach(ride => {
      const date = new Date(ride.createdAt).toISOString().split('T')[0];
      const existing = earningsByDate.get(date);
      
      if (existing) {
        existing.amount += Number(ride.driverEarnings);
        existing.rides += 1;
      } else {
        earningsByDate.set(date, {
          date,
          amount: Number(ride.driverEarnings),
          rides: 1,
          status: 'SETTLED', // All completed rides are considered settled
          createdAt: ride.createdAt.toISOString()
        });
      }
    });

    // Convert to array and sort by date (newest first)
    const earnings = Array.from(earningsByDate.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({
      success: true,
      data: {
        earnings,
        period,
        totalEarnings: earnings.reduce((sum, e) => sum + e.amount, 0),
        totalRides: earnings.reduce((sum, e) => sum + e.rides, 0),
        currency: 'GMD',
        currencySymbol: 'D'
      }
    });

  } catch (error) {
    console.error('❌ Error getting driver earnings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get driver earnings',
      error: error.message
    });
  }
});

/**
 * Get available settlement amount
 */
router.get('/settlements/available', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Get driver record first
    const driver = await prisma.driver.findUnique({
      where: { userId }
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    // Get available rides for settlement (paid but not settled)
    const availableRides = await prisma.ride.findMany({
      where: {
        driverId: driver.id,
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        settlementStatus: 'PENDING'
      },
      select: {
        id: true,
        rideId: true,
        driverEarnings: true,
        totalFare: true,
        createdAt: true
      }
    });

    const totalAvailable = availableRides.reduce((sum, ride) => sum + Number(ride.driverEarnings), 0);

    res.json({
      success: true,
      data: {
        availableAmount: totalAvailable,
        rideCount: availableRides.length,
        currency: 'GMD',
        currencySymbol: 'D'
      }
    });

  } catch (error) {
    console.error('❌ Error getting available settlement amount:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get available settlement amount',
      error: error.message
    });
  }
});

/**
 * Get driver settlement history
 */
router.get('/settlements', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Get driver record first
    const driver = await prisma.driver.findUnique({
      where: { userId }
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    // Get settlements for this driver (RIDES type)
    const settlements = await prisma.settlement.findMany({
      where: {
        userId,
        type: 'RIDES'
      },
      include: {
        bankAccount: {
          select: {
            accountName: true,
            accountNumber: true,
            bankName: true
          }
        },
        wallet: {
          select: {
            walletType: true,
            account: true,
            walletAddress: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit
    });

    const total = await prisma.settlement.count({
      where: {
        userId,
        type: 'RIDES'
      }
    });

    res.json({
      success: true,
      data: {
        settlements,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('❌ Error getting driver settlements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get driver settlements',
      error: error.message
    });
  }
});

/**
 * Get driver settlement details
 */
router.get('/settlements/:settlementId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const { settlementId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Get driver record first
    const driver = await prisma.driver.findUnique({
      where: { userId }
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    // Get settlement details
    const settlement = await prisma.settlement.findFirst({
      where: {
        id: settlementId,
        userId,
        type: 'RIDES'
      },
      include: {
        bankAccount: {
          select: {
            accountName: true,
            accountNumber: true,
            bankName: true,
            bankCode: true,
            branchCode: true,
            swiftCode: true,
            iban: true
          }
        },
        wallet: {
          select: {
            walletType: true,
            account: true,
            walletAddress: true,
            currency: true
          }
        }
      }
    });

    if (!settlement) {
      return res.status(404).json({
        success: false,
        message: 'Settlement not found'
      });
    }

    // Get included rides from metadata
    const metadata = settlement.metadata as any;
    const includedRideIds = metadata?.includedRideIds || [];
    const includedRides = await prisma.ride.findMany({
      where: {
        id: { in: includedRideIds },
        driverId: driver.id
      },
      select: {
        id: true,
        rideId: true,
        driverEarnings: true,
        totalFare: true,
        createdAt: true,
        completedAt: true,
        customer: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: {
        settlement,
        includedRides
      }
    });

  } catch (error) {
    console.error('❌ Error getting settlement details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get settlement details',
      error: error.message
    });
  }
});

/**
 * Request ride settlement
 */
router.post('/settlements/request', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const { amount, paymentMethod, bankAccountId, walletId } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Get driver record first
    const driver = await prisma.driver.findUnique({
      where: { userId }
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid settlement amount'
      });
    }

    // Get available rides for settlement (paid but not settled)
    const availableRides = await prisma.ride.findMany({
      where: {
        driverId: driver.id,
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        settlementStatus: 'PENDING'
      },
      select: {
        id: true,
        rideId: true,
        driverEarnings: true,
        totalFare: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    const totalAvailable = availableRides.reduce((sum, ride) => sum + Number(ride.driverEarnings), 0);

    if (amount > totalAvailable) {
      return res.status(400).json({
        success: false,
        message: `Insufficient funds. Available: ${totalAvailable.toFixed(2)}`
      });
    }

    // Calculate which rides to include in this settlement
    let remainingAmount = amount;
    const includedRides = [];
    const rideIdsToUpdate = [];

    for (const ride of availableRides) {
      if (remainingAmount <= 0) break;
      
      const rideAmount = Number(ride.driverEarnings);
      if (rideAmount <= remainingAmount) {
        includedRides.push({
          ...ride,
          settlementAmount: rideAmount
        });
        rideIdsToUpdate.push(ride.id);
        remainingAmount -= rideAmount;
      } else {
        // Partial settlement for this ride
        includedRides.push({
          ...ride,
          settlementAmount: remainingAmount
        });
        rideIdsToUpdate.push(ride.id);
        remainingAmount = 0;
      }
    }

    // Generate reference number
    const reference = `RIDE_SETT_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create settlement record
    const settlement = await prisma.settlement.create({
      data: {
        userId,
        amount,
        currency: 'GMD',
        status: 'PENDING',
        type: 'RIDES',
        reference,
        bankAccountId: paymentMethod === 'BANK_TRANSFER' ? bankAccountId : null,
        walletId: paymentMethod === 'WALLET_TRANSFER' ? walletId : null,
        metadata: {
          includedRideIds: rideIdsToUpdate,
          includedRides: includedRides,
          driverId: driver.id,
          requestSource: 'DRIVER_APP'
        }
      }
    });

    // Update ride settlement status
    await prisma.ride.updateMany({
      where: {
        id: { in: rideIdsToUpdate }
      },
      data: {
        settlementStatus: 'SETTLED'
      }
    });

    res.json({
      success: true,
      data: {
        settlement,
        includedRides,
        message: 'Settlement request submitted successfully'
      }
    });

  } catch (error) {
    console.error('❌ Error requesting settlement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to request settlement',
      error: error.message
    });
  }
});

export default router; 