import express from 'express';
import { RideRequestService } from '../services/rideRequestService';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validators';
import { RideRequestController } from '../controllers/rideRequest';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Get nearby ride requests for drivers
router.get('/nearby-requests', RideRequestController.getNearbyRideRequests);

// Get nearby drivers
router.get('/nearby-drivers', RideRequestController.getNearbyDrivers);

// Get online drivers for map display
router.get('/online-drivers/map', RideRequestController.getOnlineDriversForMap);

// Create ride request
router.post('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      pickupLocation,
      destinationLocation,
      rideType = 'STANDARD',
      rideServiceId,
      estimatedPrice,
      estimatedDistance,
      estimatedDuration,
      currency,
      currencySymbol,
      paymentMethod = 'CARD',
      customerNotes
    } = req.body;

    // Validate required fields
    if (!pickupLocation || !destinationLocation) {
      return res.status(400).json({ error: 'Pickup and destination locations are required' });
    }

    if (!pickupLocation.latitude || !pickupLocation.longitude || !pickupLocation.address) {
      return res.status(400).json({ error: 'Invalid pickup location' });
    }

    if (!destinationLocation.latitude || !destinationLocation.longitude || !destinationLocation.address) {
      return res.status(400).json({ error: 'Invalid destination location' });
    }

    const rideRequestData = {
      customerId: userId,
      pickupLocation: {
        latitude: parseFloat(pickupLocation.latitude),
        longitude: parseFloat(pickupLocation.longitude),
        address: pickupLocation.address
      },
      destinationLocation: {
        latitude: parseFloat(destinationLocation.latitude),
        longitude: parseFloat(destinationLocation.longitude),
        address: destinationLocation.address
      },
      rideType: rideType as any,
      rideServiceId,
      estimatedPrice: estimatedPrice ? parseFloat(estimatedPrice) : undefined,
      estimatedDistance: estimatedDistance ? parseFloat(estimatedDistance) : undefined,
      estimatedDuration: estimatedDuration ? parseInt(estimatedDuration) : undefined,
      currency,
      currencySymbol,
      paymentMethod: paymentMethod as any,
      customerNotes
    };

    console.log('🚗 Creating ride request with data:', {
      customerId: userId,
      rideServiceId,
      estimatedPrice: estimatedPrice ? parseFloat(estimatedPrice) : undefined,
      estimatedDistance: estimatedDistance ? parseFloat(estimatedDistance) : undefined,
      estimatedDuration: estimatedDuration ? parseInt(estimatedDuration) : undefined,
      currency,
      currencySymbol
    });

    const rideRequest = await RideRequestService.createRideRequest(rideRequestData);
    res.json({ success: true, data: rideRequest });
  } catch (error: any) {
    console.error('Error creating ride request:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get ride request by ID
router.get('/:requestId', async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { requestId } = req.params;
    const rideRequest = await RideRequestService.getRideRequestByRequestId(requestId);
    
    if (!rideRequest) {
      return res.status(404).json({ error: 'Ride request not found' });
    }
    
    // Check if user is authorized to view this request
    if (rideRequest.customerId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json({ success: true, data: rideRequest });
  } catch (error: any) {
    console.error('Error getting ride request:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get customer's ride requests
router.get('/customer/history', async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const rideRequests = await RideRequestService.getAllCustomerRideRequests(userId);
    
    res.json({ success: true, data: rideRequests });
  } catch (error: any) {
    console.error('Error getting customer ride requests:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Cancel ride request
router.post('/:requestId/cancel', async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { requestId } = req.params;
    const { reason } = req.body;

    const cancelledRequest = await RideRequestService.cancelRideRequest(requestId, 'customer', reason);
    res.json({ success: true, data: cancelledRequest });
  } catch (error: any) {
    console.error('Error cancelling ride request:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// TODO: Update ride status (for customers) - Method not implemented yet
// router.post('/ride/:rideId/status', async (req: AuthRequest, res) => {
//   try {
//     const userId = req.user?.id;
//     if (!userId) {
//       return res.status(401).json({ error: 'Unauthorized' });
//     }

//     const { rideId } = req.params;
//     const { status } = req.body;

//     if (!status) {
//       return res.status(400).json({ error: 'Status is required' });
//     }

//     const updatedRide = await RideRequestService.updateRideStatus(rideId, status, userId, 'customer');
//     res.json({ success: true, data: updatedRide });
//   } catch (error: any) {
//     console.error('Error updating ride status:', error);
//     res.status(500).json({ error: error.message || 'Internal server error' });
//   }
// });

// TODO: Rate ride (for customers) - Method not implemented yet
// router.post('/ride/:rideId/rate', async (req: AuthRequest, res) => {
//   try {
//     const userId = req.user?.id;
//     if (!userId) {
//       return res.status(401).json({ error: 'Unauthorized' });
//     }

//     const { rideId } = req.params;
//     const { rating, review } = req.body;

//     if (!userId) {
//       return res.status(401).json({ error: 'Unauthorized' });
//     }

//     const { rideId } = req.params;
//     const { rating, review } = req.body;

//     if (!rating || rating < 1 || rating > 5) {
//       return res.status(400).json({ error: 'Rating must be between 1 and 5' });
//     }

//     const updatedRide = await RideRequestService.rateRide(rideId, rating, review || '', userId, 'customer');
//     res.json({ success: true, data: updatedRide });
//   } catch (error: any) {
//     console.error('Error rating ride:', error);
//     res.status(500).json({ error: error.message || 'Internal server error' });
//   }
// });

// Process ride payment
router.post('/:requestId/process-payment', async (req: AuthRequest, res) => {
  try {
    console.log('🎯 Processing ride payment for request:', req.params.requestId);
    
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { requestId } = req.params;
    const { paymentIntentId, paymentMethod, amount } = req.body;

    console.log('Payment data received:', {
      requestId,
      paymentIntentId,
      paymentMethod,
      amount,
      userId
    });

    if (!paymentIntentId || !paymentMethod || !amount) {
      return res.status(400).json({ error: 'Missing required fields: paymentIntentId, paymentMethod, amount' });
    }

    // Get the ride request first
    const rideRequest = await RideRequestService.getRideRequestByRequestId(requestId);
    if (!rideRequest) {
      console.error('Ride request not found:', requestId);
      return res.status(404).json({ error: 'Ride request not found' });
    }

    // Check if this is a Yonna or Wave payment
    const isYonnaPayment = paymentMethod === 'YONNA_FOREX' || paymentMethod === 'yonna-forex';
    const isWavePayment = paymentMethod === 'WAVE_GAMBIA' || paymentMethod === 'wave-gambia' || paymentMethod === 'wave';

    // Handle Yonna payment
    if (isYonnaPayment) {
      console.log('💰 Processing Yonna payment for ride request:', requestId);
      
      // For Yonna payments, we need to process through the Yonna Forex service
      const YonnaForexPaymentController = require('../controllers/YonnaForexPaymentController');
      const yonnaController = new YonnaForexPaymentController();
      
      // Create a mock request object for Yonna controller
      const yonnaReq = {
        ...req,
        body: {
          amount: amount,
          currency: rideRequest.currency || 'GMD',
          description: `Ride payment for ${requestId}`,
          transactionId: `RIDE-${requestId}-${Date.now()}`,
          orderId: requestId // Pass requestId as orderId for Yonna controller
        }
      };

      // Process through Yonna
      return yonnaController.processPayment(yonnaReq, res);
    }

    // Handle Wave Gambia payment
    if (isWavePayment) {
      console.log('💰 Processing Wave payment for ride request:', requestId);
      const WavePaymentController = require('../controllers/WavePaymentController').default;
      const waveController = new WavePaymentController();
      const waveReq = {
        ...req,
        body: {
          amount: amount,
          currency: rideRequest.currency || 'GMD',
          description: `Ride payment for ${requestId}`,
          orderId: requestId
        }
      };
      return waveController.processPayment(waveReq, res);
    }

    console.log('Found ride request:', {
      requestId: rideRequest.requestId,
      customerId: rideRequest.customerId,
      status: rideRequest.status,
      paymentMethod: rideRequest.paymentMethod
    });

    // Verify the user owns this ride request
    if (rideRequest.customerId !== userId) {
      console.error('User not authorized for ride request:', { userId, rideRequestCustomerId: rideRequest.customerId });
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Create external transaction records and update ride/ride request payment status
    console.log('Creating ride payment transactions...');
    const originalTransaction = await RideRequestService.createRidePaymentTransaction({
      requestId,
      paymentIntentId,
      paymentMethod,
      amount,
      customerId: userId,
      currency: rideRequest.currency || 'GMD'
    });

    console.log('✅ Ride payment processed successfully with 3 transactions:', {
      originalTransactionId: originalTransaction.id,
      requestId,
      amount,
      currency: rideRequest.currency || 'GMD'
    });

    res.json({ 
      success: true, 
      data: { 
        transactionId: originalTransaction.id,
        message: 'Payment processed successfully with all transaction records created' 
      } 
    });
  } catch (error: any) {
    console.error('❌ Error processing ride payment:', error);
    res.status(500).json({ 
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Rate ride
router.post('/:requestId/rate', async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { requestId } = req.params;
    const { rating, review } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Get the ride request to verify ownership
    const rideRequest = await RideRequestService.getRideRequestByRequestId(requestId);
    if (!rideRequest) {
      return res.status(404).json({ error: 'Ride request not found' });
    }

    console.log('🔍 Rating request - Ride request found:', {
      requestId: rideRequest.requestId,
      customerId: rideRequest.customerId,
      userId,
      hasRide: !!rideRequest.ride,
      rideId: rideRequest.ride?.id,
      rideStatus: rideRequest.ride?.status
    });

    if (rideRequest.customerId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Check if ride exists
    if (!rideRequest.ride) {
      // If no ride exists, we can't rate it
      console.log('❌ No ride found for request:', requestId);
      return res.status(400).json({ error: 'No ride found for this request. Please contact support if you believe this is an error.' });
    }

    // Check if ride is completed
    if (rideRequest.ride.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Cannot rate a ride that is not completed' });
    }

    // Update the ride with customer rating
    const updatedRide = await RideRequestService.rateRide(rideRequest.ride.id, rating, review || '', userId, 'customer');
    res.json({ success: true, data: updatedRide });
  } catch (error: any) {
    console.error('Error rating ride:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Create a direct driver request (target a specific driver)
router.post('/direct-driver', async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const {
      pickupLocation,
      destinationLocation,
      rideType = 'STANDARD',
      rideServiceId,
      estimatedPrice,
      estimatedDistance,
      estimatedDuration,
      currency,
      currencySymbol,
      paymentMethod = 'CASH',
      customerNotes,
      driverId, // targeted driver
    } = req.body;

    // Validate required fields
    if (!pickupLocation || !destinationLocation) {
      return res.status(400).json({ success: false, message: 'Pickup and destination locations are required' });
    }
    if (!driverId) {
      return res.status(400).json({ success: false, message: 'driverId is required for direct driver request' });
    }

    // Prevent requesting yourself
    const { PrismaClient } = await import('@prisma/client');
    const prismaClient = new PrismaClient();
    const targetDriver = await prismaClient.driver.findUnique({
      where: { id: driverId },
      select: { userId: true }
    });
    if (!targetDriver) {
      await prismaClient.$disconnect().catch(() => {});
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }
    if (targetDriver.userId === userId) {
      await prismaClient.$disconnect().catch(() => {});
      return res.status(403).json({ success: false, message: 'You cannot request yourself' });
    }

    // Build payload for service
    const rideRequestData = {
      customerId: userId,
      pickupLocation: {
        latitude: parseFloat(pickupLocation.latitude),
        longitude: parseFloat(pickupLocation.longitude),
        address: pickupLocation.address
      },
      destinationLocation: {
        latitude: parseFloat(destinationLocation.latitude),
        longitude: parseFloat(destinationLocation.longitude),
        address: destinationLocation.address
      },
      rideType: rideType as any,
      rideServiceId,
      estimatedPrice: estimatedPrice ? parseFloat(estimatedPrice) : undefined,
      estimatedDistance: estimatedDistance ? parseFloat(estimatedDistance) : undefined,
      estimatedDuration: estimatedDuration ? parseInt(estimatedDuration) : undefined,
      currency,
      currencySymbol,
      paymentMethod: paymentMethod as any,
      customerNotes: customerNotes ? String(customerNotes) : undefined
    };

    // Create standard request
    const request = await RideRequestService.createRideRequest(rideRequestData);

    // Attach targeted driver (keep status REQUESTED to avoid treating as accepted)
    const updated = await prismaClient.rideRequest.update({
      where: { id: request.id },
      data: { driverId: driverId }
    });
    await prismaClient.$disconnect().catch(() => {});

    // Optionally, notify the targeted driver via WebSocket (best-effort)
    try {
      const webSocketService = (global as any).webSocketService;
      if (webSocketService && updated) {
        await webSocketService.sendTargetedRideRequest?.({
          requestId: updated.requestId,
          driverId,
          customerId: updated.customerId,
          pickupLocation: updated.pickupLocation,
          destinationLocation: updated.destinationLocation
        });
      }
    } catch (wsErr) {
      console.warn('⚠️ Failed to send targeted ride request notification:', wsErr);
    }

    return res.json({
      success: true,
      data: {
        ...updated,
      }
    });
  } catch (error: any) {
    console.error('Error creating direct driver request:', error);
    return res.status(500).json({ success: false, message: 'Failed to create direct driver request', error: error?.message || String(error) });
  }
});

export default router; 