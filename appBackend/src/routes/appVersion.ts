import { Router } from 'express';
import { config } from '../config';
import { logger } from '../utils/logger';

const router = Router();

router.get('/version', (_req, res) => {
  try {
    const payload = {
      latest: {
        ios: config.appVersion.latest.ios,
        android: config.appVersion.latest.android,
      },
      minSupported: {
        ios: config.appVersion.minSupported.ios,
        android: config.appVersion.minSupported.android,
      },
      mandatory: config.appVersion.mandatory,
      message: config.appVersion.message,
      storeUrl: {
        ios: config.appVersion.storeUrl.ios,
        android: config.appVersion.storeUrl.android,
      },
      requireExact: config.appVersion.requireExact,
      updatedAt: new Date().toISOString(),
    };
    return res.status(200).json(payload);
  } catch (error) {
    logger.error('Error returning app version info:', error);
    return res.status(500).json({ error: 'Failed to load version info' });
  }
});

export default router;


