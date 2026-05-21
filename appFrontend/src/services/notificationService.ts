import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from '../api/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationToken {
  token: string;
  userId: string;
  deviceType: 'ios' | 'android' | 'web';
}

class NotificationService {
  private static instance: NotificationService;
  private token: string | null = null;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Request notification permissions and register for push notifications
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      // Check if device supports notifications
      if (!Device.isDevice) {
        console.log('Must use physical device for Push Notifications');
        return null;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }

      // Get the token
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;

      if (!projectId) {
        console.log('Missing Expo project ID for push notifications');
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      this.token = token.data;
      console.log('Push token:', this.token);

      // Save token to AsyncStorage
      await AsyncStorage.setItem('fcmToken', this.token);

      return this.token;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Get the current FCM token
   */
  async getToken(): Promise<string | null> {
    if (this.token) {
      return this.token;
    }

    // Try to get from AsyncStorage
    const storedToken = await AsyncStorage.getItem('fcmToken');
    if (storedToken) {
      this.token = storedToken;
      return this.token;
    }

    // Register for new token
    return await this.registerForPushNotifications();
  }

  /**
   * Send FCM token to backend
   */
  async sendTokenToBackend(userId: string): Promise<boolean> {
    try {
      const token = await this.getToken();
      if (!token) {
        console.log('No FCM token available');
        return false;
      }

      const response = await api.post('/api/users/fcm-token', {
        token,
        userId,
        deviceType: Platform.OS,
      });

      console.log('FCM token sent to backend successfully');
      return true;
    } catch (error) {
      console.error('Error sending FCM token to backend:', error);
      return false;
    }
  }

  /**
   * Remove FCM token from backend
   */
  async removeTokenFromBackend(): Promise<boolean> {
    try {
      const token = await this.getToken();
      if (!token) {
        return true;
      }

      await api.delete('/api/users/fcm-token', {
        data: { token }
      });

      // Clear local token
      this.token = null;
      await AsyncStorage.removeItem('fcmToken');

      console.log('FCM token removed from backend successfully');
      return true;
    } catch (error) {
      console.error('Error removing FCM token from backend:', error);
      return false;
    }
  }

  /**
   * Send a local notification (for testing)
   */
  async sendLocalNotification(title: string, body: string, data?: any): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
      },
      trigger: null, // Send immediately
    });
  }

  /**
   * Add notification listener
   */
  addNotificationListener(callback: (notification: Notifications.Notification) => void): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(callback);
  }

  /**
   * Add notification response listener (when user taps notification)
   */
  addNotificationResponseListener(callback: (response: Notifications.NotificationResponse) => void): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  /**
   * Remove notification listener
   */
  removeNotificationListener(subscription: Notifications.Subscription): void {
    subscription.remove();
  }

  /**
   * Get notification permissions status
   */
  async getPermissionsStatus(): Promise<Notifications.NotificationPermissionsStatus> {
    return await Notifications.getPermissionsAsync();
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<Notifications.NotificationPermissionsStatus> {
    return await Notifications.requestPermissionsAsync();
  }

  /**
   * Handle ride token notification and show floating notification
   */
  handleRideTokenNotification(notification: Notifications.Notification): void {
    const data = notification.request.content.data;
    
    if (data?.type === 'ride_token') {
      // Import the token notification context and show the notification
      // This will be handled by the App component
      console.log('Ride token notification received:', data);
      
      // Dispatch a custom event that the App component can listen to
      const event = new CustomEvent('rideTokenNotification', {
        detail: {
          token: data.token,
          rideId: data.rideId,
          driverName: data.driverName,
        }
      });
      
      // For React Native, we'll use a different approach
      // The App component will handle this through the notification listener
    }
  }
}

export const notificationService = NotificationService.getInstance(); 