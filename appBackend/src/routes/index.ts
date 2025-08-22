import { Router } from 'express';
import sellerKycRoutes from './sellerKyc';
import paymentsRoutes from './payments';
import notificationsRoutes from './notifications';
import deliveryAddressRoutes from './deliveryAddress';
import paymentGatewayServiceProviderRoutes from './paymentGatewayServiceProvider';
import riderApplicationRoutes from './riderApplication';
import riderUploadRoutes from './riderUpload';
import driverRoutes from './driver';
import rideServiceRoutes from './rideService';
import rideHistoryRoutes from './rideHistory';
import rideRequestRoutes from './rideRequests';
import paymentMethodsRoutes from './paymentMethods';
import rentalRoutes from './rental';

const router = Router();

router.use('/seller-kyc', sellerKycRoutes);
router.use('/payments', paymentsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/delivery-addresses', deliveryAddressRoutes);
router.use('/payment-gateway-service-providers', paymentGatewayServiceProviderRoutes);
router.use('/rider', riderApplicationRoutes);
router.use('/rider-upload', riderUploadRoutes);
router.use('/driver', driverRoutes);
router.use('/ride-services', rideServiceRoutes);
router.use('/ride-history', rideHistoryRoutes);
router.use('/ride-requests', rideRequestRoutes);
router.use('/payment-methods', paymentMethodsRoutes);
router.use('/rental-requests', rentalRoutes);

export default router; 