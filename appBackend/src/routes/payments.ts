import express from 'express';
import Stripe from 'stripe';
import { authenticate } from '../middleware/auth';
import { config } from '../config';
import { PrismaClient } from '@prisma/client';

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

    // Get order and user details for description
    let description = `Order #${orderId}`;
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      });
      
      if (order && order.user) {
        const fullName = `${order.user.firstName} ${order.user.lastName}`.trim();
        description = `Order #${orderId} - Ordered by: ${fullName}`;
      }
    } catch (error) {
      console.warn('Could not fetch order details for description:', error);
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

export default router; 