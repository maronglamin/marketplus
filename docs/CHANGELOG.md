# Changelog

All notable changes to the Marketplace Application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive documentation structure in `/docs` directory
  - Architecture documentation (ARCHITECTURE.md)
  - Functional documentation (FUNCTIONAL.md)
  - Business documentation (BUSINESS.md)
  - Main documentation README (README.md)
- PIN-based authentication system
  - First-time login PIN change flow
  - PIN validation and security measures
  - Secure storage implementation
- Home screen redesign
  - Fixed header with notification and profile icons
  - Scrollable welcome banner
  - Categories section with horizontal scrolling
  - Featured products grid layout
  - Popular sellers list
- Bottom navigation bar
  - Home tab with active state
  - Orders tab (placeholder)
  - Interests tab with InterestManagement navigation
  - Account tab with SellerDashboard navigation
- Navigation structure improvements
  - RootNavigator for auth state management
  - AuthNavigator for authentication flows
  - AppNavigator for main application screens
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
- Seller KYC system implementation:
  - Business information management
  - Document verification system
  - Bank account management
  - Wallet integration
  - Settlement processing
  - KYC status tracking
  - Document upload and validation
  - Multi-level verification process

### Changed
- Updated navigation flow
  - Separated authentication and main app navigation
  - Improved navigation state management
  - Enhanced screen transitions
- Modified Home screen layout
  - Fixed header positioning
  - Improved scroll behavior
  - Enhanced visual hierarchy
- Updated bottom navigation
  - Changed Account tab to navigate to SellerDashboard
  - Improved active state handling
  - Enhanced visual feedback
- Enhanced OTP verification system:
  - Increased OTP expiry time from 10 to 15 minutes
  - Extended rate limiting window from 15 to 30 minutes
  - Increased maximum attempts from 3 to 5
  - Increased maximum active OTPs per phone from 3 to 5
  - Improved error handling for invalid codes
  - Added attempt tracking per phone number
  - Implemented both original and hashed code storage for better security
  - Added proper validation flow for new vs existing users
- Enhanced KYC verification process:
  - Improved document validation
  - Enhanced bank account verification
  - Updated wallet address validation
  - Streamlined settlement processing
  - Enhanced status management
  - Improved error handling
  - Added support for multiple business types
  - Enhanced compliance checks

### Fixed
- Status bar and safe area issues
  - Proper handling of status bar on iOS and Android
  - Fixed content overlap with status bar
  - Improved safe area insets
- Navigation state management
  - Fixed active tab indication
  - Corrected navigation routes
  - Improved state persistence
- OTP verification issues:
  - Fixed token generation after successful OTP verification
  - Resolved issue with attempts counter not incrementing properly
  - Fixed error handling to return false instead of throwing errors
  - Corrected session creation after successful verification
  - Fixed PIN generation and sending for new users
  - Resolved device verification status tracking
- KYC verification issues:
  - Fixed document upload validation
  - Resolved bank account verification
  - Fixed wallet address validation
  - Corrected settlement processing
  - Fixed status update notifications
  - Resolved compliance check issues
  - Fixed multi-level verification flow
  - Corrected business type validation

### Security
- Enhanced PIN-based authentication
  - Added PIN validation rules
  - Implemented secure storage
  - Added session management
- Improved data protection
  - Added input validation
  - Enhanced data sanitization
  - Implemented secure storage
- Enhanced OTP security:
  - Added rate limiting per phone number
  - Implemented attempt tracking
  - Added expiration checks
  - Improved code validation logic
  - Added proper error messages for security-related issues
- Enhanced KYC security:
  - Added document encryption
  - Implemented secure storage for sensitive data
  - Enhanced access control
  - Added audit logging
  - Improved compliance checks
  - Enhanced verification process security
  - Added fraud detection
  - Implemented risk assessment

### Technical Debt
- Need to implement Orders screen
- Need to add proper error boundaries
- Need to implement proper loading states
- Need to add proper form validation
- Need to implement proper API error handling

### Technical Details
- Database: PostgreSQL
- ORM: Prisma
- Indexes optimized for:
  - Authentication flows
  - Device verification
  - Session management
  - OTP verification
  - Analytics queries
  - KYC verification
  - Document management
  - Settlement processing

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
  - Attempt tracking
  - Original and hashed code storage

- SellerKyc Model:
  - Business information
  - Document verification
  - Bank account details
  - Wallet information
  - Settlement processing
  - Status tracking
  - Compliance checks
  - Risk assessment

- BankAccount Model:
  - Account details
  - Verification status
  - Settlement processing
  - Transaction history
  - Currency management

- Wallet Model:
  - Wallet details
  - Verification status
  - Settlement processing
  - Transaction history
  - Currency management

- Settlement Model:
  - Transaction details
  - Processing status
  - Payment information
  - Settlement history
  - Fee management

## [0.1.0] - 2024-03-20

### Added
- Initial project setup
- Basic navigation structure
- Authentication screens
- Home screen implementation
- Product listing functionality
- Seller dashboard
- Interest management system

### Known Issues
- Status bar overlap on some screens
- Navigation state persistence needs improvement
- Loading states not implemented
- Error handling needs enhancement
- Form validation incomplete

## Future Development Notes

### Immediate Tasks
1. Implement Orders screen
2. Add proper loading states
3. Implement error boundaries
4. Add form validation
5. Enhance API error handling

### Technical Improvements Needed
1. Implement proper state management
2. Add proper type checking
3. Enhance error handling
4. Improve performance
5. Add proper testing

### UI/UX Improvements
1. Add proper loading indicators
2. Enhance error messages
3. Improve form validation feedback
4. Add proper animations
5. Enhance visual feedback

### Security Enhancements
1. Implement proper session management
2. Add proper data encryption
3. Enhance PIN security
4. Add proper API security
5. Implement proper access control

### Documentation Updates Needed
1. Add API documentation
2. Add component documentation
3. Add testing documentation
4. Add deployment documentation
5. Add security documentation 