# ⚙️ Surge Pricing System - Admin Configuration Guide

## Overview

This guide provides step-by-step instructions for configuring and managing the surge pricing system for different ride services.

---

## 🏗️ System Architecture

### Core Components
1. **Ride Service Configuration**: Service-specific surge settings
2. **Surge Calculation Engine**: Real-time demand/supply analysis
3. **Fare Calculation System**: Dynamic pricing application
4. **Admin Dashboard**: Configuration and monitoring interface

### Database Tables
- `ride_services`: Service configurations and surge settings
- `driver_locations`: Real-time driver availability data
- `ride_requests`: Demand data for surge calculation
- `rides`: Completed rides with surge data

---

## ⚙️ Service Configuration

### 1. Creating a New Ride Service

#### Via Admin Dashboard
```sql
-- Example: Premium Car Service
INSERT INTO ride_services (
  serviceId, name, vehicleType, isActive,
  baseFare, perKmRate, perMinuteRate, minimumFare,
  surgeMultiplier, maxSurgeMultiplier,
  nightFareMultiplier, weekendFareMultiplier,
  platformFeePercentage, driverEarningsPercentage
) VALUES (
  'premium-car-gmd',
  'Premium Car',
  'DRIVER',
  true,
  100.00, 50.00, 4.00, 150.00,
  1.0, 3.0,
  1.3, 1.2,
  0.15, 0.85
);
```

#### Via API
```bash
POST /api/admin/ride-services
{
  "serviceId": "premium-car-gmd",
  "name": "Premium Car",
  "vehicleType": "DRIVER",
  "baseFare": 100.00,
  "perKmRate": 50.00,
  "perMinuteRate": 4.00,
  "minimumFare": 150.00,
  "surgeMultiplier": 1.0,
  "maxSurgeMultiplier": 3.0,
  "nightFareMultiplier": 1.3,
  "weekendFareMultiplier": 1.2
}
```

### 2. Surge Configuration Parameters

#### Base Surge Settings
```typescript
interface SurgeConfig {
  surgeMultiplier: Decimal;        // Base multiplier (default: 1.0)
  maxSurgeMultiplier: Decimal;     // Maximum allowed surge (default: 3.0)
  nightFareMultiplier: Decimal;    // Night time multiplier (default: 1.2)
  weekendFareMultiplier: Decimal;  // Weekend multiplier (default: 1.1)
}
```

#### Recommended Settings by Service Type

| Service Type | Base Fare | Max Surge | Night Multiplier | Weekend Multiplier |
|--------------|-----------|-----------|------------------|-------------------|
| **Premium Car** | 100+ GMD | 3.0x | 1.3x | 1.2x |
| **Standard Car** | 50-100 GMD | 3.0x | 1.2x | 1.1x |
| **Motorcycle** | 30-50 GMD | 2.5x | 1.1x | 1.05x |
| **Bicycle** | 20-30 GMD | 2.0x | 1.0x | 1.0x |

---

## 🔧 Surge Calculation Configuration

### 1. Demand/Supply Analysis Settings

#### Geographic Radius Configuration
```typescript
// Default radius for surge calculation (in kilometers)
const SURGE_RADIUS = 5; // 5km radius around pickup location

// Adjustable per service or region
const REGIONAL_SURGE_RADIUS = {
  'urban': 3,    // Dense urban areas
  'suburban': 5, // Suburban areas
  'rural': 10    // Rural areas
};
```

#### Time Window Configuration
```typescript
// Time window for demand calculation (in minutes)
const DEMAND_WINDOW = 10; // Last 10 minutes of requests

// Adjustable based on market conditions
const MARKET_DEMAND_WINDOWS = {
  'peak_hours': 5,    // 5 minutes during peak
  'normal_hours': 10, // 10 minutes normal
  'off_peak': 15      // 15 minutes off-peak
};
```

### 2. Surge Multiplier Thresholds

#### Default Thresholds
```typescript
const SURGE_THRESHOLDS = {
  NO_SURGE: 0.5,      // demand/supply ratio <= 0.5
  LOW_SURGE: 1.0,     // demand/supply ratio <= 1.0
  MEDIUM_SURGE: 2.0,  // demand/supply ratio <= 2.0
  HIGH_SURGE: 3.0,    // demand/supply ratio <= 3.0
  MAX_SURGE: 3.0      // demand/supply ratio > 3.0
};

const SURGE_MULTIPLIERS = {
  NO_SURGE: 1.0,      // No increase
  LOW_SURGE: 1.2,     // 20% increase
  MEDIUM_SURGE: 1.5,  // 50% increase
  HIGH_SURGE: 2.0,    // 100% increase
  MAX_SURGE: 3.0      // 200% increase
};
```

