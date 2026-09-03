import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { authenticate } from '../middleware/auth';
import { notificationService } from '../services/notificationService';
import { validatePropertyBooking } from '../services/availabilityService';
import { assertProviderVisible, sendSubscriptionBlocked } from '../services/providerSubscriptionService';

const router = Router();
const prisma = new PrismaClient();

const SALE_TYPES = ['HOME_SALE', 'LAND_SALE'] as const;

const formatUserName = (user?: { firstName?: string | null; lastName?: string | null } | null) =>
  `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Customer';

function makePurchaseRef() {
  return `SALE-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

/** Mark inquiry paid, listing SOLD, and close competing inquiries. */
async function completePropertySalePurchase(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  inquiryId: string,
) {
  const inquiry = await tx.propertyInquiry.findUnique({
    where: { id: inquiryId },
    include: { listing: true },
  });
  if (!inquiry) throw new Error('Inquiry not found');

  const locked = await tx.propertyListing.updateMany({
    where: { id: inquiry.listingId, status: 'ACTIVE' },
    data: { status: 'SOLD' },
  });
  if (locked.count === 0 && inquiry.listing.status !== 'SOLD') {
    throw new Error('This property is no longer available for purchase');
  }

  await tx.propertyInquiry.update({
    where: { id: inquiryId },
    data: {
      paymentStatus: 'PAID',
      status: 'PURCHASED',
      purchaseRef: inquiry.purchaseRef || makePurchaseRef(),
    },
  });

  await tx.propertyInquiry.updateMany({
    where: {
      listingId: inquiry.listingId,
      id: { not: inquiryId },
      status: { in: ['PENDING', 'CONTACTED'] },
    },
    data: { status: 'CLOSED' },
  });
}

// POST /inquiries
router.post('/inquiries', authenticate, async (req: any, res) => {
  try {
    const { listingId, message, preferredDate } = req.body;
    if (!listingId || !message?.trim()) {
      return res.status(400).json({ success: false, message: 'listingId and message are required' });
    }

    const listing = await prisma.propertyListing.findUnique({
      where: { id: listingId },
      include: { agent: { include: { user: { select: { id: true, firstName: true, lastName: true } } } } },
    });
    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });
    if (!SALE_TYPES.includes(listing.listingType as any)) {
      return res.status(400).json({ success: false, message: 'Inquiries are only for home and land sales' });
    }
    if (listing.status === 'SOLD') {
      return res.status(400).json({ success: false, message: 'This property has already been sold' });
    }
    if (listing.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, message: 'This property is not available' });
    }
    try {
      await assertProviderVisible(listing.agent.userId, 'REAL_ESTATE');
    } catch (error) {
      return sendSubscriptionBlocked(res, error);
    }

    const inquiry = await prisma.propertyInquiry.create({
      data: {
        listingId,
        customerId: req.user.id,
        message: message.trim(),
        preferredDate: preferredDate ? new Date(preferredDate) : null,
        salePrice: listing.price,
        currency: listing.currency || 'GMD',
        purchaseRef: makePurchaseRef(),
        paymentStatus: 'PENDING',
        status: 'PENDING',
      },
      include: {
        listing: {
          include: {
            images: { take: 1 },
            agent: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
          },
        },
        customer: { select: { firstName: true, lastName: true } },
      },
    });

    const agentUserId = inquiry.listing?.agent?.user?.id;
    if (agentUserId) {
      void notificationService.sendPropertyInquiryNotifications({
        customerId: req.user.id,
        agentUserId,
        customerName: formatUserName(inquiry.customer),
        listingTitle: inquiry.listing.title,
        inquiryId: inquiry.id,
      });
    }

    return res.json({ success: true, data: inquiry });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// GET /inquiries/mine
