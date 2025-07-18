import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // Seed UCP (Universal Configuration Parameters) for service fees
  console.log('Seeding UCP configurations...');
  
  const ucpConfigs = [
    {
      name: 'service_fee_stripe',
      value: 0.05, // 5% service fee for Stripe payments
      description: 'Service fee percentage for Stripe payment gateway transactions',
      serviceType: 'payment_gateway',
      metadata: {
        gateway: 'stripe',
        feeType: 'percentage',
        minAmount: 0,
        maxAmount: null,
        currency: 'USD'
      }
    },
    {
      name: 'service_fee_mpesa',
      value: 0.03, // 3% service fee for M-Pesa payments
      description: 'Service fee percentage for M-Pesa payment gateway transactions',
      serviceType: 'payment_gateway',
      metadata: {
        gateway: 'mpesa',
        feeType: 'percentage',
        minAmount: 0,
        maxAmount: null,
        currency: 'KES'
      }
    },
    {
      name: 'service_fee_airtel_money',
      value: 0.03, // 3% service fee for Airtel Money payments
      description: 'Service fee percentage for Airtel Money payment gateway transactions',
      serviceType: 'payment_gateway',
      metadata: {
        gateway: 'airtel_money',
        feeType: 'percentage',
        minAmount: 0,
        maxAmount: null,
        currency: 'UGX'
      }
    },
    {
      name: 'service_fee_mobile_wallet',
      value: 0.025, // 2.5% service fee for generic mobile wallet payments
      description: 'Service fee percentage for mobile wallet payment gateway transactions',
      serviceType: 'payment_gateway',
      metadata: {
        gateway: 'mobile_wallet',
        feeType: 'percentage',
        minAmount: 0,
        maxAmount: null,
        currency: 'USD'
      }
    },
    {
      name: 'service_fee_cash_on_delivery',
      value: 0.02, // 2% service fee for cash on delivery
      description: 'Service fee percentage for cash on delivery transactions',
      serviceType: 'payment_gateway',
      metadata: {
        gateway: 'cash_on_delivery',
        feeType: 'percentage',
        minAmount: 0,
        maxAmount: null,
        currency: 'USD'
      }
    }
  ];

  for (const config of ucpConfigs) {
    await prisma.uCP.upsert({
      where: { name: config.name },
      update: config,
      create: config
    });
  }

  console.log('UCP configurations seeded successfully!');
  console.log('Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 