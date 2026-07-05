import { Router } from 'express';
import { RentalService } from '../services/rentalService';
import { PrismaClient, TransactionType } from '@prisma/client';
import UCPService from '../services/ucpService';
import { authenticate } from '../middleware/auth';
import { notificationService } from '../services/notificationService';

const router = Router();
const prisma = new PrismaClient();

router.post('/', authenticate, async (req: any, res) => {
  try {
    const {
      customerId,
      rideServiceId,
      driverId,
      riderApplicationId,
      pickupAddress,
      pickupLatitude,
      pickupLongitude,
      startDate,
      endDate,
      notes,
    } = req.body || {};

    // Basic validation
    if (!customerId || !rideServiceId || !pickupAddress || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Missing required fields: customerId, rideServiceId, pickupAddress, startDate, endDate' });
    }

    // Ensure the authenticated user is the customer creating the rental
    console.log('Rental route: req.user.id:', req.user?.id);
    console.log('Rental route: customerId:', customerId);
    console.log('Rental route: user types:', typeof req.user?.id, typeof customerId);
    console.log('Rental route: user stringified:', JSON.stringify(req.user?.id));
    console.log('Rental route: customerId stringified:', JSON.stringify(customerId));
    console.log('Rental route: strict equality:', req.user?.id === customerId);
    console.log('Rental route: loose equality:', req.user?.id == customerId);
    console.log('Rental route: comparison result:', req.user?.id !== customerId);
    
    if (!req.user?.id || req.user.id !== customerId) {
      return res.status(403).json({ success: false, message: 'Access denied - can only create rentals for yourself' });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid startDate or endDate' });
    }
    if (end.getTime() <= start.getTime()) {
      return res.status(400).json({ success: false, message: 'endDate must be after startDate' });
    }

    // Validate existence of related entities to avoid FK failures
    const rideService = await prisma.rideService.findUnique({ where: { id: rideServiceId } });
    if (!rideService) {
      return res.status(404).json({ success: false, message: 'Ride service not found' });
    }

    if (driverId) {
      const driver = await prisma.driver.findUnique({ where: { id: driverId } });
      if (!driver) {
        return res.status(404).json({ success: false, message: 'Driver not found' });
      }
    }

    if (riderApplicationId) {
      const riderApp = await prisma.riderApplication.findUnique({ where: { id: riderApplicationId } });
      if (!riderApp) {
        return res.status(404).json({ success: false, message: 'Rider application not found' });
      }
    }

    const rental = await RentalService.createRentalRequest({
      customerId,
      rideServiceId,
      driverId,
      riderApplicationId,
      pickupAddress,
      pickupLatitude: pickupLatitude ?? null,
      pickupLongitude: pickupLongitude ?? null,
      startDate,
      endDate,
      notes,
    });
    return res.json({ success: true, data: rental });
  } catch (error: any) {
    console.error('Error creating rental request:', error);
    // Surface Prisma validation errors cleanly
    const message = error?.message || 'Failed to create rental request';
    return res.status(500).json({ success: false, message });
  }
});

// Accept rental request
router.patch('/:rentalId/accept', authenticate, async (req: any, res) => {
  try {
    const { rentalId } = req.params;
    const { agreedPrice } = req.body;
    const userId = req.user?.id;
    
    if (!rentalId) {
      return res.status(400).json({ success: false, message: 'rentalId is required' });
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // First, find the driver record for the current user
    const driver = await prisma.driver.findUnique({
      where: { userId: userId }
    });

    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver profile not found' });
    }

    // Check if the rental request belongs to this driver
    const rental = await prisma.rentalRequest.findFirst({
      where: { 
        id: rentalId,
        driverId: driver.id
      }
    });

    if (!rental) {
      return res.status(403).json({ success: false, message: 'Rental request not found or access denied' });
    }

    // Update the rental request
    const updatedRental = await prisma.rentalRequest.update({
      where: { id: rentalId },
      data: {
        status: 'ACCEPTED',
        agreedPrice: agreedPrice ? parseFloat(agreedPrice) : undefined,
        updatedAt: new Date()
      }
    });

    return res.json({ success: true, data: updatedRental });
  } catch (error: any) {
    console.error('Error accepting rental:', error);
    return res.status(500).json({ success: false, message: 'Failed to accept rental', error: error?.message || String(error) });
  }
});

