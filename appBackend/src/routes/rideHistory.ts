import express from 'express';
import { RideHistoryController } from '../controllers/rideHistory';
import { authenticate } from '../middleware/auth';
import { RideTokenService } from '../services/rideTokenService';

const router = express.Router();

// Get driver's ride history
router.get('/driver', authenticate, RideHistoryController.getDriverRideHistory);

// Get customer's ride history
router.get('/customer', authenticate, RideHistoryController.getCustomerRideHistory);

// Get customer's recent destinations
router.get('/customer/recent-destinations', authenticate, RideHistoryController.getCustomerRecentDestinations);

// Generate token for a ride
router.post('/rides/:rideId/generate-token', authenticate, RideHistoryController.generateRideToken);

// Get active tokens for customer
router.get('/customer/active-tokens', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    
    const activeTokens = await RideTokenService.getActiveTokensForCustomer(userId);
    
    res.json({
      success: true,
      data: activeTokens
    });
  } catch (error) {
    console.error('Error fetching active tokens:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active tokens',
    });
  }
});

// Start ride with token validation
router.post('/rides/:rideId/start', authenticate, RideHistoryController.startRide);

// Get ride details
router.get('/rides/:rideId', authenticate, RideHistoryController.getRideDetails);

// Complete ride
router.post('/rides/:rideId/complete', authenticate, RideHistoryController.completeRide);

// Cancel ride
router.post('/rides/:rideId/cancel', authenticate, RideHistoryController.cancelRide);

export default router; 