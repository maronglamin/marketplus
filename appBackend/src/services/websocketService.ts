import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export interface SocketUser {
  userId: string;
  userType: 'customer' | 'driver';
  socketId: string;
}

export interface RideUpdateData {
  rideId: string;
  status: string;
  driverLocation?: {
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
  };
  estimatedArrival?: number;
  progress?: number;
}

export class WebSocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, SocketUser> = new Map();
  private userSockets: Map<string, string[]> = new Map(); // userId -> socketIds[]

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    console.log('🚀 WebSocket service initialized');
  }

  private setupEventHandlers() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
        socket.data.user = decoded;
        next();
      } catch (error) {
        console.error('WebSocket authentication error:', error);
        next(new Error('Authentication error: Invalid token'));
      }
    });

    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });
  }

  private handleConnection(socket: any) {
    const user = socket.data.user;
    if (!user) {
      socket.disconnect();
      return;
    }

    console.log(`🔌 WebSocket connected: ${user.userType} ${user.id}`);

    // Store user connection
    this.addUserConnection(user.id, user.userType, socket.id);

    // Join user-specific room
    socket.join(`user:${user.id}`);
    if (user.userType === 'driver') {
      socket.join('drivers');
    } else {
      socket.join('customers');
    }

    // Handle ride-specific events
    socket.on('join-ride', (rideId: string) => {
      socket.join(`ride:${rideId}`);
      console.log(`🚗 User ${user.id} joined ride room: ${rideId}`);
    });

    socket.on('leave-ride', (rideId: string) => {
      socket.leave(`ride:${rideId}`);
      console.log(`🚗 User ${user.id} left ride room: ${rideId}`);
    });

    socket.on('disconnect', () => {
      this.removeUserConnection(user.id, socket.id);
      console.log(`🔌 WebSocket disconnected: ${user.userType} ${user.id}`);
    });
  }

  private addUserConnection(userId: string, userType: 'customer' | 'driver', socketId: string) {
    // Store user info
    this.connectedUsers.set(socketId, { userId, userType, socketId });
    
    // Store socket IDs for user
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, []);
    }
    this.userSockets.get(userId)!.push(socketId);
  }

  private removeUserConnection(userId: string, socketId: string) {
    this.connectedUsers.delete(socketId);
    
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      const index = userSockets.indexOf(socketId);
      if (index > -1) {
        userSockets.splice(index, 1);
      }
      if (userSockets.length === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  // Send ride status update to all users involved in the ride
  public async sendRideUpdate(rideId: string, updateData: RideUpdateData) {
    try {
      // Get ride details to find customer and driver
      const ride = await prisma.ride.findUnique({
        where: { id: rideId },
        include: {
          customer: true,
          driver: true
        }
      });

      if (!ride) {
        console.error(`❌ Ride not found for update: ${rideId}`);
        return;
      }

      const updatePayload = {
        type: 'ride_update',
        rideId,
        data: updateData,
        timestamp: new Date().toISOString()
      };

      // Send to ride room (both customer and driver)
      this.io.to(`ride:${rideId}`).emit('ride_update', updatePayload);
      
      // Also send to specific user rooms for reliability
      this.io.to(`user:${ride.customerId}`).emit('ride_update', updatePayload);
      this.io.to(`user:${ride.driverId}`).emit('ride_update', updatePayload);

      console.log(`📡 Ride update sent for ride ${rideId}:`, updateData.status);
    } catch (error) {
      console.error('❌ Error sending ride update:', error);
    }
  }

  // Send driver location update to customer
  public async sendDriverLocationUpdate(rideId: string, driverLocation: any) {
    try {
      const ride = await prisma.ride.findUnique({
        where: { id: rideId },
        select: { customerId: true }
      });

      if (!ride) return;

      const locationPayload = {
        type: 'driver_location_update',
        rideId,
        location: driverLocation,
        timestamp: new Date().toISOString()
      };

      // Send to ride room and customer room
      this.io.to(`ride:${rideId}`).emit('driver_location_update', locationPayload);
      this.io.to(`user:${ride.customerId}`).emit('driver_location_update', locationPayload);

      console.log(`📍 Driver location update sent for ride ${rideId}`);
    } catch (error) {
      console.error('❌ Error sending driver location update:', error);
    }
  }

  // Send ride request notification to nearby drivers
  public async sendRideRequestToDrivers(rideRequest: any, nearbyDrivers: string[]) {
    try {
      const requestPayload = {
        type: 'new_ride_request',
        requestId: rideRequest.requestId,
        data: {
          pickupLocation: rideRequest.pickupLocation,
          destinationLocation: rideRequest.destinationLocation,
          estimatedPrice: rideRequest.estimatedPrice,
          estimatedDistance: rideRequest.estimatedDistance,
          estimatedDuration: rideRequest.estimatedDuration,
          customerName: rideRequest.customer?.firstName || 'Customer'
        },
        timestamp: new Date().toISOString()
      };

      // Send to all online drivers
      this.io.to('drivers').emit('new_ride_request', requestPayload);
      
      // Also send to specific nearby drivers if available
      nearbyDrivers.forEach(driverId => {
        this.io.to(`user:${driverId}`).emit('new_ride_request', requestPayload);
      });

      console.log(`🚗 Ride request sent to ${nearbyDrivers.length} nearby drivers`);
    } catch (error) {
      console.error('❌ Error sending ride request to drivers:', error);
    }
  }

  // Send ride acceptance notification to customer
  public async sendRideAcceptedNotification(rideRequest: any, driver: any) {
    try {
      const acceptancePayload = {
        type: 'ride_accepted',
        requestId: rideRequest.requestId,
        data: {
          driver: {
            id: driver.id,
            name: `${driver.user.firstName} ${driver.user.lastName}`,
            vehicle: driver.vehicleInfo?.model || 'Car',
            plateNumber: driver.vehicleInfo?.plateNumber || 'N/A',
            rating: driver.rating || 0,
            phone: driver.user.phoneNumber
          },
          estimatedArrival: 5, // Default 5 minutes
          timestamp: new Date().toISOString()
        }
      };

      this.io.to(`user:${rideRequest.customerId}`).emit('ride_accepted', acceptancePayload);
      console.log(`✅ Ride acceptance sent to customer ${rideRequest.customerId}`);
    } catch (error) {
      console.error('❌ Error sending ride acceptance notification:', error);
    }
  }

  // Send ride token notification to customer
  public async sendRideTokenNotification(rideId: string, token: string, driverName: string, customerId: string) {
    try {
      const tokenPayload = {
        type: 'ride_token',
        rideId,
        data: {
          token,
          driverName,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
          timestamp: new Date().toISOString()
        }
      };

      // Send to customer's user room and ride room
      this.io.to(`user:${customerId}`).emit('ride_token', tokenPayload);
      this.io.to(`ride:${rideId}`).emit('ride_token', tokenPayload);

      console.log(`🎫 Ride token notification sent to customer ${customerId} for ride ${rideId}`);
    } catch (error) {
      console.error('❌ Error sending ride token notification:', error);
    }
  }

  // Get connected users count
  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  // Get connected drivers count
  public getConnectedDriversCount(): number {
    let count = 0;
    for (const user of this.connectedUsers.values()) {
      if (user.userType === 'driver') count++;
    }
    return count;
  }

  // Check if user is connected
  public isUserConnected(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  // Get all socket IDs for a user
  public getUserSocketIds(userId: string): string[] {
    return this.userSockets.get(userId) || [];
  }
} 