import { PrismaClient, RideToken } from '@prisma/client';

const prisma = new PrismaClient();

export class RideTokenService {
  /**
   * Generate a unique 6-digit token for a ride
   */
  static async generateToken(rideId: string): Promise<RideToken> {
    // Generate a random 6-digit token
    const generateRandomToken = (): string => {
      return Math.floor(100000 + Math.random() * 900000).toString();
    };

    let token: string;
    let attempts = 0;
    const maxAttempts = 10;

    // Keep trying until we get a unique token
    do {
      token = generateRandomToken();
      attempts++;
      
      if (attempts > maxAttempts) {
        throw new Error('Unable to generate unique token after maximum attempts');
      }
    } while (await this.isTokenExists(token));

    // Set expiration to 30 minutes from now
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    // Create or update the token (one token per ride enforced by unique rideId)
    const rideToken = await prisma.rideToken.upsert({
      where: { rideId },
      update: {
        token,
        expiresAt,
        isUsed: false,
        usedAt: null,
      },
      create: {
        rideId,
        token,
        expiresAt,
      },
    });

    return rideToken;
  }

  /**
   * Check if a token already exists
   */
  static async isTokenExists(token: string): Promise<boolean> {
    const existingToken = await prisma.rideToken.findUnique({
      where: { token },
    });
    return !!existingToken;
  }

  /**
   * Validate and consume a token
   */
  static async validateAndConsumeToken(token: string, rideId: string): Promise<boolean> {
    const rideToken = await prisma.rideToken.findFirst({
      where: {
        token,
        rideId,
        isUsed: false,
        expiresAt: {
          gt: new Date(), // Token hasn't expired
        },
      },
    });

    if (!rideToken) {
      return false;
    }

    // Mark token as used
    await prisma.rideToken.update({
      where: { id: rideToken.id },
      data: {
        isUsed: true,
        usedAt: new Date(),
      },
    });

    return true;
  }

  /**
   * Get token for a ride
   */
  static async getTokenForRide(rideId: string): Promise<RideToken | null> {
    return await prisma.rideToken.findUnique({
      where: { rideId },
    });
  }

  /**
   * Get active tokens for a customer
   */
  static async getActiveTokensForCustomer(customerId: string): Promise<any[]> {
    const activeTokens = await prisma.rideToken.findMany({
      where: {
        ride: {
          customerId: customerId,
          status: {
            in: ['ACCEPTED', 'ARRIVING', 'ARRIVED', 'IN_PROGRESS']
          }
        },
        isUsed: false,
        expiresAt: {
          gt: new Date(), // Token hasn't expired
        },
      },
      include: {
        ride: {
          include: {
            driver: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return activeTokens.map(token => ({
      token: token.token,
      rideId: token.rideId,
      expiresAt: token.expiresAt,
      driverName: `${token.ride.driver.user.firstName} ${token.ride.driver.user.lastName}`,
      rideStatus: token.ride.status,
      createdAt: token.createdAt
    }));
  }

  /**
   * Check if a ride has a valid token
   */
  static async hasValidToken(rideId: string): Promise<boolean> {
    const token = await prisma.rideToken.findFirst({
      where: {
        rideId,
        isUsed: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    return !!token;
  }

  /**
   * Delete expired tokens
   */
  static async cleanupExpiredTokens(): Promise<void> {
    await prisma.rideToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }
} 