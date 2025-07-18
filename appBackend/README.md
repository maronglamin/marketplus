# SNAP Backend

## Overview

Backend service for the SNAP App, handling authentication, user management, and device verification.

## Features

- Phone number authentication with OTP
- Device verification and management
- PIN-based login
- Session management
- Rate limiting
- Security features (CORS, Helmet)
- SMS integration for OTP delivery

## Tech Stack

- Node.js
- Express.js
- TypeScript
- PostgreSQL
- Prisma ORM
- Firebase Admin SDK
- JWT Authentication
- Twilio SMS API

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL
- Firebase project with Admin SDK credentials
- Twilio account for SMS delivery

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/snap?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"

# Firebase Admin
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_PRIVATE_KEY="your-private-key"
FIREBASE_CLIENT_EMAIL="your-client-email"

# Twilio
TWILIO_ACCOUNT_SID="your-account-sid"
TWILIO_AUTH_TOKEN="your-auth-token"
TWILIO_PHONE_NUMBER="your-twilio-phone-number"

# Server
PORT=3000
NODE_ENV=development

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Generate Prisma client:
```bash
npm run prisma:generate
```

3. Run database migrations:
```bash
npm run prisma:migrate
```

## Development

Start the development server:
```bash
npm run dev
```

## API Endpoints

### Authentication

- `POST /api/auth/initiate-login`
  - Initiates login process with phone number
  - Sends OTP to the provided phone number via SMS

- `POST /api/auth/verify-otp`
  - Verifies OTP and checks if user exists
  - Registers new device if needed

- `POST /api/auth/register`
  - Registers new user with personal details
  - Creates initial device record
  - Sends PIN via SMS

- `POST /api/auth/login`
  - Authenticates user with PIN
  - Creates new session

- `POST /api/auth/logout`
  - Invalidates current session
  - Requires authentication

## Database Schema

The application uses the following main models:

- User
- Device
- Session
- OTP

See `prisma/schema.prisma` for detailed schema information.

## Security

- JWT-based authentication
- Device verification
- Rate limiting
- CORS protection
- Helmet security headers
- PIN hashing with bcrypt
- SMS-based verification
- Input validation

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request 