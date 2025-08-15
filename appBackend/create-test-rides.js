const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestRides() {
  console.log('🚗 Creating test rides for existing driver...\n');

  try {
    // Get the existing driver
    const driver = await prisma.driver.findFirst({
      where: {
        driverId: 'DRV-1753633486749-wssgn6nyg'
      }
    });

    if (!driver) {
      console.log('❌ Driver not found');
      return;
    }

    console.log('✅ Found driver:', driver.driverId);

    // Get the user
    const user = await prisma.user.findUnique({
      where: { id: driver.userId }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ Found user:', user.phoneNumber);

    // Create test rides
    console.log('\n4️⃣ Creating test rides...');
    const testRides = [];
    
    for (let i = 1; i <= 5; i++) {
      // First create a ride request
      const rideRequest = await prisma.rideRequest.create({
        data: {
          requestId: `REQUEST_${Date.now()}_${i}`,
          customerId: user.id,
          driverId: driver.id,
          pickupLocation: { lat: 13.4432, lng: -16.5919 },
          destinationLocation: { lat: 13.4532, lng: -16.5819 },
          estimatedDistance: 5.0,
          estimatedDuration: 15,
          estimatedPrice: 90.00,
          status: 'COMPLETED',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      });

      // Then create the ride
      const ride = await prisma.ride.create({
        data: {
          rideId: `RIDE_${Date.now()}_${i}`,
          rideRequestId: rideRequest.id,
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

    console.log('\n🎉 Test rides created successfully!');
    console.log('\n📋 Test Data Summary:');
    console.log(`Driver ID: ${driver.driverId}`);
    console.log(`Total rides created: ${testRides.length}`);
    console.log(`Total earnings: ${testRides.reduce((sum, ride) => sum + Number(ride.driverEarnings), 0)} GMD`);

    console.log('\n🔑 Now test the frontend:');
    console.log('1. Go to the Driver Dashboard');
    console.log('2. Check the Earnings section');
    console.log('3. You should see earnings data now');

  } catch (error) {
    console.error('❌ Error creating test rides:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createTestRides();
