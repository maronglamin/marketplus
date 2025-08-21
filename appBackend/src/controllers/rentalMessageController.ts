import { Request, Response } from 'express';
import { rentalMessageService } from '../services/rentalMessageService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class RentalMessageController {
  static async sendMessage(req: Request, res: Response) {
    try {
      const { rentalId } = req.params;
      const { content } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'User not authenticated' });
      }

      if (!content || !content.trim()) {
        return res.status(400).json({ success: false, message: 'Message content is required' });
      }

      // Verify the rental exists and user has access
      const rental = await prisma.rentalRequest.findUnique({
        where: { id: rentalId },
        include: {
          customer: true,
          driver: true,
        },
      });

      if (!rental) {
        return res.status(404).json({ success: false, message: 'Rental not found' });
      }

      // Determine sender type
      let senderType: 'CUSTOMER' | 'DRIVER';
      if (rental.customerId === userId) {
        senderType = 'CUSTOMER';
      } else {
        // Check if user is the driver for this rental
        const driver = await prisma.driver.findUnique({
          where: { userId: userId }
        });
        
        if (driver && rental.driverId === driver.id) {
          senderType = 'DRIVER';
        } else {
          return res.status(403).json({ success: false, message: 'Access denied' });
        }
      }

      const message = await rentalMessageService.createMessage({
        rentalId,
        senderId: userId,
        senderType,
        content: content.trim(),
      });

      return res.status(201).json({ success: true, data: message });
    } catch (error: any) {
      console.error('Error sending rental message:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to send message',
        error: error?.message || String(error)
      });
    }
  }

  static async getMessages(req: Request, res: Response) {
    try {
      const { rentalId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'User not authenticated' });
      }

      // Verify the rental exists and user has access
      const rental = await prisma.rentalRequest.findUnique({
        where: { id: rentalId },
        include: {
          customer: true,
          driver: true,
        },
      });

      if (!rental) {
        return res.status(404).json({ success: false, message: 'Rental not found' });
      }

      // Check if user has access to this rental
      if (rental.customerId !== userId) {
        // Check if user is the driver for this rental
        const driver = await prisma.driver.findUnique({
          where: { userId: userId }
        });
        
        if (!driver || rental.driverId !== driver.id) {
          return res.status(403).json({ success: false, message: 'Access denied' });
        }
      }

      const messages = await rentalMessageService.getMessagesByRentalId(rentalId);

      // Mark messages as read for this user
      await rentalMessageService.markMessagesAsRead(rentalId, userId);

      return res.json({ success: true, data: messages });
    } catch (error: any) {
      console.error('Error fetching rental messages:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch messages',
        error: error?.message || String(error)
      });
    }
  }

  static async markAsRead(req: Request, res: Response) {
    try {
      const { rentalId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'User not authenticated' });
      }

      // Verify the rental exists and user has access
      const rental = await prisma.rentalRequest.findUnique({
        where: { id: rentalId },
      });

      if (!rental) {
        return res.status(404).json({ success: false, message: 'Rental not found' });
      }

      // Check if user has access to this rental
      if (rental.customerId !== userId) {
        // Check if user is the driver for this rental
        const driver = await prisma.driver.findUnique({
          where: { userId: userId }
        });
        
        if (!driver || rental.driverId !== driver.id) {
          return res.status(403).json({ success: false, message: 'Access denied' });
        }
      }

      await rentalMessageService.markMessagesAsRead(rentalId, userId);

      return res.json({ success: true, message: 'Messages marked as read' });
    } catch (error: any) {
      console.error('Error marking messages as read:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to mark messages as read',
        error: error?.message || String(error)
      });
    }
  }

  static async getUnreadCount(req: Request, res: Response) {
    try {
      const { rentalId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'User not authenticated' });
      }

      // Verify the rental exists and user has access
      const rental = await prisma.rentalRequest.findUnique({
        where: { id: rentalId },
        include: {
          customer: true,
          driver: true,
        },
      });

      if (!rental) {
        return res.status(404).json({ success: false, message: 'Rental not found' });
      }

      // Check if user has access to this rental
      if (rental.customerId !== userId) {
        // Check if user is the driver for this rental
        const driver = await prisma.driver.findUnique({
          where: { userId: userId }
        });
        
        if (!driver || rental.driverId !== driver.id) {
          return res.status(403).json({ success: false, message: 'Access denied' });
        }
      }

      const unreadCount = await rentalMessageService.getUnreadMessageCount(rentalId, userId);

      return res.json({ success: true, data: { unreadCount } });
    } catch (error: any) {
      console.error('Error getting unread count:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to get unread count',
        error: error?.message || String(error)
      });
    }
  }

  static async getUnreadNotifications(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'User not authenticated' });
      }

      // Get all rental requests where the current user is the customer
      const customerRentals = await prisma.rentalRequest.findMany({
        where: {
          customerId: userId,
        },
        include: {
          rideService: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
          driver: {
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phoneNumber: true,
                },
              },
            },
          },
          messages: {
            where: {
              senderId: {
                not: userId, // Only messages from others (not from current user)
              },
            },
            include: {
              sender: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phoneNumber: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      // Also get rentals where the current user is the driver
      const driver = await prisma.driver.findUnique({
        where: { userId: userId },
      });

      let driverRentals: any[] = [];
      if (driver) {
        driverRentals = await prisma.rentalRequest.findMany({
          where: {
            driverId: driver.id,
          },
          include: {
            rideService: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
              },
            },
            messages: {
              where: {
                senderId: {
                  not: userId, // Only messages from others (not from current user)
                },
              },
              include: {
                sender: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    phoneNumber: true,
                  },
                },
              },
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
          orderBy: {
            updatedAt: 'desc',
          },
        });
      }

      // Combine and format notifications
      const notifications = [];

      // Process customer rentals
      for (const rental of customerRentals) {
        if (rental.messages.length > 0) {
          const latestMessage = rental.messages[0];
          const senderName = rental.driver 
            ? `${rental.driver.user.firstName} ${rental.driver.user.lastName}`
            : 'Driver';

          notifications.push({
            id: `customer-${rental.id}-${latestMessage.id}`,
            type: 'rental_message',
            rentalId: rental.id,
            title: 'Rental Message',
            message: `${senderName}: ${latestMessage.content}`,
            time: latestMessage.createdAt,
            read: latestMessage.isRead,
            senderName,
            rentalService: rental.rideService.name,
            pickupAddress: rental.pickupAddress,
            unreadCount: rental.messages.filter(m => !m.isRead).length,
            totalMessages: rental.messages.length,
          });
        }
      }

      // Process driver rentals
      for (const rental of driverRentals) {
        if (rental.messages.length > 0) {
          const latestMessage = rental.messages[0];
          const senderName = `${rental.customer.firstName} ${rental.customer.lastName}`;

          notifications.push({
            id: `driver-${rental.id}-${latestMessage.id}`,
            type: 'rental_message',
            rentalId: rental.id,
            title: 'Rental Message',
            message: `${senderName}: ${latestMessage.content}`,
            time: latestMessage.createdAt,
            read: latestMessage.isRead,
            senderName,
            rentalService: rental.rideService.name,
            pickupAddress: rental.pickupAddress,
            unreadCount: rental.messages.filter(m => !m.isRead).length,
            totalMessages: rental.messages.length,
          });
        }
      }

      // Sort by time (most recent first)
      notifications.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

      return res.json({ 
        success: true, 
        data: { 
          notifications,
          totalUnread: notifications.filter(n => !n.read).length,
          totalMessages: notifications.length,
        } 
      });
    } catch (error: any) {
      console.error('Error getting notifications:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to get notifications',
        error: error?.message || String(error)
      });
    }
  }
}
