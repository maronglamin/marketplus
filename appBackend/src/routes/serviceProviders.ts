import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { notificationService } from '../services/notificationService';
import { publicProviderWhere, assertCanOperate, sendSubscriptionBlocked } from '../services/providerSubscriptionService';

const router = Router();
const prisma = new PrismaClient();

function parseCoords(latitude: unknown, longitude: unknown): { lat: number; lng: number } | null {
  const lat = parseFloat(String(latitude));
  const lng = parseFloat(String(longitude));
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

// GET / - list providers
router.get('/', async (req, res) => {
  try {
    const { categoryId } = req.query;
    const visibility = await publicProviderWhere('HOME_SERVICES');
    const providers = await prisma.serviceProvider.findMany({
      where: {
        ...visibility,
        ...(categoryId
          ? {
              OR: [
                { categories: { some: { categoryId: String(categoryId) } } },
                { offerings: { some: { categoryId: String(categoryId), isActive: true } } },
              ],
            }
          : {}),
      },
      include: {
        categories: { include: { category: true } },
        offerings: { where: { isActive: true }, include: { category: true }, orderBy: { sortOrder: 'asc' } },
        user: { select: { firstName: true, lastName: true, phoneNumber: true } },
        application: { select: { experience: true } },
      },
      orderBy: { rating: 'desc' },
    });
    return res.json({ success: true, data: providers });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// POST /apply
router.post('/apply', authenticate, async (req: any, res) => {
  try {
    const { firstName, lastName, phoneNumber, email, address, city, latitude, longitude, bio, categoryIds, experience } = req.body;

    const coords = parseCoords(latitude, longitude);
    if (!coords) {
      return res.status(400).json({ success: false, message: 'Valid latitude and longitude are required. Please pin your address on the map.' });
    }

    const existingProvider = await prisma.serviceProvider.findUnique({
      where: { userId: req.user.id },
    });
    if (existingProvider) {
      return res.status(400).json({ success: false, message: 'You are already an approved service provider' });
    }

    const existing = await prisma.serviceProviderApplication.findFirst({
      where: { userId: req.user.id, status: 'PENDING' },
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'You already have a pending application' });
    }

    const application = await prisma.serviceProviderApplication.create({
      data: {
        userId: req.user.id,
        firstName,
        lastName,
        phoneNumber,
        email: email || null,
        address,
        city,
        latitude: coords.lat,
        longitude: coords.lng,
        bio: bio || null,
        categoryIds: categoryIds || [],
        experience: experience || null,
        status: 'PENDING',
      },
    });

    void notificationService.sendApplicationSubmittedNotification(req.user.id, 'service_provider');

    return res.json({ success: true, data: { application } });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// GET /application/me
router.get('/application/me', authenticate, async (req: any, res) => {
  try {
    const application = await prisma.serviceProviderApplication.findFirst({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    const provider = await prisma.serviceProvider.findUnique({
      where: { userId: req.user.id },
      include: {
        categories: { include: { category: true } },
        offerings: { include: { category: true }, orderBy: { sortOrder: 'asc' } },
        weeklySchedule: { orderBy: { dayOfWeek: 'asc' } },
      },
    });
    return res.json({ success: true, data: { application, provider } });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// PATCH /profile - approved providers update public profile
router.patch('/profile', authenticate, async (req: any, res) => {
  try {
    const provider = await prisma.serviceProvider.findUnique({
      where: { userId: req.user.id },
    });
    if (!provider) {
      return res.status(403).json({ success: false, message: 'Must be an approved service provider' });
    }

    const { bio, serviceDescription, profileImageUrl, portfolioImages, address, city, latitude, longitude } = req.body;
    const coords = latitude !== undefined && longitude !== undefined ? parseCoords(latitude, longitude) : null;
    if ((latitude !== undefined || longitude !== undefined) && !coords) {
      return res.status(400).json({ success: false, message: 'Valid latitude and longitude are required when updating location' });
    }
    const updated = await prisma.serviceProvider.update({
      where: { id: provider.id },
      data: {
        ...(bio !== undefined ? { bio: bio || null } : {}),
        ...(serviceDescription !== undefined ? { serviceDescription: serviceDescription || null } : {}),
        ...(profileImageUrl !== undefined ? { profileImageUrl: profileImageUrl || null } : {}),
        ...(portfolioImages !== undefined ? { portfolioImages: portfolioImages || [] } : {}),
        ...(address !== undefined ? { address: address || null } : {}),
        ...(city !== undefined ? { city: city || null } : {}),
        ...(coords ? { latitude: coords.lat, longitude: coords.lng } : {}),
      },
      include: { categories: { include: { category: true } } },
    });

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// POST /applications/:id/approve — disabled; use snap-admin panel for approvals
router.post('/applications/:id/approve', authenticate, async (_req: any, res) => {
  return res.status(403).json({
    success: false,
    message: 'Application approvals are managed through snap-admin. Contact your administrator.',
  });
});

// ─── Offerings CRUD ─────────────────────────────────────────────────────────

async function getProviderForUser(userId: string) {
  return prisma.serviceProvider.findUnique({ where: { userId } });
}

router.get('/offerings/mine', authenticate, async (req: any, res) => {
  try {
    const provider = await getProviderForUser(req.user.id);
    if (!provider) return res.status(403).json({ success: false, message: 'Not a provider' });
    const offerings = await prisma.serviceOffering.findMany({
      where: { providerId: provider.id },
      include: { category: true },
      orderBy: { sortOrder: 'asc' },
    });
    return res.json({ success: true, data: offerings });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

router.post('/offerings', authenticate, async (req: any, res) => {
  try {
    const provider = await getProviderForUser(req.user.id);
    if (!provider) return res.status(403).json({ success: false, message: 'Not a provider' });
    try {
      await assertCanOperate(req.user.id, 'HOME_SERVICES');
    } catch (error) {
      return sendSubscriptionBlocked(res, error);
    }
    const { name, description, categoryId, durationMinutes, basePrice, sortOrder } = req.body;
    if (!name?.trim() || !categoryId) {
      return res.status(400).json({ success: false, message: 'name and categoryId are required' });
    }
    const offering = await prisma.serviceOffering.create({
      data: {
        providerId: provider.id,
        categoryId,
        name: name.trim(),
        description: description?.trim() || null,
        durationMinutes: durationMinutes || 60,
        basePrice: basePrice != null ? parseFloat(basePrice) : null,
        sortOrder: sortOrder ?? 0,
      },
      include: { category: true },
    });
    await prisma.serviceProviderCategory.upsert({
      where: { providerId_categoryId: { providerId: provider.id, categoryId } },
      create: { providerId: provider.id, categoryId },
      update: {},
    }).catch(() => {});
    return res.json({ success: true, data: offering });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

router.patch('/offerings/:offeringId', authenticate, async (req: any, res) => {
  try {
    const provider = await getProviderForUser(req.user.id);
    if (!provider) return res.status(403).json({ success: false, message: 'Not a provider' });
    const { name, description, categoryId, durationMinutes, basePrice, isActive, sortOrder } = req.body;
    const offering = await prisma.serviceOffering.updateMany({
      where: { id: req.params.offeringId, providerId: provider.id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(description !== undefined ? { description: description?.trim() || null } : {}),
        ...(categoryId !== undefined ? { categoryId } : {}),
        ...(durationMinutes !== undefined ? { durationMinutes } : {}),
        ...(basePrice !== undefined ? { basePrice: basePrice != null ? parseFloat(basePrice) : null } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        ...(sortOrder !== undefined ? { sortOrder } : {}),
      },
    });
    if (offering.count === 0) return res.status(404).json({ success: false, message: 'Offering not found' });
    const updated = await prisma.serviceOffering.findUnique({
      where: { id: req.params.offeringId },
      include: { category: true },
    });
    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

router.delete('/offerings/:offeringId', authenticate, async (req: any, res) => {
  try {
    const provider = await getProviderForUser(req.user.id);
    if (!provider) return res.status(403).json({ success: false, message: 'Not a provider' });
    await prisma.serviceOffering.deleteMany({
      where: { id: req.params.offeringId, providerId: provider.id },
    });
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// ─── Schedule ───────────────────────────────────────────────────────────────

router.get('/schedule/mine', authenticate, async (req: any, res) => {
  try {
    const provider = await getProviderForUser(req.user.id);
    if (!provider) return res.status(403).json({ success: false, message: 'Not a provider' });
    const schedule = await prisma.providerWeeklySchedule.findMany({
      where: { providerId: provider.id },
      orderBy: { dayOfWeek: 'asc' },
    });
    return res.json({ success: true, data: schedule });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

router.put('/schedule', authenticate, async (req: any, res) => {
  try {
    const provider = await getProviderForUser(req.user.id);
    if (!provider) return res.status(403).json({ success: false, message: 'Not a provider' });
    const { schedule } = req.body;
    if (!Array.isArray(schedule)) {
      return res.status(400).json({ success: false, message: 'schedule array is required' });
    }
    await prisma.providerWeeklySchedule.deleteMany({ where: { providerId: provider.id } });
    if (schedule.length > 0) {
      await prisma.providerWeeklySchedule.createMany({
        data: schedule.map((s: any) => ({
          providerId: provider.id,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          isEnabled: s.isEnabled !== false,
        })),
      });
    }
    const updated = await prisma.providerWeeklySchedule.findMany({
      where: { providerId: provider.id },
      orderBy: { dayOfWeek: 'asc' },
    });
    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// ─── Blocked slots ──────────────────────────────────────────────────────────

router.get('/blocked-slots/mine', authenticate, async (req: any, res) => {
  try {
    const provider = await getProviderForUser(req.user.id);
    if (!provider) return res.status(403).json({ success: false, message: 'Not a provider' });
    const blocked = await prisma.providerBlockedSlot.findMany({
      where: { providerId: provider.id },
      orderBy: { startAt: 'asc' },
    });
    return res.json({ success: true, data: blocked });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

router.post('/blocked-slots', authenticate, async (req: any, res) => {
  try {
    const provider = await getProviderForUser(req.user.id);
    if (!provider) return res.status(403).json({ success: false, message: 'Not a provider' });
    const { startAt, endAt, reason } = req.body;
    const blocked = await prisma.providerBlockedSlot.create({
      data: {
        providerId: provider.id,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        reason: reason || null,
      },
    });
    return res.json({ success: true, data: blocked });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

router.delete('/blocked-slots/:id', authenticate, async (req: any, res) => {
  try {
    const provider = await getProviderForUser(req.user.id);
    if (!provider) return res.status(403).json({ success: false, message: 'Not a provider' });
    await prisma.providerBlockedSlot.deleteMany({
      where: { id: req.params.id, providerId: provider.id },
    });
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// GET /:id/available-slots
router.get('/:id/available-slots', async (req, res) => {
  try {
    const { offeringId, from, to } = req.query;
    if (!offeringId || !from || !to) {
      return res.status(400).json({ success: false, message: 'offeringId, from, and to are required' });
    }
    const visibility = await publicProviderWhere('HOME_SERVICES');
    const provider = await prisma.serviceProvider.findFirst({
      where: { id: req.params.id, ...visibility },
      select: { id: true },
    });
    if (!provider) return res.status(404).json({ success: false, message: 'Provider not found' });
    const { generateProviderAvailableSlots } = require('../services/availabilityService');
    const slots = await generateProviderAvailableSlots(
      req.params.id,
      String(offeringId),
      new Date(String(from)),
      new Date(String(to)),
    );
    return res.json({ success: true, data: slots });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// GET /:id - single provider profile (must be after static routes)
router.get('/:id', async (req, res) => {
  try {
    const visibility = await publicProviderWhere('HOME_SERVICES');
    const provider = await prisma.serviceProvider.findFirst({
      where: { id: req.params.id, ...visibility },
      include: {
        categories: { include: { category: true } },
        offerings: { where: { isActive: true }, include: { category: true }, orderBy: { sortOrder: 'asc' } },
        user: { select: { firstName: true, lastName: true, phoneNumber: true } },
        application: {
          select: {
            experience: true,
            city: true,
            address: true,
            phoneNumber: true,
            email: true,
          },
        },
      },
    });
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }
    return res.json({ success: true, data: provider });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

export default router;
