# Manual Yonna Forex API Testing (No Postman, No Scripts)

This is the simplest way to test your Yonna Forex API using just your browser and command line.

## Step 1: Get a Token from Your App

1. **Open your mobile app**
2. **Login normally** (this will generate a token)
3. **Check the console logs** in your development environment
4. **Look for a line like**: `Generated token for PIN login: 
5. **Copy the token** (the long string starting with `eyJ`)

## Step 2: Test in Your Browser

### Test 1: Check if Backend is Running
Open your browser and go to:
```
http://192.168.137.196:3000/api/health
```
**Expected**: You should see `{"status":"ok",...}`

### Test 2: Test Currencies (No Auth Required)
Go to:
```
http://192.168.137.196:3000/api/payments/yonna-forex/currencies
```
**Expected**: You should see currency data or an error message

## Step 3: Test with Command Line (One Command at a Time)

### Get a Token (Replace with your phone number and PIN)
```bash
curl -X POST http://192.168.137.196:3000/api/auth/login-web \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+2207690103", "pin": "1234"}'
```

**Copy the token from the response!**

### Test Currencies (Replace YOUR_TOKEN)
```bash
curl -X GET http://192.168.137.196:3000/api/payments/yonna-forex/currencies \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Payment (Replace YOUR_TOKEN)
```bash
curl -X POST http://192.168.137.196:3000/api/payments/yonna-forex/process \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "currency": "GMD",
    "description": "Test payment",
    "transactionId": "YF_TEST_123"
  }'
```

## Step 4: Check Backend Logs

While running the tests, watch your backend terminal for:
- ✅ `Yonna Forex payment successful`
- ❌ `Yonna Forex authentication failed`
- ❌ `Invalid Yonna credentials`

## Common Issues

### "401 Unauthorized"
- Your token is wrong or expired
- Get a new token from your app

### "400 Phone number not found"
- The user doesn't have a phone number in their profile
- Update the user's profile first

### "500 Internal Server Error"
- Check your `.env` file for Yonna credentials
- Look at backend logs for specific errors

### "Network error" or "Connection refused"
- Backend is not running
- Wrong IP address
- Check: `curl http://192.168.137.196:3000/api/health`

## Quick Health Check Commands

```bash
# Check if backend is running
curl http://192.168.137.196:3000/api/health

# Check if Yonna endpoints exist
curl http://192.168.137.196:3000/api/payments/yonna-forex/currencies

# Check your IP address
ifconfig | grep "inet " | grep -v 127.0.0.1
```

## What to Look For

### ✅ Success Indicators
- Backend responds with 200 status
- Currencies endpoint returns currency list
- Payment endpoint returns success message
- Backend logs show "Yonna Forex payment successful"

### ❌ Error Indicators
- 401: Authentication problem
- 400: Missing data or invalid request
- 500: Backend error (check logs)
- Network errors: Connection problem

## Need a Token Right Now?

If you don't have a user account, create one quickly:

1. **Use your mobile app** to register/login
2. **Or create a test user** in your database directly
3. **Or use the automated script**: `./test-yonna-simple.sh`

## Testing Yonna Credentials

The most important test is whether your Yonna credentials work. Look for these in your backend logs:

- `Yonna Forex payment successful` = ✅ Credentials work
- `Yonna Forex authentication failed` = ❌ Wrong credentials
- `Invalid Yonna credentials` = ❌ Missing credentials

## Summary

1. **Get token** from your app or login
2. **Test currencies** endpoint
3. **Test payment** endpoint
4. **Check backend logs** for Yonna API responses
5. **Verify credentials** are working

That's it! No Postman needed.
