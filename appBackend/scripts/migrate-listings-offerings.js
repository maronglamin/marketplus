/**
 * Migrates legacy PropertyListing.roomTypes JSON → PropertyRoomType rows
 * and ServiceProviderCategory → ServiceOffering per approved provider.
 *
 * Usage: node scripts/migrate-listings-offerings.js
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateRoomTypes() {
  const listings = await prisma.propertyListing.findMany({
    where: { roomTypes: { not: null } },
    select: { id: true, roomTypes: true, listingType: true },
  });

  let created = 0;
  for (const listing of listings) {
    const existing = await prisma.propertyRoomType.count({ where: { listingId: listing.id } });
    if (existing > 0) continue;

    const raw = listing.roomTypes;
    if (!Array.isArray(raw) || raw.length === 0) continue;

    for (let i = 0; i < raw.length; i++) {
      const rt = raw[i];
      if (!rt?.name) continue;
      await prisma.propertyRoomType.create({
        data: {
          listingId: listing.id,
          name: rt.name,
          description: rt.layout || undefined,
          bedType: rt.bedType || undefined,
          maxAdults: rt.maxAdults ?? 2,
          maxChildren: rt.maxChildren ?? 1,
          maxOccupancy: rt.maxOccupancy ?? 3,
          unitsAvailable: rt.unitsAvailable ?? 1,
          pricePerNight: Number(rt.pricePerNight ?? 0),
          amenities: rt.amenities ?? [],
          photos: rt.photos ?? [],
          sortOrder: i,
          isActive: true,
        },
      });
      created++;
    }

    if (listing.listingType === 'HOTEL' || listing.listingType === 'APARTMENT_RENTAL') {
      await prisma.propertyListing.update({
        where: { id: listing.id },
        data: { status: 'ACTIVE' },
      });
    }
  }
  console.log(`Created ${created} PropertyRoomType row(s) from legacy JSON.`);
}

async function migrateOfferings() {
  const links = await prisma.serviceProviderCategory.findMany({
    include: {
      provider: { select: { id: true, displayName: true } },
      category: { select: { id: true, name: true } },
    },
  });

  let created = 0;
  for (const link of links) {
    const existing = await prisma.serviceOffering.findFirst({
      where: { providerId: link.providerId, categoryId: link.categoryId },
    });
    if (existing) continue;

    await prisma.serviceOffering.create({
      data: {
        providerId: link.providerId,
        categoryId: link.categoryId,
        name: link.category.name,
        durationMinutes: 60,
        isActive: true,
        sortOrder: created,
      },
    });
    created++;
  }
  console.log(`Created ${created} ServiceOffering row(s) from provider categories.`);
}

async function main() {
  await migrateRoomTypes();
  await migrateOfferings();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
