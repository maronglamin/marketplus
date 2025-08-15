interface RateLimitConfig {
  maxRequests: number;
  timeWindow: number; // in milliseconds
  retryDelay: number; // base delay in milliseconds
  maxRetries: number;
}

interface RequestTracker {
  count: number;
  resetTime: number;
  lastRequestTime: number;
}

class RateLimiter {
  private requestTrackers: Map<string, RequestTracker> = new Map();
  private retryCounts: Map<string, number> = new Map();

  constructor(private config: RateLimitConfig = {
    maxRequests: 10,
    timeWindow: 60000, // 1 minute
    retryDelay: 1000, // 1 second
    maxRetries: 3
  }) {}

  /**
   * Check if a request can be made for the given endpoint
   */
  canMakeRequest(endpoint: string): boolean {
    const now = Date.now();
    const tracker = this.requestTrackers.get(endpoint);

    if (!tracker) {
      this.requestTrackers.set(endpoint, {
        count: 1,
        resetTime: now + this.config.timeWindow,
        lastRequestTime: now
      });
      return true;
    }

    // Reset counter if time window has passed
    if (now > tracker.resetTime) {
      tracker.count = 1;
      tracker.resetTime = now + this.config.timeWindow;
      tracker.lastRequestTime = now;
      return true;
    }

    // Check if we're within the rate limit
    if (tracker.count < this.config.maxRequests) {
      tracker.count++;
      tracker.lastRequestTime = now;
      return true;
    }

    return false;
  }

  /**
   * Record a successful request
   */
  recordSuccess(endpoint: string): void {
    this.retryCounts.delete(endpoint);
  }

  /**
   * Handle a 429 response with exponential backoff
   */
  async handleRateLimit(endpoint: string): Promise<number> {
    const retryCount = this.retryCounts.get(endpoint) || 0;
    
    if (retryCount >= this.config.maxRetries) {
      throw new Error('Max retries exceeded for rate limiting');
    }

    const delay = this.config.retryDelay * Math.pow(2, retryCount);
    this.retryCounts.set(endpoint, retryCount + 1);

    console.log(`🔄 Rate limited for ${endpoint}, retrying in ${delay}ms (attempt ${retryCount + 1})`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return delay;
  }

  /**
   * Get time until next request can be made
   */
  getTimeUntilReset(endpoint: string): number {
    const tracker = this.requestTrackers.get(endpoint);
    if (!tracker) return 0;
    
    const now = Date.now();
    return Math.max(0, tracker.resetTime - now);
  }

  /**
   * Reset rate limit for an endpoint
   */
  reset(endpoint: string): void {
    this.requestTrackers.delete(endpoint);
    this.retryCounts.delete(endpoint);
  }

  /**
   * Get current request count for an endpoint
   */
  getRequestCount(endpoint: string): number {
    const tracker = this.requestTrackers.get(endpoint);
    return tracker ? tracker.count : 0;
  }
}

// Create a global rate limiter instance
export const rateLimiter = new RateLimiter();

// Enhanced fetch function with rate limiting
export async function rateLimitedFetch(
  endpoint: string,
  fetchFn: () => Promise<any>,
  maxRetries: number = 3
): Promise<any> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Check rate limit before making request
      if (!rateLimiter.canMakeRequest(endpoint)) {
        const waitTime = rateLimiter.getTimeUntilReset(endpoint);
        console.log(`⏳ Rate limit reached for ${endpoint}, waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      const result = await fetchFn();
      rateLimiter.recordSuccess(endpoint);
      return result;
    } catch (error: any) {
      lastError = error;
      
      // Handle 429 responses specifically
      if (error.response?.status === 429) {
        try {
          await rateLimiter.handleRateLimit(endpoint);
          continue; // Retry the request
        } catch (retryError) {
          throw new Error(`Rate limit exceeded after ${maxRetries} retries`);
        }
      }
      
      // For other errors, don't retry
      throw error;
    }
  }

  throw lastError;
}

// Debounce utility for frequent operations
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle utility for rate-limited operations
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
} 