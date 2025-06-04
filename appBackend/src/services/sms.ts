import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;
const isDevelopment = process.env.NODE_ENV === 'development';

if (!accountSid || !authToken || !fromNumber) {
  console.error('Missing Twilio credentials. Please check your .env file.');
  console.error('Required environment variables:');
  console.error('- TWILIO_ACCOUNT_SID');
  console.error('- TWILIO_AUTH_TOKEN');
  console.error('- TWILIO_PHONE_NUMBER');
  process.exit(1);
}

const client = twilio(accountSid, authToken);

const validatePhoneNumber = (phoneNumber: string): boolean => {
  // Basic phone number validation
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phoneNumber);
};

export const sendOTP = async (phoneNumber: string, code: string): Promise<void> => {
  try {
    if (!validatePhoneNumber(phoneNumber)) {
      throw new Error('Invalid phone number format');
    }

    console.log(`Sending OTP to ${phoneNumber}`);

    if (isDevelopment) {
      console.log(`[DEV] OTP for ${phoneNumber}: ${code}`);
      return;
    }

    const message = await client.messages.create({
      body: `Your Marketplace verification code is: ${code}. This code will expire in 10 minutes.`,
      from: fromNumber,
      to: phoneNumber,
    });

    console.log('SMS sent successfully:', message.sid);
  } catch (error: any) {
    console.error('Error sending SMS:', error);
    if (error.code === 21211) {
      throw new Error('Invalid phone number');
    } else if (error.code === 21214) {
      throw new Error('Phone number is not mobile');
    } else if (error.code === 21608) {
      throw new Error('Phone number is not verified');
    } else {
      throw new Error('Failed to send verification code');
    }
  }
};

export const sendPIN = async (phoneNumber: string, pin: string): Promise<void> => {
  try {
    if (!validatePhoneNumber(phoneNumber)) {
      throw new Error('Invalid phone number format');
    }

    console.log(`Sending PIN to ${phoneNumber}`);

    if (isDevelopment) {
      console.log(`[DEV] PIN for ${phoneNumber}: ${pin}`);
      return;
    }

    const message = await client.messages.create({
      body: `Your Marketplace PIN is: ${pin}. Please keep this PIN secure and do not share it with anyone.`,
      from: fromNumber,
      to: phoneNumber,
    });

    console.log('SMS sent successfully:', message.sid);
  } catch (error: any) {
    console.error('Error sending SMS:', error);
    if (error.code === 21211) {
      throw new Error('Invalid phone number');
    } else if (error.code === 21214) {
      throw new Error('Phone number is not mobile');
    } else if (error.code === 21608) {
      throw new Error('Phone number is not verified');
    } else {
      throw new Error('Failed to send PIN');
    }
  }
}; 