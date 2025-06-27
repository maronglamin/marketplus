import { messaging } from '../config/firebase';

export interface NotificationData {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

export interface FCMToken {
  id: string;
  token: string;
  userId: string;
  deviceType: 'ios' | 'android' | 'web';
  createdAt: Date;
  updatedAt: Date;
}

// In-memory storage for FCM tokens (replace with database later)
const fcmTokens = new Map<string, FCMToken>();

// Check if Firebase is properly configured
const isFirebaseConfigured = () => {
  return process.env.FIREBASE_PROJECT_ID && 
         process.env.FIREBASE_PRIVATE_KEY && 
         process.env.FIREBASE_CLIENT_EMAIL;
};

class NotificationService {
  /**
   * Save FCM token for a user
   */
  async saveFCMToken(userId: string, token: string, deviceType: string): Promise<FCMToken> {
    const tokenId = `${userId}_${deviceType}`;
    const existingToken = fcmTokens.get(tokenId);

    if (existingToken) {
      // Update existing token
      const updatedToken: FCMToken = {
        ...existingToken,
        token,
        updatedAt: new Date(),
      };
      fcmTokens.set(tokenId, updatedToken);
      return updatedToken;
    } else {
      // Create new token
      const newToken: FCMToken = {
        id: tokenId,
        userId,
        token,
        deviceType: deviceType as 'ios' | 'android' | 'web',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      fcmTokens.set(tokenId, newToken);
      return newToken;
    }
  }

  /**
   * Remove FCM token
   */
  async removeFCMToken(token: string): Promise<void> {
    for (const [key, value] of fcmTokens.entries()) {
      if (value.token === token) {
        fcmTokens.delete(key);
        break;
      }
    }
  }

  /**
   * Get all FCM tokens for a user
   */
  async getUserFCMTokens(userId: string): Promise<FCMToken[]> {
    return Array.from(fcmTokens.values()).filter(token => token.userId === userId);
  }

  /**
   * Send notification to a specific user
   */
  async sendNotificationToUser(
    userId: string,
    notification: NotificationData
  ): Promise<boolean> {
    try {
      // Check if Firebase is configured
      if (!isFirebaseConfigured()) {
        console.log('Firebase not configured, skipping notification send');
        return false;
      }

      const tokens = await this.getUserFCMTokens(userId);
      
      if (tokens.length === 0) {
        console.log(`No FCM tokens found for user ${userId}`);
        return false;
      }

      const messages = tokens.map((tokenData) => ({
        token: tokenData.token,
        notification: {
          title: notification.title,
          body: notification.body,
          image: notification.imageUrl,
        },
        data: notification.data || {},
        android: {
          priority: 'high' as const,
          notification: {
            channelId: 'default',
            priority: 'high' as const,
            defaultSound: true,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      }));

      // Send messages one by one since sendAll is not available
      let successCount = 0;
      let failureCount = 0;
      const failedTokens: string[] = [];

      for (const message of messages) {
        try {
          await messaging.send(message);
          successCount++;
        } catch (error) {
          console.error('Failed to send message to token:', message.token, error);
          failureCount++;
          failedTokens.push(message.token);
        }
      }
      
      console.log(`Successfully sent notifications to user ${userId}:`, {
        successCount,
        failureCount,
      });

      // Remove failed tokens
      for (const failedToken of failedTokens) {
        await this.removeFCMToken(failedToken);
      }

      return successCount > 0;
    } catch (error) {
      console.error('Error sending notification to user:', error);
      return false;
    }
  }

  /**
   * Send notification to multiple users
   */
  async sendNotificationToUsers(
    userIds: string[],
    notification: NotificationData
  ): Promise<{ successCount: number; failureCount: number }> {
    let successCount = 0;
    let failureCount = 0;

    for (const userId of userIds) {
      const success = await this.sendNotificationToUser(userId, notification);
      if (success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    return { successCount, failureCount };
  }

  /**
   * Send message notification to seller
   */
  async sendMessageNotificationToSeller(
    sellerId: string,
    buyerName: string,
    productName: string,
    messagePreview: string,
    interestId: string
  ): Promise<boolean> {
    const notification: NotificationData = {
      title: `New message from ${buyerName}`,
      body: `${buyerName} sent you a message about "${productName}": ${messagePreview.substring(0, 100)}${messagePreview.length > 100 ? '...' : ''}`,
      data: {
        type: 'new_message',
        interestId,
        productName,
        buyerName,
      },
    };

    return await this.sendNotificationToUser(sellerId, notification);
  }

  /**
   * Send message notification to buyer
   */
  async sendMessageNotificationToBuyer(
    buyerId: string,
    productName: string,
    messagePreview: string,
    interestId: string
  ): Promise<boolean> {
    const notification: NotificationData = {
      title: `New message about ${productName}`,
      body: `The seller sent you a message about "${productName}": ${messagePreview.substring(0, 100)}${messagePreview.length > 100 ? '...' : ''}`,
      data: {
        type: 'new_message',
        interestId,
        productName,
      },
    };

    return await this.sendNotificationToUser(buyerId, notification);
  }

  /**
   * Send interest notification to seller
   */
  async sendInterestNotificationToSeller(
    sellerId: string,
    buyerName: string,
    productName: string,
    quantity: number,
    interestId: string
  ): Promise<boolean> {
    const notification: NotificationData = {
      title: `New interest in ${productName}`,
      body: `${buyerName} is interested in your product "${productName}" (Qty: ${quantity})`,
      data: {
        type: 'new_interest',
        interestId,
        productName,
        buyerName,
        quantity: quantity.toString(),
      },
    };

    return await this.sendNotificationToUser(sellerId, notification);
  }

  /**
   * Send order notification to seller
   */
  async sendOrderNotificationToSeller(
    sellerId: string,
    buyerName: string,
    productName: string,
    orderId: string
  ): Promise<boolean> {
    const notification: NotificationData = {
      title: `New order for ${productName}`,
      body: `${buyerName} has placed an order for "${productName}"`,
      data: {
        type: 'new_order',
        orderId,
        productName,
        buyerName,
      },
    };

    return await this.sendNotificationToUser(sellerId, notification);
  }

  /**
   * Send order status update to buyer
   */
  async sendOrderStatusNotificationToBuyer(
    buyerId: string,
    productName: string,
    status: string,
    orderId: string
  ): Promise<boolean> {
    const notification: NotificationData = {
      title: `Order status updated`,
      body: `Your order for "${productName}" has been updated to: ${status}`,
      data: {
        type: 'order_status_update',
        orderId,
        productName,
        status,
      },
    };

    return await this.sendNotificationToUser(buyerId, notification);
  }
}

export const notificationService = new NotificationService(); 