// Reject rental request
router.patch('/:rentalId/reject', authenticate, async (req: any, res) => {
  try {
    const { rentalId } = req.params;
    const userId = req.user?.id;
    
    if (!rentalId) {
      return res.status(400).json({ success: false, message: 'rentalId is required' });
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // First, find the driver record for the current user
    const driver = await prisma.driver.findUnique({
      where: { userId: userId }
    });

    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver profile not found' });
    }

    // Check if the rental request belongs to this driver
    const rental = await prisma.rentalRequest.findFirst({
      where: { 
        id: rentalId,
        driverId: driver.id
      }
    });

    if (!rental) {
      return res.status(403).json({ success: false, message: 'Rental request not found or access denied' });
    }

    // Update the rental request
    const updatedRental = await prisma.rentalRequest.update({
      where: { id: rentalId },
      data: {
        status: 'REJECTED',
        updatedAt: new Date()
      }
    });

    return res.json({ success: true, data: updatedRental });
  } catch (error: any) {
    console.error('Error rejecting rental:', error);
    return res.status(500).json({ success: false, message: 'Failed to reject rental', error: error?.message || String(error) });
  }
});

// Add proposed price to rental request (Quote)
router.patch('/:rentalId/quote', authenticate, async (req: any, res) => {
  try {
    const { rentalId } = req.params;
    const { proposedPrice, currency } = req.body;
    const userId = req.user?.id;
    
    if (!rentalId) {
      return res.status(400).json({ success: false, message: 'rentalId is required' });
    }

    if (!proposedPrice || isNaN(parseFloat(proposedPrice)) || parseFloat(proposedPrice) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid proposedPrice is required' });
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // First, find the driver record for the current user
    const driver = await prisma.driver.findUnique({
      where: { userId: userId }
    });

    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver profile not found' });
    }

    // Check if the rental request belongs to this driver
    const rental = await prisma.rentalRequest.findFirst({
      where: { 
        id: rentalId,
        driverId: driver.id
      }
    });

    if (!rental) {
      return res.status(403).json({ success: false, message: 'Rental request not found or access denied' });
    }

    // Check if the rental is in PENDING_QUOTE status
    if (rental.status !== 'PENDING_QUOTE') {
      return res.status(400).json({ success: false, message: 'Can only add price to PENDING_QUOTE requests' });
    }

    // Update the rental request with proposed price and change status to QUOTED
    const updateData: any = {
      status: 'QUOTED',
      proposedPrice: parseFloat(proposedPrice),
      updatedAt: new Date()
    };

    // Add currency if provided
    if (currency) {
      updateData.currency = currency;
    }

    const updatedRental = await prisma.rentalRequest.update({
      where: { id: rentalId },
      data: updateData
    });

    // Log a chat message about the proposed price
    try {
      const driverUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true }
      });

      const driverName = driverUser ? `${driverUser.firstName} ${driverUser.lastName}` : 'Asset Owner';
      const currencySymbol = currency || '$';
      
      await prisma.rentalMessage.create({
        data: {
          rentalId: rentalId,
          senderId: userId,
          senderType: 'DRIVER',
          content: `Your rental ride request has been charged on a proposed price of ${currencySymbol}${proposedPrice} by the asset owner ${driverName}`,
          isRead: false
        }
      });
    } catch (error) {
      console.error('Error creating chat message for proposed price:', error);
      // Don't fail the main operation if chat message creation fails
    }

    return res.json({ success: true, data: updatedRental });
  } catch (error: any) {
    console.error('Error adding price to rental:', error);
    return res.status(500).json({ success: false, message: 'Failed to add price to rental', error: error?.message || String(error) });
  }
});

