import { Router } from 'express';
import sellerKycRoutes from './sellerKyc';

const router = Router();

router.use('/seller-kyc', sellerKycRoutes);

export default router; 