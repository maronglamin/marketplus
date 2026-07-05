import { isFirebaseConfigured, messaging } from '../config/firebase';
import { getVapidPublicKeyForClient, isWebPushConfigured, webpush } from '../config/webPush';
import { isApnsConfigured, sendApnsNotification } from '../config/apns';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type PaymentContext = 'order' | 'interest' | 'ride' | 'rental' | 'service' | 'property';

export interface NotificationData {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

const isExpoPushToken = (token: string): boolean =>
  token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[');

type WebPushSubscriptionJson = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

const parseWebPushSubscription = (token: string): WebPushSubscriptionJson | null => {
  try {
    const parsed = JSON.parse(token) as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };
    if (parsed?.endpoint && parsed?.keys?.p256dh && parsed?.keys?.auth) {
      return {
        endpoint: parsed.endpoint,
        keys: { p256dh: parsed.keys.p256dh, auth: parsed.keys.auth },
      };
    }
  } catch {
    /* not JSON */
  }
  return null;
};

const isWebPushSubscriptionToken = (token: string): boolean =>
  parseWebPushSubscription(token) !== null;

export function getWebPushPublicKey(): string | null {
  return getVapidPublicKeyForClient();
}

const stringifyData = (data?: Record<string, string>): Record<string, string> => {
  if (!data) return {};
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, String(value ?? '')])
  );
};

export interface FCMToken {
  id: string;
  token: string;
  userId: string;
  deviceType: 'ios' | 'android' | 'web';
  createdAt: Date;
  updatedAt: Date;
}

