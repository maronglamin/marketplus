import { RideType } from '@prisma/client';

export interface FareBreakdown {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  surgeFare: number;
  totalFare: number;
}

/**
 * Calculate fare for a ride based on distance, duration, and ride type
 */
export function calculateFare(
  distance: number, // in kilometers
  duration: number, // in minutes
  rideType: RideType = RideType.STANDARD
): number {
  // Base fare rates
  const baseFares = {
    [RideType.STANDARD]: 2.50,
    [RideType.PREMIUM]: 4.00,
    [RideType.POOL]: 1.50,
    [RideType.DELIVERY]: 3.00
  };

  // Per kilometer rates
  const distanceRates = {
    [RideType.STANDARD]: 1.20,
    [RideType.PREMIUM]: 2.00,
    [RideType.POOL]: 0.80,
    [RideType.DELIVERY]: 1.50
  };

  // Per minute rates
  const timeRates = {
    [RideType.STANDARD]: 0.15,
    [RideType.PREMIUM]: 0.25,
    [RideType.POOL]: 0.10,
    [RideType.DELIVERY]: 0.20
  };

  // Multipliers for different ride types
  const multipliers = {
    [RideType.STANDARD]: 1.0,
    [RideType.PREMIUM]: 1.5,
    [RideType.POOL]: 0.7,
    [RideType.DELIVERY]: 1.2
  };

  // Calculate fare components
  const baseFare = baseFares[rideType];
  const distanceFare = distance * distanceRates[rideType];
  const timeFare = duration * timeRates[rideType];
  const surgeFare = 0; // No surge pricing for now

  // Calculate total fare
  const subtotal = baseFare + distanceFare + timeFare + surgeFare;
  const totalFare = subtotal * multipliers[rideType];

  // Round to 2 decimal places
  return Math.round(totalFare * 100) / 100;
}

/**
 * Get detailed fare breakdown
 */
export function getFareBreakdown(
  distance: number,
  duration: number,
  rideType: RideType = RideType.STANDARD
): FareBreakdown {
  const baseFares = {
    [RideType.STANDARD]: 2.50,
    [RideType.PREMIUM]: 4.00,
    [RideType.POOL]: 1.50,
    [RideType.DELIVERY]: 3.00
  };

  const distanceRates = {
    [RideType.STANDARD]: 1.20,
    [RideType.PREMIUM]: 2.00,
    [RideType.POOL]: 0.80,
    [RideType.DELIVERY]: 1.50
  };

  const timeRates = {
    [RideType.STANDARD]: 0.15,
    [RideType.PREMIUM]: 0.25,
    [RideType.POOL]: 0.10,
    [RideType.DELIVERY]: 0.20
  };

  const multipliers = {
    [RideType.STANDARD]: 1.0,
    [RideType.PREMIUM]: 1.5,
    [RideType.POOL]: 0.7,
    [RideType.DELIVERY]: 1.2
  };

  const baseFare = baseFares[rideType];
  const distanceFare = distance * distanceRates[rideType];
  const timeFare = duration * timeRates[rideType];
  const surgeFare = 0;

  const subtotal = baseFare + distanceFare + timeFare + surgeFare;
  const totalFare = subtotal * multipliers[rideType];

  return {
    baseFare: Math.round(baseFare * 100) / 100,
    distanceFare: Math.round(distanceFare * 100) / 100,
    timeFare: Math.round(timeFare * 100) / 100,
    surgeFare: Math.round(surgeFare * 100) / 100,
    totalFare: Math.round(totalFare * 100) / 100
  };
} 