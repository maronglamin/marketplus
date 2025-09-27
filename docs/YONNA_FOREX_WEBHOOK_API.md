# Yonna Forex Webhook API Documentation

## Overview

This document describes the webhook API that Yonna Forex should use to notify our system about payment status changes. The webhook allows real-time communication of payment success/failure status to our users.

## Webhook Endpoint

**URL:** `{API_BASE_URL}/api/payments/yonna-forex/webhook`  
**Method:** `POST`  
**Content-Type:** `application/json`

**Configuration Options:**
- **Environment Variable:** Use `process.env.API_BASE_URL` (recommended for production)
- **Fallback URL:** `https://your-domain.com/api/payments/yonna-forex/webhook` (static fallback)
- **Development:** `http://localhost:3000/api/payments/yonna-forex/webhook`

**Note:** The system will use `API_BASE_URL` environment variable if set, otherwise fall back to the static URL

## Authentication

The webhook supports signature verification for security. Include the following header:

```
X-Yonna-Signature: sha256=<HMAC_SHA256_SIGNATURE>
```

**Webhook Secret:**
```
YONNA_FOREX_WEBHOOK_SECRET=...
```

### Signature Generation

1. Create a string by concatenating the JSON payload
2. Generate HMAC-SHA256 signature using the webhook secret above
3. Include the signature in the `X-Yonna-Signature` header

**Example:**
```javascript
const crypto = require('crypto');
const webhookSecret = '...';
const payload = JSON.stringify(webhookData);
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(payload)
  .digest('hex');
const header = `sha256=${signature}`;
```

## Webhook Payload

### Request Body

```json
{
  "appTransactionId": "APP_1234567890_ABC123",
  "status": "success",
  "amount": 100.00,
  "currency": "GMD",
  "phoneNumber": "+220123456789",
  "timestamp": "2024-01-15T10:30:00Z",
  "message": "Payment processed successfully",
  "error": null
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `appTransactionId` | string | Yes | The app-side transaction ID we provided when initiating the payment |
| `status` | string | Yes | Payment status: `pending`, `completed`, `failed`, `cancelled` |
| `amount` | number | Yes | Payment amount |
| `currency` | string | Yes | Currency code (e.g., "GMD", "USD") |
| `phoneNumber` | string | Yes | Customer phone number |
| `timestamp` | string | Yes | ISO 8601 timestamp of the status change |
| `message` | string | No | Human-readable status message |
| `error` | string | No | Error details if status is `failed` |

### Status Values

- **`pending`**: Payment is being processed
- **`success`**: Payment was successful (primary status)
- **`completed`**: Payment was successful (legacy status)
- **`failed`**: Payment failed (include error details)
- **`cancelled`**: Payment was cancelled by user or system

## Response Format

### Success Response

```json
{
  "success": true,
  "message": "Webhook processed successfully"
}
```

### Error Responses

#### Missing Required Fields
```json
{
  "success": false,
  "message": "Missing required fields: appTransactionId and status"
}
```

#### Invalid Signature
```json
{
  "success": false,
  "message": "Invalid webhook signature"
}
```

#### Transaction Not Found
```json
{
  "success": false,
  "message": "Transaction not found"
}
```

#### Server Error
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Detailed error message"
}
```

## HTTP Status Codes

- **200**: Webhook processed successfully
- **400**: Bad request (missing required fields)
- **401**: Unauthorized (invalid signature)
- **404**: Transaction not found
- **500**: Internal server error

## Retry Policy

If our webhook endpoint returns an error (4xx or 5xx status codes), please retry with exponential backoff:

- **1st retry**: After 1 minute
- **2nd retry**: After 5 minutes
- **3rd retry**: After 15 minutes
- **4th retry**: After 1 hour
- **5th retry**: After 4 hours

Stop retrying after 5 attempts or if we return a 4xx status code.

## Testing

### Test Webhook

You can test the webhook using curl with either approach:

