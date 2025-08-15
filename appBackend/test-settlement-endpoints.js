const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000/api';
const TEST_TOKEN = 'your-test-token-here'; // You'll need to replace this with a valid token

async function testSettlementEndpoints() {
  console.log('🧪 Testing Settlement Endpoints...\n');

  const headers = {
    'Authorization': `Bearer ${TEST_TOKEN}`,
    'Content-Type': 'application/json'
  };

  try {
    // Test 1: Get available settlement amount
    console.log('1️⃣ Testing GET /api/driver/settlements/available');
    try {
      const response = await axios.get(`${BASE_URL}/driver/settlements/available`, { headers });
      console.log('✅ Available settlement amount:', response.data);
    } catch (error) {
      console.log('❌ Error getting available settlement amount:', error.response?.data || error.message);
    }

    // Test 2: Get settlement history
    console.log('\n2️⃣ Testing GET /api/driver/settlements');
    try {
      const response = await axios.get(`${BASE_URL}/driver/settlements`, { headers });
      console.log('✅ Settlement history:', response.data);
    } catch (error) {
      console.log('❌ Error getting settlement history:', error.response?.data || error.message);
    }

    // Test 3: Get driver stats
    console.log('\n3️⃣ Testing GET /api/driver/stats');
    try {
      const response = await axios.get(`${BASE_URL}/driver/stats`, { headers });
      console.log('✅ Driver stats:', response.data);
    } catch (error) {
      console.log('❌ Error getting driver stats:', error.response?.data || error.message);
    }

    // Test 4: Get driver earnings
    console.log('\n4️⃣ Testing GET /api/driver/earnings');
    try {
      const response = await axios.get(`${BASE_URL}/driver/earnings`, { headers });
      console.log('✅ Driver earnings:', response.data);
    } catch (error) {
      console.log('❌ Error getting driver earnings:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ General error:', error.message);
  }
}

// Run the tests
testSettlementEndpoints();
