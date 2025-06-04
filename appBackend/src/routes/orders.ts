import express from 'express';
import { logger } from '../utils/logger';

const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  logger.info('Orders test route hit');
  res.json({ message: 'Orders routes working!' });
});

export default router; 