import crypto from 'crypto';

/**
 * Generate a secure webhook secret for Yonna Forex
 */
export function generateWebhookSecret(): string {
  // Generate a 32-byte (256-bit) random secret
  const secret = crypto.randomBytes(32).toString('hex');
  return secret;
}

/**
 * Generate a webhook secret with a specific format
 */
export function generateFormattedWebhookSecret(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = crypto.randomBytes(16).toString('hex');
  return `yf_${timestamp}_${randomPart}`;
}

/**
 * Validate webhook secret format
 */
export function validateWebhookSecret(secret: string): boolean {
  // Check if secret is at least 32 characters long
  if (secret.length < 32) {
    return false;
  }
  
  // Check if secret contains only valid characters (hex or base64)
  const validPattern = /^[a-fA-F0-9+/=_-]+$/;
  return validPattern.test(secret);
}

/**
 * Generate multiple secrets for different environments
 */
export function generateEnvironmentSecrets() {
  return {
    development: generateWebhookSecret(),
    staging: generateWebhookSecret(),
    production: generateWebhookSecret(),
    formatted: generateFormattedWebhookSecret()
  };
}

export default {
  generateWebhookSecret,
  generateFormattedWebhookSecret,
  validateWebhookSecret,
  generateEnvironmentSecrets
};
