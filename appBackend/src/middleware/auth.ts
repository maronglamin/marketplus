import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  user?: {
    id: string;
    deviceId: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as {
      userId: string;
      deviceId?: string;
      phoneNumber?: string;
      type?: string;
    };

    // Handle both device tokens and web tokens
    if (decoded.type === 'web_access_token') {
      // Web token - no device tracking
      req.user = {
        id: decoded.userId,
        deviceId: 'web', // Use 'web' as deviceId for web tokens
      };
    } else {
      // Device token - with device tracking
      req.user = {
        id: decoded.userId,
        deviceId: decoded.deviceId || 'unknown',
      };
    }

    return next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

export const validateDevice = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const device = await prisma.device.findFirst({
      where: {
        userId: req.user.id,
        deviceId: req.user.deviceId,
        isVerified: true,
      },
    });

    if (!device) {
      return res.status(403).json({ message: 'Device not verified' });
    }

    return next();
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Optional authentication: attaches req.user if a valid token is provided,
// but does NOT reject the request when no/invalid token is present.
export const authenticateOptional = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;
    if (!token) {
      return next();
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as {
      userId: string;
      deviceId?: string;
      type?: string;
    };
    if (decoded?.userId) {
      req.user = {
        id: decoded.userId,
        deviceId: decoded.deviceId || 'unknown',
      };
    }
    return next();
  } catch {
    // Ignore token errors for optional auth and proceed as anonymous
    return next();
  }
};