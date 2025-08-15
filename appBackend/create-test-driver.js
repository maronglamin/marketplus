const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestDriver() {
  console.log('🚗 Creating test driver profile...\n');

  try {
    // First, create a test user
    console.log('1️⃣ Creating test user...');
    const user = await prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'Driver',
        phoneNumber: '+220123456789',
        pin: '1234'
      }
    });
    console.log('✅ Test user created:', user.id);

    // Create a rider application
    console.log('\n2️⃣ Creating rider application...');
    const riderApplication = await prisma.riderApplication.create({
      data: {
        userId: user.id,
        vehicleType: 'MOTORCYCLE',
        firstName: 'Test',
        lastName: 'Driver',
        phoneNumber: '+220123456789',
        address: 'Test Address',
        city: 'Test City',
        licenseNumber: 'LIC123456',
        licenseExpiry: '2025-12-31',
        vehicleModel: 'Test Model',
        vehiclePlate: 'TEST123',
        status: 'APPROVED'
      }
    });
    console.log('✅ Rider application created:', riderApplication.id);

    // Create a driver profile
    console.log('\n3️⃣ Creating driver profile...');
    const driver = await prisma.driver.create({
      data: {
        userId: user.id,
        driverId: `DRIVER_${Date.now()}`,
        riderApplicationId: riderApplication.id,
        isActive: true,
        isOnline: false,
        status: 'OFFLINE'
      }
    });
    console.log('✅ Driver profile created:', driver.id);

    // Create some test rides
    console.log('\n4️⃣ Creating test rides...');
    const testRides = [];
    
    for (let i = 1; i <= 5; i++) {
      const ride = await prisma.ride.create({
        data: {
          rideId: `RIDE_${Date.now()}_${i}`,
          rideRequestId: `REQUEST_${Date.now()}_${i}`,
          driverId: driver.id,
          customerId: user.id, // Using same user as customer for test
          pickupLocation: { lat: 13.4432, lng: -16.5919 },
          destinationLocation: { lat: 13.4532, lng: -16.5819 },
          baseFare: 50.00,
          distanceFare: 25.00,
          timeFare: 15.00,
          totalFare: 90.00,
          driverEarnings: 75.00,
          platformFee: 15.00,
          status: 'COMPLETED',
          paymentStatus: 'PAID',
          settlementStatus: 'PENDING',
          createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000) // Different dates
        }
      });
      testRides.push(ride);
      console.log(`✅ Test ride ${i} created:`, ride.rideId);
    }

    console.log('\n🎉 Test driver setup complete!');
    console.log('\n📋 Test Data Summary:');
    console.log(`User ID: ${user.id}`);
    console.log(`Driver ID: ${driver.id}`);
    console.log(`Phone: ${user.phoneNumber}`);
    console.log(`Total rides: ${testRides.length}`);
    console.log(`Total earnings: ${testRides.reduce((sum, ride) => sum + Number(ride.driverEarnings), 0)} GMD`);

    console.log('\n🔑 To test the frontend:');
    console.log('1. Log in with phone number: +220123456789');
    console.log('2. Navigate to the Driver Dashboard');
    console.log('3. Check the Earnings section');

  } catch (error) {
    console.error('❌ Error creating test driver:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createTestDriver();
