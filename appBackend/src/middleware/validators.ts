import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

const phoneNumberValidation = body('phoneNumber')
  .matches(/^\+[1-9]\d{1,14}$/)
  .withMessage('Please enter a valid international phone number starting with + followed by country code and number');

export const validateInitiateLogin = [
  phoneNumberValidation,
  body('deviceInfo').isObject(),
  body('deviceInfo.deviceId').isString(),
  body('deviceInfo.deviceName').isString(),
  body('deviceInfo.deviceType').isString(),
  body('deviceInfo.brand').optional().isString(),
  body('deviceInfo.modelName').optional().isString(),
  body('deviceInfo.osVersion').optional().isString(),
];

export const validateVerifyOTP = [
  phoneNumberValidation,
  body('code').isString().isLength({ min: 6, max: 6 }),
  body('deviceInfo').isObject(),
  body('deviceInfo.deviceId').isString(),
  body('deviceInfo.deviceName').isString(),
  body('deviceInfo.deviceType').isString(),
  body('deviceInfo.brand').optional().isString(),
  body('deviceInfo.modelName').optional().isString(),
  body('deviceInfo.osVersion').optional().isString(),
];

export const validateRegister = [
  phoneNumberValidation,
  body('firstName').isString().notEmpty(),
  body('lastName').isString().notEmpty(),
  body('middleName').optional().isString(),
];

export const validateLoginWithPin = [
  phoneNumberValidation,
  body('pin').isString().isLength({ min: 4, max: 4 }),
  body('deviceId').isString(),
];

export const validateChangePin = [
  body('currentPin').isString().isLength({ min: 4, max: 4 }),
  body('newPin').isString().isLength({ min: 4, max: 4 }),
];

export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', JSON.stringify(errors.array(), null, 2));
    return res.status(400).json({ errors: errors.array() });
  }
  return next();
}; 