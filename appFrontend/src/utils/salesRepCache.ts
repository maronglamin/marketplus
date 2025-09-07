import AsyncStorage from '@react-native-async-storage/async-storage';

interface SalesRepCache {
  userId: string;
  isSalesRep: boolean;
  salesRepData: any | null;
  timestamp: number;
}

const CACHE_KEY = 'sales_rep_status_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export class SalesRepCache {
  private static instance: SalesRepCache;
  private cache: Map<string, SalesRepCache> = new Map();

  static getInstance(): SalesRepCache {
    if (!SalesRepCache.instance) {
      SalesRepCache.instance = new SalesRepCache();
    }
    return SalesRepCache.instance;
  }

  async getSalesRepStatus(userId: string): Promise<{ isSalesRep: boolean; salesRepData: any | null } | null> {
    try {
      // Check memory cache first
      const memoryCache = this.cache.get(userId);
      if (memoryCache && Date.now() - memoryCache.timestamp < CACHE_DURATION) {
        console.log('Sales rep status from memory cache:', memoryCache);
        return {
          isSalesRep: memoryCache.isSalesRep,
          salesRepData: memoryCache.salesRepData
        };
      }

      // Check persistent cache
      const cacheData = await AsyncStorage.getItem(`${CACHE_KEY}_${userId}`);
      if (cacheData) {
        const parsedCache: SalesRepCache = JSON.parse(cacheData);
        if (Date.now() - parsedCache.timestamp < CACHE_DURATION) {
          console.log('Sales rep status from persistent cache:', parsedCache);
          // Update memory cache
          this.cache.set(userId, parsedCache);
          return {
            isSalesRep: parsedCache.isSalesRep,
            salesRepData: parsedCache.salesRepData
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting sales rep status from cache:', error);
      return null;
    }
  }

  async setSalesRepStatus(userId: string, isSalesRep: boolean, salesRepData: any | null): Promise<void> {
    try {
      const cacheEntry: SalesRepCache = {
        userId,
        isSalesRep,
        salesRepData,
        timestamp: Date.now()
      };

      // Update memory cache
      this.cache.set(userId, cacheEntry);

      // Update persistent cache
      await AsyncStorage.setItem(`${CACHE_KEY}_${userId}`, JSON.stringify(cacheEntry));
      
      console.log('Sales rep status cached:', cacheEntry);
    } catch (error) {
      console.error('Error setting sales rep status cache:', error);
    }
  }

  async clearCache(userId?: string): Promise<void> {
    try {
      if (userId) {
        // Clear specific user cache
        this.cache.delete(userId);
        await AsyncStorage.removeItem(`${CACHE_KEY}_${userId}`);
      } else {
        // Clear all cache
        this.cache.clear();
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter(key => key.startsWith(CACHE_KEY));
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      console.error('Error clearing sales rep cache:', error);
    }
  }
}

export const salesRepCache = SalesRepCache.getInstance();
