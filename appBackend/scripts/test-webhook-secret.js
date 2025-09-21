#!/usr/bin/env node

/**
 * Test Yonna Forex Webhook Secret
 * 
 * This script tests the webhook secret generation and verification.
 * Run with: node scripts/test-webhook-secret.js
 */

const crypto = require('crypto');

// The generated webhook secret
const WEBHOOK_SECRET = '9f6b60b2679fa753241e67dd37ec3f537e9aec671e9e67c674c60e24168d8dc9';

function generateSignature(payload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

function verifySignature(payload, signature, secret) {
  const expectedSignature = generateSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

console.log('🔐 Yonna Forex Webhook Secret Test');
console.log('==================================\n');

// Test payload
const testPayload = {
  transactionId: 'YF_TEST_123456789',
  status: 'completed',
  amount: 10.00,
  currency: 'GMD',
  phoneNumber: '+220123456789',
  timestamp: new Date().toISOString(),
  message: 'Test payment completed'
};

const payloadString = JSON.stringify(testPayload);
const signature = generateSignature(payloadString, WEBHOOK_SECRET);
const fullSignature = `sha256=${signature}`;

console.log('Test Data:');
console.log('----------');
console.log('Secret:', WEBHOOK_SECRET);
console.log('Payload:', payloadString);
console.log('Signature:', signature);
console.log('Full Header:', fullSignature);

console.log('\nVerification Test:');
console.log('------------------');
const isValid = verifySignature(payloadString, signature, WEBHOOK_SECRET);
console.log('Signature Valid:', isValid ? '✅ YES' : '❌ NO');

console.log('\nCurl Command:');
console.log('-------------');
console.log(`curl -X POST https://cloudnexus.biz/api/payments/yonna-forex/webhook \\`);
console.log(`  -H "Content-Type: application/json" \\`);
console.log(`  -H "X-Yonna-Signature: ${fullSignature}" \\`);
console.log(`  -d '${payloadString}'`);

console.log('\nEnvironment Variable:');
console.log('---------------------');
console.log(`YONNA_FOREX_WEBHOOK_SECRET=${WEBHOOK_SECRET}`);

console.log('\n✅ Webhook secret is ready for use!');
