/**
 * Webhook Configuration Utility
 * Provides flexible URL configuration for Yonna Forex webhooks
 */

export interface WebhookConfig {
  baseUrl: string;
  webhookUrl: string;
  testUrl: string;
  statusUrl: string;
}

/**
 * Get webhook configuration with fallback support
 */
export function getWebhookConfig(): WebhookConfig {
  // Primary: Use environment variable
  const apiBaseUrl = process.env.API_BASE_URL;
  
  // Fallback: Use static domain
  const fallbackUrl = 'https://cloudnexus.biz';
  
  // Development fallback
  const devUrl = 'http://localhost:3000';
  
  // Determine the base URL to use
  let baseUrl: string;
  
  if (apiBaseUrl) {
    baseUrl = apiBaseUrl;
  } else if (process.env.NODE_ENV === 'production') {
    baseUrl = fallbackUrl;
  } else {
    baseUrl = devUrl;
  }
  
  return {
    baseUrl,
    webhookUrl: `${baseUrl}/api/payments/yonna-forex/webhook`,
    testUrl: `${baseUrl}/api/payments/yonna-forex/test-webhook`,
    statusUrl: `${baseUrl}/api/payments/yonna-forex/webhook/status`
  };
}

/**
 * Get webhook URLs for documentation
 */
export function getWebhookUrls() {
  const config = getWebhookConfig();
  const envUrl = process.env.API_BASE_URL;
  const fallbackUrl = 'https://cloudnexus.biz';
  
  return {
    primary: envUrl ? `${envUrl}/api/payments/yonna-forex/webhook` : null,
    fallback: `${fallbackUrl}/api/payments/yonna-forex/webhook`,
    current: config.webhookUrl,
    test: config.testUrl,
    status: config.statusUrl
  };
}

/**
 * Validate webhook URL accessibility
 */
export async function validateWebhookUrl(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${url}/status`, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.warn(`Webhook URL validation failed for ${url}:`, error);
    return false;
  }
}

export default {
  getWebhookConfig,
  getWebhookUrls,
  validateWebhookUrl
};
