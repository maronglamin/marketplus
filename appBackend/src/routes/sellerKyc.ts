import { Router, Request } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Extend Express Request type to include user
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
  };
}

// Get KYC status
router.get('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      logger.error('No user ID in request');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    logger.info('Fetching KYC status for user:', { userId });

    const kyc = await prisma.sellerKyc.findFirst({
      where: { userId }
    });

    if (!kyc) {
      logger.info('No KYC found for user:', { userId });
      return res.status(404).json({ error: 'KYC not found' });
    }

    logger.info('KYC found:', { 
      userId,
      status: kyc.status,
      hasRejectionReason: !!kyc.rejectionReason,
      hasBusinessName: !!kyc.businessName
    });

    res.json(kyc);
  } catch (error) {
    logger.error('Error fetching KYC status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit KYC
router.post('/submit', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      logger.error('No user ID in request');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    logger.info('Submitting KYC for user:', { userId });

    const {
      businessName,
      businessType,
      registrationNumber,
      taxId,
      address,
      city,
      state,
      countries,
      postalCode,
      documentType,
      documentNumber,
      documentUrl,
      documentExpiryDate
    } = req.body;

    // Convert MM/DD/YYYY to Date object
    const expiryDate = documentExpiryDate ? new Date(documentExpiryDate) : null;

    // Check if KYC already exists
    const existingKyc = await prisma.sellerKyc.findFirst({
      where: { userId }
    });

    let kyc;
    if (existingKyc) {
      logger.info('Updating existing KYC:', { userId, existingId: existingKyc.id });
      // Update existing KYC
      kyc = await prisma.sellerKyc.update({
        where: { id: existingKyc.id },
        data: {
          businessName,
          businessType,
          registrationNumber,
          taxId,
          address,
          city,
          state,
          country: countries,
          postalCode,
          documentType,
          documentNumber,
          documentUrl,
          documentExpiryDate: expiryDate,
          status: 'PENDING'
        }
      });
    } else {
      logger.info('Creating new KYC:', { userId });
      // Create new KYC
      kyc = await prisma.sellerKyc.create({
        data: {
          userId,
          businessName,
          businessType,
          registrationNumber,
          taxId,
          address,
          city,
          state,
          country: countries,
          postalCode,
          documentType,
          documentNumber,
          documentUrl,
          documentExpiryDate: expiryDate,
          status: 'PENDING'
        }
      });
    }

    logger.info('KYC submission successful:', { 
      userId,
      kycId: kyc.id,
      status: kyc.status
    });

    res.json(kyc);
  } catch (error) {
    logger.error('Error submitting KYC:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 