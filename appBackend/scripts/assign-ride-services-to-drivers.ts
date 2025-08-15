import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function assignRideServicesToDrivers() {
  try {
    console.log('🚗 Starting to assign ride services to drivers...');

    // Get all active ride services
    const rideServices = await prisma.rideService.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });

    console.log(`📋 Found ${rideServices.length} active ride services`);

    // Get all drivers
    const drivers = await prisma.driver.findMany({
      include: {
        riderApplication: true
      }
    });

    console.log(`👥 Found ${drivers.length} drivers`);

    let updatedCount = 0;

    for (const driver of drivers) {
      // Find a matching ride service based on vehicle type
      const matchingService = rideServices.find(service => 
        service.vehicleType === driver.riderApplication.vehicleType
      );

      if (matchingService) {
        await prisma.driver.update({
          where: { id: driver.id },
          data: { rideServiceId: matchingService.id }
        });

        console.log(`✅ Assigned ${matchingService.name} to driver ${driver.driverId} (${driver.riderApplication.vehicleType})`);
        updatedCount++;
      } else {
        console.log(`⚠️  No matching service found for driver ${driver.driverId} (${driver.riderApplication.vehicleType})`);
      }
    }

    console.log(`🎉 Successfully assigned ride services to ${updatedCount} out of ${drivers.length} drivers`);

  } catch (error) {
    console.error('❌ Error assigning ride services to drivers:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
assignRideServicesToDrivers(); 