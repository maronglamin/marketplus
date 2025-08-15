import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function seedRideServices() {
  console.log('🌱 Seeding ride services...');

  try {
    // Clear existing services
    await prisma.rideService.deleteMany({});

    // Standard Car Service (GMD)
    await prisma.rideService.create({
      data: {
        serviceId: 'standard-car-gmd',
        name: 'Standard Car',
        description: 'Comfortable sedan rides',
        vehicleType: 'DRIVER',
        isActive: true,
        isDefault: true,
        distanceUnit: 'KILOMETER',
        baseDistance: 1.0,
        maxDistance: 100.0,
        baseFare: new Decimal('50.00'),
        perKmRate: new Decimal('25.00'),
        perMinuteRate: new Decimal('2.00'),
        minimumFare: new Decimal('75.00'),
        maximumFare: new Decimal('5000.00'),
        currency: 'GMD',
        currencySymbol: 'D',
        surgeMultiplier: new Decimal('1.0'),
        maxSurgeMultiplier: new Decimal('3.0'),
        platformFeePercentage: new Decimal('0.15'),
        driverEarningsPercentage: new Decimal('0.85'),
        nightFareMultiplier: new Decimal('1.2'),
        weekendFareMultiplier: new Decimal('1.1'),
        cancellationFee: new Decimal('25.00'),
        cancellationTimeLimit: 300,
        estimatedPickupTime: 5,
        maxWaitTime: 10,
        features: {
          ac: true,
          wifi: false,
          premium: false
        },
        restrictions: {
          maxPassengers: 4,
          maxLuggage: 2
        }
      }
    });

    // Premium Car Service (GMD)
    await prisma.rideService.create({
      data: {
        serviceId: 'premium-car-gmd',
        name: 'Premium Car',
        description: 'Luxury vehicle rides',
        vehicleType: 'DRIVER',
        isActive: true,
        isDefault: false,
        distanceUnit: 'KILOMETER',
        baseDistance: 1.0,
        maxDistance: 100.0,
        baseFare: new Decimal('100.00'),
        perKmRate: new Decimal('50.00'),
        perMinuteRate: new Decimal('4.00'),
        minimumFare: new Decimal('150.00'),
        maximumFare: new Decimal('10000.00'),
        currency: 'GMD',
        currencySymbol: 'D',
        surgeMultiplier: new Decimal('1.0'),
        maxSurgeMultiplier: new Decimal('3.0'),
        platformFeePercentage: new Decimal('0.15'),
        driverEarningsPercentage: new Decimal('0.85'),
        nightFareMultiplier: new Decimal('1.3'),
        weekendFareMultiplier: new Decimal('1.2'),
        cancellationFee: new Decimal('50.00'),
        cancellationTimeLimit: 300,
        estimatedPickupTime: 8,
        maxWaitTime: 15,
        features: {
          ac: true,
          wifi: true,
          premium: true
        },
        restrictions: {
          maxPassengers: 4,
          maxLuggage: 3
        }
      }
    });

    // Motorcycle Service (GMD)
    await prisma.rideService.create({
      data: {
        serviceId: 'motorcycle-gmd',
        name: 'Motorcycle',
        description: 'Quick motorcycle rides',
        vehicleType: 'MOTORCYCLE',
        isActive: true,
        isDefault: true,
        distanceUnit: 'KILOMETER',
        baseDistance: 1.0,
        maxDistance: 50.0,
        baseFare: new Decimal('30.00'),
        perKmRate: new Decimal('15.00'),
        perMinuteRate: new Decimal('1.50'),
        minimumFare: new Decimal('45.00'),
        maximumFare: new Decimal('2000.00'),
        currency: 'GMD',
        currencySymbol: 'D',
        surgeMultiplier: new Decimal('1.0'),
        maxSurgeMultiplier: new Decimal('2.5'),
        platformFeePercentage: new Decimal('0.15'),
        driverEarningsPercentage: new Decimal('0.85'),
        nightFareMultiplier: new Decimal('1.1'),
        weekendFareMultiplier: new Decimal('1.05'),
        cancellationFee: new Decimal('15.00'),
        cancellationTimeLimit: 180,
        estimatedPickupTime: 3,
        maxWaitTime: 8,
        features: {
          ac: false,
          wifi: false,
          premium: false
        },
        restrictions: {
          maxPassengers: 1,
          maxLuggage: 1
        }
      }
    });

    // Bicycle Service (GMD)
    await prisma.rideService.create({
      data: {
        serviceId: 'bicycle-gmd',
        name: 'Bicycle',
        description: 'Eco-friendly bicycle rides',
        vehicleType: 'BICYCLE',
        isActive: true,
        isDefault: true,
        distanceUnit: 'KILOMETER',
        baseDistance: 1.0,
        maxDistance: 20.0,
        baseFare: new Decimal('20.00'),
        perKmRate: new Decimal('10.00'),
        perMinuteRate: new Decimal('1.00'),
        minimumFare: new Decimal('30.00'),
        maximumFare: new Decimal('500.00'),
        currency: 'GMD',
        currencySymbol: 'D',
        surgeMultiplier: new Decimal('1.0'),
        maxSurgeMultiplier: new Decimal('2.0'),
        platformFeePercentage: new Decimal('0.15'),
        driverEarningsPercentage: new Decimal('0.85'),
        nightFareMultiplier: new Decimal('1.0'),
        weekendFareMultiplier: new Decimal('1.0'),
        cancellationFee: new Decimal('10.00'),
        cancellationTimeLimit: 120,
        estimatedPickupTime: 10,
        maxWaitTime: 20,
        features: {
          ac: false,
          wifi: false,
          premium: false,
          eco: true
        },
        restrictions: {
          maxPassengers: 1,
          maxLuggage: 1
        }
      }
    });

    // USD Standard Car Service
    await prisma.rideService.create({
      data: {
        serviceId: 'standard-car-usd',
        name: 'Standard Car (USD)',
        description: 'Comfortable sedan rides in USD',
        vehicleType: 'DRIVER',
        isActive: true,
        isDefault: false,
        distanceUnit: 'KILOMETER',
        baseDistance: 1.0,
        maxDistance: 100.0,
        baseFare: new Decimal('5.00'),
        perKmRate: new Decimal('2.50'),
        perMinuteRate: new Decimal('0.20'),
        minimumFare: new Decimal('7.50'),
        maximumFare: new Decimal('500.00'),
        currency: 'USD',
        currencySymbol: '$',
        surgeMultiplier: new Decimal('1.0'),
        maxSurgeMultiplier: new Decimal('3.0'),
        platformFeePercentage: new Decimal('0.15'),
        driverEarningsPercentage: new Decimal('0.85'),
        nightFareMultiplier: new Decimal('1.2'),
        weekendFareMultiplier: new Decimal('1.1'),
        cancellationFee: new Decimal('2.50'),
        cancellationTimeLimit: 300,
        estimatedPickupTime: 5,
        maxWaitTime: 10,
        features: {
          ac: true,
          wifi: false,
          premium: false
        },
        restrictions: {
          maxPassengers: 4,
          maxLuggage: 2
        }
      }
    });

    // EUR Standard Car Service
    await prisma.rideService.create({
      data: {
        serviceId: 'standard-car-eur',
        name: 'Standard Car (EUR)',
        description: 'Comfortable sedan rides in EUR',
        vehicleType: 'DRIVER',
        isActive: true,
        isDefault: false,
        distanceUnit: 'KILOMETER',
        baseDistance: 1.0,
        maxDistance: 100.0,
        baseFare: new Decimal('4.50'),
        perKmRate: new Decimal('2.25'),
        perMinuteRate: new Decimal('0.18'),
        minimumFare: new Decimal('6.75'),
        maximumFare: new Decimal('450.00'),
        currency: 'EUR',
        currencySymbol: '€',
        surgeMultiplier: new Decimal('1.0'),
        maxSurgeMultiplier: new Decimal('3.0'),
        platformFeePercentage: new Decimal('0.15'),
        driverEarningsPercentage: new Decimal('0.85'),
        nightFareMultiplier: new Decimal('1.2'),
        weekendFareMultiplier: new Decimal('1.1'),
        cancellationFee: new Decimal('2.25'),
        cancellationTimeLimit: 300,
        estimatedPickupTime: 5,
        maxWaitTime: 10,
        features: {
          ac: true,
          wifi: false,
          premium: false
        },
        restrictions: {
          maxPassengers: 4,
          maxLuggage: 2
        }
      }
    });

    // Mile-based Service (for US market)
    await prisma.rideService.create({
      data: {
        serviceId: 'standard-car-us-miles',
        name: 'Standard Car (US Miles)',
        description: 'US market service with mile-based pricing',
        vehicleType: 'DRIVER',
        isActive: true,
        isDefault: false,
        distanceUnit: 'MILE',
        baseDistance: 1.0,
        maxDistance: 100.0,
        baseFare: new Decimal('3.00'),
        perKmRate: new Decimal('2.50'), // This will be converted to per-mile rate
        perMinuteRate: new Decimal('0.35'),
        minimumFare: new Decimal('5.00'),
        maximumFare: new Decimal('200.00'),
        currency: 'USD',
        currencySymbol: '$',
        surgeMultiplier: new Decimal('1.0'),
        maxSurgeMultiplier: new Decimal('3.0'),
        platformFeePercentage: new Decimal('0.15'),
        driverEarningsPercentage: new Decimal('0.85'),
        nightFareMultiplier: new Decimal('1.2'),
        weekendFareMultiplier: new Decimal('1.1'),
        cancellationFee: new Decimal('2.00'),
        cancellationTimeLimit: 300,
        estimatedPickupTime: 5,
        maxWaitTime: 10,
        features: {
          ac: true,
          wifi: false,
          premium: false
        },
        restrictions: {
          maxPassengers: 4,
          maxLuggage: 2
        }
      }
    });

    console.log('✅ Ride services seeded successfully!');
    console.log('📊 Created services:');
    console.log('  - Standard Car (GMD) - Default');
    console.log('  - Premium Car (GMD)');
    console.log('  - Motorcycle (GMD) - Default');
    console.log('  - Bicycle (GMD) - Default');
    console.log('  - Standard Car (USD)');
    console.log('  - Standard Car (EUR)');
    console.log('  - Standard Car (US Miles)');

  } catch (error) {
    console.error('❌ Error seeding ride services:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedRideServices()
  .then(() => {
    console.log('🎉 Ride services seeding completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Ride services seeding failed:', error);
    process.exit(1);
  }); 