#### Custom Thresholds per Service
```sql
-- Example: Custom thresholds for premium service
UPDATE ride_services 
SET 
  surgeMultiplier = 1.0,
  maxSurgeMultiplier = 4.0,
  customSurgeThresholds = '{"low": 0.3, "medium": 1.5, "high": 2.5, "max": 4.0}'
WHERE serviceId = 'premium-car-gmd';
```

---

## 🕐 Time-Based Configuration

### 1. Night Time Multipliers

#### Default Night Time Definition
```typescript
const NIGHT_TIME_CONFIG = {
  startHour: 22,  // 10 PM
  endHour: 6,     // 6 AM
  multiplier: 1.2 // 20% increase
};
```

#### Service-Specific Night Multipliers
```sql
-- Update night multipliers for different services
UPDATE ride_services 
SET nightFareMultiplier = 1.3 
WHERE vehicleType = 'DRIVER' AND name LIKE '%Premium%';

UPDATE ride_services 
SET nightFareMultiplier = 1.1 
WHERE vehicleType = 'MOTORCYCLE';

UPDATE ride_services 
SET nightFareMultiplier = 1.0 
WHERE vehicleType = 'BICYCLE';
```

### 2. Weekend Multipliers

#### Default Weekend Configuration
```typescript
const WEEKEND_CONFIG = {
  days: [0, 6],   // Sunday (0) and Saturday (6)
  multiplier: 1.1 // 10% increase
};
```

#### Custom Weekend Settings
```sql
-- Premium service higher weekend multiplier
UPDATE ride_services 
SET weekendFareMultiplier = 1.2 
WHERE serviceId = 'premium-car-gmd';

-- Bicycle service no weekend premium
UPDATE ride_services 
SET weekendFareMultiplier = 1.0 
WHERE vehicleType = 'BICYCLE';
```

---

## 🌍 Geographic Configuration

### 1. Surge Zones

#### Creating Surge Zones
```sql
-- Create surge zone table
CREATE TABLE surge_zones (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius DOUBLE PRECISION NOT NULL,
  baseMultiplier DECIMAL(3,2) DEFAULT 1.0,
  maxMultiplier DECIMAL(3,2) DEFAULT 3.0,
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT now()
);

-- Example: Airport surge zone
INSERT INTO surge_zones (
  id, name, latitude, longitude, radius, baseMultiplier, maxMultiplier
) VALUES (
  'airport-zone',
  'Banjul Airport',
  13.4432, -16.5919, 2.0, 1.2, 3.5
);
```

#### Zone-Specific Surge Rules
```typescript
const ZONE_SURGE_RULES = {
  'airport-zone': {
    baseMultiplier: 1.2,
    maxMultiplier: 3.5,
    timeMultipliers: {
      'morning': 1.3,  // 7-9 AM
      'evening': 1.4,  // 5-7 PM
      'night': 1.5     // 10 PM-6 AM
    }
  },
  'city-center': {
    baseMultiplier: 1.1,
    maxMultiplier: 2.5,
    timeMultipliers: {
      'rush_hour': 1.3,
      'weekend': 1.2
    }
  }
};
```

### 2. Regional Adjustments

#### Market-Specific Configuration
```sql
-- Different surge settings for different markets
UPDATE ride_services 
SET 
  maxSurgeMultiplier = 2.5,
  nightFareMultiplier = 1.1,
  weekendFareMultiplier = 1.05
WHERE currency = 'USD' AND vehicleType = 'DRIVER';

UPDATE ride_services 
SET 
  maxSurgeMultiplier = 3.0,
  nightFareMultiplier = 1.3,
  weekendFareMultiplier = 1.2
WHERE currency = 'GMD' AND vehicleType = 'DRIVER';
```

---

## 📊 Monitoring and Analytics

### 1. Surge Performance Metrics

