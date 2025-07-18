import express from 'express';
import {
  getUserDeliveryAddresses,
  createDeliveryAddress,
  updateDeliveryAddress,
  deleteDeliveryAddress,
  setDefaultDeliveryAddress
} from '../controllers/deliveryAddress';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all delivery addresses for the authenticated user
router.get('/', getUserDeliveryAddresses);

// Create a new delivery address
router.post('/', createDeliveryAddress);

// Update a delivery address
router.put('/:addressId', updateDeliveryAddress);

// Delete a delivery address
router.delete('/:addressId', deleteDeliveryAddress);

// Set default delivery address
router.patch('/:addressId/default', setDefaultDeliveryAddress);

export default router; 