#!/bin/bash

# Yonna Forex API Testing Script
# This script tests the Yonna Forex API endpoints using curl

# Configuration
BASE_URL="http://192.168.137.33:3000/api"
PHONE_NUMBER="+2207690103"
OTP="2323"

echo "🧪 Testing Yonna Forex API Endpoints"
echo "====================================="

# Step 1: Login and get token
echo "📱 Step 1: Getting authentication token..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"phoneNumber\": \"$PHONE_NUMBER\", \"otp\": \"$OTP\"}")

echo "Login response: $LOGIN_RESPONSE"

# Extract token from response
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ Failed to get token. Please check your credentials."
    echo "💡 Make sure you have a user with phone number $PHONE_NUMBER"
    exit 1
fi

echo "✅ Token obtained: ${TOKEN:0:20}..."

# Step 2: Test supported currencies endpoint
echo ""
echo "💰 Step 2: Testing supported currencies..."
CURRENCIES_RESPONSE=$(curl -s -X GET "$BASE_URL/payments/yonna-forex/currencies" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json")

echo "Currencies response: $CURRENCIES_RESPONSE"

# Step 3: Test payment processing
echo ""
echo "💳 Step 3: Testing payment processing..."
TRANSACTION_ID="YF_$(date +%s)_$(openssl rand -hex 4 | tr '[:lower:]' '[:upper:]')"

PAYMENT_RESPONSE=$(curl -s -X POST "$BASE_URL/payments/yonna-forex/process" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"amount\": 100,
    \"currency\": \"GMD\",
    \"description\": \"Test Yonna payment via curl\",
    \"transactionId\": \"$TRANSACTION_ID\"
  }")

echo "Payment response: $PAYMENT_RESPONSE"

# Step 4: Test payment verification
echo ""
echo "🔍 Step 4: Testing payment verification..."
VERIFY_RESPONSE=$(curl -s -X POST "$BASE_URL/payments/yonna-forex/verify" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{\"transactionId\": \"$TRANSACTION_ID\"}")

echo "Verification response: $VERIFY_RESPONSE"

# Step 5: Test payment status
echo ""
echo "📊 Step 5: Testing payment status..."
STATUS_RESPONSE=$(curl -s -X GET "$BASE_URL/payments/yonna-forex/status/$TRANSACTION_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json")

echo "Status response: $STATUS_RESPONSE"

echo ""
echo "✅ Yonna Forex API testing completed!"
echo "💡 Check the responses above for any errors or success messages."
