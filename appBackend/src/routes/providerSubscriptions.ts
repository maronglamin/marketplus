import { Router } from 'express';
import { PrismaClient, SubscriptionVertical } from '@prisma/client';
import { randomUUID } from 'crypto';
import { authenticate } from '../middleware/auth';
import {
  activateFromPayment,
  ensureGraceSubscription,
  getSubscriptionSnapshot,
} from '../services/providerSubscriptionService';

const router = Router();
const prisma = new PrismaClient();

function parseVertical(value: unknown): SubscriptionVertical | null {
  if (value === 'HOME_SERVICES' || value === 'REAL_ESTATE') return value;
  return null;
}

async function resolveProfile(userId: string, vertical: SubscriptionVertical) {
  if (vertical === 'HOME_SERVICES') {
    const provider = await prisma.serviceProvider.findUnique({ where: { userId } });
    return provider ? { serviceProviderId: provider.id, propertyAgentId: null as string | null } : null;
  }
  const agent = await prisma.propertyAgent.findUnique({ where: { userId } });
  return agent ? { serviceProviderId: null as string | null, propertyAgentId: agent.id } : null;
}

router.get('/plans', authenticate, async (req: any, res) => {
  try {
    const vertical = parseVertical(req.query.vertical);
    if (!vertical) {
      return res.status(400).json({ success: false, message: 'vertical must be HOME_SERVICES or REAL_ESTATE' });
    }
    const plans = await prisma.providerSubscriptionPlan.findMany({
      where: { vertical, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { amount: 'asc' }],
    });
    return res.json({ success: true, data: plans });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

router.get('/me', authenticate, async (req: any, res) => {
  try {
    const vertical = parseVertical(req.query.vertical);
    if (!vertical) {
      return res.status(400).json({ success: false, message: 'vertical must be HOME_SERVICES or REAL_ESTATE' });
    }
    const snapshot = await getSubscriptionSnapshot(req.user.id, vertical);
    return res.json({ success: true, data: snapshot });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

router.post('/pay', authenticate, async (req: any, res) => {
  try {
    const { planId, paymentMethodId, paymentIntentId } = req.body;
    if (!planId) return res.status(400).json({ success: false, message: 'planId is required' });

    const plan = await prisma.providerSubscriptionPlan.findFirst({
      where: { id: planId, isActive: true },
    });
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

    const profile = await resolveProfile(req.user.id, plan.vertical);
    if (!profile) {
      return res.status(403).json({
        success: false,
        message: plan.vertical === 'HOME_SERVICES'
          ? 'Must be an approved service provider'
          : 'Must be an approved property agent',
      });
    }

    const subscription = await ensureGraceSubscription(req.user.id, plan.vertical, profile);
    const amount = Number(plan.amount);
    const payment = await prisma.providerSubscriptionPayment.create({
      data: {
        subscriptionId: subscription.id,
        planId: plan.id,
        amount,
        currency: plan.currency,
        status: 'PENDING',
        gatewayProvider: paymentMethodId || null,
        paymentMethodId: paymentMethodId || null,
      },
    });

    const allowTestPayments =
      process.env.ALLOW_TEST_PAYMENTS === 'true' ||
      (process.env.NODE_ENV === 'development' && process.env.ALLOW_TEST_PAYMENTS !== 'false');

    if (paymentMethodId === 'test-payment' || paymentMethodId === 'simulate') {
      if (!allowTestPayments) {
        return res.status(403).json({
          success: false,
          message: 'Test payments are disabled. Set NODE_ENV=development or ALLOW_TEST_PAYMENTS=true.',
        });
      }
      const appTransactionId = `SUB-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
      await prisma.externalTransaction.create({
        data: {
          customerId: req.user.id,
          sellerId: req.user.id,
          gatewayProvider: 'test',
          gatewayTransactionId: `test-sub-${payment.id}`,
          paymentReference: `TEST-SUB-${payment.id}`,
          appTransactionId,
          appService: plan.vertical,
          transactionType: 'SUBSCRIPTION',
          amount,
          currencyCode: plan.currency,
          paidThroughGateway: true,
          status: 'SUCCESS',
          processedAt: new Date(),
          providerSubscriptionPaymentId: payment.id,
          gatewayResponse: { simulated: true, mode: 'development' },
        },
      });
      await activateFromPayment(payment.id);
      const snapshot = await getSubscriptionSnapshot(req.user.id, plan.vertical);
      return res.json({ success: true, message: 'Test payment processed', simulated: true, data: snapshot });
    }

    const isYonna = paymentMethodId === 'yonna-forex';
    const isWave = paymentMethodId === 'wave-gambia' || paymentMethodId === 'wave';
    if (isYonna) {
      const YonnaForexPaymentController = require('../controllers/YonnaForexPaymentController').default;
      const yonnaController = new YonnaForexPaymentController();
      return yonnaController.processPayment({
        ...req,
        body: {
          amount,
          currency: plan.currency,
          description: `${plan.name} subscription`,
          transactionId: `SUB-${payment.id}-${Date.now()}`,
          orderId: payment.id,
        },
      }, res);
    }
    if (isWave) {
      const WavePaymentController = require('../controllers/WavePaymentController').default;
      const waveController = new WavePaymentController();
      return waveController.processPayment({
        ...req,
        body: {
          amount,
          currency: plan.currency,
          description: `${plan.name} subscription`,
          orderId: payment.id,
        },
      }, res);
    }

    const appTransactionId = `SUB-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    await prisma.externalTransaction.create({
      data: {
        customerId: req.user.id,
        sellerId: req.user.id,
        gatewayProvider: 'stripe',
        gatewayTransactionId: paymentIntentId || `sub-${payment.id}`,
        paymentReference: paymentIntentId || payment.id,
        appTransactionId,
        appService: plan.vertical,
        transactionType: 'SUBSCRIPTION',
        amount,
        currencyCode: plan.currency,
        paidThroughGateway: true,
        status: 'SUCCESS',
        processedAt: new Date(),
        providerSubscriptionPaymentId: payment.id,
      },
    });
    await activateFromPayment(payment.id);
    const snapshot = await getSubscriptionSnapshot(req.user.id, plan.vertical);
    return res.json({ success: true, message: 'Payment processed', data: snapshot });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

export default router;
