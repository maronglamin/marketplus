# Ride Service System Documentation

## Overview

The Ride Service System is a comprehensive, flexible configuration system for managing ride pricing, distance calculations, and currency support across different vehicle types and markets.

## Features

### 🚗 **Flexible Vehicle Types**
- **DRIVER**: Standard car rides (sedans, SUVs)
- **MOTORCYCLE**: Two-wheeled vehicle rides
- **BICYCLE**: Eco-friendly bicycle rides

### 🌍 **Multi-Currency Support**
- **GMD**: Gambian Dalasi (Default)
- **USD**: US Dollar
- **EUR**: Euro
- **Extensible**: Easy to add new currencies

### 📏 **Distance Unit Flexibility**
- **KILOMETER**: Metric system (default)
- **MILE**: Imperial system (US market)
- **METER**: Short-distance precision

### ⚡ **Dynamic Pricing**
- **Base Fare**: Starting fare for base distance
- **Per-KM Rate**: Rate per distance unit
- **Per-Minute Rate**: Time-based pricing
- **Surge Pricing**: Demand-based multipliers
- **Time-based Multipliers**: Night and weekend rates

## Database Schema

### RideService Table

```sql
CREATE TABLE ride_services (
  id                    UUID PRIMARY KEY,
  service_id            VARCHAR(50) UNIQUE NOT NULL,
  name                  VARCHAR(100) NOT NULL,
  description           TEXT,
  vehicle_type          VARCHAR(20) NOT NULL,
  is_active             BOOLEAN DEFAULT true,
  is_default            BOOLEAN DEFAULT false,
  
  -- Distance Configuration
  distance_unit         VARCHAR(20) DEFAULT 'KILOMETER',
  base_distance         FLOAT DEFAULT 1.0,
  max_distance          FLOAT,
  
  -- Pricing Configuration
  base_fare             DECIMAL(10,2) NOT NULL,
  per_km_rate           DECIMAL(10,2) NOT NULL,
  per_minute_rate       DECIMAL(10,2) NOT NULL,
  minimum_fare          DECIMAL(10,2) NOT NULL,
  maximum_fare          DECIMAL(10,2),
  
  -- Currency Configuration
  currency              VARCHAR(3) DEFAULT 'GMD',
  currency_symbol       VARCHAR(5) DEFAULT 'D',
  
  -- Surge Pricing
  surge_multiplier      DECIMAL(3,2) DEFAULT 1.0,
  max_surge_multiplier  DECIMAL(3,2) DEFAULT 3.0,
  
  -- Platform Fees
  platform_fee_percentage DECIMAL(5,4) DEFAULT 0.15,
  driver_earnings_percentage DECIMAL(5,4) DEFAULT 0.85,
  
  -- Time-based Pricing
  night_fare_multiplier DECIMAL(3,2) DEFAULT 1.2,
  weekend_fare_multiplier DECIMAL(3,2) DEFAULT 1.1,
  
  -- Cancellation Fees
  cancellation_fee      DECIMAL(10,2) DEFAULT 0,
  cancellation_time_limit INT DEFAULT 300,
  
  -- Service Features
  features              JSONB,
  restrictions          JSONB,
  
  -- Operational Settings
  estimated_pickup_time INT DEFAULT 5,
  max_wait_time         INT DEFAULT 10,
  
  -- Metadata
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW(),
  created_by            VARCHAR(100),
  updated_by            VARCHAR(100)
);
```

## API Endpoints

### Get All Active Services
```http
GET /api/ride-services
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "serviceId": "standard-car-gmd",
      "name": "Standard Car",
      "vehicleType": "DRIVER",
      "baseFare": "50.00",
      "perKmRate": "25.00",
      "perMinuteRate": "2.00",
      "minimumFare": "75.00",
      "maximumFare": "5000.00",
      "currency": "GMD",
      "currencySymbol": "D",
      "distanceUnit": "KILOMETER",
      "baseDistance": 1.0,
      "surgeMultiplier": "1.0",
      "maxSurgeMultiplier": "3.0",
      "platformFeePercentage": "0.15",
      "driverEarningsPercentage": "0.85",
      "nightFareMultiplier": "1.2",
      "weekendFareMultiplier": "1.1",
      "estimatedPickupTime": 5,
      "maxWaitTime": 10
    }
  ],
  "message": "Active ride services retrieved successfully"
}
```

### Get Service by ID
```http
GET /api/ride-services/:serviceId
```

