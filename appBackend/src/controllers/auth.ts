import { Request, Response } from 'express';
import { PrismaClient, User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createOTP, verifyOTP, OtpChannel } from '../utils/otp';
import { generateToken, generateWebToken } from '../utils/jwt';
import twilio from 'twilio';
import { driverService } from '../services/driverService';
import { randomUUID } from 'crypto';
import { isValidEmail, normalizeEmail } from '../services/email';
import { mergeUsers, resolveUserForIdentifier } from '../services/accountMerge';
import {
  assertDeviceLoginAllowed,
  DeviceLoginError,
  recordDeviceLogin,
} from '../services/deviceLimits';

const prisma = new PrismaClient();

// Test bypass phone configuration (store review)
const TEST_BYPASS_PHONE = '+2207690103';

// Temporary constants until Prisma types are regenerated with TERMINATED
const ACCOUNT_STATUS_TERMINATED = 'TERMINATED' as any;
const ACCOUNT_STATUS_ACTIVE = 'ACTIVE' as any;

// Normalize phone number to a +E.164-like form for reliable comparisons
const normalizePhone = (raw: unknown): string => {
  if (typeof raw !== 'string') return '';
  let value = raw.trim().replace(/[\s-]/g, '');
  if (value.startsWith('00')) {
    value = '+' + value.slice(2);
  }
  if (!value.startsWith('+')) {
    value = '+' + value.replace(/\D/g, '');
  } else {
    value = '+' + value.slice(1).replace(/\D/g, '');
  }
  return value;
};

interface AuthRequest extends Request {
  user?: {
    id: string;
    deviceId: string;
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isRegisteredUser = (user: { firstName?: string | null; lastName?: string | null }) =>
  Boolean(user.firstName && user.lastName && user.firstName.trim() !== '' && user.lastName.trim() !== '');

const publicUser = (user: User) => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  phoneNumber: user.phoneNumber,
  preferredAuthMethod: user.preferredAuthMethod,
  deviceLockEnabled: user.deviceLockEnabled,
  hasPin: Boolean(user.pin),
});

const upsertDevice = async (userId: string, deviceInfo: any, extras?: { phoneNumber?: string | null; isVerified?: boolean }) => {
  return prisma.device.upsert({
    where: {
      userId_deviceId: {
        userId,
        deviceId: deviceInfo.deviceId,
      },
    },
    update: {
      deviceName: deviceInfo.deviceName,
      deviceType: deviceInfo.deviceType,
      brand: deviceInfo.brand || 'unknown',
      modelName: deviceInfo.modelName || 'unknown',
      osVersion: deviceInfo.osVersion || 'unknown',
      phoneNumber: extras?.phoneNumber ?? deviceInfo.phoneNumber ?? undefined,
      fingerprint: deviceInfo.fingerprint || undefined,
      hardwareId: deviceInfo.hardwareId || undefined,
      lastLoginAt: new Date(),
      ...(typeof extras?.isVerified === 'boolean' ? { isVerified: extras.isVerified } : {}),
    },
    create: {
      id: randomUUID(),
      deviceId: deviceInfo.deviceId,
      deviceName: deviceInfo.deviceName || 'unknown',
      deviceType: deviceInfo.deviceType || 'unknown',
      brand: deviceInfo.brand || 'unknown',
      modelName: deviceInfo.modelName || 'unknown',
      osVersion: deviceInfo.osVersion || 'unknown',
      phoneNumber: extras?.phoneNumber ?? deviceInfo.phoneNumber ?? null,
      fingerprint: deviceInfo.fingerprint || null,
      hardwareId: deviceInfo.hardwareId || null,
      userId,
      isVerified: extras?.isVerified ?? false,
      updatedAt: new Date(),
    },
  });
};

const resolveAuthMethod = (reqBody: any): { method: 'email' | 'phone'; email?: string; phoneNumber?: string; channel: OtpChannel } => {
  const rawMethod = typeof reqBody.method === 'string' ? reqBody.method.toLowerCase() : '';
  const email = normalizeEmail(reqBody.email);
  const phoneNumber = normalizePhone(reqBody.phoneNumber);

  if (rawMethod === 'email' || (!rawMethod && email && EMAIL_RE.test(email))) {
    return { method: 'email', email, channel: 'EMAIL' };
  }
  return { method: 'phone', phoneNumber, channel: 'PHONE' };
};

