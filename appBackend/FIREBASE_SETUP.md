# Firebase Setup Guide

This guide will help you set up Firebase for push notifications in the SNAP backend.

## Prerequisites

1. A Firebase project (create one at https://console.firebase.google.com/)
2. Node.js and npm installed

## Setup Steps

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter a project name (e.g., "snap-app")
4. Follow the setup wizard

### 2. Generate Service Account Key

1. In your Firebase project, go to **Project Settings** (gear icon)
2. Click on the **Service accounts** tab
3. Click **Generate new private key**
4. Save the JSON file securely

### 3. Configure Environment Variables

Create a `.env` file in the `appBackend` directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/snap"

# JWT Secret
JWT_SECRET="your-jwt-secret-key-here"

# Firebase Configuration
FIREBASE_PROJECT_ID="your-firebase-project-id"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"

# Server Configuration
PORT=3000
NODE_ENV=development

# File Upload
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=10485760
```

### 4. Extract Firebase Values

From the downloaded service account JSON file, extract these values:

- `project_id` → `FIREBASE_PROJECT_ID`
- `private_key` → `FIREBASE_PRIVATE_KEY` (keep the `\n` characters)
- `client_email` → `FIREBASE_CLIENT_EMAIL`

### 5. Install Dependencies

The Firebase Admin SDK is already installed. If you need to reinstall:

```bash
npm install firebase-admin
```

### 6. Test Configuration

The notification service will automatically check if Firebase is configured. If not, it will log a message and skip sending notifications.

## Troubleshooting

### Common Issues

1. **"Cannot find module 'firebase-admin'"**
   - Run `npm install firebase-admin`

2. **"Firebase not configured"**
   - Check that all Firebase environment variables are set correctly
   - Ensure the `.env` file is in the correct location

3. **"Invalid private key"**
   - Make sure the private key includes the `\n` characters
   - The key should start with `-----BEGIN PRIVATE KEY-----`

### Testing Notifications

You can test the notification system using the test endpoint:

```bash
curl -X POST http://localhost:3000/api/notifications/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "userId": "user-id",
    "title": "Test Notification",
    "body": "This is a test notification"
  }'
```

## Security Notes

- Never commit your `.env` file to version control
- Keep your Firebase service account key secure
- The `.env` file is already in `.gitignore`

## Next Steps

Once Firebase is configured, the notification system will automatically:
- Send notifications when users express interest in products
- Send notifications for new messages between buyers and sellers
- Send order status updates
- Handle failed tokens and remove them automatically 