### Get Default Service for Vehicle Type
```http
GET /api/ride-services/default/:vehicleType
```

### Calculate Fare
```http
POST /api/ride-services/calculate-fare
```

**Request Body:**
```json
{
  "distance": 5.2,
  "duration": 15,
  "rideServiceId": "standard-car-gmd",
  "surgeMultiplier": 1.5,
  "isNightTime": false,
  "isWeekend": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "baseFare": "50.00",
    "distanceFare": "130.00",
    "timeFare": "30.00",
    "surgeFare": "31.50",
    "totalFare": "241.50",
    "driverEarnings": "205.28",
    "platformFee": "36.23",
    "currency": "GMD",
    "currencySymbol": "D"
  },
  "message": "Fare calculated successfully"
}
```

### Get Surge Multiplier
```http
GET /api/ride-services/surge-multiplier?latitude=13.4432&longitude=-16.5919&radius=5
```

**Response:**
```json
{
  "success": true,
  "data": {
    "surgeMultiplier": 1.2,
    "latitude": 13.4432,
    "longitude": -16.5919,
    "radius": 5
  },
  "message": "Surge multiplier calculated successfully"
}
```

### Get Time Status
```http
GET /api/ride-services/time-status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isNightTime": false,
    "isWeekend": true,
    "currentTime": "2024-01-20T14:30:00.000Z",
    "hour": 14,
    "dayOfWeek": 6
  },
  "message": "Time status retrieved successfully"
}
```

### Create New Service (Admin Only)
```http
POST /api/ride-services
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "serviceId": "premium-car-usd",
  "name": "Premium Car (USD)",
  "vehicleType": "DRIVER",
  "baseFare": 10.00,
  "perKmRate": 2.50,
  "perMinuteRate": 0.30,
  "minimumFare": 15.00,
  "maximumFare": 200.00,
  "currency": "USD",
  "currencySymbol": "$",
  "distanceUnit": "KILOMETER",
  "baseDistance": 1.0,
  "isDefault": false
}
```

## Fare Calculation Logic

### 1. Base Fare Calculation
```
baseFare = service.baseFare
if (distance > service.baseDistance) {
  extraDistance = distance - service.baseDistance
  baseFare += service.perKmRate * extraDistance
}
```

### 2. Distance Fare
```
distanceFare = service.perKmRate * distance
```

### 3. Time Fare
```
timeFare = service.perMinuteRate * duration
```

### 4. Surge Calculation
```
totalBeforeSurge = baseFare + distanceFare + timeFare

// Apply time-based multipliers
if (isNightTime) {
  surgeMultiplier *= service.nightFareMultiplier
}
if (isWeekend) {
  surgeMultiplier *= service.weekendFareMultiplier
}

surgeFare = totalBeforeSurge * (surgeMultiplier - 1)
```

### 5. Total Fare
```
totalFare = totalBeforeSurge + surgeFare

// Apply limits
if (totalFare < service.minimumFare) {
  totalFare = service.minimumFare
}
if (service.maximumFare && totalFare > service.maximumFare) {
  totalFare = service.maximumFare
}
```

### 6. Platform Fee & Driver Earnings
```
platformFee = totalFare * service.platformFeePercentage
driverEarnings = totalFare * service.driverEarningsPercentage
```

## Distance Unit Conversion

The system automatically converts between distance units:

- **KILOMETER** ↔ **MILE**: 1 km = 0.621371 miles
- **KILOMETER** ↔ **METER**: 1 km = 1000 meters
- **MILE** ↔ **METER**: 1 mile = 1609.34 meters

## Surge Pricing Algorithm

### Demand/Supply Ratio Calculation
```
activeDrivers = count(drivers where status = 'ONLINE' AND within_radius)
pendingRequests = count(ride_requests where status = 'REQUESTED' AND within_last_10_minutes)
demandSupplyRatio = pendingRequests / activeDrivers
```

### Surge Multiplier Mapping
- **Ratio ≤ 0.5**: No surge (1.0x)
- **Ratio ≤ 1.0**: Low surge (1.2x)
- **Ratio ≤ 2.0**: Medium surge (1.5x)
- **Ratio ≤ 3.0**: High surge (2.0x)
- **Ratio > 3.0**: Maximum surge (3.0x)

## Default Service Configurations

### Standard Car (GMD)
```json
{
  "serviceId": "standard-car-gmd",
  "name": "Standard Car",
  "vehicleType": "DRIVER",
  "baseFare": "50.00",
  "perKmRate": "25.00",
  "perMinuteRate": "2.00",
  "minimumFare": "75.00",
  "maximumFare": "5000.00",
  "currency": "GMD",
  "currencySymbol": "D"
}
```

