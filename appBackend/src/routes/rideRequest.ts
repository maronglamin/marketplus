import express from 'express';
import { RideRequestController } from '../controllers/rideRequest';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Create a new ride request
router.post('/', RideRequestController.createRideRequest);

// Get customer's active ride requests
router.get('/customer/active', RideRequestController.getCustomerRideRequests);

// Get all customer ride requests (including completed, cancelled, etc.)
router.get('/customer/all', RideRequestController.getAllCustomerRideRequests);

// Get nearby drivers
router.get('/nearby-drivers', RideRequestController.getNearbyDrivers);

// Get nearby ride requests for drivers
router.get('/nearby-requests', RideRequestController.getNearbyRideRequests);

// Get online drivers for map display
router.get('/online-drivers/map', RideRequestController.getOnlineDriversForMap);

// Get ride request by request ID (must be last to avoid conflicts)
router.get('/:requestId', RideRequestController.getRideRequest);

// Cancel ride request
router.post('/:requestId/cancel', RideRequestController.cancelRideRequest);

// Accept ride request by driver
router.post('/:requestId/accept', RideRequestController.acceptRideRequest);

export default router; 