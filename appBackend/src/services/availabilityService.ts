import { PrismaClient, ServiceBookingStatus } from '@prisma/client';
import { publicListingAgentWhere } from './providerSubscriptionService';

const prisma = new PrismaClient();

const SLOT_HOLD_STATUSES: ServiceBookingStatus[] = ['PENDING_QUOTE', 'QUOTED', 'ACCEPTED', 'PAID'];
const PROPERTY_BOOKING_ACTIVE = ['PENDING', 'CONFIRMED'];

export function rangesOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date,
): boolean {
  return startA < endB && endA > startB;
}

export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function getProviderBookingsInRange(
  providerId: string,
  from: Date,
  to: Date,
  excludeBookingId?: string,
) {
  return prisma.serviceBooking.findMany({
    where: {
      providerId,
      slotStart: { not: null },
      slotEnd: { not: null },
      status: { in: SLOT_HOLD_STATUSES },
      slotStatus: { in: ['HELD', 'CONFIRMED'] },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      AND: [
        { slotStart: { lt: to } },
        { slotEnd: { gt: from } },
      ],
    },
  });
}

export async function getProviderBlockedInRange(providerId: string, from: Date, to: Date) {
  return prisma.providerBlockedSlot.findMany({
    where: {
      providerId,
      startAt: { lt: to },
      endAt: { gt: from },
    },
  });
}

export async function generateProviderAvailableSlots(
  providerId: string,
  offeringId: string,
  from: Date,
  to: Date,
): Promise<Array<{ start: string; end: string; available: boolean }>> {
  const offering = await prisma.serviceOffering.findFirst({
    where: { id: offeringId, providerId, isActive: true },
  });
  if (!offering) return [];

  const duration = offering.durationMinutes;
  const schedule = await prisma.providerWeeklySchedule.findMany({
    where: { providerId, isEnabled: true },
  });
  if (schedule.length === 0) return [];

  const existingBookings = await getProviderBookingsInRange(providerId, from, to);
  const blocked = await getProviderBlockedInRange(providerId, from, to);

  const slots: Array<{ start: string; end: string; available: boolean }> = [];
  const cursor = startOfDay(from);
  const endDate = endOfDay(to);

  while (cursor <= endDate) {
    const daySchedule = schedule.find((s) => s.dayOfWeek === cursor.getDay());
    if (daySchedule) {
      const dayStart = new Date(cursor);
      const startMins = parseTimeToMinutes(daySchedule.startTime);
      const endMins = parseTimeToMinutes(daySchedule.endTime);
      dayStart.setHours(Math.floor(startMins / 60), startMins % 60, 0, 0);

      let slotStart = new Date(dayStart);
      const dayEnd = new Date(cursor);
      dayEnd.setHours(Math.floor(endMins / 60), endMins % 60, 0, 0);

      while (addMinutes(slotStart, duration) <= dayEnd) {
        const slotEnd = addMinutes(slotStart, duration);
        if (slotStart >= from && slotEnd <= addMinutes(endDate, 1)) {
          const conflictBooking = existingBookings.some((b) =>
            b.slotStart && b.slotEnd && rangesOverlap(slotStart, slotEnd, b.slotStart, b.slotEnd),
          );
          const conflictBlock = blocked.some((b) =>
            rangesOverlap(slotStart, slotEnd, b.startAt, b.endAt),
          );
          const isPast = slotStart < new Date();
          slots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
            available: !conflictBooking && !conflictBlock && !isPast,
          });
        }
        slotStart = addMinutes(slotStart, duration);
      }
    }
    cursor.setDate(cursor.getDate() + 1);
    cursor.setHours(0, 0, 0, 0);
  }

  return slots;
}

