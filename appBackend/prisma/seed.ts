import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create default categories
  const categories = [
    { name: 'Electronics', slug: 'electronics', description: 'Electronic devices and gadgets' },
    { name: 'Fashion', slug: 'fashion', description: 'Clothing, shoes, and accessories' },
    { name: 'Home & Garden', slug: 'home-garden', description: 'Home improvement and garden items' },
    { name: 'Sports', slug: 'sports', description: 'Sports equipment and athletic gear' },
    { name: 'Books', slug: 'books', description: 'Books, magazines, and educational materials' },
    { name: 'Toys', slug: 'toys', description: 'Toys, games, and entertainment' },
    { name: 'Beauty', slug: 'beauty', description: 'Beauty and personal care products' },
    { name: 'Health', slug: 'health', description: 'Health and wellness products' },
    { name: 'Automotive', slug: 'automotive', description: 'Car parts and accessories' },
    { name: 'Food & Beverages', slug: 'food-beverages', description: 'Food and drink items' },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: {
        name: category.name,
        slug: category.slug,
        description: category.description,
        isActive: true,
        order: 0,
      },
    });
  }

  // Create default location
  const defaultLocation = await prisma.location.upsert({
    where: { id: 'default-location' },
    update: {},
    create: {
      id: 'default-location',
      countryCode: 'US',
      region: 'Default Region',
      city: 'Default City',
      isActive: true,
    },
  });

  console.log('Database seeded successfully!');
  console.log('Created categories:', categories.length);
  console.log('Created default location:', defaultLocation.id);
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 