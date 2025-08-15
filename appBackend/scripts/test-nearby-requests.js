const { PrismaClient } = require('@prisma/client');
const { RideRequestService } = require('../src/services/rideRequestService');

const prisma = new PrismaClient();

async function testNearbyRequests() {
  try {
    console.log('🧪 Testing getNearbyRideRequests method...');

    // Test coordinates (Gambia)
    const latitude = 13.4432;
    const longitude = -16.5919;
    const maxDistance = 5;

    console.log('📍 Testing with coordinates:', { latitude, longitude, maxDistance });

    const requests = await RideRequestService.getNearbyRideRequests(
      latitude,
      longitude,
      maxDistance
    );

    console.log('✅ getNearbyRideRequests completed successfully!');
    console.log(`📊 Found ${requests.length} nearby requests`);
    
    if (requests.length > 0) {
      console.log('📋 Sample request data:');
      console.log(JSON.stringify(requests[0], null, 2));
    }

  } catch (error) {
    console.error('❌ Error testing getNearbyRideRequests:', error);
    console.error('❌ Error stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testNearbyRequests(); 