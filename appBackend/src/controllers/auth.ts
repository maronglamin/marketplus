import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createOTP, verifyOTP } from '../utils/otp';
import { generateToken, generateWebToken } from '../utils/jwt';
import twilio from 'twilio';
import { driverService } from '../services/driverService';
import { randomUUID } from 'crypto';

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

// Helper function to create/update device
const upsertDevice = async (userId: string, deviceInfo: any) => {
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
      phoneNumber: deviceInfo.phoneNumber,
      lastLoginAt: new Date(),
    },
    create: {
      id: randomUUID(),
      deviceId: deviceInfo.deviceId,
      deviceName: deviceInfo.deviceName,
      deviceType: deviceInfo.deviceType,
      brand: deviceInfo.brand || 'unknown',
      modelName: deviceInfo.modelName || 'unknown',
      osVersion: deviceInfo.osVersion || 'unknown',
      phoneNumber: deviceInfo.phoneNumber,
      userId,
      isVerified: false,
      updatedAt: new Date(),
    },
  });
};

export const initiateLogin = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, deviceInfo } = req.body;

    if (!phoneNumber || !deviceInfo) {
      console.log('Missing required fields:', { phoneNumber, deviceInfo });
      return res.status(400).json({ message: 'Phone number and device info are required' });
    }

    const normalizedPhone = normalizePhone(phoneNumber);
    console.log('Initiating login for:', { phoneNumber, deviceInfo });

    // Check if any users exist for this phone
    const usersWithPhone = await prisma.user.findMany({
      where: { phoneNumber: normalizedPhone },
      include: { devices: true },
      orderBy: { createdAt: 'desc' }
    });
    // Prefer any non-terminated user; otherwise treat as new user
    const user = usersWithPhone.find(u => (u.status as any) !== ACCOUNT_STATUS_TERMINATED) || null;

    // Blocked status check
    if (user && user.status === 'BLOCKED') {
      console.log('Blocked user attempted login:', { userId: user.id, phoneNumber });
      return res.status(401).json({ message: 'Your account is blocked. Please contact support.' });
    }

    // Terminated users should be treated like new users (OTP + registration) and MUST NOT go to PIN login
    const isTerminated = !!(user && (user.status as any) === ACCOUNT_STATUS_TERMINATED);

    console.log('User lookup result:', user ? {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      hasDevices: user.devices.length
    } : 'New user');

    let tempPin: string | null = null;

    // Test-only bypass: auto-verify any device for the configured phone
    if (normalizedPhone === TEST_BYPASS_PHONE) {
      if (user) {
        const isRegistered = Boolean(
          user.firstName &&
          user.lastName &&
          user.firstName.trim() !== '' &&
          user.lastName.trim() !== ''
        );

        // Mark all existing devices for this user/phone as verified
        await prisma.device.updateMany({
          where: {
            OR: [
              { userId: user.id },
              { phoneNumber: normalizedPhone }
            ]
          },
          data: { isVerified: true, lastLoginAt: new Date() }
        });

        // Upsert current device as verified
        const device = await prisma.device.upsert({
          where: {
            userId_deviceId: {
              userId: user.id,
              deviceId: deviceInfo.deviceId,
            },
          },
          update: {
            deviceName: deviceInfo.deviceName,
            deviceType: deviceInfo.deviceType,
            brand: deviceInfo.brand || 'unknown',
            modelName: deviceInfo.modelName || 'unknown',
            osVersion: deviceInfo.osVersion || 'unknown',
            phoneNumber: normalizedPhone,
            isVerified: true,
            lastLoginAt: new Date(),
          },
          create: {
            id: randomUUID(),
            deviceId: deviceInfo.deviceId,
            deviceName: deviceInfo.deviceName,
            deviceType: deviceInfo.deviceType,
            brand: deviceInfo.brand || 'unknown',
            modelName: deviceInfo.modelName || 'unknown',
            osVersion: deviceInfo.osVersion || 'unknown',
            phoneNumber: normalizedPhone,
            userId: user.id,
            isVerified: true,
            updatedAt: new Date(),
          },
        });
        console.log('Test bypass: device auto-verified', { deviceId: device.id });

        return res.status(200).json({
          message: 'Device verified',
          requiresPin: true,
          isNewUser: false,
          isRegistered,
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            phoneNumber: user.phoneNumber
          }
        });
      } else {
        // New user path with bypass: create user, auto-verify device, and send PIN
        const newPin = await createOTP(normalizedPhone, 'PIN_RESET', { context: 'initiateLogin:bypass_send_pin' });
        const hashedPin = await bcrypt.hash(newPin, 10);

        const createdUser = await prisma.user.create({
          data: {
            id: randomUUID(),
            phoneNumber: normalizedPhone,
            firstName: '',
            lastName: '',
            pin: hashedPin,
            updatedAt: new Date(),
            devices: {
              create: {
                id: randomUUID(),
                deviceId: deviceInfo.deviceId,
                deviceName: deviceInfo.deviceName,
                deviceType: deviceInfo.deviceType,
                brand: deviceInfo.brand || 'unknown',
                modelName: deviceInfo.modelName || 'unknown',
                osVersion: deviceInfo.osVersion || 'unknown',
                phoneNumber: normalizedPhone,
                isVerified: true,
                updatedAt: new Date(),
              },
            },
          },
          include: { devices: true }
        });

        // Ensure any future/old devices tied by phone are marked verified too
        await prisma.device.updateMany({
          where: { phoneNumber: normalizedPhone },
          data: { isVerified: true }
        });

        console.log('Test bypass: created user and auto-verified device');
        return res.status(200).json({
          message: 'Device verified',
          requiresPin: true,
          isNewUser: true,
          isRegistered: false,
          user: {
            id: createdUser.id,
            firstName: createdUser.firstName,
            lastName: createdUser.lastName,
            phoneNumber: createdUser.phoneNumber
          }
        });
      }
    }

    if (user) {
      // Check if user has completed registration
      const isRegistered = Boolean(
        user.firstName && 
        user.lastName && 
        user.firstName.trim() !== '' && 
        user.lastName.trim() !== ''
      );

      // Check if device is already verified
      const existingDevice = user.devices.find(d => d.deviceId === deviceInfo.deviceId);
      console.log('Device verification status:', existingDevice ? 
        (existingDevice.isVerified ? 'Verified' : 'Not verified') : 
        'New device');
      
      if (existingDevice && existingDevice.isVerified && !isTerminated) {
        console.log('Device already verified, proceeding to PIN login');
        return res.status(200).json({
          message: 'Device verified',
          requiresPin: true,
          isNewUser: false,
          isRegistered,
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            phoneNumber: user.phoneNumber
          }
        });
      }

      // Device exists but not verified - update device info
      console.log('Updating device info for existing user');
      await upsertDevice(user.id, { ...deviceInfo, phoneNumber });
    } else {
      console.log('Creating new user with device');
      // Generate temporary PIN for new user (do not send yet)
      tempPin = await createOTP(phoneNumber, 'PIN_RESET', { skipSending: true, context: 'initiateLogin:new_user:pin' });
      const hashedPin = await bcrypt.hash(tempPin, 10);

      // Create new user with unverified device
      await prisma.user.create({
        data: {
          id: randomUUID(),
          phoneNumber,
          firstName: '', // Will be updated during registration
          lastName: '',  // Will be updated during registration
          pin: hashedPin,
          updatedAt: new Date(),
          devices: {
            create: {
              id: randomUUID(),
              deviceId: deviceInfo.deviceId,
              deviceName: deviceInfo.deviceName,
              deviceType: deviceInfo.deviceType,
              brand: deviceInfo.brand,
              modelName: deviceInfo.modelName,
              osVersion: deviceInfo.osVersion,
              phoneNumber,
              isVerified: false,
              updatedAt: new Date(),
            },
          },
        },
      });
    }

    // Determine if this is a first-time user (needs to set PIN)
    const isFirstTime = !user;

    // Generate codes according to the scenario
    console.log('Generating verification OTP');

    if (isFirstTime) {
      // For first-time users, we already created the user above
      // Get the newly created user to get the device info
      const newUser = await prisma.user.findUnique({
        where: { phoneNumber: normalizedPhone },
        include: { devices: true }
      });
      
      if (newUser) {
        const device = newUser.devices[0];
        
        // Generate verification OTP for new user and send combined SMS with PIN
        await createOTP(phoneNumber, 'VERIFICATION', {
          userId: newUser.id,
          deviceId: device.id,
          deviceInfo,
          context: 'initiateLogin:new_user:combined',
          sendCombined: true,
          includeVerificationCode: tempPin!,
        });
        console.log('Sent verification OTP for new user');
      }
    } else {
      // Existing user - get or create device to get the database ID
      const device = await upsertDevice(user!.id, { ...deviceInfo, phoneNumber: normalizedPhone });
      
      // Only send verification OTP
      await createOTP(normalizedPhone, 'VERIFICATION', { 
        userId: user!.id, 
        deviceId: device.id, 
        deviceInfo, 
        context: 'initiateLogin:existing_user' 
      });
      console.log('Sent verification OTP for existing user');
    }

    // Note: createOTP handles sending. For first-time users, combined message is already sent above.
    
    return res.status(200).json({
      message: 'OTP sent successfully',
      requiresPin: false,
      isNewUser: !user || isTerminated,
      isRegistered: isTerminated ? false : user ? Boolean(
        user.firstName && 
        user.lastName && 
        user.firstName.trim() !== '' && 
        user.lastName.trim() !== ''
      ) : false,
      user: user ? {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber
      } : undefined
    });
  } catch (error) {
    console.error('Error in initiateLogin:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const verifyOTPAndRegister = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, code, deviceInfo } = req.body;

    if (!phoneNumber || !code || !deviceInfo) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const normalizedPhone = normalizePhone(phoneNumber);
    // Test-only bypass: accept any OTP for the test phone
    const isValid = normalizedPhone === TEST_BYPASS_PHONE
      ? true
      : await verifyOTP(normalizedPhone, code, 'VERIFICATION');
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    let user = await prisma.user.findFirst({
      where: { phoneNumber: normalizedPhone },
      include: { devices: true },
      orderBy: { createdAt: 'desc' }
    });
    // If multiple users exist and the latest is terminated while an older active exists, prefer the active
    if ((user?.status as any) === ACCOUNT_STATUS_TERMINATED) {
      const active = await prisma.user.findFirst({
        where: { phoneNumber: normalizedPhone, NOT: { status: ACCOUNT_STATUS_TERMINATED } as any },
        include: { devices: true },
        orderBy: { createdAt: 'desc' }
      });
      if (active) user = active;
    }

    if (!user) {
      // New user, return success but don't create user yet
      return res.status(200).json({
        message: 'OTP verified successfully',
        isNewUser: true,
        requiresRegistration: true
      });
    }

    // Test-only: mark all devices for this user/phone as verified
    if (normalizedPhone === TEST_BYPASS_PHONE) {
      await prisma.device.updateMany({
        where: {
          OR: [
            { userId: user.id },
            { phoneNumber: normalizedPhone }
          ]
        },
        data: { isVerified: true, lastLoginAt: new Date() }
      });
    }

    // Existing user, verify device
    const device = await prisma.device.upsert({
      where: {
        userId_deviceId: {
          userId: user.id,
          deviceId: deviceInfo.deviceId,
        },
      },
      update: {
        deviceName: deviceInfo.deviceName,
        deviceType: deviceInfo.deviceType,
        brand: deviceInfo.brand || 'unknown',
        modelName: deviceInfo.modelName || 'unknown',
        osVersion: deviceInfo.osVersion || 'unknown',
        phoneNumber: normalizedPhone,
        isVerified: true,
        lastLoginAt: new Date(),
      },
      create: {
        id: randomUUID(),
        deviceId: deviceInfo.deviceId,
        deviceName: deviceInfo.deviceName,
        deviceType: deviceInfo.deviceType,
        brand: deviceInfo.brand || 'unknown',
        modelName: deviceInfo.modelName || 'unknown',
        osVersion: deviceInfo.osVersion || 'unknown',
        phoneNumber: normalizedPhone,
        userId: user.id,
        isVerified: true,
        updatedAt: new Date(),
      },
    });

    // Generate token for the verified device
    const token = await generateToken(user.id, device.id);

    // Always generate a PIN_RESET OTP after verification to force PIN reset
    try {
      await createOTP(normalizedPhone, 'PIN_RESET', { 
        userId: user.id,
        deviceId: device.id, 
        deviceInfo, 
        context: 'verifyOTPAndRegister:force_pin_reset' 
      });
    } catch (e) {
      console.error('Error creating PIN_RESET OTP after verification:', e);
    }

    // Fetch most recent unused PIN_RESET OTP to get its id
    const pinResetOTP = await prisma.oTP.findFirst({
      where: {
        phoneNumber: normalizedPhone,
        type: 'PIN_RESET',
        isUsed: false,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({
      message: 'OTP verified successfully',
      token,
      isNewUser: false,
      requiresPin: true,
      requiresPinReset: true,
      pinResetOTPId: pinResetOTP?.id,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber
      }
    });
  } catch (error) {
    console.error('Error in verifyOTPAndRegister:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const registerUser = async (req: Request, res: Response) => {
  try {
    const {
      phoneNumber,
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

    console.log('Registration request received:', {
      phoneNumber: normalizedPhone,
      firstName,
      lastName,
      middleName
    });

    // Check if user already exists (prefer the most recent record for this phone)
    const existingUser = await prisma.user.findFirst({
      where: { phoneNumber: normalizedPhone },
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
        // Ensure stored phone remains normalized (no change if already set)
        phoneNumber: existingUser.phoneNumber || normalizedPhone,
        // Reactivate if previously terminated
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
      user: {
        id: updatedUser.id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phoneNumber: updatedUser.phoneNumber
      }
    });
  } catch (error) {
    console.error('Error in registerUser:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const loginWithPin = async (req: Request, res: Response) => {
  try {
    const { deviceId, pin, deviceInfo, phoneNumber } = req.body;

    console.log('Login attempt:', { deviceId, deviceInfo, phoneNumber });

    // Validate PIN format
    if (!pin || !/^\d{4}$/.test(pin)) {
      console.log('Invalid PIN format:', pin);
      return res.status(400).json({ message: 'PIN must be 4 digits' });
    }

    if (!phoneNumber) {
      console.log('Missing phoneNumber in request');
      return res.status(400).json({ message: 'Phone number is required' });
    }

    const normalizedPhone = normalizePhone(phoneNumber);

    // First find the user by phone number (prefer non-TERMINATED, newest)
    let user = await prisma.user.findFirst({
      where: { phoneNumber: normalizedPhone, NOT: { status: ACCOUNT_STATUS_TERMINATED } as any },
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

    // Compare PIN with stored hashed PIN
    const isValidPin = await bcrypt.compare(pin, user.pin);
    if (!isValidPin) {
      console.log('Invalid PIN attempt for user:', phoneNumber);
      return res.status(401).json({ 
        message: 'Invalid PIN. Would you like to receive a new PIN?',
        requiresNewPin: true,
        confirmNewPin: true
      });
    }

    // Check if there's an unused PIN_RESET OTP for this user
    const pinResetOTP = await prisma.oTP.findFirst({
      where: {
        phoneNumber,
        type: 'PIN_RESET',
        isUsed: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Generate token
    const token = await generateToken(user.id, device.id);
    console.log('Generated token for PIN login:', token);

    // If there's an unused PIN_RESET OTP, force PIN reset flow
    if (pinResetOTP) {
      console.log('PIN_RESET OTP found for user, forcing PIN reset:', phoneNumber);
      
      return res.status(200).json({
        message: 'PIN reset required',
        token,
        requiresPinReset: true,
        pinResetOTPId: pinResetOTP.id,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
        },
      });
    }

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
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
      },
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
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    console.log('Resending OTP to:', phoneNumber);

    // Generate and send OTP (sending handled inside createOTP and logged)
    await createOTP(phoneNumber, 'VERIFICATION', { context: 'resendOTP' });
    console.log('OTP generated and sent for:', phoneNumber);

    return res.status(200).json({
      message: 'OTP sent successfully'
    });
  } catch (error) {
    console.error('Error in resendOTP:', error);
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

    // Verify current PIN
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
    const { phoneNumber, deviceId, deviceInfo } = req.body;

    if (!phoneNumber || !deviceId || !deviceInfo) {
      return res.status(400).json({ message: 'Phone number, device ID, and device info are required' });
    }

    console.log('Requesting new PIN for:', { phoneNumber, deviceId });

    // Find user and verify device
    const user = await prisma.user.findUnique({
      where: { phoneNumber },
      include: {
        devices: {
          where: {
            deviceId,
            isVerified: true
          }
        }
      }
    });

    if (!user || user.devices.length === 0) {
      return res.status(404).json({ message: 'User or verified device not found' });
    }

    // Generate new PIN
    const device = user.devices[0]; // We know there's at least one device from the query above
    const newPin = await createOTP(phoneNumber, 'PIN_RESET', { 
      userId: user.id,
      deviceId: device.id, 
      deviceInfo, 
      context: 'requestNewPin' 
    });
    const hashedNewPin = await bcrypt.hash(newPin, 10);
    
    // Update user's PIN
    await prisma.user.update({
      where: { id: user.id },
      data: { pin: hashedNewPin }
    });

    // Note: createOTP already sends the PIN SMS

    return res.status(200).json({
      message: 'New PIN has been sent to your phone.',
      requiresNewPin: true
    });
  } catch (error) {
    console.error('Error in requestNewPin:', error);
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

    // Verify the PIN_RESET OTP exists and is unused
    const pinResetOTP = await prisma.oTP.findFirst({
      where: {
        id: pinResetOTPId,
        phoneNumber: user.phoneNumber,
        type: 'PIN_RESET',
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

    // Verify PIN
    const isPinValid = await bcrypt.compare(pin, user.pin);
    if (!isPinValid) {
      console.log('Invalid PIN for user:', phoneNumber);
      return res.status(401).json({ message: 'Invalid PIN' });
    }

    // Generate JWT token for web (no device tracking)
    const token = generateWebToken(user.id, user.phoneNumber);

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