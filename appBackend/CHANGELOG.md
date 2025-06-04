# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Initial database schema with User, Device, Session, and OTP models
- Performance-optimizing indexes for all tables:
  - User table: phoneNumber, createdAt, updatedAt
  - Device table: deviceId, userId, isVerified, lastLoginAt, createdAt, updatedAt
  - Session table: token, userId, deviceId, expiresAt, createdAt, updatedAt
  - OTP table: phoneNumber, code, type, expiresAt, isUsed, createdAt
- Unique constraints for:
  - User phoneNumber
  - Device deviceId
  - Session token
  - Device userId + deviceId combination

### Database Schema Details
- User Model:
  - Basic user information (firstName, middleName, lastName)
  - Phone number authentication
  - PIN-based security
  - Timestamps for creation and updates
  - Relations to devices and sessions

- Device Model:
  - Device identification and metadata
  - Verification status tracking
  - Last login tracking
  - User association
  - Session management

- Session Model:
  - Token-based authentication
  - Expiration management
  - User and device associations
  - Timestamps for creation and updates

- OTP Model:
  - Phone number verification
  - PIN reset functionality
  - Expiration management
  - Usage tracking
  - Type differentiation (VERIFICATION/PIN_RESET)

### Technical Details
- Database: PostgreSQL
- ORM: Prisma
- Indexes optimized for:
  - Authentication flows
  - Device verification
  - Session management
  - OTP verification
  - Analytics queries 