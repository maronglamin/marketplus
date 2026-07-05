import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { authenticate } from '../middleware/auth';
import { notificationService } from '../services/notificationService';
import { validatePropertyBooking } from '../services/availabilityService';

const router = Router();
const prisma = new PrismaClient();

const formatUserName = (user?: { firstName?: string | null; lastName?: string | null } | null) =>
  `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Customer';

// POST /inquiries
router.post('/inquiries', authenticate, async (req: any, res) => {
  try {
    const { listingId, message, preferredDate } = req.body;
    const inquiry = await prisma.propertyInquiry.create({
      data: {
        listingId,
        customerId: req.user.id,
        message,
        preferredDate: preferredDate ? new Date(preferredDate) : null,
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