class NotificationService {
  private async sendExpoPushNotification(
    token: string,
    notification: NotificationData
  ): Promise<boolean> {
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: token,
          title: notification.title,
          body: notification.body,
          data: stringifyData(notification.data),
          sound: 'default',
          priority: 'high',
          channelId: 'default',
        }),
      });

      const result = (await response.json()) as {
        data?: { status?: string; details?: { error?: string } } | Array<{ status?: string; details?: { error?: string } }>;
      };
      if (!response.ok) {
        console.error('Expo push API error:', result);
        return false;
      }

      const ticket = Array.isArray(result.data) ? result.data[0] : result.data;
      if (ticket?.status === 'error') {
        console.error('Expo push ticket error:', ticket);
        return ticket.details?.error !== 'DeviceNotRegistered';
      }

      return true;
    } catch (error) {
      console.error('Failed to send Expo push notification:', error);
      return false;
    }
  }

  private async sendWebPushNotification(
    token: string,
    notification: NotificationData
  ): Promise<boolean> {
    if (!isWebPushConfigured()) {
      console.log('[web-push] VAPID keys not configured, skipping web push send');
      return false;
    }

    const subscription = parseWebPushSubscription(token);
    if (!subscription) {
      return false;
    }

    try {
      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        data: stringifyData(notification.data),
        icon: notification.imageUrl || '/assets/icon-192.png',
        badge: '/assets/icon-192.png',
      });

      await webpush.sendNotification(subscription, payload, { TTL: 86_400 });
      return true;
    } catch (error: any) {
      const statusCode = error?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await this.removeFCMToken(token);
      } else {
        console.error('[web-push] Failed to send notification:', statusCode, error?.message);
      }
      return false;
    }
  }

  private async sendFcmNotification(
    token: string,
    notification: NotificationData
  ): Promise<boolean> {
    if (!isFirebaseConfigured() || !messaging) {
      console.log('[fcm] Firebase not configured, skipping Android push send');
      return false;
    }

    try {
      await messaging.send({
        token,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: stringifyData(notification.data),
        android: {
          priority: 'high' as const,
          notification: {
            channelId: 'default',
            priority: 'high' as const,
            defaultSound: true,
          },
        },
      });
      return true;
    } catch (error) {
      console.error('[fcm] Failed to send message to token:', token.slice(0, 12), error);
      return false;
    }
  }

  private async sendToToken(
    token: string,
    notification: NotificationData,
    deviceType?: string
  ): Promise<boolean> {
    if (isWebPushSubscriptionToken(token)) {
      return this.sendWebPushNotification(token, notification);
    }

    // Legacy Expo relay tokens (prefer native device tokens for new installs)
    if (isExpoPushToken(token)) {
      return this.sendExpoPushNotification(token, notification);
    }

    const normalizedType = (deviceType || '').toLowerCase();

    // iOS: direct APNs (no Expo relay, no Firebase required on server)
    if (normalizedType === 'ios') {
      if (isApnsConfigured()) {
        const result = await sendApnsNotification(
          token,
          notification.title,
          notification.body,
          stringifyData(notification.data)
        );
        return result.success;
      }
      // Fallback for older setups that registered an FCM token on iOS
      return this.sendFcmNotification(token, notification);
    }

    // Android: native FCM device token (Google's transport — Expo relay not used)
    if (normalizedType === 'android') {
      return this.sendFcmNotification(token, notification);
    }

    // Unknown device type: try FCM then APNs
    if (isFirebaseConfigured() && messaging) {
      const fcmSent = await this.sendFcmNotification(token, notification);
      if (fcmSent) return true;
    }
    if (isApnsConfigured()) {
      const result = await sendApnsNotification(
        token,
        notification.title,
        notification.body,
        stringifyData(notification.data)
      );
      return result.success;
    }

    return false;
  }

  /**
   * Save FCM token for a user
   */
  async saveFCMToken(userId: string, token: string, deviceType: string): Promise<FCMToken> {
    try {
      if (deviceType === 'web') {
        const subscription = parseWebPushSubscription(token);
        if (!subscription) {
          throw new Error('web deviceType requires a valid PushSubscription JSON token');
        }
      }

      const existingByToken = await prisma.$queryRaw<FCMToken[]>`
        SELECT * FROM fcm_tokens WHERE token = ${token} LIMIT 1
      `;

      if (existingByToken.length > 0) {
        await prisma.$executeRaw`
          UPDATE fcm_tokens
          SET "userId" = ${userId}, "deviceType" = ${deviceType}, "updatedAt" = NOW()
          WHERE token = ${token}
        `;
        return existingByToken[0];
      }

      if (deviceType !== 'web') {
        const existingForDevice = await prisma.$queryRaw<FCMToken[]>`
          SELECT * FROM fcm_tokens
          WHERE "userId" = ${userId} AND "deviceType" = ${deviceType}
          LIMIT 1
        `;

        if (existingForDevice.length > 0) {
          await prisma.$executeRaw`
            UPDATE fcm_tokens
            SET token = ${token}, "updatedAt" = NOW()
            WHERE "userId" = ${userId} AND "deviceType" = ${deviceType}
          `;
          return { ...existingForDevice[0], token };
        }
      }

      const newToken = await prisma.$queryRaw<FCMToken[]>`
        INSERT INTO fcm_tokens (id, "userId", token, "deviceType", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), ${userId}, ${token}, ${deviceType}, NOW(), NOW())
        RETURNING *
      `;
      return newToken[0];
    } catch (error) {
      console.error('Error saving FCM token:', error);
      throw error;
    }
  }

  /**
   * Remove FCM token
   */
  async removeFCMToken(token: string): Promise<void> {
    try {
      await prisma.$executeRaw`
        DELETE FROM fcm_tokens WHERE token = ${token}
      `;
    } catch (error) {
      console.error('Error removing FCM token:', error);
    }
  }

  /**
   * Get all FCM tokens for a user
   */
  async getUserFCMTokens(userId: string): Promise<FCMToken[]> {
    try {
      const tokens = await prisma.$queryRaw`
        SELECT * FROM fcm_tokens WHERE "userId" = ${userId}
      `;
      return Array.isArray(tokens) ? tokens : [];
    } catch (error) {
      console.error('Error getting user FCM tokens:', error);
      return [];
    }
  }

  /**
   * Send notification to a specific user
   */
  async sendNotificationToUser(
    userId: string,
    notification: NotificationData
  ): Promise<boolean> {
    try {
      const tokens = await this.getUserFCMTokens(userId);

      if (tokens.length === 0) {
        console.log(`No push tokens found for user ${userId}`);
        return false;
      }

      let successCount = 0;
      const failedTokens: string[] = [];

      for (const tokenData of tokens) {
        const sent = await this.sendToToken(
          tokenData.token,
          notification,
          tokenData.deviceType
        );
        if (sent) {
          successCount++;
        } else {
          failedTokens.push(tokenData.token);
        }
      }

      console.log(`Push notifications for user ${userId}:`, {
        successCount,
        failureCount: failedTokens.length,
      });

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
    interestId: string,
    sellerName?: string
  ): Promise<boolean> {
    const senderLabel = sellerName || 'The seller';
    const notification: NotificationData = {
      title: `New message about ${productName}`,
      body: `${senderLabel} sent you a message about "${productName}": ${messagePreview.substring(0, 100)}${messagePreview.length > 100 ? '...' : ''}`,
      data: {
        type: 'new_message',
        interestId,
        productName,
        ...(sellerName ? { sellerName } : {}),
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
   * Notify buyer that their order was placed
   */
  async sendOrderConfirmationToBuyer(
    buyerId: string,
    productName: string,
    orderId: string,
    orderNumber?: string
  ): Promise<boolean> {
    const notification: NotificationData = {
      title: 'Order placed',
      body: `Your order for "${productName}" has been placed successfully.`,
      data: {
        type: 'order_placed',
        orderId,
        productName,
        ...(orderNumber ? { orderNumber } : {}),
      },
    };

    return this.sendNotificationToUser(buyerId, notification);
  }

  /**
   * Notify buyer that their interest was submitted
   */
  async sendInterestConfirmationToBuyer(
    buyerId: string,
    productName: string,
    interestId: string
  ): Promise<boolean> {
    const notification: NotificationData = {
      title: 'Interest submitted',
      body: `Your interest in "${productName}" has been sent to the seller.`,
      data: {
        type: 'interest_submitted',
        interestId,
        productName,
      },
    };

    return this.sendNotificationToUser(buyerId, notification);
  }

  /**
   * Notify driver of a new direct ride booking request
   */
  async sendRideBookingNotificationToDriver(
    driverUserId: string,
    customerName: string,
    pickupAddress: string,
    requestId: string
  ): Promise<boolean> {
    const notification: NotificationData = {
      title: 'New ride request',
      body: `${customerName} booked a ride from ${pickupAddress}.`,
      data: {
        type: 'ride_booking',
        requestId,
        customerName,
        pickupAddress,
      },
    };

    return this.sendNotificationToUser(driverUserId, notification);
  }

  /**
   * Notify customer and seller when payment completes
   */
  async sendPaymentCompletedNotifications(params: {
    customerId: string;
    sellerId?: string;
    amount: number;
    currency: string;
    context: PaymentContext;
    referenceId?: string;
    description?: string;
  }): Promise<void> {
    const { customerId, sellerId, amount, currency, context, referenceId, description } = params;
    const formattedAmount = `${currency} ${amount.toFixed(2)}`;
    const label = description || this.getPaymentContextLabel(context);

    const customerNotification: NotificationData = {
      title: 'Payment successful',
      body: `Your payment of ${formattedAmount} for ${label} was completed successfully.`,
      data: {
        type: 'payment_completed',
        role: 'customer',
        context,
        amount: amount.toString(),
        currency,
        ...(referenceId ? { referenceId } : {}),
      },
    };

    const sellerNotification: NotificationData = {
      title: 'Payment received',
      body: `You received a payment of ${formattedAmount} for ${label}.`,
      data: {
        type: 'payment_completed',
        role: 'seller',
        context,
        amount: amount.toString(),
        currency,
        ...(referenceId ? { referenceId } : {}),
      },
    };

    await Promise.allSettled([
      this.sendNotificationToUser(customerId, customerNotification),
      sellerId
        ? this.sendNotificationToUser(sellerId, sellerNotification)
        : Promise.resolve(false),
    ]);
  }

  private getPaymentContextLabel(context: PaymentContext): string {
    switch (context) {
      case 'order':
        return 'your order';
      case 'interest':
        return 'your interest';
      case 'ride':
        return 'your ride';
      case 'rental':
        return 'your rental';
      case 'service':
        return 'your service booking';
      case 'property':
        return 'your property booking';
      default:
        return 'your transaction';
    }
  }

  /**
   * Send payment notifications from an external transaction record (webhooks)
   */
  async sendPaymentCompletedFromExternalTransaction(tx: {
    customerId?: string | null;
    sellerId?: string | null;
    amount: unknown;
    currencyCode?: string | null;
    orderId?: string | null;
    rideRequestId?: string | null;
    rentalRequestId?: string | null;
    serviceBookingId?: string | null;
    propertyBookingId?: string | null;
    appService?: string | null;
  }): Promise<void> {
    if (!tx.customerId) {
      return;
    }

    let context: PaymentContext = 'order';
    let referenceId = tx.orderId || undefined;

    if (tx.serviceBookingId || tx.appService === 'HOME_SERVICES') {
      context = 'service';
      referenceId = tx.serviceBookingId || referenceId;
    } else if (tx.propertyBookingId || tx.appService === 'REAL_ESTATE') {
      context = 'property';
      referenceId = tx.propertyBookingId || referenceId;
    } else if (tx.rideRequestId || tx.appService === 'RIDES') {
      context = 'ride';
      referenceId = tx.rideRequestId || referenceId;
    } else if (tx.rentalRequestId || tx.appService === 'RENTAL') {
      context = 'rental';
      referenceId = tx.rentalRequestId || referenceId;
    }

    await this.sendPaymentCompletedNotifications({
      customerId: tx.customerId,
      sellerId: tx.sellerId || undefined,
      amount: Number(tx.amount || 0),
      currency: (tx.currencyCode || 'GMD').toUpperCase(),
      context,
      referenceId,
    });
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

  /**
   * Notify seller when a buyer cancels an order
   */
  async sendOrderCancellationNotificationToSeller(
    sellerId: string,
    buyerName: string,
    productName: string,
    orderId: string,
    orderNumber?: string
  ): Promise<boolean> {
    const notification: NotificationData = {
      title: 'Order cancelled',
      body: `${buyerName} cancelled their order for "${productName}".`,
      data: {
        type: 'order_cancelled',
        role: 'seller',
        orderId,
        productName,
        buyerName,
        ...(orderNumber ? { orderNumber } : {}),
      },
    };

    return this.sendNotificationToUser(sellerId, notification);
  }

  /**
   * Notify buyer when their order is cancelled by the seller
   */
  async sendOrderCancellationNotificationToBuyer(
    buyerId: string,
    productName: string,
    orderId: string,
    orderNumber?: string
  ): Promise<boolean> {
    const notification: NotificationData = {
      title: 'Order cancelled',
      body: `Your order for "${productName}" has been cancelled.`,
      data: {
        type: 'order_cancelled',
        role: 'buyer',
        orderId,
        productName,
        ...(orderNumber ? { orderNumber } : {}),
      },
    };

    return this.sendNotificationToUser(buyerId, notification);
  }

  /**
   * Send ride token notification to customer
   */
  async sendRideTokenNotificationToCustomer(
    customerId: string,
    driverName: string,
    token: string,
    rideId: string
  ): Promise<boolean> {
    const notification: NotificationData = {
      title: 'Ride Token Generated',
      body: `${driverName} has generated a 6-digit token for your ride. Please provide this token to start your journey.`,
      data: {
        type: 'ride_token',
        rideId,
        token,
        driverName,
      },
    };

    return await this.sendNotificationToUser(customerId, notification);
  }

  async sendServiceBookingCreatedNotifications(params: {
    customerId: string;
    providerUserId?: string | null;
    customerName: string;
    categoryName: string;
    bookingRef: string;
    bookingId: string;
  }): Promise<void> {
    const { customerId, providerUserId, customerName, categoryName, bookingRef, bookingId } = params;

    await Promise.allSettled([
      this.sendNotificationToUser(customerId, {
        title: 'Service request submitted',
        body: `Your ${categoryName} request (${bookingRef}) has been submitted.`,
        data: { type: 'service_booking_created', role: 'customer', bookingId, bookingRef },
      }),
      providerUserId
        ? this.sendNotificationToUser(providerUserId, {
            title: 'New service request',
            body: `${customerName} requested ${categoryName} (${bookingRef}).`,
            data: { type: 'service_booking_created', role: 'provider', bookingId, bookingRef },
          })
        : Promise.resolve(false),
    ]);
  }

  async sendServiceBookingQuotedToCustomer(
    customerId: string,
    categoryName: string,
    bookingRef: string,
    bookingId: string,
    price: number,
    currency: string,
  ): Promise<boolean> {
    return this.sendNotificationToUser(customerId, {
      title: 'Quote received',
      body: `You received a quote of ${currency} ${price.toLocaleString()} for ${categoryName} (${bookingRef}).`,
      data: { type: 'service_booking_quoted', bookingId, bookingRef },
    });
  }

  async sendServiceBookingAcceptedToProvider(
    providerUserId: string,
    customerName: string,
    categoryName: string,
    bookingRef: string,
    bookingId: string,
  ): Promise<boolean> {
    return this.sendNotificationToUser(providerUserId, {
      title: 'Quote accepted',
      body: `${customerName} accepted your quote for ${categoryName} (${bookingRef}).`,
      data: { type: 'service_booking_accepted', bookingId, bookingRef },
    });
  }

  async sendServiceBookingPaidNotifications(params: {
    customerId: string;
    providerUserId?: string | null;
    amount: number;
    currency: string;
    bookingRef: string;
    bookingId: string;
  }): Promise<void> {
    const { customerId, providerUserId, amount, currency, bookingRef, bookingId } = params;
    const formatted = `${currency} ${amount.toLocaleString()}`;

    await Promise.allSettled([
      this.sendNotificationToUser(customerId, {
        title: 'Payment successful',
        body: `Your payment of ${formatted} for ${bookingRef} was completed.`,
        data: { type: 'service_booking_paid', role: 'customer', bookingId, bookingRef },
      }),
      providerUserId
        ? this.sendNotificationToUser(providerUserId, {
            title: 'Payment received',
            body: `You received ${formatted} for service booking ${bookingRef}.`,
            data: { type: 'service_booking_paid', role: 'provider', bookingId, bookingRef },
          })
        : Promise.resolve(false),
    ]);
  }

  async sendServiceBookingCompletedToCustomer(
    customerId: string,
    categoryName: string,
    bookingRef: string,
    bookingId: string,
  ): Promise<boolean> {
    return this.sendNotificationToUser(customerId, {
      title: 'Service completed',
      body: `Your ${categoryName} booking (${bookingRef}) has been marked complete.`,
      data: { type: 'service_booking_completed', bookingId, bookingRef },
    });
  }

  async sendServiceBookingMessageNotification(params: {
    recipientUserId: string;
    senderName: string;
    bookingRef: string;
    bookingId: string;
    preview: string;
  }): Promise<boolean> {
    const { recipientUserId, senderName, bookingRef, bookingId, preview } = params;
    const body = preview.length > 100 ? `${preview.slice(0, 100)}...` : preview;
    return this.sendNotificationToUser(recipientUserId, {
      title: `Message from ${senderName}`,
      body: `${senderName} (${bookingRef}): ${body}`,
      data: { type: 'service_booking_message', bookingId, bookingRef },
    });
  }

  async sendPropertyBookingCreatedNotifications(params: {
    customerId: string;
    agentUserId: string;
    customerName: string;
    listingTitle: string;
    bookingRef: string;
    bookingId: string;
  }): Promise<void> {
    const { customerId, agentUserId, customerName, listingTitle, bookingRef, bookingId } = params;

    await Promise.allSettled([
      this.sendNotificationToUser(customerId, {
        title: 'Reservation submitted',
        body: `Your booking for "${listingTitle}" (${bookingRef}) has been submitted.`,
        data: { type: 'property_booking_created', role: 'customer', bookingId, bookingRef },
      }),
      this.sendNotificationToUser(agentUserId, {
        title: 'New reservation request',
        body: `${customerName} booked "${listingTitle}" (${bookingRef}).`,
        data: { type: 'property_booking_created', role: 'agent', bookingId, bookingRef },
      }),
    ]);
  }

  async sendPropertyInquiryNotifications(params: {
    customerId: string;
    agentUserId: string;
    customerName: string;
    listingTitle: string;
    inquiryId: string;
  }): Promise<void> {
    const { customerId, agentUserId, customerName, listingTitle, inquiryId } = params;

    await Promise.allSettled([
      this.sendNotificationToUser(customerId, {
        title: 'Inquiry submitted',
        body: `Your inquiry about "${listingTitle}" has been sent.`,
        data: { type: 'property_inquiry_created', role: 'customer', inquiryId },
      }),
      this.sendNotificationToUser(agentUserId, {
        title: 'New property inquiry',
        body: `${customerName} inquired about "${listingTitle}".`,
        data: { type: 'property_inquiry_created', role: 'agent', inquiryId },
      }),
    ]);
  }

  async sendApplicationSubmittedNotification(
    userId: string,
    applicationType: 'service_provider' | 'property_agent',
  ): Promise<boolean> {
    const label = applicationType === 'service_provider' ? 'service provider' : 'property agent';
    return this.sendNotificationToUser(userId, {
      title: 'Application submitted',
      body: `Your ${label} application has been submitted and is pending review.`,
      data: { type: 'application_submitted', applicationType },
    });
  }

  async sendApplicationApprovedNotification(
    userId: string,
    applicationType: 'service_provider' | 'property_agent',
  ): Promise<boolean> {
    const label = applicationType === 'service_provider' ? 'service provider' : 'property agent';
    return this.sendNotificationToUser(userId, {
      title: 'Application update',
      body: `Your ${label} application has been approved. You can now access your dashboard.`,
      data: { type: 'application_approved', applicationType },
    });
  }
}

export const notificationService = new NotificationService(); 