import { Router } from 'express';
import sellerKycRoutes from './sellerKyc';
import paymentsRoutes from './payments';
import notificationsRoutes from './notifications';

const router = Router();

router.use('/seller-kyc', sellerKycRoutes);
router.use('/payments', paymentsRoutes);
router.use('/notifications', notificationsRoutes);

export default router; 