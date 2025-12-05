import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import { config } from './config';
import os from 'os';
import routes from './routes';
import morgan from 'morgan';
import uploadRouter from './routes/upload';
import riderUploadRouter from './routes/riderUpload';
import driverRouter from './routes/driver';
import rentalRouter from './routes/rental';
import rentalMessageRoutes from './routes/rentalMessages';
import path from 'path';
import { RideRequestService } from './services/rideRequestService';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import productRoutes from './routes/products';
import orderRoutes from './routes/orders';
import paymentMethodRoutes from './routes/paymentMethods';
import settlementRoutes from './routes/settlements';
import rideRequestRoutes from './routes/rideRequest';
import salesRepRoutes from './routes/salesRep';
import branchRoutes from './routes/branch';
import yonnaForexPaymentRoutes from './routes/yonnaForexPaymentRoutes';
import wavePaymentRoutes from './routes/wavePaymentRoutes';
import appVersionRoutes from './routes/appVersion';

const app = express();

// Trust the first proxy (e.g., Nginx) so req.ip and rate limiting work with X-Forwarded-For
app.set('trust proxy', 1);

// Get network interfaces
const networkInterfaces = os.networkInterfaces();
logger.info('Available network interfaces:', networkInterfaces);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "file:"],
      connectSrc: ["'self'", "https://api.twilio.com"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "same-site" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: "deny" },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true
}));

// CORS configuration (allow HTTPS + configurable allowlist)
const envOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);
const defaultOrigins = [
  'https://api.cloudnexus.biz',
  'http://api.cloudnexus.biz',
  'https://207.154.220.128',
  'http://207.154.220.128',
  'https://snap.cloudnexus.biz',
  'http://snap.cloudnexus.biz',
  'https://snap-admin.cloudnexus.biz',
  'http://snap-admin.cloudnexus.biz',
];
const allowedOrigins = envOrigins.length > 0 ? envOrigins : defaultOrigins;

app.use(cors({
  origin: (origin, callback) => {
    // Allow mobile/native requests which often have no origin
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400
}));

// Request size limits
// Wave webhook raw body parser must be before JSON parser
app.use('/api/payments/wave-gambia/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '50mb' })); // Increased for image uploads
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from a stable uploads directory at project root
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Request logging middleware
app.use((req, _res, next) => {
  logger.info('Incoming request:', {
    method: req.method,
    url: req.url,
    body: req.body,
    headers: req.headers
  });
  next();
});

// (CORS is configured above with an allowlist; remove per-origin duplicates)

// Rate limiting - More generous limits to prevent customer frustration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased from 100 to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Add skip function to allow certain endpoints to bypass rate limiting
  skip: (req) => {
    // Skip rate limiting for health checks and static assets
    return req.path === '/api/health' || req.path.startsWith('/uploads/');
  },
  // Add handler for when rate limit is exceeded
  handler: (req, res) => {
    logger.warn('Rate limit exceeded for IP:', req.ip);
    res.status(429).json({
      error: 'Too many requests',
      message: 'Please slow down your requests and try again later.',
      retryAfter: Math.ceil(15 * 60 / 60) // 15 minutes in minutes
    });
  }
});
app.use(limiter);

// Wave success/error landing endpoints (browser redirects from Wave)
app.get('/payments/wave/success', (_req, res) => {
  res.status(200).send('Wave payment succeeded. You may close this window and return to the app.');
});
app.get('/payments/wave/error', (_req, res) => {
  res.status(200).send('Wave payment failed or was cancelled. You may close this window and return to the app.');
});

// API routes
app.use('/api', routes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/products', productRoutes);
app.use('/api/payment-methods', paymentMethodRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/upload', uploadRouter);
app.use('/api/rider-upload', riderUploadRouter);
app.use('/api/ride-requests', rideRequestRoutes);
app.use('/api/driver', driverRouter);
app.use('/api/rentals', rentalRouter);
app.use('/api/rental-messages', rentalMessageRoutes);
app.use('/api/sales-reps', salesRepRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/payments/yonna-forex', yonnaForexPaymentRoutes);
app.use('/api/payments/wave-gambia', wavePaymentRoutes);
app.use('/api/app', appVersionRoutes);

// Health check endpoint under /api
app.get('/api/health', (req, res) => {
  logger.info('Health check requested');
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling
app.use(errorHandler);

// Scheduled cleanup job for expired ride requests
const cleanupExpiredRequests = async () => {
  try {
    await RideRequestService.cleanupExpiredRequests();
    logger.info('✅ Cleaned up expired ride requests');
  } catch (error) {
    logger.error('❌ Error cleaning up expired ride requests:', error);
  }
};

// Run cleanup every minute
setInterval(cleanupExpiredRequests, 60 * 1000);

// Run initial cleanup on startup
cleanupExpiredRequests();

export default app; 