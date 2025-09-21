import { Request, Response } from 'express';
import { getWebhookConfig, getWebhookUrls } from '../utils/webhookConfig';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface YonnaForexWebhookPayload {
  transactionId: string;
  status: 'pending' | 'success' | 'completed' | 'failed' | 'cancelled';
  amount: number;
  currency: string;
  phoneNumber: string;
  timestamp: string;
  message?: string;
  error?: string;
  signature?: string; // For webhook signature verification
}

export class YonnaForexWebhookController {
  /**
   * Handle Yonna Forex webhook notifications
   * POST /api/payments/yonna-forex/webhook
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const payload: YonnaForexWebhookPayload = req.body;

      console.log('Yonna Forex webhook received:', payload);

      // Validate required fields
      if (!payload.transactionId || !payload.status) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: transactionId and status'
        });
        return;
      }

      // Verify webhook signature (optional but recommended)
      if (process.env.YONNA_FOREX_WEBHOOK_SECRET) {
        const isValidSignature = this.verifyWebhookSignature(req, payload);
        if (!isValidSignature) {
          console.error('Invalid webhook signature');
          res.status(401).json({
            success: false,
            message: 'Invalid webhook signature'
          });
          return;
        }
      }

      // Find the transaction in your database
      const transaction = await this.findTransactionByYonnaId(payload.transactionId);
      
      if (!transaction) {
        console.error('Transaction not found:', payload.transactionId);
        res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
        return;
      }

      // Update transaction status
      await this.updateTransactionStatus(transaction.id, payload);

      // Send notification to user (if needed)
      const userId = (transaction as any).customerId || (transaction as any).customer?.id || (transaction as any).User_orders_userIdToUser?.id;
      if (userId) {
        await this.notifyUser(userId, payload);
      }

      // Log the webhook event
      await this.logWebhookEvent(payload);

      res.status(200).json({
        success: true,
        message: 'Webhook processed successfully'
      });

    } catch (error: any) {
      console.error('Yonna Forex webhook error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Verify webhook signature for security
   */
  private verifyWebhookSignature(req: Request, payload: YonnaForexWebhookPayload): boolean {
    const signature = req.headers['x-yonna-signature'] as string;
    const secret = process.env.YONNA_FOREX_WEBHOOK_SECRET;
    
    if (!signature || !secret) {
      return false;
    }

    // Simple HMAC verification (implement according to Yonna's spec)
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return signature === `sha256=${expectedSignature}`;
  }

  /**
   * Find transaction by Yonna Forex transaction ID
   */
  private async findTransactionByYonnaId(yonnaTransactionId: string) {
    // This assumes you have a transactions table with a yonnaTransactionId field
    // Adjust the query based on your actual database schema
    // TODO: Uncomment when prisma is properly imported
    /*
    return await prisma.externalTransaction.findFirst({
      where: {
        yonnaTransactionId: yonnaTransactionId
      },
      include: {
        user: true
      }
    });
    */
    
    try {
      // Look for external transaction record first
      const externalTransaction = await prisma.externalTransaction.findFirst({
        where: { 
          gatewayTransactionId: yonnaTransactionId,
          gatewayProvider: 'yonna_forex'
        },
        include: {
          customer: true
        }
      });

      if (externalTransaction) {
        return externalTransaction;
      }

      // If not found in external transactions, look in orders table
      const orderTransaction = await prisma.orders.findFirst({
        where: { 
          paymentReference: yonnaTransactionId
        },
        include: {
          User_orders_userIdToUser: true
        }
      });

      return orderTransaction;
    } catch (error) {
      console.error('Error finding transaction:', error);
      return null;
    }
  }

