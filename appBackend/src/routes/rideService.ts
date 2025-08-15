import { Router } from 'express';
import { RideServiceController } from '../controllers/rideService';
import { authenticate } from '../middleware/auth';

const router = Router();

// Get all active ride services
router.get('/', RideServiceController.getActiveServices);

// Get ride services with online drivers nearby
router.get('/with-online-drivers', RideServiceController.getServicesWithOnlineDrivers);

// Get surge multiplier
router.get('/surge-multiplier', RideServiceController.getSurgeMultiplier);

// Get time status
router.get('/time-status', RideServiceController.getTimeStatus);

// Calculate fare
router.post('/calculate-fare', RideServiceController.calculateFare);

// Get default service for vehicle type
router.get('/default/:vehicleType', RideServiceController.getDefaultService);

// Get service by ID (must be last to avoid conflicts)
router.get('/:serviceId', RideServiceController.getServiceById);

// Create new service (requires authentication)
router.post('/', authenticate, RideServiceController.createService);

export default router; 