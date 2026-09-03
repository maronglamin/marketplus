import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import {
  getRoomTypeAvailability,
  searchListingsWithAvailability,
} from '../services/availabilityService';
import { assertCanOperate, publicListingAgentWhere, sendSubscriptionBlocked } from '../services/providerSubscriptionService';

const router = Router();
const prisma = new PrismaClient();

const MIN_HOTEL_PHOTOS = 5;
const MIN_PHOTO_WIDTH = 1024;
const MIN_PHOTO_HEIGHT = 683;
const STAY_TYPES = ['HOTEL', 'APARTMENT_RENTAL', 'GUEST_HOUSE', 'BOAT_TRIP'];

function parseCoords(latitude: unknown, longitude: unknown): { lat: number; lng: number } | null {
  const lat = parseFloat(String(latitude));
  const lng = parseFloat(String(longitude));
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function validateStayPhotos(body: any): string | null {
  const { listingType, images } = body;
  if (!STAY_TYPES.includes(listingType)) return null;
  const imgs = images || [];
  if (imgs.length < MIN_HOTEL_PHOTOS) {
    return `At least ${MIN_HOTEL_PHOTOS} high-resolution photos are required`;
  }
  // Boat trips don't require room/bathroom categories
  if (listingType !== 'BOAT_TRIP') {
    const hasExterior = imgs.some((i: any) => i.category === 'EXTERIOR');
    const hasRoom = imgs.some((i: any) => i.category === 'ROOM');
    const hasBathroom = imgs.some((i: any) => i.category === 'BATHROOM');
    if (!hasExterior || !hasRoom || !hasBathroom) {
      return 'Photos must include exterior, room, and bathroom shots';
    }
  }
  for (const img of imgs) {
    if (img.width && img.height && (img.width < MIN_PHOTO_WIDTH || img.height < MIN_PHOTO_HEIGHT)) {
      return `Each photo must be at least ${MIN_PHOTO_WIDTH}×${MIN_PHOTO_HEIGHT} pixels`;
    }
  }
  return null;
}

async function getAgentForUser(userId: string) {
  return prisma.propertyAgent.findUnique({ where: { userId } });
}

async function assertListingOwner(listingId: string, userId: string) {
  const agent = await getAgentForUser(userId);
  if (!agent) return null;
  const listing = await prisma.propertyListing.findFirst({ where: { id: listingId, agentId: agent.id } });
  return listing ? agent : null;
}

async function publishStayListing(listingId: string): Promise<{ ok: boolean; message?: string; listing?: any }> {
  const listing = await prisma.propertyListing.findUnique({
    where: { id: listingId },
    include: { roomTypesRel: { where: { isActive: true } } },
  });
  if (!listing) return { ok: false, message: 'Listing not found' };
  if (!STAY_TYPES.includes(listing.listingType)) {
    return { ok: false, message: 'Only stay listings require room setup before publishing' };
  }
  if (listing.roomTypesRel.length === 0) {
    return { ok: false, message: 'Add at least one room type before publishing' };
  }
  if (listing.status === 'ACTIVE') {
    return { ok: true, listing };
  }
  if (!['PENDING_SETUP', 'PENDING_REVIEW'].includes(listing.status)) {
    return { ok: false, message: `Cannot publish listing with status ${listing.status}` };
  }
  const updated = await prisma.propertyListing.update({
    where: { id: listingId },
    data: { status: 'ACTIVE' },
    include: { images: true, roomTypesRel: { where: { isActive: true } } },
  });
  return { ok: true, listing: updated };
}

// GET /search
router.get('/search', async (req, res) => {
  try {
    const { listingType, city, checkIn, checkOut, adults, children } = req.query;
    const results = await searchListingsWithAvailability({
      listingType: listingType ? String(listingType) : undefined,
      city: city ? String(city) : undefined,
      checkIn: checkIn ? new Date(String(checkIn)) : undefined,
      checkOut: checkOut ? new Date(String(checkOut)) : undefined,
      adults: adults ? parseInt(String(adults), 10) : 1,
      children: children ? parseInt(String(children), 10) : 0,
    });
    return res.json({ success: true, data: results });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// GET /featured
router.get('/featured', async (req, res) => {
  try {
    const limit = parseInt(String(req.query.limit || '6'), 10);
    const listings = await prisma.propertyListing.findMany({
      where: { status: 'ACTIVE', agent: await publicListingAgentWhere() },
      include: {
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
        roomTypesRel: { where: { isActive: true }, take: 1 },
        agent: { select: { displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return res.json({ success: true, data: listings });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// GET /
router.get('/', async (req, res) => {
  try {
    const { listingType, city, checkIn, checkOut, adults, children } = req.query;
    if (checkIn && checkOut) {
      const results = await searchListingsWithAvailability({
        listingType: listingType ? String(listingType) : undefined,
        city: city ? String(city) : undefined,
        checkIn: new Date(String(checkIn)),
        checkOut: new Date(String(checkOut)),
        adults: adults ? parseInt(String(adults), 10) : 1,
        children: children ? parseInt(String(children), 10) : 0,
      });
      return res.json({ success: true, data: results });
    }
    const listings = await prisma.propertyListing.findMany({
      where: {
        status: 'ACTIVE',
        agent: await publicListingAgentWhere(),
        ...(listingType ? { listingType: String(listingType) as any } : {}),
        ...(city ? { city: { contains: String(city), mode: 'insensitive' } } : {}),
      },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        virtualTours: true,
        roomTypesRel: { where: { isActive: true } },
        agent: { select: { displayName: true, companyName: true, user: { select: { phoneNumber: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: listings });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// GET /agent/mine
router.get('/agent/mine', authenticate, async (req: any, res) => {
  try {
    const agent = await getAgentForUser(req.user.id);
    if (!agent) return res.status(404).json({ success: false, message: 'Agent profile not found' });
    const listings = await prisma.propertyListing.findMany({
      where: { agentId: agent.id },
      include: {
        images: true,
        virtualTours: true,
        roomTypesRel: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { bookings: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: listings });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// GET /:id/availability
router.get('/:id/availability', async (req, res) => {
  try {
    const { checkIn, checkOut, adults, children } = req.query;
    if (!checkIn || !checkOut) {
      return res.status(400).json({ success: false, message: 'checkIn and checkOut are required' });
    }
    const result = await getRoomTypeAvailability(
      req.params.id,
      new Date(String(checkIn)),
      new Date(String(checkOut)),
      adults ? parseInt(String(adults), 10) : 1,
      children ? parseInt(String(children), 10) : 0,
    );
    if (!result) return res.status(404).json({ success: false, message: 'Listing not found' });
    return res.json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// GET /:id
router.get('/:id', async (req, res) => {
  try {
    const listing = await prisma.propertyListing.findUnique({
      where: { id: req.params.id },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        virtualTours: true,
        roomTypesRel: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        agent: { select: { displayName: true, companyName: true, user: { select: { phoneNumber: true } } } },
      },
    });
    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });
    if (listing.status === 'ACTIVE') {
      const agentWhere = await publicListingAgentWhere();
      const visible = await prisma.propertyListing.findFirst({
        where: { id: listing.id, status: 'ACTIVE', agent: agentWhere },
        select: { id: true },
      });
      if (!visible) return res.status(404).json({ success: false, message: 'Listing not found' });
    }
    return res.json({ success: true, data: listing });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// POST / - create listing
router.post('/', authenticate, async (req: any, res) => {
  try {
    const agent = await getAgentForUser(req.user.id);
    if (!agent) return res.status(403).json({ success: false, message: 'Must be an approved property agent' });
    try {
      await assertCanOperate(req.user.id, 'REAL_ESTATE');
    } catch (error) {
      return sendSubscriptionBlocked(res, error);
    }

    const {
      title, description, listingType, price, currency, address, city,
      latitude, longitude, bedrooms, bathrooms, areaSqm, amenities,
      images, virtualTours,
    } = req.body;

    const photoError = validateStayPhotos(req.body);
    if (photoError) return res.status(400).json({ success: false, message: photoError });

    const coords = parseCoords(latitude, longitude);
    if (!coords) {
      return res.status(400).json({ success: false, message: 'Valid latitude and longitude are required.' });
    }

    const isStay = STAY_TYPES.includes(listingType);
    const listing = await prisma.propertyListing.create({
      data: {
        agentId: agent.id,
        title,
        description: description || null,
        listingType,
        price: parseFloat(price) || 0,
        currency: currency || 'GMD',
        address,
        city,
        latitude: coords.lat,
        longitude: coords.lng,
        bedrooms: bedrooms ?? null,
        bathrooms: bathrooms ?? null,
        areaSqm: areaSqm ?? null,
        amenities: amenities || null,
        status: isStay ? 'PENDING_SETUP' : 'ACTIVE',
        images: images?.length ? {
          create: images.map((img: any, i: number) => ({
            url: typeof img === 'string' ? img : img.url,
            category: img.category || 'OTHER',
            width: img.width ?? null,
            height: img.height ?? null,
            sortOrder: i,
          })),
        } : undefined,
        virtualTours: virtualTours?.length ? {
          create: virtualTours.map((t: any) => ({
            tourType: t.tourType || 'EXTERNAL_URL',
            tourUrl: t.tourUrl,
            title: t.title || null,
          })),
        } : undefined,
      },
      include: { images: true, virtualTours: true, roomTypesRel: true },
    });
    return res.json({ success: true, data: listing });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// PATCH /:id
router.patch('/:id', authenticate, async (req: any, res) => {
  try {
    const agent = await assertListingOwner(req.params.id, req.user.id);
    if (!agent) return res.status(403).json({ success: false, message: 'Access denied' });
    const {
      title, description, price, address, city, latitude, longitude,
      bedrooms, bathrooms, areaSqm, amenities, status,
    } = req.body;

    if (status === 'ACTIVE') {
      const published = await publishStayListing(req.params.id);
      if (!published.ok) {
        return res.status(400).json({ success: false, message: published.message });
      }
      const otherFields: Record<string, unknown> = {};
      if (title !== undefined) otherFields.title = title;
      if (description !== undefined) otherFields.description = description || null;
      if (price !== undefined) otherFields.price = parseFloat(price);
      if (address !== undefined) otherFields.address = address;
      if (city !== undefined) otherFields.city = city;
      const coords = latitude !== undefined && longitude !== undefined ? parseCoords(latitude, longitude) : null;
      if (coords) {
        otherFields.latitude = coords.lat;
        otherFields.longitude = coords.lng;
      }
      if (bedrooms !== undefined) otherFields.bedrooms = bedrooms;
      if (bathrooms !== undefined) otherFields.bathrooms = bathrooms;
      if (areaSqm !== undefined) otherFields.areaSqm = areaSqm;
      if (amenities !== undefined) otherFields.amenities = amenities;
      if (Object.keys(otherFields).length === 0) {
        return res.json({ success: true, data: published.listing });
      }
      const updated = await prisma.propertyListing.update({
        where: { id: req.params.id },
        data: otherFields,
        include: { images: true, roomTypesRel: true },
      });
      return res.json({ success: true, data: updated });
    }

    const coords = latitude !== undefined && longitude !== undefined ? parseCoords(latitude, longitude) : null;
    const updated = await prisma.propertyListing.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description: description || null } : {}),
        ...(price !== undefined ? { price: parseFloat(price) } : {}),
        ...(address !== undefined ? { address } : {}),
        ...(city !== undefined ? { city } : {}),
        ...(coords ? { latitude: coords.lat, longitude: coords.lng } : {}),
        ...(bedrooms !== undefined ? { bedrooms } : {}),
        ...(bathrooms !== undefined ? { bathrooms } : {}),
        ...(areaSqm !== undefined ? { areaSqm } : {}),
        ...(amenities !== undefined ? { amenities } : {}),
        ...(status !== undefined ? { status } : {}),
      },
      include: { images: true, roomTypesRel: true },
    });
    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// POST /:id/publish — agent publishes stay listing after room setup
router.post('/:id/publish', authenticate, async (req: any, res) => {
  try {
    const agent = await assertListingOwner(req.params.id, req.user.id);
    if (!agent) return res.status(403).json({ success: false, message: 'Access denied' });
    try {
      await assertCanOperate(req.user.id, 'REAL_ESTATE');
    } catch (error) {
      return sendSubscriptionBlocked(res, error);
    }
    const result = await publishStayListing(req.params.id);
    if (!result.ok) {
      return res.status(400).json({ success: false, message: result.message });
    }
    return res.json({ success: true, data: result.listing });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// DELETE /:id (soft deactivate)
router.delete('/:id', authenticate, async (req: any, res) => {
  try {
    const agent = await assertListingOwner(req.params.id, req.user.id);
    if (!agent) return res.status(403).json({ success: false, message: 'Access denied' });
    await prisma.propertyListing.update({
      where: { id: req.params.id },
      data: { status: 'INACTIVE' },
    });
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// ─── Room types ─────────────────────────────────────────────────────────────

router.get('/:id/room-types', async (req, res) => {
  try {
    const roomTypes = await prisma.propertyRoomType.findMany({
      where: { listingId: req.params.id, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    return res.json({ success: true, data: roomTypes.map((r) => ({ ...r, pricePerNight: Number(r.pricePerNight) })) });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

router.post('/:id/room-types', authenticate, async (req: any, res) => {
  try {
    const agent = await assertListingOwner(req.params.id, req.user.id);
    if (!agent) return res.status(403).json({ success: false, message: 'Access denied' });
    const {
      name, description, bedType, maxAdults, maxChildren, maxOccupancy,
      unitsAvailable, pricePerNight, amenities, photos, sortOrder,
    } = req.body;
    if (!name?.trim() || pricePerNight == null) {
      return res.status(400).json({ success: false, message: 'name and pricePerNight are required' });
    }
    const room = await prisma.propertyRoomType.create({
      data: {
        listingId: req.params.id,
        name: name.trim(),
        description: description?.trim() || null,
        bedType: bedType || null,
        maxAdults: maxAdults ?? 2,
        maxChildren: maxChildren ?? 0,
        maxOccupancy: maxOccupancy ?? 2,
        unitsAvailable: unitsAvailable ?? 1,
        pricePerNight: parseFloat(pricePerNight),
        amenities: amenities || [],
        photos: photos || [],
        sortOrder: sortOrder ?? 0,
      },
    });
    const count = await prisma.propertyRoomType.count({ where: { listingId: req.params.id, isActive: true } });
    if (count >= 1) {
      await publishStayListing(req.params.id);
    }
    return res.json({ success: true, data: { ...room, pricePerNight: Number(room.pricePerNight) } });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

router.patch('/:id/room-types/:roomTypeId', authenticate, async (req: any, res) => {
  try {
    const agent = await assertListingOwner(req.params.id, req.user.id);
    if (!agent) return res.status(403).json({ success: false, message: 'Access denied' });
    const data: any = {};
    const fields = ['name', 'description', 'bedType', 'maxAdults', 'maxChildren', 'maxOccupancy', 'unitsAvailable', 'amenities', 'photos', 'sortOrder', 'isActive'];
    for (const f of fields) {
      if (req.body[f] !== undefined) data[f] = req.body[f];
    }
    if (req.body.pricePerNight !== undefined) data.pricePerNight = parseFloat(req.body.pricePerNight);
    const room = await prisma.propertyRoomType.updateMany({
      where: { id: req.params.roomTypeId, listingId: req.params.id },
      data,
    });
    if (room.count === 0) return res.status(404).json({ success: false, message: 'Room type not found' });
    const updated = await prisma.propertyRoomType.findUnique({ where: { id: req.params.roomTypeId } });
    return res.json({ success: true, data: { ...updated, pricePerNight: Number(updated!.pricePerNight) } });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

router.delete('/:id/room-types/:roomTypeId', authenticate, async (req: any, res) => {
  try {
    const agent = await assertListingOwner(req.params.id, req.user.id);
    if (!agent) return res.status(403).json({ success: false, message: 'Access denied' });
    await prisma.propertyRoomType.updateMany({
      where: { id: req.params.roomTypeId, listingId: req.params.id },
      data: { isActive: false },
    });
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// ─── Blocked dates ──────────────────────────────────────────────────────────

router.get('/:id/blocked-dates', authenticate, async (req: any, res) => {
  try {
    const agent = await assertListingOwner(req.params.id, req.user.id);
    if (!agent) return res.status(403).json({ success: false, message: 'Access denied' });
    const blocked = await prisma.propertyBlockedDate.findMany({
      where: { listingId: req.params.id },
      orderBy: { startDate: 'asc' },
    });
    return res.json({ success: true, data: blocked });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

router.post('/:id/blocked-dates', authenticate, async (req: any, res) => {
  try {
    const agent = await assertListingOwner(req.params.id, req.user.id);
    if (!agent) return res.status(403).json({ success: false, message: 'Access denied' });
    const { startDate, endDate, roomTypeId, reason } = req.body;
    const blocked = await prisma.propertyBlockedDate.create({
      data: {
        listingId: req.params.id,
        roomTypeId: roomTypeId || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason: reason || null,
      },
    });
    return res.json({ success: true, data: blocked });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

router.delete('/:id/blocked-dates/:blockId', authenticate, async (req: any, res) => {
  try {
    const agent = await assertListingOwner(req.params.id, req.user.id);
    if (!agent) return res.status(403).json({ success: false, message: 'Access denied' });
    await prisma.propertyBlockedDate.deleteMany({
      where: { id: req.params.blockId, listingId: req.params.id },
    });
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

export default router;
