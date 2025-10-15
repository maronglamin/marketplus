import twilio from 'twilio';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID; // optional, preferred
const isDevelopment = process.env.NODE_ENV === 'development';
const environment = process.env.NODE_ENV || 'development';

const prisma = new PrismaClient();

if (!accountSid || !authToken || (!fromNumber && !messagingServiceSid)) {
  console.error('Missing Twilio credentials. Please check your .env file.');
  console.error('Required environment variables:');
  console.error('- TWILIO_ACCOUNT_SID');
  console.error('- TWILIO_AUTH_TOKEN');
  console.error('- TWILIO_PHONE_NUMBER or TWILIO_MESSAGING_SERVICE_SID');
  process.exit(1);
}

const client = twilio(accountSid, authToken);

const validatePhoneNumber = (phoneNumber: string): boolean => {
  // Basic phone number validation
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phoneNumber);
};

type SmsLogOptions = {
  userId?: string;
  deviceId?: string; // This should be the database device ID, not the device identifier
  deviceInfo?: any;
  context?: string;
};

type TwilioMessageTypeLocal = 'OTP' | 'PIN' | 'COMBINED' | 'OTHER';

const logTwilioNotification = async (params: {
  to: string;
  from?: string;
  messagingServiceSid?: string;
  messageBody: string;
  messageType: TwilioMessageTypeLocal;
  userId?: string;
  deviceId?: string;
  apiRequest?: any;
  apiResponse?: any;
  error?: any;
}) => {
  try {
    const { to, from, messagingServiceSid, messageBody, messageType, userId, deviceId, apiRequest, apiResponse, error } = params;
    
    // Only include deviceId if it's a valid UUID (database ID)
    const validDeviceId = deviceId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deviceId) ? deviceId : null;
    
    const data: any = {
      to,
      from,
      messagingServiceSid,
      messageBody,
      messageType,
      userId: userId || null,
      deviceId: validDeviceId,
      environment,
      apiRequest: apiRequest ? apiRequest : undefined,
      apiResponse: apiResponse ? apiResponse : undefined,
    };

    // Map response fields if present
    if (apiResponse && apiResponse.sid) {
      data.twilioSid = apiResponse.sid;
    }
    if (apiResponse && apiResponse.status) {
      data.twilioStatus = apiResponse.status;
    }
    if (apiResponse && (apiResponse.numSegments || apiResponse.num_segments)) {
      const segmentsVal = apiResponse.numSegments || apiResponse.num_segments;
      data.segments = typeof segmentsVal === 'string' ? parseInt(segmentsVal, 10) : Number(segmentsVal);
    }
    if (apiResponse && apiResponse.price !== undefined && apiResponse.price !== null) {
      const priceNum = typeof apiResponse.price === 'string' ? Number(apiResponse.price) : Number(apiResponse.price);
      if (!isNaN(priceNum)) {
        data.price = priceNum as any;
      }
    }
    if (apiResponse && apiResponse.priceUnit) {
      data.priceUnit = apiResponse.priceUnit;
      data.currencyCode = apiResponse.priceUnit;
    }

    if (error) {
      data.errorCode = (error.code || error.status || '').toString();
      data.errorMessage = error.message || JSON.stringify(error);
    }

    await (prisma as any).twilioNotification.create({
      data,
    });
  } catch (loggingError) {
    console.error('Failed to log Twilio notification:', loggingError);
  }
};

