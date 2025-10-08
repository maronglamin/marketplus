import { Router } from 'express';
import YonnaForexWebhookController from '../controllers/YonnaForexWebhookController';
import { getWebhookConfig, getWebhookUrls } from '../utils/webhookConfig';

const router = Router();
const webhookController = new YonnaForexWebhookController();

/**
 * @route POST /api/payments/yonna-forex/test-webhook
 * @desc Test webhook endpoint for development
 * @access Public (for testing only)
 */
router.post('/test-webhook', (req, res) => {
  // Create a test payload
  const testPayload = {
    appTransactionId: req.body.appTransactionId || 'APP_TEST_' + Date.now(),
    status: req.body.status || 'completed',
    amount: req.body.amount || 100.00,
    currency: req.body.currency || 'GMD',
    phoneNumber: req.body.phoneNumber || '+220123456789',
    timestamp: new Date().toISOString(),
    message: req.body.message || 'Test webhook notification',
    error: req.body.error || null
  };

  // Call the webhook handler
  req.body = testPayload;
  webhookController.handleWebhook(req, res);
});

/**
 * @route GET /api/payments/yonna-forex/test-webhook
 * @desc Get test webhook information
 * @access Public (for testing only)
 */
router.get('/test-webhook', (req, res) => {
  const config = getWebhookConfig();
  const urls = getWebhookUrls();
  
  res.json({
    success: true,
    message: 'Yonna Forex Webhook Test Endpoint',
    webhookUrl: config.webhookUrl,
    primaryUrl: urls.primary,
    fallbackUrl: urls.fallback,
    testUrl: config.testUrl,
    examplePayload: {
      transactionId: 'YF_TEST_123456789',
      status: 'completed',
      amount: 100.00,
      currency: 'GMD',
      phoneNumber: '+220123456789',
      timestamp: new Date().toISOString(),
      message: 'Test payment completed'
    },
    instructions: {
      step1: 'POST to /test-webhook with your test data',
      step2: 'Or use the example payload above',
      step3: 'Check the response and logs for debugging'
    },
    configuration: {
      usingEnvironmentVariable: !!process.env.API_BASE_URL,
      environment: process.env.NODE_ENV || 'development',
      currentBaseUrl: config.baseUrl
    }
  });
});

export default router;
