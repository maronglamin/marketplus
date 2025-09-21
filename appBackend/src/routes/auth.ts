import express from 'express';
import {
  initiateLogin,
  verifyOTPAndRegister,
  registerUser,
  loginWithPin,
  logout,
  resendOTP,
  testSMS,
  changePin,
  requestNewPin,
  completePinReset,
  checkUserExists,
  loginWithPinWeb
} from '../controllers/auth';
import { authenticate } from '../middleware/auth';
import {
  validateInitiateLogin,
  validateVerifyOTP,
  validateRegister,
  validateLoginWithPin,
  validateRequest,
} from '../middleware/validators';

const router = express.Router();

// Test SMS endpoint
router.post('/send-sms', testSMS);

// Public routes
router.post(
  '/initiate-login',
  validateInitiateLogin,
  validateRequest,
  initiateLogin
);

router.post(
  '/verify-otp',
  validateVerifyOTP,
  validateRequest,
  verifyOTPAndRegister
);

router.post(
  '/register',
  validateRegister,
  validateRequest,
  registerUser
);

router.post(
  '/login',
  validateLoginWithPin,
  validateRequest,
  loginWithPin
);

router.post(
  '/request-new-pin',
  validateRequest,
  requestNewPin
);

// Web app routes (no device info required)
router.post('/check-user', checkUserExists);
router.post('/login-web', loginWithPinWeb);

// Protected routes
router.post('/logout', authenticate, logout);
router.post('/resend-otp', resendOTP);
router.post('/change-pin', authenticate, changePin);
router.post('/complete-pin-reset', authenticate, completePinReset);

export default router; 