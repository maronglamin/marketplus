# Yonna Forex Environment Variables Template

## Required Environment Variables

Add these variables to your `.env` file in the `appBackend` directory:

```bash
# Yonna Forex API Configuration
YONNA_FOREX_API_URL=YOUR_API
YONNA_FOREX_SECRET_KEY=YOUR_SECRET_KEY
YONNA_FOREX_CLIENT_ID=YOUR_CLIENT_ID

# Webhook Configuration
YONNA_FOREX_WEBHOOK_SECRET=APP_WEBHOOK_SECRET
API_BASE_URL=https://your-domain.com
```

## Environment Variables Description

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `YONNA_FOREX_API_URL` | Yonna Forex API endpoint URL | Yes | https://API_URL |
| `YONNA_FOREX_SECRET_KEY` | Your Yonna Forex secret key | Yes | `secret_key` |
| `YONNA_FOREX_CLIENT_ID` | Your Yonna Forex client ID | Yes | `ID` |
| `YONNA_FOREX_WEBHOOK_SECRET` | Webhook signature verification secret | Yes | `` |
| `API_BASE_URL` | Your application's base URL for webhooks | Yes | `https://your-domain.com` |

## Security Notes

- **Never commit credentials to version control**
- **Use different credentials for development, staging, and production**
- **Rotate secrets regularly**
- **Use environment-specific `.env` files**

## Setup Instructions

1. Copy the environment variables to your `.env` file
2. Replace placeholder values with your actual credentials
3. Restart your application to load the new environment variables
4. Test the integration to ensure credentials are working correctly
