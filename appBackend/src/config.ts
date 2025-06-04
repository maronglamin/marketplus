import { z } from 'zod';
import { logger } from './utils/logger';

// Debug: Log all environment variables (excluding sensitive ones)
logger.debug('Environment variables:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL ? '[REDACTED]' : undefined,
  JWT_SECRET: process.env.JWT_SECRET ? '[REDACTED]' : undefined,
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ? '[REDACTED]' : undefined,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ? '[REDACTED]' : undefined,
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
  CORS_ORIGINS: process.env.CORS_ORIGINS,
});

// Define the schema for environment variables
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  
  // Database
  DATABASE_URL: z.string().url(),
  
  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  
  // Twilio
  TWILIO_ACCOUNT_SID: z.string(),
  TWILIO_AUTH_TOKEN: z.string(),
  TWILIO_PHONE_NUMBER: z.string(),
  
  // CORS
  CORS_ORIGINS: z.string().transform((val) => val.split(',')),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).default('info'),
});

let config;

try {
  // Parse and validate environment variables
  const env = envSchema.parse(process.env);

  // Create configuration object
  config = {
    env: env.NODE_ENV,
    port: parseInt(env.PORT, 10),
    
    database: {
      url: env.DATABASE_URL,
    },
    
    jwt: {
      secret: env.JWT_SECRET,
      expiresIn: env.JWT_EXPIRES_IN,
    },
    
    twilio: {
      accountSid: env.TWILIO_ACCOUNT_SID,
      authToken: env.TWILIO_AUTH_TOKEN,
      phoneNumber: env.TWILIO_PHONE_NUMBER,
    },
    
    cors: {
      origins: env.CORS_ORIGINS,
    },
    
    rateLimit: {
      windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS, 10),
      max: parseInt(env.RATE_LIMIT_MAX_REQUESTS, 10),
    },
    
    logging: {
      level: env.LOG_LEVEL,
    },
  } as const;
} catch (error) {
  logger.error('Failed to parse environment variables:', error);
  throw error;
}

export { config }; 