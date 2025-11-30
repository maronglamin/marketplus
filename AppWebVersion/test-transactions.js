const axios = require('axios');

// Test the transactions API endpoint
async function testTransactionsAPI() {
  try {
    console.log('Testing transactions API...');
    
    // You'll need to replace this with a valid JWT token
    const token = 'YOUR_JWT_TOKEN_HERE';
    
    const response = await axios.get('https://api.cloudnexus.biz:3000/api/seller/transactions/USD', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      params: {
        page: 1,
        limit: 10
      }
    });
    
    console.log('✅ API Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ API Error:', error.response?.data || error.message);
  }
}

// Run the test
testTransactionsAPI();
