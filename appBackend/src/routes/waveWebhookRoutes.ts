import { Router } from 'express';
import WaveWebhookController from '../controllers/WaveWebhookController';

const router = Router();
const controller = new WaveWebhookController();

// Raw body is provided by app-level middleware in app.ts
router.post('/webhook', (req, res) => {
  (req as any).rawBody = Buffer.isBuffer((req as any).body)
    ? (req as any).body.toString()
    : (req as any).rawBody || '';
  controller.handleWebhook(req, res);
});

export default router;


