import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createOTP, verifyOTP } from '../utils/otp';
import { generateToken } from '../utils/jwt';
import { sendOTP, sendPIN } from '../services/sms';
import twilio from 'twilio';

const prisma = new PrismaClient();

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
      deviceId: deviceInfo.deviceId,
      deviceName: deviceInfo.deviceName,
      deviceType: deviceInfo.deviceType,
      brand: deviceInfo.brand || 'unknown',
      modelName: deviceInfo.modelName || 'unknown',
      osVersion: deviceInfo.osVersion || 'unknown',
      phoneNumber: deviceInfo.phoneNumber,
      userId,
      isVerified: false,
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

    console.log('Initiating login for:', { phoneNumber, deviceInfo });

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { phoneNumber },
      include: { devices: true }
    });

    console.log('User lookup result:', user ? {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      hasDevices: user.devices.length
    } : 'New user');

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
      
      if (existingDevice && existingDevice.isVerified) {
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
      // Generate temporary PIN for new user
      const tempPin = await createOTP(phoneNumber, 'PIN_RESET');
      const hashedPin = await bcrypt.hash(tempPin, 10);

      // Create new user with unverified device
      await prisma.user.create({
        data: {
          phoneNumber,
          firstName: '', // Will be updated during registration
          lastName: '',  // Will be updated during registration
          pin: hashedPin,
          devices: {
            create: {
              deviceId: deviceInfo.deviceId,
              deviceName: deviceInfo.deviceName,
              deviceType: deviceInfo.deviceType,
              brand: deviceInfo.brand,
              modelName: deviceInfo.modelName,
              osVersion: deviceInfo.osVersion,
              phoneNumber,
              isVerified: false,
            },
          },
        },
      });
    }

    // Generate and store OTP
    console.log('Generating verification OTP');
    const otp = await createOTP(phoneNumber, 'VERIFICATION');
    console.log('OTP generated for:', phoneNumber);

    // Send OTP via SMS
    try {
      console.log('Attempting to send OTP via SMS');
      await sendOTP(phoneNumber, otp);
      console.log('OTP sent successfully to:', phoneNumber);
    } catch (smsError) {
      console.error('Failed to send OTP:', smsError);
      // In development, log the OTP
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV] Verification OTP for ${phoneNumber}: ${otp}`);
      }
    }
    
    return res.status(200).json({
      message: 'OTP sent successfully',
      requiresPin: false,
      isNewUser: !user,
      isRegistered: user ? Boolean(
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

    const isValid = await verifyOTP(phoneNumber, code, 'VERIFICATION');
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const user = await prisma.user.findUnique({
      where: { phoneNumber },
      include: { devices: true }
    });

    if (!user) {
      // New user, return success but don't create user yet
      return res.status(200).json({
        message: 'OTP verified successfully',
        isNewUser: true,
        requiresRegistration: true
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
        phoneNumber: phoneNumber,
        isVerified: true,
        lastLoginAt: new Date(),
      },
      create: {
        deviceId: deviceInfo.deviceId,
        deviceName: deviceInfo.deviceName,
        deviceType: deviceInfo.deviceType,
        brand: deviceInfo.brand || 'unknown',
        modelName: deviceInfo.modelName || 'unknown',
        osVersion: deviceInfo.osVersion || 'unknown',
        phoneNumber: phoneNumber,
        userId: user.id,
        isVerified: true,
      },
    });

    // Generate PIN for first-time login
    const pin = await createOTP(phoneNumber, 'PIN_RESET');
    const hashedPin = await bcrypt.hash(pin, 10);

    // Update user's PIN
    await prisma.user.update({
      where: { id: user.id },
      data: { pin: hashedPin }
    });

    // Send PIN via SMS
    try {
      await sendPIN(phoneNumber, pin);
      console.log('PIN sent successfully to:', phoneNumber);
    } catch (smsError) {
      console.error('Failed to send PIN:', smsError);
      // In development, log the PIN
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV] Login PIN for ${phoneNumber}: ${pin}`);
      }
    }

    return res.status(200).json({
      message: 'Device verified successfully. Please use the PIN sent to your phone to login.',
      requiresPin: true,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
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

    console.log('Registration request received:', {
      phoneNumber,
      firstName,
      lastName,
      middleName
    });

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { phoneNumber },
      include: { devices: true }
    });

    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find the verified device
    const verifiedDevice = existingUser.devices.find(d => d.isVerified);
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

    // First find the user by phone number
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

    if (!user) {
      console.log('User not found:', phoneNumber);
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.devices.length === 0) {
      console.log('No verified device found for user:', { phoneNumber, deviceId });
      return res.status(404).json({ message: 'Device not found or not verified for this user' });
    }

    const device = user.devices[0];

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

    // Generate token
    const token = await generateToken(user.id, device.id);
    console.log('Generated token for PIN login:', token);

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
      userId: session.userId,
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

    // Generate and store new OTP
    const otp = await createOTP(phoneNumber, 'VERIFICATION');
    console.log('New OTP generated for:', phoneNumber);

    // Send OTP via SMS
    try {
      await sendOTP(phoneNumber, otp);
      console.log('OTP sent successfully to:', phoneNumber);
    } catch (smsError) {
      console.error('Failed to send OTP:', smsError);
      // In development, log the OTP
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV] Verification OTP for ${phoneNumber}: ${otp}`);
      }
    }

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
    const newPin = await createOTP(phoneNumber, 'PIN_RESET');
    const hashedNewPin = await bcrypt.hash(newPin, 10);
    
    // Update user's PIN
    await prisma.user.update({
      where: { id: user.id },
      data: { pin: hashedNewPin }
    });

    // Send new PIN via SMS
    try {
      await sendPIN(phoneNumber, newPin);
      console.log('New PIN sent successfully to:', phoneNumber);
    } catch (smsError) {
      console.error('Failed to send new PIN:', smsError);
      // In development, log the PIN
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV] New Login PIN for ${phoneNumber}: ${newPin}`);
      }
    }

    return res.status(200).json({
      message: 'New PIN has been sent to your phone.',
      requiresNewPin: true
    });
  } catch (error) {
    console.error('Error in requestNewPin:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}; 