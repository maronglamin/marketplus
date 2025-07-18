import { Router } from 'express';
import sellerKycRoutes from './sellerKyc';
import paymentsRoutes from './payments';
import notificationsRoutes from './notifications';
import deliveryAddressRoutes from './deliveryAddress';
import paymentGatewayServiceProviderRoutes from './paymentGatewayServiceProvider';

const router = Router();

router.use('/seller-kyc', sellerKycRoutes);
router.use('/payments', paymentsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/delivery-addresses', deliveryAddressRoutes);
router.use('/payment-gateway-service-providers', paymentGatewayServiceProviderRoutes);

export default router; 