### Motorcycle (GMD)
```json
{
  "serviceId": "motorcycle-gmd",
  "name": "Motorcycle",
  "vehicleType": "MOTORCYCLE",
  "baseFare": "30.00",
  "perKmRate": "15.00",
  "perMinuteRate": "1.50",
  "minimumFare": "45.00",
  "maximumFare": "2000.00",
  "currency": "GMD",
  "currencySymbol": "D"
}
```

### Bicycle (GMD)
```json
{
  "serviceId": "bicycle-gmd",
  "name": "Bicycle",
  "vehicleType": "BICYCLE",
  "baseFare": "20.00",
  "perKmRate": "10.00",
  "perMinuteRate": "1.00",
  "minimumFare": "30.00",
  "maximumFare": "500.00",
  "currency": "GMD",
  "currencySymbol": "D"
}
```

## Usage Examples

### Frontend Integration

```typescript
// Get available services
const services = await fetch('/api/ride-services').then(r => r.json());

// Calculate fare
const fareCalculation = await fetch('/api/ride-services/calculate-fare', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    distance: 5.2,
    duration: 15,
    rideServiceId: 'standard-car-gmd'
  })
}).then(r => r.json());

// Get surge multiplier
const surge = await fetch('/api/ride-services/surge-multiplier?latitude=13.4432&longitude=-16.5919')
  .then(r => r.json());
```

### Backend Integration

```typescript
import { RideService } from '../services/rideService';

// Get default service for vehicle type
const service = await RideService.getDefaultService('DRIVER');

// Calculate fare
const fare = await RideService.calculateFare({
  distance: 5.2,
  duration: 15,
  rideServiceId: 'standard-car-gmd',
  surgeMultiplier: 1.2,
  isNightTime: false,
  isWeekend: true
});

// Get surge multiplier
const surge = await RideService.getSurgeMultiplier(13.4432, -16.5919, 5);
```

## Database Migration

Run the following commands to set up the database:

```bash
# Generate migration
npx prisma migrate dev --name add_ride_services

# Seed default services
npx ts-node scripts/seed-ride-services.ts
```

## Configuration Management

### Environment Variables
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/marketplace"

# API Configuration
API_PORT=3000
NODE_ENV=development
```

### Service Configuration
Services can be configured through the API or directly in the database. Each service supports:

- **Dynamic Pricing**: Real-time fare adjustments
- **Geographic Pricing**: Different rates for different areas
- **Time-based Pricing**: Peak hours, night rates, weekend rates
- **Vehicle-specific Pricing**: Different rates for different vehicle types
- **Currency Support**: Multi-currency pricing
- **Distance Units**: Flexible distance measurement systems

## Security Considerations

- **Authentication**: Admin endpoints require authentication
- **Validation**: All inputs are validated server-side
- **Rate Limiting**: API endpoints are rate-limited
- **Data Sanitization**: All data is sanitized before processing
- **Audit Trail**: All service changes are logged

## Monitoring & Analytics

### Key Metrics
- **Fare Calculation Accuracy**: Monitor fare calculation errors
- **Service Performance**: Track API response times
- **Usage Patterns**: Analyze service usage by vehicle type
- **Revenue Metrics**: Track platform fees and driver earnings
- **Surge Pricing Impact**: Monitor surge pricing effectiveness

### Logging
All operations are logged with structured data:
```json
{
  "level": "info",
  "message": "Calculated fare for service standard-car-gmd: 241.50 GMD",
  "serviceId": "standard-car-gmd",
  "totalFare": "241.50",
  "currency": "GMD",
  "timestamp": "2024-01-20T14:30:00.000Z"
}
```

## Future Enhancements

### Planned Features
- **Dynamic Pricing**: AI-powered fare optimization
- **Geographic Zones**: Zone-based pricing
- **Loyalty Programs**: Customer and driver loyalty rewards
- **Promotional Pricing**: Time-limited promotional rates
- **Multi-language Support**: Internationalization
- **Advanced Analytics**: Real-time business intelligence

### Integration Opportunities
- **Payment Gateways**: Multi-currency payment processing
- **Maps Integration**: Real-time traffic-based pricing
- **Weather Integration**: Weather-based fare adjustments
- **Event Integration**: Event-based surge pricing
- **Public Transport**: Integration with public transport systems 