# Yonna Forex Service Fee Integration

## Overview

This document describes the service fee integration for Yonna Forex payments, which follows the same UCP (Universal Configuration Parameters) pattern used by other payment gateways like Stripe.

## Service Fee Configuration

### UCP Configuration

The service fee is configured using the UCP system with the following parameters:

- **Name**: `service_fee_yonna_wallet`
- **Value**: `0.07` (7% service fee)
- **Service Type**: `payment_gateway`
- **Currency**: `GMD` (Gambian Dalasi)
- **Status**: Active

### Configuration Details

```json
{
  "name": "service_fee_yonna_wallet",
  "value": 0.07,
  "description": "Service fee percentage for Yonna Forex wallet payment gateway transactions",
  "serviceType": "payment_gateway",
  "isActive": true,
  "metadata": {
    "gateway": "yonna_forex",
    "feeType": "percentage",
    "minAmount": 0,
    "maxAmount": null,
    "currency": "GMD"
  }
}
```

## How It Works

### 1. Payment Processing Flow

When a Yonna Forex payment is processed:

1. **Service Fee Calculation**: The system calculates the service fee using the UCP configuration
2. **External Transaction Creation**: A record is created in the `ExternalTransaction` table
3. **Service Fee Tracking**: The service fee details are stored in the `gatewayResponse` field
4. **Webhook Updates**: Status changes update the transaction record

### 2. Service Fee Calculation

```typescript
// Example calculation for 1000 GMD payment
const originalAmount = 1000;
const serviceFeePercentage = 0.07; // 7%
const serviceFeeAmount = originalAmount * serviceFeePercentage; // 70 GMD
const netAmount = originalAmount - serviceFeeAmount; // 930 GMD
```

### 3. Database Schema

#### ExternalTransaction Table

```sql
CREATE TABLE "ExternalTransaction" (
  "id" TEXT PRIMARY KEY,
  "appTransactionId" TEXT NOT NULL,
  "gatewayTransactionId" TEXT,
  "gatewayProvider" TEXT NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "currencyCode" VARCHAR(3) NOT NULL,
  "status" "TransactionStatus" NOT NULL,
  "customerId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "gatewayResponse" JSON,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

#### Service Fee Data in gatewayResponse

```json
{
  "yonnaTransactionId": "YF_123456789",
  "phoneNumber": "+220123456789",
  "description": "Payment for order #12345",
  "serviceFeeAmount": 70,
  "serviceFeePercentage": 7,
  "serviceFeeConfig": "service_fee_yonna_wallet",
  "lastWebhookStatus": "completed",
  "lastWebhookUpdate": "2024-01-15T10:30:00Z"
}
```

## API Integration

### Payment Processing Endpoint

**POST** `/api/payments/yonna-forex/process`

**Request Body:**
```json
{
  "amount": 1000,
  "currency": "GMD",
  "description": "Payment for order #12345"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionId": "YF_123456789",
    "appTransactionId": "TXN-1705320600000-ABC123DEF",
    "status": "pending",
    "message": "Payment initiated successfully",
    "amount": 1000,
    "currency": "GMD",
    "serviceFee": {
      "amount": 70,
      "percentage": 7,
      "config": "service_fee_yonna_wallet"
    }
  }
}
```

### Webhook Status Updates

**POST** `/api/payments/yonna-forex/webhook`

**Request Body:**
```json
{
  "transactionId": "YF_123456789",
  "status": "completed",
  "amount": 1000,
  "currency": "GMD",
  "phoneNumber": "+220123456789",
  "timestamp": "2024-01-15T10:30:00Z",
  "message": "Payment completed successfully"
}
```

## Service Fee Management

### Admin Panel Integration

The service fee can be managed through the admin panel:

1. **View Service Fees**: See all transactions with service fee breakdown
2. **Update UCP Configuration**: Modify the service fee percentage
3. **Transaction Reports**: Generate reports showing service fee collection
4. **Analytics**: Track service fee trends and performance

### UCP Configuration Management

```typescript
// Get current service fee configuration
const config = await UCPService.getServiceFeeConfig('yonna_wallet');