// Update agreed price for rental request
router.patch('/:rentalId/update-agreed-price', authenticate, async (req: any, res) => {
  try {
    const { rentalId } = req.params;
    const { agreedPrice, currency } = req.body;
    const userId = req.user?.id;
    
    if (!rentalId) {
      return res.status(400).json({ success: false, message: 'rentalId is required' });
    }

    if (!agreedPrice || isNaN(parseFloat(agreedPrice)) || parseFloat(agreedPrice) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid agreedPrice is required' });
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // First, find the driver record for the current user
    const driver = await prisma.driver.findUnique({
      where: { userId: userId }
    });

    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver profile not found' });
    }

    // Check if the rental request belongs to this driver
    const rental = await prisma.rentalRequest.findFirst({
      where: { 
        id: rentalId,
        driverId: driver.id
      }
    });

    if (!rental) {
      return res.status(403).json({ success: false, message: 'Rental request not found or access denied' });
    }

    // Update the rental request with agreed price
    const updateData: any = {
      agreedPrice: parseFloat(agreedPrice),
      updatedAt: new Date()
    };

    // Add currency if provided
    if (currency) {
      updateData.currency = currency;
    }

    const updatedRental = await prisma.rentalRequest.update({
      where: { id: rentalId },
      data: updateData
    });

    // Log a chat message about the agreed price update
    try {
      const driverUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true }
      });

      const driverName = driverUser ? `${driverUser.firstName} ${driverUser.lastName}` : 'Asset Owner';
      const currencySymbol = currency || '$';
      
      await prisma.rentalMessage.create({
        data: {
          rentalId: rentalId,
          senderId: userId,
          senderType: 'DRIVER',
          content: `Agreed price has been updated to ${currencySymbol}${agreedPrice} by ${driverName}`,
          isRead: false
        }
      });
    } catch (error) {
      console.error('Error creating chat message for agreed price update:', error);
      // Don't fail the main operation if chat message creation fails
    }

    return res.json({ success: true, data: updatedRental });
  } catch (error: any) {
    console.error('Error updating agreed price:', error);
    return res.status(500).json({ success: false, message: 'Failed to update agreed price', error: error?.message || String(error) });
  }
});

// Get rental requests by customerId (paginated)
router.get('/customer/:customerId', authenticate, async (req: any, res) => {
  try {
    const { customerId } = req.params;
    const { status } = req.query as { status?: string };
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt((req.query.limit as string) || '10', 10))); // clamp 1..100
    
    console.log('Rental API: Parsed pagination - page:', page, 'limit:', limit, 'skip:', (page - 1) * limit);
    const userId = req.user?.id;
    
    if (!customerId) {
      return res.status(400).json({ success: false, message: 'customerId is required' });
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Ensure the authenticated user is requesting their own rentals
    if (userId !== customerId) {
      return res.status(403).json({ success: false, message: 'Access denied - can only view own rentals' });
    }

    console.log('Rental API: Fetching rentals for customer:', customerId);
    console.log('Rental API: Status filter:', status, 'page:', page, 'limit:', limit);

    const where: any = { customerId };
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const skipValue = (page - 1) * limit;
    console.log('Rental API: Query params - where:', where, 'skip:', skipValue, 'take:', limit);
    
    const [total, rentals] = await Promise.all([
      prisma.rentalRequest.count({ where }),
      prisma.rentalRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: skipValue,
        take: limit,
        include: {
          rideService: { select: { id: true, name: true, currency: true, currencySymbol: true } },
          driver: {
            select: {
              id: true,
              user: { select: { firstName: true, lastName: true, phoneNumber: true } },
            },
          },
          messages: {
            include: {
              sender: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phoneNumber: true
                }
              }
            },
            orderBy: {
              createdAt: 'asc'
            }
          }
        },
      })
    ]);

    const hasMore = page * limit < total;
    console.log('Rental API: Found rentals:', rentals.length, 'total:', total, 'hasMore:', hasMore);
    return res.json({ success: true, data: { items: rentals, total, page, limit, hasMore } });
  } catch (error: any) {
    console.error('Error fetching customer rental requests:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch rental requests', error: error?.message || String(error) });
  }
});

