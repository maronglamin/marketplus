import { Request, Response } from 'express';
import YonnaForexPaymentService, { YonnaForexPaymentRequest } from '../services/YonnaForexPaymentService';
import { PrismaClient } from '@prisma/client';
import { UCPService } from '../services/ucpService';

const prisma = new PrismaClient();

export class YonnaForexPaymentController {
  private paymentService: YonnaForexPaymentService;

  constructor() {
    // Validate required environment variables
    const requiredEnvVars = [
      'YONNA_FOREX_API_URL',
      'YONNA_FOREX_SECRET_KEY', 
      'YONNA_FOREX_CLIENT_ID'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Initialize with configuration from environment variables only
    const baseUrl = (process.env.YONNA_FOREX_API_URL || '').trim().replace(/\/+$/, '');
    const secretKey = (process.env.YONNA_FOREX_SECRET_KEY || '').trim();
    const clientId = (process.env.YONNA_FOREX_CLIENT_ID || '').trim();

    this.paymentService = new YonnaForexPaymentService({
      baseUrl,
      secretKey,
      clientId
    });
  }

  /**
   * Process payment through Yonna Forex
   * POST /api/payments/yonna-forex/process
   */
  async processPayment(req: Request, res: Response): Promise<void> {
    try {
      const {
        amount,
        currency = 'GMD',
        description,
        transactionId,
        orderId
      } = req.body;

      // Get user from authenticated request
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      // Get user's phone number from database
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { phoneNumber: true }
      });

      if (!user || !user.phoneNumber) {
        res.status(400).json({
          success: false,
          message: 'Phone number not found in user profile'
        });
        return;
      }

      // Use the full phone number as stored in the database
      const phoneNumber = user.phoneNumber;

      // Get order, rental, or ride request details if orderId is provided
      let sellerId = userId; // Default to customer if no order/rental/ride
      let actualOrderId = null; // Store the actual order/rental/ride UUID
      let isRental = false;
      let isRide = false;
      
      if (orderId) {
        // First try to find as rental request
        let rental = await prisma.rentalRequest.findUnique({
          where: { id: orderId },
          include: {
            driver: { 
              include: { 
                user: { select: { id: true } } 
              } 
            }
          }
        });
        
        if (rental) {
          isRental = true;
          sellerId = rental.driver?.user?.id || rental.driver?.userId || '';
          actualOrderId = rental.id;
          // Verify the customer matches the authenticated user
          if (rental.customerId !== userId) {
            res.status(403).json({
              success: false,
              message: 'You are not authorized to pay for this rental'
            });
            return;
          }
        } else {
          // Try to find as ride request
          let rideRequest = await prisma.rideRequest.findUnique({
            where: { requestId: orderId },
            include: {
              driver: { 
                include: { 
                  user: { select: { id: true } } 
                } 
              }
            }
          });
          
          if (rideRequest) {
            isRide = true;
            sellerId = rideRequest.driver?.user?.id || rideRequest.driver?.userId || '';
            actualOrderId = rideRequest.id;
            // Verify the customer matches the authenticated user
            if (rideRequest.customerId !== userId) {
              res.status(403).json({
                success: false,
                message: 'You are not authorized to pay for this ride'
              });
              return;
            }
          } else {
            // Try to find as order by ID (UUID) first, then by orderNumber
            let order = await prisma.orders.findUnique({
              where: { id: orderId },
              select: { 
                id: true,
                sellerId: true,
                userId: true 
              }
            });
            
            // If not found by ID, try by orderNumber
            if (!order) {
              order = await prisma.orders.findUnique({
                where: { orderNumber: orderId },
                select: { 
                  id: true,
                  sellerId: true,
                  userId: true 
                }
              });
            }
            
            if (order) {
              sellerId = order.sellerId;
              actualOrderId = order.id; // Store the actual order UUID
              // Verify the customer matches the authenticated user
              if (order.userId !== userId) {
                res.status(403).json({
                  success: false,
                  message: 'You are not authorized to pay for this order'
                });
                return;
              }
            } else {
              res.status(404).json({
                success: false,
                message: 'Order, rental, or ride request not found'
              });
              return;
            }
          }
        }
      }

      // Validate required fields
      if (!amount || amount <= 0) {
        res.status(400).json({
          success: false,
          message: 'Amount is required and must be greater than 0'
        });
        return;
      }

      if (!currency) {
        res.status(400).json({
          success: false,
          message: 'Currency is required'
        });
        return;
      }

      // Generate transaction ID if not provided
      const finalTransactionId = transactionId || this.paymentService.generateTransactionId();
      const originalAmount = parseFloat(amount);
      const currencyCode = currency.toUpperCase();

      // Calculate service fee using UCP configuration
      const { serviceFeeAmount, serviceFeePercentage, config: serviceFeeConfig } = await UCPService.calculateServiceFee('yonna_wallet', originalAmount, currencyCode);

      // Generate app-level transaction ID for internal tracking
      const appTransactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      const paymentRequest: YonnaForexPaymentRequest = {
        amount: originalAmount,
        phone: phoneNumber,
        currency: currencyCode,
        fee: 0, // Constant fee of 0 as per requirement
        transactionId: finalTransactionId,
        countryCode: '+220', // Default country code for Yonna Forex
        appTransactionId: appTransactionId,
        description: orderId ? 
          (isRental ? `Payment for Rental #${orderId} via Yonna Forex Wallet` : 
           isRide ? `Payment for Ride #${orderId} via Yonna Forex Wallet` :
           `Payment for Order #${orderId} via Yonna Forex Wallet`) : 
          `Payment via Yonna Forex Wallet`
      };

      const result = await this.paymentService.processPayment(paymentRequest);

      if (result.success) {
        // Create external transaction record for tracking
        try {
          // Create external transaction record
          const transactionData: any = {
            appTransactionId: appTransactionId,
            gatewayTransactionId: finalTransactionId,
            gatewayProvider: 'yonna_forex',
            appService: isRental ? 'RENTAL' : isRide ? 'RIDE' : 'ECOMMERCE',
            amount: originalAmount,
            currencyCode: currencyCode,
            status: 'PENDING',
            paidThroughGateway: true,
            customerId: userId,
            sellerId: sellerId,
            gatewayResponse: {
              yonnaTransactionId: finalTransactionId,
              phoneNumber: phoneNumber,
              description: description,
              serviceFeeAmount: serviceFeeAmount,
              serviceFeePercentage: serviceFeePercentage,
              serviceFeeConfig: serviceFeeConfig?.name || 'service_fee_yonna_wallet'
            }
          };

          // Add order, rental, or ride reference
          if (isRental) {
            transactionData.rentalRequestId = actualOrderId;
          } else if (isRide) {
            transactionData.rideRequestId = actualOrderId;
          } else {
            transactionData.orderId = actualOrderId;
          }

          await prisma.externalTransaction.create({
            data: transactionData
          });

          // Create service fee transaction if applicable
          if (serviceFeeAmount > 0) {
            const serviceFeeTransactionId = `SVC_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
            const serviceFeeData: any = {
              appTransactionId: serviceFeeTransactionId,
              gatewayTransactionId: `${finalTransactionId}`,
              gatewayProvider: 'yonna_forex',
              appService: isRental ? 'RENTAL' : isRide ? 'RIDE' : 'ECOMMERCE',
              amount: serviceFeeAmount,
              currencyCode: currencyCode,
              status: 'PENDING',
              transactionType: 'SERVICE_FEE',
              customerId: userId,
              sellerId: sellerId,
              gatewayResponse: {
                parentTransactionId: finalTransactionId,
                serviceFeePercentage: serviceFeePercentage,
                serviceFeeConfig: serviceFeeConfig?.name || 'service_fee_yonna_wallet',
                description: `Service fee for Yonna Forex payment ${finalTransactionId}`
              }
            };

            // Add order, rental, or ride reference
            if (isRental) {
              serviceFeeData.rentalRequestId = actualOrderId;
            } else if (isRide) {
              serviceFeeData.rideRequestId = actualOrderId;
            } else {
              serviceFeeData.orderId = actualOrderId;
            }

            await prisma.externalTransaction.create({
              data: serviceFeeData
            });
          }

          console.log('Yonna Forex payment processed successfully:', {
            appTransactionId,
            yonnaTransactionId: finalTransactionId,
            amount: originalAmount,
            currency: currencyCode,
            serviceFeeAmount,
            serviceFeePercentage: `${serviceFeePercentage}%`,
            serviceFeeConfig: serviceFeeConfig?.name
          });
        } catch (dbError) {
          console.error('Error creating external transaction record:', dbError);
          // Don't fail the payment if database logging fails
        }

        res.status(200).json({
          success: true,
          data: {
            transactionId: result.transactionId,
            appTransactionId: appTransactionId,
            status: result.status,
            message: result.message,
            // If the provider returned an HTML QR page, include it for the web client to render
            ...(result as any).paymentHtml ? { paymentHtml: (result as any).paymentHtml } : {},
            // If the provider returned a deeplink URL, include it for mobile app redirect
            ...(result as any).paymentUrl ? { paymentUrl: (result as any).paymentUrl } : {},
            amount: originalAmount,
            currency: currencyCode,
            serviceFee: {
              amount: serviceFeeAmount,
              percentage: serviceFeePercentage,
              config: serviceFeeConfig?.name || 'service_fee_yonna_wallet'
            }
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message || 'Payment processing failed',
          error: result.error
        });
      }

    } catch (error: any) {
      console.error('Yonna Forex payment controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Verify payment status
   * POST /api/payments/yonna-forex/verify
   */
  async verifyPayment(req: Request, res: Response): Promise<void> {
    try {
      const { transactionId } = req.body;

      if (!transactionId) {
        res.status(400).json({
          success: false,
          message: 'Transaction ID is required'
        });
        return;
      }

      const result = await this.paymentService.verifyPayment(transactionId);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: {
            transactionId: result.transactionId,
            status: result.status,
            message: result.message
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message || 'Payment verification failed',
          error: result.error
        });
      }

    } catch (error: any) {
      console.error('Yonna Forex verification controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Get payment status
   * GET /api/payments/yonna-forex/status/:transactionId
   */
  async getPaymentStatus(req: Request, res: Response): Promise<void> {
    try {
      const { transactionId } = req.params;

      if (!transactionId) {
        res.status(400).json({
          success: false,
          message: 'Transaction ID is required'
        });
        return;
      }

      const result = await this.paymentService.getPaymentStatus(transactionId);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: {
            transactionId: result.transactionId,
            status: result.status,
            message: result.message
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message || 'Unable to retrieve payment status',
          error: result.error
        });
      }

    } catch (error: any) {
      console.error('Yonna Forex status controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Get supported currencies
   * GET /api/payments/yonna-forex/currencies
   */
  async getSupportedCurrencies(_req: Request, res: Response): Promise<void> {
    try {
      // Yonna Forex supports various currencies, with GMD as primary
      const supportedCurrencies = [
        { code: 'GMD', name: 'Gambian Dalasi', symbol: 'D' },
        { code: 'USD', name: 'US Dollar', symbol: '$' },
        { code: 'EUR', name: 'Euro', symbol: '€' },
        { code: 'GBP', name: 'British Pound', symbol: '£' }
      ];

      res.status(200).json({
        success: true,
        data: {
          currencies: supportedCurrencies,
          default: 'GMD'
        }
      });

    } catch (error: any) {
      console.error('Yonna Forex currencies controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Check if order has existing external transactions
   * GET /api/payments/yonna-forex/check-transactions/:orderId
   */
  async checkExistingTransactions(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        res.status(400).json({
          success: false,
          message: 'Order ID is required'
        });
        return;
      }

      // Check for existing external transactions for this order
      const existingTransactions = await prisma.externalTransaction.findMany({
        where: {
          orderId: orderId,
          status: {
            notIn: ['FAILED', 'CANCELLED']
          }
        },
        select: {
          id: true,
          status: true,
          gatewayProvider: true,
          amount: true,
          currencyCode: true,
          createdAt: true,
          transactionType: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      const hasActiveTransaction = existingTransactions.some(tx => 
        tx.status === 'PENDING' || tx.status === 'SUCCESS'
      );

      res.status(200).json({
        success: true,
        data: {
          hasActiveTransaction,
          transactions: existingTransactions,
          canMakePayment: !hasActiveTransaction
        }
      });
    } catch (error: any) {
      console.error('Error checking existing transactions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check existing transactions',
        error: error.message
      });
    }
  }
}

export default YonnaForexPaymentController;