export const sendOTP = async (phoneNumber: string, code: string, options?: SmsLogOptions): Promise<void> => {
  try {
    if (!validatePhoneNumber(phoneNumber)) {
      throw new Error('Invalid phone number format');
    }

    if (!messagingServiceSid && fromNumber && phoneNumber === fromNumber) {
      throw new Error("'To' and 'From' numbers cannot be the same. Configure TWILIO_PHONE_NUMBER to a valid Twilio number or set TWILIO_MESSAGING_SERVICE_SID.");
    }

    console.log(`Sending OTP to ${phoneNumber}`);

    if (isDevelopment) {
      console.log(`[DEV] OTP for ${phoneNumber}: ${code}`);
      // Proceed to send SMS even in development
    }

    const requestPayload: any = {
      body: `Your SNAP verification code is: ${code}. This code will expire in 10 minutes.`,
      ...(messagingServiceSid ? { messagingServiceSid } : { from: fromNumber }),
      to: phoneNumber,
    };
    if (process.env.TWILIO_STATUS_CALLBACK_URL) {
      requestPayload.statusCallback = process.env.TWILIO_STATUS_CALLBACK_URL;
    }

    const message = await client.messages.create(requestPayload);

    console.log('SMS sent successfully:', message.sid);

    await logTwilioNotification({
      to: phoneNumber,
      from: fromNumber,
      messagingServiceSid,
      messageBody: requestPayload.body,
      messageType: 'OTP',
      userId: options?.userId,
      deviceId: options?.deviceId,
      apiRequest: requestPayload,
      apiResponse: message,
    });
  } catch (error: any) {
    console.error('Error sending SMS:', error);
    await logTwilioNotification({
      to: phoneNumber,
      from: fromNumber,
      messagingServiceSid,
      messageBody: `Your SNAP verification code is: ${code}. This code will expire in 10 minutes.`,
      messageType: 'OTP',
      userId: options?.userId,
      deviceId: options?.deviceId,
      apiRequest: {
        to: phoneNumber,
        ...(messagingServiceSid ? { messagingServiceSid } : { from: fromNumber }),
      },
      apiResponse: undefined,
      error,
    });
    if (error.code === 21211) {
      throw new Error('Invalid phone number');
    } else if (error.code === 21214) {
      throw new Error('Phone number is not mobile');
    } else if (error.code === 21608) {
      throw new Error('Phone number is not verified');
    } else if (error.code === 21266) {
      throw new Error("'To' and 'From' numbers cannot be the same. Update TWILIO_PHONE_NUMBER or use TWILIO_MESSAGING_SERVICE_SID.");
    } else {
      throw new Error('Failed to send verification code');
    }
  }
};

export const sendPIN = async (phoneNumber: string, pin: string, options?: SmsLogOptions): Promise<void> => {
  try {
    if (!validatePhoneNumber(phoneNumber)) {
      throw new Error('Invalid phone number format');
    }

    console.log(`Sending PIN to ${phoneNumber}`);

    if (isDevelopment) {
      console.log(`[DEV] PIN for ${phoneNumber}: ${pin}`);
      // Proceed to send SMS even in development
    }

    if (!messagingServiceSid && fromNumber && phoneNumber === fromNumber) {
      throw new Error("'To' and 'From' numbers cannot be the same. Configure TWILIO_PHONE_NUMBER to a valid Twilio number or set TWILIO_MESSAGING_SERVICE_SID.");
    }

    const requestPayload: any = {
      body: `Your SNAP PIN is: ${pin}. Please keep this PIN secure and do not share it with anyone.`,
      ...(messagingServiceSid ? { messagingServiceSid } : { from: fromNumber }),
      to: phoneNumber,
    };
    if (process.env.TWILIO_STATUS_CALLBACK_URL) {
      requestPayload.statusCallback = process.env.TWILIO_STATUS_CALLBACK_URL;
    }

    const message = await client.messages.create(requestPayload);

    console.log('SMS sent successfully:', message.sid);

    await logTwilioNotification({
      to: phoneNumber,
      from: fromNumber,
      messagingServiceSid,
      messageBody: requestPayload.body,
      messageType: 'PIN',
      userId: options?.userId,
      deviceId: options?.deviceId,
      apiRequest: requestPayload,
      apiResponse: message,
    });
  } catch (error: any) {
    console.error('Error sending SMS:', error);
    await logTwilioNotification({
      to: phoneNumber,
      from: fromNumber,
      messagingServiceSid,
      messageBody: `Your SNAP PIN is: ${pin}. Please keep this PIN secure and do not share it with anyone.`,
      messageType: 'PIN',
      userId: options?.userId,
      deviceId: options?.deviceId,
      apiRequest: {
        to: phoneNumber,
        ...(messagingServiceSid ? { messagingServiceSid } : { from: fromNumber }),
      },
      apiResponse: undefined,
      error,
    });
    if (error.code === 21211) {
      throw new Error('Invalid phone number');
    } else if (error.code === 21214) {
      throw new Error('Phone number is not mobile');
    } else if (error.code === 21608) {
      throw new Error('Phone number is not verified');
    } else if (error.code === 21266) {
      throw new Error("'To' and 'From' numbers cannot be the same. Update TWILIO_PHONE_NUMBER or use TWILIO_MESSAGING_SERVICE_SID.");
    } else {
      throw new Error('Failed to send PIN');
    }
  }
}; 

