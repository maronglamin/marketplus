const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedPaymentProviders() {
  try {
    console.log('Seeding payment gateway service providers...');

    // Mobile Money Providers
    const mobileMoneyProviders = [
      {
        name: 'Wave Gambia',
        type: 'MOBILE_MONEY',
        countryCode: 'GM',
        currencyCode: 'GMD',
        description: 'Wave Gambia mobile money service',
        isActive: true,
      },
      {
        name: 'Wave Sierra Leone',
        type: 'MOBILE_MONEY',
        countryCode: 'SL',
        currencyCode: 'SLL',
        description: 'Wave Sierra Leone mobile money service',
        isActive: true,
      },
      {
        name: 'Wave Uganda',
        type: 'MOBILE_MONEY',
        countryCode: 'UG',
        currencyCode: 'UGX',
        description: 'MTN mobile money service',
        isActive: true,
      },
      {
        name: 'Wave Tanzania',
        type: 'MOBILE_MONEY',
        countryCode: 'TZ',
        currencyCode: 'TZS',
        description: 'Orange mobile money service',
        isActive: true,
      },
    ];

    // Digital Wallet Providers
    const digitalWalletProviders = [
      {
        name: 'PayPal',
        type: 'DIGITAL_WALLET',
        countryCode: 'US',
        currencyCode: 'USD',
        description: 'PayPal digital wallet',
        isActive: true,
      },
      {
        name: 'Apple Pay',
        type: 'DIGITAL_WALLET',
        countryCode: 'US',
        currencyCode: 'USD',
        description: 'Apple Pay digital wallet',
        isActive: true,
      },
      {
        name: 'Google Pay',
        type: 'DIGITAL_WALLET',
        countryCode: 'US',
        currencyCode: 'USD',
        description: 'Google Pay digital wallet',
        isActive: true,
      },
    ];

    // Create all providers
    const allProviders = [...mobileMoneyProviders, ...digitalWalletProviders];

    for (const provider of allProviders) {
      await prisma.paymentGatewayServiceProvider.upsert({
        where: {
          name_countryCode: {
            name: provider.name,
            countryCode: provider.countryCode,
          },
        },
        update: provider,
        create: provider,
      });
    }

    console.log('Payment gateway service providers seeded successfully!');
    
    // Display created providers
    const providers = await prisma.paymentGatewayServiceProvider.findMany({
      orderBy: { name: 'asc' }
    });
    
    console.log('\nCreated providers:');
    providers.forEach(provider => {
      console.log(`- ${provider.name} (${provider.type}) - ${provider.countryCode}/${provider.currencyCode}`);
    });

  } catch (error) {
    console.error('Error seeding payment providers:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedPaymentProviders(); 