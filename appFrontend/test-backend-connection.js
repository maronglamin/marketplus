const axios = require('axios');

// Test backend connection and user profile endpoint
async function testBackendConnection() {
  const LOCAL_IP = '192.168.137.200'; // Update this to your actual IP
  const API_URL = `http://${LOCAL_IP}:3000`;
  
  console.log('🧪 Testing Backend Connection...\n');
  console.log('📍 API URL:', API_URL);
  
  try {
    // Test 1: Basic connectivity
    console.log('1️⃣ Testing basic connectivity...');
    try {
      const healthResponse = await axios.get(`${API_URL}/api/health`, {
        timeout: 5000
      });
      console.log('✅ Health check successful:', healthResponse.data);
    } catch (error) {
      console.log('❌ Health check failed:', error.message);
      console.log('💡 Make sure the backend server is running on port 3000');
      return;
    }
    
    // Test 2: Users test endpoint
    console.log('\n2️⃣ Testing users test endpoint...');
    try {
      const testResponse = await axios.get(`${API_URL}/api/users/test`, {
        timeout: 5000
      });
      console.log('✅ Users test endpoint:', testResponse.data);
    } catch (error) {
      console.log('❌ Users test endpoint failed:', error.response?.data || error.message);
    }
    
    // Test 3: User profile endpoint (without auth)
    console.log('\n3️⃣ Testing user profile endpoint (without auth)...');
    try {
      const profileResponse = await axios.get(`${API_URL}/api/users/profile`, {
        timeout: 5000
      });
      console.log('✅ Profile endpoint (no auth):', profileResponse.data);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Profile endpoint exists (requires auth)');
      } else {
        console.log('❌ Profile endpoint failed:', error.response?.data || error.message);
      }
    }
    
    // Test 4: Check if server is running on different ports
    console.log('\n4️⃣ Checking alternative ports...');
    const ports = [3000, 3001, 8080, 5000];
    for (const port of ports) {
      try {
        const response = await axios.get(`http://${LOCAL_IP}:${port}/api/health`, {
          timeout: 2000
        });
        console.log(`✅ Server found on port ${port}:`, response.data);
      } catch (error) {
        // Ignore timeout errors
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Instructions
console.log('📋 Instructions:');
console.log('1. Make sure the backend server is running');
console.log('2. Update LOCAL_IP if needed');
console.log('3. Run: node test-backend-connection.js\n');

testBackendConnection();
