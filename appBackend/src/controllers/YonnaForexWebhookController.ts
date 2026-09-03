import { Request, Response } from 'express';
import { getWebhookConfig, getWebhookUrls } from '../utils/webhookConfig';
import { PrismaClient } from '@prisma/client';
import UCPService from '../services/ucpService';
import { notificationService } from '../services/notificationService';
import { activateFromPayment } from '../services/providerSubscriptionService';

const prisma = new PrismaClient();

export interface YonnaForexWebhookPayload {
  appTransactionId: string;
  status: 'pending' | 'success' | 'completed' | 'failed' | 'cancelled';
  amount: number;
  currency: string;
  phoneNumber: string;
  timestamp: string | number;
  message?: string;
  error?: string;
  // Provider identifiers (if sent by Yonna)
  transactionId?: string;
  reference?: string;
  signature?: string; // For webhook signature verification
}

export class YonnaForexWebhookController {
  /**
   * Handle Yonna Forex webhook notifications
   * POST /api/payments/yonna-forex/webhook
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      // Normalize/parse incoming payload in case body is a raw string, Buffer, or nested object
      let incoming: any = req.body;
      
      // If body is a Buffer (misconfigured content-type), try to parse to JSON
      if (Buffer.isBuffer(incoming)) {
        const raw = incoming.toString('utf8');
        try {
          incoming = JSON.parse(raw);
        } catch {
          // Keep as string if not parseable
          incoming = raw;
        }
      }
      
      // If body is a string (e.g., content-type text/plain), try to parse JSON
      if (typeof incoming === 'string') {
        try {
          incoming = JSON.parse(incoming);
        } catch {
          // leave as-is; validation will fail below
        }
      }
      
      // If provider nests payload under "payload" or "data", unwrap it (and parse if stringified)
      if (incoming && typeof incoming === 'object') {
        const nested = (incoming as any).payload ?? (incoming as any).data;
        if (nested) {
          if (typeof nested === 'string') {
            try {
              incoming = JSON.parse(nested);
            } catch {
              incoming = nested;
            }
          } else {
            incoming = nested;
          }
        }
      }
      
      const payload: YonnaForexWebhookPayload = incoming as any;

      console.log('Yonna Forex webhook received:', payload);

      // Validate required fields
      if (!payload.appTransactionId || !payload.status) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: appTransactionId and status'
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
      const located = await this.findTransactionByYonnaId(payload.appTransactionId);
      
      if (!located) {
        console.error('Transaction not found:', payload.appTransactionId);
        res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
        return;
      }

      // Update transaction status
      await this.updateTransactionStatus(located, payload);

      // Send notification to user (if needed)
      const userId = located.userId || null;
      if (userId) {
        await this.notifyUser(userId, payload);
      }

      const normalizedStatus = String(payload.status).toLowerCase();
      if (normalizedStatus === 'success' || normalizedStatus === 'completed') {
        if (located.type === 'external') {
          const externalTx = await prisma.externalTransaction.findUnique({
            where: { id: located.id },
          });
          if (externalTx) {
            void notificationService.sendPaymentCompletedFromExternalTransaction(externalTx);
          }
        }
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
  private async findTransactionByYonnaId(yonnaTransactionId: string): Promise<{ type: 'external' | 'order', id: string, userId?: string } | null> {
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
      // Look for external transaction record by appTransactionId first
      const externalByApp = await prisma.externalTransaction.findFirst({
        where: { 
          appTransactionId: yonnaTransactionId,
          gatewayProvider: 'yonna_forex'
        },
        select: {
          id: true,
          customerId: true
        }
      });

      if (externalByApp) {
        return { type: 'external', id: externalByApp.id, userId: externalByApp.customerId };
      }

      // Fallback: look by gatewayTransactionId
      const externalByGateway = await prisma.externalTransaction.findFirst({
        where: { 
          gatewayTransactionId: yonnaTransactionId,
          gatewayProvider: 'yonna_forex'
        },
        select: {
          id: true,
          customerId: true
        }
      });

      if (externalByGateway) {
        return { type: 'external', id: externalByGateway.id, userId: externalByGateway.customerId };
      }

      // If not found in external transactions, look in orders table
      const orderTransaction = await prisma.orders.findFirst({
        where: { 
          paymentReference: yonnaTransactionId
        },
        select: {
          id: true,
          userId: true
        }
      });

      if (orderTransaction) {
        return { type: 'order', id: orderTransaction.id, userId: orderTransaction.userId };
      }
      
      return null;
    } catch (error) {
      console.error('Error finding transaction:', error);
      return null;
    }
  }

  /**
   * Update transaction status in database
   */
  private async updateTransactionStatus(located: { type: 'external' | 'order', id: string }, payload: YonnaForexWebhookPayload) {

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
      const normalized = String(payload.status).toLowerCase();
      if (located.type === 'external') {
        // Update external transaction status
        const externalStatusMap: { [key: string]: string } = {
          'success': 'SUCCESS',
          'completed': 'SUCCESS',
          'failed': 'FAILED',
          'cancelled': 'CANCELLED',
          'pending': 'PENDING'
        };

        const newStatus = externalStatusMap[normalized] || 'PENDING';
        const providerReference =
          (payload as any).reference ||
          (payload as any).transactionId ||
          null;
        
        await prisma.externalTransaction.update({
          where: { id: located.id },
          data: {
            status: newStatus as any,
            updatedAt: new Date(),
            ...(providerReference
              ? { paymentReference: providerReference }
              : {}),
            gatewayResponse: {
              ...((await prisma.externalTransaction.findUnique({ where: { id: located.id } }))?.gatewayResponse as any || {}),
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
              equals: ((await prisma.externalTransaction.findUnique({ where: { id: located.id } }))?.gatewayTransactionId || '')
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
        
        console.log('External transaction updated:', located.id, 'to status:', newStatus);

        // Propagate status to related domain records (orders, rentals, rides)
        try {
          const ext = await prisma.externalTransaction.findUnique({
            where: { id: located.id },
            select: {
              gatewayTransactionId: true,
              appTransactionId: true,
              orderId: true,
              rentalRequestId: true,
              rideRequestId: true
            }
          });

          if (ext?.orderId) {
            // Map to orders
            const orderStatusMap: { [key: string]: string } = {
              'success': 'CONFIRMED',
              'completed': 'CONFIRMED',
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

            const providerReference =
              (payload as any).reference ||
              (payload as any).transactionId ||
              null;

            await prisma.orders.update({
              where: { id: ext.orderId },
              data: {
                status: (orderStatusMap[normalized] || 'PENDING') as any,
                paymentStatus: (paymentStatusMap[normalized] || 'PENDING') as any,
                // Record the provider's payment reference from Yonna payload when available
                ...(providerReference ? { paymentReference: providerReference } : {}),
                updatedAt: new Date()
              }
            });
          }

          if (ext?.serviceBookingId) {
            if (normalized === 'success' || normalized === 'completed') {
              await prisma.serviceBooking.update({
                where: { id: ext.serviceBookingId },
                data: { status: 'PAID', paymentStatus: 'PAID', updatedAt: new Date() },
              });
            }
          }

          if ((ext as any)?.providerSubscriptionPaymentId && (normalized === 'success' || normalized === 'completed')) {
            try {
              await activateFromPayment((ext as any).providerSubscriptionPaymentId);
            } catch (e) {
              console.warn('Yonna webhook: subscription activate warning:', (e as any)?.message || e);
            }
          }

          if (ext?.propertyBookingId) {
            if (normalized === 'success' || normalized === 'completed') {
              await prisma.propertyBooking.update({
                where: { id: ext.propertyBookingId },
                data: { status: 'CONFIRMED', paymentStatus: 'PAID', updatedAt: new Date() },
              });
            }
          }

          if ((ext as any)?.propertyInquiryId && (normalized === 'success' || normalized === 'completed')) {
            const inquiryId = (ext as any).propertyInquiryId as string;
            const inquiry = await prisma.propertyInquiry.findUnique({
              where: { id: inquiryId },
              include: { listing: true },
            });
            if (inquiry) {
              await prisma.propertyListing.updateMany({
                where: { id: inquiry.listingId, status: 'ACTIVE' },
                data: { status: 'SOLD' },
              });
              await prisma.propertyInquiry.update({
                where: { id: inquiryId },
                data: { paymentStatus: 'PAID', status: 'PURCHASED', updatedAt: new Date() },
              });
              await prisma.propertyInquiry.updateMany({
                where: {
                  listingId: inquiry.listingId,
                  id: { not: inquiryId },
                  status: { in: ['PENDING', 'CONTACTED'] },
                },
                data: { status: 'CLOSED' },
              });
            }
          }

          if (ext?.rentalRequestId) {
            // Map to rentals (RentalRequest.status)
            const rentalStatus = normalized === 'success' || normalized === 'completed'
              ? 'PAID'
              : normalized === 'failed' || normalized === 'cancelled'
              ? 'CANCELLED'
              : null; // do not downgrade on pending

            if (rentalStatus) {
              await prisma.rentalRequest.update({
                where: { id: ext.rentalRequestId },
                data: { status: rentalStatus as any, updatedAt: new Date() }
              });
            }
          }

          if (ext?.rideRequestId) {
            // Map to rides (Ride.paymentStatus) when ride exists
            const ride = await prisma.ride.findUnique({
              where: { rideRequestId: ext.rideRequestId },
              select: { id: true }
            });

            if (ride) {
              const ridePaymentStatus = normalized === 'success' || normalized === 'completed'
                ? 'PAID'
                : normalized === 'failed'
                ? 'FAILED'
                : normalized === 'cancelled'
                ? 'CANCELLED'
                : 'PENDING';

              await prisma.ride.update({
                where: { id: ride.id },
                data: { paymentStatus: ridePaymentStatus as any, updatedAt: new Date() }
              });
            }
          }
        } catch (propError) {
          console.error('Error propagating webhook status to domain records:', propError);
        }

        // If payment succeeded, ensure SERVICE_FEE transaction exists (platform fee via UCP)
        try {
          if (newStatus === 'SUCCESS') {
            const extFull = await prisma.externalTransaction.findUnique({
              where: { id: located.id },
              select: {
                id: true,
                orderId: true,
                rentalRequestId: true,
                rideRequestId: true,
                customerId: true,
                sellerId: true,
                gatewayProvider: true,
                gatewayTransactionId: true,
                paymentReference: true,
                appTransactionId: true,
                appService: true,
                amount: true,
                currencyCode: true
              }
            });
            if (extFull) {
              const existingServiceFee = await prisma.externalTransaction.findFirst({
                where: {
                  gatewayProvider: 'yonna_forex',
                  transactionType: 'SERVICE_FEE',
                  appTransactionId: extFull.appTransactionId
                }
              });
              if (!existingServiceFee) {
                const baseAmount = Number(extFull.amount || 0);
                const currencyCode = (extFull.currencyCode || 'GMD').toUpperCase();
                const { serviceFeeAmount, serviceFeePercentage, config: serviceFeeConfig } =
                  await UCPService.calculateServiceFee('yonna_wallet', baseAmount, currencyCode);
                if (serviceFeeAmount > 0) {
                  await prisma.externalTransaction.create({
                    data: {
                      orderId: extFull.orderId || null,
                      rentalRequestId: (extFull as any).rentalRequestId || null,
                      rideRequestId: (extFull as any).rideRequestId || null,
                      customerId: (extFull.customerId ?? undefined) as any,
                      sellerId: (extFull.sellerId ?? undefined) as any,
                      gatewayProvider: 'yonna_forex',
                      gatewayTransactionId: `${extFull.gatewayTransactionId || ((payload as any).transactionId || (payload as any).reference) || 'unknown'}-servicefee`,
                      paymentReference: extFull.paymentReference || ((payload as any).reference || (payload as any).transactionId || ''),
                      appTransactionId: extFull.appTransactionId,
                      appService: extFull.appService as any,
                      transactionType: 'SERVICE_FEE' as any,
                      amount: serviceFeeAmount,
                      currencyCode,
                      gatewayChargeFees: null,
                      processedAmount: 0,
                      paidThroughGateway: false,
                      gatewayResponse: {
                        originalReference: extFull.gatewayTransactionId || (payload as any).transactionId || (payload as any).reference || null,
                        serviceFeeConfig: serviceFeeConfig || null,
                        serviceFeePercentage,
                        serviceFeeAmount,
                        webhookDerived: true
                      } as any,
                      status: 'SUCCESS',
                      processedAt: new Date()
                    }
                  });
                }
              }
            }
          }
        } catch (e) {
          console.warn('Yonna webhook: service fee creation warning:', (e as any)?.message || e);
        }
      } else {
        // Update order status
        const orderStatusMap: { [key: string]: string } = {
          'success': 'CONFIRMED',
          'completed': 'CONFIRMED',
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

        const newOrderStatus = orderStatusMap[normalized] || 'PENDING';
        const newPaymentStatus = paymentStatusMap[normalized] || 'PENDING';
        
        await prisma.orders.update({
          where: { id: located.id },
          data: {
            status: newOrderStatus as any,
            paymentStatus: newPaymentStatus as any,
            updatedAt: new Date()
          }
        });
        
        console.log('Order updated:', located.id, 'to order status:', newOrderStatus, 'payment status:', newPaymentStatus);
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

      // Send push notification for non-success updates (success handled separately)
      const normalizedForNotification = String(payload.status).toLowerCase();
      let title = 'Payment Update';
      let body = '';

      switch (normalizedForNotification) {
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

      if (normalizedForNotification !== 'success' && normalizedForNotification !== 'completed') {
        await notificationService.sendNotificationToUser(_userId, {
          title,
          body,
          data: {
            type: 'payment_update',
            status: normalizedForNotification,
            amount: String(payload.amount),
            currency: payload.currency,
          },
        });
      }

      // Send SMS notification (optional)
      if (process.env.SEND_SMS_NOTIFICATIONS === 'true' && body) {
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
      appTransactionId: payload.appTransactionId,
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
