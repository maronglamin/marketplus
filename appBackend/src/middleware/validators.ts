import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

const phoneNumberValidation = body('phoneNumber')
  .optional({ nullable: true, checkFalsy: true })
  .matches(/^\+[1-9]\d{1,14}$/)
  .withMessage('Please enter a valid international phone number starting with + followed by country code and number');

const emailValidation = body('email')
  .optional({ nullable: true, checkFalsy: true })
  .isEmail()
  .withMessage('Please enter a valid email address');

const deviceInfoValidation = [
  body('deviceInfo').isObject(),
  body('deviceInfo.deviceId').isString(),
  body('deviceInfo.deviceName').isString(),
  body('deviceInfo.deviceType').isString(),
  body('deviceInfo.brand').optional().isString(),
  body('deviceInfo.modelName').optional().isString(),
  body('deviceInfo.osVersion').optional().isString(),
  body('deviceInfo.fingerprint').optional().isString(),
  body('deviceInfo.hardwareId').optional().isString(),
];

export const validateInitiateLogin = [
  body('method').optional().isIn(['email', 'phone']),
  emailValidation,
  phoneNumberValidation,
  body().custom((_, { req }) => {
    const method = req.body.method;
    if (method === 'email' && !req.body.email) {
      throw new Error('Email is required');
    }
    if (method === 'phone' && !req.body.phoneNumber) {
      throw new Error('Phone number is required');
    }
    if (!method && !req.body.email && !req.body.phoneNumber) {
      throw new Error('Email or phone number is required');
    }
    return true;
  }),
  ...deviceInfoValidation,
];

export const validateVerifyOTP = [
  body('method').optional().isIn(['email', 'phone']),
  emailValidation,
  phoneNumberValidation,
  body('code').isString().isLength({ min: 6, max: 6 }),
  body('lastUserId').optional({ nullable: true, checkFalsy: true }).isString(),
  ...deviceInfoValidation,
];

export const validateRegister = [
  phoneNumberValidation,
  emailValidation,
  body('firstName').isString().notEmpty(),
  body('lastName').isString().notEmpty(),
  body('middleName').optional().isString(),
];

export const validateLoginWithPin = [
  phoneNumberValidation,
  emailValidation,
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
