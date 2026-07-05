import { Router, Request, Response } from 'express';
import YonnaForexPaymentController from '../controllers/YonnaForexPaymentController';
import yonnaForexWebhookRoutes from './yonnaForexWebhookRoutes';
import yonnaForexTestRoutes from './yonnaForexTestRoutes';
import { authenticate } from '../middleware/auth';

const router = Router();

const isYonnaConfigured = (): boolean =>
  Boolean(process.env.YONNA_FOREX_API_URL?.trim()) &&
  Boolean(process.env.YONNA_FOREX_SECRET_KEY?.trim()) &&
  Boolean(process.env.YONNA_FOREX_CLIENT_ID?.trim());

let yonnaForexController: YonnaForexPaymentController | null = null;

const getController = (): YonnaForexPaymentController | null => {
  if (!isYonnaConfigured()) {
    return null;
  }
  if (!yonnaForexController) {
    yonnaForexController = new YonnaForexPaymentController();
  }
  return yonnaForexController;
};

const serviceUnavailable = (_req: Request, res: Response): void => {
  res.status(503).json({
    success: false,
    message: 'Yonna Forex is not configured. Set YONNA_FOREX_API_URL, YONNA_FOREX_SECRET_KEY, and YONNA_FOREX_CLIENT_ID.',
  });
};

/**
 * @route POST /api/payments/yonna-forex/process
 * @desc Process payment through Yonna Forex
 * @access Private (requires authentication)
 */
router.post('/process', authenticate, (req, res) => {
  const controller = getController();
  if (!controller) return serviceUnavailable(req, res);
  controller.processPayment(req, res);
});

/**
 * @route POST /api/payments/yonna-forex/verify
 * @desc Verify payment status
 * @access Private (requires authentication)
 */
router.post('/verify', authenticate, (req, res) => {
  const controller = getController();
  if (!controller) return serviceUnavailable(req, res);
  controller.verifyPayment(req, res);
});

/**
 * @route GET /api/payments/yonna-forex/status/:transactionId
 * @desc Get payment status by transaction ID
 * @access Private (requires authentication)
 */
router.get('/status/:transactionId', authenticate, (req, res) => {
  const controller = getController();
  if (!controller) return serviceUnavailable(req, res);
  controller.getPaymentStatus(req, res);
});

/**
 * @route GET /api/payments/yonna-forex/currencies
 * @desc Get supported currencies
 * @access Public
 */
router.get('/currencies', (req, res) => {
  const controller = getController();
  if (!controller) return serviceUnavailable(req, res);
  controller.getSupportedCurrencies(req, res);
});

/**
 * @route GET /api/payments/yonna-forex/check-transactions/:orderId
 * @desc Check if order has existing external transactions
 * @access Private (requires authentication)
 */
router.get('/check-transactions/:orderId', authenticate, (req, res) => {
  const controller = getController();
  if (!controller) return serviceUnavailable(req, res);
  controller.checkExistingTransactions(req, res);
});

// Include webhook routes
router.use('/', yonnaForexWebhookRoutes);

// Include test routes (only in development)
if (process.env.NODE_ENV === 'development') {
  router.use('/', yonnaForexTestRoutes);
}

export default router;
