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
    deviceId: string;
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
      orderBy: [
        {
          isDefault: 'desc'
        },
        {
          createdAt: 'desc'
        }
      ]
    });

    logger.info('Payment methods fetched:', {
      userId,
      count: paymentMethods.length
    });

    res.json({
      success: true,
      data: paymentMethods.map(method => ({
        id: method.id,
        type: method.type,
        provider: method.provider,
        accountName: method.accountName,
        accountId: method.accountId,
        isDefault: method.isDefault,
        status: method.status,
        userId: method.userId,
        metadata: method.metadata,
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

// Create a new payment method
router.post('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const { type, provider, accountId, accountName, isDefault, metadata } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Validate required fields
    if (!type || !provider || !accountId || !accountName) {
      return res.status(400).json({
        message: 'Missing required fields: type, provider, accountId, accountName'
      });
    }

    // Duplicate check for same user, same provider + accountId
    const existing = await prisma.paymentMethod.findFirst({
      where: {
        userId,
        provider,
        accountId,
        status: 'ACTIVE'
      }
    });
    if (existing) {
      return res.status(409).json({ message: 'payment method exist' });
    }

    // Validate payment type
    const validTypes = ['BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'MOBILE_MONEY', 'CRYPTO', 'DIGITAL_WALLET'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        message: 'Invalid payment type. Must be one of: ' + validTypes.join(', ')
      });
    }

    // If this is set as default, unset other defaults for this user
    if (isDefault) {
      await prisma.paymentMethod.updateMany({
        where: {
          userId: userId,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      });
    }

    // Create the payment method
    const paymentMethod = await prisma.paymentMethod.create({
      data: {
        userId,
        type,
        provider,
        accountId,
        accountName,
        isDefault: isDefault || false,
        metadata: metadata || {}
      }
    });

    logger.info('Payment method created successfully:', {
      userId,
      paymentMethodId: paymentMethod.id,
      type,
      provider
    });

    res.status(201).json({
      message: 'Payment method created successfully',
      paymentMethod: {
        id: paymentMethod.id,
        type: paymentMethod.type,
        provider: paymentMethod.provider,
        accountName: paymentMethod.accountName,
        accountId: paymentMethod.accountId,
        isDefault: paymentMethod.isDefault,
        status: paymentMethod.status,
        userId: paymentMethod.userId,
        metadata: paymentMethod.metadata,
        createdAt: paymentMethod.createdAt
      }
    });

  } catch (error) {
    logger.error('Error creating payment method:', error);
    res.status(500).json({
      message: 'Failed to create payment method',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update a payment method
router.patch('/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { provider, accountName, isDefault, metadata } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const existing = await prisma.paymentMethod.findFirst({ where: { id, userId } });
    if (!existing) {
      return res.status(404).json({ message: 'Payment method not found' });
    }

    // If setting default, unset others
    if (isDefault) {
      await prisma.paymentMethod.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false }
      });
    }

    const updated = await prisma.paymentMethod.update({
      where: { id },
      data: {
        provider: provider ?? existing.provider,
        accountName: accountName ?? existing.accountName,
        isDefault: isDefault ?? existing.isDefault,
        metadata: metadata ?? existing.metadata
      }
    });

    res.json({
      message: 'Payment method updated successfully',
      paymentMethod: updated
    });
  } catch (error) {
    logger.error('Error updating payment method:', error);
    res.status(500).json({ message: 'Failed to update payment method' });
  }
});

// Delete a payment method
router.delete('/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const existing = await prisma.paymentMethod.findFirst({ where: { id, userId } });
    if (!existing) {
      return res.status(404).json({ message: 'Payment method not found' });
    }

    await prisma.paymentMethod.delete({ where: { id } });

    res.json({ message: 'Payment method deleted successfully' });
  } catch (error) {
    logger.error('Error deleting payment method:', error);
    res.status(500).json({ message: 'Failed to delete payment method' });
  }
});

export default router; 