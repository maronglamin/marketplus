import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import WavePaymentController from '../controllers/WavePaymentController';
import waveWebhookRoutes from './waveWebhookRoutes';

const router = Router();
const controller = new WavePaymentController();

/**
 * @route POST /api/payments/wave-gambia/process
 * @desc Create Wave checkout session
 * @access Private
 */
router.post('/process', authenticate, (req, res) => controller.processPayment(req, res));

/**
 * @route GET /api/payments/wave-gambia/sessions/:id
 * @desc Get Wave checkout session by id
 * @access Private
 */
router.get('/sessions/:id', authenticate, (req, res) => controller.getSession(req, res));

/**
 * @route POST /api/payments/wave-gambia/sessions/:id/expire
 * @desc Expire Wave checkout session
 * @access Private
 */
router.post('/sessions/:id/expire', authenticate, (req, res) => controller.expireSession(req, res));

/**
 * @route POST /api/payments/wave-gambia/sessions/:id/refund
 * @desc Refund Wave checkout session
 * @access Private
 */
router.post('/sessions/:id/refund', authenticate, (req, res) => controller.refundSession(req, res));

/**
 * @route GET /api/payments/wave-gambia/currencies
 * @desc Supported currencies
 * @access Public
 */
router.get('/currencies', (req, res) => controller.getSupportedCurrencies(req, res));

/**
 * @route GET /api/payments/wave-gambia/check-transactions/:orderId
 * @desc Check existing external transactions for order
 * @access Private
 */
router.get('/check-transactions/:orderId', authenticate, (req, res) =>
  controller.checkExistingTransactions(req, res)
);

// Webhook route (public)
router.use('/', waveWebhookRoutes);

export default router;