// Get rentals for the current authenticated driver
router.get('/driver/me', authenticate, async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // First, find the driver record for the current user
    const driver = await prisma.driver.findUnique({
      where: { userId: userId }
    });

    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver profile not found' });
    }

    const rentals = await prisma.rentalRequest.findMany({
      where: { driverId: driver.id },
      include: {
        rideService: {
          select: {
            id: true,
            name: true,
            description: true,
            currency: true,
            currencySymbol: true
          }
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true
          }
        },
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.json({ success: true, data: rentals });
  } catch (error: any) {
    console.error('Error fetching driver rentals:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch driver rentals', error: error?.message || String(error) });
  }
});

// Get rental details by ID
router.get('/:rentalId', authenticate, async (req: any, res) => {
  try {
    const { rentalId } = req.params;
    const userId = req.user?.id;
    
    if (!rentalId) {
      return res.status(400).json({ success: false, message: 'rentalId is required' });
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    console.log('Rental API: Fetching rental details for ID:', rentalId);
    console.log('Rental API: User ID:', userId);
    
    const rental = await prisma.rentalRequest.findUnique({
      where: { id: rentalId },
      include: {
        rideService: { 
          select: { 
            id: true, 
            name: true, 
            description: true,
            currency: true, 
            currencySymbol: true 
          } 
        },
        driver: {
          select: {
            id: true,
            user: { 
              select: { 
                firstName: true, 
                lastName: true, 
                phoneNumber: true 
              } 
            },
            riderApplication: {
              select: {
                id: true,
                vehicleModel: true,
                vehiclePlate: true,
                address: true,
                documents: {
                  where: {
                    documentType: {
                      in: ['CAR_INTERIOR_PHOTO', 'CAR_EXTERIOR_PHOTO', 'VEHICLE_REGISTRATION']
                    }
                  },
                  select: {
                    id: true,
                    documentType: true,
                    fileUrl: true,
                    fileName: true
                  }
                }
              }
            }
          },
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true
          }
        },
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
    });

    if (!rental) {
      return res.status(404).json({ success: false, message: 'Rental not found' });
    }

    // Check if user has access to this rental (either customer or driver)
    if (rental.customerId !== userId) {
      // Check if user is the driver for this rental
      const driver = await prisma.driver.findUnique({
        where: { userId: userId }
      });
      
      if (!driver || rental.driverId !== driver.id) {
        return res.status(403).json({ success: false, message: 'Access denied - can only view own rentals' });
      }
    }

    console.log('Rental API: Access granted, returning rental details');
    return res.json({ success: true, data: rental });
  } catch (error: any) {
    console.error('Error fetching rental details:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch rental details', error: error?.message || String(error) });
  }
});

