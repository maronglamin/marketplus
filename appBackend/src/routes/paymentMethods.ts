import express from 'express';
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Extend Express Request to include user
interface AuthenticatedRequest extends express.Request {
  user?: {
    id: string;
    phoneNumber: string;
  };
}

// Get user's payment methods
router.get('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const paymentMethods = await prisma.paymentMethod.findMany({
      where: {
        userId: userId,
        status: 'ACTIVE'
      },
      orderBy: {
        isDefault: 'desc',
        createdAt: 'desc'
      }
    });

    logger.info('Payment methods fetched:', {
      userId,
      count: paymentMethods.length
    });

    res.json({
      paymentMethods: paymentMethods.map(method => ({
        id: method.id,
        type: method.type,
        provider: method.provider,
        accountName: method.accountName,
        isDefault: method.isDefault,
        status: method.status,
        createdAt: method.createdAt
      }))
    });

  } catch (error) {
    logger.error('Error fetching payment methods:', error);
    res.status(500).json({
      message: 'Failed to fetch payment methods',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 