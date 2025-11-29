import express from 'express';
import { logger } from '../utils/logger';
import { authenticate, AuthRequest } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  logger.info('Users test route hit');
  res.json({ message: 'Users routes working!' });
});

// Get current user information
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        phoneNumber: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    logger.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get comprehensive user profile with sellerKyc and driver status
router.get('/profile', authenticate, async (req: AuthRequest, res) => {
  try {
    logger.info('🔍 User profile endpoint called');
    
    if (!req.user) {
      logger.error('❌ No user in request');
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userId = req.user.id;
    logger.info('👤 Fetching profile for user:', userId);

    // Get user basic info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        phoneNumber: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      logger.error('❌ User not found:', userId);
      return res.status(404).json({ error: 'User not found' });
    }

    logger.info('✅ User found:', { 
      id: user.id, 
      firstName: user.firstName, 
      lastName: user.lastName,
      phoneNumber: user.phoneNumber 
    });

    // Get sellerKyc status
    const sellerKyc = await prisma.sellerKyc.findUnique({
      where: { userId },
      select: {
        id: true,
        status: true,
        businessName: true,
        businessType: true,
        verifiedAt: true,
        rejectionReason: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (sellerKyc) {
      logger.info('🏪 Seller KYC found:', { status: sellerKyc.status, businessName: sellerKyc.businessName });
    } else {
      logger.info('🏪 No Seller KYC found for user');
    }

    // Get driver status
    const driver = await prisma.driver.findUnique({
      where: { userId },
      select: {
        id: true,
        driverId: true,
        isOnline: true,
        status: true,
        isVerified: true,
        isActive: true,
        totalRides: true,
        totalEarnings: true,
        rating: true,
        ratingCount: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (driver) {
      logger.info('🚗 Driver found:', { 
        driverId: driver.driverId, 
        status: driver.status, 
        isOnline: driver.isOnline,
        isVerified: driver.isVerified 
      });
    } else {
      logger.info('🚗 No driver record found for user');
    }

    // Determine account type and status
    let accountType = 'User';
    let accountStatus = 'Active';
    let verificationStatus = 'Unverified';

    if (sellerKyc) {
      accountType = 'Seller';
      if (sellerKyc.status === 'APPROVED') {
        verificationStatus = 'Verified Seller';
      } else if (sellerKyc.status === 'PENDING') {
        verificationStatus = 'Seller KYC Pending';
      } else if (sellerKyc.status === 'REJECTED') {
        verificationStatus = 'Seller KYC Rejected';
      }
    }

    if (driver) {
      if (accountType === 'Seller') {
        accountType = 'Seller & Driver';
      } else {
        accountType = 'Driver';
      }
      
      if (driver.isVerified) {
        verificationStatus = 'Verified Driver';
      } else if (verificationStatus === 'Verified Seller') {
        verificationStatus = 'Verified Seller & Driver';
      }
    }

    logger.info('📊 Account info determined:', { accountType, verificationStatus });

    // Build response
    const response = {
      user: {
        id: user.id,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}`.trim(),
        phoneNumber: user.phoneNumber,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      accountInfo: {
        type: accountType,
        status: accountStatus,
        verificationStatus: verificationStatus,
        isSeller: !!sellerKyc,
        isDriver: !!driver,
        sellerKycStatus: sellerKyc?.status || null,
        driverStatus: driver?.status || null,
        driverIsOnline: driver?.isOnline || false
      },
      sellerKyc: sellerKyc ? {
        id: sellerKyc.id,
        status: sellerKyc.status,
        businessName: sellerKyc.businessName,
        businessType: sellerKyc.businessType,
        verifiedAt: sellerKyc.verifiedAt,
        rejectionReason: sellerKyc.rejectionReason,
        createdAt: sellerKyc.createdAt,
        updatedAt: sellerKyc.updatedAt
      } : null,
      driver: driver ? {
        id: driver.id,
        driverId: driver.driverId,
        isOnline: driver.isOnline,
        status: driver.status,
        isVerified: driver.isVerified,
        isActive: driver.isActive,
        totalRides: driver.totalRides,
        totalEarnings: driver.totalEarnings,
        rating: driver.rating,
        ratingCount: driver.ratingCount,
        createdAt: driver.createdAt,
        updatedAt: driver.updatedAt
      } : null
    };

    logger.info('✅ Sending profile response:', { 
      fullName: response.user.fullName,
      accountType: response.accountInfo.type,
      verificationStatus: response.accountInfo.verificationStatus
    });

    res.json(response);
  } catch (error) {
    logger.error('❌ Error fetching user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 