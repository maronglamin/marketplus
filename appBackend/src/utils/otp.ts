import { PrismaClient } from '@prisma/client';
import { sendOTP } from '../services/sms';
import { sendOtpEmail } from '../services/email';
import crypto from 'crypto';
import { z } from 'zod';

const prisma = new PrismaClient();

const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW = 30 * 60 * 1000;
const VERIFICATION_OTP_EXPIRY = 10 * 60 * 1000;
const MAX_OTP_PER_IDENTIFIER = 5;

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const env = envSchema.parse(process.env);

export type OtpChannel = 'EMAIL' | 'PHONE';

export const generateOTP = (): string => {
  const buffer = crypto.randomBytes(3);
  const code = buffer.readUIntBE(0, 3) % 1000000;
  return code.toString().padStart(6, '0');
};

export const createOTP = async (
  identifier: string,
  type: 'VERIFICATION' | 'PIN_RESET',
  options?: {
    channel?: OtpChannel;
    skipSending?: boolean;
    userId?: string;
    deviceId?: string;
    deviceInfo?: any;
    context?: string;
  }
): Promise<string> => {
  const channel: OtpChannel = options?.channel || (identifier.includes('@') ? 'EMAIL' : 'PHONE');
  const phoneNumber = channel === 'PHONE' ? identifier : '';
  console.log(`Creating ${type} for ${channel}:${identifier}`);

  const recentOTPs = await prisma.oTP.findMany({
    where: {
      identifier,
      channel,
      type,
      createdAt: {
        gt: new Date(Date.now() - ATTEMPT_WINDOW),
      },
    },
  });

  if (recentOTPs.length >= MAX_OTP_PER_IDENTIFIER) {
    throw new Error('Too many active OTPs. Please wait before requesting a new one.');
  }

  const existingOTP = await prisma.oTP.findFirst({
    where: {
      identifier,
      channel,
      type,
      isUsed: false,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  if (existingOTP) {
    console.log(`Existing unused ${type} found for ${identifier}`);
    return existingOTP.originalCode || existingOTP.code;
  }

  const code = generateOTP();
  const expiresAt = new Date(Date.now() + VERIFICATION_OTP_EXPIRY);
  const hashedCode = crypto.createHash('sha256').update(code).digest('hex');

  await prisma.oTP.create({
    data: {
      phoneNumber,
      identifier,
      channel,
      code: hashedCode,
      originalCode: code,
      type,
      expiresAt,
      attempts: 0,
    },
  });

  try {
    if (options?.skipSending) {
      console.log('Skipping OTP send as per options');
    } else if (channel === 'EMAIL') {
      await sendOtpEmail(identifier, code);
    } else {
      await sendOTP(identifier, code, {
        userId: options?.userId,
        deviceId: options?.deviceId,
        deviceInfo: options?.deviceInfo,
        context: options?.context,
      });
    }
  } catch (error) {
    console.error('Error sending OTP:', error);
    if (env.NODE_ENV === 'development') {
      console.log(`[DEV] ${type} for ${identifier}: ${code}`);
    } else {
      throw error;
    }
  }

  return code;
};

export const verifyOTP = async (
  identifier: string,
  code: string,
  type: 'VERIFICATION' | 'PIN_RESET',
  channel?: OtpChannel
): Promise<boolean> => {
  const resolvedChannel: OtpChannel = channel || (identifier.includes('@') ? 'EMAIL' : 'PHONE');
  console.log(`Verifying ${type} for ${resolvedChannel}:${identifier}`);

  const recentAttempts = await prisma.oTP.findMany({
    where: {
      identifier,
      channel: resolvedChannel,
      type,
      createdAt: {
        gt: new Date(Date.now() - ATTEMPT_WINDOW),
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const failedAttempts = recentAttempts.reduce((count, otp) => count + (otp.attempts || 0), 0);

  if (failedAttempts >= MAX_ATTEMPTS) {
    throw new Error('Too many failed attempts. Please wait 30 minutes before trying again.');
  }

  const otp = await prisma.oTP.findFirst({
    where: {
      identifier,
      channel: resolvedChannel,
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
    if (recentAttempts.length > 0) {
      await prisma.oTP.update({
        where: { id: recentAttempts[0].id },
        data: { attempts: (recentAttempts[0].attempts || 0) + 1 },
      });
    }
    return false;
  }

  if (otp.originalCode && otp.originalCode === code) {
    await prisma.oTP.update({
      where: { id: otp.id },
      data: { isUsed: true, attempts: 0 },
    });
    return true;
  }

  const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
  if (otp.code !== hashedCode) {
    await prisma.oTP.update({
      where: { id: otp.id },
      data: { attempts: (otp.attempts || 0) + 1 },
    });
    return false;
  }

  await prisma.oTP.update({
    where: { id: otp.id },
    data: { isUsed: true, attempts: 0 },
  });
  return true;
};
