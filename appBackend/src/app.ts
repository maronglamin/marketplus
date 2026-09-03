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
import fs from 'fs';
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
import serviceBookingsRoutes from './routes/serviceBookings';
import serviceProvidersRoutes from './routes/serviceProviders';
import propertyListingsRoutes from './routes/propertyListings';
import propertyBookingsRoutes from './routes/propertyBookings';
import propertyAgentsRoutes from './routes/propertyAgents';
import providerSubscriptionsRoutes from './routes/providerSubscriptions';
import { backfillGraceSubscriptions, expireDueSubscriptions } from './services/providerSubscriptionService';

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
// Serve shared static assets (e.g., logos) from backend public directory
app.use('/public', express.static(path.join(__dirname, '../public')));
// Backward compatibility + fallback route for the logo until it is moved to appBackend/public
app.get('/public/icon.png', (req, res) => {
  const publicIcon = path.join(__dirname, '../public/icon.png');
  if (fs.existsSync(publicIcon)) {
    return res.sendFile(publicIcon);
  }
  // Fallback to the frontend asset if public icon is not present
  const frontendIcon = path.join(__dirname, '..', '..', 'appFrontend', 'assets', 'icon.png');
  return res.sendFile(frontendIcon);
});

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
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Payment Successful</title>
  <style>
    :root {
      --bg: #0b1220;
      --card: #0f172a;
      --muted: #94a3b8;
      --fg: #e2e8f0;
      --brand: #06b6d4; /* cyan-500 */
      --success: #16a34a;
      --success-weak: #16a34a22;
      --ring: #334155;
      --button: #1e293b;
      --button-hover: #334155;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: linear-gradient(180deg, #0b1220 0%, #0a0f1c 100%);
      color: var(--fg);
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji;
      height: 100%;
    }
    .container {
      min-height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      width: 100%;
      max-width: 460px;
      background: var(--card);
      border: 1px solid var(--ring);
      border-radius: 16px;
      padding: 28px;
      box-shadow: 0 10px 30px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.02);
      text-align: center;
    }
    .logo {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      display: block;
      margin: 0 auto 14px;
      box-shadow: 0 8px 28px rgba(6,182,212,.28);
      border: 1px solid rgba(6,182,212,.35);
      background: radial-gradient(120px 60px at 20% 10%, rgba(6,182,212,.15), transparent 60%);
    }
    .icon-wrap {
      width: 72px;
      height: 72px;
      margin: 0 auto 16px;
      border-radius: 999px;
      background: var(--success-weak);
      display: grid;
      place-items: center;
      border: 1px solid rgba(22,163,74,.35);
    }
    h1 {
      margin: 10px 0 8px;
      font-size: 22px;
      line-height: 1.2;
      letter-spacing: 0.2px;
    }
    p {
      margin: 0;
      color: var(--muted);
      font-size: 14px;
      line-height: 1.5;
    }
    .actions {
      margin-top: 20px;
      display: grid;
      gap: 10px;
    }
    button {
      -webkit-tap-highlight-color: transparent;
      appearance: none;
      border: 1px solid var(--ring);
      background: var(--button);
      color: var(--fg);
      padding: 12px 14px;
      border-radius: 10px;
      font-weight: 600;
      font-size: 14px;
      letter-spacing: .2px;
    }
    button.primary {
      background: var(--success);
      border-color: #15803d;
    }
    button:hover { background: var(--button-hover); cursor: pointer; }
    button.primary:hover { filter: brightness(0.95); }
    .hint {
      margin-top: 8px;
      font-size: 12px;
      color: var(--muted);
    }
    .footer {
      margin-top: 18px;
      font-size: 12px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card" role="status" aria-live="polite">
      <img class="logo" src="/public/icon.png" alt="App logo"/>
      <div class="icon-wrap" aria-hidden="true">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="#16a34a" stroke-width="1.5" fill="none"/>
          <path d="M7 12.5l3.2 3.2L17 8.8" stroke="#16a34a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <h1>Payment Successful</h1>
      <p>Wave payment received. You can now close this window and return to the app.</p>
      <div class="actions">
        <button class="primary" onclick="tryClose()">Close this window</button>
        <button onclick="refresh()">Refresh status</button>
      </div>
      <div class="hint">If the window doesn't close, switch back to the app.</div>
      <div class="footer">Thank you for your payment.</div>
    </div>
  </div>
  <script>
    function tryClose() {
      // Attempt to close if opened as a popup
      window.close();
    }
    function refresh() {
      location.reload();
    }
  </script>
</body>
</html>`;
  res.set('Content-Type', 'text/html; charset=utf-8').status(200).send(html);
});
app.get('/payments/wave/error', (_req, res) => {
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Payment Not Completed</title>
  <style>
    :root {
      --bg: #0b1220;
      --card: #0f172a;
      --muted: #94a3b8;
      --fg: #e2e8f0;
      --brand: #06b6d4;
      --error: #dc2626;
      --error-weak: #dc262622;
      --ring: #334155;
      --button: #1e293b;
      --button-hover: #334155;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: linear-gradient(180deg, #0b1220 0%, #0a0f1c 100%);
      color: var(--fg);
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji;
      height: 100%;
    }
    .container {
      min-height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      width: 100%;
      max-width: 460px;
      background: var(--card);
      border: 1px solid var(--ring);
      border-radius: 16px;
      padding: 28px;
      box-shadow: 0 10px 30px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.02);
      text-align: center;
    }
    .logo {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      display: block;
      margin: 0 auto 14px;
      box-shadow: 0 8px 28px rgba(6,182,212,.22);
      border: 1px solid rgba(6,182,212,.28);
      background: radial-gradient(120px 60px at 20% 10%, rgba(6,182,212,.12), transparent 60%);
    }
    .icon-wrap {
      width: 72px;
      height: 72px;
      margin: 0 auto 16px;
      border-radius: 999px;
      background: var(--error-weak);
      display: grid;
      place-items: center;
      border: 1px solid rgba(220,38,38,.35);
    }
    h1 {
      margin: 10px 0 8px;
      font-size: 22px;
      line-height: 1.2;
      letter-spacing: 0.2px;
    }
    p {
      margin: 0;
      color: var(--muted);
      font-size: 14px;
      line-height: 1.5;
    }
    .actions {
      margin-top: 20px;
      display: grid;
      gap: 10px;
    }
    button {
      -webkit-tap-highlight-color: transparent;
      appearance: none;
      border: 1px solid var(--ring);
      background: var(--button);
      color: var(--fg);
      padding: 12px 14px;
      border-radius: 10px;
      font-weight: 600;
      font-size: 14px;
      letter-spacing: .2px;
    }
    button:hover { background: var(--button-hover); cursor: pointer; }
    .hint {
      margin-top: 8px;
      font-size: 12px;
      color: var(--muted);
    }
    .footer {
      margin-top: 18px;
      font-size: 12px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card" role="status" aria-live="polite">
      <img class="logo" src="/public/icon.png" alt="App logo"/>
      <div class="icon-wrap" aria-hidden="true">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="#dc2626" stroke-width="1.5" fill="none"/>
          <path d="M8 8l8 8M16 8l-8 8" stroke="#dc2626" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <h1>Payment Not Completed</h1>
      <p>Wave payment failed or was cancelled. You may close this window and try again from the app.</p>
      <div class="actions">
        <button onclick="tryClose()">Close this window</button>
      </div>
      <div class="hint">If the window doesn't close, switch back to the app to retry.</div>
      <div class="footer">No charge was made.</div>
    </div>
  </div>
  <script>
    function tryClose() {
      window.close();
    }
  </script>
</body>
</html>`;
  res.set('Content-Type', 'text/html; charset=utf-8').status(200).send(html);
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
app.use('/api/service-bookings', serviceBookingsRoutes);
app.use('/api/service-providers', serviceProvidersRoutes);
app.use('/api/property-listings', propertyListingsRoutes);
app.use('/api/property-bookings', propertyBookingsRoutes);
app.use('/api/property-agents', propertyAgentsRoutes);
app.use('/api/provider-subscriptions', providerSubscriptionsRoutes);

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

const runSubscriptionMaintenance = async () => {
  try {
    const backfill = await backfillGraceSubscriptions();
    const expired = await expireDueSubscriptions();
    logger.info('✅ Provider subscription maintenance', { backfill, expired });
  } catch (error) {
    logger.error('❌ Error running provider subscription maintenance:', error);
  }
};

setInterval(runSubscriptionMaintenance, 60 * 60 * 1000);
runSubscriptionMaintenance();

export default app; 