export async function validateAndHoldServiceSlot(
  providerId: string,
  offeringId: string,
  slotStart: Date,
): Promise<{ ok: true; slotEnd: Date } | { ok: false; message: string }> {
  const offering = await prisma.serviceOffering.findFirst({
    where: { id: offeringId, providerId, isActive: true },
    include: { category: true },
  });
  if (!offering) {
    return { ok: false, message: 'Service offering not found or inactive' };
  }

  const slotEnd = addMinutes(slotStart, offering.durationMinutes);
  const schedule = await prisma.providerWeeklySchedule.findFirst({
    where: {
      providerId,
      dayOfWeek: slotStart.getDay(),
      isEnabled: true,
    },
  });
  if (!schedule) {
    return { ok: false, message: 'Provider is not available on this day' };
  }

  const startMins = slotStart.getHours() * 60 + slotStart.getMinutes();
  const endMins = slotEnd.getHours() * 60 + slotEnd.getMinutes();
  const schedStart = parseTimeToMinutes(schedule.startTime);
  const schedEnd = parseTimeToMinutes(schedule.endTime);
  if (startMins < schedStart || endMins > schedEnd) {
    return { ok: false, message: 'Selected slot is outside provider working hours' };
  }

  if (slotStart < new Date()) {
    return { ok: false, message: 'Cannot book a slot in the past' };
  }

  const existing = await getProviderBookingsInRange(providerId, slotStart, slotEnd);
  if (existing.length > 0) {
    return { ok: false, message: 'This time slot is no longer available' };
  }

  const blocked = await getProviderBlockedInRange(providerId, slotStart, slotEnd);
  if (blocked.length > 0) {
    return { ok: false, message: 'This time slot is blocked' };
  }

  return { ok: true, slotEnd };
}

export async function releaseServiceSlot(bookingId: string) {
  await prisma.serviceBooking.updateMany({
    where: { id: bookingId, slotStatus: 'HELD' },
    data: { slotStatus: 'RELEASED' },
  });
}

export async function confirmServiceSlot(bookingId: string) {
  await prisma.serviceBooking.updateMany({
    where: { id: bookingId },
    data: { slotStatus: 'CONFIRMED' },
  });
}

// ─── Property availability ─────────────────────────────────────────────────

export async function getPropertyBookingsInRange(
  listingId: string,
  roomTypeId: string | null,
  checkIn: Date,
  checkOut: Date,
  excludeBookingId?: string,
) {
  return prisma.propertyBooking.findMany({
    where: {
      listingId,
      ...(roomTypeId ? { roomTypeId } : {}),
      status: { in: PROPERTY_BOOKING_ACTIVE },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
    },
  });
}

export async function getBlockedDatesInRange(
  listingId: string,
  roomTypeId: string | null,
  checkIn: Date,
  checkOut: Date,
) {
  return prisma.propertyBlockedDate.findMany({
    where: {
      listingId,
      OR: [
        { roomTypeId: null },
        ...(roomTypeId ? [{ roomTypeId }] : []),
      ],
      startDate: { lt: checkOut },
      endDate: { gt: checkIn },
    },
  });
}

