# Yonna Forex API Testing Guide (No Postman Required)

This guide shows you how to test the Yonna Forex API using simple command-line tools.

## Prerequisites

1. **Backend running**: Make sure your backend is running on `http://192.168.137.196:3000`
2. **Valid user**: You need a user account with a phone number in the database
3. **Yonna credentials**: Ensure your `.env` file has valid Yonna Forex credentials

## Method 1: Automated Testing (Recommended)

Run the automated test script:

```bash
./test-yonna-api.sh
```

This script will:
- Login and get a token
- Test all Yonna Forex endpoints
- Show you the responses

## Method 2: Manual Testing (Step by Step)

### Step 1: Get Authentication Token

```bash
# Login to get a token (replace with your phone number)
curl -X POST http://192.168.137.196:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+220123456789",
    "otp": "123456"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

**Copy the token from the response!**

### Step 2: Test Supported Currencies

```bash
# Replace YOUR_TOKEN with the token from Step 1
curl -X GET http://192.168.137.196:3000/api/payments/yonna-forex/currencies \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "currencies": [
      {"code": "GMD", "name": "Gambian Dalasi"},
      {"code": "USD", "name": "US Dollar"}
    ],
    "default": "GMD"
  }
}
```

### Step 3: Test Payment Processing

```bash
# Replace YOUR_TOKEN with your actual token
curl -X POST http://192.168.137.196:3000/api/payments/yonna-forex/process \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "amount": 100,
    "currency": "GMD",
    "description": "Test payment via curl",
    "transactionId": "YF_TEST_12345"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "transactionId": "YF_TEST_12345",
    "status": "completed",
    "message": "Payment processed successfully"
  }
}
```

### Step 4: Test Payment Verification

```bash
curl -X POST http://192.168.137.196:3000/api/payments/yonna-forex/verify \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "transactionId": "YF_TEST_12345"
  }'
```

### Step 5: Test Payment Status

```bash
curl -X GET http://192.168.137.196:3000/api/payments/yonna-forex/status/YF_TEST_12345 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/json"
```

## Method 3: Using Browser (For GET requests only)

You can test GET endpoints directly in your browser:

1. **Get a token first** (use curl or your app)
2. **Open browser** and go to:
   ```
   http://192.168.137.196:3000/api/payments/yonna-forex/currencies
   ```
3. **Add Authorization header** using a browser extension like "ModHeader" or "Requestly"

## Common Issues and Solutions

### Issue 1: "401 Unauthorized"
**Solution:** Your token is invalid or expired. Get a new token.

### Issue 2: "400 Phone number not found"
**Solution:** The user doesn't have a phone number in their profile. Update the user's profile first.

### Issue 3: "Network error" or "Connection refused"
**Solution:** 
- Check if backend is running: `curl http://192.168.137.196:3000/api/health`
- Verify IP address is correct
- Check if Yonna credentials are set in `.env`

### Issue 4: "500 Internal Server Error"
**Solution:** Check backend logs for Yonna API errors. Usually means invalid Yonna credentials.

## Testing Yonna Credentials

To verify your Yonna credentials are working, check the backend logs when running the payment test. Look for:

- ✅ "Yonna Forex payment successful"
- ❌ "Yonna Forex authentication failed"
- ❌ "Invalid Yonna credentials"

## Quick Health Check

```bash
# Check if backend is running
curl http://192.168.137.196:3000/api/health

# Check if Yonna endpoints are accessible
curl http://192.168.137.196:3000/api/payments/yonna-forex/currencies
```

## Tips

1. **Use different transaction IDs** for each test to avoid conflicts
2. **Check backend logs** for detailed error information
3. **Test with small amounts** first (like 100 GMD)
4. **Verify user phone number** exists in database before testing payments

## Need Help?

If you encounter issues:
1. Check the backend logs in your terminal
2. Verify your `.env` file has correct Yonna credentials
3. Make sure the user has a valid phone number
4. Try the automated script first: `./test-yonna-api.sh`
