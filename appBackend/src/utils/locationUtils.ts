// Location utility functions for ride-sharing

/**
 * Calculate distance between two points using Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in kilometers
  return distance;
}

/**
 * Calculate estimated travel time based on distance and average speed
 * @param distance Distance in kilometers
 * @param averageSpeed Average speed in km/h (default: 30 km/h for city driving)
 * @returns Estimated time in minutes
 */
export function calculateTravelTime(distance: number, averageSpeed: number = 30): number {
  const timeInHours = distance / averageSpeed;
  const timeInMinutes = timeInHours * 60;
  return Math.round(timeInMinutes);
}

/**
 * Calculate fare based on distance, time, and base fare
 * @param distance Distance in kilometers
 * @param duration Duration in minutes
 * @param baseFare Base fare amount
 * @param perKmRate Rate per kilometer
 * @param perMinuteRate Rate per minute
 * @returns Calculated fare
 */
export function calculateFare(
  distance: number,
  duration: number,
  baseFare: number = 2.50,
  perKmRate: number = 1.20,
  perMinuteRate: number = 0.15
): number {
  const distanceFare = distance * perKmRate;
  const timeFare = duration * perMinuteRate;
  const totalFare = baseFare + distanceFare + timeFare;
  return Math.round(totalFare * 100) / 100; // Round to 2 decimal places
}

/**
 * Check if a location is within a certain radius of another location
 * @param centerLat Center latitude
 * @param centerLon Center longitude
 * @param pointLat Point latitude
 * @param pointLon Point longitude
 * @param radius Radius in kilometers
 * @returns True if point is within radius
 */
export function isWithinRadius(
  centerLat: number,
  centerLon: number,
  pointLat: number,
  pointLon: number,
  radius: number
): boolean {
  const distance = calculateDistance(centerLat, centerLon, pointLat, pointLon);
  return distance <= radius;
}

/**
 * Generate a bounding box for location queries
 * @param centerLat Center latitude
 * @param centerLon Center longitude
 * @param radius Radius in kilometers
 * @returns Bounding box coordinates
 */
export function getBoundingBox(centerLat: number, centerLon: number, radius: number) {
  const latDelta = radius / 111.32; // 1 degree latitude = 111.32 km
  const lonDelta = radius / (111.32 * Math.cos(centerLat * Math.PI / 180));

  return {
    minLat: centerLat - latDelta,
    maxLat: centerLat + latDelta,
    minLon: centerLon - lonDelta,
    maxLon: centerLon + lonDelta
  };
} 