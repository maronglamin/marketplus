# Yonna Forex Payment Gateway Integration

## Overview

This document outlines the integration of Yonna Forex as a payment gateway for the marketplace application. Yonna Forex provides mobile wallet payment services for various currencies, with primary support for Gambian Dalasi (GMD).

## Configuration

### Environment Variables

Add the following environment variables to your `.env` file:

```bash
# Yonna Forex API Configuration
YONNA_FOREX_API_URL="https://preapi.yonnaforex.co.uk/corporate/app"
YONNA_FOREX_SECRET_KEY="6bc8015f94e3c4779980d7b92cba8528"
YONNA_FOREX_CLIENT_ID="1802872dc9150a80563af7c03b26f2cf"

# Webhook Configuration
YONNA_FOREX_WEBHOOK_SECRET="..."
API_BASE_URL="https://your-domain.com"
```

**Security Note**: All credentials are now managed through environment variables. The application will fail to start if any required environment variables are missing.

### API Endpoints

The integration provides the following API endpoints:

- `POST /api/payments/yonna-forex/process` - Process payment
- `POST /api/payments/yonna-forex/verify` - Verify payment status
- `GET /api/payments/yonna-forex/status/:transactionId` - Get payment status
- `GET /api/payments/yonna-forex/currencies` - Get supported currencies

## API Payload Structure

The Yonna Forex API currently supports the following basic payload structure:

```json
{
  "amount": 10,
  "phone": "+2201234567",
  "currency": "GMD",
  "fee": 0
}
```

**Note:** Additional parameters like `transactionId` and `description` are currently commented out as the API provider only accepts the basic parameters. These will be uncommented once the API provider supports them.

### Payload Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | number | Yes | Payment amount |
| `phone` | string | Yes | Customer phone number with country code |
| `currency` | string | Yes | Currency code (e.g., "GMD", "USD") |
| `fee` | number | Yes | Transaction fee (always 0 for user payments) |
| ~~`transactionId`~~ | ~~string~~ | ~~Yes~~ | ~~Unique transaction identifier~~ *(Currently commented out)* |
| ~~`description`~~ | ~~string~~ | ~~No~~ | ~~Payment description~~ *(Currently commented out)* |

## Backend Implementation

### Files Added/Modified

1. **Service Layer**
   - `src/services/YonnaForexPaymentService.ts` - Core payment processing logic

2. **Controller Layer**
   - `src/controllers/YonnaForexPaymentController.ts` - HTTP request handling

3. **Routes**
   - `src/routes/yonnaForexPaymentRoutes.ts` - API route definitions

4. **Main App Integration**
   - Update `src/app.ts` to include the new routes

### Integration Steps

1. **Add Routes to Main App**
   ```typescript
   import yonnaForexPaymentRoutes from './routes/yonnaForexPaymentRoutes';
   app.use('/api/payments/yonna-forex', yonnaForexPaymentRoutes);
   ```

2. **Update Database Schema** (if needed)
   - Add payment method support for Yonna Forex
   - Store transaction references and status

## Frontend Implementation

### Files Added/Modified

1. **Service Layer**
   - `src/services/YonnaForexPaymentService.ts` - Frontend API communication

2. **Components**
   - `src/components/YonnaForexPaymentForm.tsx` - Payment form component
   - `src/components/PaymentMethodSelector.tsx` - Payment method selection

3. **Integration Points**
   - Update existing payment flows to include Yonna Forex option
   - Add Yonna Forex to payment method selection screens

## Supported Features

### Currencies
- GMD (Gambian Dalasi) - Primary


### Payment Flow
1. User selects Yonna Forex as payment method
2. System displays payment summary with gateway, amount, currency, and phone number
3. User reviews payment details and confirms
4. Payment is processed through Yonna Forex API
5. Transaction status is verified
6. Success/failure is communicated to user

### Security Features
- Basic authentication with username/password
- Transaction ID generation for tracking
- Input validation and sanitization
- Error handling and logging

## Testing

### Test Payment Processing
```bash
curl -X POST https://cloudnexus.biz/api/payments/yonna-forex/process \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "amount": 100,
    "currency": "GMD"
  }'
```

### Test Payment Verification
```bash
curl -X POST https://cloudnexus.biz/api/payments/yonna-forex/verify \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "YF_1234567890_ABC123"
  }'
```

## Error Handling

The integration includes comprehensive error handling for:
- Network connectivity issues
- API authentication failures
- Invalid payment data
- Transaction processing errors
- Timeout scenarios

## Monitoring and Logging

All payment operations are logged with:
- Transaction IDs
- Timestamps
- Error messages
- API response details

## Security Considerations

1. **Credentials Management**
   - Store credentials in environment variables
   - Never commit credentials to version control
   - Use secure credential management in production

2. **Data Validation**
   - Validate all input data
   - Sanitize user inputs
   - Implement rate limiting

3. **Transaction Security**
   - Generate unique transaction IDs
   - Implement proper error handling
   - Log all payment attempts

## Future Enhancements

1. **Webhook Support**
   - Implement webhook handling for real-time status updates
   - Add webhook signature verification

2. **Refund Support**
   - Add refund processing capabilities
   - Implement refund status tracking

3. **Enhanced Reporting**
   - Add transaction reporting
   - Implement analytics dashboard

4. **Multi-Currency Support**
   - Expand currency support
   - Add currency conversion features

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify credentials in environment variables
   - Check API endpoint URL

2. **Network Timeouts**
   - Increase timeout values if needed
   - Implement retry logic

3. **Payment Failures**
   - Check transaction ID format
   - Verify required fields are provided

### Debug Mode

Enable debug logging by setting:
```bash
LOG_LEVEL="debug"
```

## Support

For technical support or questions about the Yonna Forex integration:
- Check application logs for error details
- Verify API credentials and configuration
- Test with small amounts first
- Contact Yonna Forex support for API-specific issues
