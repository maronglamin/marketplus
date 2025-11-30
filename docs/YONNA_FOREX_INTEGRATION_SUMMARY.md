# Yonna Forex Integration Summary

## What to Provide to Yonna Forex

### 1. Webhook URL

**Primary URL (Environment Variable):**
- **Production:** `${API_BASE_URL}/api/payments/yonna-forex/webhook`
- **Test:** `${API_BASE_URL}/api/payments/yonna-forex/test-webhook`

**Fallback URL (Static):**
- **Production:** `https://your-domain.com/api/payments/yonna-forex/webhook`
- **Test:** `https://your-domain.com/api/payments/yonna-forex/test-webhook`

**Configuration:**
- Set `API_BASE_URL` environment variable for dynamic configuration
- System will use environment variable if available, otherwise fall back to static URL
- For development: `https://api.cloudnexus.biz:3000`

### 2. Webhook Secret (for security)
Provide them with this webhook secret key for signature verification:
```
YONNA_FOREX_WEBHOOK_SECRET=9f6b60b2679fa753241e67dd37ec3f537e9aec671e9e67c674c60e24168d8dc9
```

**Secret Details:**
- **Type:** 256-bit hexadecimal secret
- **Length:** 64 characters
- **Purpose:** HMAC-SHA256 signature verification
- **Security:** Cryptographically secure random generation

### 3. Required Webhook Payload
Tell them to send this JSON payload when payment status changes:

```json
{
  "appTransactionId": "APP_1234567890_ABC123",
  "status": "completed",
  "amount": 100.00,
  "currency": "GMD",
  "phoneNumber": "+220123456789",
  "timestamp": "2024-01-15T10:30:00Z",
  "message": "Payment processed successfully",
  "error": null
}
```

### 4. Status Values to Send
- `pending` - Payment is being processed
- `completed` - Payment was successful
- `failed` - Payment failed (include error details)
- `cancelled` - Payment was cancelled

### 5. Headers Required
```
Content-Type: application/json
X-Yonna-Signature: sha256=<HMAC_SHA256_SIGNATURE>
```

### 6. When to Send Webhooks
- **Immediately** when payment status changes
- **On payment completion** (success or failure)
- **On payment cancellation**
- **On any status update**

## Service Fee Integration

### UCP Configuration
- **Service Fee**: 7% of transaction amount
- **Configuration Name**: `service_fee_yonna_wallet`
- **Currency**: GMD (Gambian Dalasi)
- **Fee Type**: Percentage-based

### Service Fee Calculation
```javascript
// Example: 1000 GMD payment
const serviceFeeAmount = 1000 * 0.07; // 70 GMD
const netAmount = 1000 - 70; // 930 GMD
```

### Database Tracking
- Service fee details stored in `ExternalTransaction.gatewayResponse`
- Includes fee amount, percentage, and configuration name
- Tracks service fee collection for reporting and analytics

## What We Do When We Receive the Webhook

1. **Validate** the webhook signature and data
2. **Find** the transaction in our database
3. **Update** the payment status (including service fee tracking)
4. **Notify** the user via:
   - Push notification on their mobile device
   - SMS to their phone number
   - In-app status update
5. **Log** service fee details for accounting
6. **Log** the webhook event for debugging

## Testing

### Test the Integration

**Using Environment Variable (Recommended):**
```bash
curl -X POST ${API_BASE_URL}/api/payments/yonna-forex/test-webhook \
  -H "Content-Type: application/json" \
  -H "X-Yonna-Signature: sha256=APP_WEBHOOK_SECRET_KEY" \
  -d '{
    "appTransactionId": "APP_TEST_123456789",
    "status": "completed",
    "amount": 100.00,
    "currency": "GMD",
    "phoneNumber": "+220123456789"
  }'
```

**Using Static URL (Fallback):**
```bash
curl -X POST https://api.cloudnexus.biz/api/payments/yonna-forex/test-webhook \
  -H "Content-Type: application/json" \
  -H "X-Yonna-Signature: sha256=APP_WEBHOOK_SECRET_KEY" \
  -d '{
    "appTransactionId": "APP_TEST_123456789",
    "status": "completed",
    "amount": 100.00,
    "currency": "GMD",
    "phoneNumber": "+220123456789"
  }'
```

### Check Webhook Status
```bash
# Using environment variable
curl -X GET ${API_BASE_URL}/api/payments/yonna-forex/webhook/status

# Using static URL
curl -X GET https://your-domain.com/api/payments/yonna-forex/webhook/status
```

## Security

- **HTTPS Only**: All webhook calls must use HTTPS
- **Signature Verification**: We verify the HMAC-SHA256 signature
- **Rate Limiting**: We implement rate limiting to prevent abuse
- **IP Whitelisting**: Consider whitelisting our server IPs

## Error Handling

If our webhook endpoint returns an error, please retry with exponential backoff:
- 1st retry: After 1 minute
- 2nd retry: After 5 minutes  
- 3rd retry: After 15 minutes
- 4th retry: After 1 hour
- 5th retry: After 4 hours

Stop retrying after 5 attempts or if we return a 4xx status code.

## Response Codes

- **200**: Webhook processed successfully
- **400**: Bad request (missing required fields)
- **401**: Unauthorized (invalid signature)
- **404**: Transaction not found
- **500**: Internal server error

## Contact Information

For technical support or questions:
- **Email**: tech-support@cloudnexus.biz
- **Phone**: +220-XXX-XXXX
- **Documentation**: https://api.cloudnexus.biz/docs/yonna-forex-webhook

## Example Implementation

Here's how they should implement the webhook:

```javascript
const crypto = require('crypto');
const axios = require('axios');

async function sendWebhook(appTransactionId, status, amount, currency, phoneNumber, message) {
  const payload = {
    appTransactionId,
    status,
    amount,
    currency,
    phoneNumber,
    timestamp: new Date().toISOString(),
    message,
    error: status === 'failed' ? message : null
  };

  // Generate signature
  const signature = crypto
    .createHmac('sha256', webhookSecret)
    .update(JSON.stringify(payload))
    .digest('hex');

  try {
    const response = await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Yonna-Signature': `sha256=${signature}`
      }
    });
    
    console.log('Webhook sent successfully:', response.data);
  } catch (error) {
    console.error('Webhook error:', error.response?.data || error.message);
    // Implement retry logic here
  }
}

// Usage examples
await sendWebhook('APP_1234567890_ABC123', 'completed', 100.00, 'GMD', '+220123456789', 'Payment successful');
await sendWebhook('APP_1234567890_ABC123', 'failed', 100.00, 'GMD', '+220123456789', 'Insufficient funds');
```

## Database Schema

We store webhook events in our database with these fields:
- `appTransactionId` - The app-side transaction ID used for reconciliation
- `status` - Payment status
- `amount` - Payment amount
- `currency` - Currency code
- `phoneNumber` - Customer phone number
- `timestamp` - When the status changed
- `message` - Status message
- `error` - Error details if failed

## Monitoring

We monitor webhook events and can provide:
- Webhook delivery status
- Response times
- Error rates
- Recent webhook events

## Next Steps

1. **Provide the webhook URL** to Yonna Forex
2. **Share the webhook secret** for signature verification
3. **Test the integration** using the test endpoint
4. **Monitor webhook delivery** in production
5. **Set up alerts** for webhook failures

This integration ensures real-time communication of payment status changes, providing a seamless experience for your users.
