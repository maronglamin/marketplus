import express from 'express';
import {
  getPaymentGatewayServiceProviders,
  getPaymentGatewayServiceProviderById,
  createPaymentGatewayServiceProvider,
  updatePaymentGatewayServiceProvider,
  deletePaymentGatewayServiceProvider
} from '../controllers/paymentGatewayServiceProvider';

const router = express.Router();

// Get all payment gateway service providers (public)
router.get('/', getPaymentGatewayServiceProviders);

// Get payment gateway service provider by ID (public)
router.get('/:id', getPaymentGatewayServiceProviderById);

// Create payment gateway service provider (admin only)
router.post('/', createPaymentGatewayServiceProvider);

// Update payment gateway service provider (admin only)
router.put('/:id', updatePaymentGatewayServiceProvider);

// Delete payment gateway service provider (admin only)
router.delete('/:id', deletePaymentGatewayServiceProvider);

export default router; 