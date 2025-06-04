import { PrismaClient } from '@prisma/client';
import { sendOTP, sendPIN } from '../services/sms';
import crypto from 'crypto';
import { z } from 'zod';

const prisma = new PrismaClient();

// Rate limiting configuration
const MAX_ATTEMPTS = 3;
const ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes
const OTP_EXPIRY = 10 * 60 * 1000; // 10 minutes
const MAX_OTP_PER_PHONE = 3; // Maximum number of active OTPs per phone number

// Validate environment variables
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const env = envSchema.parse(process.env);

export const generateOTP = (): string => {
  // Generate 6 random bytes and convert to a 6-digit number
  const buffer = crypto.randomBytes(3);
  const code = buffer.readUIntBE(0, 3) % 1000000;
  return code.toString().padStart(6, '0');
};

export const generatePIN = (): string => {
  // Generate 2 random bytes and convert to a 4-digit number
  const buffer = crypto.randomBytes(2);
  const code = buffer.readUIntBE(0, 2) % 10000;
  return code.toString().padStart(4, '0');
};

export const createOTP = async (
  phoneNumber: string,
  type: 'VERIFICATION' | 'PIN_RESET'
): Promise<string> => {
  console.log(`Creating ${type} for ${phoneNumber}`);
  
  // Check for rate limiting
  const recentOTPs = await prisma.oTP.findMany({
    where: {
      phoneNumber,
      type,
      createdAt: {
        gt: new Date(Date.now() - ATTEMPT_WINDOW),
      },
    },
  });

  if (recentOTPs.length >= MAX_OTP_PER_PHONE) {
    throw new Error('Too many active OTPs. Please wait before requesting a new one.');
  }

  // Check for existing unused OTPs
  const existingOTP = await prisma.oTP.findFirst({
    where: {
      phoneNumber,
      type,
      isUsed: false,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  if (existingOTP) {
    console.log(`Existing unused ${type} found for ${phoneNumber}`);
    return existingOTP.code;
  }

  const code = type === 'VERIFICATION' ? generateOTP() : generatePIN();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY);

  // Hash the OTP before storing
  const hashedCode = crypto
    .createHash('sha256')
    .update(code)
    .digest('hex');

  console.log(`Storing ${type} in database:`, { phoneNumber, type, expiresAt });
  await prisma.oTP.create({
    data: {
      phoneNumber,
      code: hashedCode,
      type,
      expiresAt,
      attempts: 0,
    },
  });

  try {
    if (type === 'VERIFICATION') {
      console.log(`Sending OTP to ${phoneNumber}`);
      await sendOTP(phoneNumber, code);
    } else {
      console.log(`Sending PIN to ${phoneNumber}`);
      await sendPIN(phoneNumber, code);
    }
  } catch (error) {
    console.error('Error sending SMS:', error);
    // In development, log the code
    if (env.NODE_ENV === 'development') {
      console.log(`[DEV] ${type} for ${phoneNumber}: ${code}`);
    }
  }

  return code;
};

export const verifyOTP = async (
  phoneNumber: string,
  code: string,
  type: 'VERIFICATION' | 'PIN_RESET'
): Promise<boolean> => {
  console.log(`Verifying ${type} for ${phoneNumber}`);

  // Check for recent attempts
  const recentAttempts = await prisma.oTP.findMany({
    where: {
      phoneNumber,
      type,
      createdAt: {
        gt: new Date(Date.now() - ATTEMPT_WINDOW),
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Count failed attempts in the window
  const failedAttempts = recentAttempts.reduce((count, otp) => count + (otp.attempts || 0), 0);
  
  if (failedAttempts >= MAX_ATTEMPTS) {
    console.log(`Too many failed attempts for ${phoneNumber}`);
    throw new Error('Too many failed attempts. Please try again later.');
  }

  // Find the most recent unused OTP
  const otp = await prisma.oTP.findFirst({
    where: {
      phoneNumber,
      type,
      isUsed: false,
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!otp) {
    console.log(`No valid ${type} found for ${phoneNumber}`);
    // Increment attempts for the most recent OTP
    if (recentAttempts.length > 0) {
      await prisma.oTP.update({
        where: { id: recentAttempts[0].id },
        data: { attempts: (recentAttempts[0].attempts || 0) + 1 },
      });
    }
    return false;
  }

  // Hash the provided code
  const hashedCode = crypto
    .createHash('sha256')
    .update(code)
    .digest('hex');

  // Compare the hashed codes
  if (otp.code !== hashedCode) {
    console.log(`Invalid ${type} for ${phoneNumber}`);
    await prisma.oTP.update({
      where: { id: otp.id },
      data: { attempts: (otp.attempts || 0) + 1 },
    });
    return false;
  }

  console.log(`Valid ${type} found for ${phoneNumber}`);
  await prisma.oTP.update({
    where: { id: otp.id },
    data: { 
      isUsed: true,
      attempts: 0,
    },
  });

  return true;
}; 