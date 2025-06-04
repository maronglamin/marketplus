import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Keys for secure storage
const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  DEVICE_INFO: 'device_info',
} as const;

// Options for secure storage
const STORAGE_OPTIONS = {
  keychainAccessible: Platform.select({
    ios: SecureStore.WHEN_UNLOCKED,
    android: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    default: SecureStore.WHEN_UNLOCKED,
  }),
} as const;

/**
 * Store sensitive data securely
 */
export const secureStore = {
  /**
   * Store a value securely
   */
  async setItem(key: keyof typeof STORAGE_KEYS, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS[key], value, STORAGE_OPTIONS);
    } catch (error) {
      console.error('Error storing data securely:', error);
      throw new Error('Failed to store data securely');
    }
  },

  /**
   * Retrieve a value securely
   */
  async getItem(key: keyof typeof STORAGE_KEYS): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(STORAGE_KEYS[key], STORAGE_OPTIONS);
    } catch (error) {
      console.error('Error retrieving data securely:', error);
      throw new Error('Failed to retrieve data securely');
    }
  },

  /**
   * Remove a value securely
   */
  async removeItem(key: keyof typeof STORAGE_KEYS): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS[key], STORAGE_OPTIONS);
    } catch (error) {
      console.error('Error removing data securely:', error);
      throw new Error('Failed to remove data securely');
    }
  },

  /**
   * Store an object securely
   */
  async setObject<T>(key: keyof typeof STORAGE_KEYS, value: T): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await this.setItem(key, jsonValue);
    } catch (error) {
      console.error('Error storing object securely:', error);
      throw new Error('Failed to store object securely');
    }
  },

  /**
   * Retrieve an object securely
   */
  async getObject<T>(key: keyof typeof STORAGE_KEYS): Promise<T | null> {
    try {
      const jsonValue = await this.getItem(key);
      return jsonValue ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error('Error retrieving object securely:', error);
      throw new Error('Failed to retrieve object securely');
    }
  },
}; 