#!/usr/bin/env node

/**
 * Yonna Forex Environment Variables Validator
 * 
 * This script validates that all required Yonna Forex environment variables are present
 * and provides helpful error messages if any are missing.
 */

// Load environment variables from .env file
require('dotenv').config();

const requiredEnvVars = [
  'YONNA_FOREX_API_URL',
  'YONNA_FOREX_SECRET_KEY',
  'YONNA_FOREX_CLIENT_ID',
  'YONNA_FOREX_WEBHOOK_SECRET',
  'API_BASE_URL'
];

const optionalEnvVars = [
  'NODE_ENV'
];

console.log('🔍 Validating Yonna Forex Environment Variables...\n');

// Check for missing required variables
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
const presentVars = requiredEnvVars.filter(varName => process.env[varName]);

// Display results
console.log('📋 Environment Variables Status:');
console.log('================================\n');

// Required variables
console.log('✅ Required Variables:');
requiredEnvVars.forEach(varName => {
  const isPresent = process.env[varName];
  const status = isPresent ? '✅' : '❌';
  const value = isPresent ? 
    (varName.includes('SECRET') || varName.includes('KEY') ? 
      `${process.env[varName].substring(0, 8)}...` : 
      process.env[varName]) : 
    'NOT SET';
  
  console.log(`  ${status} ${varName}: ${value}`);
});

// Optional variables
console.log('\n📝 Optional Variables:');
optionalEnvVars.forEach(varName => {
  const isPresent = process.env[varName];
  const status = isPresent ? '✅' : '⚪';
  const value = isPresent ? process.env[varName] : 'NOT SET';
  
  console.log(`  ${status} ${varName}: ${value}`);
});

// Summary
console.log('\n📊 Summary:');
console.log('===========');
console.log(`Required variables: ${presentVars.length}/${requiredEnvVars.length} present`);

if (missingVars.length > 0) {
  console.log(`\n❌ Missing required variables: ${missingVars.join(', ')}`);
  console.log('\n💡 To fix this:');
  console.log('1. Copy the template from docs/YONNA_FOREX_ENV_TEMPLATE.md');
  console.log('2. Add the variables to your .env file');
  console.log('3. Restart your application');
  process.exit(1);
} else {
  console.log('\n✅ All required environment variables are present!');
  console.log('🎉 Yonna Forex integration is ready to use.');
}

// Additional validation
console.log('\n🔧 Additional Checks:');
console.log('====================');

// Check API URL format
const apiUrl = process.env.YONNA_FOREX_API_URL;
if (apiUrl && !apiUrl.startsWith('https://')) {
  console.log('⚠️  Warning: API URL should use HTTPS for security');
}

// Check secret key length
const secretKey = process.env.YONNA_FOREX_SECRET_KEY;
if (secretKey && secretKey.length < 32) {
  console.log('⚠️  Warning: Secret key seems too short (should be at least 32 characters)');
}

// Check client ID format
const clientId = process.env.YONNA_FOREX_CLIENT_ID;
if (clientId && clientId.length < 16) {
  console.log('⚠️  Warning: Client ID seems too short');
}

console.log('\n✨ Environment validation complete!');