// Customer accept quote
router.patch('/:rentalId/customer/accept', authenticate, async (req: any, res) => {
  try {
    const { rentalId } = req.params;
    const userId = req.user?.id;
    
    if (!rentalId) {
      return res.status(400).json({ success: false, message: 'rentalId is required' });
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Find the rental request
    const rental = await prisma.rentalRequest.findUnique({
      where: { id: rentalId },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true } },
        driver: { 
          include: { 
            user: { select: { firstName: true, lastName: true } } 
          } 
        }
      }
    });

    if (!rental) {
      return res.status(404).json({ success: false, message: 'Rental request not found' });
    }

    // Check if the authenticated user is the customer for this rental
    if (rental.customerId !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied - can only accept own rental quotes' });
    }

    // Check if the rental is in QUOTED status
    if (rental.status !== 'QUOTED') {
      return res.status(400).json({ success: false, message: 'Can only accept quotes that are in QUOTED status' });
    }

    // Check if there's a proposed price
    if (!rental.proposedPrice) {
      return res.status(400).json({ success: false, message: 'No proposed price found for this rental' });
    }

    // Update the rental request status to ACCEPTED and set agreed price
    const updatedRental = await prisma.rentalRequest.update({
      where: { id: rentalId },
      data: {
        status: 'ACCEPTED',
        agreedPrice: rental.proposedPrice,
        updatedAt: new Date()
      }
    });

    // Log a chat message about the acceptance
    try {
      const customerName = `${rental.customer.firstName} ${rental.customer.lastName}`;
      const driverName = rental.driver?.user ? `${rental.driver.user.firstName} ${rental.driver.user.lastName}` : 'Asset Owner';
      
      await prisma.rentalMessage.create({
        data: {
          rentalId: rentalId,
          senderId: userId,
          senderType: 'CUSTOMER',
          content: `Quote accepted by ${customerName}. Agreed price: ${rental.currency} ${rental.proposedPrice}`,
          isRead: false
        }
      });
    } catch (error) {
      console.error('Error creating chat message for quote acceptance:', error);
      // Don't fail the main operation if chat message creation fails
    }

    return res.json({ success: true, data: updatedRental });
  } catch (error: any) {
    console.error('Error accepting quote:', error);
    return res.status(500).json({ success: false, message: 'Failed to accept quote', error: error?.message || String(error) });
  }
});

// Customer reject quote
router.patch('/:rentalId/customer/reject', authenticate, async (req: any, res) => {
  try {
    const { rentalId } = req.params;
    const userId = req.user?.id;
    
    if (!rentalId) {
      return res.status(400).json({ success: false, message: 'rentalId is required' });
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Find the rental request
    const rental = await prisma.rentalRequest.findUnique({
      where: { id: rentalId },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true } },
        driver: { 
          include: { 
            user: { select: { firstName: true, lastName: true } } 
          } 
        }
      }
    });

    if (!rental) {
      return res.status(404).json({ success: false, message: 'Rental request not found' });
    }

    // Check if the authenticated user is the customer for this rental
    if (rental.customerId !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied - can only reject own rental quotes' });
    }

    // Check if the rental is in QUOTED status
    if (rental.status !== 'QUOTED') {
      return res.status(400).json({ success: false, message: 'Can only reject quotes that are in QUOTED status' });
    }

    // Update the rental request status to REJECTED
    const updatedRental = await prisma.rentalRequest.update({
      where: { id: rentalId },
      data: {
        status: 'REJECTED',
        updatedAt: new Date()
      }
    });

    // Log a chat message about the rejection
    try {
      const customerName = `${rental.customer.firstName} ${rental.customer.lastName}`;
      
      await prisma.rentalMessage.create({
        data: {
          rentalId: rentalId,
          senderId: userId,
          senderType: 'CUSTOMER',
          content: `Quote rejected by ${customerName}`,
          isRead: false
        }
      });
    } catch (error) {
      console.error('Error creating chat message for quote rejection:', error);
      // Don't fail the main operation if chat message creation fails
    }

    return res.json({ success: true, data: updatedRental });
  } catch (error: any) {
    console.error('Error rejecting quote:', error);
    return res.status(500).json({ success: false, message: 'Failed to reject quote', error: error?.message || String(error) });
  }
});

