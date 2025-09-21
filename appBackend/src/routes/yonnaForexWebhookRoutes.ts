import { Router } from 'express';
import YonnaForexWebhookController from '../controllers/YonnaForexWebhookController';

const router = Router();
const webhookController = new YonnaForexWebhookController();

/**
 * @route POST /api/payments/yonna-forex/webhook
 * @desc Handle Yonna Forex webhook notifications
 * @access Public (but should be secured with signature verification)
 */
router.post('/webhook', (req, res) => {
  webhookController.handleWebhook(req, res);
});

/**
 * @route GET /api/payments/yonna-forex/webhook/status
 * @desc Get webhook status and recent events
 * @access Private (for debugging)
 */
router.get('/webhook/status', (req, res) => {
  webhookController.getWebhookStatus(req, res);
});

export default router;
