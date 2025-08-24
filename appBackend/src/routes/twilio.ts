import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Twilio status callback handler
// Configure TWILIO_STATUS_CALLBACK_URL to point to /api/twilio/status-callback
router.post('/status-callback', async (req, res) => {
  try {
    const body: any = req.body || {};
    const {
      MessageSid,
      MessageStatus,
      To,
      From,
      ErrorCode,
      ErrorMessage,
      Price,
      PriceUnit,
      SmsSid,
      SmsStatus,
      ToCountry,
      ToState,
      ToCity,
    } = body;

    // Try to locate an existing notification by sid or To + recent createdAt
    let notification = null;
    if (MessageSid) {
      notification = await prisma.twilioNotification.findFirst({
        where: { twilioSid: MessageSid },
      });
    }

    const updateData: any = {
      twilioStatus: MessageStatus || SmsStatus || undefined,
      errorCode: ErrorCode ? String(ErrorCode) : undefined,
      errorMessage: ErrorMessage || undefined,
      price: Price !== undefined && Price !== null ? (Number(Price) as any) : undefined,
      priceUnit: PriceUnit || undefined,
      currencyCode: PriceUnit || undefined,
      updatedAt: new Date(),
    };

    if (notification) {
      await prisma.twilioNotification.update({
        where: { id: notification.id },
        data: updateData,
      });
    } else {
      // Create a new record if we cannot find it (fallback)
      await prisma.twilioNotification.create({
        data: {
          to: To,
          from: From,
          messageBody: '',
          messageType: 'OTHER',
          twilioSid: MessageSid || SmsSid || undefined,
          twilioStatus: MessageStatus || SmsStatus || undefined,
          errorCode: ErrorCode ? String(ErrorCode) : undefined,
          errorMessage: ErrorMessage || undefined,
          price: Price !== undefined && Price !== null ? (Number(Price) as any) : undefined,
          priceUnit: PriceUnit || undefined,
          currencyCode: PriceUnit || undefined,
          apiResponse: body,
        },
      });
    }

    return res.status(200).send('OK');
  } catch (error) {
    console.error('Error handling Twilio status callback:', error);
    return res.status(200).send('OK');
  }
});

export default router;


