# Backend Setup for Web App

## Prerequisites

1. Make sure the backend server is running on `https://api.cloudnexus.biz:3000`
2. Ensure the database is properly configured and migrated

## Backend Changes Made

### New API Endpoints Added

1. **POST /api/auth/check-user**
   - Checks if a user exists by phone number
   - Returns user registration status
   - No device info required

2. **POST /api/auth/login-web**
   - Login with phone number and PIN
   - Creates web session
   - No device info required

### Backend Files Modified

- `appBackend/src/controllers/auth.ts` - Added `checkUserExists` and `loginWithPinWeb` functions
- `appBackend/src/routes/auth.ts` - Added new routes for web app

## Web App Configuration

The web app is configured to connect to `https://api.cloudnexus.biz:3000/api` by default.

To change the API URL, update `src/config/api.ts`:

```typescript
export const API_CONFIG = {
  BASE_URL: 'http://your-backend-url/api',
  TIMEOUT: 30000,
};
```

## Testing the Login Flow

1. Start the backend server: `cd appBackend && npm run dev`
2. Start the web app: `cd appWebVersion && npm start`
3. Visit `https://api.cloudnexus.biz:3001`
4. Enter a phone number of an existing user
5. Enter the user's PIN
6. You should be redirected to the home page

## User Requirements

- Users must be registered through the mobile app first
- Users must have completed their profile (first name, last name)
- Users must know their 4-digit PIN

## Error Handling

- If user doesn't exist: Shows message to register via mobile app
- If user not fully registered: Shows message to complete registration via mobile app
- If PIN is invalid: Shows PIN error message
- Network errors: Shows connection error message
