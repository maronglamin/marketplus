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
  private requestTrackers: Map<string, RequestTracker> = new Map()
  private retryCounts: Map<string, number> = new Map()
  private config = {
    maxRequests: 50, // Increased from 10 to 50 requests per window
    windowMs: 60000, // 1 minute window
    retryDelay: 2000, // Increased base delay for retries (2 seconds)
    maxRetries: 2, // Reduced from 3 to 2 retries to prevent excessive retries
    backoffMultiplier: 1.5, // Reduced from 2 to 1.5 for less aggressive backoff
  }

  /**
   * Check if a request can be made for the given endpoint
   */
  canMakeRequest(endpoint: string): boolean {
    const tracker = this.requestTrackers.get(endpoint)
    if (!tracker) return true

    const now = Date.now()
    const windowStart = now - this.config.windowMs

    // Remove old requests outside the window
    tracker.requests = tracker.requests.filter(timestamp => timestamp > windowStart)

    return tracker.requests.length < this.config.maxRequests
  }

  /**
   * Record a successful request
   */
  recordSuccess(endpoint: string): void {
    if (!this.requestTrackers.has(endpoint)) {
      this.requestTrackers.set(endpoint, { requests: [] })
    }

    const tracker = this.requestTrackers.get(endpoint)!
    tracker.requests.push(Date.now())

    // Reset retry count on success
    this.retryCounts.delete(endpoint)
  }

  /**
   * Handle a 429 response with exponential backoff
   */
  async handleRateLimit(endpoint: string): Promise<number> {
    const retryCount = this.retryCounts.get(endpoint) || 0
    
    if (retryCount >= this.config.maxRetries) {
      throw new Error('Max retries exceeded for rate limiting')
    }

    const delay = this.config.retryDelay * Math.pow(this.config.backoffMultiplier, retryCount)
    this.retryCounts.set(endpoint, retryCount + 1)

    console.log(`🔄 Rate limited for ${endpoint}, retrying in ${delay}ms (attempt ${retryCount + 1})`)
    
    await new Promise(resolve => setTimeout(resolve, delay))
    return delay
  }

  /**
   * Get time until next request can be made
   */
  getTimeUntilReset(endpoint: string): number {
    const tracker = this.requestTrackers.get(endpoint)
    if (!tracker || tracker.requests.length < this.config.maxRequests) {
      return 0
    }

    const oldestRequest = Math.min(...tracker.requests)
    const windowEnd = oldestRequest + this.config.windowMs
    return Math.max(0, windowEnd - Date.now())
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