/*
  Seed default Location records to satisfy Product.locationId FK
*/

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function ensureLocation(countryCode, region, city) {
  const existing = await prisma.location.findFirst({
    where: { countryCode, region, city },
  });
  if (existing) return existing;
  return prisma.location.create({
    data: {
      countryCode,
      region,
      city,
    },
  });
}

async function main() {
  console.log('Seeding default locations...');

  const seeds = [
    { countryCode: 'GM', region: 'Banjul', city: 'Banjul' },
    { countryCode: 'GM', region: 'Default', city: 'Default City' },
  ];

  const created = [];
  for (const s of seeds) {
    const loc = await ensureLocation(s.countryCode, s.region, s.city);
    created.push({ id: loc.id, countryCode: loc.countryCode, region: loc.region, city: loc.city });
  }

  console.log('Locations ensured:', created);
}

main()
  .catch((e) => {
    console.error('Error seeding locations:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