#### Key Metrics to Monitor
```sql
-- Surge utilization rate
SELECT 
  COUNT(*) as total_rides,
  COUNT(CASE WHEN surgeFare > 0 THEN 1 END) as surged_rides,
  ROUND(COUNT(CASE WHEN surgeFare > 0 THEN 1 END) * 100.0 / COUNT(*), 2) as surge_rate
FROM rides 
WHERE createdAt >= NOW() - INTERVAL '24 hours';

-- Average surge multiplier by service
SELECT 
  rs.name as service_name,
  AVG(r.surgeFare / (r.totalFare - r.surgeFare + 1)) as avg_surge_multiplier,
  MAX(r.surgeFare / (r.totalFare - r.surgeFare + 1)) as max_surge_multiplier
FROM rides r
JOIN ride_services rs ON r.rideServiceId = rs.id
WHERE r.createdAt >= NOW() - INTERVAL '7 days'
GROUP BY rs.id, rs.name;
```

#### Revenue Impact Analysis
```sql
-- Surge revenue contribution
SELECT 
  DATE(createdAt) as ride_date,
  SUM(totalFare) as total_revenue,
  SUM(surgeFare) as surge_revenue,
  ROUND(SUM(surgeFare) * 100.0 / SUM(totalFare), 2) as surge_percentage
FROM rides 
WHERE createdAt >= NOW() - INTERVAL '30 days'
GROUP BY DATE(createdAt)
ORDER BY ride_date;
```

### 2. Real-Time Monitoring

#### Dashboard Queries
```sql
-- Current surge levels by zone
SELECT 
  sz.name as zone_name,
  COUNT(d.id) as active_drivers,
  COUNT(rr.id) as pending_requests,
  CASE 
    WHEN COUNT(d.id) = 0 THEN 3.0
    WHEN COUNT(rr.id) / COUNT(d.id) <= 0.5 THEN 1.0
    WHEN COUNT(rr.id) / COUNT(d.id) <= 1.0 THEN 1.2
    WHEN COUNT(rr.id) / COUNT(d.id) <= 2.0 THEN 1.5
    WHEN COUNT(rr.id) / COUNT(d.id) <= 3.0 THEN 2.0
    ELSE 3.0
  END as current_surge
FROM surge_zones sz
LEFT JOIN driver_locations dl ON 
  ST_DWithin(
    ST_MakePoint(sz.longitude, sz.latitude),
    ST_MakePoint(dl.longitude, dl.latitude),
    sz.radius * 1000
  )
LEFT JOIN drivers d ON dl.driverId = d.id AND d.status = 'ONLINE'
LEFT JOIN ride_requests rr ON 
  ST_DWithin(
    ST_MakePoint(sz.longitude, sz.latitude),
    ST_MakePoint(
      (rr.pickupLocation->>'longitude')::float,
      (rr.pickupLocation->>'latitude')::float
    ),
    sz.radius * 1000
  ) AND rr.status = 'REQUESTED'
WHERE sz.isActive = true
GROUP BY sz.id, sz.name;
```

---

## 🔧 Advanced Configuration

### 1. Dynamic Surge Adjustments

#### Event-Based Surge
```sql
-- Create events table for surge adjustments
CREATE TABLE surge_events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  startTime TIMESTAMP NOT NULL,
  endTime TIMESTAMP NOT NULL,
  multiplier DECIMAL(3,2) NOT NULL,
  affectedZones TEXT[], -- Array of zone IDs
  affectedServices TEXT[], -- Array of service IDs
  isActive BOOLEAN DEFAULT true
);

-- Example: Concert event surge
INSERT INTO surge_events (
  id, name, startTime, endTime, multiplier, affectedZones, affectedServices
) VALUES (
  'concert-2024-01-15',
  'Music Festival',
  '2024-01-15 18:00:00',
  '2024-01-15 23:00:00',
  2.0,
  ARRAY['city-center', 'stadium-zone'],
  ARRAY['standard-car-gmd', 'premium-car-gmd']
);
```

#### Weather-Based Surge
```typescript
// Weather surge configuration
const WEATHER_SURGE_CONFIG = {
  'rain': {
    multiplier: 1.3,
    duration: 60 // minutes
  },
  'storm': {
    multiplier: 1.5,
    duration: 120
  },
  'extreme_heat': {
    multiplier: 1.2,
    duration: 180
  }
};
```

### 2. Service-Specific Rules

#### Premium Service Enhancements
```sql
-- Premium service with higher surge tolerance
UPDATE ride_services 
SET 
  maxSurgeMultiplier = 4.0,
  customSurgeRules = '{
    "demand_thresholds": {"low": 0.2, "medium": 1.0, "high": 2.0, "max": 4.0},
    "time_multipliers": {"night": 1.4, "weekend": 1.3, "holiday": 1.5},
    "event_multipliers": {"concert": 2.5, "sports": 2.0, "festival": 3.0}
  }'
WHERE serviceId = 'premium-car-gmd';
```