// Calculate service fee for an amount
const result = await UCPService.calculateServiceFee('yonna_wallet', 1000, 'GMD');
```

## Testing

### Test Service Fee Integration

```bash
# Run the service fee integration test
node scripts/test-yonna-service-fee.js
```

### Test Payment with Service Fee

```bash
# Test payment processing
curl -X POST https://api.cloudnexus.biz:3000/api/payments/yonna-forex/process \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "amount": 1000,
    "currency": "GMD",
    "description": "Test payment with service fee"
  }'
```

### Test Webhook with Service Fee

```bash
# Test webhook status update
curl -X POST https://api.cloudnexus.biz:3000/api/payments/yonna-forex/webhook \
  -H "Content-Type: application/json" \
  -H "X-Yonna-Signature: sha256=YOUR_SIGNATURE" \
  -d '{
    "transactionId": "YF_TEST_123456789",
    "status": "completed",
    "amount": 1000,
    "currency": "GMD",
    "phoneNumber": "+220123456789",
    "timestamp": "2024-01-15T10:30:00Z",
    "message": "Test payment completed"
  }'
```

## Monitoring and Analytics

### Key Metrics

1. **Service Fee Collection**: Total service fees collected per period
2. **Transaction Volume**: Number of transactions processed
3. **Success Rate**: Percentage of successful payments
4. **Average Service Fee**: Average service fee per transaction

### Database Queries

```sql
-- Get service fee summary for Yonna Forex
SELECT 
  DATE(createdAt) as date,
  COUNT(*) as transaction_count,
  SUM(amount) as total_amount,
  SUM(JSON_EXTRACT(gatewayResponse, '$.serviceFeeAmount')) as total_service_fee,
  AVG(JSON_EXTRACT(gatewayResponse, '$.serviceFeeAmount')) as avg_service_fee
FROM "ExternalTransaction"
WHERE gatewayProvider = 'yonna_forex'
  AND createdAt >= NOW() - INTERVAL 30 DAY
GROUP BY DATE(createdAt)
ORDER BY date DESC;
```

## Troubleshooting

### Common Issues

1. **Service Fee Not Calculated**: Check UCP configuration is active
2. **Webhook Not Updating**: Verify webhook signature and URL
3. **Transaction Not Found**: Check gatewayTransactionId mapping
4. **Database Errors**: Verify Prisma schema and connections

### Debug Commands

```bash
# Check UCP configuration
node scripts/seed-yonna-forex-ucp.js

# Test service fee calculation
node scripts/test-yonna-service-fee.js

# Check recent transactions
psql -d your_database -c "SELECT * FROM \"ExternalTransaction\" WHERE gatewayProvider = 'yonna_forex' ORDER BY createdAt DESC LIMIT 10;"
```

## Security Considerations

1. **Webhook Signature Verification**: All webhooks must include valid HMAC-SHA256 signature
2. **Transaction Validation**: Verify transaction amounts and currencies
3. **User Authentication**: Ensure only authenticated users can process payments
4. **Rate Limiting**: Implement rate limiting to prevent abuse

## Future Enhancements

1. **Dynamic Service Fees**: Support for different service fees based on amount ranges
2. **Multi-Currency Support**: Support for multiple currencies with different fee structures
3. **Fee Analytics Dashboard**: Real-time dashboard for service fee monitoring
4. **Automated Reporting**: Scheduled reports for service fee collection
5. **Fee Optimization**: AI-powered fee optimization based on transaction patterns

## Support

For technical support or questions about the service fee integration:

- **Documentation**: Check this document and related API docs
- **Logs**: Review application logs for error details
- **Database**: Query the ExternalTransaction table for transaction details
- **UCP System**: Verify UCP configuration in the admin panel

