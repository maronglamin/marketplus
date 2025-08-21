import { Router } from 'express';
import { RentalService } from '../services/rentalService';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.post('/', authenticate, async (req, res) => {
  try {
    const rental = await RentalService.createRentalRequest(req.body);
    return res.json({ success: true, data: rental });
  } catch (error: any) {
    console.error('Error creating rental request:', error);
    return res.status(500).json({ success: false, message: 'Failed to create rental request', error: error?.message || String(error) });
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

export default router;

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


