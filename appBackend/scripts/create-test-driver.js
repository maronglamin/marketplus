const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestDriver() {
  try {
    console.log('🚗 Creating test driver profile...');

    // First, check if we have any users
    const users = await prisma.user.findMany({
      take: 5,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true
      }
    });

    if (users.length === 0) {
      console.log('❌ No users found in database. Please create a user first.');
      return;
    }

    console.log('👥 Found users:', users);

    // Check if any user already has a driver profile
    for (const user of users) {
      const existingDriver = await prisma.driver.findUnique({
        where: { userId: user.id }
      });

      if (existingDriver) {
        console.log(`✅ User ${user.firstName} ${user.lastName} already has a driver profile:`, existingDriver.driverId);
        continue;
      }

      // Check if user has an approved rider application
      const riderApplication = await prisma.riderApplication.findFirst({
        where: {
          userId: user.id,
          status: 'APPROVED'
        }
      });

      if (!riderApplication) {
        console.log(`⚠️  User ${user.firstName} ${user.lastName} has no approved rider application. Creating one...`);
        
        // Create a test rider application
        const testApplication = await prisma.riderApplication.create({
          data: {
            userId: user.id,
            vehicleType: 'DRIVER',
            firstName: user.firstName,
            lastName: user.lastName,
            phoneNumber: user.phoneNumber,
            address: 'Test Address',
            city: 'Test City',
            licenseNumber: 'TEST_LICENSE_123',
            licenseExpiry: '2025-12-31',
            vehicleModel: 'Test Vehicle',
            vehiclePlate: 'TEST123',
            status: 'APPROVED',
            approvedAt: new Date()
          }
        });

        console.log('✅ Created test rider application:', testApplication.id);
        
        // Now create driver profile
        const driver = await prisma.driver.create({
          data: {
            userId: user.id,
            riderApplicationId: testApplication.id,
            driverId: `DRIVER_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            isOnline: false,
            status: 'OFFLINE',
            totalRides: 0,
            totalEarnings: 0,
            rating: null,
            ratingCount: 0,
            vehicleInfo: {
              model: testApplication.vehicleModel,
              plate: testApplication.vehiclePlate,
              color: 'Test Color',
              year: new Date().getFullYear()
            },
            documents: {
              license: {
                number: testApplication.licenseNumber,
                expiry: testApplication.licenseExpiry
              }
            },
            isVerified: true,
            isActive: true
          }
        });

        console.log('✅ Created test driver profile:', {
          id: driver.id,
          driverId: driver.driverId,
          userId: driver.userId,
          status: driver.status
        });

        return driver;
      } else {
        console.log(`✅ User ${user.firstName} ${user.lastName} has approved rider application. Creating driver profile...`);
        
        // Create driver profile from existing application
        const driver = await prisma.driver.create({
          data: {
            userId: user.id,
            riderApplicationId: riderApplication.id,
            driverId: `DRIVER_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            isOnline: false,
            status: 'OFFLINE',
            totalRides: 0,
            totalEarnings: 0,
            rating: null,
            ratingCount: 0,
            vehicleInfo: {
              model: riderApplication.vehicleModel,
              plate: riderApplication.vehiclePlate,
              color: 'Unknown',
              year: new Date().getFullYear()
            },
            documents: {
              license: {
                number: riderApplication.licenseNumber,
                expiry: riderApplication.licenseExpiry
              }
            },
            isVerified: true,
            isActive: true
          }
        });

        console.log('✅ Created driver profile from existing application:', {
          id: driver.id,
          driverId: driver.driverId,
          userId: driver.userId,
          status: driver.status
        });

        return driver;
      }
    }

  } catch (error) {
    console.error('❌ Error creating test driver:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  createTestDriver().catch(console.error);
}

module.exports = { createTestDriver };
