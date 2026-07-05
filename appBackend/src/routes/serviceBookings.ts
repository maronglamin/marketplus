import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { authenticate } from '../middleware/auth';
import { notificationService } from '../services/notificationService';
import { validateAndHoldServiceSlot, releaseServiceSlot, confirmServiceSlot } from '../services/availabilityService';

const router = Router();
const prisma = new PrismaClient();

const formatUserName = (user?: { firstName?: string | null; lastName?: string | null } | null) =>
  `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Customer';

function parseCoords(latitude: unknown, longitude: unknown): { lat: number; lng: number } | null {
  const lat = parseFloat(String(latitude));
  const lng = parseFloat(String(longitude));
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

// GET /categories
router.get('/categories', async (_req, res) => {
  try {
    const categories = await prisma.serviceCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    return res.json({ success: true, data: categories });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// POST / - create booking
router.post('/', authenticate, async (req: any, res) => {
  try {
    const {
      categoryId, providerId, offeringId, serviceAddress,
      serviceLatitude, serviceLongitude, slotStart, scheduledAt, notes,
    } = req.body;
    const customerId = req.user?.id;

    if (!serviceAddress) {
      return res.status(400).json({ success: false, message: 'serviceAddress is required' });
    }
    const coords = parseCoords(serviceLatitude, serviceLongitude);
    if (!coords) {
      return res.status(400).json({ success: false, message: 'Valid serviceLatitude and serviceLongitude are required.' });
    }

    let resolvedCategoryId = categoryId;
    let resolvedProviderId = providerId || null;
    let resolvedSlotStart: Date | null = null;
    let resolvedSlotEnd: Date | null = null;
    let resolvedOfferingId: string | null = offeringId || null;

    if (offeringId && providerId && slotStart) {
      const slotResult = await validateAndHoldServiceSlot(providerId, offeringId, new Date(slotStart));
      if (!slotResult.ok) {
        return res.status(400).json({ success: false, message: slotResult.message });
      }
      resolvedSlotStart = new Date(slotStart);
      resolvedSlotEnd = slotResult.slotEnd;

      const offering = await prisma.serviceOffering.findUnique({
        where: { id: offeringId },
        include: { category: true },
      });
      if (!offering) {
        return res.status(400).json({ success: false, message: 'Offering not found' });
      }
      resolvedCategoryId = offering.categoryId;
      resolvedOfferingId = offering.id;
    } else if (!categoryId) {
      return res.status(400).json({ success: false, message: 'offeringId+slotStart+providerId or categoryId is required' });
    }

    const bookingRef = `SB-${Date.now().toString(36).toUpperCase()}`;
    const booking = await prisma.serviceBooking.create({
      data: {
        bookingRef,
        customerId,
        categoryId: resolvedCategoryId,
        providerId: resolvedProviderId,
        offeringId: resolvedOfferingId,
        serviceAddress,
        serviceLatitude: coords.lat,
        serviceLongitude: coords.lng,
        scheduledAt: resolvedSlotStart || (scheduledAt ? new Date(scheduledAt) : null),
        slotStart: resolvedSlotStart,
        slotEnd: resolvedSlotEnd,
        slotStatus: resolvedSlotStart ? 'HELD' : null,
        notes: notes || null,
      },
      include: {
        category: true,
        offering: { include: { category: true } },
        provider: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
        customer: { select: { firstName: true, lastName: true } },
      },
    });

    void notificationService.sendServiceBookingCreatedNotifications({
      customerId,
      providerUserId: booking.provider?.user?.id,
      customerName: formatUserName(booking.customer),
      categoryName: booking.category?.name || 'Service',
      bookingRef: booking.bookingRef,
      bookingId: booking.id,
    });

    return res.json({ success: true, data: booking });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// GET /mine - customer bookings
router.get('/mine', authenticate, async (req: any, res) => {
  try {
    const bookings = await prisma.serviceBooking.findMany({
      where: { customerId: req.user.id },
      include: { category: true, provider: { include: { user: { select: { firstName: true, lastName: true, phoneNumber: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: bookings });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// GET /provider/mine
router.get('/provider/mine', authenticate, async (req: any, res) => {
  try {
    const provider = await prisma.serviceProvider.findUnique({ where: { userId: req.user.id } });
    if (!provider) return res.status(404).json({ success: false, message: 'Provider profile not found' });
    const bookings = await prisma.serviceBooking.findMany({
      where: { providerId: provider.id },
      include: { category: true, offering: true, customer: { select: { firstName: true, lastName: true, phoneNumber: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: bookings });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// GET /:id
router.get('/:id', authenticate, async (req: any, res) => {
  try {
    const booking = await prisma.serviceBooking.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        provider: { include: { user: { select: { firstName: true, lastName: true, phoneNumber: true } } } },
        customer: { select: { firstName: true, lastName: true, phoneNumber: true } },
      },
    });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    return res.json({ success: true, data: booking });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// PATCH /:id/quote
router.patch('/:id/quote', authenticate, async (req: any, res) => {
  try {
    const { proposedPrice } = req.body;
    const provider = await prisma.serviceProvider.findUnique({ where: { userId: req.user.id } });
    if (!provider) return res.status(403).json({ success: false, message: 'Not a provider' });
    const existing = await prisma.serviceBooking.findFirst({
      where: { id: req.params.id, providerId: provider.id },
    });
    if (!existing) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (existing.slotStatus === 'RELEASED') {
      return res.status(400).json({ success: false, message: 'Slot hold has expired for this booking' });
    }
    const booking = await prisma.serviceBooking.update({
      where: { id: req.params.id },
      data: { status: 'QUOTED', proposedPrice: parseFloat(proposedPrice) },
      include: { category: true, offering: true, customer: { select: { firstName: true, lastName: true } } },
    });

    void notificationService.sendServiceBookingQuotedToCustomer(
      booking.customerId,
      booking.category?.name || 'Service',
      booking.bookingRef,
      booking.id,
      Number(booking.proposedPrice),
      booking.currency,
    );

    return res.json({ success: true, data: booking });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// PATCH /:id/accept
router.patch('/:id/accept', authenticate, async (req: any, res) => {
  try {
    const booking = await prisma.serviceBooking.findUnique({ where: { id: req.params.id } });
    if (!booking || booking.customerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const updated = await prisma.serviceBooking.update({
      where: { id: req.params.id },
      data: { status: 'ACCEPTED', agreedPrice: booking.proposedPrice },
      include: {
        category: true,
        provider: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
        customer: { select: { firstName: true, lastName: true } },
      },
    });

    if (updated.provider?.user?.id) {
      void notificationService.sendServiceBookingAcceptedToProvider(
        updated.provider.user.id,
        formatUserName(updated.customer),
        updated.category?.name || 'Service',
        updated.bookingRef,
        updated.id,
      );
    }

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// PATCH /:id/reject
router.patch('/:id/reject', authenticate, async (req: any, res) => {
  try {
    const updated = await prisma.serviceBooking.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED' },
    });
    await releaseServiceSlot(req.params.id);
    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// PATCH /:id/complete
router.patch('/:id/complete', authenticate, async (req: any, res) => {
  try {
    const booking = await prisma.serviceBooking.findUnique({
      where: { id: req.params.id },
      include: { category: true, provider: { include: { user: { select: { id: true } } } } },
    });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const updated = await prisma.serviceBooking.update({
      where: { id: req.params.id },
      data: { status: 'COMPLETED' },
    });

    void notificationService.sendServiceBookingCompletedToCustomer(
      booking.customerId,
      booking.category?.name || 'Service',
      booking.bookingRef,
      booking.id,
    );

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// GET /:id/messages
router.get('/:id/messages', authenticate, async (req: any, res) => {
  try {
    const messages = await prisma.serviceBookingMessage.findMany({
      where: { bookingId: req.params.id },
      include: { sender: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return res.json({ success: true, data: messages });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// POST /:id/messages
router.post('/:id/messages', authenticate, async (req: any, res) => {
  try {
    const { content } = req.body;
    const booking = await prisma.serviceBooking.findUnique({ where: { id: req.params.id } });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    const provider = await prisma.serviceProvider.findUnique({ where: { userId: req.user.id } });
    const senderType = provider && booking.providerId === provider.id ? 'PROVIDER' : 'CUSTOMER';
    const message = await prisma.serviceBookingMessage.create({
      data: {
        bookingId: req.params.id,
        senderId: req.user.id,
        senderType,
        content,
      },
      include: { sender: { select: { firstName: true, lastName: true } } },
    });

    const recipientUserId =
      senderType === 'PROVIDER'
        ? booking.customerId
        : booking.providerId
          ? (await prisma.serviceProvider.findUnique({
              where: { id: booking.providerId },
              select: { userId: true },
            }))?.userId
          : null;

    if (recipientUserId && recipientUserId !== req.user.id) {
      void notificationService.sendServiceBookingMessageNotification({
        recipientUserId,
        senderName: formatUserName(message.sender),
        bookingRef: booking.bookingRef,
        bookingId: booking.id,
        preview: content,
      });
    }

    return res.json({ success: true, data: message });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// POST /:id/payment
router.post('/:id/payment', authenticate, async (req: any, res) => {
  try {
    const { paymentMethodId, paymentIntentId } = req.body;
    const userId = req.user.id;
    const booking = await prisma.serviceBooking.findUnique({
      where: { id: req.params.id },
      include: { provider: { include: { user: true } }, category: true },
    });
    if (!booking || booking.customerId !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (booking.status !== 'ACCEPTED' || !booking.agreedPrice) {
      return res.status(400).json({ success: false, message: 'Booking must be accepted with agreed price' });
    }

    const isYonna = paymentMethodId === 'yonna-forex';
    const isWave = paymentMethodId === 'wave-gambia' || paymentMethodId === 'wave';
    if (isYonna) {
      const YonnaForexPaymentController = require('../controllers/YonnaForexPaymentController');
      const yonnaController = new YonnaForexPaymentController();
      return yonnaController.processPayment({
        ...req,
        body: {
          amount: booking.agreedPrice,
          currency: booking.currency,
          description: `Service: ${booking.category.name}`,
          transactionId: `SVC-${booking.bookingRef}-${Date.now()}`,
          orderId: booking.id,
          serviceBookingId: booking.id,
        },
      }, res);
    }
    if (isWave) {
      const WavePaymentController = require('../controllers/WavePaymentController').default;
      const waveController = new WavePaymentController();
      return waveController.processPayment({
        ...req,
        body: {
          amount: booking.agreedPrice,
          currency: booking.currency,
          description: `Service: ${booking.category.name}`,
          orderId: booking.id,
          serviceBookingId: booking.id,
        },
      }, res);
    }

    const sellerUserId = booking.provider?.userId;
    if (!sellerUserId) return res.status(400).json({ success: false, message: 'Provider not found' });

    const appTransactionId = `TXN-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const amount = Number(booking.agreedPrice);

    await prisma.$transaction(async (tx) => {
      await tx.externalTransaction.create({
        data: {
          serviceBookingId: booking.id,
          customerId: booking.customerId,
          sellerId: sellerUserId,
          gatewayProvider: 'stripe',
          gatewayTransactionId: paymentIntentId || `svc-${booking.id}`,
          paymentReference: paymentIntentId || booking.bookingRef,
          appTransactionId,
          appService: 'HOME_SERVICES',
          transactionType: 'ORIGINAL',
          amount,
          currencyCode: booking.currency,
          paidThroughGateway: true,
          status: 'SUCCESS',
          processedAt: new Date(),
        },
      });
      await tx.serviceBooking.update({
        where: { id: booking.id },
        data: { status: 'PAID', paymentStatus: 'PAID', slotStatus: 'CONFIRMED' },
      });
    });

    void notificationService.sendServiceBookingPaidNotifications({
      customerId: booking.customerId,
      providerUserId: sellerUserId,
      amount,
      currency: booking.currency,
      bookingRef: booking.bookingRef,
      bookingId: booking.id,
    });

    return res.json({ success: true, message: 'Payment processed' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

export default router;
