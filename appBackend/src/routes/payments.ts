import express from 'express';
import Stripe from 'stripe';
import { authenticate } from '../middleware/auth';
import { PrismaClient, TransactionType } from '@prisma/client';
import UCPService from '../services/ucpService';

const router = express.Router();
const prisma = new PrismaClient();

// Initialize Stripe with secret key from environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
});

// Create payment intent
router.post('/create-payment-intent', authenticate, async (req, res) => {
  try {
    const { amount, currency, orderId, customerId, metadata } = req.body;

    if (!amount || !currency || !orderId || !customerId) {
      return res.status(400).json({
        message: 'Missing required fields: amount, currency, orderId, customerId'
      });
    }

    // Get transaction details for description based on metadata
    let description = `Transaction #${orderId}`;
    const transactionType = metadata?.transactionType || 'order';
    
    try {
      if (transactionType === 'order') {
        // Handle order payments
        const order = await prisma.orders.findUnique({
          where: { id: orderId },
          include: {
            User_orders_userIdToUser: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        });
        
        if (order && order.User_orders_userIdToUser) {
          const fullName = `${order.User_orders_userIdToUser.firstName} ${order.User_orders_userIdToUser.lastName}`.trim();
          description = `Order #${orderId} - Ordered by: ${fullName}`;
        }
      } else if (transactionType === 'ride') {
        // Handle ride payments
        const ride = await prisma.rideRequest.findUnique({
          where: { id: orderId },
          include: {
            customer: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        });
        
        if (ride && ride.customer) {
          const fullName = `${ride.customer.firstName} ${ride.customer.lastName}`.trim();
          description = `Ride #${orderId} - Requested by: ${fullName}`;
        }
      } else if (transactionType === 'rental') {
        // Handle rental payments
        const rental = await prisma.rentalRequest.findUnique({
          where: { id: orderId },
          include: {
            customer: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        });
        
        if (rental && rental.customer) {
          const fullName = `${rental.customer.firstName} ${rental.customer.lastName}`.trim();
          description = `Rental #${orderId} - Requested by: ${fullName}`;
        }
      }
    } catch (error) {
      console.warn('Could not fetch transaction details for description:', error);
      // Continue with basic description
    }

    // Convert amount to smallest currency unit for Stripe
    const currencyLower = currency.toLowerCase();
    
    // Zero-decimal currencies (like JPY, KRW, etc.)
    const zeroDecimalCurrencies = ['jpy', 'bif', 'clp', 'djf', 'gnf', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf'];
    
    let stripeAmount = amount;
    if (zeroDecimalCurrencies.includes(currencyLower)) {
      // For zero-decimal currencies, use amount as-is
      stripeAmount = Math.round(amount);
    } else {
      // For other currencies, convert to smallest unit (e.g., cents for USD)
      stripeAmount = Math.round(amount * 100);
    }

    console.log('Creating payment intent with amount:', {
      originalAmount: amount,
      currency: currency,
      stripeAmount: stripeAmount,
      description: description
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: stripeAmount,
      currency: currency.toLowerCase(),
      description: description,
      metadata: {
        orderId,
        customerId,
        ...metadata
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.json({
      paymentIntent: {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        client_secret: paymentIntent.client_secret,
      }
    });
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({
      message: error.message || 'Failed to create payment intent'
    });
  }
});

// Confirm payment
router.post('/confirm-payment', authenticate, async (req, res) => {
  try {
    const { paymentIntentId, paymentMethodId } = req.body;

    if (!paymentIntentId || !paymentMethodId) {
      return res.status(400).json({
        message: 'Missing required fields: paymentIntentId, paymentMethodId'
      });
    }

    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethodId,
    });

    res.json({
      paymentIntent: {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
      }
    });
  } catch (error: any) {
    console.error('Error confirming payment:', error);
    res.status(500).json({
      message: error.message || 'Failed to confirm payment'
    });
  }
});

// Create payment method
router.post('/create-payment-method', authenticate, async (req, res) => {
  try {
    const { type, card, billing_details } = req.body;

    if (!type || !card) {
      return res.status(400).json({
        message: 'Missing required fields: type, card'
      });
    }

    const paymentMethod = await stripe.paymentMethods.create({
      type: type as Stripe.PaymentMethodCreateParams.Type,
      card,
      billing_details,
    });

    res.json({
      paymentMethod: {
        id: paymentMethod.id,
        type: paymentMethod.type,
        card: paymentMethod.card,
        billing_details: paymentMethod.billing_details,
      }
    });
  } catch (error: any) {
    console.error('Error creating payment method:', error);
    res.status(500).json({
      message: error.message || 'Failed to create payment method'
    });
  }
});

// Attach payment method to customer
router.post('/attach-payment-method', authenticate, async (req, res) => {
  try {
    const { paymentMethodId, customerId } = req.body;

    if (!paymentMethodId || !customerId) {
      return res.status(400).json({
        message: 'Missing required fields: paymentMethodId, customerId'
      });
    }

    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    res.json({
      message: 'Payment method attached successfully'
    });
  } catch (error: any) {
    console.error('Error attaching payment method:', error);
    res.status(500).json({
      message: error.message || 'Failed to attach payment method'
    });
  }
});

// Get customer payment methods
router.get('/customer/:customerId/payment-methods', authenticate, async (req, res) => {
  try {
    const { customerId } = req.params;

    if (!customerId) {
      return res.status(400).json({
        message: 'Missing customerId parameter'
      });
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    res.json({
      paymentMethods: paymentMethods.data.map(pm => ({
        id: pm.id,
        type: pm.type,
        card: pm.card,
        billing_details: pm.billing_details,
      }))
    });
  } catch (error: any) {
    console.error('Error fetching customer payment methods:', error);
    res.status(500).json({
      message: error.message || 'Failed to fetch customer payment methods'
    });
  }
});

// Delete payment method
router.delete('/payment-method/:paymentMethodId', authenticate, async (req, res) => {
  try {
    const { paymentMethodId } = req.params;

    if (!paymentMethodId) {
      return res.status(400).json({
        message: 'Missing paymentMethodId parameter'
      });
    }

    await stripe.paymentMethods.detach(paymentMethodId);

    res.json({
      message: 'Payment method deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting payment method:', error);
    res.status(500).json({
      message: error.message || 'Failed to delete payment method'
    });
  }
});

// Get payment intent
router.get('/payment-intent/:paymentIntentId', authenticate, async (req, res) => {
  try {
    const { paymentIntentId } = req.params;

    if (!paymentIntentId) {
      return res.status(400).json({
        message: 'Missing paymentIntentId parameter'
      });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    res.json({
      paymentIntent: {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        metadata: paymentIntent.metadata,
      }
    });
  } catch (error: any) {
    console.error('Error retrieving payment intent:', error);
    res.status(500).json({
      message: error.message || 'Failed to retrieve payment intent'
    });
  }
});

// Payment success endpoint - updates order and creates external transaction
router.post('/payment-success', authenticate, async (req, res) => {
  try {
    const { paymentIntentId, orderId } = req.body;

    if (!paymentIntentId || !orderId) {
      return res.status(400).json({
        message: 'Missing required fields: paymentIntentId, orderId'
      });
    }

    // Retrieve the payment intent from Stripe to get full details
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        message: 'Payment intent is not in succeeded status'
      });
    }

    // Get order details
    const order = await prisma.orders.findUnique({
      where: { id: orderId },
      include: {
        User_orders_userIdToUser: true,
        User_orders_sellerIdToUser: true
      }
    });

    if (!order) {
      return res.status(404).json({
        message: 'Order not found'
      });
    }

    // Verify the payment intent belongs to this order
    if (paymentIntent.metadata.orderId !== orderId) {
      return res.status(400).json({
        message: 'Payment intent does not belong to this order'
      });
    }

    // Generate unique app transaction ID for this payment
    const appTransactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    // Calculate amounts
    const originalAmount = paymentIntent.amount / 100; // Convert from cents to dollars
    const gatewayChargeFees = calculateStripeFees(originalAmount, paymentIntent.currency);
    const processedAmount = originalAmount - gatewayChargeFees; // What seller actually receives

    // Calculate service fee using UCP
    const { serviceFeeAmount, serviceFeePercentage, config: serviceFeeConfig } = await UCPService.calculateServiceFee('stripe', originalAmount, paymentIntent.currency);

    // Use a transaction to ensure all updates and external transaction creations succeed
    const result = await prisma.$transaction(async (tx) => {
      // Update the order
      const updatedOrder = await tx.orders.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'PAID',
          status: 'CONFIRMED',
          paymentReference: paymentIntent.id,
          paidAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Create original transaction record (customer payment)
      const originalTransaction = await tx.externalTransaction.create({
        data: {
          orderId: orderId,
          customerId: order.userId,
          sellerId: order.sellerId,
          gatewayProvider: 'stripe',
          gatewayTransactionId: paymentIntent.id,
          paymentReference: paymentIntent.id,
          appTransactionId: appTransactionId,
          appService: 'ECOMMERCE', // Set app service to ECOMMERCE for ecommerce payments
          transactionType: 'ORIGINAL',
          amount: originalAmount,
          currencyCode: paymentIntent.currency.toUpperCase(),
          gatewayChargeFees: null, // No fees on original transaction
          processedAmount: null, // Not applicable for original transaction
          paidThroughGateway: true,
          gatewayResponse: paymentIntent as any, // Store full Stripe response
          status: 'SUCCESS',
          processedAt: new Date()
        }
      });

      // Create fee transaction record (Stripe fees)
      const feeTransaction = await tx.externalTransaction.create({
        data: {
          orderId: orderId,
          customerId: order.userId,
          sellerId: order.sellerId,
          gatewayProvider: 'stripe',
          gatewayTransactionId: `${paymentIntent.id}-fee`,
          paymentReference: paymentIntent.id,
          appTransactionId: appTransactionId, // Same app transaction ID
          appService: 'ECOMMERCE', // Set app service to ECOMMERCE for ecommerce payments
          transactionType: 'FEE',
          amount: gatewayChargeFees,
          currencyCode: paymentIntent.currency.toUpperCase(),
          gatewayChargeFees: gatewayChargeFees,
          processedAmount: 0, // Fees are deducted, so processed amount is 0
          paidThroughGateway: true,
          gatewayResponse: {
            originalPaymentIntent: paymentIntent.id,
            feeCalculation: {
              percentage: 0.029,
              fixedFee: 30,
              totalFees: gatewayChargeFees
            }
          },
          status: 'SUCCESS',
          processedAt: new Date()
        }
      });

      // Create service fee transaction record (App service fee)
      const serviceFeeTransaction = await tx.externalTransaction.create({
        data: {
          orderId: orderId,
          customerId: order.userId,
          sellerId: order.sellerId,
          gatewayProvider: 'stripe',
          gatewayTransactionId: `${paymentIntent.id}-servicefee`,
          paymentReference: paymentIntent.id,
          appTransactionId: appTransactionId, // Same app transaction ID
          appService: 'ECOMMERCE', // Set app service to ECOMMERCE for ecommerce payments
          transactionType: TransactionType.SERVICE_FEE,
          amount: serviceFeeAmount,
          currencyCode: paymentIntent.currency.toUpperCase(),
          gatewayChargeFees: null,
          processedAmount: 0, // Service fee is deducted from seller
          paidThroughGateway: false,
          gatewayResponse: {
            originalPaymentIntent: paymentIntent.id,
            serviceFeeConfig: serviceFeeConfig ? {
              name: serviceFeeConfig.name,
              value: serviceFeeConfig.value,
              description: serviceFeeConfig.description,
              serviceType: serviceFeeConfig.serviceType,
              metadata: serviceFeeConfig.metadata
            } : null,
            serviceFeePercentage,
            serviceFeeAmount
          },
          status: 'SUCCESS',
          processedAt: new Date()
        }
      });

      return { updatedOrder, originalTransaction, feeTransaction, serviceFeeTransaction };
    });

    res.json({
      success: true,
      order: {
        id: result.updatedOrder.id,
        paymentStatus: result.updatedOrder.paymentStatus,
        status: result.updatedOrder.status,
        paidAt: result.updatedOrder.paidAt
      },
      transaction: {
        appTransactionId: result.originalTransaction.appTransactionId,
        originalTransaction: {
          id: result.originalTransaction.id,
          amount: result.originalTransaction.amount,
          status: result.originalTransaction.status
        },
        feeTransaction: {
          id: result.feeTransaction.id,
          amount: result.feeTransaction.amount,
          status: result.feeTransaction.status
        },
        serviceFeeTransaction: {
          id: result.serviceFeeTransaction.id,
          amount: result.serviceFeeTransaction.amount,
          status: result.serviceFeeTransaction.status
        },
        processedAmount: processedAmount,
        totalFees: gatewayChargeFees,
        serviceFee: serviceFeeAmount
      }
    });

  } catch (error: any) {
    console.error('Error processing payment success:', error);
    res.status(500).json({
      message: error.message || 'Failed to process payment success'
    });
  }
});

// Helper function to calculate Stripe fees
function calculateStripeFees(amount: number, currency: string): number {
  // Stripe fees: 2.9% + 30 cents for most currencies
  const percentageFee = 0.029; // 2.9%
  const fixedFee = 30; // 30 cents in smallest currency unit
  
  // For zero-decimal currencies, adjust the fixed fee
  const zeroDecimalCurrencies = ['jpy', 'bif', 'clp', 'djf', 'gnf', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf'];
  const adjustedFixedFee = zeroDecimalCurrencies.includes(currency.toLowerCase()) ? fixedFee : fixedFee / 100;
  
  const percentageAmount = amount * percentageFee;
  const totalFees = percentageAmount + adjustedFixedFee;
  
  return totalFees;
}

export default router; 