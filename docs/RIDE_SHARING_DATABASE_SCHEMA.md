# 🗄️ Ride-Sharing Database Schema Documentation

## Overview
This document provides comprehensive documentation for the ride-sharing database schema, including all tables, relationships, indexes, and data types.

## Table of Contents
- [Database Overview](#database-overview)
- [Core Tables](#core-tables)
- [Relationship Diagrams](#relationship-diagrams)
- [Indexes and Performance](#indexes-and-performance)
- [Data Types and Constraints](#data-types-and-constraints)
- [Sample Data](#sample-data)

---

## Database Overview

### Technology Stack
- **Database**: PostgreSQL 15+
- **ORM**: Prisma
- **Migration Tool**: Prisma Migrate
- **Connection**: Connection pooling with PgBouncer

### Database Name
```
marketplace_uat
```

---

## Core Tables

### 1. Users Table
**Table Name**: `users`

#### Schema
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  phoneNumber TEXT UNIQUE,
  firstName TEXT NOT NULL,
  lastName TEXT NOT NULL,
  password TEXT NOT NULL,
  isActive BOOLEAN DEFAULT true,
  isVerified BOOLEAN DEFAULT false,
  role TEXT DEFAULT 'USER',
  profilePicture TEXT,
  dateOfBirth DATE,
  gender TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'Gambia',
  postalCode TEXT,
  preferences JSONB,
  lastLogin TIMESTAMP,
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now()
);
```

#### Indexes
```sql
CREATE INDEX users_email_idx ON users(email);
CREATE INDEX users_phoneNumber_idx ON users(phoneNumber);
CREATE INDEX users_role_idx ON users(role);
CREATE INDEX users_isActive_idx ON users(isActive);
CREATE INDEX users_createdAt_idx ON users(createdAt);
```

### 2. Drivers Table
**Table Name**: `drivers`

#### Schema
```sql
CREATE TABLE drivers (
  id TEXT PRIMARY KEY,
  userId TEXT UNIQUE NOT NULL,
  riderApplicationId TEXT UNIQUE NOT NULL,
  driverId TEXT UNIQUE NOT NULL,
  rideServiceId TEXT,
  isOnline BOOLEAN DEFAULT false,
  status driver_status DEFAULT 'OFFLINE',
  currentLocation JSONB,
  lastLocationUpdate TIMESTAMP,
  totalRides INTEGER DEFAULT 0,
  totalEarnings DECIMAL(10,2) DEFAULT 0,
  rating DECIMAL(3,2),
  ratingCount INTEGER DEFAULT 0,
  vehicleInfo JSONB,
  documents JSONB,
  preferences JSONB,
  isVerified BOOLEAN DEFAULT false,
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now(),
  
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (riderApplicationId) REFERENCES rider_applications(id),
  FOREIGN KEY (rideServiceId) REFERENCES ride_services(id) ON DELETE SET NULL
);
```

#### Indexes
```sql
CREATE INDEX drivers_userId_idx ON drivers(userId);
CREATE INDEX drivers_driverId_idx ON drivers(driverId);
CREATE INDEX drivers_rideServiceId_idx ON drivers(rideServiceId);
CREATE INDEX drivers_isOnline_idx ON drivers(isOnline);
CREATE INDEX drivers_status_idx ON drivers(status);
CREATE INDEX drivers_isActive_idx ON drivers(isActive);
CREATE INDEX drivers_createdAt_idx ON drivers(createdAt);
```

### 3. Driver Locations Table
**Table Name**: `driver_locations`

#### Schema
```sql
CREATE TABLE driver_locations (
  id TEXT PRIMARY KEY,
  driverId TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  address TEXT,
  accuracy DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  timestamp TIMESTAMP DEFAULT now(),
  
  FOREIGN KEY (driverId) REFERENCES drivers(id) ON DELETE CASCADE
);
```

#### Indexes
```sql
CREATE INDEX driver_locations_driverId_idx ON driver_locations(driverId);
CREATE INDEX driver_locations_timestamp_idx ON driver_locations(timestamp);
CREATE INDEX driver_locations_location_idx ON driver_locations USING GIST (
  ll_to_earth(latitude, longitude)
);
```

### 4. Rider Applications Table
**Table Name**: `rider_applications`

#### Schema
```sql
CREATE TABLE rider_applications (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  applicationId TEXT UNIQUE NOT NULL,
  vehicleType rider_vehicle_type NOT NULL,
  licenseNumber TEXT NOT NULL,
  licenseExpiry DATE NOT NULL,
  vehicleModel TEXT NOT NULL,
  vehicleYear INTEGER NOT NULL,
  vehicleColor TEXT NOT NULL,
  licensePlate TEXT NOT NULL,
  insuranceNumber TEXT,
  insuranceExpiry DATE,
  status rider_application_status DEFAULT 'PENDING',
  submittedAt TIMESTAMP DEFAULT now(),
  reviewedAt TIMESTAMP,
  reviewedBy TEXT,
  rejectionReason TEXT,
  documents JSONB,
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now(),
  
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
```

#### Indexes
```sql
CREATE INDEX rider_applications_userId_idx ON rider_applications(userId);
CREATE INDEX rider_applications_applicationId_idx ON rider_applications(applicationId);
CREATE INDEX rider_applications_status_idx ON rider_applications(status);
CREATE INDEX rider_applications_vehicleType_idx ON rider_applications(vehicleType);
CREATE INDEX rider_applications_createdAt_idx ON rider_applications(createdAt);
```

### 5. Ride Services Table
**Table Name**: `ride_services`

#### Schema
```sql
CREATE TABLE ride_services (
  id TEXT PRIMARY KEY,
  serviceId TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  vehicleType rider_vehicle_type NOT NULL,
  isActive BOOLEAN DEFAULT true,
  distanceUnit distance_unit DEFAULT 'KM',
  baseFare DECIMAL(10,2) NOT NULL,
  perKmRate DECIMAL(10,2) NOT NULL,
  perMinuteRate DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  currencySymbol TEXT DEFAULT '$',
  surgeMultiplier DECIMAL(3,2) DEFAULT 1.00,
  nightMultiplier DECIMAL(3,2) DEFAULT 1.00,
  weekendMultiplier DECIMAL(3,2) DEFAULT 1.00,
  platformFee DECIMAL(5,2) DEFAULT 0.00,
  cancellationFee DECIMAL(10,2) DEFAULT 0.00,
  minimumFare DECIMAL(10,2) DEFAULT 0.00,
  maximumFare DECIMAL(10,2),
  surgeThreshold INTEGER DEFAULT 10,
  surgeRadius DECIMAL(5,2) DEFAULT 5.00,
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now()
);
```

#### Indexes
```sql
CREATE INDEX ride_services_serviceId_idx ON ride_services(serviceId);
CREATE INDEX ride_services_vehicleType_idx ON ride_services(vehicleType);
CREATE INDEX ride_services_isActive_idx ON ride_services(isActive);
CREATE INDEX ride_services_createdAt_idx ON ride_services(createdAt);
```

### 6. Ride Requests Table
**Table Name**: `ride_requests`

#### Schema
```sql
CREATE TABLE ride_requests (
  id TEXT PRIMARY KEY,
  requestId TEXT UNIQUE NOT NULL,
  customerId TEXT NOT NULL,
  driverId TEXT,
  rideServiceId TEXT,
  pickupLocation JSONB NOT NULL,
  destinationLocation JSONB NOT NULL,
  rideType ride_type DEFAULT 'STANDARD',
  estimatedDistance DOUBLE PRECISION,
  estimatedDuration INTEGER,
  estimatedPrice DECIMAL(10,2) NOT NULL,
  actualPrice DECIMAL(10,2),
  status ride_status DEFAULT 'REQUESTED',
  paymentMethod ride_payment_method DEFAULT 'CASH',
  customerNotes TEXT,
  driverNotes TEXT,
  requestedAt TIMESTAMP DEFAULT now(),
  acceptedAt TIMESTAMP,
  startedAt TIMESTAMP,
  completedAt TIMESTAMP,
  cancelledAt TIMESTAMP,
  cancelledBy TEXT,
  cancellationReason TEXT,
  expiresAt TIMESTAMP NOT NULL,
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now(),
  
  FOREIGN KEY (customerId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (driverId) REFERENCES drivers(id) ON DELETE SET NULL,
  FOREIGN KEY (rideServiceId) REFERENCES ride_services(id) ON DELETE SET NULL
);
```

#### Indexes
```sql
CREATE INDEX ride_requests_requestId_idx ON ride_requests(requestId);
CREATE INDEX ride_requests_customerId_idx ON ride_requests(customerId);
CREATE INDEX ride_requests_driverId_idx ON ride_requests(driverId);
CREATE INDEX ride_requests_rideServiceId_idx ON ride_requests(rideServiceId);
CREATE INDEX ride_requests_status_idx ON ride_requests(status);
CREATE INDEX ride_requests_requestedAt_idx ON ride_requests(requestedAt);
CREATE INDEX ride_requests_expiresAt_idx ON ride_requests(expiresAt);
```

### 7. Rides Table
**Table Name**: `rides`

#### Schema
```sql
CREATE TABLE rides (
  id TEXT PRIMARY KEY,
  rideId TEXT UNIQUE NOT NULL,
  rideRequestId TEXT UNIQUE NOT NULL,
  driverId TEXT NOT NULL,
  customerId TEXT NOT NULL,
  rideServiceId TEXT,
  pickupLocation JSONB NOT NULL,
  destinationLocation JSONB NOT NULL,
  actualPickupLocation JSONB,
  actualDropoffLocation JSONB,
  rideType ride_type DEFAULT 'STANDARD',
  distance DOUBLE PRECISION,
  duration INTEGER,
  baseFare DECIMAL(10,2) NOT NULL,
  distanceFare DECIMAL(10,2) NOT NULL,
  timeFare DECIMAL(10,2) NOT NULL,
  surgeFare DECIMAL(10,2) DEFAULT 0,
  totalFare DECIMAL(10,2) NOT NULL,
  driverEarnings DECIMAL(10,2) NOT NULL,
  platformFee DECIMAL(10,2) NOT NULL,
  paymentMethod ride_payment_method DEFAULT 'CASH',
  paymentStatus payment_status DEFAULT 'PENDING',
  status ride_status DEFAULT 'REQUESTED',
  customerRating INTEGER,
  driverRating INTEGER,
  customerReview TEXT,
  driverReview TEXT,
  startedAt TIMESTAMP,
  completedAt TIMESTAMP,
  cancelledAt TIMESTAMP,
  cancelledBy TEXT,
  cancellationReason TEXT,
  route JSONB,
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now(),
  
  FOREIGN KEY (rideRequestId) REFERENCES ride_requests(id),
  FOREIGN KEY (rideServiceId) REFERENCES ride_services(id) ON DELETE SET NULL,
  FOREIGN KEY (driverId) REFERENCES drivers(id),
  FOREIGN KEY (customerId) REFERENCES users(id)
);
```

#### Indexes
```sql
CREATE INDEX rides_rideId_idx ON rides(rideId);
CREATE INDEX rides_rideRequestId_idx ON rides(rideRequestId);
CREATE INDEX rides_driverId_idx ON rides(driverId);
CREATE INDEX rides_customerId_idx ON rides(customerId);
CREATE INDEX rides_rideServiceId_idx ON rides(rideServiceId);
CREATE INDEX rides_status_idx ON rides(status);
CREATE INDEX rides_paymentStatus_idx ON rides(paymentStatus);
CREATE INDEX rides_startedAt_idx ON rides(startedAt);
CREATE INDEX rides_completedAt_idx ON rides(completedAt);
```

### 8. Ride Locations Table
**Table Name**: `ride_locations`

#### Schema
```sql
CREATE TABLE ride_locations (
  id TEXT PRIMARY KEY,
  rideId TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  timestamp TIMESTAMP DEFAULT now(),
  
  FOREIGN KEY (rideId) REFERENCES rides(id) ON DELETE CASCADE
);
```

#### Indexes
```sql
CREATE INDEX ride_locations_rideId_idx ON ride_locations(rideId);
CREATE INDEX ride_locations_timestamp_idx ON ride_locations(timestamp);
CREATE INDEX ride_locations_location_idx ON ride_locations USING GIST (
  ll_to_earth(latitude, longitude)
);
```

### 9. Driver Earnings Table
**Table Name**: `driver_earnings`

#### Schema
```sql
CREATE TABLE driver_earnings (
  id TEXT PRIMARY KEY,
  driverId TEXT NOT NULL,
  rideId TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  processedAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT now(),
  
  FOREIGN KEY (driverId) REFERENCES drivers(id) ON DELETE CASCADE
);
```

#### Indexes
```sql
CREATE INDEX driver_earnings_driverId_idx ON driver_earnings(driverId);
CREATE INDEX driver_earnings_rideId_idx ON driver_earnings(rideId);
CREATE INDEX driver_earnings_type_idx ON driver_earnings(type);
CREATE INDEX driver_earnings_createdAt_idx ON driver_earnings(createdAt);
```

---

## Enums

### 1. Driver Status
```sql
CREATE TYPE driver_status AS ENUM (
  'OFFLINE',
  'ONLINE',
  'BUSY',
  'SUSPENDED'
);
```

### 2. Ride Status
```sql
CREATE TYPE ride_status AS ENUM (
  'REQUESTED',
  'ACCEPTED',
  'ARRIVING',
  'ARRIVED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'EXPIRED'
);
```

### 3. Ride Type
```sql
CREATE TYPE ride_type AS ENUM (
  'STANDARD',
  'PREMIUM',
  'POOL',
  'DELIVERY'
);
```

### 4. Ride Payment Method
```sql
CREATE TYPE ride_payment_method AS ENUM (
  'CASH',
  'CARD',
  'MOBILE_MONEY',
  'WALLET'
);
```

### 5. Rider Vehicle Type
```sql
CREATE TYPE rider_vehicle_type AS ENUM (
  'DRIVER',
  'MOTORCYCLE',
  'BICYCLE'
);
```

### 6. Rider Application Status
```sql
CREATE TYPE rider_application_status AS ENUM (
  'PENDING',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'SUSPENDED'
);
```

### 7. Distance Unit
```sql
CREATE TYPE distance_unit AS ENUM (
  'KM',
  'MILES'
);
```

### 8. Payment Status
```sql
CREATE TYPE payment_status AS ENUM (
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'REFUNDED'
);
```

---

## Relationship Diagrams

### Entity Relationship Diagram
```
Users (1) ←→ (1) Drivers
Users (1) ←→ (N) RideRequests
Users (1) ←→ (N) RiderApplications
Drivers (1) ←→ (N) DriverLocations
Drivers (1) ←→ (N) Rides
Drivers (1) ←→ (N) DriverEarnings
RideRequests (1) ←→ (1) Rides
Rides (1) ←→ (N) RideLocations
RideServices (1) ←→ (N) Drivers
RideServices (1) ←→ (N) RideRequests
RideServices (1) ←→ (N) Rides
```

### Key Relationships
1. **User → Driver**: One-to-one relationship
2. **User → RideRequests**: One-to-many (customer creates requests)
3. **Driver → Rides**: One-to-many (driver completes rides)
4. **RideRequest → Ride**: One-to-one (request becomes ride when accepted)
5. **RideService → Drivers**: One-to-many (service type for drivers)

---

## Indexes and Performance

### Primary Indexes
- All tables have primary key indexes on `id`
- Unique indexes on business identifiers (`requestId`, `rideId`, `driverId`, etc.)

### Performance Indexes
- **Location-based queries**: GIST indexes on latitude/longitude
- **Time-based queries**: Indexes on timestamp fields
- **Status filtering**: Indexes on status enums
- **Foreign key relationships**: Indexes on foreign key columns

### Query Optimization
```sql
-- Example: Find nearby drivers
SELECT d.*, 
       earth_distance(
         ll_to_earth(dl.latitude, dl.longitude),
         ll_to_earth(13.4432, -16.5919)
       ) as distance
FROM drivers d
JOIN driver_locations dl ON d.id = dl.driverId
WHERE d.isOnline = true 
  AND d.status = 'ONLINE'
  AND earth_distance(
    ll_to_earth(dl.latitude, dl.longitude),
    ll_to_earth(13.4432, -16.5919)
  ) <= 5000
ORDER BY distance;
```

---

## Data Types and Constraints

### JSONB Fields
- **currentLocation**: Driver's current location with address
- **vehicleInfo**: Vehicle details (model, plate, color, year)
- **documents**: Driver documents (license, insurance)
- **preferences**: User/driver preferences
- **route**: Route polyline and waypoints

### Decimal Precision
- **Money fields**: DECIMAL(10,2) for fares and earnings
- **Ratings**: DECIMAL(3,2) for ratings (1.00 to 5.00)
- **Multipliers**: DECIMAL(3,2) for surge/time multipliers

### Timestamp Fields
- **Created/Updated**: Automatic timestamps
- **Business events**: Manual timestamps (acceptedAt, startedAt, etc.)

---

## Sample Data

### Sample Ride Request
```sql
INSERT INTO ride_requests (
  id, requestId, customerId, pickupLocation, destinationLocation,
  estimatedDistance, estimatedDuration, estimatedPrice, status, expiresAt
) VALUES (
  gen_random_uuid(),
  'RIDE_TEST_001',
  (SELECT id FROM users LIMIT 1),
  '{"latitude": 13.4432, "longitude": -16.5919, "address": "Banjul International Airport"}',
  '{"latitude": 13.4532, "longitude": -16.6019, "address": "City Center"}',
  2.5, 15, 12.50, 'REQUESTED',
  NOW() + INTERVAL '5 minutes'
);
```

### Sample Driver
```sql
INSERT INTO drivers (
  id, userId, riderApplicationId, driverId, isOnline, status,
  totalRides, totalEarnings, rating, vehicleInfo
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM users LIMIT 1),
  (SELECT id FROM rider_applications LIMIT 1),
  'DRIVER_001',
  true, 'ONLINE',
  150, 2500.00, 4.8,
  '{"model": "Toyota Camry", "plate": "ABC123", "color": "White", "year": 2020}'
);
```

### Sample Ride Service
```sql
INSERT INTO ride_services (
  id, serviceId, name, description, vehicleType,
  baseFare, perKmRate, perMinuteRate, currency, currencySymbol
) VALUES (
  gen_random_uuid(),
  'STANDARD_RIDE',
  'Standard Ride',
  'Regular car service',
  'DRIVER',
  5.00, 2.50, 0.30, 'USD', '$'
);
```

---

## Database Maintenance

### Regular Maintenance Tasks
1. **Vacuum**: Weekly vacuum to reclaim storage
2. **Analyze**: Update statistics after data changes
3. **Index Rebuild**: Monthly index maintenance
4. **Backup**: Daily automated backups

### Monitoring Queries
```sql
-- Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Check slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

---

## Security Considerations

### Data Protection
- **Encryption**: Sensitive data encrypted at rest
- **Access Control**: Role-based access control
- **Audit Logging**: All changes logged
- **Backup Encryption**: Encrypted backups

### SQL Injection Prevention
- **Parameterized Queries**: All queries use parameters
- **Input Validation**: Strict input validation
- **ORM Protection**: Prisma ORM prevents injection

---

## Migration Strategy

### Version Control
- **Prisma Migrate**: All schema changes versioned
- **Rollback Support**: Ability to rollback migrations
- **Zero Downtime**: Blue-green deployment strategy

### Migration Process
1. Create migration file
2. Test in development
3. Deploy to staging
4. Run migration in production
5. Verify data integrity

---

## Performance Tuning

### Query Optimization
- **Connection Pooling**: PgBouncer for connection management
- **Read Replicas**: Separate read/write databases
- **Caching**: Redis for frequently accessed data
- **Partitioning**: Time-based partitioning for large tables

### Monitoring
- **Query Performance**: pg_stat_statements
- **Connection Monitoring**: pg_stat_activity
- **Resource Usage**: System metrics
- **Alerting**: Automated alerts for issues

---

## Backup and Recovery

### Backup Strategy
- **Full Backup**: Daily full database backup
- **Incremental Backup**: Hourly incremental backups
- **Point-in-Time Recovery**: WAL archiving enabled
- **Cross-Region**: Backups stored in multiple regions

### Recovery Procedures
1. **Full Recovery**: Restore from full backup
2. **Point-in-Time**: Restore to specific timestamp
3. **Table Recovery**: Restore individual tables
4. **Data Validation**: Verify data integrity after recovery

---

## Support and Documentation

### Resources
- **Schema Documentation**: This document
- **API Documentation**: REST API endpoints
- **Migration Guide**: Database migration procedures
- **Troubleshooting**: Common issues and solutions

### Contact
- **Database Admin**: db-admin@marketplace.com
- **Technical Support**: tech-support@marketplace.com
- **Emergency**: 24/7 on-call support 