export async function getRoomTypeAvailability(
  listingId: string,
  checkIn: Date,
  checkOut: Date,
  adults: number,
  children: number,
) {
  const listing = await prisma.propertyListing.findUnique({
    where: { id: listingId },
    include: {
      roomTypesRel: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
    },
  });
  if (!listing) return null;

  const roomTypes = listing.roomTypesRel;
  const results = [];

  for (const room of roomTypes) {
    if (adults > room.maxAdults || children > room.maxChildren || adults + children > room.maxOccupancy) {
      continue;
    }

    const bookings = await getPropertyBookingsInRange(listingId, room.id, checkIn, checkOut);
    const bookedUnits = bookings.reduce((sum, b) => sum + (b.roomsBooked || 1), 0);
    const blocked = await getBlockedDatesInRange(listingId, room.id, checkIn, checkOut);
    const isBlocked = blocked.length > 0;
    const unitsLeft = Math.max(0, room.unitsAvailable - bookedUnits);

    results.push({
      ...room,
      pricePerNight: Number(room.pricePerNight),
      unitsLeft,
      available: !isBlocked && unitsLeft > 0,
    });
  }

  // Apartment-style: single unit listing without room types uses listing price
  if (roomTypes.length === 0 && listing.listingType === 'APARTMENT_RENTAL') {
    const bookings = await getPropertyBookingsInRange(listingId, null, checkIn, checkOut);
    const blocked = await getBlockedDatesInRange(listingId, null, checkIn, checkOut);
    results.push({
      id: 'listing-default',
      listingId,
      name: listing.title,
      description: listing.description,
      bedType: null,
      maxAdults: listing.bedrooms ? listing.bedrooms * 2 : 4,
      maxChildren: 2,
      maxOccupancy: listing.bedrooms ? listing.bedrooms * 2 + 2 : 4,
      unitsAvailable: 1,
      pricePerNight: Number(listing.price),
      amenities: listing.amenities,
      photos: null,
      sortOrder: 0,
      isActive: true,
      unitsLeft: bookings.length > 0 || blocked.length > 0 ? 0 : 1,
      available: bookings.length === 0 && blocked.length === 0,
    });
  }

  const staySummary = await buildStaySummary(
    checkIn,
    checkOut,
    listing,
    roomTypes,
    results,
    adults,
    children,
  );

  return { listing, roomTypes: results, staySummary };
}

