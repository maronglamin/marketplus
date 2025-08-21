import express from 'express';
import { RentalMessageController } from '../controllers/rentalMessageController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Send a message to a rental chat
router.post('/:rentalId/messages', authenticate, RentalMessageController.sendMessage);

// Get all messages for a rental
router.get('/:rentalId/messages', authenticate, RentalMessageController.getMessages);

// Mark messages as read for a rental
router.patch('/:rentalId/messages/read', authenticate, RentalMessageController.markAsRead);

// Get unread message count for a rental
router.get('/:rentalId/messages/unread', authenticate, RentalMessageController.getUnreadCount);

// Get all notifications for the current user (both read and unread)
router.get('/notifications/all', authenticate, RentalMessageController.getUnreadNotifications);

export default router;
