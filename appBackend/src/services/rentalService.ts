import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateRentalRequestInput {
  customerId: string;
  rideServiceId: string;
  driverId?: string;
  riderApplicationId?: string;
  pickupAddress: string;
  pickupLatitude?: number | null;
  pickupLongitude?: number | null;
  startDate: string; // ISO
  endDate: string;   // ISO
  notes?: string;
}

export class RentalService {
  static async createRentalRequest(input: CreateRentalRequestInput) {
    const start = new Date(input.startDate);
    const end = new Date(input.endDate);
    const msPerDay = 1000 * 60 * 60 * 24;
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / msPerDay));

    const rideService = await prisma.rideService.findUnique({
      where: { id: input.rideServiceId },
      select: { currency: true },
    });

    const requestId = `RENT-${Date.now()}`;

    const rental = await prisma.rentalRequest.create({
      data: {
        requestId,
        customerId: input.customerId,
        driverId: input.driverId ?? null,
        riderApplicationId: input.riderApplicationId ?? null,
        rideServiceId: input.rideServiceId,
        pickupAddress: input.pickupAddress,
        pickupLatitude: input.pickupLatitude ?? null,
        pickupLongitude: input.pickupLongitude ?? null,
        startDate: start,
        endDate: end,
        days,
        currency: rideService?.currency ?? 'GMD',
        notes: input.notes ?? null,
      },
      include: {
        rideService: { select: { id: true, name: true } },
        driver: { select: { id: true, driverId: true } },
        riderApplication: { select: { id: true, vehicleModel: true, vehiclePlate: true } },
      },
    });

    return rental;
  }
}