export const initiateLogin = async (req: Request, res: Response) => {
  try {
    const { deviceInfo, lastUserId } = req.body;
    const { method, email, phoneNumber, channel } = resolveAuthMethod(req.body);

    if (!deviceInfo?.deviceId) {
      return res.status(400).json({ message: 'Device info is required' });
    }

    if (method === 'email') {
      if (!email || !isValidEmail(email)) {
        return res.status(400).json({ message: 'A valid email address is required' });
      }
    } else if (!phoneNumber) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    const identifier = method === 'email' ? email! : phoneNumber!;
    console.log('Initiating login for:', { method, identifier });

    const resolved = await resolveUserForIdentifier({
      email: method === 'email' ? email : undefined,
      phoneNumber: method === 'phone' ? phoneNumber : undefined,
      lastUserId,
    });
    let user = resolved.user
      ? await prisma.user.findUnique({ where: { id: resolved.user.id }, include: { devices: true } })
      : null;

    if (user && user.status === 'BLOCKED') {
      return res.status(401).json({ message: 'Your account is blocked. Please contact support.' });
    }

    const isTerminated = !!(user && (user.status as any) === ACCOUNT_STATUS_TERMINATED);
    if (isTerminated) {
      user = null;
    }

    if (user) {
      try {
        await assertDeviceLoginAllowed(user, deviceInfo);
      } catch (error) {
        if (error instanceof DeviceLoginError) {
          return res.status(403).json({ message: error.message, code: error.code, accountDeviceLocked: error.code === 'DEVICE_LOCK_VIOLATION' });
        }
        throw error;
      }
    }

    const isTestBypass = method === 'phone' && phoneNumber === TEST_BYPASS_PHONE;

    if (isTestBypass) {
      if (!user) {
        user = await prisma.user.create({
          data: {
            id: randomUUID(),
            phoneNumber,
            firstName: '',
            lastName: '',
            preferredAuthMethod: 'PHONE',
            updatedAt: new Date(),
          },
          include: { devices: true },
        });
      }
      const device = await upsertDevice(user.id, deviceInfo, { phoneNumber, isVerified: true });
      await recordDeviceLogin(user.id, deviceInfo);
      return res.status(200).json({
        message: 'Device verified',
        requiresPin: Boolean(user.pin),
        requiresPinSetup: !user.pin,
        isNewUser: !isRegisteredUser(user),
        isRegistered: isRegisteredUser(user),
        user: publicUser(user),
        deviceId: device.id,
      });
    }

    if (user) {
      const existingDevice = user.devices.find((d) => d.deviceId === deviceInfo.deviceId);
      if (existingDevice?.isVerified && user.pin) {
        return res.status(200).json({
          message: 'Device verified',
          requiresPin: true,
          requiresPinSetup: false,
          isNewUser: false,
          isRegistered: isRegisteredUser(user),
          user: publicUser(user),
        });
      }
      await upsertDevice(user.id, deviceInfo, { phoneNumber: phoneNumber || user.phoneNumber });
    } else if (resolved.shouldCreate) {
      user = await prisma.user.create({
        data: {
          id: randomUUID(),
          email: method === 'email' ? email : null,
          phoneNumber: method === 'phone' ? phoneNumber : null,
          firstName: '',
          lastName: '',
          preferredAuthMethod: method === 'email' ? 'EMAIL' : 'PHONE',
          updatedAt: new Date(),
        },
        include: { devices: true },
      });
      await upsertDevice(user.id, deviceInfo, { phoneNumber: phoneNumber || null });
    } else if (user) {
      await upsertDevice(user.id, deviceInfo, { phoneNumber: phoneNumber || user.phoneNumber });
    }

    const otpUserId = user?.id;
    const device = user
      ? await upsertDevice(user.id, deviceInfo, { phoneNumber: phoneNumber || user.phoneNumber })
      : null;

    await createOTP(identifier, 'VERIFICATION', {
      channel,
      userId: otpUserId,
      deviceId: device?.id,
      deviceInfo,
      context: `initiateLogin:${method}`,
    });

    return res.status(200).json({
      message: 'OTP sent successfully',
      requiresPin: false,
      requiresPinSetup: user ? !user.pin : true,
      isNewUser: !user || !isRegisteredUser(user),
      isRegistered: user ? isRegisteredUser(user) : false,
      user: user ? publicUser(user) : undefined,
    });
  } catch (error) {
    console.error('Error in initiateLogin:', error);
    if (error instanceof Error && error.message.includes('Too many')) {
      return res.status(429).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const verifyOTPAndRegister = async (req: Request, res: Response) => {
  try {
    const { code, deviceInfo, lastUserId } = req.body;
    const { method, email, phoneNumber, channel } = resolveAuthMethod(req.body);

    if (!code || !deviceInfo?.deviceId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const identifier = method === 'email' ? email : phoneNumber;
    if (!identifier) {
      return res.status(400).json({ message: method === 'email' ? 'Email is required' : 'Phone number is required' });
    }

    const isTestBypass = method === 'phone' && phoneNumber === TEST_BYPASS_PHONE;
    const isValid = isTestBypass ? true : await verifyOTP(identifier, code, 'VERIFICATION', channel);
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const resolved = await resolveUserForIdentifier({
      email: method === 'email' ? email : undefined,
      phoneNumber: method === 'phone' ? phoneNumber : undefined,
      lastUserId,
    });

    let user = resolved.user;
    if (resolved.mergeFromId && user) {
      user = await mergeUsers(user.id, resolved.mergeFromId);
    }

    if (!user && resolved.shouldCreate) {
      user = await prisma.user.create({
        data: {
          id: randomUUID(),
          email: method === 'email' ? email : null,
          phoneNumber: method === 'phone' ? phoneNumber : null,
          firstName: '',
          lastName: '',
          preferredAuthMethod: method === 'email' ? 'EMAIL' : 'PHONE',
          updatedAt: new Date(),
        },
      });
    }

    if (!user) {
      return res.status(200).json({
        message: 'OTP verified successfully',
        isNewUser: true,
        requiresRegistration: true,
        requiresPinSetup: true,
      });
    }

    try {
      await assertDeviceLoginAllowed(user, deviceInfo);
    } catch (error) {
      if (error instanceof DeviceLoginError) {
        return res.status(403).json({ message: error.message, code: error.code, accountDeviceLocked: error.code === 'DEVICE_LOCK_VIOLATION' });
      }
      throw error;
    }

    const linkData: { email?: string; phoneNumber?: string; preferredAuthMethod?: 'EMAIL' | 'PHONE' } = {
      preferredAuthMethod: method === 'email' ? 'EMAIL' : 'PHONE',
    };
    if (method === 'email' && email && user.email !== email) {
      linkData.email = email;
    }
    if (method === 'phone' && phoneNumber && user.phoneNumber !== phoneNumber) {
      linkData.phoneNumber = phoneNumber;
    }
    if (linkData.email || linkData.phoneNumber) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: linkData,
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { preferredAuthMethod: method === 'email' ? 'EMAIL' : 'PHONE' },
      });
    }

    const device = await upsertDevice(user.id, deviceInfo, {
      phoneNumber: phoneNumber || user.phoneNumber,
      isVerified: true,
    });

    if (user.deviceLockEnabled && !user.lockedDeviceId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { lockedDeviceId: device.id },
      });
    }

    await recordDeviceLogin(user.id, deviceInfo);
    const token = await generateToken(user.id, device.id);

    return res.status(200).json({
      message: 'OTP verified successfully',
      token,
      isNewUser: !isRegisteredUser(user),
      requiresRegistration: !isRegisteredUser(user),
      requiresPin: Boolean(user.pin),
      requiresPinSetup: !user.pin,
      user: publicUser(user),
    });
  } catch (error) {
    console.error('Error in verifyOTPAndRegister:', error);
    if (error instanceof Error && error.message.includes('Too many')) {
      return res.status(429).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const registerUser = async (req: Request, res: Response) => {
  try {
    const {
      phoneNumber,
      email,
      firstName,
      middleName,
      lastName,
    } = req.body;

    // Normalize phone number to E.164 with leading +
    const normalizePhone = (raw: unknown): string => {
      if (typeof raw !== 'string') return '';
      let value = raw.trim().replace(/[\s-]/g, '');
      if (value.startsWith('00')) {
        value = '+' + value.slice(2);
      }
      if (!value.startsWith('+')) {
        value = '+' + value.replace(/\D/g, '');
      } else {
        value = '+' + value.slice(1).replace(/\D/g, '');
      }
      return value;
    };

    const normalizedPhone = normalizePhone(phoneNumber);
    const normalizedEmail = normalizeEmail(email);

    console.log('Registration request received:', {
      phoneNumber: normalizedPhone,
      email: normalizedEmail,
      firstName,
      lastName,
      middleName
    });

    const existingUser = await prisma.user.findFirst({
      where: {
        NOT: { status: ACCOUNT_STATUS_TERMINATED } as any,
        OR: [
          normalizedPhone ? { phoneNumber: normalizedPhone } : undefined,
          normalizedEmail ? { email: normalizedEmail } : undefined,
        ].filter(Boolean) as any,
      },
      include: { devices: true },
      orderBy: { createdAt: 'desc' }
    });

    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find the verified device
    const verifiedDevice = existingUser.devices.find((d: any) => d.isVerified);
    if (!verifiedDevice) {
      return res.status(403).json({ message: 'No verified device found' });
    }

    // Update user with registration info
    const updatedUser = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        firstName: firstName.trim(),
        middleName: middleName?.trim() || null,
        lastName: lastName.trim(),
        phoneNumber: existingUser.phoneNumber || normalizedPhone || null,
        email: existingUser.email || normalizedEmail || null,
        status: (existingUser.status as any) === ACCOUNT_STATUS_TERMINATED ? ACCOUNT_STATUS_ACTIVE : existingUser.status,
      }
    });

    // Generate new token
    const token = await generateToken(updatedUser.id, verifiedDevice.id);
    console.log('Generated token for registration:', token);

    // Send response with minimal required data
    return res.status(200).json({
      message: 'User registered successfully',
      token,
      requiresPinSetup: !updatedUser.pin,
      user: publicUser(updatedUser),
    });
  } catch (error) {
    console.error('Error in registerUser:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const loginWithPin = async (req: Request, res: Response) => {
  try {
    const { deviceId, pin, deviceInfo, phoneNumber, email } = req.body;

    console.log('Login attempt:', { deviceId, deviceInfo, phoneNumber });

    // Validate PIN format
    if (!pin || !/^\d{4}$/.test(pin)) {
      console.log('Invalid PIN format:', pin);
      return res.status(400).json({ message: 'PIN must be 4 digits' });
    }

    const normalizedPhone = normalizePhone(phoneNumber);
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedPhone && !normalizedEmail) {
      return res.status(400).json({ message: 'Email or phone number is required' });
    }

    let user = await prisma.user.findFirst({
      where: {
        NOT: { status: ACCOUNT_STATUS_TERMINATED } as any,
        OR: [
          normalizedPhone ? { phoneNumber: normalizedPhone } : undefined,
          normalizedEmail ? { email: normalizedEmail } : undefined,
        ].filter(Boolean) as any,
      },
      include: {
        devices: {
          where: {
            deviceId,
            isVerified: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    if (!user) {
      user = await prisma.user.findFirst({
        where: { phoneNumber: normalizedPhone },
        include: {
          devices: {
            where: {
              deviceId,
              isVerified: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }) as any;
    }

    // Test-only bypass: ensure device is verified for this phone before proceeding
    if (normalizedPhone === TEST_BYPASS_PHONE) {
      const existing = await prisma.user.findFirst({
        where: { phoneNumber: normalizedPhone },
        include: { devices: true },
        orderBy: { createdAt: 'desc' }
      });
      if (!existing) {
        console.log('Test bypass: user not found for phone', normalizedPhone);
        return res.status(404).json({ message: 'User not found' });
      }
      await prisma.device.upsert({
        where: {
          userId_deviceId: {
            userId: existing.id,
            deviceId,
          },
        },
        update: {
          isVerified: true,
          lastLoginAt: new Date(),
          deviceName: deviceInfo?.deviceName,
          deviceType: deviceInfo?.deviceType,
          phoneNumber: normalizedPhone
        },
        create: {
          id: randomUUID(),
          deviceId,
          deviceName: deviceInfo?.deviceName || 'unknown',
          deviceType: deviceInfo?.deviceType || 'unknown',
          brand: deviceInfo?.brand || 'unknown',
          modelName: deviceInfo?.modelName || 'unknown',
          osVersion: deviceInfo?.osVersion || 'unknown',
          phoneNumber: normalizedPhone,
          userId: existing.id,
          isVerified: true,
          updatedAt: new Date(),
        },
      });
    }

    if (!user) {
      console.log('User not found:', phoneNumber);
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.devices.length === 0) {
      console.log('No verified device found for user:', { phoneNumber, deviceId });
      // For test phone, try to proceed after auto-verifying in the block above by reloading the device
      if (normalizedPhone !== TEST_BYPASS_PHONE) {
        return res.status(404).json({ message: 'Device not found or not verified for this user' });
      }
    }

    // Reload device record for test bypass or use existing
    let device = user.devices[0];
    if (!device) {
      const verifiedDevice = await prisma.device.findFirst({
        where: {
          userId: user.id,
          deviceId,
          isVerified: true
        }
      });
      if (!verifiedDevice) {
        return res.status(404).json({ message: 'Device not found or not verified for this user' });
      }
      device = verifiedDevice as any;
    }

    if (!user.pin) {
      const token = await generateToken(user.id, device.id);
      return res.status(200).json({
        message: 'PIN setup required',
        token,
        requiresPinSetup: true,
        user: publicUser(user),
      });
    }

    const isValidPin = await bcrypt.compare(pin, user.pin);
    if (!isValidPin) {
      return res.status(401).json({
        message: 'Invalid PIN. Verify your email or phone to set a new PIN.',
        requiresNewPin: true,
        confirmNewPin: true,
      });
    }

    try {
      await assertDeviceLoginAllowed(user, deviceInfo || { deviceId });
    } catch (error) {
      if (error instanceof DeviceLoginError) {
        return res.status(403).json({ message: error.message, code: error.code, accountDeviceLocked: error.code === 'DEVICE_LOCK_VIOLATION' });
      }
      throw error;
    }

    const token = await generateToken(user.id, device.id);
    await recordDeviceLogin(user.id, deviceInfo || { deviceId });

    // Update device last login
    await prisma.device.update({
      where: { id: device.id },
      data: { 
        lastLoginAt: new Date(),
        deviceName: deviceInfo?.deviceName || device.deviceName,
        deviceType: deviceInfo?.deviceType || device.deviceType
      },
    });

    console.log('Login successful for user:', phoneNumber);

    return res.status(200).json({
      message: 'Login successful',
      token,
      requiresPinSetup: false,
      user: publicUser(user),
    });
  } catch (error) {
    console.error('Error in loginWithPin:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const logout = async (req: AuthRequest, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Get user and device info from token
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true, device: true }
    });

    if (!session) {
      return res.status(401).json({ message: 'Invalid session' });
    }

    // Set driver status to offline before logout
    try {
      console.log('🔄 Setting driver status to offline before logout...');
      await driverService.updateDriverStatus(session.user.id, false);
      console.log('✅ Driver status set to offline successfully');
    } catch (error) {
      console.error('⚠️ Error setting driver status to offline:', error);
      // Continue with logout even if driver status update fails
    }

    // Delete the session
    await prisma.session.delete({
      where: { id: session.id }
    });

    // Update device last logout time
    await prisma.device.update({
      where: { id: session.deviceId },
      data: { lastLogoutAt: new Date() }
    });

    console.log('User logged out successfully:', {
      userId: session.user.id,
      deviceId: session.deviceId
    });

    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Error in logout:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const testSMS = async (req: Request, res: Response) => {
  try {
    console.log('Received SMS test request:', {
      body: req.body,
      headers: req.headers,
      method: req.method,
      path: req.path
    });

    const { to, message } = req.body;

    if (!to || !message) {
      console.log('Missing required fields:', { to, message });
      return res.status(400).json({ message: 'Phone number and message are required' });
    }

    console.log('Sending test SMS to:', to);
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    });

    console.log('SMS sent successfully:', result.sid);
    return res.status(200).json({ 
      message: 'SMS sent successfully',
      sid: result.sid
    });
  } catch (error) {
    console.error('Error sending test SMS:', error);
    return res.status(500).json({ 
      message: 'Failed to send SMS',
      error: error.message 
    });
  }
};

export const resendOTP = async (req: Request, res: Response) => {
  try {
    const { method, email, phoneNumber, channel } = resolveAuthMethod(req.body);
    const identifier = method === 'email' ? email : phoneNumber;
    if (!identifier) {
      return res.status(400).json({ message: method === 'email' ? 'Email is required' : 'Phone number is required' });
    }

    await createOTP(identifier, 'VERIFICATION', { channel, context: 'resendOTP' });

    return res.status(200).json({
      message: 'OTP sent successfully'
    });
  } catch (error) {
    console.error('Error in resendOTP:', error);
    if (error instanceof Error && error.message.includes('Too many')) {
      return res.status(429).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const changePin = async (req: AuthRequest, res: Response) => {
  try {
    const { currentPin, newPin } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Validate PIN format
    if (!newPin || !/^\d{4}$/.test(newPin)) {
      return res.status(400).json({ message: 'New PIN must be 4 digits' });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.pin) {
      return res.status(400).json({ message: 'No PIN is set. Use set-pin instead.' });
    }

    const isValidPin = await bcrypt.compare(currentPin, user.pin);
    if (!isValidPin) {
      return res.status(401).json({ message: 'Current PIN is incorrect' });
    }

    // Hash new PIN
    const hashedNewPin = await bcrypt.hash(newPin, 10);

    // Update PIN
    await prisma.user.update({
      where: { id: userId },
      data: { pin: hashedNewPin }
    });

    console.log('PIN changed successfully for user:', userId);

    return res.status(200).json({ message: 'PIN changed successfully' });
  } catch (error) {
    console.error('Error in changePin:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const requestNewPin = async (req: Request, res: Response) => {
  try {
    const { deviceId, deviceInfo } = req.body;
    const { method, email, phoneNumber, channel } = resolveAuthMethod(req.body);
    const identifier = method === 'email' ? email : phoneNumber;

    if (!identifier || !deviceId || !deviceInfo) {
      return res.status(400).json({ message: 'Identifier, device ID, and device info are required' });
    }

    const user = await prisma.user.findFirst({
      where: {
        NOT: { status: ACCOUNT_STATUS_TERMINATED } as any,
        OR: [
          phoneNumber ? { phoneNumber } : undefined,
          email ? { email } : undefined,
        ].filter(Boolean) as any,
      },
      include: {
        devices: {
          where: {
            deviceId,
            isVerified: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!user || user.devices.length === 0) {
      return res.status(404).json({ message: 'User or verified device not found' });
    }

    const device = user.devices[0];
    await createOTP(identifier, 'VERIFICATION', {
      channel,
      userId: user.id,
      deviceId: device.id,
      deviceInfo,
      context: 'requestNewPin',
    });

    return res.status(200).json({
      message: method === 'email'
        ? 'A verification code has been sent to your email. Enter it to set a new PIN.'
        : 'A verification code has been sent to your phone. Enter it to set a new PIN.',
      requiresOtp: true,
      requiresPinSetup: true,
    });
  } catch (error) {
    console.error('Error in requestNewPin:', error);
    if (error instanceof Error && error.message.includes('Too many')) {
      return res.status(429).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const completePinReset = async (req: AuthRequest, res: Response) => {
  try {
    const { newPin, pinResetOTPId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!newPin || !pinResetOTPId) {
      return res.status(400).json({ message: 'New PIN and OTP ID are required' });
    }

    // Validate PIN format
    if (!/^\d{4}$/.test(newPin)) {
      return res.status(400).json({ message: 'PIN must be 4 digits' });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const pinResetOTP = await prisma.oTP.findFirst({
      where: {
        id: pinResetOTPId,
        identifier: { in: [user.phoneNumber || '', user.email || ''].filter(Boolean) },
        type: { in: ['PIN_RESET', 'VERIFICATION'] },
        isUsed: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!pinResetOTP) {
      return res.status(400).json({ message: 'Invalid or expired PIN reset OTP' });
    }

    // Hash new PIN
    const hashedNewPin = await bcrypt.hash(newPin, 10);

    // Update user's PIN and mark OTP as used in a transaction
    await prisma.$transaction([
      // Update user's PIN
      prisma.user.update({
        where: { id: userId },
        data: { pin: hashedNewPin }
      }),
      // Mark OTP as used
      prisma.oTP.update({
        where: { id: pinResetOTPId },
        data: { isUsed: true }
      })
    ]);

    console.log('PIN reset completed successfully for user:', userId);

    return res.status(200).json({ 
      message: 'PIN reset completed successfully',
      success: true
    });
  } catch (error) {
    console.error('Error in completePinReset:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const setPin = async (req: AuthRequest, res: Response) => {
  try {
    const { newPin } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    if (!newPin || !/^\d{4}$/.test(newPin)) {
      return res.status(400).json({ message: 'PIN must be 4 digits' });
    }

    const hashedNewPin = await bcrypt.hash(newPin, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { pin: hashedNewPin },
    });

    return res.status(200).json({ message: 'PIN set successfully', success: true });
  } catch (error) {
    console.error('Error in setPin:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateDeviceLock = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const deviceId = req.user?.deviceId;
    const enabled = Boolean(req.body.enabled);

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const device = deviceId
      ? await prisma.device.findFirst({ where: { id: deviceId, userId } })
      : null;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        deviceLockEnabled: enabled,
        lockedDeviceId: enabled ? (device?.id || undefined) : null,
      },
    });

    return res.status(200).json({
      message: enabled ? 'This account is now locked to this device.' : 'Device lock turned off.',
      deviceLockEnabled: updated.deviceLockEnabled,
      lockedDeviceId: updated.lockedDeviceId,
    });
  } catch (error) {
    console.error('Error in updateDeviceLock:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Check if user exists (for web app)
export const checkUserExists = async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    const normalizedPhone = normalizePhone(phoneNumber);
    console.log('Checking if user exists for:', normalizedPhone);

    // Check if user exists
    const user = await prisma.user.findFirst({
      where: { phoneNumber: normalizedPhone, NOT: { status: ACCOUNT_STATUS_TERMINATED } as any },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!user) {
      return res.status(404).json({ 
        exists: false, 
        isRegistered: false,
        message: 'User not found. Please register using the mobile app first.'
      });
    }

    // Check if user has completed registration
    const isRegistered = Boolean(
      user.firstName && 
      user.lastName && 
      user.firstName.trim() !== '' && 
      user.lastName.trim() !== ''
    );

    console.log('User check result:', { 
      exists: true, 
      isRegistered,
      hasName: isRegistered 
    });

    return res.status(200).json({
      exists: true,
      isRegistered,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber
      }
    });
  } catch (error) {
    console.error('Error in checkUserExists:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Login with PIN for web app (no device info required)
export const loginWithPinWeb = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, pin } = req.body;

    console.log('Web PIN login attempt:', { phoneNumber });

    // Validate PIN format
    if (!pin || !/^\d{4}$/.test(pin)) {
      console.log('Invalid PIN format:', pin);
      return res.status(400).json({ message: 'PIN must be 4 digits' });
    }

    if (!phoneNumber) {
      console.log('Missing phoneNumber in request');
      return res.status(400).json({ message: 'Phone number is required' });
    }

    // Normalize phone number for consistent lookup (align with mobile flow)
    const normalizedPhone = normalizePhone(phoneNumber);

    // Find the user by phone number (prefer the most recent record if duplicates exist)
    const user = await prisma.user.findFirst({
      where: { phoneNumber: normalizedPhone },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        email: true,
        pin: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!user) {
      console.log('User not found for phone number:', normalizedPhone);
      return res.status(404).json({ 
        message: 'User not found. Please register using the mobile app first.' 
      });
    }

    // Check if user has completed registration
    const isRegistered = Boolean(
      user.firstName && 
      user.lastName && 
      user.firstName.trim() !== '' && 
      user.lastName.trim() !== ''
    );

    if (!isRegistered) {
      console.log('User not fully registered:', phoneNumber);
      return res.status(400).json({ 
        message: 'Please complete your registration using the mobile app first.' 
      });
    }

    if (!user.pin) {
      return res.status(400).json({ message: 'PIN is not set. Complete PIN setup in the mobile app.' });
    }

    const isPinValid = await bcrypt.compare(pin, user.pin);
    if (!isPinValid) {
      console.log('Invalid PIN for user:', phoneNumber);
      return res.status(401).json({ message: 'Invalid PIN' });
    }

    // Generate JWT token for web (no device tracking)
    const token = generateWebToken(user.id, user.phoneNumber || user.email || '');

    console.log('Web login successful for user:', user.id);

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber
      }
    });
  } catch (error) {
    console.error('Error in loginWithPinWeb:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}; 