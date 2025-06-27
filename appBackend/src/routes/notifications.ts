import express from 'express';
import { notificationService } from '../services/notificationService';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Save FCM token for a user
router.post('/fcm-token', authenticate, async (req, res) => {
  try {
    const { token, userId, deviceType } = req.body;

    if (!token || !userId || !deviceType) {
      return res.status(400).json({
        error: 'Missing required fields: token, userId, deviceType'
      });
    }

    const fcmToken = await notificationService.saveFCMToken(userId, token, deviceType);

    res.json({
      success: true,
      message: 'FCM token saved successfully',
      data: fcmToken
    });
  } catch (error) {
    console.error('Error saving FCM token:', error);
    res.status(500).json({
      error: 'Failed to save FCM token'
    });
  }
});

// Remove FCM token
router.delete('/fcm-token', authenticate, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Missing required field: token'
      });
    }

    await notificationService.removeFCMToken(token);

    res.json({
      success: true,
      message: 'FCM token removed successfully'
    });
  } catch (error) {
    console.error('Error removing FCM token:', error);
    res.status(500).json({
      error: 'Failed to remove FCM token'
    });
  }
});

// Get FCM tokens for a user
router.get('/fcm-tokens/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        error: 'Missing required parameter: userId'
      });
    }

    const tokens = await notificationService.getUserFCMTokens(userId);

    res.json({
      success: true,
      data: tokens
    });
  } catch (error) {
    console.error('Error getting FCM tokens:', error);
    res.status(500).json({
      error: 'Failed to get FCM tokens'
    });
  }
});

// Send test notification
router.post('/test', authenticate, async (req, res) => {
  try {
    const { userId, title, body } = req.body;

    if (!userId || !title || !body) {
      return res.status(400).json({
        error: 'Missing required fields: userId, title, body'
      });
    }

    const success = await notificationService.sendNotificationToUser(userId, {
      title,
      body,
      data: {
        type: 'test_notification'
      }
    });

    if (success) {
      res.json({
        success: true,
        message: 'Test notification sent successfully'
      });
    } else {
      res.status(400).json({
        error: 'Failed to send test notification. User may not have FCM tokens registered.'
      });
    }
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({
      error: 'Failed to send test notification'
    });
  }
});

export default router; 