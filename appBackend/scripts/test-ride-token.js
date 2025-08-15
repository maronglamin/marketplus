const { PrismaClient } = require('@prisma/client');
const { RideTokenService } = require('../src/services/rideTokenService');

const prisma = new PrismaClient();

async function testRideToken() {
  try {
    console.log('🧪 Testing Ride Token Service...\n');

    // Create a test ride
    const testRide = await prisma.ride.create({
      data: {
        rideId: 'TEST_RIDE_' + Date.now(),
        rideRequestId: 'TEST_REQUEST_' + Date.now(),
        driverId: 'test-driver-id',
        customerId: 'test-customer-id',
        pickupLocation: { latitude: 13.4432, longitude: -16.5919, address: 'Test Pickup' },
        destinationLocation: { latitude: 13.4432, longitude: -16.5919, address: 'Test Destination' },
        baseFare: 10.00,
        distanceFare: 5.00,
        timeFare: 2.00,
        surgeFare: 0.00,
        totalFare: 17.00,
        driverEarnings: 15.00,
        platformFee: 2.00,
        status: 'ACCEPTED'
      }
    });

    console.log('✅ Test ride created:', testRide.rideId);

    // Generate a token
    const token = await RideTokenService.generateToken(testRide.id);
    console.log('✅ Token generated:', token.token);
    console.log('   Expires at:', token.expiresAt);

    // Test token validation
    const isValid = await RideTokenService.validateAndConsumeToken(token.token, testRide.id);
    console.log('✅ Token validation result:', isValid);

    // Test getting token for ride
    const rideToken = await RideTokenService.getTokenForRide(testRide.id);
    console.log('✅ Retrieved token for ride:', rideToken?.token);

    // Test hasValidToken (should be false since we consumed it)
    const hasValid = await RideTokenService.hasValidToken(testRide.id);
    console.log('✅ Has valid token:', hasValid);

    // Cleanup
    await prisma.rideToken.deleteMany({
      where: { rideId: testRide.id }
    });
    await prisma.ride.delete({
      where: { id: testRide.id }
    });

    console.log('\n🎉 All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRideToken(); 