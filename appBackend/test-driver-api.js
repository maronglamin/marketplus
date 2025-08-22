const axios = require('axios');

// Test configuration
const API_BASE_URL = 'http://192.168.0.200:3000/api';
const TEST_TOKEN = 'your-test-jwt-token-here'; // Replace with actual token

// Test functions
async function testDriverProfile() {
  try {
    console.log('🧪 Testing GET /api/driver/profile...');
    
    const response = await axios.get(`${API_BASE_URL}/driver/profile`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Driver profile response:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Driver profile error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    return null;
  }
}

async function testDriverStatus() {
  try {
    console.log('🧪 Testing POST /api/driver/status...');
    
    const response = await axios.post(`${API_BASE_URL}/driver/status`, {
      status: 'ONLINE'
    }, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Driver status response:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Driver status error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    return null;
  }
}

async function testDriverLocation() {
  try {
    console.log('🧪 Testing POST /api/driver/location/update...');
    
    const response = await axios.post(`${API_BASE_URL}/driver/location/update`, {
      latitude: 13.4432,
      longitude: -16.5919,
      address: 'Test Location',
      accuracy: 10,
      speed: 0,
      heading: 0
    }, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Driver location response:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Driver location error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    return null;
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Driver API Tests...\n');
  
  // Test 1: Get driver profile
  await testDriverProfile();
  console.log('');
  
  // Test 2: Update driver status
  await testDriverStatus();
  console.log('');
  
  // Test 3: Update driver location
  await testDriverLocation();
  console.log('');
  
  console.log('🏁 Driver API Tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testDriverProfile,
  testDriverStatus,
  testDriverLocation,
  runTests
};
