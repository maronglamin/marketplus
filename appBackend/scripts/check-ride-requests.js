const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkRideRequests() {
  try {
    console.log('🔍 Checking ride requests for orphaned data...');

    // Get all ride requests with customer data
    const allRequests = await prisma.rideRequest.findMany({
      include: {
        customer: true
      }
    });

    console.log(`📊 Found ${allRequests.length} total ride requests`);

    const orphanedRequests = allRequests.filter(req => !req.customer);
    
    console.log(`❌ Found ${orphanedRequests.length} orphaned ride requests (have customerId but no customer data)`);
    
    if (orphanedRequests.length > 0) {
      console.log('🔍 Orphaned requests:');
      orphanedRequests.forEach(req => {
        console.log(`  - ID: ${req.id}, RequestID: ${req.requestId}, CustomerID: ${req.customerId}`);
      });
    }

    // Check for active ride requests
    const activeRequests = await prisma.rideRequest.findMany({
      where: {
        status: 'REQUESTED',
        expiresAt: {
          gt: new Date()
        },
        driverId: null
      },
      include: {
        customer: true
      }
    });

    console.log(`✅ Found ${activeRequests.length} active ride requests`);
    
    const activeRequestsWithoutCustomer = activeRequests.filter(req => !req.customer);
    console.log(`❌ Found ${activeRequestsWithoutCustomer.length} active requests without customer data`);

    if (activeRequestsWithoutCustomer.length > 0) {
      console.log('🔍 Active requests without customer data:');
      activeRequestsWithoutCustomer.forEach(req => {
        console.log(`  - ID: ${req.id}, RequestID: ${req.requestId}, CustomerID: ${req.customerId}`);
      });
    }

    // Check if there are any users that don't exist
    const uniqueCustomerIds = [...new Set(allRequests.map(req => req.customerId))];
    console.log(`👥 Found ${uniqueCustomerIds.length} unique customer IDs`);

    for (const customerId of uniqueCustomerIds) {
      const user = await prisma.user.findUnique({
        where: { id: customerId }
      });
      
      if (!user) {
        console.log(`❌ Customer ID ${customerId} does not exist in users table`);
      }
    }

  } catch (error) {
    console.error('❌ Error checking ride requests:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRideRequests(); 