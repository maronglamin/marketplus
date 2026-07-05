/**
 * Publish stay listings that have room types but are stuck in PENDING_REVIEW or PENDING_SETUP.
 * Usage: node scripts/publish-ready-listings.js
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const STAY_TYPES = ['HOTEL', 'APARTMENT_RENTAL'];

async function main() {
  const listings = await prisma.propertyListing.findMany({
    where: {
      listingType: { in: STAY_TYPES },
      status: { in: ['PENDING_SETUP', 'PENDING_REVIEW'] },
    },
    include: { roomTypesRel: { where: { isActive: true } } },
  });

  let published = 0;
  for (const listing of listings) {
    if (listing.roomTypesRel.length === 0) {
      console.log(`  skip ${listing.title} (${listing.id}) — no room types`);
      continue;
    }
    await prisma.propertyListing.update({
      where: { id: listing.id },
      data: { status: 'ACTIVE' },
    });
    console.log(`  ✓ published ${listing.title} (${listing.status} → ACTIVE)`);
    published++;
  }

  console.log(`\nPublished ${published} listing(s).`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