**Using Environment Variable (Recommended):**
```bash
curl -X POST ${API_BASE_URL}/api/payments/yonna-forex/webhook \
  -H "Content-Type: application/json" \
  -H "X-Yonna-Signature: sha256=..." \
  -d '{
    "appTransactionId": "APP_TEST_123456789",
    "status": "success",
    "amount": 10.00,
    "currency": "GMD",
    "phoneNumber": "+220123456789",
    "timestamp": "2024-01-15T10:30:00Z",
    "message": "Test payment completed"
  }'
```

**Using Static URL (Fallback):**
```bash
curl -X POST https://cloudnexus.biz/api/payments/yonna-forex/webhook \
  -H "Content-Type: application/json" \
  -H "X-Yonna-Signature: sha256=..." \
  -d '{
    "appTransactionId": "APP_TEST_123456789",
    "status": "success",
    "amount": 10.00,
    "currency": "GMD",
    "phoneNumber": "+220123456789",
    "timestamp": "2024-01-15T10:30:00Z",
    "message": "Test payment completed"
  }'
```

### Webhook Status Check

Check webhook status and recent events:

```bash
# Using environment variable
curl -X GET ${API_BASE_URL}/api/payments/yonna-forex/webhook/status

# Using static URL
curl -X GET https://your-domain.com/api/payments/yonna-forex/webhook/status
```

## What Happens When We Receive a Webhook

1. **Validation**: We verify the signature and required fields
2. **Transaction Lookup**: We find the transaction in our database
3. **Status Update**: We update the transaction status
4. **User Notification**: We send push notifications and/or SMS to the user
5. **Logging**: We log the webhook event for debugging
6. **Response**: We return success/error response

## User Notifications

When we receive a webhook, we automatically notify the user through:

- **Push Notifications**: Real-time mobile app notifications
- **SMS**: Text message to the user's phone number
- **In-App Updates**: Update the payment status in the app

## Security Considerations

1. **HTTPS Only**: Always use HTTPS for webhook calls
2. **Signature Verification**: Always verify the webhook signature
3. **Rate Limiting**: We implement rate limiting to prevent abuse
4. **IP Whitelisting**: Consider whitelisting Yonna Forex IP addresses
5. **Payload Validation**: We validate all incoming data

## Environment Variables

Make sure to set these environment variables:

```bash
YONNA_FOREX_WEBHOOK_SECRET=your_webhook_secret_here
API_BASE_URL=https://your-domain.com
SEND_SMS_NOTIFICATIONS=true
```

## Support

For technical support or questions about the webhook integration:

- **Email**: tech-support@your-domain.com
- **Phone**: +220-XXX-XXXX
- **Documentation**: {API_BASE_URL}/docs/webhooks

## Example Integration

Here's a complete example of how to implement the webhook:

```javascript
const crypto = require('crypto');
const axios = require('axios');

class YonnaForexWebhook {
  constructor(webhookUrl, webhookSecret) {
    this.webhookUrl = webhookUrl;
    this.webhookSecret = webhookSecret;
  }

  async sendWebhook(appTransactionId, status, amount, currency, phoneNumber, message = null) {
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

    const signature = this.generateSignature(payload);

    try {
      const response = await axios.post(this.webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Yonna-Signature': signature
        }
      });

      return response.data;
    } catch (error) {
      console.error('Webhook error:', error.response?.data || error.message);
      throw error;
    }
  }

  generateSignature(payload) {
    const payloadString = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payloadString)
      .digest('hex');
    return `sha256=${signature}`;
  }
}

// Usage
const webhook = new YonnaForexWebhook(
  '{API_BASE_URL}/api/payments/yonna-forex/webhook',
  'your_webhook_secret'
);

// Send completion notification
await webhook.sendWebhook(
  'APP_1234567890_ABC123',
  'completed',
  100.00,
  'GMD',
  '+220123456789',
  'Payment processed successfully'
);
```

## Changelog

- **v1.0.0** (2024-01-15): Initial webhook API specification
