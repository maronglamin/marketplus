import express from 'express';
import { logger } from '../utils/logger';

const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  logger.info('Products test route hit');
  res.json({ message: 'Products routes working!' });
});

export default router; 