const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const CATEGORIES = [
  { name: 'Plumbing', slug: 'plumbing', description: 'Pipe repairs, installations & leak fixes', icon: 'water-outline', sortOrder: 1 },
  { name: 'Cleaning', slug: 'cleaning', description: 'Home & office cleaning services', icon: 'sparkles-outline', sortOrder: 2 },
  { name: 'Welding', slug: 'welding', description: 'Metal fabrication & welding work', icon: 'flame-outline', sortOrder: 3 },
  { name: 'Electrical', slug: 'electrical', description: 'Wiring, repairs & installations', icon: 'flash-outline', sortOrder: 4 },
  { name: 'Architectural Design', slug: 'architectural-design', description: 'Building plans & design consultation', icon: 'business-outline', sortOrder: 5 },
  { name: 'Fitness Coaching', slug: 'fitness-coaching', description: 'Personal training & wellness coaching', icon: 'fitness-outline', sortOrder: 6 },
];

async function main() {
  for (const cat of CATEGORIES) {
    await prisma.serviceCategory.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description, icon: cat.icon, sortOrder: cat.sortOrder },
      create: cat,
    });
    console.log(`Seeded category: ${cat.name}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
