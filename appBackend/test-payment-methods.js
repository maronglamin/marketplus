const axios = require('axios');

async function testPaymentMethods() {
  try {
    console.log('Testing payment methods endpoint...');
    
    // Test the payment methods endpoint
    const response = await axios.get('https://api.cloudnexus.biz:3000/api/payment-methods', {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    
    console.log('Payment methods response:', response.data);
  } catch (error) {
    console.error('Error testing payment methods:', error.response?.data || error.message);
  }
}

testPaymentMethods(); 