#### Budget Service Limitations
```sql
-- Budget service with conservative surge
UPDATE ride_services 
SET 
  maxSurgeMultiplier = 1.8,
  customSurgeRules = '{
    "demand_thresholds": {"low": 0.8, "medium": 1.5, "high": 1.8},
    "time_multipliers": {"night": 1.0, "weekend": 1.05},
    "max_daily_surge": 1.5
  }'
WHERE vehicleType = 'BICYCLE';
```

---

## 🚨 Emergency Configuration

### 1. Surge Override Commands

#### Emergency Surge Disable
```sql
-- Disable surge for all services
UPDATE ride_services 
SET maxSurgeMultiplier = 1.0 
WHERE isActive = true;

-- Disable surge for specific service
UPDATE ride_services 
SET maxSurgeMultiplier = 1.0 
WHERE serviceId = 'standard-car-gmd';
```

#### Emergency Surge Increase
```sql
-- Emergency surge for natural disaster
UPDATE ride_services 
SET maxSurgeMultiplier = 5.0 
WHERE vehicleType = 'DRIVER';

-- Temporary surge for specific zone
UPDATE surge_zones 
SET maxMultiplier = 4.0 
WHERE name = 'emergency-zone';
```

### 2. Manual Surge Override

#### API Commands
```bash
# Set manual surge for specific location
POST /api/admin/surge-override
{
  "latitude": 13.4432,
  "longitude": -16.5919,
  "radius": 5,
  "multiplier": 2.5,
  "duration": 3600, // 1 hour
  "reason": "Emergency response"
}

# Disable surge for specific service
POST /api/admin/surge-disable
{
  "serviceId": "standard-car-gmd",
  "duration": 7200, // 2 hours
  "reason": "System maintenance"
}
```

---

## 📋 Configuration Checklist

### Initial Setup
- [ ] Create ride services with surge settings
- [ ] Configure surge calculation parameters
- [ ] Set up time-based multipliers
- [ ] Define surge zones
- [ ] Configure monitoring dashboards
- [ ] Test surge calculation accuracy
- [ ] Train admin users on configuration

### Regular Maintenance
- [ ] Monitor surge performance metrics
- [ ] Adjust surge thresholds based on data
- [ ] Update time-based multipliers
- [ ] Review and optimize surge zones
- [ ] Analyze revenue impact
- [ ] Update service configurations
- [ ] Backup surge configuration data

### Emergency Procedures
- [ ] Surge override procedures
- [ ] Emergency contact list
- [ ] Rollback procedures
- [ ] Communication protocols
- [ ] Monitoring alerts setup

---

## 🔍 Troubleshooting

### Common Issues

#### Surge Not Calculating
```sql
-- Check if drivers are online
SELECT COUNT(*) FROM drivers WHERE status = 'ONLINE';

-- Check if requests exist
SELECT COUNT(*) FROM ride_requests 
WHERE status = 'REQUESTED' 
AND requestedAt >= NOW() - INTERVAL '10 minutes';

-- Check service configuration
SELECT * FROM ride_services WHERE isActive = true;
```

#### Incorrect Surge Values
```sql
-- Verify surge calculation
SELECT 
  r.id,
  r.totalFare,
  r.surgeFare,
  r.surgeFare / (r.totalFare - r.surgeFare + 1) as calculated_surge,
  rs.maxSurgeMultiplier
FROM rides r
JOIN ride_services rs ON r.rideServiceId = rs.id
WHERE r.createdAt >= NOW() - INTERVAL '1 hour'
ORDER BY r.createdAt DESC;
```

#### Performance Issues
```sql
-- Check database performance
SELECT 
  schemaname, tablename, 
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE '%surge%' OR tablename LIKE '%ride%';

-- Monitor query performance
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
WHERE query LIKE '%surge%'
ORDER BY mean_time DESC;
```

---

## 📞 Admin Support

### Contact Information
- **Technical Support**: tech-support@marketplace.com
- **Configuration Help**: config-support@marketplace.com
- **Emergency Hotline**: +220-XXX-XXXX
- **Documentation**: https://docs.marketplace.com/admin

### Training Resources
- [Admin Dashboard Tutorial](https://training.marketplace.com/admin-dashboard)
- [Surge Configuration Webinar](https://training.marketplace.com/surge-config)
- [Emergency Procedures](https://training.marketplace.com/emergency)
- [Best Practices Guide](https://training.marketplace.com/best-practices)

---

*This document is maintained by the Technical Operations Team. Last updated: January 2024* 