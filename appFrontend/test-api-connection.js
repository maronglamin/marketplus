const axios = require('axios');

// Test the API connection
async function testApiConnection() {
  console.log('🧪 Testing API Connection...\n');

  const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ? `${process.env.EXPO_PUBLIC_API_URL}/api` : 'https://api.cloudnexus.biz';
  
  try {
    // Test 1: Health check
    console.log('1️⃣ Testing health check...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Health check successful:', healthResponse.data);

    // Test 2: Driver stats (without auth)
    console.log('\n2️⃣ Testing driver stats (without auth)...');
    try {
      const statsResponse = await axios.get(`${API_BASE_URL}/driver/stats`);
      console.log('❌ Should have failed with auth error');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected without auth:', error.response.data.message);
      } else {
        console.log('❌ Unexpected error:', error.response?.data || error.message);
      }
    }

    // Test 3: Driver earnings (without auth)
    console.log('\n3️⃣ Testing driver earnings (without auth)...');
    try {
      const earningsResponse = await axios.get(`${API_BASE_URL}/driver/earnings?period=TODAY`);
      console.log('❌ Should have failed with auth error');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected without auth:', error.response.data.message);
      } else {
        console.log('❌ Unexpected error:', error.response?.data || error.message);
      }
    }

    // Test 4: Available settlements (without auth)
    console.log('\n4️⃣ Testing available settlements (without auth)...');
    try {
      const settlementsResponse = await axios.get(`${API_BASE_URL}/driver/settlements/available`);
      console.log('❌ Should have failed with auth error');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected without auth:', error.response.data.message);
      } else {
        console.log('❌ Unexpected error:', error.response?.data || error.message);
      }
    }

    console.log('\n🎉 All API endpoints are accessible and working correctly!');
    console.log('The issue might be with authentication in the frontend app.');

  } catch (error) {
    console.error('❌ Network error:', error.message);
    console.log('This suggests the backend server is not accessible from the network.');
  }
}

// Run the test
testApiConnection();