router.get('/inquiries/mine', authenticate, async (req: any, res) => {
  try {
    const inquiries = await prisma.propertyInquiry.findMany({
      where: { customerId: req.user.id },
      include: { listing: { include: { images: { take: 1 } } } },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: inquiries });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// GET /inquiries/:id
router.get('/inquiries/:id', authenticate, async (req: any, res) => {
  try {
    const inquiry = await prisma.propertyInquiry.findUnique({
      where: { id: req.params.id },
      include: {
        listing: {
          include: {
            images: { take: 1 },
            agent: true,
          },
        },
        customer: { select: { firstName: true, lastName: true, phoneNumber: true } },
      },
    });
    if (!inquiry) return res.status(404).json({ success: false, message: 'Inquiry not found' });

    const agent = await prisma.propertyAgent.findUnique({ where: { userId: req.user.id } });
    const isOwner = agent && inquiry.listing.agentId === agent.id;
    const isCustomer = inquiry.customerId === req.user.id;
    if (!isOwner && !isCustomer) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    return res.json({ success: true, data: inquiry });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// PATCH /inquiries/:id/status - agent mark contacted/offered/closed
router.patch('/inquiries/:id/status', authenticate, async (req: any, res) => {
  try {
    const { status } = req.body;
    const allowed = ['CONTACTED', 'CLOSED', 'PENDING', 'OFFERED'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const inquiry = await prisma.propertyInquiry.findUnique({
      where: { id: req.params.id },
      include: { listing: true },
    });
    if (!inquiry) return res.status(404).json({ success: false, message: 'Inquiry not found' });
    if (inquiry.paymentStatus === 'PAID' || inquiry.status === 'PURCHASED') {
      return res.status(400).json({ success: false, message: 'Purchased inquiries cannot change status' });
    }
    const agent = await prisma.propertyAgent.findUnique({ where: { userId: req.user.id } });
    if (!agent || inquiry.listing.agentId !== agent.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (inquiry.listing.status === 'SOLD' && status === 'OFFERED') {
      return res.status(400).json({ success: false, message: 'This property has already been sold' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Only one customer at a time may be offered purchase rights
      if (status === 'OFFERED') {
        await tx.propertyInquiry.updateMany({
          where: {
            listingId: inquiry.listingId,
            id: { not: inquiry.id },
            status: 'OFFERED',
          },
          data: { status: 'CONTACTED' },
        });
      }

      return tx.propertyInquiry.update({
        where: { id: req.params.id },
        data: { status },
        include: {
          listing: { include: { images: { take: 1 } } },
          customer: { select: { firstName: true, lastName: true, phoneNumber: true } },
        },
      });
    });

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// POST /inquiries/:id/payment - pay for home/land sale
router.post('/inquiries/:id/payment', authenticate, async (req: any, res) => {
  try {
    const { paymentMethodId, paymentIntentId } = req.body;
    const inquiry = await prisma.propertyInquiry.findUnique({
      where: { id: req.params.id },
      include: {
        listing: {
          include: {
            agent: { include: { user: true } },
          },
        },
      },
    });
    if (!inquiry || inquiry.customerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (!SALE_TYPES.includes(inquiry.listing.listingType as any)) {
      return res.status(400).json({ success: false, message: 'Only home and land sales can be purchased' });
    }
    if (inquiry.paymentStatus === 'PAID' || inquiry.status === 'PURCHASED') {
      return res.status(400).json({ success: false, message: 'This inquiry is already paid' });
    }
    if (inquiry.status !== 'OFFERED') {
      return res.status(400).json({
        success: false,
        message: 'Payment is not available yet. The agent must offer this property to you first.',
      });
    }
    if (inquiry.listing.status === 'SOLD') {
      return res.status(400).json({ success: false, message: 'This property has already been sold' });
    }
    if (inquiry.listing.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, message: 'This property is not available' });
    }

    const amount = Number(inquiry.salePrice ?? inquiry.listing.price);
    const currency = inquiry.currency || inquiry.listing.currency || 'GMD';
    const sellerUserId = inquiry.listing.agent.userId;
    const purchaseRef = inquiry.purchaseRef || makePurchaseRef();

    const allowTestPayments =
      process.env.ALLOW_TEST_PAYMENTS === 'true' ||
      (process.env.NODE_ENV === 'development' && process.env.ALLOW_TEST_PAYMENTS !== 'false');

    if (paymentMethodId === 'test-payment' || paymentMethodId === 'simulate') {
      if (!allowTestPayments) {
        return res.status(403).json({
          success: false,
          message: 'Test payments are disabled. Set NODE_ENV=development or ALLOW_TEST_PAYMENTS=true.',
        });
      }

      const appTransactionId = `TEST-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
      await prisma.$transaction(async (tx) => {
        await tx.externalTransaction.create({
          data: {
            propertyInquiryId: inquiry.id,
            customerId: inquiry.customerId,
            sellerId: sellerUserId,
            gatewayProvider: 'test',
            gatewayTransactionId: `test-sale-${inquiry.id}-${Date.now()}`,
            paymentReference: `TEST-${purchaseRef}`,
            appTransactionId,
            appService: 'REAL_ESTATE',
            transactionType: 'ORIGINAL',
            amount,
            currencyCode: currency,
            paidThroughGateway: true,
            status: 'SUCCESS',
            processedAt: new Date(),
            gatewayResponse: {
              simulated: true,
              mode: 'development',
              note: 'Test payment for home/land sale',
            },
          },
        });
        await completePropertySalePurchase(tx as any, inquiry.id);
      });

      void notificationService.sendPaymentCompletedNotifications({
        customerId: inquiry.customerId,
        sellerId: sellerUserId,
        amount,
        currency,
        context: 'property',
        referenceId: inquiry.id,
        description: `property sale ${purchaseRef} (test payment)`,
      });

      return res.json({
        success: true,
        message: 'Test payment processed. Property marked as sold.',
        data: { simulated: true, inquiryId: inquiry.id },
      });
    }

    const isYonna = paymentMethodId === 'yonna-forex';
    const isWave = paymentMethodId === 'wave-gambia' || paymentMethodId === 'wave';
    if (isYonna) {
      const YonnaForexPaymentController = require('../controllers/YonnaForexPaymentController');
      const yonnaController = new YonnaForexPaymentController();
      return yonnaController.processPayment({
        ...req,
        body: {
          amount,
          currency,
          description: `Property sale: ${inquiry.listing.title}`,
          transactionId: `SALE-${purchaseRef}-${Date.now()}`,
          orderId: inquiry.id,
          propertyInquiryId: inquiry.id,
        },
      }, res);
    }
    if (isWave) {
      const WavePaymentController = require('../controllers/WavePaymentController').default;
      const waveController = new WavePaymentController();
      return waveController.processPayment({
        ...req,
        body: {
          amount,
          currency,
          description: `Property sale: ${inquiry.listing.title}`,
          orderId: inquiry.id,
          propertyInquiryId: inquiry.id,
        },
      }, res);
    }

    // Stripe / default card path
    const appTransactionId = `TXN-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    await prisma.$transaction(async (tx) => {
      await tx.externalTransaction.create({
        data: {
          propertyInquiryId: inquiry.id,
          customerId: inquiry.customerId,
          sellerId: sellerUserId,
          gatewayProvider: 'stripe',
          gatewayTransactionId: paymentIntentId || `sale-${inquiry.id}`,
          paymentReference: paymentIntentId || purchaseRef,
          appTransactionId,
          appService: 'REAL_ESTATE',
          transactionType: 'ORIGINAL',
          amount,
          currencyCode: currency,
          paidThroughGateway: true,
          status: 'SUCCESS',
          processedAt: new Date(),
        },
      });
      await completePropertySalePurchase(tx as any, inquiry.id);
    });

    void notificationService.sendPaymentCompletedNotifications({
      customerId: inquiry.customerId,
      sellerId: sellerUserId,
      amount,
      currency,
      context: 'property',
      referenceId: inquiry.id,
      description: `property sale ${purchaseRef}`,
    });

    return res.json({ success: true, message: 'Payment processed. Property marked as sold.' });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error?.message || 'Payment failed' });
  }
});

// GET /agent/mine - agent booking inbox
router.get('/agent/mine', authenticate, async (req: any, res) => {
  try {
    const agent = await prisma.propertyAgent.findUnique({ where: { userId: req.user.id } });
    if (!agent) return res.status(404).json({ success: false, message: 'Agent profile not found' });
    const bookings = await prisma.propertyBooking.findMany({
      where: { listing: { agentId: agent.id } },
      include: {
        listing: { include: { images: { take: 1 } } },
        roomType: true,
        customer: { select: { firstName: true, lastName: true, phoneNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const inquiries = await prisma.propertyInquiry.findMany({
      where: { listing: { agentId: agent.id } },
      include: {
        listing: { include: { images: { take: 1 } } },
        customer: { select: { firstName: true, lastName: true, phoneNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: { bookings, inquiries } });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// POST / - create stay booking
router.post('/', authenticate, async (req: any, res) => {
  try {
    const {
      listingId, checkIn, checkOut, guests, adults, children, childAges,
      roomTypeId, roomsBooked, notes,
    } = req.body;

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const resolvedAdults = adults ?? guests ?? 1;
    const resolvedChildren = children ?? 0;
    const resolvedRooms = roomsBooked ?? 1;
    const resolvedRoomTypeId = roomTypeId === 'listing-default' ? null : (roomTypeId || null);

    const validation = await validatePropertyBooking(
      listingId,
      resolvedRoomTypeId,
      checkInDate,
      checkOutDate,
      resolvedAdults,
      resolvedChildren,
      resolvedRooms,
    );
    if (!validation.ok) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    const listing = await prisma.propertyListing.findUnique({
      where: { id: listingId },
      include: { agent: true },
    });
    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });
    try {
      await assertProviderVisible(listing.agent.userId, 'REAL_ESTATE');
    } catch (error) {
      return sendSubscriptionBlocked(res, error);
    }

    const bookingRef = `PB-${Date.now().toString(36).toUpperCase()}`;
    const booking = await prisma.propertyBooking.create({
      data: {
        bookingRef,
        listingId,
        roomTypeId: validation.roomTypeId,
        customerId: req.user.id,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        guests: resolvedAdults + resolvedChildren,
        adults: resolvedAdults,
        children: resolvedChildren,
        childAges: childAges || [],
        roomsBooked: resolvedRooms,
        nights: validation.nights,
        totalPrice: validation.totalPrice,
        currency: validation.currency,
        notes: notes || null,
        status: 'PENDING',
      },
      include: {
        listing: {
          include: {
            images: { take: 1 },
            agent: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
          },
        },
        roomType: true,
        customer: { select: { firstName: true, lastName: true } },
      },
    });

    const agentUserId = booking.listing?.agent?.user?.id;
    if (agentUserId) {
      void notificationService.sendPropertyBookingCreatedNotifications({
        customerId: req.user.id,
        agentUserId,
        customerName: formatUserName(booking.customer),
        listingTitle: booking.listing.title,
        bookingRef: booking.bookingRef,
        bookingId: booking.id,
      });
    }

    return res.json({ success: true, data: booking });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// GET /mine
router.get('/mine', authenticate, async (req: any, res) => {
  try {
    const bookings = await prisma.propertyBooking.findMany({
      where: { customerId: req.user.id },
      include: {
        listing: { include: { images: { take: 1 } } },
        roomType: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: bookings });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// PATCH /:id/status - agent confirm/decline/cancel
router.patch('/:id/status', authenticate, async (req: any, res) => {
  try {
    const { status } = req.body;
    const allowed = ['CONFIRMED', 'CANCELLED'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const booking = await prisma.propertyBooking.findUnique({
      where: { id: req.params.id },
      include: { listing: { include: { agent: true } } },
    });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    const agent = await prisma.propertyAgent.findUnique({ where: { userId: req.user.id } });
    if (!agent || booking.listing.agentId !== agent.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const updated = await prisma.propertyBooking.update({
      where: { id: req.params.id },
      data: { status },
      include: { listing: true, roomType: true, customer: { select: { firstName: true, lastName: true } } },
    });
    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// GET /:id
router.get('/:id', authenticate, async (req: any, res) => {
  try {
    const booking = await prisma.propertyBooking.findUnique({
      where: { id: req.params.id },
      include: {
        listing: { include: { images: true, agent: { include: { user: true } } } },
        roomType: true,
        customer: { select: { firstName: true, lastName: true, phoneNumber: true } },
      },
    });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    return res.json({ success: true, data: booking });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// POST /:id/payment
router.post('/:id/payment', authenticate, async (req: any, res) => {
  try {
    const { paymentMethodId, paymentIntentId } = req.body;
    const booking = await prisma.propertyBooking.findUnique({
      where: { id: req.params.id },
      include: { listing: { include: { agent: { include: { user: true } } } } },
    });
    if (!booking || booking.customerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (booking.paymentStatus === 'PAID') {
      return res.status(400).json({ success: false, message: 'Booking is already paid' });
    }

    const allowTestPayments =
      process.env.ALLOW_TEST_PAYMENTS === 'true' ||
      (process.env.NODE_ENV === 'development' && process.env.ALLOW_TEST_PAYMENTS !== 'false');

    // Simulated payment for local/dev settlement testing
    if (paymentMethodId === 'test-payment' || paymentMethodId === 'simulate') {
      if (!allowTestPayments) {
        return res.status(403).json({
          success: false,
          message: 'Test payments are disabled. Set NODE_ENV=development or ALLOW_TEST_PAYMENTS=true.',
        });
      }

      const sellerUserId = booking.listing.agent.userId;
      const appTransactionId = `TEST-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;

      await prisma.$transaction(async (tx) => {
        await tx.externalTransaction.create({
          data: {
            propertyBookingId: booking.id,
            customerId: booking.customerId,
            sellerId: sellerUserId,
            gatewayProvider: 'test',
            gatewayTransactionId: `test-${booking.id}-${Date.now()}`,
            paymentReference: `TEST-${booking.bookingRef}`,
            appTransactionId,
            appService: 'REAL_ESTATE',
            transactionType: 'ORIGINAL',
            amount: Number(booking.totalPrice),
            currencyCode: booking.currency,
            paidThroughGateway: true,
            status: 'SUCCESS',
            processedAt: new Date(),
            gatewayResponse: {
              simulated: true,
              mode: 'development',
              note: 'Test payment for settlement development',
            },
          },
        });
        await tx.propertyBooking.update({
          where: { id: booking.id },
          data: { status: 'CONFIRMED', paymentStatus: 'PAID' },
        });
      });

      void notificationService.sendPaymentCompletedNotifications({
        customerId: booking.customerId,
        sellerId: sellerUserId,
        amount: Number(booking.totalPrice),
        currency: booking.currency,
        context: 'property',
        referenceId: booking.id,
        description: `property booking ${booking.bookingRef} (test payment)`,
      });

      return res.json({
        success: true,
        message: 'Test payment processed',
        data: { simulated: true, bookingId: booking.id },
      });
    }

    const isYonna = paymentMethodId === 'yonna-forex';
    const isWave = paymentMethodId === 'wave-gambia' || paymentMethodId === 'wave';
    if (isYonna) {
      const YonnaForexPaymentController = require('../controllers/YonnaForexPaymentController');
      const yonnaController = new YonnaForexPaymentController();
      return yonnaController.processPayment({
        ...req,
        body: {
          amount: booking.totalPrice,
          currency: booking.currency,
          description: `Property: ${booking.listing.title}`,
          transactionId: `PROP-${booking.bookingRef}-${Date.now()}`,
          orderId: booking.id,
          propertyBookingId: booking.id,
        },
      }, res);
    }
    if (isWave) {
      const WavePaymentController = require('../controllers/WavePaymentController').default;
      const waveController = new WavePaymentController();
      return waveController.processPayment({
        ...req,
        body: {
          amount: booking.totalPrice,
          currency: booking.currency,
          description: `Property: ${booking.listing.title}`,
          orderId: booking.id,
          propertyBookingId: booking.id,
        },
      }, res);
    }

    const sellerUserId = booking.listing.agent.userId;
    const appTransactionId = `TXN-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;

    await prisma.$transaction(async (tx) => {
      await tx.externalTransaction.create({
        data: {
          propertyBookingId: booking.id,
          customerId: booking.customerId,
          sellerId: sellerUserId,
          gatewayProvider: 'stripe',
          gatewayTransactionId: paymentIntentId || `prop-${booking.id}`,
          paymentReference: paymentIntentId || booking.bookingRef,
          appTransactionId,
          appService: 'REAL_ESTATE',
          transactionType: 'ORIGINAL',
          amount: Number(booking.totalPrice),
          currencyCode: booking.currency,
          paidThroughGateway: true,
          status: 'SUCCESS',
          processedAt: new Date(),
        },
      });
      await tx.propertyBooking.update({
        where: { id: booking.id },
        data: { status: 'CONFIRMED', paymentStatus: 'PAID' },
      });
    });

    void notificationService.sendPaymentCompletedNotifications({
      customerId: booking.customerId,
      sellerId: sellerUserId,
      amount: Number(booking.totalPrice),
      currency: booking.currency,
      context: 'property',
      referenceId: booking.id,
      description: `property booking ${booking.bookingRef}`,
    });

    return res.json({ success: true, message: 'Payment processed' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

export default router;
