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
    if (paymentMethodId && paymentMethodId !== 'stripe') {
      paymentMethod = await prisma.paymentMethod.findFirst({
        where: { 
          id: paymentMethodId,
          userId: userId
        }
      });

      if (!paymentMethod) {
        return res.status(404).json({ success: false, message: 'Payment method not found' });
      }
    }

    // Create external transaction record
    const transactionData: any = {
      customerId: rental.customerId,
      sellerId: rental.driver?.userId || '',
      gatewayProvider: 'stripe',
      gatewayTransactionId: paymentIntentId || `rental-${rentalId}-${Date.now()}`,
      paymentReference: `RENTAL-${rental.requestId}`,
      amount: rental.agreedPrice,
      currencyCode: rental.currency,
      status: 'SUCCESS',
      processedAt: new Date(),
      appTransactionId: `rental-${rentalId}-${Date.now()}`,
      appService: 'RENTAL',
      rentalRequestId: rentalId,
      gatewayResponse: { paymentIntentId },
      gatewayRequest: { rentalId, paymentMethodId }
    };

    // Only add paymentMethodId if it's a valid stored payment method
    if (paymentMethodId && paymentMethodId !== 'stripe' && paymentMethod) {
      transactionData.paymentMethodId = paymentMethodId;
    }

    const transaction = await prisma.externalTransaction.create({
      data: transactionData
    });

    // Update rental request status to PAID
    const updatedRental = await prisma.rentalRequest.update({
      where: { id: rentalId },
      data: {
        status: 'PAID',
        updatedAt: new Date()
      }
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

    return res.json({ 
      success: true, 
      data: { 
        rental: updatedRental,
        transaction: transaction
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