// Check rental payment status
router.get('/:rentalId/payment-status', authenticate, async (req: any, res) => {
  try {
    const { rentalId } = req.params;
    const userId = req.user?.id;
    
    if (!rentalId) {
      return res.status(400).json({ success: false, message: 'rentalId is required' });
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Find the rental request
    const rental = await prisma.rentalRequest.findUnique({
      where: { id: rentalId },
      select: { 
        id: true,
        customerId: true,
        status: true
      }
    });

    if (!rental) {
      return res.status(404).json({ success: false, message: 'Rental request not found' });
    }

    // Check if the authenticated user is the customer for this rental
    if (rental.customerId !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied - can only check payment status for own rental requests' });
    }

    // Check for pending payments
    const pendingPayment = await prisma.externalTransaction.findFirst({
      where: {
        rentalRequestId: rentalId,
        status: 'PENDING',
        customerId: userId
      },
      select: {
        id: true,
        appTransactionId: true,
        gatewayProvider: true,
        amount: true,
        currencyCode: true,
        createdAt: true
      }
    });

    res.status(200).json({
      success: true,
      data: {
        hasPendingPayment: !!pendingPayment,
        pendingPayment: pendingPayment || null
      }
    });

  } catch (error: any) {
    console.error('Error checking rental payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Process rental payment
router.post('/:rentalId/payment', authenticate, async (req: any, res) => {
  try {
    const { rentalId } = req.params;
    const { paymentMethodId, paymentIntentId } = req.body;
    const userId = req.user?.id;
    
    if (!rentalId) {
      return res.status(400).json({ success: false, message: 'rentalId is required' });
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Find the rental request
    const rental = await prisma.rentalRequest.findUnique({
      where: { id: rentalId },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true } },
        driver: { 
          include: { 
            user: { select: { id: true, firstName: true, lastName: true } } 
          } 
        },
        rideService: { select: { id: true, name: true } }
      }
    });

    if (!rental) {
      return res.status(404).json({ success: false, message: 'Rental request not found' });
    }

    // Check if the authenticated user is the customer for this rental
    if (rental.customerId !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied - can only pay for own rental requests' });
    }

    // Check if the rental is in ACCEPTED status
    if (rental.status !== 'ACCEPTED') {
      return res.status(400).json({ success: false, message: 'Can only pay for rental requests that are in ACCEPTED status' });
    }

    // Check if there's an agreed price
    if (!rental.agreedPrice) {
      return res.status(400).json({ success: false, message: 'No agreed price found for this rental request' });
    }

    // For Stripe payments, we don't need to validate the payment method in our database
    // since Stripe handles the payment method validation
    let paymentMethod = null;
    let isYonnaPayment = paymentMethodId === 'yonna-forex';
    let isWavePayment = paymentMethodId === 'wave-gambia' || paymentMethodId === 'wave';
    
    if (paymentMethodId && paymentMethodId !== 'stripe' && !isYonnaPayment) {
      paymentMethod = await prisma.paymentMethod.findFirst({
        where: { 
          id: paymentMethodId,
          userId: userId
        }
      });

      if (!paymentMethod) {
        return res.status(404).json({ success: false, message: 'Payment method not found' });
      }
      
      // Check if the payment method provider is Yonna
      if (paymentMethod.provider && paymentMethod.provider.toLowerCase().includes('yonna')) {
        isYonnaPayment = true;
      }
      if (paymentMethod.provider && paymentMethod.provider.toLowerCase().includes('wave')) {
        isWavePayment = true;
      }
    }

    // Handle Yonna payment
    if (isYonnaPayment) {
      // For Yonna payments, we need to process through the Yonna Forex service
      const YonnaForexPaymentController = require('../controllers/YonnaForexPaymentController');
      const yonnaController = new YonnaForexPaymentController();
      
      // Create a mock request object for Yonna controller
      const yonnaReq = {
        ...req,
        body: {
          amount: rental.agreedPrice,
          currency: rental.currency || 'GMD',
          description: `Rental payment for ${rental.rideService?.name || 'Rental Service'}`,
          transactionId: `RENTAL-${rental.requestId}-${Date.now()}`,
          orderId: rentalId
        }
      };

      // Process through Yonna
      return yonnaController.processPayment(yonnaReq, res);
    }

    // Handle Wave payment
    if (isWavePayment) {
      const WavePaymentController = require('../controllers/WavePaymentController').default;
      const waveController = new WavePaymentController();
      const waveReq = {
        ...req,
        body: {
          amount: rental.agreedPrice,
          currency: rental.currency || 'GMD',
          description: `Rental payment for ${rental.rideService?.name || 'Rental Service'}`,
          orderId: rentalId
        }
      };
      return waveController.processPayment(waveReq, res);
    }

    // Generate app-level transaction id shared across all records
    const appTransactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Amounts
    const originalAmount = Number(rental.agreedPrice);
    const currencyCode = (rental.currency || 'USD').toUpperCase();
    const gatewayChargeFees = calculateStripeFees(originalAmount, currencyCode);

    // Service fee via UCP configuration
    const { serviceFeeAmount, serviceFeePercentage, config: serviceFeeConfig } = await UCPService.calculateServiceFee('stripe', originalAmount, currencyCode);

    // Determine seller id (driver's user id)
    const sellerUserId = (rental as any)?.driver?.user?.id || (rental as any)?.driver?.userId || '';
    
    if (!sellerUserId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Driver information not found for this rental request' 
      });
    }

    // Persist all changes atomically
    const result = await prisma.$transaction(async (tx) => {
      // Original transaction (customer payment)
      const originalTransaction = await tx.externalTransaction.create({
        data: {
          rentalRequestId: rentalId,
          customerId: rental.customerId,
          sellerId: sellerUserId,
          gatewayProvider: 'stripe',
          gatewayTransactionId: paymentIntentId || `rental-${rentalId}-${Date.now()}`,
          paymentReference: paymentIntentId || `RENTAL-${rental.requestId}`,
          appTransactionId,
          appService: 'RENTAL',
          transactionType: TransactionType.ORIGINAL,
          amount: originalAmount,
          currencyCode,
          gatewayChargeFees: null,
          processedAmount: null,
          paidThroughGateway: true,
          gatewayResponse: { paymentIntentId },
          gatewayRequest: { rentalId, paymentMethodId },
          status: 'SUCCESS',
          processedAt: new Date(),
          ...(paymentMethodId && paymentMethodId !== 'stripe' && paymentMethod ? { paymentMethodId } : {})
        }
      });

      // Fee transaction (Stripe fee)
      const feeTransaction = await tx.externalTransaction.create({
        data: {
          rentalRequestId: rentalId,
          customerId: rental.customerId,
          sellerId: sellerUserId,
          gatewayProvider: 'stripe',
          gatewayTransactionId: `${paymentIntentId || `rental-${rentalId}`}-fee`,
          paymentReference: paymentIntentId || `RENTAL-${rental.requestId}`,
          appTransactionId,
          appService: 'RENTAL',
          transactionType: TransactionType.FEE,
          amount: gatewayChargeFees,
          currencyCode,
          gatewayChargeFees: gatewayChargeFees,
          processedAmount: 0,
          paidThroughGateway: true,
          gatewayResponse: {
            originalPaymentIntent: paymentIntentId,
            feeCalculation: {
              percentage: 0.029,
              fixedFee: 30,
              totalFees: gatewayChargeFees
            }
          },
          status: 'SUCCESS',
          processedAt: new Date()
        }
      });

      // Service fee transaction (platform fee via UCP)
      const serviceFeeTransaction = await tx.externalTransaction.create({
        data: {
          rentalRequestId: rentalId,
          customerId: rental.customerId,
          sellerId: sellerUserId,
          gatewayProvider: 'stripe',
          gatewayTransactionId: `${paymentIntentId || `rental-${rentalId}`}-servicefee`,
          paymentReference: paymentIntentId || `RENTAL-${rental.requestId}`,
          appTransactionId,
          appService: 'RENTAL',
          transactionType: TransactionType.SERVICE_FEE,
          amount: serviceFeeAmount,
          currencyCode,
          gatewayChargeFees: null,
          processedAmount: 0,
          paidThroughGateway: false,
          gatewayResponse: {
            originalPaymentIntent: paymentIntentId,
            serviceFeeConfig: serviceFeeConfig ? {
              name: serviceFeeConfig.name,
              value: serviceFeeConfig.value,
              description: serviceFeeConfig.description,
              serviceType: serviceFeeConfig.serviceType,
              metadata: serviceFeeConfig.metadata
            } : null,
            serviceFeePercentage,
            serviceFeeAmount
          },
          status: 'SUCCESS',
          processedAt: new Date()
        }
      });

      // Update rental to PAID
      const updatedRental = await tx.rentalRequest.update({
        where: { id: rentalId },
        data: { status: 'PAID', updatedAt: new Date() }
      });

      return { updatedRental, originalTransaction, feeTransaction, serviceFeeTransaction, appTransactionId };
    });

    // Log a chat message about the payment
    try {
      const customerName = `${rental.customer.firstName} ${rental.customer.lastName}`;
      
      await prisma.rentalMessage.create({
        data: {
          rentalId: rentalId,
          senderId: userId,
          senderType: 'CUSTOMER',
          content: `Payment completed by ${customerName}. Amount: ${rental.currency} ${rental.agreedPrice}`,
          isRead: false
        }
      });
    } catch (error) {
      console.error('Error creating chat message for payment:', error);
      // Don't fail the main operation if chat message creation fails
    }

    void notificationService.sendPaymentCompletedNotifications({
      customerId: rental.customerId,
      sellerId: sellerUserId,
      amount: originalAmount,
      currency: currencyCode,
      context: 'rental',
      referenceId: rentalId,
    });

    return res.json({
      success: true,
      data: {
        rental: result.updatedRental,
        transaction: {
          appTransactionId: result.appTransactionId,
          originalTransaction: result.originalTransaction,
          feeTransaction: result.feeTransaction,
          serviceFeeTransaction: result.serviceFeeTransaction
        }
      }
    });
  } catch (error: any) {
    console.error('Error processing rental payment:', error);
    return res.status(500).json({ success: false, message: 'Failed to process payment', error: error?.message || String(error) });
  }
});

// Get rental payment status
router.get('/:rentalId/payment-status', authenticate, async (req: any, res) => {
  try {
    const { rentalId } = req.params;
    const userId = req.user?.id;
    
    if (!rentalId) {
      return res.status(400).json({ success: false, message: 'rentalId is required' });
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Find the rental request
    const rental = await prisma.rentalRequest.findUnique({
      where: { id: rentalId },
      include: {
        transactions: {
          where: { status: 'SUCCESS' },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!rental) {
      return res.status(404).json({ success: false, message: 'Rental request not found' });
    }

    // Check if the authenticated user is the customer for this rental
    if (rental.customerId !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const paymentStatus = {
      isPaid: rental.status === 'PAID',
      status: rental.status,
      lastTransaction: rental.transactions[0] || null
    };

    return res.json({ success: true, data: paymentStatus });
  } catch (error: any) {
    console.error('Error getting rental payment status:', error);
    return res.status(500).json({ success: false, message: 'Failed to get payment status', error: error?.message || String(error) });
  }
});

export default router;


// Helper function to calculate Stripe fees
function calculateStripeFees(amount: number, currency: string): number {
  // Stripe fees: 2.9% + 30 cents for most currencies
  const percentageFee = 0.029; // 2.9%
  const fixedFee = 30; // 30 cents in smallest currency unit

  // For zero-decimal currencies, adjust the fixed fee
  const zeroDecimalCurrencies = ['jpy', 'bif', 'clp', 'djf', 'gnf', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf'];
  const adjustedFixedFee = zeroDecimalCurrencies.includes((currency || '').toLowerCase()) ? fixedFee : fixedFee / 100;

  const percentageAmount = amount * percentageFee;
  const totalFees = percentageAmount + adjustedFixedFee;

  return totalFees;
}