export const sendCombinedVerification = async (
  phoneNumber: string,
  otpCode: string,
  pinCode: string,
  options?: SmsLogOptions
): Promise<void> => {
  try {
    if (!validatePhoneNumber(phoneNumber)) {
      throw new Error('Invalid phone number format');
    }

    console.log(`Sending combined verification to ${phoneNumber}`);

    const bodyLines = [
      'SNAP: Login Verification',
      `Device verification: ${otpCode} (valid 72 hours)`,
      `PIN: ${pinCode} (valid 15 minutes)`,
      'Do not share these codes with anyone.'
    ];

    if (isDevelopment) {
      console.log(`[DEV] Combined SMS for ${phoneNumber}:`);
      console.log(bodyLines.join(' | '));
      // Proceed to send SMS even in development
    }

    if (!messagingServiceSid && fromNumber && phoneNumber === fromNumber) {
      throw new Error("'To' and 'From' numbers cannot be the same. Configure TWILIO_PHONE_NUMBER to a valid Twilio number or set TWILIO_MESSAGING_SERVICE_SID.");
    }

    const requestPayload: any = {
      body: bodyLines.join('\n'),
      ...(messagingServiceSid ? { messagingServiceSid } : { from: fromNumber }),
      to: phoneNumber,
    };
    if (process.env.TWILIO_STATUS_CALLBACK_URL) {
      requestPayload.statusCallback = process.env.TWILIO_STATUS_CALLBACK_URL;
    }

    const message = await client.messages.create(requestPayload);

    console.log('Combined SMS sent successfully:', message.sid);

    await logTwilioNotification({
      to: phoneNumber,
      from: fromNumber,
      messagingServiceSid,
      messageBody: requestPayload.body,
      messageType: 'COMBINED',
      userId: options?.userId,
      deviceId: options?.deviceId,
      apiRequest: requestPayload,
      apiResponse: message,
    });
  } catch (error: any) {
    console.error('Error sending combined SMS:', error);
    await logTwilioNotification({
      to: phoneNumber,
      from: fromNumber,
      messagingServiceSid,
      messageBody: `SNAP: Login Verification\nOTP: ${otpCode} (valid 72 hours)\nPIN: ${pinCode} (valid 15 minutes)\nDo not share these codes with anyone.`,
      messageType: 'COMBINED',
      userId: options?.userId,
      deviceId: options?.deviceId,
      apiRequest: {
        to: phoneNumber,
        ...(messagingServiceSid ? { messagingServiceSid } : { from: fromNumber }),
      },
      apiResponse: undefined,
      error,
    });
    if (error.code === 21211) {
      throw new Error('Invalid phone number');
    } else if (error.code === 21214) {
      throw new Error('Phone number is not mobile');
    } else if (error.code === 21608) {
      throw new Error('Phone number is not verified');
    } else if (error.code === 21266) {
      throw new Error("'To' and 'From' numbers cannot be the same. Update TWILIO_PHONE_NUMBER or use TWILIO_MESSAGING_SERVICE_SID.");
    } else {
      throw new Error('Failed to send verification message');
    }
  }
};