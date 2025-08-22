const axios = require('axios');
const AsyncStorage = require('@react-native-async-storage/async-storage');

// Debug authentication and driver profile
async function debugAuth() {
  console.log('🔍 Debugging Authentication and Driver Profile...\n');

  const API_BASE_URL = 'http://192.168.0.200:3000/api';
  
  try {
    // Check stored token
    console.log('1️⃣ Checking stored authentication...');
    const token = await AsyncStorage.getItem('token');
    const user = await AsyncStorage.getItem('user');
    
    console.log('Stored token:', token ? `${token.substring(0, 20)}...` : 'None');
    console.log('Stored user:', user ? JSON.parse(user) : 'None');

    if (!token) {
      console.log('❌ No authentication token found. User needs to log in.');
      return;
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Test user profile
    console.log('\n2️⃣ Testing user profile...');
    try {
      const userResponse = await axios.get(`${API_BASE_URL}/users/me`, { headers });
      console.log('✅ User profile:', userResponse.data);
    } catch (error) {
      console.log('❌ User profile error:', error.response?.data || error.message);
    }

    // Test driver profile
    console.log('\n3️⃣ Testing driver profile...');
    try {
      const driverResponse = await axios.get(`${API_BASE_URL}/driver/profile`, { headers });
      console.log('✅ Driver profile:', driverResponse.data);
    } catch (error) {
      console.log('❌ Driver profile error:', error.response?.data || error.message);
    }

    // Test driver stats
    console.log('\n4️⃣ Testing driver stats...');
    try {
      const statsResponse = await axios.get(`${API_BASE_URL}/driver/stats`, { headers });
      console.log('✅ Driver stats:', statsResponse.data);
    } catch (error) {
      console.log('❌ Driver stats error:', error.response?.data || error.message);
    }

    // Test driver earnings
    console.log('\n5️⃣ Testing driver earnings...');
    try {
      const earningsResponse = await axios.get(`${API_BASE_URL}/driver/earnings?period=TODAY`, { headers });
      console.log('✅ Driver earnings:', earningsResponse.data);
    } catch (error) {
      console.log('❌ Driver earnings error:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ General error:', error.message);
  }
}

// Run the debug
debugAuth();
