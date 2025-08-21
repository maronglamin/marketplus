const axios = require('axios');

// Test the user profile endpoint
async function testUserProfile() {
  const API_BASE_URL = 'http://localhost:3000/api';
  
  try {
    console.log('🧪 Testing User Profile Endpoint...\n');
    
    // First, let's test the basic /users/me endpoint
    console.log('1️⃣ Testing /users/me endpoint...');
    try {
      const meResponse = await axios.get(`${API_BASE_URL}/users/me`, {
        headers: {
          'Authorization': 'Bearer YOUR_TOKEN_HERE', // Replace with actual token
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ /users/me response:', meResponse.data);
    } catch (error) {
      console.log('❌ /users/me error:', error.response?.data || error.message);
    }
    
    // Then test the new /users/profile endpoint
    console.log('\n2️⃣ Testing /users/profile endpoint...');
    try {
      const profileResponse = await axios.get(`${API_BASE_URL}/users/profile`, {
        headers: {
          'Authorization': 'Bearer YOUR_TOKEN_HERE', // Replace with actual token
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ /users/profile response:', JSON.stringify(profileResponse.data, null, 2));
    } catch (error) {
      console.log('❌ /users/profile error:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Instructions for use
console.log('📋 Instructions:');
console.log('1. Replace YOUR_TOKEN_HERE with an actual JWT token');
console.log('2. Make sure the backend server is running on port 3000');
console.log('3. Run: node test-user-profile.js\n');

testUserProfile();
