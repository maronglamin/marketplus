# Rider Application to Driver Migration Guide

## Overview

The ride-sharing system uses a two-step process for driver registration:

1. **RiderApplication** - Initial application process
2. **Driver** - Active driver profile (created when application is approved)

## Current Database Structure

### RiderApplication Table
- Stores initial driver applications
- Contains all driver information (vehicle, license, etc.)
- Status: `PENDING`, `APPROVED`, `REJECTED`, `SUSPENDED`

### Driver Table (New)
- Created automatically when RiderApplication is approved
- Contains active driver status and ride data
- Linked to RiderApplication via `riderApplicationId`

## Relationship Flow

```
User Registration → RiderApplication → Approval → Driver Profile
```

### Step 1: User Applies as Rider
```sql
-- User fills out rider application
INSERT INTO rider_applications (
  userId, vehicleType, firstName, lastName, 
  phoneNumber, licenseNumber, vehicleModel, 
  vehiclePlate, status
) VALUES (
  'user123', 'CAR', 'John', 'Doe', 
  '+220123456789', 'LIC123456', 'Toyota Camry', 
  'ABC123', 'PENDING'
);
```

### Step 2: Application Approval (Handled by Admin Panel)
```sql
-- Application approval is handled by the separate admin panel project
-- This updates the application status to APPROVED
UPDATE rider_applications 
SET status = 'APPROVED', 
    approvedAt = NOW(), 
    reviewedBy = 'admin_user'
WHERE id = 'application123';
```

### Step 3: Driver Profile Created (Automatic)
```sql
-- System automatically creates driver profile
INSERT INTO drivers (
  userId, riderApplicationId, driverId, 
  isOnline, status, totalRides, totalEarnings,
  vehicleInfo, documents, isVerified, isActive
) VALUES (
  'user123', 'application123', 'DRIVER_1705312200000_abc123',
  false, 'OFFLINE', 0, 0,
  '{"model": "Toyota Camry", "plate": "ABC123"}',
  '{"license": {"number": "LIC123456"}}',
  true, true
);
```

## Current Implementation Status

### ✅ What's Working
- RiderApplication table exists and is functional
- Driver registration flow works
- Application approval process works

### ⚠️ What Needs Migration
- Driver table needs to be created
- Existing approved applications need driver profiles
- Ride-sharing tables need to be created

## Migration Steps

### 1. Run Database Migration
```bash
cd appBackend
npx prisma migrate dev --name add-ride-sharing-models
```

### 2. Create Driver Profiles for Existing Approved Applications
```sql
-- This will be run automatically by the system
-- For each approved rider application, create a driver profile
INSERT INTO drivers (
  userId, riderApplicationId, driverId, 
  isOnline, status, totalRides, totalEarnings,
  vehicleInfo, documents, isVerified, isActive,
  createdAt, updatedAt
)
SELECT 
  ra.userId,
  ra.id as riderApplicationId,
  CONCAT('DRIVER_', UNIX_TIMESTAMP(), '_', SUBSTRING(MD5(RAND()), 1, 6)) as driverId,
  false as isOnline,
  'OFFLINE' as status,
  0 as totalRides,
  0 as totalEarnings,
  JSON_OBJECT(
    'model', ra.vehicleModel,
    'plate', ra.vehiclePlate,
    'color', 'Unknown',
    'year', YEAR(NOW())
  ) as vehicleInfo,
  JSON_OBJECT(
    'license', JSON_OBJECT(
      'number', ra.licenseNumber,
      'expiry', ra.licenseExpiry
    ),
    'insurance', JSON_OBJECT(
      'number', ra.insuranceNumber,
      'expiry', ra.insuranceExpiry
    )
  ) as documents,
  true as isVerified,
  true as isActive,
  ra.approvedAt as createdAt,
  NOW() as updatedAt
FROM rider_applications ra
WHERE ra.status = 'APPROVED'
AND NOT EXISTS (
  SELECT 1 FROM drivers d WHERE d.riderApplicationId = ra.id
);
```

### 3. Update Application Status
```sql
-- Update any pending applications that should be approved
UPDATE rider_applications 
SET status = 'APPROVED', 
    approvedAt = NOW()
WHERE status = 'PENDING' 
AND /* your approval criteria */;
```

## API Endpoints Relationship

### Before Migration (Current)
- `/api/rider` - Rider application endpoints
- Driver endpoints return "No approved rider application found"

### After Migration
- `/api/rider` - Rider application endpoints (unchanged)
- `/api/driver` - Driver profile and ride management
- `/api/ride-requests` - Ride request management

## Error Handling

### Common Errors and Solutions

#### 1. "Driver not found"
**Cause**: User has no approved rider application
**Solution**: Complete rider application process first

#### 2. "No approved rider application found"
**Cause**: Application is pending or rejected
**Solution**: Wait for approval from admin panel or reapply

#### 3. "Driver table does not exist"
**Cause**: Migration not run
**Solution**: Run `npx prisma migrate dev`

## Testing the Relationship

### 1. Test Rider Application
```bash
# Create rider application
curl -X POST http://localhost:3000/api/rider \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleType": "CAR",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+220123456789",
    "licenseNumber": "LIC123456",
    "vehicleModel": "Toyota Camry",
    "vehiclePlate": "ABC123"
  }'
```

### 2. Approve Application (Admin Panel)
```sql
-- This should be done through the separate admin panel project
UPDATE rider_applications 
SET status = 'APPROVED', 
    approvedAt = NOW()
WHERE userId = 'user123';
```

### 3. Test Driver Profile
```bash
# Get driver profile (should work after approval)
curl -X GET http://localhost:3000/api/driver/profile \
  -H "Authorization: Bearer <token>"
```

### 4. Test Driver Status
```bash
# Update driver status
curl -X POST http://localhost:3000/api/driver/status \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"isOnline": true}'
```

## Frontend Integration

### Driver Dashboard Flow
1. User opens Driver Dashboard
2. System checks for approved rider application
3. If approved, creates driver profile (if not exists)
4. Loads driver data and shows dashboard
5. If not approved, shows application status

### Error Messages for Users
- **Pending**: "Your application is under review"
- **Rejected**: "Your application was rejected. Please reapply"
- **No Application**: "Please complete your rider application first"

## Next Steps

1. **Run Migration**: `npx prisma migrate dev`
2. **Test Existing Applications**: Verify approved applications work
3. **Update Frontend**: Handle driver profile creation
4. **Test Full Flow**: End-to-end testing of ride requests

## Support

For issues with the migration process:
1. Check Prisma migration logs
2. Verify database connection
3. Ensure all required fields are present
4. Test with a fresh application 