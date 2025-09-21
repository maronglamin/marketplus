#!/usr/bin/env node

/**
 * Generate Yonna Forex Webhook Secret
 * 
 * This script generates a secure webhook secret for Yonna Forex integration.
 * Run with: node scripts/generate-yonna-webhook-secret.js
 */

const crypto = require('crypto');

function generateWebhookSecret() {
  // Generate a 32-byte (256-bit) random secret
  const secret = crypto.randomBytes(32).toString('hex');
  return secret;
}

function generateFormattedWebhookSecret() {
  const timestamp = Date.now().toString(36);
  const randomPart = crypto.randomBytes(16).toString('hex');
  return `yf_${timestamp}_${randomPart}`;
}

function generateEnvironmentSecrets() {
  return {
    development: generateWebhookSecret(),
    staging: generateWebhookSecret(),
    production: generateWebhookSecret(),
    formatted: generateFormattedWebhookSecret()
  };
}

console.log('🔐 Yonna Forex Webhook Secret Generator');
console.log('=====================================\n');

const secrets = generateEnvironmentSecrets();

console.log('Generated Secrets:');
console.log('------------------');
console.log(`Development: ${secrets.development}`);
console.log(`Staging:     ${secrets.staging}`);
console.log(`Production:  ${secrets.production}`);
console.log(`Formatted:   ${secrets.formatted}`);

console.log('\nEnvironment Variables:');
console.log('----------------------');
console.log(`YONNA_FOREX_WEBHOOK_SECRET=${secrets.production}`);

console.log('\n.env File Entry:');
console.log('----------------');
console.log(`YONNA_FOREX_WEBHOOK_SECRET=${secrets.production}`);

console.log('\n📋 Instructions:');
console.log('1. Copy the production secret above');
console.log('2. Add it to your .env file');
console.log('3. Provide it to Yonna Forex for webhook signature verification');
console.log('4. Keep this secret secure and never commit it to version control');

console.log('\n🔒 Security Notes:');
console.log('- This secret is used to verify webhook authenticity');
console.log('- Store it securely in your environment variables');
console.log('- Never share it in logs or error messages');
console.log('- Rotate it periodically for enhanced security');