function eachStayNight(checkIn: Date, checkOut: Date): Date[] {
  const nights: Date[] = [];
  let cur = startOfDay(checkIn);
  const endDay = startOfDay(checkOut);
  while (cur < endDay) {
    nights.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return nights;
}

async function buildStaySummary(
  checkIn: Date,
  checkOut: Date,
  listing: { id: string; listingType: string },
  roomTypes: { id: string; maxAdults: number; maxChildren: number; maxOccupancy: number; unitsAvailable: number }[],
  availabilityResults: { id: string; available?: boolean }[],
  adults: number,
  children: number,
) {
  const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
  const availableRoomTypes = availabilityResults.filter((r) => r.available).length;
  const nightDates = eachStayNight(checkIn, checkOut);

  const nightSlots: { date: string; available: boolean }[] = [];
  for (const night of nightDates) {
    const nightEnd = new Date(night);
    nightEnd.setDate(nightEnd.getDate() + 1);
    let nightAvailable = false;

    if (roomTypes.length === 0 && listing.listingType === 'APARTMENT_RENTAL') {
      const bookings = await getPropertyBookingsInRange(listing.id, null, night, nightEnd);
      const blocked = await getBlockedDatesInRange(listing.id, null, night, nightEnd);
      nightAvailable = bookings.length === 0 && blocked.length === 0;
    } else {
      for (const room of roomTypes) {
        if (adults > room.maxAdults || children > room.maxChildren || adults + children > room.maxOccupancy) {
          continue;
        }
        const bookings = await getPropertyBookingsInRange(listing.id, room.id, night, nightEnd);
        const bookedUnits = bookings.reduce((sum, b) => sum + (b.roomsBooked || 1), 0);
        const blocked = await getBlockedDatesInRange(listing.id, room.id, night, nightEnd);
        if (blocked.length === 0 && room.unitsAvailable - bookedUnits > 0) {
          nightAvailable = true;
          break;
        }
      }
    }
    nightSlots.push({ date: night.toISOString(), available: nightAvailable });
  }

  return {
    checkIn: checkIn.toISOString(),
    checkOut: checkOut.toISOString(),
    nights,
    availableRoomTypes,
    nightSlots,
  };
}

export async function validatePropertyBooking(
  listingId: string,
  roomTypeId: string | null,
  checkIn: Date,
  checkOut: Date,
  adults: number,
  children: number,
  roomsBooked: number,
): Promise<{ ok: true; totalPrice: number; nights: number; currency: string; roomTypeId: string | null } | { ok: false; message: string }> {
  if (checkOut <= checkIn) {
    return { ok: false, message: 'Check-out must be after check-in' };
  }

  const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
  const listing = await prisma.propertyListing.findUnique({ where: { id: listingId } });
  if (!listing) return { ok: false, message: 'Listing not found' };
  if (!['HOTEL', 'APARTMENT_RENTAL', 'GUEST_HOUSE', 'BOAT_TRIP'].includes(listing.listingType)) {
    return { ok: false, message: 'This listing does not support stay bookings' };
  }
  if (listing.status !== 'ACTIVE') {
    return { ok: false, message: 'This listing is not available for booking' };
  }

  let pricePerNight: number;
  let resolvedRoomTypeId: string | null = roomTypeId;

  if (roomTypeId && roomTypeId !== 'listing-default') {
    const room = await prisma.propertyRoomType.findFirst({
      where: { id: roomTypeId, listingId, isActive: true },
    });
    if (!room) return { ok: false, message: 'Room type not found' };
    if (adults > room.maxAdults || children > room.maxChildren || adults + children > room.maxOccupancy) {
      return { ok: false, message: 'Guest count exceeds room capacity' };
    }
    const bookings = await getPropertyBookingsInRange(listingId, room.id, checkIn, checkOut);
    const bookedUnits = bookings.reduce((sum, b) => sum + (b.roomsBooked || 1), 0);
    if (bookedUnits + roomsBooked > room.unitsAvailable) {
      return { ok: false, message: 'Not enough rooms available for these dates' };
    }
    const blocked = await getBlockedDatesInRange(listingId, room.id, checkIn, checkOut);
    if (blocked.length > 0) {
      return { ok: false, message: 'Selected dates are blocked for this room type' };
    }
    pricePerNight = Number(room.pricePerNight);
  } else {
    const bookings = await getPropertyBookingsInRange(listingId, null, checkIn, checkOut);
    if (bookings.length > 0) {
      return { ok: false, message: 'Property is not available for these dates' };
    }
    const blocked = await getBlockedDatesInRange(listingId, null, checkIn, checkOut);
    if (blocked.length > 0) {
      return { ok: false, message: 'Selected dates are blocked' };
    }
    resolvedRoomTypeId = null;
    pricePerNight = Number(listing.price);
  }

  const totalPrice = pricePerNight * nights * roomsBooked;
  return { ok: true, totalPrice, nights, currency: listing.currency, roomTypeId: resolvedRoomTypeId };
}

export async function searchListingsWithAvailability(params: {
  listingType?: string;
  city?: string;
  checkIn?: Date;
  checkOut?: Date;
  adults?: number;
  children?: number;
}) {
  const { listingType, city, checkIn, checkOut, adults = 1, children = 0 } = params;

  const listings = await prisma.propertyListing.findMany({
    where: {
      status: 'ACTIVE',
      agent: await publicListingAgentWhere(),
      ...(listingType ? { listingType: listingType as any } : {}),
      ...(city ? { city: { contains: city, mode: 'insensitive' } } : {}),
    },
    include: {
      images: { orderBy: { sortOrder: 'asc' }, take: 1 },
      roomTypesRel: { where: { isActive: true } },
      agent: { select: { displayName: true, companyName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!checkIn || !checkOut) {
    return listings.map((l) => ({
      ...l,
      pricePerNight: Number(l.price),
      available: true,
    }));
  }

  const results = [];
  for (const listing of listings) {
    const avail = await getRoomTypeAvailability(listing.id, checkIn, checkOut, adults, children);
    const availableRooms = avail?.roomTypes.filter((r) => r.available) ?? [];
    if (availableRooms.length > 0) {
      const minPrice = Math.min(...availableRooms.map((r) => r.pricePerNight));
      results.push({
        ...listing,
        pricePerNight: minPrice,
        available: true,
        fromPrice: minPrice,
      });
    }
  }
  return results;
}

export const availabilityService = {
  generateProviderAvailableSlots,
  validateAndHoldServiceSlot,
  releaseServiceSlot,
  confirmServiceSlot,
  getRoomTypeAvailability,
  validatePropertyBooking,
  searchListingsWithAvailability,
  rangesOverlap,
};
