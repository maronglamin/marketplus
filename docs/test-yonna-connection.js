#!/usr/bin/env node

/**
 * Test Yonna Forex API Connection
 * 
 * This script tests the Yonna Forex API endpoints to ensure they're working correctly.
 */

const axios = require('axios');

const API_BASE_URL = 'http://10.143.131.48:3000';

async function testYonnaForexAPI() {
  console.log('🔍 Testing Yonna Forex API Connection...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${API_BASE_URL}/api/health`);
    console.log('✅ Health check passed:', healthResponse.status);
    console.log('   Response:', healthResponse.data);
    console.log('');

    // Test 2: Yonna Forex currencies endpoint
    console.log('2. Testing Yonna Forex currencies endpoint...');
    try {
      const currenciesResponse = await axios.get(`${API_BASE_URL}/api/payments/yonna-forex/currencies`);
      console.log('✅ Currencies endpoint working:', currenciesResponse.status);
      console.log('   Response:', JSON.stringify(currenciesResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Currencies endpoint failed:', error.message);
      if (error.response) {
        console.log('   Status:', error.response.status);
        console.log('   Data:', error.response.data);
      }
    }
    console.log('');

    // Test 3: Yonna Forex webhook status
    console.log('3. Testing Yonna Forex webhook status...');
    try {
      const webhookResponse = await axios.get(`${API_BASE_URL}/api/payments/yonna-forex/webhook/status`);
      console.log('✅ Webhook status endpoint working:', webhookResponse.status);
      console.log('   Response:', JSON.stringify(webhookResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Webhook status endpoint failed:', error.message);
      if (error.response) {
        console.log('   Status:', error.response.status);
        console.log('   Data:', error.response.data);
      }
    }
    console.log('');

    console.log('🎉 Yonna Forex API testing complete!');

  } catch (error) {
    console.error('❌ API connection failed:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Make sure the backend server is running: npm run dev');
    console.log('2. Check if the server is accessible at:', API_BASE_URL);
    console.log('3. Verify the Yonna Forex routes are registered in app.ts');
    console.log('4. Check the backend logs for any errors');
  }
}

// Run the test
testYonnaForexAPI();
