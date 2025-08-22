import { io, Socket } from 'socket.io-client';
import { getAuthToken } from '../api/auth';

export interface RideUpdate {
  type: string;
  rideId: string;
  data: {
    status: string;
    driverLocation?: {
      latitude: number;
      longitude: number;
      heading?: number;
      speed?: number;
    };
    estimatedArrival?: number;
    progress?: number;
  };
  timestamp: string;
}

export interface DriverLocationUpdate {
  type: string;
  rideId: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
    timestamp: string;
  };
  timestamp: string;
}

export interface RideAcceptedNotification {
  type: string;
  requestId: string;
  data: {
    driver: {
      id: string;
      name: string;
      vehicle: string;
      plateNumber: string;
      rating: number;
      phone: string;
    };
    estimatedArrival: number;
    timestamp: string;
  };
}

export interface NewRideRequest {
  type: string;
  requestId: string;
  data: {
    pickupLocation: any;
    destinationLocation: any;
    estimatedPrice: number;
    estimatedDistance: number;
    estimatedDuration: number;
    customerName: string;
  };
  timestamp: string;
}

export type RideUpdateCallback = (update: RideUpdate) => void;
export type DriverLocationCallback = (update: DriverLocationUpdate) => void;
export type RideAcceptedCallback = (notification: RideAcceptedNotification) => void;
export type NewRideRequestCallback = (request: NewRideRequest) => void;

export class RealTimeRideService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second

  // Event callbacks
  private rideUpdateCallbacks: RideUpdateCallback[] = [];
  private driverLocationCallbacks: DriverLocationCallback[] = [];
  private rideAcceptedCallbacks: RideAcceptedCallback[] = [];
  private newRideRequestCallbacks: NewRideRequestCallback[] = [];

  // Connection state
  private connectionPromise: Promise<void> | null = null;

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Handle connection events
    if (this.socket) {
      this.socket.on('connect', () => {
        console.log('🔌 WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
      });

      this.socket.on('disconnect', (reason) => {
        console.log('🔌 WebSocket disconnected:', reason);
        this.isConnected = false;
        
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, don't reconnect
          return;
        }
        
        this.attemptReconnect();
      });

      this.socket.on('connect_error', (error) => {
        console.error('🔌 WebSocket connection error:', error);
        this.isConnected = false;
        this.attemptReconnect();
      });

      // Handle ride-related events
      this.socket.on('ride_update', (update: RideUpdate) => {
        console.log('📡 Received ride update:', update);
        this.rideUpdateCallbacks.forEach(callback => callback(update));
      });

      this.socket.on('driver_location_update', (update: DriverLocationUpdate) => {
        console.log('📍 Received driver location update:', update);
        this.driverLocationCallbacks.forEach(callback => callback(update));
      });

      this.socket.on('ride_accepted', (notification: RideAcceptedNotification) => {
        console.log('✅ Received ride acceptance:', notification);
        this.rideAcceptedCallbacks.forEach(callback => callback(notification));
      });

      this.socket.on('new_ride_request', (request: NewRideRequest) => {
        console.log('🚗 Received new ride request:', request);
        this.newRideRequestCallbacks.forEach(callback => callback(request));
      });
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
    
    console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise(async (resolve, reject) => {
      try {
        const token = await getAuthToken();
        if (!token) {
          throw new Error('No authentication token available');
        }

        // Create socket connection
        this.socket = io('http://192.168.137.200:3000', {
          auth: { token },
          transports: ['websocket', 'polling'],
          timeout: 20000,
          forceNew: true
        });

        this.setupEventListeners();

        // Wait for connection
        this.socket.once('connect', () => {
          console.log('🔌 WebSocket connected successfully');
          resolve();
        });

        this.socket.once('connect_error', (error) => {
          console.error('❌ WebSocket connection failed:', error);
          reject(error);
        });

        // Timeout after 20 seconds
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('Connection timeout'));
          }
        }, 20000);

      } catch (error) {
        console.error('❌ Error connecting to WebSocket:', error);
        reject(error);
      }
    });

    try {
      await this.connectionPromise;
    } finally {
      this.connectionPromise = null;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      console.log('🔌 WebSocket disconnected');
    }
  }

  /**
   * Join a specific ride room to receive updates
   */
  joinRide(rideId: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join-ride', rideId);
      console.log(`🚗 Joined ride room: ${rideId}`);
    }
  }

  /**
   * Leave a specific ride room
   */
  leaveRide(rideId: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave-ride', rideId);
      console.log(`🚗 Left ride room: ${rideId}`);
    }
  }

  /**
   * Subscribe to ride updates
   */
  onRideUpdate(callback: RideUpdateCallback) {
    this.rideUpdateCallbacks.push(callback);
    return () => {
      const index = this.rideUpdateCallbacks.indexOf(callback);
      if (index > -1) {
        this.rideUpdateCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to driver location updates
   */
  onDriverLocationUpdate(callback: DriverLocationCallback) {
    this.driverLocationCallbacks.push(callback);
    return () => {
      const index = this.driverLocationCallbacks.indexOf(callback);
      if (index > -1) {
        this.driverLocationCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to ride acceptance notifications
   */
  onRideAccepted(callback: RideAcceptedCallback) {
    this.rideAcceptedCallbacks.push(callback);
    return () => {
      const index = this.rideAcceptedCallbacks.indexOf(callback);
      if (index > -1) {
        this.rideAcceptedCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to new ride requests (for drivers)
   */
  onNewRideRequest(callback: NewRideRequestCallback) {
    this.newRideRequestCallbacks.push(callback);
    return () => {
      const index = this.newRideRequestCallbacks.indexOf(callback);
      if (index > -1) {
        this.newRideRequestCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Check if connected
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Get connection info
   */
  getConnectionInfo() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts
    };
  }
}

// Create singleton instance
export const realTimeRideService = new RealTimeRideService();

// Export for use in components
export default realTimeRideService; 