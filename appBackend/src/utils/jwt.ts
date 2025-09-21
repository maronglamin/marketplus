import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Validate environment variables
const envSchema = z.object({
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const env = envSchema.parse(process.env);

// Generate token for mobile app with device tracking
export const generateToken = async (userId: string, deviceId: string): Promise<string> => {
  try {
    const token = jwt.sign(
      { 
        userId, 
        deviceId,
        type: 'access_token'
      },
      env.JWT_SECRET,
      {
        expiresIn: env.JWT_EXPIRES_IN,
        algorithm: 'HS256',
        audience: 'snap-app',
        issuer: 'snap-api',
        jwtid: crypto.randomBytes(16).toString('hex') // Unique token ID
      } as jwt.SignOptions
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Store session in database
    await prisma.session.create({
      data: {
        id: crypto.randomUUID(),
        token,
        expiresAt,
        userId,
        deviceId,
        updatedAt: new Date(),
      },
    });

    return token;
  } catch (error) {
    console.error('Error generating token:', error);
    throw new Error('Failed to generate authentication token');
  }
};

// Generate simple token for web app (no device tracking)
export const generateWebToken = (userId: string, phoneNumber: string): string => {
  try {
    const token = jwt.sign(
      { 
        userId, 
        phoneNumber,
        deviceType: 'web',
        type: 'web_access_token'
      },
      env.JWT_SECRET,
      {
        expiresIn: env.JWT_EXPIRES_IN,
        algorithm: 'HS256',
        audience: 'snap-app',
        issuer: 'snap-api',
        jwtid: crypto.randomBytes(16).toString('hex')
      } as jwt.SignOptions
    );

    return token;
  } catch (error) {
    console.error('Error generating web token:', error);
    throw new Error('Failed to generate web authentication token');
  }
};

export const verifyToken = async (token: string): Promise<{ userId: string; deviceId: string }> => {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'],
      audience: 'snap-app',
      issuer: 'snap-api'
    } as jwt.VerifyOptions) as { userId: string; deviceId: string; type: string };

    // Verify token type
    if (decoded.type !== 'access_token') {
      throw new Error('Invalid token type');
    }

    // Check if session exists and is valid
    const session = await prisma.session.findUnique({
      where: { token },
      include: { device: true }
    });

    if (!session || session.expiresAt < new Date()) {
      throw new Error('Session expired or invalid');
    }

    // Check if device is still verified
    if (!session.device.isVerified) {
      throw new Error('Device no longer verified');
    }

    return {
      userId: decoded.userId,
      deviceId: decoded.deviceId
    };
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    throw error;
  }
}; 