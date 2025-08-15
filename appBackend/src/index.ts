// Load environment variables first
import dotenv from 'dotenv';
import path from 'path';

// Log the current working directory and .env file path
console.log('Current working directory:', process.cwd());
console.log('Looking for .env file at:', path.resolve(process.cwd(), '.env'));

// Load environment variables
const result = dotenv.config();
if (result.error) {
  console.error('Error loading .env file:', result.error);
} else {
  console.log('.env file loaded successfully');
}

import { logger } from './utils/logger';
import app from './app';
import { PrismaClient } from '@prisma/client';
import { createServer } from 'http';
import { WebSocketService } from './services/websocketService';

// Initialize Prisma client
const prisma = new PrismaClient();

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket service
const webSocketService = new WebSocketService(server);

// Make WebSocket service available globally for other services
(global as any).webSocketService = webSocketService;

// Handle graceful shutdown
async function shutdown(signal: string) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close Prisma connection
    await prisma.$disconnect();
    logger.info('Database connection closed');
    
    // Close server
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`🚀 Server is running on port ${PORT}`);
  logger.info(`🔌 WebSocket service is ready for real-time updates`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error: Error) => {
  logger.error('Unhandled Rejection:', error);
  // Close server and exit process
  server.close(() => {
    process.exit(1);
  });
}); 