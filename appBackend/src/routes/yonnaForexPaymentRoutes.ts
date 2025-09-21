import { Router } from 'express';
import YonnaForexPaymentController from '../controllers/YonnaForexPaymentController';
import yonnaForexWebhookRoutes from './yonnaForexWebhookRoutes';
import yonnaForexTestRoutes from './yonnaForexTestRoutes';
import { authenticate } from '../middleware/auth';

const router = Router();
const yonnaForexController = new YonnaForexPaymentController();

/**
 * @route POST /api/payments/yonna-forex/process
 * @desc Process payment through Yonna Forex
 * @access Private (requires authentication)
 */
router.post('/process', authenticate, (req, res) => {
  yonnaForexController.processPayment(req, res);
});

/**
 * @route POST /api/payments/yonna-forex/verify
 * @desc Verify payment status
 * @access Private (requires authentication)
 */
router.post('/verify', authenticate, (req, res) => {
  yonnaForexController.verifyPayment(req, res);
});

/**
 * @route GET /api/payments/yonna-forex/status/:transactionId
 * @desc Get payment status by transaction ID
 * @access Private (requires authentication)
 */
router.get('/status/:transactionId', authenticate, (req, res) => {
  yonnaForexController.getPaymentStatus(req, res);
});

/**
 * @route GET /api/payments/yonna-forex/currencies
 * @desc Get supported currencies
 * @access Public
 */
router.get('/currencies', (req, res) => {
  yonnaForexController.getSupportedCurrencies(req, res);
});

/**
 * @route GET /api/payments/yonna-forex/check-transactions/:orderId
 * @desc Check if order has existing external transactions
 * @access Private (requires authentication)
 */
router.get('/check-transactions/:orderId', authenticate, (req, res) => {
  yonnaForexController.checkExistingTransactions(req, res);
});

// Include webhook routes
router.use('/', yonnaForexWebhookRoutes);

// Include test routes (only in development)
if (process.env.NODE_ENV === 'development') {
  router.use('/', yonnaForexTestRoutes);
}

export default router;
