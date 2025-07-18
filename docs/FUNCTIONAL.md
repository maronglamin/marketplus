# SNAP Application Functional Documentation

## User Authentication

### OTP-based Authentication
- **Phone Number Verification**
  1. User enters phone number
  2. System sends 6-digit OTP via SMS
  3. User enters OTP
  4. System validates OTP
  5. If valid:
     - For new users: Proceed to registration
     - For existing users: Proceed to PIN login
  6. If invalid:
     - System increments attempt counter
     - User can retry (max 5 attempts in 30 minutes)
     - After max attempts: Wait 30 minutes before retrying

- **OTP Security Features**
  - 6-digit numeric code
  - 15-minute expiration
  - Maximum 5 active OTPs per phone number
  - Rate limiting: 5 attempts per 30 minutes
  - Original code stored for direct comparison
  - Hashed code stored for security
  - Attempt tracking per phone number

### PIN-based Authentication
- **First-time Login**
  1. User enters initial PIN
  2. System validates PIN
  3. User is prompted to change PIN
  4. User enters new PIN
  5. User confirms new PIN
  6. System validates and saves new PIN
  7. User is redirected to Home screen

- **Subsequent Logins**
  1. User enters PIN
  2. System validates PIN
  3. User is redirected to Home screen

### PIN Management
- PIN must be 4 digits
- PIN cannot be sequential numbers
- PIN cannot be repeated numbers
- PIN change is mandatory on first login
- PIN can be changed later through settings

## Seller KYC Verification

### KYC Process
1. **Initial Registration**
   - Basic user information
   - Phone number verification
   - Device verification

2. **Business Information**
   - Business name
   - Business type (Individual, Sole Proprietorship, Partnership, Corporation, LLC)
   - Registration number (optional)
   - Tax ID (optional)

3. **Address Information**
   - Business address
   - City
   - State
   - Country
   - Postal code

4. **Document Verification**
   - Document type selection:
     - National ID
     - Passport
     - Driver's License
     - Business Registration
     - Tax Certificate
   - Document number
   - Document upload
   - Document expiry date (if applicable)

5. **Bank Account Information**
   - Account name
   - Account number
   - Bank name
   - Bank code
   - Branch code (optional)
   - SWIFT code (optional)
   - IBAN (optional)
   - Currency

6. **Wallet Information**
   - Wallet type (Crypto, Mobile Money, Digital Wallet)
   - Wallet address
   - Currency
   - Default status

### KYC Status Management
- **Status Types**
  - PENDING: Initial submission
  - APPROVED: Verification successful
  - REJECTED: Verification failed
  - SUSPENDED: Temporary suspension

- **Status Updates**
  - Automatic status updates
  - Email notifications
  - In-app notifications
  - Status change history

### Document Management
- **Upload Requirements**
  - Supported formats: JPG, PNG, PDF
  - Maximum file size: 5MB
  - Clear and legible images
  - Valid document types

- **Document Verification**
  - Automated checks
  - Manual review process
  - Expiry date validation
  - Document authenticity verification

### Bank Account Management
- **Account Types**
  - Bank Transfer
  - Mobile Money
  - Digital Wallet
  - Crypto Wallet

- **Account Status**
  - ACTIVE: Ready for transactions
  - INACTIVE: Temporarily disabled
  - SUSPENDED: Under review
  - BLOCKED: Permanently disabled

### Settlement Management
- **Settlement Types**
  - Bank Transfer
  - Wallet Transfer

- **Settlement Status**
  - PENDING: Initial request
  - PROCESSING: In progress
  - COMPLETED: Successfully processed
  - FAILED: Processing failed
  - CANCELLED: Request cancelled

## Main Application Features

### Home Screen
- **Welcome Banner**
  - Personalized greeting
  - Quick access to notifications
  - Profile settings access

- **Categories Section**
  - Horizontal scrollable list
  - Category icons with labels
  - Quick access to category products