  /**
   * Update transaction status in database
   */
  private async updateTransactionStatus(transactionId: string, payload: YonnaForexWebhookPayload) {

    // TODO: Uncomment when prisma is properly imported
    /*
    await prisma.externalTransaction.update({
      where: { id: transactionId },
      data: {
        status: statusMap[payload.status] || 'PENDING',
        updatedAt: new Date(),
        // Add any other fields you want to update
        metadata: {
          yonnaStatus: payload.status,
          yonnaMessage: payload.message,
          yonnaTimestamp: payload.timestamp
        }
      }
    });
    */
    
    try {
      // Check if this is an external transaction or order
      const isExternalTransaction = transactionId.startsWith('TXN-');
      
      if (isExternalTransaction) {
        // Update external transaction status
        const externalStatusMap: { [key: string]: string } = {
          'success': 'COMPLETED',
          'completed': 'COMPLETED',
          'failed': 'FAILED',
          'cancelled': 'CANCELLED',
          'pending': 'PENDING'
        };

        const newStatus = externalStatusMap[payload.status] || 'PENDING';
        
        await prisma.externalTransaction.update({
          where: { id: transactionId },
          data: {
            status: newStatus as any,
            updatedAt: new Date(),
            gatewayResponse: {
              ...((await prisma.externalTransaction.findUnique({ where: { id: transactionId } }))?.gatewayResponse as any || {}),
              lastWebhookStatus: payload.status,
              lastWebhookUpdate: new Date().toISOString()
            }
          }
        });
        
        // Also update any related service fee transactions
        const serviceFeeTransactions = await prisma.externalTransaction.findMany({
          where: {
            transactionType: 'SERVICE_FEE',
            gatewayResponse: {
              path: ['parentTransactionId'],
              equals: ((await prisma.externalTransaction.findUnique({ where: { id: transactionId } }))?.gatewayTransactionId || '')
            }
          }
        });
        
        for (const serviceFeeTransaction of serviceFeeTransactions) {
          await prisma.externalTransaction.update({
            where: { id: serviceFeeTransaction.id },
            data: {
              status: newStatus as any,
              updatedAt: new Date(),
              gatewayResponse: {
                ...(serviceFeeTransaction.gatewayResponse as any || {}),
                lastWebhookStatus: payload.status,
                lastWebhookUpdate: new Date().toISOString()
              }
            }
          });
          
          console.log('Service fee transaction updated:', serviceFeeTransaction.id, 'to status:', newStatus);
        }
        
        console.log('External transaction updated:', transactionId, 'to status:', newStatus);
      } else {
        // Update order status
        const orderStatusMap: { [key: string]: string } = {
          'success': 'COMPLETED',
          'completed': 'COMPLETED',
          'failed': 'CANCELLED',
          'cancelled': 'CANCELLED',
          'pending': 'PENDING'
        };

        const paymentStatusMap: { [key: string]: string } = {
          'success': 'PAID',
          'completed': 'PAID',
          'failed': 'FAILED',
          'cancelled': 'CANCELLED',
          'pending': 'PENDING'
        };

        const newOrderStatus = orderStatusMap[payload.status] || 'PENDING';
        const newPaymentStatus = paymentStatusMap[payload.status] || 'PENDING';
        
        await prisma.orders.update({
          where: { id: transactionId },
          data: {
            status: newOrderStatus as any,
            paymentStatus: newPaymentStatus as any,
            updatedAt: new Date()
          }
        });
        
        console.log('Order updated:', transactionId, 'to order status:', newOrderStatus, 'payment status:', newPaymentStatus);
      }
    } catch (error) {
      console.error('Error updating transaction:', error);
    }
  }

  /**
   * Notify user about payment status change
   */
  private async notifyUser(_userId: string, payload: YonnaForexWebhookPayload) {
    try {
      // Get user's notification preferences
      // TODO: Uncomment when prisma is properly imported
      /*
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { 
          phoneNumber: true,
          devices: {
            where: { isVerified: true },
            select: { fcmToken: true }
          }
        }
      });
      */
      
      // Get user data from database
      const user = await prisma.user.findUnique({
        where: { id: _userId },
        include: {
          devices: true
        }
      });
      
      if (!user) {
        console.log('User not found:', _userId);
        return;
      }

      // Prepare notification content
      let title = 'Payment Update';
      let body = '';
      
      switch (payload.status) {
        case 'completed':
          title = 'Payment Successful';
          body = `Your payment of ${payload.currency} ${payload.amount} has been completed successfully.`;
          break;
        case 'failed':
          title = 'Payment Failed';
          body = `Your payment of ${payload.currency} ${payload.amount} has failed. ${payload.message || ''}`;
          break;
        case 'cancelled':
          title = 'Payment Cancelled';
          body = `Your payment of ${payload.currency} ${payload.amount} has been cancelled.`;
          break;
        default:
          body = `Your payment status has been updated to ${payload.status}.`;
      }

      // Send push notification (simplified for now)
      if (user.devices && user.devices.length > 0) {
        console.log('Sending notification to user devices:', user.devices.length);
        // TODO: Implement actual push notification when FCM tokens are available
        // For now, just log the notification
        console.log('Notification would be sent:', { title, body, userId: _userId });
      }

      // Send SMS notification (optional)
      if (process.env.SEND_SMS_NOTIFICATIONS === 'true') {
        const smsService = require('../services/smsService');
        await smsService.sendSMS(user.phoneNumber, body);
      }

    } catch (error) {
      console.error('Error notifying user:', error);
    }
  }

  /**
   * Log webhook event for debugging
   */
  private async logWebhookEvent(payload: YonnaForexWebhookPayload) {
    // Log webhook event (simple console logging for now)
    console.log('Webhook event received:', {
      source: 'yonna_forex',
      event: payload.status,
      transactionId: payload.transactionId,
      amount: payload.amount,
      currency: payload.currency,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get webhook status for debugging
   * GET /api/payments/yonna-forex/webhook/status
   */
  async getWebhookStatus(_req: Request, res: Response): Promise<void> {
    try {
      // TODO: Uncomment when prisma is properly imported
      /*
      const recentWebhooks = await prisma.webhookLog.findMany({
        where: {
          source: 'yonna_forex',
          processedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        orderBy: { processedAt: 'desc' },
        take: 10
      });
      */
      
      // Simple webhook status (no database logging for now)
      const recentWebhooks: any[] = [];

      const webhookUrls = getWebhookUrls();
      const config = getWebhookConfig();
      
      res.status(200).json({
        success: true,
        data: {
          webhookUrl: config.webhookUrl,
          primaryUrl: webhookUrls.primary,
          fallbackUrl: webhookUrls.fallback,
          testUrl: config.testUrl,
          statusUrl: config.statusUrl,
          recentWebhooks: recentWebhooks.length,
          lastWebhook: recentWebhooks[0]?.processedAt || null,
          configuration: {
            usingEnvironmentVariable: !!process.env.API_BASE_URL,
            environment: process.env.NODE_ENV || 'development'
          }
        }
      });
    } catch (error: any) {
      console.error('Error getting webhook status:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving webhook status',
        error: error.message
      });
    }
  }
}

export default YonnaForexWebhookController;
