# Yonna Forex Integration Setup Guide

## Quick Setup Steps

### 1. Backend Integration

#### Add Routes to Main App
Update your main app file (usually `src/app.ts` or `src/index.ts`):

```typescript
// Add this import
import yonnaForexPaymentRoutes from './routes/yonnaForexPaymentRoutes';

// Add this route registration (usually with other routes)
app.use('/api/payments/yonna-forex', yonnaForexPaymentRoutes);
```

#### Environment Variables
Add to your `.env` file:
```bash
YONNA_FOREX_API_URL="https://preapi.yonnaforex.co.uk/corporate/app"
YONNA_FOREX_USERNAME="cn_sub"
YONNA_FOREX_PASSWORD="Cnsub218354921@#"
YONNA_FOREX_ZIP="00440234"
```

### 2. Frontend Integration

#### Update Payment Screens
In your existing payment screens, add Yonna Forex as an option:

```typescript
import PaymentMethodSelector from '../components/PaymentMethodSelector';

// In your payment screen component
const handlePaymentMethodSelected = (method: PaymentMethod) => {
  if (method === 'yonna-forex') {
    // Handle Yonna Forex payment
    // The PaymentMethodSelector component will show the form automatically
  } else if (method === 'stripe') {
    // Handle Stripe payment
  }
  // ... other payment methods
};
```

### 3. Database Updates (Optional)

If you have a payment methods table, add Yonna Forex:

```sql
INSERT INTO payment_methods (name, code, is_active) 
VALUES ('Yonna Forex Wallet', 'yonna_forex', true);
```

### 4. Testing

#### Test the Integration
1. Start your backend server
2. Test the API endpoints using the provided curl commands
3. Test the frontend payment flow
4. Verify payment processing with small amounts

#### Test API Endpoints
```bash
# Test payment processing
curl -X POST https://cloudnexus.biz/api/payments/yonna-forex/process \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "amount": 10,
    "currency": "GMD",
    "description": "Test payment"
  }'

# Test currency support
curl -X GET https://cloudnexus.biz/api/payments/yonna-forex/currencies
```

### 5. Production Deployment

#### Security Checklist
- [ ] Environment variables are properly set
- [ ] Credentials are not exposed in code
- [ ] HTTPS is enabled
- [ ] Error logging is configured
- [ ] Rate limiting is implemented

#### Monitoring
- [ ] Payment success/failure rates
- [ ] API response times
- [ ] Error logs
- [ ] Transaction volumes

## File Structure

The integration adds these files:

```
Backend:
├── src/services/YonnaForexPaymentService.ts
├── src/controllers/YonnaForexPaymentController.ts
└── src/routes/yonnaForexPaymentRoutes.ts

Frontend:
├── src/services/YonnaForexPaymentService.ts
├── src/components/YonnaForexPaymentForm.tsx
└── src/components/PaymentMethodSelector.tsx

Documentation:
├── docs/YONNA_FOREX_INTEGRATION.md
└── docs/YONNA_FOREX_SETUP_GUIDE.md
```

## Next Steps

1. **Test Integration**: Use the provided test commands
2. **Update UI**: Integrate payment method selector into existing screens
3. **Configure Environment**: Set up production environment variables
4. **Monitor**: Set up logging and monitoring
5. **Go Live**: Deploy to production with small test transactions

## Support

If you encounter issues:
1. Check the application logs
2. Verify environment variables
3. Test with the provided curl commands
4. Review the detailed integration documentation
