const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixMissingDriver() {
  console.log('🔧 Fixing missing driver record...\n');

  try {
    // Find the rider application
    const riderApplicationId = 'f4c27980-214c-4720-a7d9-dbe5d2904819';
    
    console.log('1️⃣ Looking for rider application:', riderApplicationId);
    
    const riderApplication = await prisma.riderApplication.findUnique({
      where: { id: riderApplicationId },
      include: {
        user: true,
        documents: true
      }
    });

    if (!riderApplication) {
      console.log('❌ Rider application not found');
      return;
    }

    console.log('✅ Found rider application:', {
      id: riderApplication.id,
      status: riderApplication.status,
      userId: riderApplication.userId,
      vehicleModel: riderApplication.vehicleModel,
      documentsCount: riderApplication.documents.length
    });

    // Check if driver already exists
    const existingDriver = await prisma.driver.findUnique({
      where: { riderApplicationId: riderApplicationId }
    });

    if (existingDriver) {
      console.log('✅ Driver already exists:', existingDriver.id);
      return;
    }

    // Create driver record
    console.log('\n2️⃣ Creating driver record...');
    
    const driver = await prisma.driver.create({
      data: {
        userId: riderApplication.userId,
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
          },
          insurance: {
            number: riderApplication.insuranceNumber,
            expiry: riderApplication.insuranceExpiry
          }
        },
        isVerified: true,
        isActive: true,
        isRentalType: true, // Enable for rental services
        rideServiceId: '1ef80b7c-40d8-434f-8b1a-4582b4e86a95' // Basic - Car service
      }
    });

    console.log('✅ Driver created successfully:', {
      id: driver.id,
      driverId: driver.driverId,
      userId: driver.userId,
      riderApplicationId: driver.riderApplicationId,
      isVerified: driver.isVerified,
      isActive: driver.isActive,
      isRentalType: driver.isRentalType,
      rideServiceId: driver.rideServiceId
    });

    // Verify the driver can be found
    console.log('\n3️⃣ Verifying driver can be found...');
    
    const drivers = await prisma.driver.findMany({
      where: {
        isVerified: true,
        isActive: true,
        isRentalType: true,
        rideServiceId: '1ef80b7c-40d8-434f-8b1a-4582b4e86a95'
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, phoneNumber: true }
        },
        riderApplication: {
          include: {
            documents: {
              where: {
                documentType: { in: ['CAR_INTERIOR_PHOTO', 'CAR_EXTERIOR_PHOTO'] }
              },
              select: {
                id: true,
                documentType: true,
                fileUrl: true,
                fileName: true,
                uploadedAt: true
              }
            }
          }
        }
      }
    });

    console.log('✅ Found drivers for rental service:', drivers.length);
    
    if (drivers.length > 0) {
      const driver = drivers[0];
      console.log('✅ Driver details:', {
        id: driver.id,
        userId: driver.userId,
        documents: driver.riderApplication?.documents?.length || 0
      });
    }

  } catch (error) {
    console.error('❌ Error fixing missing driver:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  fixMissingDriver().catch(console.error);
}

module.exports = { fixMissingDriver };