- **Featured Products**
  - Grid layout display
  - Product images
  - Price information
  - Stock status
  - Seller information
  - Quick favorite action

- **Popular Sellers**
  - List of top-rated sellers
  - Seller profile images
  - Rating information
  - Product count
  - Quick access to seller profile

### Product Management

#### Product Listing
- Grid/List view options
- Filtering capabilities
- Sorting options
- Search functionality
- Category filtering

#### Product Details
- High-quality images
- Detailed description
- Price information
- Seller information
- Stock status
- Favorite functionality
- Show interest option

### Seller Dashboard

#### Overview
- Total products count
- Active products
- Total sales
- Pending orders
- Revenue statistics
- Average rating

#### Product Management
- Add new products
- Edit existing products
- Update stock
- Manage pricing
- Product status updates

#### Order Management
- View pending orders
- Process orders
- Update order status
- Track deliveries
- Handle returns

### Interest Management

#### Buyer Features
- Show interest in products
- Add personal message
- Track interest status
- View seller responses
- Manage multiple interests

#### Seller Features
- View interest requests
- Accept/Reject interests
- Respond to messages
- Track interest history
- Manage negotiations

### Navigation

#### Bottom Navigation
- Home
- Orders
- Interests
- Account (Seller Dashboard)

#### Header Navigation
- Notifications
- Profile Settings

### Settings

#### Account Settings
- Profile information
- Contact details
- Notification preferences
- Security settings
- PIN management

#### App Settings
- Language preferences
- Theme settings
- Display options
- Notification settings
- Privacy settings

## Business Rules

### Product Management
- Products must have valid images
- Price must be positive
- Stock must be non-negative
- Description must meet minimum length
- Category must be selected

### Order Processing
- Orders must be processed within 24 hours
- Stock must be available
- Price must be confirmed
- Delivery details must be provided
- Payment must be confirmed

### Interest Management
- Buyers can show interest in multiple products
- Sellers must respond within 48 hours
- Interest status must be updated
- Messages must be professional
- Negotiations must be tracked

### User Management
- Users must verify email
- PIN must be changed on first login
- Profile must be complete
- Contact information must be valid
- Rating system must be fair

## Error Handling

### Authentication Errors
- Invalid OTP
- OTP expiration
- Too many OTP attempts
- Invalid PIN
- PIN change requirements
- Session expiration
- Network issues
- Server errors

### KYC Errors
- Invalid document format
- Document size exceeded
- Invalid document type
- Expired document
- Invalid bank details
- Invalid wallet address
- Duplicate submission
- Verification failure

### Product Errors
- Invalid image format
- Price validation
- Stock validation
- Category validation
- Description validation

### Order Errors
- Insufficient stock
- Invalid delivery details
- Payment issues
- Processing delays
- Communication errors

### System Errors
- Network connectivity
- Server unavailability
- Data synchronization
- Cache issues
- Performance problems

## Data Validation

### Input Validation
- PIN format
- Price format
- Stock numbers
- Description length
- Image requirements

### Business Validation
- Stock availability
- Price ranges
- Category validity
- User permissions
- Order status

## Performance Requirements

### Response Times
- Screen load: < 2 seconds
- Image load: < 1 second
- API calls: < 3 seconds
- Navigation: < 500ms
- Search: < 1 second

### Resource Usage
- Memory usage: < 100MB
- Storage: < 50MB
- Network: Optimized
- Battery: Efficient
- CPU: Minimal

## Security Requirements

### Data Protection
- PIN encryption
- Secure storage
- API security
- Input sanitization
- Output encoding

### Access Control
- Role-based access
- Permission management
- Session control
- Token management
- Rate limiting 


### formular
- Available Revenue = Total Paid Orders - Service Fees - PENDING Settlements - PROCESSING Settlements - COMPLETED Settlements

-new: Available Revenue = Total PAID Orders (excluding SETTLED) - Service Fees
